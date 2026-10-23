/**
 * Urge tab, the SOS button. Name the urge, sit with it through paced breathing
 * until it passes, then log how it went.
 * Flow: pick -> surf -> review -> pick.
 */
import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';

import { PickView } from '@/features/urge/PickView';
import { ReviewView } from '@/features/urge/ReviewView';
import { SurfView } from '@/features/urge/SurfView';
import { matchKind, type Session } from '@/features/urge/model';
import { actions, useStore, type UrgeOutcome } from '@/lib/store';

const EXTEND_MS = 5 * 60_000;

type Flow =
  | { step: 'pick' }
  | { step: 'surf'; session: Session }
  | { step: 'review'; session: Session; seconds: number; saved?: UrgeOutcome };

export default function UrgeScreen() {
  const { urges, settings } = useStore();
  const minutes = Math.max(1, Math.round(settings.urgeMinutes || 10));

  const [flow, setFlow] = useState<Flow>({ step: 'pick' });
  const [kind, setKind] = useState<string | undefined>();
  const [before, setBefore] = useState<number | undefined>();
  /** startAt of the last saved session, so a double tap can't log it twice. */
  const savedSession = useRef<number | null>(null);

  // ?kind=Revenge%20trade presets the chip; re-applied whenever the param changes.
  const { kind: kindParam } = useLocalSearchParams<{ kind?: string }>();
  const preset = matchKind(kindParam);
  const [appliedPreset, setAppliedPreset] = useState<string | undefined>();
  if (preset !== appliedPreset) {
    setAppliedPreset(preset);
    if (preset) setKind(preset);
  }

  if (flow.step === 'surf') {
    const { session } = flow;
    return (
      <SurfView
        key="surf"
        session={session}
        onExtend={() => setFlow({ step: 'surf', session: { ...session, endAt: session.endAt + EXTEND_MS } })}
        onEnd={(seconds) => setFlow({ step: 'review', session, seconds })}
      />
    );
  }

  if (flow.step === 'review') {
    const { session, seconds, saved } = flow;
    return (
      <ReviewView
        key="review"
        kind={session.kind}
        ridden={urges.filter((u) => u.outcome === 'resisted').length}
        before={session.before}
        seconds={seconds}
        saved={saved}
        onSave={(outcome, after) => {
          if (saved || savedSession.current === session.startAt) return;
          savedSession.current = session.startAt;
          actions.addUrge({ kind: session.kind, before: session.before, after, outcome, seconds });
          setFlow({ ...flow, saved: outcome });
        }}
        onDone={() => {
          setFlow({ step: 'pick' });
          setKind(undefined);
          setBefore(undefined);
          router.setParams<'/urge'>({ kind: undefined });
        }}
      />
    );
  }

  return (
    <PickView
      key="pick"
      kind={kind}
      before={before}
      minutes={minutes}
      urges={urges}
      onKind={setKind}
      onBefore={setBefore}
      onStart={() => {
        if (kind === undefined || before === undefined) return;
        const now = Date.now();
        setFlow({ step: 'surf', session: { kind, before, startAt: now, endAt: now + minutes * 60_000, seed: now } });
      }}
    />
  );
}
