/**
 * Week in review: a full-screen story, in the spirit of Apple Music Replay and Instagram stories.
 * Each slide is one bold system colour, one giant SF Rounded number and one plain line.
 *
 * Touch: tap the right side for the next slide and the left third to go back; press and hold
 * to pause (the chrome fades so you can read); swipe down or tap the close button to leave.
 * Slides move on every 5 seconds, except with Reduce Motion, where you move them yourself.
 */
import { LinearGradient } from 'expo-linear-gradient';
import { X } from 'lucide-react-native';
import React, { useEffect, useEffectEvent, useRef, useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { useInsets } from '@/ui/insets';

import { FONT, S, SPRING } from '@/constants/theme';
import { haptic } from '@/lib/haptics';
import { latestWeek, reviewSlides, weekFocus, weekReview, type Focus, type Slide, type Week } from '@/lib/review';
import { actions, useStore, type State } from '@/lib/store';
import { Txt, useReduceMotion, useSpringValue } from '@/ui';

import { FOCUS_ICON, SLIDE_LOOK, ink, type SlideLook } from './look';

export const SLIDE_MS = 5000;
const TAP_MS = 250;
const LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const WEB_SURFACE = Platform.OS === 'web' ? ({ touchAction: 'none', userSelect: 'none', cursor: 'pointer' } as object) : null;

/** The story for the latest week. Marks it watched when it closes. */
export function WeekStory({ visible, now, onClose }: { visible: boolean; now: number; onClose: () => void }) {
  if (!visible) return null;
  return (
    <Story
      now={now}
      onDone={(week) => {
        actions.mutate((s) => (s.reviewSeen === week.key ? s : { ...s, reviewSeen: week.key }));
        onClose();
      }}
    />
  );
}

interface Built {
  week: Week;
  slides: Slide[];
  focus: Focus;
}

function build(s: State, now: number): Built {
  const week = latestWeek(now);
  const review = weekReview(s, week, now);
  const focus = weekFocus(s, review, now);
  return { week, slides: reviewSlides(s, review, focus), focus };
}

function Story({ now, onDone }: { now: number; onDone: (week: Week) => void }) {
  const state = useStore();
  const reduce = useReduceMotion();
  const insets = useInsets();
  const { width, height } = useWindowDimensions();
  // Built once per opening, so nothing shifts while you watch.
  const [story] = useState(() => build(state, now));
  const n = story.slides.length;
  const [i, setI] = useState(0);
  const [lap, setLap] = useState(0); // bumps when a slide restarts in place
  const [paused, setPaused] = useState(false);

  const progress = useSharedValue(0);
  const appear = useSharedValue(0);
  const drag = useSharedValue(0);
  const chrome = useSharedValue(1);
  const closing = useRef(false);
  const touch = useRef({ x0: 0, y0: 0, t0: 0, lastY: 0, lastT: 0, vy: 0, moved: false, dragging: false });
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const close = (down = false) => {
    if (closing.current) return;
    closing.current = true;
    cancelAnimation(progress);
    if (down) drag.set(withTiming(height, { duration: 220, easing: Easing.out(Easing.quad) }));
    appear.set(withTiming(0, { duration: 220 }));
    setTimeout(() => onDone(story.week), 220);
  };

  const go = (to: number) => {
    if (closing.current) return;
    if (to >= n) return close();
    haptic.tap();
    progress.set(0);
    setI(Math.max(0, to));
    setLap((l) => l + 1);
  };

  useEffect(() => {
    appear.set(reduce ? withTiming(1, { duration: 160 }) : withSpring(1, SPRING.smooth));
  }, [appear, reduce]);

  const timeUp = useEffectEvent(() => {
    if (i < n - 1) {
      progress.set(0);
      setI(i + 1);
    } else close();
  });

  // Auto-advance: the bar fills over 5 s, then the next slide. Holding pauses; Reduce Motion stops it.
  useEffect(() => {
    if (reduce) {
      progress.set(1);
      return;
    }
    if (paused) return;
    const left = Math.max(0, (1 - progress.get()) * SLIDE_MS);
    progress.set(withTiming(1, { duration: left, easing: Easing.linear }));
    const t = setTimeout(timeUp, left);
    return () => {
      clearTimeout(t);
      cancelAnimation(progress);
    };
  }, [i, lap, paused, reduce, progress]);

  // Keyboard on the web: arrows move, space pauses.
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') go(i + 1);
      else if (e.key === 'ArrowLeft') go(i - 1);
      else if (e.key === ' ') {
        e.preventDefault();
        setPaused((p) => !p);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const endHold = () => {
    if (holdTimer.current) clearTimeout(holdTimer.current);
    holdTimer.current = null;
    chrome.set(withTiming(1, { duration: 160 }));
  };

  const slide = story.slides[i];
  const look: SlideLook = slide.id === 'focus' ? { ...SLIDE_LOOK.focus, icon: FOCUS_ICON[story.focus.icon] } : SLIDE_LOOK[slide.id];

  const shell = useAnimatedStyle(() => {
    const a = appear.get();
    const d = drag.get();
    return {
      opacity: a,
      transform: [{ translateY: d + (1 - a) * 28 }, { scale: (0.95 + 0.05 * a) * (1 - Math.min(0.1, d / 2600)) }],
    };
  });
  const scrim = useAnimatedStyle(() => ({ opacity: appear.get() * (1 - Math.min(1, drag.get() / 600)) }));
  const chromeStyle = useAnimatedStyle(() => ({ opacity: chrome.get() }));

  return (
    <Modal transparent visible animationType="none" onRequestClose={() => close()} statusBarTranslucent>
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.scrim, scrim]} />
      <Animated.View style={[StyleSheet.absoluteFill, styles.shell, { backgroundColor: look.bg }, shell]} accessibilityViewIsModal>
        <LinearGradient
          pointerEvents="none"
          colors={['rgba(255,255,255,0.24)', 'rgba(255,255,255,0)', 'rgba(0,0,0,0.14)']}
          locations={[0, 0.55, 1]}
          start={{ x: 0.1, y: 0 }}
          end={{ x: 0.6, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View pointerEvents="none" style={styles.glyph}>
          <look.icon size={Math.round(width * 0.95)} color={ink(look.fg, 0.07)} strokeWidth={1.4} />
        </View>

        <SlideBody
          key={`${i}.${lap}`}
          slide={slide}
          look={look}
          reduce={reduce}
          top={insets.top + 92}
          bottom={insets.bottom + (i === n - 1 ? 104 : 36)}
          width={width}
        />

        {/* One surface for every touch: tap, hold, swipe down. */}
        <View
          style={[StyleSheet.absoluteFill, WEB_SURFACE]}
          accessible
          accessibilityLabel={spoken(slide, i, n)}
          accessibilityHint="Tap the right side for next, the left side for back. Swipe down to close."
          accessibilityActions={[{ name: 'activate' }, { name: 'increment' }, { name: 'decrement' }, { name: 'escape' }]}
          onAccessibilityAction={(e) => {
            const a = e.nativeEvent.actionName;
            if (a === 'escape') close();
            else if (a === 'decrement') go(i - 1);
            else go(i + 1);
          }}
          onStartShouldSetResponder={() => true}
          onResponderTerminationRequest={() => false}
          onResponderGrant={(e) => {
            const t = touch.current;
            t.x0 = e.nativeEvent.pageX;
            t.y0 = e.nativeEvent.pageY;
            t.t0 = Date.now();
            t.lastY = t.y0;
            t.lastT = t.t0;
            t.vy = 0;
            t.moved = false;
            t.dragging = false;
            setPaused(true);
            holdTimer.current = setTimeout(() => chrome.set(withTiming(0, { duration: 200 })), TAP_MS + 30);
          }}
          onResponderMove={(e) => {
            const t = touch.current;
            const { pageX, pageY } = e.nativeEvent;
            const dx = pageX - t.x0;
            const dy = pageY - t.y0;
            if (Math.abs(dx) > 10 || Math.abs(dy) > 10) t.moved = true;
            if (!t.dragging && dy > 12 && dy > Math.abs(dx)) t.dragging = true;
            const at = Date.now();
            t.vy = 0.6 * t.vy + 0.4 * ((pageY - t.lastY) / Math.max(1, at - t.lastT));
            t.lastY = pageY;
            t.lastT = at;
            if (t.dragging) drag.set(Math.max(0, dy));
          }}
          onResponderRelease={(e) => {
            const t = touch.current;
            endHold();
            if (t.dragging) {
              if (e.nativeEvent.pageY - t.y0 > 120 || t.vy > 0.6) return close(true);
              drag.set(reduce ? 0 : withSpring(0, SPRING.snappy));
              setPaused(false);
              return;
            }
            setPaused(false);
            if (!t.moved && Date.now() - t.t0 < TAP_MS) go(t.x0 < width * 0.3 ? i - 1 : i + 1);
          }}
          onResponderTerminate={() => {
            endHold();
            drag.set(withSpring(0, SPRING.snappy));
            setPaused(false);
          }}
        />

        <Animated.View pointerEvents="box-none" style={[styles.chrome, { paddingTop: insets.top + S.sm }, chromeStyle]}>
          <View style={styles.bars} pointerEvents="none">
            {story.slides.map((x, k) => (
              <Segment key={x.id} state={k < i ? 'done' : k === i ? 'now' : 'todo'} progress={progress} fg={look.fg} />
            ))}
          </View>
          <View style={styles.head} pointerEvents="box-none">
            <View style={{ flex: 1 }} pointerEvents="none">
              <Txt v="subhead" weight="700" color={look.fg}>
                Week in review
              </Txt>
              <Txt v="footnote" weight="500" color={ink(look.fg, 0.72)}>
                {story.week.label}
              </Txt>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close"
              hitSlop={12}
              onPress={() => {
                haptic.tap();
                close();
              }}
              style={({ pressed }) => [styles.close, { backgroundColor: ink(look.fg, pressed ? 0.28 : 0.16) }]}>
              <X size={20} color={look.fg} strokeWidth={2.6} />
            </Pressable>
          </View>
        </Animated.View>

        {i === n - 1 ? (
          <View style={[styles.done, { bottom: insets.bottom + S.xxl }]} pointerEvents="box-none">
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                haptic.press();
                close();
              }}
              style={({ pressed }) => [styles.doneButton, { backgroundColor: look.fg, opacity: pressed ? 0.8 : 1 }]}>
              <Text style={[styles.doneText, { color: look.bg }]}>Done</Text>
            </Pressable>
          </View>
        ) : null}
      </Animated.View>
    </Modal>
  );
}

