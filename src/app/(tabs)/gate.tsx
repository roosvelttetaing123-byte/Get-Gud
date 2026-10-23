/**
 * The gate. Feel, rules, verdict. Nothing is saved until the verdict is
 * acted on; every outcome (taken, skipped, walked away, overridden) is logged.
 */
import { router, useFocusEffect, useIsFocused } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useRef, useState } from 'react';

import { FeelStep } from '@/features/gate/FeelStep';
import { isLossDriven, toggleEmotion } from '@/features/gate/logic';
import { RulesStep } from '@/features/gate/RulesStep';
import { useNow } from '@/features/gate/useNow';
import { useReduceMotion } from '@/features/gate/useReduceMotion';
import { announceVerdict, VerdictStep, WalkedStep } from '@/features/gate/VerdictStep';
import { evaluateGate, tradingToday, type GateResult } from '@/lib/derive';
import { actions, getState, useStore } from '@/lib/store';

type Phase =
  | { step: 'feel' }
  | { step: 'rules' }
  | { step: 'verdict'; result: GateResult; lossDriven: boolean; id: number }
  | { step: 'walked'; line: string; brief: boolean };

export default function GateScreen() {
  const state = useStore();
  const focused = useIsFocused();
  const reduceMotion = useReduceMotion();
  const [now, refreshNow] = useNow();

  const [phase, setPhase] = useState<Phase>({ step: 'feel' });
  const [emotions, setEmotions] = useState<string[]>([]);
  // Keyed by rule text so editing rules in Settings mid-flow never misaligns ticks.
  const [ticks, setTicks] = useState<Record<string, boolean>>({});
  // Set once a verdict is reached; read only on focus, so a ref avoids re-running the effect.
  const finished = useRef(false);
  const runs = useRef(0);

  const reset = useCallback(() => {
    finished.current = false;
    setPhase({ step: 'feel' });
    setEmotions([]);
    setTicks({});
  }, []);

  useFocusEffect(
    useCallback(() => {
      refreshNow();
      if (finished.current) reset();
    }, [refreshNow, reset]),
  );

  const rules = state.settings.rules;
  const checked = rules.map((r) => !!ticks[r]);

  const check = () => {
    const s = getState();
    const at = Date.now();
    const result = evaluateGate({ emotions, checked: s.settings.rules.map((r) => !!ticks[r]) }, s, at);
    finished.current = true;
    runs.current += 1;
    setPhase({ step: 'verdict', result, lossDriven: isLossDriven(emotions, s, at), id: runs.current });
    announceVerdict(result);
  };

  const log = (result: GateResult, taken: boolean, overridden: boolean, plan?: string) => {
    const p = plan?.trim();
    actions.addTrade({
      emotions,
      verdict: result.verdict,
      reasons: result.reasons,
      taken,
      overridden,
      ...(p ? { plan: p } : null),
    });
  };

  const darkBar = focused && (phase.step === 'verdict' || phase.step === 'walked');
  const statusBar = darkBar ? <StatusBar style="dark" animated /> : null;

  if (phase.step === 'feel') {
    return (
      <FeelStep
        selected={emotions}
        onToggle={(label) => setEmotions((prev) => toggleEmotion(prev, label))}
        limitHit={tradingToday(state, now).limitHit}
        onNext={() => {
          refreshNow();
          setPhase({ step: 'rules' });
        }}
      />
    );
  }

  if (phase.step === 'rules') {
    return (
      <RulesStep
        state={state}
        now={now}
        checked={checked}
        onToggle={(i) => {
          const rule = rules[i];
          setTicks((prev) => ({ ...prev, [rule]: !prev[rule] }));
        }}
        onBack={() => setPhase({ step: 'feel' })}
        onCheck={check}
      />
    );
  }

  if (phase.step === 'walked') {
    return (
      <>
        {statusBar}
        <WalkedStep line={phase.line} onDone={reset} autoDoneMs={phase.brief ? 3500 : undefined} />
      </>
    );
  }

  const { result, lossDriven } = phase;
  return (
    <>
      {statusBar}
      <VerdictStep
        key={phase.id}
        result={result}
        reduceMotion={reduceMotion}
        onLogEntry={(plan) => {
          log(result, true, false, plan);
          router.push('/journal');
        }}
        onSkip={() => {
          log(result, false, false);
          setPhase({ step: 'walked', line: 'That’s a win. Logged.', brief: true });
        }}
        onWalkAway={() => {
          log(result, false, false);
          if (lossDriven) router.push({ pathname: '/urge', params: { kind: 'Revenge trade' } });
          else setPhase({ step: 'walked', line: 'That’s the trade most people can’t make. Logged.', brief: false });
        }}
        onOverride={() => {
          log(result, true, true);
          router.push('/journal');
        }}
        onStartOver={reset}
      />
    </>
  );
}
