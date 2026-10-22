import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { C, S } from '@/constants/theme';
import type { UrgeOutcome } from '@/lib/store';
import { Body, Button, Display, Hero, Scale, Screen, Sub, Surface } from '@/ui';

import { clock } from './model';

export function ReviewView({
  before,
  seconds,
  saved,
  onSave,
  onDone,
}: {
  before: number;
  seconds: number;
  saved?: UrgeOutcome;
  onSave: (outcome: UrgeOutcome, after?: number) => void;
  onDone: () => void;
}) {
  const [after, setAfter] = useState<number | undefined>();

  return (
    <Screen>
      <Hero context={`You sat with it for ${clock(seconds)}`} title="How is it now?" />

      {saved === undefined ? (
        <>
          <View style={styles.scale}>
            <Sub>{`It started at ${before}.`}</Sub>
            <Scale value={after} onChange={setAfter} max={10} low="Faint" high="Overwhelming" />
          </View>
          <View style={styles.choices}>
            <Button label="I rode it out" style={styles.big} onPress={() => onSave('resisted', after)} />
            <Button kind="secondary" label="I gave in" style={styles.big} onPress={() => onSave('gave_in', after)} />
          </View>
        </>
      ) : (
        <>
          {saved === 'resisted' ? (
            <Surface tone="jade">
              <Display color={C.jade}>Rode it out.</Display>
              <Body>{"That's a rep. Every one makes the next easier."}</Body>
            </Surface>
          ) : (
            <Surface>
              <Body>Logged. No judgement. Notice what made it hard, and start here sooner next time.</Body>
            </Surface>
          )}
          <Button label="Done" onPress={onDone} />
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  scale: { gap: S.md },
  choices: { gap: S.md },
  big: { minHeight: 64 },
});
