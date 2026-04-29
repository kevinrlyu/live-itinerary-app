import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSettings } from '../contexts/SettingsContext';

interface Props {
  title: string;
  onOpenDrawer: () => void;
}

export default function TripHeader({ title, onOpenDrawer }: Props) {
  const { colors } = useSettings();
  return (
    <View style={[styles.container, { backgroundColor: colors.background, borderBottomColor: colors.borderMedium }]}>
      <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={1}>{title}</Text>
      <TouchableOpacity onPress={onOpenDrawer} style={styles.menuButton} testID="menu-button">
        <View style={styles.menuIconContainer}>
          <View style={[styles.menuBar, { backgroundColor: colors.accent }]} />
          <View style={[styles.menuBar, { backgroundColor: colors.accent }]} />
          <View style={[styles.menuBar, { backgroundColor: colors.accent }]} />
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
    marginRight: 8,
  },
  menuButton: {
    padding: 8,
  },
  menuIconContainer: {
    width: 22,
    height: 18,
    justifyContent: 'space-between',
  },
  menuBar: {
    width: 22,
    height: 2.5,
    borderRadius: 1,
  },
});
