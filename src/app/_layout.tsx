import { DarkTheme, Stack, ThemeProvider, router } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { C } from '@/constants/theme';
import { AwardWatcher } from '@/features/awards/AwardWatcher';
import { UpdatePill } from '@/features/shell/UpdatePill';
import { HealthSync } from '@/features/sleep/HealthSync';
import { SleepMode } from '@/features/sleep/SleepMode';
import { initPwa } from '@/lib/pwa';
import { getState } from '@/lib/store';

SplashScreen.preventAutoHideAsync().catch(() => {});

const theme = {
  ...DarkTheme,
  colors: { ...DarkTheme.colors, background: C.bg, card: C.bg, text: C.label, primary: C.tint, border: C.separator },
};

export default function RootLayout() {
  useEffect(() => {
    // System font (SF Pro): nothing to load, so the app is interactive immediately.
    SplashScreen.hideAsync().catch(() => {});
    initPwa();
    if (!getState().settings.onboarded) {
      const t = setTimeout(() => router.push('/onboarding'), 0);
      return () => clearTimeout(t);
    }
  }, []);

  return (
    <ThemeProvider value={theme}>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.bg } }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="settings" options={{ presentation: 'modal' }} />
        <Stack.Screen name="trade/[id]" options={{ presentation: 'modal' }} />
        <Stack.Screen name="awards" options={{ presentation: 'modal' }} />
        <Stack.Screen name="onboarding" options={{ presentation: 'fullScreenModal', gestureEnabled: false }} />
      </Stack>
      <AwardWatcher />
      <SleepMode />
      <HealthSync />
      <UpdatePill />
    </ThemeProvider>
  );
}
