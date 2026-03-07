import React from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CulinaryRegion } from '../types';

interface Props {
  regions: CulinaryRegion[];
  onToggle: (regionIndex: number, itemIndex: number) => void;
  onClose: () => void;
}

export default function CulinaryScreen({ regions, onToggle, onClose }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <View style={[styles.safeTop, { height: insets.top }]} />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Culinary Guide</Text>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Text style={styles.closeText}>Close</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {regions.length === 0 ? (
          <Text style={styles.emptyText}>No culinary specialties found in this itinerary.</Text>
        ) : (
          regions.map((region, rIdx) => (
            <View key={region.region} style={styles.section}>
              <Text style={styles.sectionTitle}>{region.region}</Text>
              {region.items.map((item, iIdx) => (
                <TouchableOpacity
                  key={`${region.region}-${item.name}`}
                  style={styles.itemRow}
                  onPress={() => onToggle(rIdx, iIdx)}
                  activeOpacity={0.6}
                >
                  <Text style={[styles.checkbox, item.checked && styles.checkboxChecked]}>
                    {item.checked ? '✓' : '○'}
                  </Text>
                  <View style={styles.itemTextWrap}>
                    <Text style={[styles.itemName, item.checked && styles.itemNameChecked]}>
                      {(item.name || '').replace(/\s*\(.*\)$/, '')}
                    </Text>
                    {/\(.*\)$/.test(item.name || '') && (
                      <Text style={[styles.itemDesc, item.checked && styles.itemNameChecked]}>
                        {(item.name || '').match(/\(.*\)$/)?.[0]}
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  safeTop: {
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  closeButton: {
    paddingLeft: 12,
    paddingVertical: 8,
  },
  closeText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
    flex: 1,
    marginRight: 8,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  emptyText: {
    fontSize: 15,
    color: '#aaa',
    textAlign: 'center',
    marginTop: 40,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 10,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#f5f5f5',
  },
  checkbox: {
    fontSize: 18,
    color: '#007AFF',
    marginRight: 12,
    width: 22,
  },
  checkboxChecked: {
    color: '#007AFF',
  },
  itemTextWrap: {
    flex: 1,
  },
  itemName: {
    fontSize: 15,
    color: '#333',
  },
  itemDesc: {
    fontSize: 13,
    color: '#888',
    marginTop: 2,
  },
  itemNameChecked: {
    textDecorationLine: 'line-through',
    color: '#999',
  },
});
