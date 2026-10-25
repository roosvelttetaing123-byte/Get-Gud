/**
 * Global: stamps newly earned medals the moment their condition is met (anywhere in the app),
 * and celebrates each one once, with the live 3D medal and confetti.
 */
import { useEffect } from 'react';
import { AppState } from 'react-native';

import { newlyEarned, reconcile, uncelebrated } from '@/lib/engage';
import { actions, useStore } from '@/lib/store';
import { Celebration } from '@/ui';

export function AwardWatcher() {
  const state = useStore();

  // Apply streak freezes / earn freezes once per calendar day: at launch, whenever the app
  // comes back to the foreground (iOS home-screen apps usually resume rather than relaunch),
  // and every minute so a day change while open is caught too. reconcile() is a no-op once
  // it has run for today.
  useEffect(() => {
    const run = () => actions.mutate((s) => reconcile(s));
    run();
    const sub = AppState.addEventListener('change', (status) => {
      if (status === 'active') run();
    });
    const timer = setInterval(run, 60_000);
    return () => {
      sub.remove();
      clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    const ids = newlyEarned(state);
    if (ids.length) actions.grantAwards(ids);
  }, [state]);

  const award = state.settings.onboarded ? uncelebrated(state)[0] : undefined;
  return (
    <Celebration
      key={award?.id ?? 'none'}
      visible={!!award}
      image={award?.image}
      title={award?.title ?? ''}
      detail={award?.detail}
      onDone={() => award && actions.markAwardsSeen([award.id])}
      medalId={award?.id}
      earnedAt={award ? state.awards[award.id] : undefined}
    />
  );
}
