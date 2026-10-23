# Get Gud

A discipline and emotion-control app for iPhone, built for trading and for life.

- **Gate** — before every trade: name what you feel, tick every rule. The app answers *Clear*, *Wait* or *Stop* using your feelings, your checklist, your daily trade limit, your loss streak and a cool-down after losses.
- **Journal** — log each result (R multiple, rules followed, how you feel after). It shows what each emotion costs you, and how rule-breaking and overrides really perform.
- **Urge** — when you want to revenge trade, move a stop, doomscroll or skip the gym: name it, rate it, and ride it out with a guided breathing timer.
- **Today** — morning/evening check-in: mood, energy, sleep, daily promises, streak, and your trading status for the day.

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
```

A native App Store build is also possible later with EAS (`npx eas-cli@latest build --platform ios`).

## Stack

Expo SDK 58, React Native 0.88 + react-native-web, Expo Router, TypeScript, Plus Jakarta Sans, lucide icons, react-native-svg, expo-linear-gradient. Storage: `expo-sqlite` key-value store on native, `localStorage` on web.

```
src/
  app/            routes: (tabs)/index|gate|journal|urge, settings, trade/[id]
  constants/      design tokens (colour = meaning)
  lib/store.ts    on-device state + actions
  lib/derive.ts   gate rules, streaks, journal stats (pure functions)
  ui/             component kit
DESIGN.md         design and copy rules
```

Typecheck: `npx tsc --noEmit` · Lint: `npx expo lint`
