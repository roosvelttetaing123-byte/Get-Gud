/**
 * The gate verdict: the app's one bold moment. The screen floods with the
 * verdict colour and the word lands like a physical sign.
 */
import React, { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, View } from 'react-native';

import { C, S } from '@/constants/theme';
import type { GateResult } from '@/lib/derive';
import { haptic } from '@/lib/haptics';
import { Body, Small, Sub } from '@/ui';

import { FullBleed, GiantWord, InkButton, InkInput, TOP_ROW, WORD_GAP } from './ink';
import { OVERRIDE_PHRASE, VERDICT } from './logic';

/** Widest verdict word ("Clear.") in ems of the display face. */
const VERDICT_EM = 2.15;
/** "Walked" (the widest line of "Walked away.") in ems. */
const WALKED_EM = 2.75;

export function VerdictStep({
  result,
  reduceMotion,
  onLogEntry,
  onSkip,
  onWalkAway,
  onOverride,
  onStartOver,
}: {
  result: GateResult;
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

  const [first, ...rest] = result.reasons;
  const unlocked = phrase.trim() === OVERRIDE_PHRASE;

  return (
    <FullBleed colour={C[tone]} flood={still ? undefined : flood}>
      <View style={{ flex: 1, gap: S.xxl }}>
        <View style={{ gap: S.lg }}>
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginRight: -S.sm }}>
            <InkButton kind="text" small label="Start over" onPress={onStartOver} />
          </View>
          <Animated.View
            style={{
              alignSelf: 'flex-start',
              marginTop: WORD_GAP - S.lg,
              opacity: shown,
              transform: [{ scale }],
              transformOrigin: 'left center',
            }}>
            <GiantWord lines={[word]} em={VERDICT_EM} />
          </Animated.View>

          <View style={{ gap: S.md }}>
            {first ? (
              <Body color={C.ink} style={{ fontWeight: '700' }}>
                {first}
              </Body>
            ) : null}
            {rest.map((r) => (
              <Body key={r} color={C.ink} style={{ opacity: 0.82 }}>
                {r}
              </Body>
            ))}
          </View>
        </View>

        <View style={{ marginTop: 'auto', gap: S.md }}>
          {result.verdict === 'clear' ? (
            <>
              <InkInput
                value={plan}
                onChangeText={setPlan}
                placeholder="Setup in one line (optional)"
                accessibilityLabel="Setup in one line, optional"
              />
              <InkButton label="Log entry" onPress={() => onLogEntry(plan)} />
              <InkButton kind="text" label="Skip this one" onPress={onSkip} />
            </>
          ) : null}

          {result.verdict === 'wait' ? (
            <>
              <Body color={C.ink}>If it’s truly A+, take it smaller. Otherwise, skip.</Body>
              <InkButton label="Skip this one" onPress={onSkip} />
              <View style={{ gap: S.sm, marginTop: S.md }}>
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
              <InkButton label="Walk away" onPress={onWalkAway} />
              {overriding ? (
                <View style={{ gap: S.sm, marginTop: S.md }}>
                  <Sub color={C.ink}>Type “{OVERRIDE_PHRASE}” to take it anyway.</Sub>
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
                  <Small color={C.ink}>Overrides are tracked. You’ll see how they perform.</Small>
                </View>
              ) : (
                <View style={{ alignItems: 'center' }}>
                  <InkButton kind="text" small label="Override" onPress={() => setOverriding(true)} />
                  <Small color={C.ink} style={{ textAlign: 'center' }}>
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

/**
 * Jade confirmation after walking away. Static: the bold moment was the verdict.
 * With `autoDoneMs` it returns to the start on its own, unless VoiceOver is on
 * (the user decides when they've heard it).
 */
export function WalkedStep({ line, onDone, autoDoneMs }: { line: string; onDone: () => void; autoDoneMs?: number }) {
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
      <View style={{ flex: 1, gap: S.xxl }}>
        <View style={{ gap: S.lg, paddingTop: TOP_ROW + WORD_GAP }}>
          <GiantWord lines={['Walked', 'away.']} em={WALKED_EM} />
          <Body color={C.ink} style={{ fontWeight: '700' }}>
            {line}
          </Body>
        </View>
        <View style={{ marginTop: 'auto' }}>
          <InkButton label="Done" onPress={onDone} />
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
