import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useSettings } from '../contexts/SettingsContext';

interface Props {
  onPress: () => void;
}

export default function InsertActivityButton({ onPress }: Props) {
  const { colors } = useSettings();
  return (
    <TouchableOpacity style={[styles.button, { backgroundColor: colors.editBannerBackground }]} onPress={onPress} activeOpacity={0.6}>
      <Text style={[styles.text, { color: colors.accent }]}>+</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    alignSelf: 'center',
    borderRadius: 16,
    paddingHorizontal: 20,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 2,
  },
  text: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: -1,
  },
});
