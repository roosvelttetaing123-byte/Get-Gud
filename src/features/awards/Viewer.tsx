/**
 * Full-screen medal viewer, like opening an award in Apple Fitness: the medal spins in on black under
 * its own coloured light. Drag to spin it, flick it, double-tap or Flip to read the back, or Tilt to look
 * and move the phone so the light runs across the metal.
 */
import { Rotate3d, Smartphone, X } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { Modal, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useInsets } from '@/ui/insets';

import { C, S } from '@/constants/theme';
import { Medal3D, requestTilt, tiltApi, tiltNeedsPermission, watchTiltData, type Medal3DHandle } from '@/features/medal3d';
import { Button, IconButton, Txt, useSpringValue } from '@/ui';

import { backOf, earnedLine, glowOf, lockedLine, type MedalView } from './model';
import { Glow } from './parts';

export function MedalViewer({
  view,
  section,
  visible,
  now,
  onClose,
}: {
  view?: MedalView;
  section?: string;
  visible: boolean;
  now: Date;
  onClose: () => void;
}) {
  const p = useSpringValue(visible ? 1 : 0, 'smooth', 0);
  // stay mounted while the close fade plays out
  if (!view || (!visible && p < 0.01)) return null;
  return (
    <Modal transparent visible animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <ViewerBody key={view.award.id} view={view} section={section} p={p} now={now} onClose={onClose} />
    </Modal>
  );
}

function ViewerBody({
  view,
  section,
  p,
  now,
  onClose,
}: {
  view: MedalView;
  section?: string;
  p: number;
  now: Date;
  onClose: () => void;
}) {
  const { width, height } = useWindowDimensions();
  const insets = useInsets();
  const medal = useRef<Medal3DHandle>(null);
  const [tilt, setTilt] = useState(false);
  // iOS asks first, so the button shows; elsewhere it appears once the phone reports a real tilt
  const [canTilt, setCanTilt] = useState(tiltNeedsPermission);
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    if (canTilt || !tiltApi()) return;
    return watchTiltData(() => setCanTilt(true));
  }, [canTilt]);

  const { award, earned } = view;
  const size = Math.round(Math.max(200, Math.min(width - 96, 320, height * 0.42)));
  const light = earned ? glowOf(award.id) : C.indigo;
  const G = Math.round(Math.min(width * 1.5, 640));
  const line = earned ? earnedLine(view, now) : lockedLine(view);
  const label = earned
    ? `${award.title} medal, ${line.toLowerCase()}. Drag to spin, double tap to turn it over.`
    : `${award.title}, locked, ${line.toLowerCase()}. Drag to spin, double tap to see your progress.`;

  const onTilt = () => {
    if (tilt) {
      setTilt(false);
      return;
    }
    // must run inside the tap: iOS only shows its motion prompt for a user gesture
    requestTilt().then((ok) => {
      setTilt(ok);
      setDenied(!ok);
    });
  };

  return (
    <View style={[StyleSheet.absoluteFill, styles.root, { opacity: p }]}>
      <View style={[styles.column, { paddingTop: insets.top + S.sm, paddingBottom: insets.bottom + S.xl }]}>
        <View style={styles.top}>
          <IconButton icon={X} label="Close" onPress={onClose} color={C.label} bg="rgba(255,255,255,0.14)" />
        </View>

        <View style={[styles.center, { transform: [{ translateY: (1 - p) * 28 }] }]}>
          {section ? (
            <Txt v="subhead" weight="600" color={C.label2}>
              {section}
            </Txt>
          ) : null}
          <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
            <View pointerEvents="none" style={{ position: 'absolute', left: (size - G) / 2, top: (size - G) / 2, width: G, height: G }}>
              <Glow size={G} color={light} strength={earned ? 0.5 : 0.26} />
            </View>
            <Medal3D
              ref={medal}
              id={award.id}
              image={award.image}
              locked={!earned}
              size={size}
              back={backOf(view, now)}
              label={label}
              intro="spin"
              tilt={tilt}
            />
          </View>
          <View style={styles.words}>
            <Txt v="largeTitle" align="center">
              {award.title}
            </Txt>
            <Txt v="headline" color={earned ? C.label2 : C.tint} align="center">
              {line}
            </Txt>
            <Txt v="body" color={C.label2} align="center" style={{ maxWidth: 320, marginTop: S.sm }}>
              {award.detail}
            </Txt>
          </View>
        </View>

        <View style={styles.actions}>
          <Button title="Flip" kind="gray" size="medium" icon={Rotate3d} full={false} onPress={() => medal.current?.flip()} />
          {canTilt ? (
            <Button
              title={tilt ? 'Tilt on' : 'Tilt to look'}
              kind={tilt ? 'tinted' : 'gray'}
              size="medium"
              icon={Smartphone}
              full={false}
              onPress={onTilt}
            />
          ) : null}
        </View>
        {denied ? (
          <Txt v="footnote" color={C.label2} align="center">
            Allow motion in Settings to tilt
          </Txt>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { backgroundColor: '#000000' },
  column: { flex: 1, width: '100%', maxWidth: 600, alignSelf: 'center', paddingHorizontal: S.margin, gap: S.md },
  top: { flexDirection: 'row', justifyContent: 'flex-end' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: S.lg },
  words: { alignItems: 'center', gap: 4, paddingHorizontal: S.sm },
  actions: { flexDirection: 'row', justifyContent: 'center', gap: S.md },
});
