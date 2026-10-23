/**
 * The gate verdict: the app's one bold moment. The screen floods with the
 * verdict colour and the word lands like a physical sign.
 */
import { Check, Footprints, ListChecks, NotebookPen, RotateCcw, Trophy } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, View } from 'react-native';

import { C, F, S } from '@/constants/theme';
import type { GateResult } from '@/lib/derive';
import { haptic } from '@/lib/haptics';
import { Body, Icon, Small, Sub } from '@/ui';

import { FullBleed, GiantWord, InkButton, InkCard, InkChip, InkInput, InkPill, InkRule, TOP_ROW } from './ink';
import { OVERRIDE_PHRASE, VERDICT } from './logic';
import { emotionLook, VERDICT_ICON } from './look';

/** Widest verdict word ("Clear.") in ems of Plus Jakarta Sans ExtraBold. */
const VERDICT_EM = 3.02;
/** "Walked", the widest line of "Walked away.", in ems. */
const WALKED_EM = 3.745;
/** Size of the sign icon above the giant word. */
const SIGN = 64;
/** Space between the sign icon and the cap height of the word. */
const SIGN_GAP = S.lg;

export function VerdictStep({
  result,
  emotions,
  ticked,
  total,
  reduceMotion,
  onLogEntry,
  onSkip,
  onWalkAway,
  onOverride,
  onStartOver,
}: {
  result: GateResult;
  /** What you checked in with, shown under the reasons. */
  emotions: string[];
  ticked: number;
  total: number;
  reduceMotion: boolean;
  onLogEntry: (plan: string) => void;
  onSkip: () => void;
  onWalkAway: () => void;
  onOverride: () => void;
  onStartOver: () => void;
}) {
  const { word, tone } = VERDICT[result.verdict];
  const [plan, setPlan] = useState('');
  const [overriding, setOverriding] = useState(false);
  const [phrase, setPhrase] = useState('');

  // Mounted fresh for every verdict (keyed by the parent), so the motion
  // preference is read once here; flipping it mid-animation can't strand values.
  const [still] = useState(reduceMotion);
  const [flood] = useState(() => new Animated.Value(still ? 1 : 0));
  const [scale] = useState(() => new Animated.Value(still ? 1 : 0.85));
  const [shown] = useState(() => new Animated.Value(still ? 1 : 0));

  // The word lands: one spring, damped so it thuds rather than bounces.
  useEffect(() => {
    if (still) return;
    const anim = Animated.parallel([
      Animated.timing(flood, { toValue: 1, duration: 170, useNativeDriver: true }),
      Animated.sequence([
        Animated.delay(50),
        Animated.parallel([
          Animated.spring(scale, { toValue: 1, stiffness: 380, damping: 24, mass: 1, useNativeDriver: true }),
          Animated.timing(shown, { toValue: 1, duration: 110, useNativeDriver: true }),
        ]),
      ]),
    ]);
    anim.start();
    return () => anim.stop();
  }, [still, flood, scale, shown]);

  // Haptic as the word reaches full size. Stop gets a heavy hit, then the error pattern.
  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    const at = (ms: number, fn: () => void) => timers.push(setTimeout(fn, ms));
    const land = still ? 0 : 160;
    if (result.verdict === 'clear') at(land, haptic.success);
    else if (result.verdict === 'wait') at(land, haptic.warning);
    else {
      at(land, haptic.heavy);
      at(land + 140, haptic.error);
    }
    return () => timers.forEach(clearTimeout);
  }, [result.verdict, still]);

  const unlocked = phrase.trim() === OVERRIDE_PHRASE;

  return (
    <FullBleed colour={C[tone]} flood={still ? undefined : flood} endKey={overriding}>
      <View style={{ flex: 1, gap: S.xl }}>
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', height: TOP_ROW, alignItems: 'center' }}>
          <InkButton kind="chip" icon={RotateCcw} label="Start over" onPress={onStartOver} />
        </View>

        <Animated.View
          style={{
            alignSelf: 'flex-start',
            gap: SIGN_GAP,
            opacity: shown,
            transform: [{ scale }],
            transformOrigin: 'left bottom',
          }}>
          <Icon icon={VERDICT_ICON[result.verdict]} size={SIGN} color={C.onLight} stroke={2.2} />
          <GiantWord lines={[word]} em={VERDICT_EM} />
        </Animated.View>

        <Reasons reasons={result.reasons} emotions={emotions} ticked={ticked} total={total} />

        <View style={{ marginTop: 'auto', gap: S.md }}>
          {result.verdict === 'clear' ? (
            <>
              <InkInput
                value={plan}
                onChangeText={setPlan}
                placeholder="Setup in one line (optional)"
                accessibilityLabel="Setup in one line, optional"
              />
              <InkButton icon={NotebookPen} label="Log entry" onPress={() => onLogEntry(plan)} />
              <InkButton kind="text" label="Skip this one" onPress={onSkip} />
            </>
          ) : null}

          {result.verdict === 'wait' ? (
            <>
              <Body color={C.onLight} style={{ fontFamily: F.semi }}>
                If it’s truly A+, take it smaller. Otherwise, skip.
              </Body>
              <InkButton icon={Footprints} label="Skip this one" onPress={onSkip} />
              <View style={{ gap: S.md, marginTop: S.sm }}>
                <InkInput
                  value={plan}
                  onChangeText={setPlan}
                  placeholder="Setup in one line (optional)"
                  accessibilityLabel="Setup in one line, optional"
                />
                <InkButton kind="outline" label="Log entry at half size" onPress={() => onLogEntry(plan)} />
              </View>
            </>
          ) : null}

          {result.verdict === 'stop' ? (
            <>
              <InkButton icon={Footprints} label="Walk away" onPress={onWalkAway} />
              {overriding ? (
                <View style={{ gap: S.md, marginTop: S.sm }}>
                  <Sub color={C.onLight} style={{ fontFamily: F.semi }}>
                    Type “{OVERRIDE_PHRASE}” to take it anyway.
                  </Sub>
                  <InkInput
                    value={phrase}
                    onChangeText={setPhrase}
                    placeholder="Type it exactly"
                    accessibilityLabel={`Type ${OVERRIDE_PHRASE} to unlock the override`}
                    autoCorrect={false}
                    spellCheck={false}
                    autoComplete="off"
                    contextMenuHidden
                    autoFocus
                  />
                  <InkButton kind="outline" label="Take it anyway" disabled={!unlocked} onPress={onOverride} />
                  <Small color={C.onLight} style={{ textAlign: 'center', opacity: 0.75 }}>
                    Overrides are tracked. You’ll see how they perform.
                  </Small>
                </View>
              ) : (
                <View style={{ alignItems: 'center' }}>
                  <InkButton kind="text" small label="Override" onPress={() => setOverriding(true)} />
                  <Small color={C.onLight} style={{ textAlign: 'center', opacity: 0.75 }}>
                    Overrides are tracked. You’ll see how they perform.
                  </Small>
                </View>
              )}
            </>
          ) : null}
        </View>
      </View>
    </FullBleed>
  );
}

