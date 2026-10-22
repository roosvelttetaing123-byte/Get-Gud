import { NativeTabs } from 'expo-router/native-tabs';

import { C } from '@/constants/theme';

export default function TabLayout() {
  return (
    <NativeTabs
      backgroundColor={C.ink}
      indicatorColor={C.raised}
      tintColor={C.mist}
      labelStyle={{ default: { color: C.haze }, selected: { color: C.mist } }}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Today</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'sun.horizon', selected: 'sun.horizon.fill' }} md="today" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="gate">
        <NativeTabs.Trigger.Label>Gate</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'checkmark.shield', selected: 'checkmark.shield.fill' }} md="verified_user" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="journal">
        <NativeTabs.Trigger.Label>Journal</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'book.closed', selected: 'book.closed.fill' }} md="menu_book" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="urge">
        <NativeTabs.Trigger.Label>Urge</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="wind" md="air" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
