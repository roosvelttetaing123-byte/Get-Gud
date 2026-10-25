/**
 * The pre-rendered medal with the kit's press tilt and specular sweep (same feel as ui/Medal), shown
 * while live 3D loads and wherever it can't run. Kept here so ui/Medal (Celebration) can use Medal3D
 * without an import cycle.
 */
import { Image, type ImageSource } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { haptic } from '@/lib/haptics';
import { useSpringValue } from '@/ui/motion';

export function Still({ image, size, label }: { image: ImageSource; size: number; label?: string }) {
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [down, setDown] = useState(false);
  const rx = useSpringValue(tilt.x, 'bouncy');
  const ry = useSpringValue(tilt.y, 'bouncy');
  const shine = useSpringValue(down ? 1 : 0, 'smooth');
  return (
    <Pressable
      accessibilityRole="image"
      accessibilityLabel={label}
      onPress={() => haptic.tap()}
      onPressIn={(e) => {
        const { locationX, locationY } = e.nativeEvent;
        setTilt({ x: ((locationY - size / 2) / size) * -22, y: ((locationX - size / 2) / size) * 22 });
        setDown(true);
      }}
      onPressOut={() => {
        setTilt({ x: 0, y: 0 });
        setDown(false);
      }}
      style={{ width: size, height: size }}>
      <View
        style={{
          width: size,
          height: size,
          transform: [{ perspective: 600 }, { rotateX: `${rx}deg` }, { rotateY: `${ry}deg` }, { scale: 1 + shine * 0.04 }],
        }}>
        <Image source={image} style={{ width: size, height: size }} contentFit="contain" />
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity: shine * 0.9, borderRadius: size / 2, overflow: 'hidden' }]}>
          <LinearGradient
            colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.35)', 'rgba(255,255,255,0)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ position: 'absolute', width: size * 1.6, height: size * 1.6, left: -size * 0.3 + shine * size * 0.3, top: -size * 0.3 }}
          />
        </View>
      </View>
    </Pressable>
  );
}
