/**
 * The seven setup pages. Each is a scrollable column: hero, Title 1, one line, then its controls.
 * State lives in the route so pages can mount and unmount as they slide.
 */
import { Handshake, Heart, Moon, Plus, ShieldCheck, Sun, Sunrise, UserRound } from 'lucide-react-native';
import React from 'react';
import { Platform, ScrollView, StyleSheet, TextInput, View, useWindowDimensions, type TextInputInstance } from 'react-native';

import { C, FONT, RING, S, SYS } from '@/constants/theme';
import { Card, Chip, Field, Group, IconButton, IconSquare, ListRow, ToggleRow, Txt } from '@/ui';

import { MAX_PROMISES, promiseLook, ruleLook, type Rituals } from './model';
import { FloatingMedal, HeroGlyph, RingLegend, StepHead, WelcomeRings } from './parts';

/**
 * iOS text fields show only a caret when focused, so drop the browser focus ring on web.
 * Passed inline: the global :focus-visible rule in public/index.html beats class-based styles.
 */
const NO_RING = (Platform.OS === 'web' ? { outlineStyle: 'none' } : {}) as object;

/* ---------- page shell ---------- */

export function Page({ children, center }: { children: React.ReactNode; center?: boolean }) {
  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={[styles.page, center && { justifyContent: 'center' }]}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
      automaticallyAdjustKeyboardInsets
      showsVerticalScrollIndicator={false}>
      <View style={styles.column}>{children}</View>
    </ScrollView>
  );
}

/* ---------- 1. welcome ---------- */

export function WelcomeStep() {
  const { width, height } = useWindowDimensions();
  const size = Math.round(Math.min(250, width * 0.6, height * 0.32));
  return (
    <Page center>
      <View style={{ alignItems: 'center', gap: S.xxxl + 8 }}>
        <WelcomeRings size={size} />
        <View style={{ alignItems: 'center', gap: S.lg }}>
          <StepHead big title="Get Gud" line={'Trade with a clear head.\nBuild days you’re proud of.'} />
          <RingLegend />
        </View>
      </View>
    </Page>
  );
}

/* ---------- 2. name ---------- */

export function NameStep({
  value,
  onChange,
  onSubmit,
  inputRef,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  inputRef: React.RefObject<TextInputInstance | null>;
}) {
  return (
    <Page>
      <StepHead
        hero={<HeroGlyph icon={UserRound} colors={[C.tint, SYS.orange]} />}
        title="Your name"
        line="What should we call you?"
      />
      <TextInput
        ref={inputRef}
        placeholderTextColor={C.label3}
        selectionColor={C.tint}
        keyboardAppearance="dark"
        value={value}
        onChangeText={onChange}
        placeholder="Your name"
        autoCapitalize="words"
        autoCorrect={false}
        autoComplete="given-name"
        textContentType="givenName"
        returnKeyType="next"
        onSubmitEditing={onSubmit}
        maxLength={40}
        accessibilityLabel="Your name"
        style={[styles.bigField, NO_RING]}
      />
    </Page>
  );
}

/* ---------- 3. why ---------- */

export function WhyStep({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <Page>
      <StepHead
        hero={<HeroGlyph icon={Heart} colors={[SYS.pink, SYS.purple]} />}
        title="Your why"
        line="Why are you doing this?"
      />
      <Field
        value={value}
        onChangeText={onChange}
        placeholder="Pass the next payout without breaking a rule."
        multiline
        maxLength={200}
        returnKeyType="done"
        blurOnSubmit
        submitBehavior="blurAndSubmit"
        accessibilityLabel="Your why"
        style={{ minHeight: 104 }}
      />
      <Txt v="footnote" color={C.label2} align="center" style={{ marginTop: -S.lg }}>
        It sits on Today, for the hard days.
      </Txt>
    </Page>
  );
}

/* ---------- 4. rules ---------- */

export interface RuleChoice {
  text: string;
  on: boolean;
}

export function RulesStep({
  rules,
  onToggle,
  draft,
  onDraft,
  onAdd,
}: {
  rules: RuleChoice[];
  onToggle: (i: number, on: boolean) => void;
  draft: string;
  onDraft: (v: string) => void;
  onAdd: () => void;
}) {
  return (
    <Page>
      <StepHead
        hero={<HeroGlyph icon={ShieldCheck} colors={[RING.discipline.from, RING.discipline.to]} />}
        title="Your rules"
        line="Switch off any that aren’t yours."
      />
      <Group footer="The gate checks these before every trade.">
        {rules.map((r, i) => {
          const look = ruleLook(r.text);
          return (
            <ToggleRow
              key={`${i}-${r.text}`}
              icon={look.icon}
              iconColor={look.color}
              title={r.text}
              value={r.on}
              onChange={(on) => onToggle(i, on)}
            />
          );
        })}
        <AddRow icon={Plus} value={draft} onChange={onDraft} onAdd={onAdd} placeholder="Add your own" />
      </Group>
    </Page>
  );
}

