/**
 * "Today's rings", opened from the hero: exactly what's left to close each ring, with the
 * controls right there. Promises not yet kept as switches, the two Mind rituals, and today's
 * trades for Discipline. Missed things stay neutral grey; nothing here is red shame.
 */
import { router } from 'expo-router';
import { Check, DoorOpen, Moon, OctagonX, ShieldAlert, ShieldCheck, Smile, Target } from 'lucide-react-native';
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { C, RING, S, SYS } from '@/constants/theme';
import type { RingDetail } from '@/lib/engage';
import { clockLabel } from '@/lib/sleep';
import type { CheckIn, DayClose, Trade } from '@/lib/store';
import { ListRow, Sheet, ToggleRow, Txt } from '@/ui';

import { ringColor } from './HeroRings';
import { SheetHeading, SheetRows } from './parts';
import { setPromise } from './Promises';
import { TodayRings } from './TodayRings';
import { promiseColor, promiseIcon } from './visuals';

export interface RingsSheetProps {
  visible: boolean;
  onClose: () => void;
  details: RingDetail[];
  perfect: boolean;
  dayKey: string;
  promises: string[];
  kept: Record<string, boolean>;
  checkin?: CheckIn;
  close?: DayClose;
  /** Hour Today starts asking to close the day (17 or 18). */
  closeFrom: number;
  /** It's that time now. */
  canClose: boolean;
  /** Today's gate entries, taken and walked away. */
  trades: Trade[];
  limitHit: string | null;
  onCheckIn: () => void;
  onCloseDay: () => void;
}

export function RingsSheet(props: RingsSheetProps) {
  return (
    <Sheet visible={props.visible} onClose={props.onClose} title="Today’s rings" detent="large">
      <RingsBody {...props} />
    </Sheet>
  );
}