function spoken(s: Slide, i: number, n: number) {
  const v = s.value === undefined ? '' : `${parts(s.value, s.unit).map((p) => p.t).join('')} `;
  return `${i + 1} of ${n}. ${s.kicker}. ${v}${s.caption}. ${s.line}`;
}

/* ---------- pieces ---------- */

/** One progress bar: full once seen, filling while it plays, empty ahead. Transform only. */
function Segment({ state, progress, fg }: { state: 'done' | 'now' | 'todo'; progress: SharedValue<number>; fg: string }) {
  const [w, setW] = useState(0);
  const fill = useAnimatedStyle(() => {
    const p = state === 'done' ? 1 : state === 'now' ? progress.get() : 0;
    return { transform: [{ translateX: (p - 1) * w }] };
  });
  return (
    <View style={[styles.track, { backgroundColor: ink(fg, 0.3) }]} onLayout={(e) => setW(e.nativeEvent.layout.width)}>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: fg }, fill]} />
    </View>
  );
}

type Part = { t: string; big: boolean };

function parts(v: number, unit: Slide['unit']): Part[] {
  if (unit === 'pct') return [{ t: String(Math.round(v)), big: true }, { t: '%', big: false }];
  if (unit === 'hm') {
    const total = Math.round(v * 60);
    const h = Math.floor(total / 60);
    const m = total % 60;
    const out: Part[] = [{ t: String(h), big: true }, { t: ' h', big: false }];
    if (m) out.push({ t: ` ${m}`, big: true }, { t: ' m', big: false });
    return out;
  }
  return [{ t: String(Math.round(v)), big: true }];
}

