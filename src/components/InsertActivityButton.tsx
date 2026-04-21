import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';

interface Props {
  onPress: () => void;
}

export default function InsertActivityButton({ onPress }: Props) {
  return (
    <TouchableOpacity style={styles.button} onPress={onPress} activeOpacity={0.6}>
      <Text style={styles.text}>+</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    alignSelf: 'center',
    backgroundColor: '#D6EAFF',
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
    color: '#007AFF',
    marginTop: -1,
  },
});
