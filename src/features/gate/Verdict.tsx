/**
 * The verdict, Weather-style: a full-bleed colour field, one huge white word
 * that lands with a bouncy spring and a haptic, the reason in a line, the rest
 * in a translucent card, and one primary action.
 */
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Footprints, NotebookPen, RotateCcw, Trophy } from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  useWindowDimensions,
  type ScrollViewInstance,
  type TextInputProps,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { C, FONT, R, S, SYS, VALENCE } from '@/constants/theme';
import type { GateResult } from '@/lib/derive';
import { haptic } from '@/lib/haptics';
import type { Verdict } from '@/lib/store';
import { Button, IconButton, Num, ProgressRing, Txt, useReduceMotion } from '@/ui';

import { ND, useEntrance } from './anim';
import { useTabBarTop } from './Frame';
import { clock, OVERRIDE_PHRASE } from './logic';
import { CAUSE_ICON, VERDICT_LOOK } from './look';
import { Glow } from './MoodShape';
import { useNow } from './useNow';

const ON = 'rgba(255,255,255,0.86)';
const GLASS = 'rgba(255,255,255,0.14)';
const HAIR = 'rgba(255,255,255,0.22)';

/* ---------- pieces ---------- */

/** The colour field: verdict gradient, a slow breathing highlight, a soft shade at the foot. */
function Field({ colors, flood }: { colors: readonly [string, string, ...string[]]; flood: Animated.Value }) {
  const reduce = useReduceMotion();
  const { width } = useWindowDimensions();
  const [breath] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (reduce) return;
    const ease = Easing.inOut(Easing.sin);
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(breath, { toValue: 1, duration: 3800, easing: ease, useNativeDriver: ND }),
        Animated.timing(breath, { toValue: 0, duration: 3800, easing: ease, useNativeDriver: ND }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [breath, reduce]);
  const sun = Math.max(520, width * 1.5);
  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity: flood }]}>
      <View style={[StyleSheet.absoluteFill, { backgroundColor: colors[0] }]} />
      {/* the second colour rises like a sun in the top corner, so text stays on the deeper one */}
      <Animated.View
        style={{
          position: 'absolute',
          right: -sun * 0.5,
          top: -sun * 0.52,
          opacity: breath.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] }),
          transform: [{ scale: breath.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1.08] }) }],
        }}>
        <Glow size={sun} color={colors[1]} strength={1} />
      </Animated.View>
      <Animated.View
        style={{
          position: 'absolute',
          right: -sun * 0.3,
          top: -sun * 0.36,
          opacity: breath.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.6] }),
        }}>
        <Glow size={sun * 0.7} color={C.label} strength={0.45} />
      </Animated.View>
      <LinearGradient
        colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.3)']}
        locations={[0.3, 1]}
        style={StyleSheet.absoluteFill}
      />
    </Animated.View>
  );
}

/** Translucent card for content on the colour field. */
function GlassCard({ children }: { children: React.ReactNode }) {
  return <View style={styles.glass}>{children}</View>;
}

/** Text field on the colour field. 17px so iOS doesn't zoom. */
function GlassInput(props: TextInputProps) {
  return (
    <TextInput
      placeholderTextColor="rgba(255,255,255,0.68)"
      selectionColor={C.label}
      keyboardAppearance="dark"
      {...props}
      style={styles.input}
    />
  );
}

/** The huge word. A sign, not reading text: one size, never wraps. */
function BigWord({ lines, p }: { lines: string[]; p: Animated.Value }) {
  const { width, height } = useWindowDimensions();
  const widest = Math.max(...lines.map((l) => l.length));
  // ~0.56em per glyph in SF Pro Heavy; shrink only if the widest line wouldn't fit.
  const size = Math.min(76, Math.floor(height * 0.09), Math.floor((Math.min(width, 600) - 40) / (widest * 0.56)));
  return (
    <Animated.View
      accessible
      accessibilityRole="header"
      accessibilityLabel={lines.join(' ')}
      style={{
        alignItems: 'center',
        opacity: p.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, 1, 1] }),
        transform: [{ scale: p.interpolate({ inputRange: [0, 1], outputRange: [0.45, 1] }) }],
      }}>
      {lines.map((l) => (
        <Txt
          key={l}
          v="largeTitle"
          weight="800"
          align="center"
          numberOfLines={1}
          style={{ fontSize: size, lineHeight: Math.round(size * 1.04), letterSpacing: -size * 0.035 }}>
          {l}
        </Txt>
      ))}
    </Animated.View>
  );
}