/** The giant number counts up from zero (a leaf, so only it re-renders while it moves). */
function BigNumber({ value, unit, color, room }: { value: number; unit: Slide['unit']; color: string; room: number }) {
  const v = useSpringValue(value, 'smooth', 0);
  const final = parts(value, unit);
  const big = final.filter((p) => p.big).reduce((a, p) => a + p.t.trim().length, 0);
  const small = final.filter((p) => !p.big).reduce((a, p) => a + p.t.length, 0);
  const size = Math.round(Math.min(156, room / (big * 0.62 + small * 0.3 + 0.1)));
  return (
    <Text
      numberOfLines={1}
      style={{
        fontFamily: FONT.rounded,
        fontSize: size,
        lineHeight: Math.round(size * 1.04),
        fontWeight: '800',
        letterSpacing: -size * 0.035,
        color,
        fontVariant: ['tabular-nums'],
      }}>
      {parts(v, unit).map((p, k) =>
        p.big ? (
          <React.Fragment key={k}>{p.t}</React.Fragment>
        ) : (
          <Text key={k} style={{ fontSize: Math.round(size * 0.42), letterSpacing: 0, fontWeight: '700' }}>
            {p.t}
          </Text>
        ),
      )}
    </Text>
  );
}

function SlideBody({
  slide,
  look,
  reduce,
  top,
  bottom,
  width,
}: {
  slide: Slide;
  look: SlideLook;
  reduce: boolean;
  top: number;
  bottom: number;
  width: number;
}) {
  const enter = useSharedValue(reduce ? 1 : 0);
  useEffect(() => {
    if (!reduce) enter.set(withSpring(1, SPRING.snappy));
  }, [enter, reduce]);
  const style = useAnimatedStyle(() => ({ opacity: enter.get(), transform: [{ translateY: (1 - enter.get()) * 22 }] }));
  const fg = look.fg;
  const room = Math.min(width, 600) - S.xxl * 2;

  return (
    <Animated.View pointerEvents="none" style={[styles.body, { paddingTop: top, paddingBottom: bottom }, style]}>
      <View style={styles.kicker}>
        <look.icon size={20} color={fg} strokeWidth={2.4} />
        <Txt v="headline" weight="700" color={fg}>
          {slide.kicker}
        </Txt>
      </View>

      {slide.value !== undefined ? (
        <View style={{ gap: S.xs }}>
          <BigNumber value={slide.value} unit={slide.unit} color={fg} room={room} />
          <Txt v="title2" weight="700" color={fg}>
            {slide.caption}
          </Txt>
        </View>
      ) : (
        <View style={{ gap: S.lg }}>
          <View style={[styles.focusIcon, { backgroundColor: ink(fg, 0.12) }]}>
            <look.icon size={44} color={fg} strokeWidth={2.2} />
          </View>
          <Text style={[styles.focusTitle, { color: fg }]}>{slide.caption}</Text>
        </View>
      )}

      <Text style={[styles.line, { color: ink(fg, 0.86) }]}>{slide.line}</Text>

      <View style={{ flex: 1 }} />
      {slide.byDay ? <Strip byDay={slide.byDay} fg={fg} /> : null}
    </Animated.View>
  );
}

