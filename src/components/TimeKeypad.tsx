import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';

interface Props {
  value: string;
  onChange: (value: string) => void;
}

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', ':', '0', '⌫'];

export default function TimeKeypad({ value, onChange }: Props) {
  const handleKey = (key: string) => {
    if (key === '⌫') {
      // If the value ends with 'am' or 'pm', remove the whole suffix
      if (value.endsWith('am') || value.endsWith('pm')) {
        onChange(value.slice(0, -2));
      } else {
        onChange(value.slice(0, -1));
      }
    } else {
      onChange(value + key);
    }
  };

  const handleAmPm = (suffix: 'am' | 'pm') => {
    // Replace existing am/pm or append
    const stripped = value.replace(/(am|pm)$/i, '');
    onChange(stripped + suffix);
  };

  const hasAmPm = /am|pm$/i.test(value);

  return (
    <View style={styles.container}>
      <View style={styles.grid}>
        {KEYS.map((key) => (
          <Pressable
            key={key}
            style={({ pressed }) => [styles.key, pressed && styles.keyPressed]}
            onPress={() => handleKey(key)}
          >
            <Text style={styles.keyText}>{key}</Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.ampmRow}>
        <Pressable
          style={[styles.ampmKey, hasAmPm && value.endsWith('am') && styles.ampmKeyActive]}
          onPress={() => handleAmPm('am')}
        >
          <Text style={[styles.ampmText, hasAmPm && value.endsWith('am') && styles.ampmTextActive]}>am</Text>
        </Pressable>
        <Pressable
          style={[styles.ampmKey, hasAmPm && value.endsWith('pm') && styles.ampmKeyActive]}
          onPress={() => handleAmPm('pm')}
        >
          <Text style={[styles.ampmText, hasAmPm && value.endsWith('pm') && styles.ampmTextActive]}>pm</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 4,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  key: {
    width: '33.33%',
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyPressed: {
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
  },
  keyText: {
    fontSize: 20,
    fontWeight: '500',
    color: '#1a1a1a',
  },
  ampmRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginTop: 4,
  },
  ampmKey: {
    paddingHorizontal: 28,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
  },
  ampmKeyActive: {
    backgroundColor: '#007AFF',
  },
  ampmText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  ampmTextActive: {
    color: '#fff',
  },
});
