/**
 * First-run setup, like Apple's setup flows: one idea per page, a centred hero and Title 1,
 * a filled button pinned to the bottom and page dots. Pages slide on a spring (iOS push:
 * the new page slides in over the old one, which drifts back with parallax).
 */
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { Keyboard, StyleSheet, View, useWindowDimensions, type TextInputInstance } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { C, S } from '@/constants/theme';
import { MAX_PROMISES, loadRituals, promiseOptions, saveRituals, type Rituals } from '@/features/onboarding/model';
import { PageDots } from '@/features/onboarding/parts';
import {
  DoneStep,
  NameStep,
  PromisesStep,
  RitualsStep,
  RulesStep,
  WelcomeStep,
  WhyStep,
  type RuleChoice,
} from '@/features/onboarding/steps';
import { haptic } from '@/lib/haptics';
import { DEFAULT_SETTINGS, actions, getState } from '@/lib/store';
import { Button, IconButton, useSpringValue } from '@/ui';

const STEPS = ['welcome', 'name', 'why', 'rules', 'promises', 'rituals', 'done'] as const;
type Step = (typeof STEPS)[number];
const NAME = STEPS.indexOf('name');

export default function Onboarding() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const [step, setStep] = useState(0);
  const x = useSpringValue(step, 'smooth');
  const settled = Math.abs(x - step) < 0.01;

  // Answers live here so pages can unmount while off screen.
  const [name, setName] = useState(() => getState().settings.name);
  const [why, setWhy] = useState(() => getState().settings.why);
  const [rules, setRules] = useState<RuleChoice[]>(() => {
    const r = getState().settings.rules;
    return (r.length ? r : DEFAULT_SETTINGS.rules).map((text) => ({ text, on: true }));
  });
  const [draft, setDraft] = useState('');
  const [options] = useState(() => promiseOptions(getState().settings.promises));
  const [promises, setPromises] = useState(() => getState().settings.promises.slice(0, MAX_PROMISES));
  const [nudge, setNudge] = useState(false);
  const [rituals, setRituals] = useState<Rituals>(loadRituals);

  const nameRef = useRef<TextInputInstance | null>(null);

  // Focus the name field once its page has finished sliding in. Focusing mid-slide would make
  // the browser scroll the clipped pager to reveal it.
  useEffect(() => {
    if (step !== NAME || !settled) return;
    const el = nameRef.current as unknown as { focus: (o?: { preventScroll?: boolean }) => void } | null;
    el?.focus({ preventScroll: true });
  }, [step, settled]);

  const go = (to: number) => {
    Keyboard.dismiss();
    setStep(Math.max(0, Math.min(STEPS.length - 1, to)));
  };
  const next = () => go(step + 1);
  const back = () => go(step - 1);

  const toggleRule = (i: number, on: boolean) => setRules((rs) => rs.map((r, j) => (j === i ? { ...r, on } : r)));
  const addRule = () => {
    const text = draft.trim();
    if (!text) return;
    if (!rules.some((r) => r.text.toLowerCase() === text.toLowerCase())) {
      setRules((rs) => [...rs, { text, on: true }]);
      haptic.tap();
    }
    setDraft('');
  };

  const togglePromise = (p: string) => {
    if (promises.includes(p)) {
      setPromises((ps) => ps.filter((x) => x !== p));
      setNudge(false);
    } else if (promises.length >= MAX_PROMISES) {
      setNudge(true);
      haptic.warning();
    } else {
      setPromises((ps) => [...ps, p]);
    }
  };

  const finish = () => {
    saveRituals(rituals);
    actions.updateSettings({
      name: name.trim(),
      why: why.trim(),
      rules: rules.filter((r) => r.on).map((r) => r.text),
      // keep his order of the options list, not the order he tapped them
      promises: options.filter((o) => promises.includes(o)),
      onboarded: true,
    });
    router.replace('/');
    haptic.success();
  };

  const primary: Record<Step, { label: string; onPress: () => void; disabled?: boolean }> = {
    welcome: { label: 'Get started', onPress: next },
    name: { label: 'Continue', onPress: next, disabled: !name.trim() },
    why: { label: 'Continue', onPress: next, disabled: !why.trim() },
    rules: { label: 'Continue', onPress: next, disabled: !rules.some((r) => r.on) },
    promises: { label: 'Continue', onPress: next, disabled: promises.length === 0 },
    rituals: { label: 'Continue', onPress: next },
    done: { label: 'Start my day', onPress: finish },
  };
  const current = STEPS[step];
  const action = primary[current];

  const render = (k: Step) => {
    switch (k) {
      case 'welcome':
        return <WelcomeStep />;
      case 'name':
        return <NameStep value={name} onChange={setName} onSubmit={() => name.trim() && next()} inputRef={nameRef} />;
      case 'why':
        return <WhyStep value={why} onChange={setWhy} />;
      case 'rules':
        return <RulesStep rules={rules} onToggle={toggleRule} draft={draft} onDraft={setDraft} onAdd={addRule} />;
      case 'promises':
        return <PromisesStep options={options} selected={promises} onToggle={togglePromise} nudge={nudge} />;
      case 'rituals':
        return <RitualsStep rituals={rituals} onChange={setRituals} />;
      case 'done':
        return <DoneStep name={name} rituals={rituals} />;
    }
  };

  const backShown = Math.min(1, x);

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.nav}>
        {backShown > 0.01 ? (
          <View style={{ opacity: backShown, pointerEvents: step > 0 ? 'auto' : 'none' }}>
            <IconButton icon={ChevronLeft} label="Back" onPress={back} size={36} color={C.label} />
          </View>
        ) : null}
      </View>

      <View style={styles.pager}>
        {STEPS.map((k, i) => {
          const d = i - x; // > 0: waiting on the right; < 0: pushed behind on the left
          if (Math.abs(d) >= 0.999) return null;
          const behind = d < 0;
          return (
            <View
              key={k}
              style={[
                StyleSheet.absoluteFill,
                {
                  backgroundColor: C.bg,
                  zIndex: i,
                  opacity: behind ? 1 + d * 0.75 : 1,
                  transform: [{ translateX: behind ? d * width * 0.3 : d * width }],
                  pointerEvents: i === step ? 'auto' : 'none',
                },
              ]}>
              {render(k)}
            </View>
          );
        })}
        {/* scroll-edge fades: content softly disappears under the back button and the dots */}
        <LinearGradient pointerEvents="none" colors={[C.bg, 'rgba(0,0,0,0)']} style={[styles.fade, { top: 0, height: 14 }]} />
        <LinearGradient pointerEvents="none" colors={['rgba(0,0,0,0)', C.bg]} style={[styles.fade, { bottom: 0, height: 28 }]} />
      </View>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, S.sm) }]}>
        <PageDots count={STEPS.length} at={x} />
        <View style={styles.actions}>
          <Button title={action.label} onPress={action.onPress} disabled={action.disabled} />
          <View style={styles.secondary}>
            {current === 'why' ? <Button title="Skip" kind="plain" size="medium" color={C.tint} onPress={next} full={false} style={{ alignSelf: 'center' }} /> : null}
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  nav: { height: 52, paddingHorizontal: S.lg, justifyContent: 'center', alignItems: 'flex-start' },
  pager: { flex: 1, overflow: 'hidden' },
  footer: { paddingHorizontal: S.xxl, paddingTop: S.md, gap: S.xl, backgroundColor: C.bg },
  actions: { width: '100%', maxWidth: 480, alignSelf: 'center', gap: S.xs },
  secondary: { height: 44, justifyContent: 'center' },
  fade: { position: 'absolute', left: 0, right: 0, zIndex: 100 },
});
