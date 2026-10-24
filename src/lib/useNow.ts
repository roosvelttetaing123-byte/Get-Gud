import { useCallback, useEffect, useState } from 'react';

/**
 * Current time, refreshed on an interval so time-based facts stay honest.
 * `refresh` snaps it to now (e.g. when the screen regains focus).
 */
export function useNow(intervalMs = 30_000): [number, () => void] {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  const refresh = useCallback(() => setNow(Date.now()), []);
  return [now, refresh];
}
