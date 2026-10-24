/**
 * Export and import for the Data group.
 * iOS only shows the share sheet or file picker for a call made straight from the tap, so
 * exportBackup() and pickBackupFile() run first in the handler, before any await or dialog.
 * Import order: pick, validate, confirm, apply.
 */
import { useState } from 'react';
import { Platform } from 'react-native';

import { BackupError, exportBackup, importBackup, pickBackupFile } from '@/lib/backup';
import { haptic } from '@/lib/haptics';
import { actions, type State } from '@/lib/store';

import type { ConfirmAsk, InformAsk } from './confirm';

export type FlashRow = 'export' | 'import';

const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`;

/** "9 trades, 7 days, 3 urges" */
export function backupSummary(s: State): string {
  return [plural(s.trades.length, 'trade'), plural(Object.keys(s.days).length, 'day'), plural(s.urges.length, 'urge')].join(', ');
}

export function useBackup({
  confirm,
  inform,
}: {
  confirm: (a: ConfirmAsk) => void;
  inform: (a: InformAsk) => void;
}) {
  // A short "Saved" / "Restored" in the row's value slot, like iOS confirming in place.
  const [flash, setFlash] = useState<{ row: FlashRow; text: string; id: number } | null>(null);
  const show = (row: FlashRow, text: string) => {
    const id = Date.now();
    setFlash({ row, text, id });
    setTimeout(() => setFlash((f) => (f?.id === id ? null : f)), 2600);
  };

  const onExport = () => {
    const delivery = exportBackup(); // first, inside the tap
    delivery
      .then(({ method }) => {
        if (method === 'cancelled') return;
        haptic.success();
        show('export', method === 'downloaded' ? 'Saved' : 'Shared');
      })
      .catch(() => inform({ title: 'Couldn’t export', message: 'Something went wrong making the backup. Try again.' }));
  };

  const canImport = Platform.OS === 'web';

  const onImport = () => {
    if (!canImport) {
      inform({ title: 'Import backup', message: 'Import is available in the web app. Open Get Gud in Safari to restore a backup.' });
      return;
    }
    const picking = pickBackupFile(); // first, inside the tap
    void (async () => {
      const file = await picking;
      if (!file) return;
      let next: State;
      try {
        next = await importBackup(file);
      } catch (e) {
        haptic.error();
        inform({
          title: 'Can’t import this file',
          message: e instanceof BackupError ? e.message : 'That file couldn’t be read.',
        });
        return;
      }
      confirm({
        title: 'Replace everything?',
        quote: backupSummary(next),
        message: 'Everything on this iPhone is replaced with this backup. This can’t be undone.',
        confirmLabel: 'Replace',
        cancelLabel: 'Cancel',
        onConfirm: () => {
          actions.importState(next);
          haptic.success();
          show('import', 'Restored');
        },
      });
    })();
  };

  return { onExport, onImport, canImport, flash };
}
