/**
 * Global: stamps newly earned medals the moment their condition is met (anywhere in the app),
 * and celebrates each one once, with the 3D medal and confetti.
 */
import { useEffect } from 'react';

import { newlyEarned, reconcile, uncelebrated } from '@/lib/engage';
import { actions, useStore } from '@/lib/store';
import { Celebration } from '@/ui';

export function AwardWatcher() {
  const state = useStore();

  // Apply streak freezes / earn freezes once per day.
  useEffect(() => {
    actions.mutate((s) => reconcile(s));
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
    />
  );
}