/** Inline "new item" row, like Reminders: a text field inside the grouped list. */
function AddRow({
  icon,
  value,
  onChange,
  onAdd,
  placeholder,
}: {
  icon: typeof Plus;
  value: string;
  onChange: (v: string) => void;
  onAdd: () => void;
  placeholder: string;
}) {
  const ready = value.trim().length > 0;
  return (
    <View style={styles.addRow}>
      <IconSquare icon={icon} color={ready ? C.green : C.gray3} />
      <TextInput
        value={value}
        onChangeText={onChange}
        onSubmitEditing={onAdd}
        placeholder={placeholder}
        placeholderTextColor={C.label3}
        selectionColor={C.tint}
        keyboardAppearance="dark"
        returnKeyType="done"
        submitBehavior="submit"
        blurOnSubmit={false}
        maxLength={120}
        accessibilityLabel="Add your own rule"
        style={[styles.addInput, NO_RING]}
      />
      {ready ? <IconButton icon={Plus} label="Add rule" onPress={onAdd} size={30} color="#000" bg={C.green} /> : null}
    </View>
  );
}

/* ---------- 5. promises ---------- */

export function PromisesStep({
  options,
  selected,
  onToggle,
  nudge,
}: {
  options: string[];
  selected: string[];
  onToggle: (p: string) => void;
  nudge: boolean;
}) {
  return (
    <Page>
      <StepHead
        hero={<HeroGlyph icon={Handshake} colors={[RING.promises.from, RING.promises.to]} />}
        title="Your promises"
        line="Small things you’ll do every day."
      />
      <View style={styles.chips}>
        {options.map((p) => {
          const look = promiseLook(p);
          return <Chip key={p} label={p} icon={look.icon} color={look.color} selected={selected.includes(p)} onPress={() => onToggle(p)} />;
        })}
      </View>
      <Txt v="footnote" align="center" color={nudge ? C.tint : C.label2} weight={nudge ? '600' : '400'}>
        {nudge
          ? `That’s ${MAX_PROMISES}. Drop one to swap in another.`
          : `${selected.length} of ${MAX_PROMISES}. A few you keep beat many you don’t.`}
      </Txt>
    </Page>
  );
}

/* ---------- 6. rituals ---------- */

export function RitualsStep({ rituals, onChange }: { rituals: Rituals; onChange: (r: Rituals) => void }) {
  return (
    <Page>
      <StepHead
        hero={<HeroGlyph icon={Sunrise} colors={[RING.mind.from, RING.mind.to]} />}
        title="Your rituals"
        line="Tie each to something you already do."
      />
      <View style={{ gap: S.md }}>
        <RitualCard
          icon={Sun}
          color={SYS.orange}
          title="Morning check-in"
          meta="30 seconds"
          label="I’ll check in…"
          value={rituals.morning}
          onChange={(morning) => onChange({ ...rituals, morning })}
        />
        <RitualCard
          icon={Moon}
          color={SYS.indigo}
          title="Close the day"
          meta="3 taps"
          label="I’ll close the day…"
          value={rituals.evening}
          onChange={(evening) => onChange({ ...rituals, evening })}
        />
      </View>
    </Page>
  );
}

function RitualCard({
  icon,
  color,
  title,
  meta,
  label,
  value,
  onChange,
}: {
  icon: typeof Sun;
  color: string;
  title: string;
  meta: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <Card style={{ gap: S.md }}>
      <View style={styles.ritualHead}>
        <IconSquare icon={icon} color={color} size={44} />
        <View style={{ flex: 1 }}>
          <Txt v="headline">{title}</Txt>
          <Txt v="subhead" color={C.label2}>
            {meta}
          </Txt>
        </View>
      </View>
      <Field
        label={label}
        value={value}
        onChangeText={onChange}
        maxLength={60}
        returnKeyType="done"
        accessibilityLabel={label.replace('…', '')}
      />
    </Card>
  );
}

/* ---------- 7. done ---------- */

const FIRST_MEDAL = require('@/assets/3d/medal-streak-3.webp');

export function DoneStep({ name, rituals }: { name: string; rituals: Rituals }) {
  const { height } = useWindowDimensions();
  const size = Math.round(Math.min(190, height * 0.22));
  const who = name.trim();
  return (
    <Page center>
      <View style={{ alignItems: 'center', gap: S.lg }}>
        <FloatingMedal image={FIRST_MEDAL} size={size} label="3-day streak medal" />
        <StepHead title={who ? `You’re all set, ${who}` : 'You’re all set'} line="Your first medal is 3 days away." />
      </View>
      <Group header="Your plan">
        <ListRow icon={Sun} iconColor={SYS.orange} title={rituals.morning.trim() || 'Each morning'} subtitle="Check in" />
        <ListRow icon={Moon} iconColor={SYS.indigo} title={rituals.evening.trim() || 'Each evening'} subtitle="Close the day" />
      </Group>
    </Page>
  );
}

const styles = StyleSheet.create({
  page: { flexGrow: 1, paddingHorizontal: S.xxl, paddingTop: S.sm, paddingBottom: S.xxl },
  column: { width: '100%', maxWidth: 480, alignSelf: 'center', gap: S.xxxl },
  bigField: {
    backgroundColor: C.card2,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 15,
    color: C.label,
    fontFamily: FONT.system,
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: S.sm },
  addRow: { flexDirection: 'row', alignItems: 'center', gap: S.md, paddingHorizontal: S.lg, minHeight: 52 },
  addInput: { flex: 1, color: C.label, fontSize: 17, fontFamily: FONT.system, paddingVertical: 12 },
  ritualHead: { flexDirection: 'row', alignItems: 'center', gap: S.md },
});
