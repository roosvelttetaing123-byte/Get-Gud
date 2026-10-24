/**
 * The gate: how do you feel, name it, your rules, then a verdict.
 * Nothing is saved until the verdict is acted on; every outcome (taken,
 * skipped, walked away, overridden) is logged with the mood and feelings.
 */
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useRef, useState } from 'react';

import { Slide } from '@/features/gate/anim';
import { FeelStep } from '@/features/gate/FeelStep';
import { Frame } from '@/features/gate/Frame';
import {
  ASSOCIATIONS,
  FEELINGS,
  coolLeft,
  morningValence,
  sessionBadges,
  suggestions,
  toggleIn,
  walkedTotal,
} from '@/features/gate/logic';
import { NameStep } from '@/features/gate/NameStep';
import { RulesStep } from '@/features/gate/RulesStep';
import { useNow } from '@/features/gate/useNow';
import { VerdictView, WalkedView } from '@/features/gate/Verdict';
import { evaluateGate, tradingToday, type GateResult } from '@/lib/derive';
import { actions, getState, useStore } from '@/lib/store';
import { Button } from '@/ui';

type Step = 0 | 1 | 2;
type Phase =
  | { step: Step; dir: 1 | -1 }
  | { step: 'verdict'; result: GateResult; id: number }
  | { step: 'walked'; line: string; brief: boolean };

/** How strongly the mood colour washes the background on each step. */
const WASH: Record<Step, number> = { 0: 0.32, 1: 0.22, 2: 0.15 };

export default function GateScreen() {
  const state = useStore();
  const [now, refreshNow] = useNow();

  const [phase, setPhase] = useState<Phase>({ step: 0, dir: 1 });
  const [valence, setValence] = useState(4);
  const [feelings, setFeelings] = useState<string[]>([]);
  const [about, setAbout] = useState<string[]>([]);
  // Keyed by rule text so editing rules in Settings mid-flow never misaligns ticks.
  const [ticks, setTicks] = useState<Record<string, boolean>>({});
  // Set once a verdict is shown; read on focus, so a ref avoids re-running the effect.
  const finished = useRef(false);
  // A cool-down Wait is kept when you come back, so the countdown means something.
  const holding = useRef(false);
  const runs = useRef(0);

  const reset = useCallback(() => {
    finished.current = false;
    holding.current = false;
    setPhase({ step: 0, dir: 1 });
    setValence(4);
    setFeelings([]);
    setAbout([]);
    setTicks({});
  }, []);

  useFocusEffect(
    useCallback(() => {
      refreshNow();
      if (finished.current && !holding.current) reset();
    }, [refreshNow, reset]),
  );

  const rules = state.settings.rules;
  const checked = rules.map((r) => !!ticks[r]);
  const go = (step: Step, dir: 1 | -1 = 1) => setPhase({ step, dir });

  const check = () => {
    const s = getState();
    const result = evaluateGate(
      { emotions: feelings, checked: s.settings.rules.map((r) => !!ticks[r]), valence, associations: about },
      s,
      Date.now(),
    );
    finished.current = true;
    holding.current = result.verdict === 'wait' && result.waitUntil !== undefined;
    runs.current += 1;
    setPhase({ step: 'verdict', result, id: runs.current });
  };

  const log = (result: GateResult, taken: boolean, overridden: boolean, plan?: string) => {
    const p = plan?.trim();
    holding.current = false;
    actions.addTrade({
      emotions: feelings,
      verdict: result.verdict,
      reasons: result.reasons,
      taken,
      overridden,
      valence,
      associations: about,
      ...(p ? { plan: p } : null),
    });
  };

  if (phase.step === 'walked') {
    return (
      <WalkedView
        line={phase.line}
        total={walkedTotal(state)}
        onDone={reset}
        autoDoneMs={phase.brief ? 4000 : undefined}
      />
    );
  }

  if (phase.step === 'verdict') {
    const { result } = phase;
    return (
      <VerdictView
        key={phase.id}
        result={result}
        checkedIn={{ valence, feelings, about, ticked: checked.filter(Boolean).length, total: rules.length }}
        cooldownMs={state.settings.cooldownMin * 60000}
        onLog={(plan, half) => {
          const p = plan.trim();
          log(result, true, false, half ? (p ? `${p} (half size)` : 'Half size') : p);
          router.push('/journal');
        }}
        onSkip={() => {
          log(result, false, false);
          setPhase({ step: 'walked', line: 'That’s a win. Logged.', brief: true });
        }}
        onWalkAway={() => {
          log(result, false, false);
          if (result.lossDriven) router.push({ pathname: '/urge', params: { kind: 'Revenge trade' } });
          else setPhase({ step: 'walked', line: 'The trade most people can’t make.', brief: false });
        }}
        onOverride={() => {
          log(result, true, true);
          router.push('/journal');
        }}
        onRecheck={check}
        onStartOver={reset}
      />
    );
  }

  const step = phase.step;
  const morning = morningValence(state, now);
  const footer =
    step === 0 ? (
      <Button title="Next" onPress={() => go(1)} />
    ) : step === 1 ? (
      <Button title={feelings.length ? 'Next' : 'Name a feeling'} disabled={!feelings.length} onPress={() => go(2)} />
    ) : (
      <Button title="Check me" disabled={!rules.length} onPress={check} />
    );

  return (
    <Frame
      valence={valence}
      strength={WASH[step]}
      step={step}
      onBack={step > 0 ? () => go((step - 1) as Step, -1) : undefined}
      footer={footer}>
      <Slide key={step} dir={phase.dir}>
        {step === 0 ? (
          <FeelStep
            valence={valence}
            onChange={setValence}
            badges={sessionBadges(tradingToday(state, now), state.settings, coolLeft(state, now))}
            morning={morning}
            onSameAsMorning={() => {
              if (morning) setValence(morning);
              go(1);
            }}
          />
        ) : step === 1 ? (
          <NameStep
            valence={valence}
            feelings={feelings}
            about={about}
            suggested={suggestions(valence, state, now)}
            onToggleFeeling={(f) => setFeelings((prev) => toggleIn(FEELINGS, prev, f))}
            onToggleAbout={(a) => setAbout((prev) => toggleIn(ASSOCIATIONS, prev, a))}
            onEditMood={() => go(0, -1)}
          />
        ) : (
          <RulesStep
            rules={rules}
            checked={checked}
            onToggle={(i, on) => {
              const rule = rules[i];
              setTicks((prev) => ({ ...prev, [rule]: on }));
            }}
          />
        )}
      </Slide>
    </Frame>
  );
}
