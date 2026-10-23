import { router } from 'expo-router';

import { Button, Screen } from '@/ui';

// Placeholder: a screen agent is building this route.
export default function Placeholder() {
  return (
    <Screen modal title="awards">
      <Button title="Close" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
    </Screen>
  );
}
