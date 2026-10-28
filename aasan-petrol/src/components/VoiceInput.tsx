import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, TextInputProps } from 'react-native';
import { speakText, getLanguagePreference } from '../services/device';

interface VoiceInputProps extends TextInputProps {
  labelEn: string;
  labelUr: string;
  promptEn: string;
  promptUr: string;
  placeholderEn: string;
  placeholderUr: string;
}

export const VoiceInput: React.FC<VoiceInputProps> = ({
  labelEn,
  labelUr,
  promptEn,
  promptUr,
  placeholderEn,
  placeholderUr,
  ...props
}) => {
  const lang = getLanguagePreference();
  const isUrdu = lang === 'ur';

  const handleVoicePress = () => {
    speakText(promptEn, promptUr);
  };

  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <Text style={[styles.label, isUrdu && styles.urduText]}>
          {isUrdu ? labelUr : labelEn}
        </Text>
        <TouchableOpacity
          onPress={handleVoicePress}
          style={styles.speakerBtn}
          activeOpacity={0.7}
          accessibilityLabel="Read instructions out loud"
        >
          <Text style={{ fontSize: 16 }}>🔊</Text>
        </TouchableOpacity>
      </View>

      <TextInput
        {...props}
        placeholder={isUrdu ? placeholderUr : placeholderEn}
        placeholderTextColor="#64748B"
        style={[styles.input, isUrdu && styles.urduInput, props.style]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 14,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: '800',
    color: '#F59E0B',
    letterSpacing: 0.5,
  },
  urduText: {
    fontSize: 14,
    textAlign: 'right',
  },
  speakerBtn: {
    backgroundColor: '#334155',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  input: {
    backgroundColor: '#0F172A',
    borderWidth: 1.5,
    borderColor: '#334155',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#FFFFFF',
    fontSize: 15,
  },
  urduInput: {
    textAlign: 'right',
  },
});