/** Mon–Sun at the bottom of a slide: how each day went, as a small bar. */
function Strip({ byDay, fg }: { byDay: (number | null)[]; fg: string }) {
  return (
    <View style={styles.strip}>
      {byDay.map((v, k) => (
        <View key={k} style={styles.stripDay}>
          <View style={[styles.stripTrack, { backgroundColor: ink(fg, 0.16) }]}>
            {v !== null ? <View style={[styles.stripFill, { height: `${Math.max(14, v * 100)}%`, backgroundColor: fg }]} /> : null}
          </View>
          <Text style={[styles.stripLetter, { color: ink(fg, 0.7) }]}>{LETTERS[k]}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  scrim: { backgroundColor: 'rgba(0,0,0,0.6)' },
  shell: { overflow: 'hidden' },
  glyph: { position: 'absolute', right: '-30%', bottom: '-6%', opacity: 1 },
  chrome: { position: 'absolute', left: 0, right: 0, top: 0, paddingHorizontal: S.md, gap: S.md },
  bars: { flexDirection: 'row', gap: 4 },
  track: { flex: 1, height: 3, borderRadius: 1.5, overflow: 'hidden' },
  head: { flexDirection: 'row', alignItems: 'center', gap: S.md, paddingHorizontal: S.xs },
  close: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  body: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, paddingHorizontal: S.xxl, gap: S.lg },
  kicker: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: S.xs },
  line: { fontFamily: FONT.system, fontSize: 21, lineHeight: 28, fontWeight: '600', maxWidth: 380 },
  focusIcon: { width: 84, height: 84, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  focusTitle: { fontFamily: FONT.rounded, fontSize: 40, lineHeight: 44, fontWeight: '800', letterSpacing: -0.8 },
  strip: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: S.xs },
  stripDay: { alignItems: 'center', gap: 8, flex: 1 },
  stripTrack: { width: 12, height: 56, borderRadius: 6, justifyContent: 'flex-end', overflow: 'hidden' },
  stripFill: { width: '100%', borderRadius: 6 },
  stripLetter: { fontFamily: FONT.system, fontSize: 13, fontWeight: '700' },
  done: { position: 'absolute', left: S.xxl, right: S.xxl, alignItems: 'stretch' },
  doneButton: { height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center' },
  doneText: { fontFamily: FONT.system, fontSize: 17, fontWeight: '700' },
});
