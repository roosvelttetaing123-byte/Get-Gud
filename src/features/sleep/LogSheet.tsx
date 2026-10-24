/**
 * Log or edit a night (or a nap) by hand: when you slept, when you woke, how long it took.
 */
import { useState } from 'react';
import { View } from 'react-native';

import { C, S } from '@/constants/theme';
import { SheetGroup } from '@/features/settings/parts';
import { TimePill } from '@/features/settings/TimePill';
import { SheetCard } from '@/features/today/parts';
import { haptic } from '@/lib/haptics';
import { asleepHours, fmtDur, parseClock } from '@/lib/sleep';
import { actions, type SleepLog } from '@/lib/store';
import { Button, Chip, ListRow, Row, Segmented, Sheet, Txt } from '@/ui';

import { SLEEP_TINT } from './look';

const H = 3_600_000;
const LATENCY = [5, 15, 30, 60];
const AWAKE = [0, 15, 30, 60];
const pad = (n: number) => String(n).padStart(2, '0');
const hhmm = (ts: number) => {
  const d = new Date(ts);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
const minsLabel = (m: number) => (m === 0 ? 'None' : m >= 60 ? '1 h+' : `${m} min`);

type Kind = 'night' | 'nap';
type Morning = 'today' | 'yesterday';

export function LogSheet({ visible, onClose, log }: { visible: boolean; onClose: () => void; log?: SleepLog }) {
  return (
    <Sheet visible={visible} onClose={onClose} title={log ? 'Edit sleep' : 'Log sleep'} detent="large">
      <LogForm log={log} onDone={onClose} />
    </Sheet>
  );
}

function LogForm({ log, onDone }: { log?: SleepLog; onDone: () => void }) {
  const today0 = new Date();
  today0.setHours(0, 0, 0, 0);
  const initialMorning: Morning = log && log.wake < today0.getTime() ? 'yesterday' : 'today';

  const [kind, setKind] = useState<Kind>(log?.nap ? 'nap' : 'night');
  const [morning, setMorning] = useState<Morning>(initialMorning);
  const [bed, setBed] = useState(log ? hhmm(log.bed) : '23:00');
  const [wake, setWake] = useState(log ? hhmm(log.wake) : '07:00');
  const [latency, setLatency] = useState(log?.latencyMin ?? 15);
  const [awake, setAwake] = useState(log?.awakeMin ?? 0);

  const draft = build(kind, morning, bed, wake, latency, awake);
  const hours = draft ? asleepHours({ ...draft, id: 'x' }) : 0;

  const save = () => {
    if (!draft) return;
    actions.saveSleep({ ...draft, id: log?.id, quality: log?.quality });
    haptic.success();
    onDone();
  };

  return (
    <View style={{ gap: S.lg }}>
      <Segmented
        options={[
          { value: 'night', label: 'Night' },
          { value: 'nap', label: 'Nap' },
        ]}
        value={kind}
        onChange={setKind}
      />

      <SheetGroup>
        {kind === 'night' ? (
          <ListRow
            title="Woke up"
            accessory={
              <Row gap={6}>
                <Chip label="Today" selected={morning === 'today'} color={SLEEP_TINT} onPress={() => setMorning('today')} />
                <Chip label="Yesterday" selected={morning === 'yesterday'} color={SLEEP_TINT} onPress={() => setMorning('yesterday')} />
              </Row>
            }
          />
        ) : null}
        <ListRow title={kind === 'nap' ? 'Lay down' : 'In bed'} accessory={<TimePill value={bed} onChange={setBed} label="In bed" />} />
        <ListRow title="Woke" accessory={<TimePill value={wake} onChange={setWake} label="Woke" />} />
      </SheetGroup>

      <SheetCard title="Fell asleep in">
        <Row gap={S.sm} style={{ flexWrap: 'wrap' }}>
          {LATENCY.map((m) => (
            <Chip key={m} label={minsLabel(m)} selected={latency === m} color={SLEEP_TINT} onPress={() => setLatency(m)} />
          ))}
        </Row>
      </SheetCard>

      {kind === 'night' ? (
        <SheetCard title="Awake in the night">
          <Row gap={S.sm} style={{ flexWrap: 'wrap' }}>
            {AWAKE.map((m) => (
              <Chip key={m} label={minsLabel(m)} selected={awake === m} color={SLEEP_TINT} onPress={() => setAwake(m)} />
            ))}
          </Row>
        </SheetCard>
      ) : null}

      <View style={{ alignItems: 'center', gap: 2, paddingVertical: S.sm }}>
        <Txt v="footnote" color={C.label2}>
          Asleep
        </Txt>
        <Txt v="title1" rounded tabular color={draft ? C.label : C.label3}>
          {draft ? fmtDur(hours) : '--'}
        </Txt>
      </View>

      <Button title="Save" color={SLEEP_TINT} textColor="#FFFFFF" disabled={!draft || hours <= 0} onPress={save} />
      {log ? (
        <Button
          title="Delete"
          kind="plain"
          color={C.red}
          onPress={() => {
            actions.deleteSleep(log.id);
            haptic.warning();
            onDone();
          }}
        />
      ) : null}
    </View>
  );
}

/** Turn the form into timestamps. Bed later than wake on the clock means it was the evening before. */
function build(kind: Kind, morning: Morning, bed: string, wake: string, latency: number, awake: number) {
  const b = parseClock(bed);
  const w = parseClock(wake);
  if (b === undefined || w === undefined) return undefined;
  const day = new Date();
  day.setHours(0, 0, 0, 0);
  if (kind === 'night' && morning === 'yesterday') day.setDate(day.getDate() - 1);
  const wakeTs = day.getTime() + w * 60_000;
  let bedTs = day.getTime() + b * 60_000;
  if (bedTs >= wakeTs) bedTs -= 24 * H;
  if (wakeTs - bedTs > 16 * H) return undefined;
  const log: Omit<SleepLog, 'id'> = {
    bed: bedTs,
    wake: wakeTs,
    latencyMin: latency,
    awakeMin: kind === 'night' ? awake : 0,
    nap: kind === 'nap' ? true : undefined,
    source: 'manual',
  };
  return log;
}