/** Live countdown ring for the cool-down after a loss. */
function CooldownRing({ until, total, size }: { until: number; total: number; size: number }) {
  const [now] = useNow(1000);
  const left = Math.max(0, until - now);
  const done = left <= 0;
  useEffect(() => {
    if (done) haptic.success();
  }, [done]);
  return (
    <View
      accessible
      accessibilityRole="timer"
      accessibilityLabel={done ? 'Cool-down over' : `Re-check in ${clock(left)}`}>
      <ProgressRing
        value={total > 0 ? left / total : 0}
        size={size}
        stroke={14}
        from={C.label}
        to={C.label}
        track="rgba(255,255,255,0.24)">
        <View style={{ alignItems: 'center' }}>
          <Txt v="subhead" weight="600" color={ON}>
            {done ? 'Cool-down over' : 'Re-check in'}
          </Txt>
          <Num size={Math.round(size * 0.24)} weight="700" color={C.label}>
            {done ? 'Ready' : clock(left)}
          </Num>
        </View>
      </ProgressRing>
    </View>
  );
}

/** Scrolling page on the colour field, clear of the status bar and the floating tab bar. */
function FieldPage({
  colors,
  flood,
  scrollRef,
  children,
}: {
  colors: readonly [string, string, ...string[]];
  flood: Animated.Value;
  scrollRef?: React.RefObject<ScrollViewInstance | null>;
  children: React.ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const tabTop = useTabBarTop();
  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Field colors={colors} flood={flood} />
      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={[styles.page, { paddingTop: insets.top + S.xs, paddingBottom: tabTop + S.xl }]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        automaticallyAdjustKeyboardInsets
        showsVerticalScrollIndicator={false}>
        {children}
      </ScrollView>
    </View>
  );
}

function landHaptic(v: Verdict) {
  if (v === 'clear') haptic.success();
  else if (v === 'wait') haptic.warning();
  else {
    haptic.heavy();
    setTimeout(haptic.error, 140);
  }
}

/* ---------- the verdict ---------- */

export interface CheckedIn {
  valence: number;
  feelings: string[];
  about: string[];
  ticked: number;
  total: number;
}

export function VerdictView({
  result,
  checkedIn,
  cooldownMs,
  onLog,
  onSkip,
  onWalkAway,
  onOverride,
  onRecheck,
  onStartOver,
}: {
  result: GateResult;
  checkedIn: CheckedIn;
  /** Full cool-down length, for the countdown ring. */
  cooldownMs: number;
  onLog: (plan: string, half: boolean) => void;
  onSkip: () => void;
  onWalkAway: () => void;
  onOverride: () => void;
  onRecheck: () => void;
  onStartOver: () => void;
}) {
  const { verdict, reasons, causes, waitUntil } = result;
  const look = VERDICT_LOOK[verdict];
  const { width, height } = useWindowDimensions();
  const [plan, setPlan] = useState('');
  const [overriding, setOverriding] = useState(false);
  const [phrase, setPhrase] = useState('');
  const scroller = useRef<ScrollViewInstance>(null);

  const flood = useEntrance('smooth');
  const hero = useEntrance('bouncy', 40);
  const word = useEntrance('bouncy', 110);
  const card = useEntrance('smooth', 220);
  const act = useEntrance('smooth', 300);

  useEffect(() => {
    const t = setTimeout(() => landHaptic(verdict), 230);
    AccessibilityInfo.announceForAccessibility(`${look.word} ${reasons[0] ?? ''}`);
    return () => clearTimeout(t);
  }, [verdict, look.word, reasons]);

  useEffect(() => {
    if (!overriding) return;
    const t = setTimeout(() => scroller.current?.scrollToEnd({ animated: true }), 80);
    return () => clearTimeout(t);
  }, [overriding]);

  const cooling = verdict === 'wait' && waitUntil !== undefined;
  const [first, ...rest] = reasons;
  const restCauses = causes.slice(1);
  const unlocked = phrase.trim().toLowerCase() === OVERRIDE_PHRASE.toLowerCase();
  const halfSize = causes.some((c) => c === 'amber' || c === 'mood' || c === 'sleep');
  // Scale the hero object down on shorter phones so the action stays in view.
  const k = Math.max(0.74, Math.min(1, (height - 120) / 700));
  const ringSize = Math.round(Math.min(196, width * 0.5) * k);
  // The ring already counts down, so the headline keeps only its first sentence.
  const headline = cooling && causes[0] === 'cooldown' ? `${first?.split('. ')[0]}.` : first;
  const summary = [
    VALENCE[checkedIn.valence - 1].label,
    ...checkedIn.feelings,
    ...checkedIn.about,
    ...(checkedIn.total ? [`${checkedIn.ticked} of ${checkedIn.total} rules`] : []),
  ];

  const rise = (p: Animated.Value, y = 22) => ({
    opacity: p,
    transform: [{ translateY: p.interpolate({ inputRange: [0, 1], outputRange: [y, 0] }) }],
  });

  return (
    <FieldPage colors={look.colors} flood={flood} scrollRef={scroller}>
      <View style={styles.topRow}>
        <View style={styles.caption}>
          <look.icon size={15} color={C.label} strokeWidth={2.4} />
          <Txt v="subhead" weight="600">
            {look.caption}
          </Txt>
        </View>
        <IconButton icon={RotateCcw} label="Start over" onPress={onStartOver} bg="rgba(255,255,255,0.2)" />
      </View>

      <View style={styles.middle}>
        <View style={{ alignItems: 'center', gap: S.sm }}>
          <Animated.View
            style={{
              marginBottom: S.xs,
              opacity: hero.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 1, 1] }),
              transform: [
                { translateY: hero.interpolate({ inputRange: [0, 1], outputRange: [-36, 0] }) },
                { scale: hero.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) },
              ],
            }}>
            {verdict === 'clear' ? (
              <Image
                source={require('@/assets/3d/gate-shield.webp')}
                contentFit="contain"
                style={{ width: 156 * k, height: 156 * k }}
                accessibilityIgnoresInvertColors
              />
            ) : cooling && waitUntil ? (
              <CooldownRing until={waitUntil} total={cooldownMs} size={ringSize} />
            ) : (
              <View style={[styles.sign, { width: 92 * k, height: 92 * k, borderRadius: 46 * k }]}>
                <look.icon size={44 * k} color={C.label} strokeWidth={2.2} />
              </View>
            )}
          </Animated.View>
          <BigWord lines={[look.word]} p={word} />
          <Animated.View style={[{ paddingHorizontal: S.sm, gap: 6, alignItems: 'center' }, rise(word, 10)]}>
            {headline ? (
              <Txt v="title3" weight="600" align="center">
                {headline}
              </Txt>
            ) : null}
            <View accessible accessibilityLabel={`You checked in with: ${summary.join(', ')}`}>
              <Txt v="subhead" weight="500" color={ON} align="center">
                {summary.map((x) => x.replace(/ /g, '\u00A0')).join(' · ')}
              </Txt>
            </View>
          </Animated.View>
        </View>

        {rest.length ? (
          <Animated.View style={rise(card)}>
            <GlassCard>
              {rest.map((r, i) => {
                const I = CAUSE_ICON[restCauses[i] ?? 'clear'];
                return (
                  <React.Fragment key={r}>
                    {i > 0 ? <View style={styles.hair} /> : null}
                    <View style={styles.reason}>
                      <I size={18} color={C.label} strokeWidth={2.3} style={{ marginTop: 1 }} />
                      <Txt v="callout" style={{ flex: 1 }}>
                        {r}
                      </Txt>
                    </View>
                  </React.Fragment>
                );
              })}
            </GlassCard>
          </Animated.View>
        ) : null}
      </View>

      <Animated.View style={[styles.actions, rise(act, 16)]}>
        {verdict === 'clear' ? (
          <>
            <GlassInput
              value={plan}
              onChangeText={setPlan}
              placeholder="Setup in one line (optional)"
              accessibilityLabel="Setup in one line, optional"
              returnKeyType="done"
            />
            <Button title="Log trade" icon={NotebookPen} color={C.label} onPress={() => onLog(plan, false)} />
          </>
        ) : null}

        {cooling ? (
          <>
            <Button title="Re-check" icon={RotateCcw} color={C.label} onPress={onRecheck} />
            <Button title="Skip this one" kind="plain" color={C.label} onPress={onSkip} />
          </>
        ) : null}

        {verdict === 'wait' && !cooling ? (
          <>
            <Button title="Skip this one" icon={Footprints} color={C.label} onPress={onSkip} />
            <Button
              title={halfSize ? 'Log at half size' : 'Log trade'}
              kind="glass"
              onPress={() => onLog('', halfSize)}
            />
          </>
        ) : null}

        {verdict === 'stop' ? (
          <>
            <Button title="Walk away" icon={Footprints} color={C.label} onPress={onWalkAway} />
            {overriding ? (
              <View style={{ gap: S.md, marginTop: S.sm }}>
                <Txt v="subhead" weight="600" color={ON} align="center">
                  {`Type “${OVERRIDE_PHRASE}” to take it anyway.`}
                </Txt>
                <GlassInput
                  value={phrase}
                  onChangeText={setPhrase}
                  placeholder={OVERRIDE_PHRASE}
                  accessibilityLabel={`Type ${OVERRIDE_PHRASE} to unlock the override`}
                  autoCorrect={false}
                  autoCapitalize="none"
                  spellCheck={false}
                  autoComplete="off"
                  contextMenuHidden
                  autoFocus
                />
                <Button title="Take it anyway" kind="glass" disabled={!unlocked} onPress={onOverride} />
                <Txt v="footnote" color={ON} align="center">
                  Overrides are logged. You’ll see how they do.
                </Txt>
              </View>
            ) : (
              <Button
                title="Override"
                kind="plain"
                size="small"
                color={ON}
                onPress={() => setOverriding(true)}
                style={{ alignSelf: 'center' }}
                full={false}
              />
            )}
          </>
        ) : null}
      </Animated.View>
    </FieldPage>
  );
}