/** The verdict's reasons, most serious first, then what you checked in with. */
function Reasons({
  reasons,
  emotions,
  ticked,
  total,
}: {
  reasons: string[];
  emotions: string[];
  ticked: number;
  total: number;
}) {
  const [first, ...rest] = reasons;
  return (
    <InkCard>
      {first ? (
        <Body color={C.onLight} style={{ fontFamily: F.bold, fontSize: 17, lineHeight: 24 }}>
          {first}
        </Body>
      ) : null}
      {rest.map((r) => (
        <View key={r} style={{ gap: S.md }}>
          <InkRule />
          <Body color={C.onLight} style={{ opacity: 0.82 }}>
            {r}
          </Body>
        </View>
      ))}
      <InkRule />
      <View
        style={{ flexDirection: 'row', flexWrap: 'wrap', gap: S.sm }}
        accessible
        accessibilityLabel={`You checked in feeling ${emotions.join(', ') || 'nothing named'}, with ${ticked} of ${total} rules ticked.`}>
        {emotions.map((e) => (
          <InkChip key={e} label={e} icon={emotionLook(e).icon} />
        ))}
        {total ? <InkChip label={`${ticked} of ${total} rules`} icon={ListChecks} /> : null}
      </View>
    </InkCard>
  );
}

/**
 * Jade confirmation after walking away. Static: the bold moment was the verdict.
 * With `autoDoneMs` it returns to the start on its own, unless VoiceOver is on
 * (the user decides when they've heard it).
 */
export function WalkedStep({
  line,
  total,
  onDone,
  autoDoneMs,
}: {
  line: string;
  /** Times walked away, all time, including this one. */
  total: number;
  onDone: () => void;
  autoDoneMs?: number;
}) {
  useEffect(() => {
    AccessibilityInfo.announceForAccessibility(`Walked away. ${line}`);
  }, [line]);

  useEffect(() => {
    if (!autoDoneMs) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let alive = true;
    AccessibilityInfo.isScreenReaderEnabled()
      .catch(() => false)
      .then((reader) => {
        if (alive && !reader) timer = setTimeout(onDone, autoDoneMs);
      });
    return () => {
      alive = false;
      if (timer) clearTimeout(timer);
    };
  }, [autoDoneMs, onDone]);

  return (
    <FullBleed colour={C.jade}>
      <View style={{ flex: 1, gap: S.xl }}>
        <View style={{ height: TOP_ROW }} />
        <View style={{ gap: SIGN_GAP }}>
          <Icon icon={Footprints} size={SIGN} color={C.onLight} stroke={2.2} />
          <GiantWord lines={['Walked', 'away.']} em={WALKED_EM} />
        </View>
        <View style={{ gap: S.lg }}>
          <Body color={C.onLight} style={{ fontFamily: F.bold, fontSize: 18, lineHeight: 26 }}>
            {line}
          </Body>
          <InkPill
            icon={Trophy}
            color={C.jade}
            label={total <= 1 ? 'Your first walk-away' : `${total} walk-aways in total`}
          />
        </View>
        <View style={{ marginTop: 'auto' }}>
          <InkButton icon={Check} label="Done" onPress={onDone} />
        </View>
      </View>
    </FullBleed>
  );
}

/** Spoken summary for VoiceOver when the verdict appears. */
export function announceVerdict(result: GateResult) {
  const { word } = VERDICT[result.verdict];
  AccessibilityInfo.announceForAccessibility(`${word} ${result.reasons[0] ?? ''}`.trim());
}
