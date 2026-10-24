/** Initials avatar, like an Apple Account photo placeholder: a gold to orange circle, white initials. */
import { LinearGradient } from 'expo-linear-gradient';
import { User } from 'lucide-react-native';
import { Text } from 'react-native';

import { C, FONT } from '@/constants/theme';

/** "RV" stays "RV"; "Roosvelt Tetaing" becomes "RT"; "Roosvelt" becomes "R". */
export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return '';
  if (words.length > 1) return (words[0][0] + words[1][0]).toUpperCase();
  const w = words[0];
  return w.length <= 3 && w === w.toUpperCase() ? w : w[0].toUpperCase();
}

export function Avatar({ name, size = 60 }: { name: string; size?: number }) {
  const text = initials(name);
  return (
    <LinearGradient
      colors={[C.tint, C.orange]}
      start={{ x: 0.15, y: 0 }}
      end={{ x: 0.85, y: 1 }}
      style={{ width: size, height: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center' }}>
      {text ? (
        <Text
          allowFontScaling={false}
          style={{
            fontFamily: FONT.rounded,
            fontSize: Math.round(size * (text.length > 2 ? 0.34 : 0.4)),
            fontWeight: '600',
            color: '#FFFFFF',
            letterSpacing: 0.5,
          }}>
          {text}
        </Text>
      ) : (
        <User size={size * 0.5} color="#FFFFFF" strokeWidth={2} />
      )}
    </LinearGradient>
  );
}
