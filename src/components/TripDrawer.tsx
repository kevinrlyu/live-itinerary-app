import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, Animated,
  FlatList, StyleSheet, Dimensions, Alert,
} from 'react-native';
import { TripMeta } from '../types';

const SCREEN_WIDTH = Dimensions.get('window').width;
const DRAWER_WIDTH = SCREEN_WIDTH * 0.75;

const CURRENCIES = ['CAD', 'CHF', 'CNY', 'EUR', 'GBP', 'JPY', 'KRW', 'TWD', 'USD'];

interface Props {
  visible: boolean;
  trips: TripMeta[];
  activeTripId: string;
  onClose: () => void;
  onSelectTrip: (id: string) => void;
  onImportNew: () => void;
  onReimportCurrent: () => void;
  onDeleteTrip: (id: string) => void;
  reimporting: boolean;
  reimportProgress?: string;
  onViewCulinary?: () => void;
  onViewExpenses?: () => void;
  defaultCurrency?: string;
  onSetCurrency?: (currency: string) => void;
}

function CurrencyPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <View style={styles.currencyRow}>
      <Text style={styles.currencyLabel}>Default Currency</Text>
      <View>
        <TouchableOpacity
          style={styles.currencyValue}
          onPress={() => setOpen(!open)}
        >
          <Text style={styles.currencyValueText}>{value}</Text>
          <Text style={styles.currencyChevron}>▾</Text>
        </TouchableOpacity>
        {open && (
          <View style={styles.currencyDropdown}>
            {CURRENCIES.map((cur) => (
              <TouchableOpacity
                key={cur}
                style={[
                  styles.currencyOption,
                  cur === value && styles.currencyOptionSelected,
                ]}
                onPress={() => { onChange(cur); setOpen(false); }}
              >
                <Text style={[
                  styles.currencyOptionText,
                  cur === value && styles.currencyOptionTextSelected,
                ]}>{cur}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    </View>
  );
}

export default function TripDrawer({
  visible, trips, activeTripId, onClose,
  onSelectTrip, onImportNew, onReimportCurrent, onDeleteTrip, reimporting, reimportProgress,
  onViewCulinary, onViewExpenses, defaultCurrency, onSetCurrency,
}: Props) {
  const slideAnim = useRef(new Animated.Value(DRAWER_WIDTH)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(backdropAnim, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: DRAWER_WIDTH,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(backdropAnim, {
          toValue: 0,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start(() => setMounted(false));
    }
  }, [visible]);

  const confirmDelete = (trip: TripMeta) => {
    Alert.alert(
      'Delete Itinerary',
      `Remove "${trip.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => onDeleteTrip(trip.id) },
      ]
    );
  };

  if (!mounted) return null;

  return (
    <View style={styles.overlay} pointerEvents="box-none">
      <Animated.View style={[styles.backdrop, { opacity: backdropAnim }]}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
      </Animated.View>
      <Animated.View style={[styles.drawer, { transform: [{ translateX: slideAnim }] }]}>
        <Text style={styles.drawerTitle}>My Itineraries</Text>

        <TouchableOpacity
          style={[styles.actionButton, reimporting && styles.actionButtonDisabled]}
          onPress={onReimportCurrent}
          disabled={reimporting}
        >
          <Text style={styles.actionButtonText}>
            {reimporting ? (reimportProgress || 'Re-importing…') : '↻  Re-import Current'}
          </Text>
        </TouchableOpacity>

        {onViewCulinary && (
          <TouchableOpacity style={styles.actionButton} onPress={onViewCulinary}>
            <Text style={styles.actionButtonText}>Culinary Guide</Text>
          </TouchableOpacity>
        )}

        {onViewExpenses && (
          <TouchableOpacity style={styles.actionButton} onPress={onViewExpenses}>
            <Text style={styles.actionButtonText}>$  Trip Expenses</Text>
          </TouchableOpacity>
        )}

        {onSetCurrency && defaultCurrency && (
          <CurrencyPicker
            value={defaultCurrency}
            onChange={onSetCurrency}
          />
        )}

        <FlatList
          data={trips}
          keyExtractor={(item) => item.id}
          style={styles.list}
          renderItem={({ item }) => (
            <View style={styles.tripRow}>
              <TouchableOpacity
                style={styles.tripInfo}
                onPress={() => onSelectTrip(item.id)}
              >
                <Text style={styles.tripTitle} numberOfLines={1}>{item.title}</Text>
                <Text style={styles.tripDate}>{item.dateRange}</Text>
              </TouchableOpacity>
              <View style={styles.tripActions}>
                {item.id === activeTripId && <Text style={styles.checkmark}>✓</Text>}
                <TouchableOpacity onPress={() => confirmDelete(item)} style={styles.deleteButton}>
                  <Text style={styles.deleteText}>✕</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />

        <TouchableOpacity style={styles.importButton} onPress={onImportNew}>
          <Text style={styles.importButtonText}>+ Import New Itinerary</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  drawer: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: DRAWER_WIDTH,
    backgroundColor: '#fff',
    paddingTop: 60,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: -2, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 10,
  },
  drawerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1a1a1a',
    marginBottom: 16,
  },
  actionButton: {
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    alignItems: 'center',
  },
  actionButtonDisabled: { opacity: 0.5 },
  actionButtonText: { fontSize: 14, fontWeight: '600', color: '#333' },
  list: { flex: 1 },
  tripRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  tripInfo: { flex: 1 },
  tripTitle: { fontSize: 15, fontWeight: '600', color: '#1a1a1a' },
  tripDate: { fontSize: 12, color: '#888', marginTop: 2 },
  tripActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  checkmark: { fontSize: 16, color: '#007AFF', fontWeight: '700' },
  deleteButton: { padding: 4 },
  deleteText: { fontSize: 14, color: '#FF3B30' },
  currencyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 4,
    marginBottom: 12,
  },
  currencyLabel: {
    fontSize: 14,
    color: '#555',
  },
  currencyValue: {
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  currencyValueText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#007AFF',
  },
  currencyChevron: {
    fontSize: 11,
    color: '#888',
    marginLeft: 4,
  },
  currencyDropdown: {
    position: 'absolute',
    top: 36,
    right: 0,
    backgroundColor: '#fff',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
    zIndex: 10,
    minWidth: 80,
  },
  currencyOption: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#eee',
  },
  currencyOptionSelected: {
    backgroundColor: '#E8F0FE',
  },
  currencyOptionText: {
    fontSize: 14,
    color: '#333',
  },
  currencyOptionTextSelected: {
    color: '#007AFF',
    fontWeight: '600',
  },
  importButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    marginBottom: 32,
    marginTop: 8,
  },
  importButtonText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
