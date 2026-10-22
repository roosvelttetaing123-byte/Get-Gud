# Get Gud — design spec

A discipline and emotion-regulation app for a funded gold (XAU/USD) trader who trades evenings in GMT+7, and who also wants his daily life back on track. Its primary job: **interrupt the emotional decision in the moment** — before a revenge trade, before breaking a rule, before the late-night scroll — and make the patterns visible afterwards.

## Voice

- Plain, direct, sentence case. Short sentences. Talk like a calm trading mentor, not a cheerleader.
- Never shame. A broken rule is data. "Gave in" is logged, not judged.
- Buttons say exactly what happens: "Log entry", "Walk away", "Save result". Same verb through the flow.
- No emoji in UI copy. No exclamation marks. No ALL-CAPS labels. No "→" on buttons. No "A · B · C" meta strings.
- Empty states tell the user what to do next.

## Colour = meaning (src/constants/theme.ts → `C`, `Tint`)

| Token | Hex | Means |
|---|---|---|
| ink | #121933 | background |
| surface | #1B2445 | grouped content |
| raised | #26315A | controls, chips, inputs |
| mist | #E9ECF5 | primary text **and** primary button fill |
| haze / faint | #8E97B5 / #5E6894 | secondary / tertiary text |
| jade | #5ED6A4 | clear, kept, resisted, win |
| tangerine | #FF9F43 | wait, caution, half size |
| coral | #FF5E6C | stop, broken, gave in, loss |
| gold | #E8B94A | **earned only** — streaks, milestones. Never a plain button. |

Never introduce new hex values in screens. Use `Tint.*` for soft backgrounds behind a meaning colour.

## Type

- **Big Shoulders Display** (condensed) via `<Display>` — headlines, numbers, verdicts. Sentence case, big. Type is the visual element; let it be large.
- **System (SF Pro)** via `<Body>`, `<Sub>`, `<Small>` — everything else.
- Scale in `T`: verdict 128, hero 56, title 34, stat 28, h2 22, body 17, sub 15, small 13.

## Layout

- Single column, left-aligned, 20pt gutters, 24pt between sections (`Screen` handles it).
- Each tab opens with `<Hero context="…" title="…" />`: one quiet context line, one big condensed title that states the situation (e.g. "3 of 4 kept", "Clear to look", "Sit with it").
- Group with `<Surface>`; don't wrap every item in its own card. Lists inside a Surface are separated by `<Divider/>`.
- Radii by hierarchy: surfaces 22, controls 14, chips pill.
- Touch targets ≥ 44pt. Everything has an `accessibilityRole`/label (the kit does this).

## Motion

- Spend boldness once: the **gate verdict** — the whole screen floods with the verdict colour and a giant word ("Clear." / "Wait." / "Stop.") scales in with one heavy haptic. That's the app's signature moment.
- Urge screen's breathing circle is functional motion (it paces the breath).
- No entrance animations on lists or cards. Respect `AccessibilityInfo.isReduceMotionEnabled()` — skip scale/loop animation when on.

## Data & logic

- All state: `useStore()` from `src/lib/store.ts`; mutate only via `actions.*`.
- All rules/derivations: `src/lib/derive.ts` (gate evaluation, today's trading state, streaks, stats). Add pure helpers there if needed, don't put business logic in screens.
- Haptics: `haptic.*` from `src/lib/haptics.ts` (the kit already fires tap/press).
- Routes: tabs `(tabs)/index|gate|journal|urge`; modals `settings`, `trade/[id]`. Navigate with `router` / `Link` from `expo-router`. The urge tab accepts `?kind=Revenge%20trade` to preset the urge type.

## Kit (src/ui/index.tsx)

`Screen, Hero, Section, Surface, Row, Divider, Display, Body, Sub, Small, Button(kind: primary|secondary|ghost|danger), Chip(tone), Scale, CheckRow, Segmented, Stepper, Field, Stat, IconButton`.
