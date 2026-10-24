/**
 * Urge tab, the SOS button. Name the urge, rate it, ride it out with paced
 * breathing (urge surfing), then re-rate and log how it went.
 * Flow: pick -> surf (full-screen modal) -> review (re-rate, then result) -> pick.
 */
import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';

import { PickView } from '@/features/urge/PickView';
import { ReviewView } from '@/features/urge/ReviewView';
import { SurfModal } from '@/features/urge/SurfView';
import { durationOptions, matchKind, type Session } from '@/features/urge/model';
import { actions, useStore, type UrgeOutcome } from '@/lib/store';

const EXTEND_MS = 60_000;

type Flow =
  | { step: 'pick' }
  | { step: 'surf'; session: Session }
  | { step: 'review'; session: Session; seconds: number; saved?: UrgeOutcome; after?: number };

export default function UrgeScreen() {
  const { urges, settings } = useStore();
  const fallback = Math.max(1, Math.round(settings.urgeMinutes || 3));
  const minuteOptions = durationOptions(settings.urgeMinutes);

  const [flow, setFlow] = useState<Flow>({ step: 'pick' });
  const [kind, setKind] = useState<string | undefined>();
  const [before, setBefore] = useState<number | undefined>();
  const [chosenMinutes, setMinutes] = useState<number | undefined>();
  const minutes = chosenMinutes ?? fallback;
  /** startAt of the last saved session, so a double tap can't log it twice. */
  const savedSession = useRef<number | null>(null);

  // ?kind=Revenge%20trade presets the card; re-applied whenever the param changes.
  const { kind: kindParam } = useLocalSearchParams<{ kind?: string }>();
  const preset = matchKind(kindParam);
  const [appliedPreset, setAppliedPreset] = useState<string | undefined>();
  if (preset !== appliedPreset) {
    setAppliedPreset(preset);
    if (preset) setKind(preset);
  }

  const session = flow.step === 'pick' ? undefined : flow.session;

  const reset = () => {
    setFlow({ step: 'pick' });
    setKind(undefined);
    setBefore(undefined);
    setMinutes(undefined);
    router.setParams<'/urge'>({ kind: undefined });
  };

  return (
    <>
      {flow.step === 'review' ? (
        <ReviewView
          key={`review-${flow.session.startAt}`}
          kind={flow.session.kind}
          ridden={urges.filter((u) => u.outcome === 'resisted').length}
          before={flow.session.before}
          seconds={flow.seconds}
          saved={flow.saved}
          after={flow.after}
          onSave={(outcome, after) => {
            const s = flow.session;
            if (flow.saved || savedSession.current === s.startAt) return;
            savedSession.current = s.startAt;
            actions.addUrge({ kind: s.kind, before: s.before, after, outcome, seconds: flow.seconds });
            setFlow({ ...flow, saved: outcome, after });
          }}
          onDone={reset}
        />
      ) : (
        <PickView
          kind={kind}
          before={before}
          minutes={minutes}
          minuteOptions={minuteOptions}
          urges={urges}
          onKind={setKind}
          onBefore={setBefore}
          onMinutes={setMinutes}
          onStart={() => {
            if (kind === undefined || before === undefined) return;
            const now = Date.now();
            setFlow({ step: 'surf', session: { kind, before, startAt: now, endAt: now + minutes * 60_000, seed: now } });
          }}
        />
      )}

      <SurfModal
        visible={flow.step === 'surf'}
        session={session}
        onExtend={() => {
          if (flow.step !== 'surf') return;
          setFlow({ step: 'surf', session: { ...flow.session, endAt: flow.session.endAt + EXTEND_MS } });
        }}
        onEnd={(seconds) => {
          if (flow.step !== 'surf') return;
          setFlow({ step: 'review', session: flow.session, seconds: Math.max(0, seconds) });
        }}
      />
    </>
  );
}
