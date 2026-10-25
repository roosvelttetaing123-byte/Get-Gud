# Get Gud

A discipline and emotion-control app for iPhone, built for trading and for life.

- **Today**: three daily rings (Promises, Mind, Discipline) beside their numbers, tap them for what's left, swipe them to spin. One primary action by stage (check in, check before you trade with today's trades and trade window folded in, close the day). "Your day": a swipeable timeline of daylight, peaks, trade windows, the dip, caffeine, close the day and bed, with a now marker. A jelly mood shape you can poke, a forgiving streak whose flame turns blue at 21 days and purple at 66.
- **Coach** (on Today): one card a day. After a rough night, a calm three-step plan built from your own energy curve and results. Otherwise, the most useful pattern it has learned about you, held to a statistical bar before it says anything (`src/lib/coach.ts`). "What I've learned" is a swipeable deck.
- **Gate**: before every trade, slide to how you feel, name it, and tick your rules. The answer is *Clear*, *Wait* (with a live cool-down) or *Stop*, based on your feelings, rules, daily limits, loss streak and cool-down.
- **Journal**: 7 or 30 days of R you can scrub with a finger, "Your days" (a mood calendar; tap a day for its sleep, mood, trades and promises), what each feeling, tiredness and rule-breaking costs, and filterable entries.
- **Week in review**: from Sunday evening, a story of your week in full-screen slides: rituals, promises, trading by the rules, urges ridden out, sleep, and one focus for next week (`src/lib/review.ts`).
- **Urge**: name the urge, rate it, and breathe through it with a Breathe-style bloom until it passes.
- **Sleep**: sleep debt, a 24-hour body-clock dial you turn to see your energy, phase and trade window at any hour, the last 14 nights you can scrub, trade windows, learned sleep need and Apple Health sync.
- **Medals**: real-time 3D medals (three.js, loaded only when needed). Drag to spin, flick, double-tap to read the engraved back, or tilt your phone to make them catch the light.
- **Backgrounds**: living colour that follows the sun on Today (and your morning mood), a glow per tab, or Midnight / True black in Settings.

Everything is stored only on the phone. No account, no server.

## Install on your iPhone

1. Open **https://roosvelttetaing123-byte.github.io/Get-Gud/** in **Safari**.
2. Tap **Share**, then **Add to Home Screen**.

It opens full-screen with its own icon. Updates arrive automatically the next time you open it.

## Publish an update

```bash
npm install
npm run deploy   # builds the web app and pushes it to the gh-pages branch
```

## Develop

```bash
npx expo start --web    # live preview in the browser at /Get-Gud/
npx expo start          # Expo Go on a phone
npm run typecheck && npm run lint
npm run test:engine      # sleep engine tests (Node's test runner, three time zones)
```

A native App Store build is also possible later with EAS (`npx eas-cli@latest build --platform ios`).

## Stack

Expo SDK 58, React Native 0.88 + react-native-web, Expo Router, TypeScript, SF Pro (system font), lucide icons, react-native-svg, Reanimated, expo-blur. Storage: `expo-sqlite` key-value store on native, `localStorage` on web. Offline service worker and iPhone launch screens for the home-screen app. 3D assets are pre-rendered with `tools/render3d` (headless three.js).

```
src/
  app/            routes: (tabs)/index|gate|journal|urge, settings, trade/[id]
  constants/      design tokens (colour = meaning)
  lib/store.ts    on-device state + actions
  lib/derive.ts   gate rules, streaks, journal stats (pure functions)
  lib/sleep.ts    sleep engine: debt, body clock, energy curve (pure)
  lib/sleepEdge.ts, sleepNeed.ts, modelFit.ts   sleep vs results, learned need, model fit (pure)
  lib/engage.ts   rings, streak freezes, medals
  lib/coach.ts, review.ts   the coach and the week in review (pure)
  features/medal3d/   live 3D medals (three.js, its own async chunk)
  ui/             component kit (Apple iOS 26 patterns), living colour Backdrop
DESIGN.md         design and copy rules
```

Typecheck: `npx tsc --noEmit` · Lint: `npx expo lint`
