import React, { useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, Modal, Animated,
  FlatList, StyleSheet, Dimensions, Alert,
} from 'react-native';
import { TripMeta } from '../types';

const SCREEN_WIDTH = Dimensions.get('window').width;
const DRAWER_WIDTH = SCREEN_WIDTH * 0.75;

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
}

export default function TripDrawer({
  visible, trips, activeTripId, onClose,
  onSelectTrip, onImportNew, onReimportCurrent, onDeleteTrip, reimporting,
}: Props) {
  const slideAnim = useRef(new Animated.Value(DRAWER_WIDTH)).current;

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: visible ? 0 : DRAWER_WIDTH,
      duration: 250,
      useNativeDriver: true,
    }).start();
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

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
      <Animated.View style={[styles.drawer, { transform: [{ translateX: slideAnim }] }]}>
        <Text style={styles.drawerTitle}>My Itineraries</Text>

        <TouchableOpacity
          style={[styles.actionButton, reimporting && styles.actionButtonDisabled]}
          onPress={onReimportCurrent}
          disabled={reimporting}
        >
          <Text style={styles.actionButtonText}>
            {reimporting ? 'Re-importing…' : '↻  Re-import Current'}
          </Text>
        </TouchableOpacity>

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
    </Modal>
  );
}

const styles = StyleSheet.create({
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
