/** Mounted once in the root layout: pulls Health sleep when the app opens or comes back. */
import { useEffect } from 'react';
import { AppState } from 'react-native';

import { syncHealth } from '@/lib/healthSync';

export function HealthSync() {
  useEffect(() => {
    syncHealth();
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') syncHealth();
    });
    return () => sub.remove();
  }, []);
  return null;
}