/* ---------- walked away ---------- */

export function WalkedView({
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
  const flood = useEntrance('smooth');
  const medal = useEntrance('bouncy', 120);
  const word = useEntrance('bouncy', 260);
  const rest = useEntrance('smooth', 380);

  useEffect(() => {
    const t = setTimeout(haptic.success, 300);
    AccessibilityInfo.announceForAccessibility(`Walked away. ${line}`);
    return () => clearTimeout(t);
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
    <FieldPage colors={[SYS.green, SYS.mint]} flood={flood}>
      <View style={[styles.middle, { alignItems: 'center', gap: S.lg, paddingTop: 44 }]}>
        <Animated.View
          style={{
            alignItems: 'center',
            justifyContent: 'center',
            opacity: medal.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, 1, 1] }),
            transform: [
              { scale: medal.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }) },
              { rotate: medal.interpolate({ inputRange: [0, 1], outputRange: ['-24deg', '0deg'] }) },
            ],
          }}>
          <View pointerEvents="none" style={{ position: 'absolute' }}>
            <Glow size={380} color={C.label} strength={0.55} />
          </View>
          <Image
            source={require('@/assets/3d/medal-walked-away.webp')}
            contentFit="contain"
            style={{ width: 220, height: 220 }}
            accessibilityLabel="Walked away medal"
          />
        </Animated.View>
        <BigWord lines={['Walked away.']} p={word} />
        <Animated.View style={{ alignItems: 'center', gap: S.lg, opacity: rest }}>
          <Txt v="title3" weight="600" align="center">
            {line}
          </Txt>
          <View style={styles.caption}>
            <Trophy size={15} color={C.label} strokeWidth={2.4} />
            <Txt v="subhead" weight="600">
              {total <= 1 ? 'Your first walk-away' : `${total} walk-aways in total`}
            </Txt>
          </View>
        </Animated.View>
      </View>
      <Animated.View style={[styles.actions, { opacity: rest }]}>
        <Button title="Done" color={C.label} onPress={onDone} />
      </Animated.View>
    </FieldPage>
  );
}

const styles = StyleSheet.create({
  page: { flexGrow: 1, gap: S.lg, width: '100%', maxWidth: 600, alignSelf: 'center', paddingHorizontal: S.xl },
  topRow: { height: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  caption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 32,
    paddingHorizontal: 12,
    borderRadius: R.pill,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  sign: {
    width: 104,
    height: 104,
    borderRadius: 52,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  glass: { backgroundColor: GLASS, borderRadius: 22, padding: S.lg, gap: S.md },
  hair: { height: StyleSheet.hairlineWidth, backgroundColor: HAIR, marginLeft: 30 },
  reason: { flexDirection: 'row', alignItems: 'flex-start', gap: S.md },
  middle: { flexGrow: 1, justifyContent: 'center', gap: S.lg },
  actions: { gap: S.md },
  input: {
    height: 52,
    borderRadius: R.inner,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255,255,255,0.18)',
    color: C.label,
    fontSize: 17,
    fontFamily: FONT.system,
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null),
  },
});
