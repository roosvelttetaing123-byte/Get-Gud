import { Tabs } from 'expo-router';

import { C } from '@/constants/theme';
import { TabBar } from '@/ui/TabBar';

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: C.bg } }}>
      <Tabs.Screen name="index" options={{ title: 'Today' }} />
      <Tabs.Screen name="gate" options={{ title: 'Gate' }} />
      <Tabs.Screen name="journal" options={{ title: 'Journal' }} />
      <Tabs.Screen name="urge" options={{ title: 'Urge' }} />
    </Tabs>
  );
}
