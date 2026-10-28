import React, { useRef, useState } from 'react';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Button, Text, View, StyleSheet } from 'react-native';
import { theme } from '../lib/theme';

export default function CameraCapture({ onCaptured, onCancel }: { onCaptured: (uri: string) => void; onCancel: () => void }) {
  const [permission, requestPermission] = useCameraPermissions();
  const camera = useRef<CameraView>(null);
  const [busy, setBusy] = useState(false);

  if (!permission) return <View style={styles.center}><Text>Checking camera permission…</Text></View>;
  if (!permission.granted) return <View style={styles.center}>
    <Text style={styles.text}>Camera access is needed to capture genuine evidence.</Text>
    <Button title="Allow camera" onPress={requestPermission} />
    <Button title="Cancel" onPress={onCancel} />
  </View>;

  async function capture() {
    if (!camera.current || busy) return;
    setBusy(true);
    try {
      const photo = await camera.current.takePictureAsync({ quality: 0.75 });
      if (photo?.uri) onCaptured(photo.uri);
    } catch (e) {
      console.warn(e);
    } finally { setBusy(false); }
  }

  return <View style={styles.container}>
    <CameraView ref={camera} style={styles.camera} facing="back" />
    <Text style={styles.hint}>Keep the entire dispenser display inside the frame.</Text>
    <View style={styles.actions}>
      <Button title="Cancel" onPress={onCancel} color={theme.colors.muted} />
      <Button title={busy ? 'Capturing…' : 'Take photo'} onPress={capture} disabled={busy} color={theme.colors.maroon} />
    </View>
  </View>;
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111' },
  camera: { flex: 1 },
  hint: { color: '#fff', textAlign: 'center', padding: 14, fontSize: 15 },
  actions: { flexDirection: 'row', justifyContent: 'space-around', padding: 18, backgroundColor: '#fff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, gap: 16 },
  text: { color: theme.colors.ink, textAlign: 'center', fontSize: 16 }
});
