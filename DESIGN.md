# Get Gud design spec v3: Apple-grade, lively, daily

Get Gud is a discipline and emotion-control app for RV, a funded gold (XAU/USD) day trader in Cambodia (GMT+7) who also wants his life back on track: sleep, gym, being at work on time, study, and less doomscrolling. It ships as a **home-screen web app on iPhone** (Expo + react-native-web, GitHub Pages /Get-Gud/), and runs natively too.

**The bar:** it must feel like Apple built it (iOS 26). It should be smooth and easy to understand in 3 seconds, lively and fun to touch, and something he *wants* to open every morning and evening. He called earlier versions "horrendous". Don't ship anything you wouldn't put next to Apple Fitness.

## The six rules

1. **One hero, one primary action per screen.** Everything else is progressively disclosed. Each screen should answer three questions: where am I, how am I doing, what do I do next.
2. **Content is opaque, navigation is glass.** Cards are `C.card` (#1C1C1E) on true black `C.bg`. Glass/blur goes only on the floating tab bar, sheets, and floating buttons over media. Never put glass on content cards.
3. **Colour makes it lively, with meaning.**
   - Rings: Promises orange→yellow, Mind indigo→violet, Discipline mint→green.
   - Coloured icon squares on every list row, like iOS Settings.
   - Verdicts: green Clear / orange Wait / red Stop.
   - Mood: purple→blue→orange.
   - Brand tint is gold `C.tint` (#FFB800), used for primary actions and selection.
   - Use iOS 26 system colours from `SYS`. Never invent hex values in screens.
4. **Springs, not tweens.** Every tap responds: `Pressy` scales to 0.96 with a snappy spring. Numbers and rings animate with `useSpringValue`. Bouncy springs are only for rewards (ring closing, medal reveal). Honour reduce motion.
5. **Short words.** Sentence case, plain verbs, no paragraphs. Labels are 1–3 words, helper text one line. No emoji, no exclamation marks, no ALL CAPS, no "→" in copy.
6. **Reward process, never P&L.** Celebrate check-ins, kept promises, honoured Stops ("Walked away"), and urges ridden out. Red days must never feel punitive. A missed promise is neutral grey, never red shame.

## Tokens (`src/constants/theme.ts`)

- `C`: bg, card, card2, fill/fill2/fill3/fill4, label/label2/label3/label4, separator, tint (gold), clear/wait/stop, win/loss, plus every `SYS` colour (blue, green, orange, red, yellow, mint, teal, cyan, indigo, purple, pink, brown, gray…).
- `RING.{promises|mind|discipline}`: `{from, to, track, label}`. `VALENCE[0..6]`: `{label, color}` for mood 1–7.
- `tint(hex, alpha)` gives a translucent colour for wells and backgrounds.
- `TYPE`: Apple Dynamic Type styles (largeTitle 34/41, title1 28, title2 22, title3 20, headline 17 semibold, body 17, callout 16, subhead 15, footnote 13, caption1 12, caption2 11).
- `FONT.system` is SF Pro via `-apple-system`. `FONT.rounded` is SF Pro Rounded, used for numbers.
- `S` spacing (margin 16, section 28), `R` radii (card 26, inner 14, sheet 36, pill), `TABBAR`, `SPRING` presets.
- **Do not use the deprecated aliases** (ink, surface, mist, haze, jade, coral, Pastel, F, T…). They exist only for `src/ui/legacy.tsx`, which will be deleted.

## Kit (`import { … } from '@/ui'`; never from `@/ui/legacy`)

- **Text:**
  - `Txt` takes `v` (a TYPE style), `color`, `weight`, `rounded`, `tabular`, `align` and `numberOfLines`.
  - `Num` is a big SF Rounded tabular number: `size`, `weight`, `color`.
- **Layout:**
  - `Screen` takes `title` (a large left-aligned title), `caption` (a small line above it), `accessory` (right side, e.g. `IconButton`), `scroll`, `modal` and `gap`. It handles safe areas, the floating tab bar and the scroll-edge effect.
  - `Section` takes `title` (Title 3), `action={{label,onPress}}` and `footer`.
  - `Card` takes `onPress` (springy) and `padding`. Also `Row`, `Divider`.
- **Lists:** `Group` (an inset grouped list with `header`/`footer`) containing `ListRow`s. A `ListRow` takes `icon`, `iconColor`, `title`, `subtitle`, `value`, `chevron`, `accessory`, `onPress` and `destructive`. `ToggleRow` is a ListRow with a **real iOS switch**: a tap anywhere toggles it and plays the native haptic tick on iPhone. Also `IconSquare` and `IconWell`.
- **Controls:**
  - `Button` takes `kind` (filled | tinted | gray | plain | destructive | glass), `size` (large | medium | small), `icon`, `color` (to override the tint), `full`.
  - `IconButton`, `Chip` (`selected`, `color`, `icon`), `Segmented` (sliding thumb), `Stepper`, `Field` (17px, so iOS doesn't zoom), and `NativeSwitch` / `HapticTarget`.
- **Data:** `Stat`, `Badge`, `Empty` (`icon`, `title`, `message`, `action`).
- **Rings:** `Rings` takes `values={{promises, mind, discipline}}`, `size` and `stroke`, and animates in. Also `MiniRing` (`ring` key) and `ProgressRing` (`from`/`to` colours, used for timers).
- **Overlays:**
  - `Sheet` takes `visible`, `onClose`, `title`, `detent` (medium | large) and `action`. It is an iOS sheet with a spring and a grabber.
  - `Celebration` is a full-screen medal reveal with confetti; it is already wired globally for medals.
  - `Medal` is a 3D medal image that tilts toward your finger with a specular sweep.
- **Motion:** `Pressy` (any tappable thing), `useSpringValue(target, 'smooth' | 'snappy' | 'bouncy')`, `useReduceMotion()`.
- **Glass:** `Glass`, only for floating navigation-layer elements.
- Lucide icons (`lucide-react-native`): size them to the text (17–24), use strokeWidth ~2.

If the kit lacks something you need, build it inside your own feature folder in the same style. Don't edit `src/ui/*` or the theme; the lead owns them. If something in the kit is broken, say so in your report.

## Logic

- `src/lib/store.ts`: `useStore()`, `getState()` and `actions.*`. The actions include `checkIn(key, {valence, energy, sleepHours, intention})`, `closeDay(key, {rating, win, lesson})`, `togglePromise`, `addTrade`, `closeTrade`, `addUrge`, `updateSettings`, `grantAwards`, `markAwardsSeen`, `importState` and `mutate`. `dayKey()` returns the local date.
- `src/lib/engage.ts`:
  - `ringDetails(s, key)` returns the label, value, done/total and caption for each ring; `ringsFor` returns the raw values.
  - Streaks: `streak(s)` counts days you showed up, with freezes and rest days, and `weekStrip(s)` returns Mon–Sun states (done | frozen | rest | missed | today | future).
  - `stageOf(s)` returns checkin | day | close | done. It drives Today's single primary action.
  - Medals: `AWARDS` (id, title, detail, image, earned, progress) and `LOCKED_MEDAL`.
  - `settings.freezes` holds the streak freezes in the bank.
- `src/lib/derive.ts`: `evaluateGate`, `tradingToday`, `journalStats`, `EMOTIONS`, `fmtR`, `timeAgo`. Only the Gate agent may edit this file.
- Medals are stamped and celebrated globally by `AwardWatcher` in the root layout, so never celebrate medals yourself.

## 3D assets (`assets/3d/*.webp`, pre-rendered and transparent)

- Medals: `medal-streak-3/7/21/66/100`, `medal-walked-away`, `medal-perfect-day`, `medal-urge-surfer`, `medal-locked`.
- Others: `ring-trophy`, `urge-orb`, `urge-orb-glow`, `gate-shield`, and `mood-1` … `mood-7` (the State of Mind shapes, purple and spiky → blue pebble → orange bloom).
- Show them with `expo-image` `<Image source={require('@/assets/3d/x.webp')} contentFit="contain" />`. They are hero and reward objects; don't use them as decoration everywhere.

## Pattern per screen (from Apple first-party apps)

- **Today = Fitness Summary.**
  - Rings are the hero.
  - One primary action by stage: "Check in" (morning sheet, 4 taps: mood slider, energy, sleep, intention), "Close the day" (evening sheet, 3 taps), or a calm done state.
  - Then promises as switch rows, the week strip, and the streak with freezes.
- **Gate = Health State of Mind, then a checklist, then a Weather-style verdict.**
  - Step 1: a slider over the 7 mood shapes, colour shifting purple→blue→orange.
  - Step 2: name the feeling with chips, plus "what's it about" associations.
  - Step 3: rules as switches.
  - Step 4: a full-bleed verdict with one action. A Wait shows a countdown ring.
  - Under 30 seconds in total.
- **Journal = Health Highlights plus Screen Time charts.** One plain-English insight, a weekly R bar chart coloured by verdict, "What each feeling costs" sorted worst first, then entries.
- **Urge = Breathe plus one sec.** Name it with big chips, rate it with a vertical slider, then a breathing bloom (4s in / 6s out, 1/3/5 min). Re-rate and show the drop ("8 to 4").
- **Settings = iOS Settings.** Inset grouped lists with coloured icon squares, a chevron, and switches.

## Visual QA (required)

- A dev server runs at `http://localhost:8081/` and hot-reloads. Routes are at the root (`/`, `/gate`, `/journal`, `/urge`, `/settings`, `/trade/t1`, `/awards`, `/onboarding`).
- Screenshot with seeded realistic data: `python3 /tmp/claude-0/-home-claude/dfe0b30b-3d4e-51c8-a2d2-962c42b3a608/scratchpad/snap.py <prefix> <route…> [--empty]`. It saves `<prefix>_<route>.png` at 390pt @2x, full page.
- For interactions, write your own Playwright script modelled on snap.py. Click by role and name, because all tabs stay mounted.
- Look at every state with the Read tool and critique it against the bar above. Iterate until it is excellent. Check 360pt and 430pt widths too.
