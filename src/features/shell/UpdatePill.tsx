/** A small glass pill that appears when a new version has been downloaded. */
import { RefreshCw } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import { useInsets } from '@/ui/insets';

import { C } from '@/constants/theme';
import { applyUpdate, useUpdateAvailable } from '@/lib/pwa';
import { Glass, Pressy, Txt } from '@/ui';

export function UpdatePill() {
  const ready = useUpdateAvailable();
  const insets = useInsets();
  if (!ready) return null;
  return (
    <View pointerEvents="box-none" style={[styles.wrap, { top: insets.top + 6 }]}>
      <Pressy accessibilityRole="button" accessibilityLabel="Update the app" onPress={applyUpdate}>
        <Glass style={styles.pill}>
          <RefreshCw size={15} color={C.tint} strokeWidth={2.4} />
          <Txt v="subhead" weight="600">
            New version ready
          </Txt>
          <Txt v="subhead" weight="700" color={C.tint}>
            Update
          </Txt>
        </Glass>
      </Pressy>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, height: 40, borderRadius: 20 },
});
