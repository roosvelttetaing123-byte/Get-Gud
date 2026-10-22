# Get Gud

A discipline and emotion-control app for iPhone, built for trading and for life.

- **Gate** — before every trade: name what you feel, tick every rule. The app answers *Clear*, *Wait* or *Stop* using your feelings, your checklist, your daily trade limit, your loss streak and a cool-down after losses.
- **Journal** — log each result (R multiple, rules followed, how you feel after). It shows what each emotion costs you, and how rule-breaking and overrides really perform.
- **Urge** — when you want to revenge trade, move a stop, doomscroll or skip the gym: name it, rate it, and ride it out with a guided breathing timer.
- **Today** — morning/evening check-in: mood, energy, sleep, daily promises, streak, and your trading status for the day.

Everything is stored only on the phone. No account, no server.

## Run it on your iPhone (no Mac needed)

1. Install **Expo Go** from the App Store on your iPhone.
2. On your computer (Windows is fine), install Node.js 20+.
3. In this folder:
   ```bash
   npm install
   npx expo start
   ```
4. Scan the QR code with the iPhone camera. Phone and computer must be on the same Wi-Fi (or run `npx expo start --tunnel`).

## Install it as a real app (TestFlight)

Needs an Apple Developer account (USD 99/year). No Mac required — builds run in Expo's cloud:

```bash
npx eas-cli@latest login
npx eas-cli@latest build --platform ios --profile production
npx eas-cli@latest submit --platform ios
```

## Stack

Expo SDK 58, React Native 0.88, Expo Router (native tabs), TypeScript, `expo-sqlite` key-value store, `expo-haptics`, Big Shoulders Display.

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