const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`;

/** Mounted fresh each time the sheet opens. */
function RingsBody({
  onClose,
  details,
  perfect,
  dayKey,
  promises,
  kept,
  checkin,
  close,
  closeFrom,
  canClose,
  trades,
  limitHit,
  onCheckIn,
  onCloseDay,
}: RingsSheetProps) {
  // The promises left when you opened the sheet stay put as you tick them, so rows never jump away.
  const [left] = useState(() => promises.filter((p) => !kept[p]));
  const keptBefore = promises.filter((p) => !left.includes(p));
  const by = Object.fromEntries(details.map((d) => [d.key, d])) as Record<string, RingDetail>;
  const promisesLeft = promises.filter((p) => !kept[p]).length;
  const ritualsLeft = (checkin ? 0 : 1) + (close ? 0 : 1);

  const leave = (path: '/gate' | '/settings' | `/trade/${string}`) => {
    onClose();
    if (path === '/gate') router.navigate(path);
    else router.push(path);
  };

  const summary = perfect
    ? 'All three rings closed. A perfect day.'
    : [promisesLeft ? plural(promisesLeft, 'promise') : null, ritualsLeft ? plural(ritualsLeft, 'ritual') : null]
        .filter(Boolean)
        .join(' and ') + (promisesLeft || ritualsLeft ? ' left' : '');

  const entries = [...trades].sort((a, b) => a.ts - b.ts);
  const good = by.discipline.done;

  return (
    <>
      <View style={styles.top}>
        <TodayRings details={details} perfect={perfect} size={176} />
        {summary ? (
          <Txt v="subhead" color={C.label2} align="center">
            {summary}
          </Txt>
        ) : null}
      </View>

      <View style={styles.section}>
        <SheetHeading
          title="Promises"
          color={ringColor('promises')}
          status={promises.length ? `${by.promises.done} of ${promises.length} kept` : undefined}
        />
        {!promises.length ? (
          <SheetRows>
            <ListRow icon={Target} iconColor={RING.promises.from} title="Add promises" chevron onPress={() => leave('/settings')} />
          </SheetRows>
        ) : left.length ? (
          <SheetRows>
            {left.map((p) => (
              <ToggleRow
                key={p}
                icon={promiseIcon(p)}
                iconColor={promiseColor(promises.indexOf(p))}
                title={p}
                value={!!kept[p]}
                onChange={(v) => setPromise(dayKey, promises, kept, p, v)}
              />
            ))}
          </SheetRows>
        ) : (
          <SheetRows>
            <ListRow icon={Check} iconColor={SYS.green} title={`All ${promises.length} kept`} subtitle="Ring closed" />
          </SheetRows>
        )}
        {left.length && keptBefore.length ? (
          <Txt v="footnote" color={C.label2} style={styles.foot}>
            Kept already: {keptBefore.join(', ')}
          </Txt>
        ) : null}
      </View>

      <View style={styles.section}>
        <SheetHeading title="Mind" color={ringColor('mind')} status={`${by.mind.done} of 2`} />
        <SheetRows>
          <ListRow
            icon={Smile}
            iconColor={SYS.orange}
            title={checkin ? 'Checked in' : 'Check in'}
            subtitle={checkin ? undefined : '30 seconds. Sets up your day.'}
            value={checkin ? clockLabel(checkin.at) : undefined}
            accessory={checkin ? <Check size={18} color={SYS.green} strokeWidth={3} /> : undefined}
            chevron={!checkin}
            onPress={onCheckIn}
          />
          <ListRow
            icon={Moon}
            iconColor={SYS.indigo}
            title={close ? 'Day closed' : 'Close the day'}
            value={close ? clockLabel(close.at) : canClose ? undefined : `From ${closeFrom}:00`}
            accessory={close ? <Check size={18} color={SYS.green} strokeWidth={3} /> : undefined}
            chevron={canClose && !close}
            onPress={close || canClose ? onCloseDay : undefined}
          />
        </SheetRows>
      </View>

      <View style={styles.section}>
        <SheetHeading
          title="Discipline"
          color={ringColor('discipline')}
          status={entries.length ? `${good} of ${entries.length} by the rules` : 'No trades yet'}
        />
        <SheetRows>
          {entries.length ? null : (
            <ListRow icon={ShieldCheck} iconColor={RING.discipline.from} title="No trades. That counts." />
          )}
          {entries.map((t) => (
            <EntryRow key={t.id} t={t} onPress={() => leave(`/trade/${t.id}`)} />
          ))}
          {limitHit ? (
            <ListRow icon={OctagonX} iconColor={C.stop} title="Done trading for today" subtitle={limitHit.replace(/\s*Done for today\.?$/, '')} />
          ) : (
            <ListRow icon={ShieldCheck} iconColor={C.tint} title="Check before you trade" chevron onPress={() => leave('/gate')} />
          )}
        </SheetRows>
      </View>
    </>
  );
}

/** One gate entry. Walking away is a win; a broken rule is a plain fact, never red. */
function EntryRow({ t, onPress }: { t: Trade; onPress: () => void }) {
  const time = clockLabel(t.ts);
  if (!t.taken) {
    return (
      <ListRow
        icon={DoorOpen}
        iconColor={SYS.green}
        title="Walked away"
        subtitle={`${time} · Honoured a ${t.verdict === 'stop' ? 'stop' : 'wait'}`}
        chevron
        onPress={onPress}
      />
    );
  }
  const broke = t.overridden || t.followedRules === false;
  const status = t.overridden
    ? 'Taken through a stop'
    : t.followedRules === false
      ? 'Broke a rule'
      : t.followedRules
        ? 'By the rules'
        : 'Result to log';
  return (
    <ListRow
      icon={broke ? ShieldAlert : ShieldCheck}
      iconColor={broke ? SYS.gray : RING.discipline.from}
      title={t.plan?.trim() || 'Trade'}
      subtitle={`${time} · ${status}`}
      chevron
      onPress={onPress}
    />
  );
}

const styles = StyleSheet.create({
  top: { alignItems: 'center', gap: S.md, paddingTop: S.xs },
  section: { gap: S.sm },
  foot: { paddingHorizontal: S.lg },
});
