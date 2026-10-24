# Get Gud

A discipline and emotion-control app for iPhone, built for trading and for life.

- **Today**: three daily rings (Promises, Mind, Discipline), a 30-second morning check-in and a close-the-day ritual, promise switches, and a forgiving streak with freezes.
- **Gate**: before every trade, slide to how you feel, name it, and tick your rules. The answer is *Clear*, *Wait* (with a live cool-down) or *Stop*, based on your feelings, rules, daily limits, loss streak and cool-down.
- **Journal**: what each feeling costs you, rules followed vs broken, weekly R bars and every entry.
- **Urge**: name the urge, rate it, and breathe through it with a Breathe-style bloom until it passes.
- **Sleep**: sleep debt, energy curve, trade windows, learned sleep need and Apple Health import.
- **Coach** (on Today): one card a day. After a rough night, a calm three-step plan built from your own energy curve and results. Otherwise, the most useful pattern it has learned about you (how sleep, feelings, urges and habits shape your days), held to a statistical bar before it says anything (`src/lib/coach.ts`).
- **Medals**: 3D medals for streaks and discipline, like "Walked away" for honouring a Stop.

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
  ui/             component kit (Apple iOS 26 patterns)
DESIGN.md         design and copy rules
```

Typecheck: `npx tsc --noEmit` · Lint: `npx expo lint`
