import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View, ViewStyle } from 'react-native';
import { theme } from './theme';

export function Screen({ children, dark = false }: { children: React.ReactNode; dark?: boolean }) {
  return <View style={[styles.screen, dark && { backgroundColor: '#1A1A1A' }]}>{children}</View>;
}
export function Heading({ children }: { children: React.ReactNode }) {
  return <Text style={styles.heading}>{children}</Text>;
}
export function Subheading({ children }: { children: React.ReactNode }) {
  return <Text style={styles.subheading}>{children}</Text>;
}
export function Body({ children, style }: { children: React.ReactNode; style?: any }) {
  return <Text style={[styles.body, style]}>{children}</Text>;
}
export function Button({ title, onPress, secondary, disabled, loading }: {
  title: string; onPress: () => void; secondary?: boolean; disabled?: boolean; loading?: boolean;
}) {
  return <Pressable accessibilityRole="button" onPress={onPress} disabled={disabled || loading}
    style={[styles.button, secondary && styles.secondaryButton, (disabled || loading) && styles.disabled]}>
    {loading ? <ActivityIndicator color={secondary ? theme.colors.maroon : '#fff'} /> :
      <Text style={[styles.buttonText, secondary && styles.secondaryButtonText]}>{title}</Text>}
  </Pressable>;
}
export function Field({ label, value, onChangeText, placeholder, secureTextEntry, keyboardType, autoCapitalize }: any) {
  return <View style={styles.fieldWrap}>
    <Text style={styles.label}>{label}</Text>
    <TextInput
      style={styles.input}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor="#9C9390"
      secureTextEntry={secureTextEntry}
      keyboardType={keyboardType || 'default'}
      autoCapitalize={autoCapitalize || 'sentences'}
      accessibilityLabel={label}
    />
  </View>;
}
export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}
export function StatusPill({ status }: { status: string }) {
  const verified = status === 'verified' || status === 'approved';
  const flagged = status === 'flagged' || status === 'rejected';
  const backgroundColor = verified ? theme.colors.greenLight : flagged ? theme.colors.redLight : theme.colors.amberLight;
  const color = verified ? theme.colors.green : flagged ? theme.colors.red : theme.colors.amber;
  return <View style={[styles.pill, { backgroundColor }]}><Text style={{ color, fontWeight: '700', fontSize: 12 }}>{status.replaceAll('_', ' ').toUpperCase()}</Text></View>;
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.cream, padding: 20, paddingTop: 24 },
  heading: { fontSize: 27, fontWeight: '800', color: theme.colors.ink, marginBottom: 8 },
  subheading: { fontSize: 18, fontWeight: '700', color: theme.colors.ink, marginBottom: 8 },
  body: { fontSize: 15, lineHeight: 22, color: theme.colors.muted },
  button: { backgroundColor: theme.colors.maroon, minHeight: 54, borderRadius: 14, paddingHorizontal: 18, justifyContent: 'center', alignItems: 'center', marginTop: 12 },
  secondaryButton: { backgroundColor: '#fff', borderWidth: 1, borderColor: theme.colors.maroon },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  secondaryButtonText: { color: theme.colors.maroon },
  disabled: { opacity: 0.55 },
  fieldWrap: { marginTop: 12 },
  label: { fontSize: 14, fontWeight: '700', color: theme.colors.ink, marginBottom: 6 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: theme.colors.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, fontSize: 16, color: theme.colors.ink },
  card: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: theme.colors.border, padding: 16, marginTop: 12 },
  pill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 100, alignSelf: 'flex-start' }
});
