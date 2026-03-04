import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface Props {
  title: string;
  onOpenDrawer: () => void;
}

export default function TripHeader({ title, onOpenDrawer }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.title} numberOfLines={1}>{title}</Text>
      <TouchableOpacity onPress={onOpenDrawer} style={styles.menuButton} testID="menu-button">
        <View style={styles.menuIconContainer}>
          <View style={styles.menuBar} />
          <View style={styles.menuBar} />
          <View style={styles.menuBar} />
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
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
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
    backgroundColor: '#007AFF',
    borderRadius: 1,
  },
});
