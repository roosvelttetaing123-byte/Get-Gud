# Get Gud design spec (v2)

Get Gud is a discipline and emotion-control app for RV, a funded gold (XAU/USD) trader in Cambodia, and for his daily life. It must look and feel like a polished, market-ready consumer app, on the level of Calm, Headspace or a premium fitness app. Its main job is to **interrupt the emotional decision in the moment** (revenge trade, broken rule, late-night scroll), then make the patterns visible afterwards.

It ships mainly as an **installable web app** (GitHub Pages, added to the iPhone home screen), built with Expo and react-native-web. Everything must look right at a 390×844 phone viewport in a browser.

**Reference screen: `src/app/(tabs)/index.tsx` (Today).** Match its level of polish, density and visual richness.

## Visual language

- **Background:** deep night navy (`C.ink`). **Cards:** `Card`/`Surface` (navy, 1px hairline border, radius 22).
- **One hero `ArtCard` per tab:** gradient artwork (`art="dawn" | "gold" | "calm" | "ember"`), bold white text, optionally a darker `footer` row of 2–3 stats. It's the first big thing under the header. Use a different artwork per tab: Today = dawn, Journal = gold, Urge = calm, Gate = ember on its first step.
- **Pastel `Tile`s for anything you tap to choose:** promises, urge kinds, emotions, actions. Laid out in `Grid` (2 columns, or 3 for small items). Unselected tiles are dark with a pastel icon; selected tiles show the full pastel gradient with dark text. Rotate pastels with variety: sky, mint, butter, rose, lilac, peach.
- **Icons everywhere they help**, from `lucide-react-native` (e.g. `import { Flame } from 'lucide-react-native'`). Use the kit's `Icon`, `IconBadge` (icon in a soft rounded square) and `IconButton`. Every list row and card title should usually have an IconBadge.
- **Charts and rings** via `react-native-svg` (already installed): `ProgressRing` in the kit; draw sparklines and bars with Svg/Path/Rect. No chart libraries.
- **Buttons:** `primary` (white), `accent` (blue gradient, for the main forward action on a screen), `secondary`, `ghost`, `danger`. Buttons can take an `icon`.
- `Pill` for small status labels (streaks, verdicts, counts).

## Colour = meaning (`C`, `Tint`, `Pastel` in src/constants/theme.ts)

- jade = clear, kept, resisted, win · tangerine = wait, caution · coral = stop, broken, gave in, loss · gold = earned (streaks)
- accent blue = navigation, selection, primary forward action, never a verdict
- Pastels are for tappable tiles, not for verdicts.
- Never invent new hex values in screens. Use tokens; `rgba()` overlays of tokens are fine.

## Type

- One family, **Plus Jakarta Sans**, through the kit: `Display` (headlines and numbers, weights extra/bold/semi), `Body`, `Sub`, `Small`.
- Headlines are bold and tight. Big numbers carry stats. Sentence case everywhere.

## Layout

- Header at the top of each tab: `Hero` (context line plus bold title) with an optional right-side `IconButton`, or `Greeting` on Today.
- 20pt gutters, 24pt between sections (`Screen` handles both). `Section` titles are bold, with an optional `aside` on the right.
- The tab bar is absolute at the bottom; `Screen` already pads for it. Modals (`<Screen modal>`) have no tab bar.
- Touch targets are at least 44pt. Give everything an accessibilityRole and label; the kit does this for its own components.

## Voice

- Plain, direct, calm, like a trading mentor. Never shame: a broken rule is data.
- Buttons say exactly what happens ("Log entry", "Walk away", "Save result").
- No emoji, no exclamation marks, no ALL-CAPS labels, no "→" on buttons.
- Empty states tell the user what to do next.

## Motion

- The **gate verdict** is the signature moment: a full-screen colour flood, a giant word scaling in, and a haptic.
- The Urge breathing circle is functional motion.
- Press feedback is in the kit (scale/opacity). No decorative entrance animations. Respect reduce motion.

## Data & logic (unchanged)

- State comes from `useStore()` in `src/lib/store.ts`; mutate only through `actions.*`. Derivations live in `src/lib/derive.ts` and feature `logic.ts` files.
- Routes: tabs are `(tabs)/index|gate|journal|urge`; modals are `settings` and `trade/[id]`.

## Kit (src/ui/index.tsx)

`Screen, Hero, Greeting, Section, Surface/Card, ArtCard, Row, Divider, Display, Body, Sub, Small, Icon, IconBadge, Avatar, Pill, ProgressRing, Tile, Grid, Button, Chip, Scale, CheckRow, Segmented, Stepper, Field, Stat, IconButton`
