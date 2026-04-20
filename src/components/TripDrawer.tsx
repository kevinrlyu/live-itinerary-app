import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, Animated,
  ScrollView, StyleSheet, Dimensions, Alert, TextInput,
  PanResponder,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TripMeta } from '../types';
import { loadApiKey, saveApiKey } from '../utils/storage';

const SCREEN_WIDTH = Dimensions.get('window').width;
const DRAWER_WIDTH = SCREEN_WIDTH;

interface Props {
  visible: boolean;
  trips: TripMeta[];
  activeTripId: string;
  onClose: () => void;
  onSelectTrip: (id: string) => void;
  onImportNew: () => void;
  onCreateNew?: () => void;
  onReimportTrip: (id: string) => void;
  onDeleteTrip: (id: string) => void;
  onReorderTrips?: (fromIndex: number, toIndex: number) => void;
  reimportingTripId?: string | null;
  reimportProgress?: string;
  onViewCulinary?: () => void;
  onViewExpenses?: () => void;
  onShowHelp?: () => void;
}

const ROW_HEIGHT = 61; // measured: paddingV 12*2 + content ~37

interface DraggableListProps {
  trips: TripMeta[];
  activeTripId: string;
  reimportingTripId?: string | null;
  reimportProgress?: string;
  onSelectTrip: (id: string) => void;
  onReimportTrip: (id: string) => void;
  onDeletePress: (trip: TripMeta) => void;
  onReorder?: (fromIndex: number, toIndex: number) => void;
}

function DraggableTripList({
  trips, activeTripId, reimportingTripId, reimportProgress,
  onSelectTrip, onReimportTrip, onDeletePress, onReorder,
}: DraggableListProps) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const dragY = useRef(new Animated.Value(0)).current;
  const tripsRef = useRef(trips);
  tripsRef.current = trips;
  const draggingIdxRef = useRef<number>(-1);
  const hoverIdxRef = useRef<number | null>(null);

  const setHover = (v: number | null) => {
    hoverIdxRef.current = v;
    setHoverIndex(v);
  };

  return (
    <ScrollView
      style={styles.list}
      scrollEnabled={draggingId === null}
      contentContainerStyle={{ paddingTop: 8 }}
    >
      <View style={{ borderBottomWidth: 1, borderBottomColor: '#f0f0f0', marginHorizontal: 8 }} />
      <View style={{ height: trips.length * ROW_HEIGHT, position: 'relative' }}>
        {trips.map((item, idx) => {
          const isDragging = item.id === draggingId;
          let targetTop = idx * ROW_HEIGHT;
          if (draggingId && !isDragging && hoverIndex !== null) {
            const fromIdx = draggingIdxRef.current;
            if (fromIdx !== -1) {
              if (fromIdx < hoverIndex && idx > fromIdx && idx <= hoverIndex) {
                targetTop = (idx - 1) * ROW_HEIGHT;
              } else if (fromIdx > hoverIndex && idx < fromIdx && idx >= hoverIndex) {
                targetTop = (idx + 1) * ROW_HEIGHT;
              }
            }
          }
          return (
            <TripRow
              key={item.id}
              item={item}
              index={idx}
              top={targetTop}
              isDragging={isDragging}
              isActive={item.id === activeTripId}
              isReimporting={reimportingTripId === item.id}
              reimportProgress={reimportProgress}
              disableActions={!!reimportingTripId}
              dragY={dragY}
              onSelectTrip={onSelectTrip}
              onReimportTrip={onReimportTrip}
              onDeletePress={onDeletePress}
              onDragStart={(startIdx) => {
                draggingIdxRef.current = startIdx;
                setDraggingId(item.id);
                setHover(startIdx);
              }}
              onDragMove={(dy) => {
                const fromIdx = draggingIdxRef.current;
                if (fromIdx === -1) return;
                const offset = Math.round(dy / ROW_HEIGHT);
                const next = Math.max(0, Math.min(tripsRef.current.length - 1, fromIdx + offset));
                if (hoverIdxRef.current !== next) setHover(next);
              }}
              onDragEnd={() => {
                const fromIdx = draggingIdxRef.current;
                const toIdx = hoverIdxRef.current;
                draggingIdxRef.current = -1;
                setDraggingId(null);
                setHover(null);
                dragY.setValue(0);
                if (fromIdx !== -1 && toIdx !== null && fromIdx !== toIdx && onReorder) {
                  onReorder(fromIdx, toIdx);
                }
              }}
            />
          );
        })}
      </View>
    </ScrollView>
  );
}

interface TripRowProps {
  item: TripMeta;
  index: number;
  top: number;
  isDragging: boolean;
  isActive: boolean;
  isReimporting: boolean;
  reimportProgress?: string;
  disableActions: boolean;
  dragY: Animated.Value;
  onSelectTrip: (id: string) => void;
  onReimportTrip: (id: string) => void;
  onDeletePress: (trip: TripMeta) => void;
  onDragStart: (index: number) => void;
  onDragMove: (dy: number) => void;
  onDragEnd: () => void;
}

function TripRow({
  item, index, top, isDragging, isActive, isReimporting, reimportProgress,
  disableActions, dragY, onSelectTrip, onReimportTrip, onDeletePress,
  onDragStart, onDragMove, onDragEnd,
}: TripRowProps) {
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dragActiveRef = useRef(false);
  const startYRef = useRef(0);
  const grantTimeRef = useRef(0);
  const movedRef = useRef(false);
  const animatedTop = useRef(new Animated.Value(top)).current;

  const indexRef = useRef(index);
  indexRef.current = index;
  const topRef = useRef(top);
  topRef.current = top;
  const onDragStartRef = useRef(onDragStart);
  onDragStartRef.current = onDragStart;
  const onDragMoveRef = useRef(onDragMove);
  onDragMoveRef.current = onDragMove;
  const onDragEndRef = useRef(onDragEnd);
  onDragEndRef.current = onDragEnd;
  const onSelectTripRef = useRef(onSelectTrip);
  onSelectTripRef.current = onSelectTrip;
  const itemIdRef = useRef(item.id);
  itemIdRef.current = item.id;

  useEffect(() => {
    if (!isDragging) {
      Animated.timing(animatedTop, {
        toValue: top,
        duration: 160,
        useNativeDriver: false,
      }).start();
    } else {
      animatedTop.setValue(top);
    }
  }, [top, isDragging, animatedTop]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (e) => {
          startYRef.current = e.nativeEvent.pageY;
          grantTimeRef.current = Date.now();
          movedRef.current = false;
          longPressTimer.current = setTimeout(() => {
            dragActiveRef.current = true;
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            onDragStartRef.current(indexRef.current);
          }, 400);
        },
        onPanResponderMove: (_, g) => {
          if (Math.abs(g.dx) > 6 || Math.abs(g.dy) > 6) movedRef.current = true;
          if (!dragActiveRef.current) {
            if (movedRef.current && longPressTimer.current) {
              clearTimeout(longPressTimer.current);
              longPressTimer.current = null;
            }
            return;
          }
          dragY.setValue(g.dy);
          onDragMoveRef.current(g.dy);
        },
        onPanResponderRelease: () => {
          if (longPressTimer.current) {
            clearTimeout(longPressTimer.current);
            longPressTimer.current = null;
          }
          if (dragActiveRef.current) {
            dragActiveRef.current = false;
            const dy = (dragY as any).__getValue ? (dragY as any).__getValue() : 0;
            animatedTop.setValue(topRef.current + dy);
            dragY.setValue(0);
            onDragEndRef.current();
          } else if (!movedRef.current && Date.now() - grantTimeRef.current < 400) {
            onSelectTripRef.current(itemIdRef.current);
          }
        },
        onPanResponderTerminate: () => {
          if (longPressTimer.current) {
            clearTimeout(longPressTimer.current);
            longPressTimer.current = null;
          }
          if (dragActiveRef.current) {
            dragActiveRef.current = false;
            const dy = (dragY as any).__getValue ? (dragY as any).__getValue() : 0;
            animatedTop.setValue(topRef.current + dy);
            dragY.setValue(0);
            onDragEndRef.current();
          }
        },
      }),
    [dragY]
  );

  const translateY = isDragging ? dragY : 0;

  return (
    <Animated.View
      style={[
        styles.tripRowAbs,
        isActive && styles.tripRowActive,
        isDragging && styles.tripRowDragging,
        {
          top: animatedTop,
          transform: [{ translateY }],
          zIndex: isDragging ? 10 : isActive ? 2 : 1,
          elevation: isDragging ? 12 : isActive ? 8 : 0,
        },
      ]}
      {...panResponder.panHandlers}
    >
      <View style={styles.tripInfo}>
        <Text style={[styles.tripTitle, isActive && styles.tripTitleActive]} numberOfLines={1}>{item.title}</Text>
        <Text style={styles.tripDate}>
          {isReimporting ? (reimportProgress || 'Re-importing...') : item.dateRange}
        </Text>
      </View>
      <View style={styles.tripActions}>
        {!!item.docUrl && (
          <TouchableOpacity
            onPress={() => onReimportTrip(item.id)}
            style={styles.refreshButton}
            disabled={disableActions || isDragging}
          >
            <Text style={[styles.refreshText, disableActions && styles.refreshTextDisabled]}>↻</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          onPress={() => onDeletePress(item)}
          style={styles.deleteButton}
          disabled={isDragging}
        >
          <Text style={styles.deleteText}>✕</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

export default function TripDrawer({
  visible, trips, activeTripId, onClose,
  onSelectTrip, onImportNew, onCreateNew, onReimportTrip, onDeleteTrip, reimportingTripId, reimportProgress,
  onViewCulinary, onViewExpenses, onReorderTrips, onShowHelp,
}: Props) {
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(DRAWER_WIDTH)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const [mounted, setMounted] = useState(false);
  const [apiKeyVisible, setApiKeyVisible] = useState(false);
  const [apiKeyValue, setApiKeyValue] = useState('');
  const [hasApiKey, setHasApiKey] = useState(false);

  useEffect(() => {
    if (visible) {
      loadApiKey().then((key) => {
        setHasApiKey(!!key);
        setApiKeyValue(key || '');
      });
    }
  }, [visible]);

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
      <Animated.View style={[styles.drawer, { paddingTop: insets.top, transform: [{ translateX: slideAnim }] }]}>
        <View style={styles.drawerHeader}>
          <Text style={styles.drawerTitle}>My Itineraries</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <View style={styles.menuIconContainer}>
              <View style={styles.menuBar} />
              <View style={styles.menuBar} />
              <View style={styles.menuBar} />
            </View>
          </TouchableOpacity>
        </View>

        <DraggableTripList
          trips={trips}
          activeTripId={activeTripId}
          reimportingTripId={reimportingTripId}
          reimportProgress={reimportProgress}
          onSelectTrip={onSelectTrip}
          onReimportTrip={onReimportTrip}
          onDeletePress={confirmDelete}
          onReorder={onReorderTrips}
        />

        <View style={styles.apiKeyRow}>
          <Text style={styles.apiKeyLabel}>API Key</Text>
          <View>
            <TouchableOpacity
              style={styles.apiKeyValue}
              onPress={() => setApiKeyVisible(!apiKeyVisible)}
            >
              <Text style={styles.apiKeyValueText}>{hasApiKey ? 'Set' : 'None'}</Text>
              <Text style={styles.apiKeyChevron}>▾</Text>
            </TouchableOpacity>
            {apiKeyVisible && (
              <View style={styles.apiKeyDropdown}>
                <TextInput
                  style={styles.apiKeyInput}
                  value={apiKeyValue}
                  onChangeText={setApiKeyValue}
                  placeholder="sk-ant-..."
                  autoCapitalize="none"
                  autoCorrect={false}
                  secureTextEntry
                />
                <View style={styles.apiKeyButtons}>
                  <TouchableOpacity
                    style={styles.apiKeySave}
                    onPress={() => {
                      if (!apiKeyValue.trim()) {
                        Alert.alert('Enter a valid API key');
                        return;
                      }
                      saveApiKey(apiKeyValue.trim());
                      setHasApiKey(true);
                      setApiKeyVisible(false);
                    }}
                  >
                    <Text style={styles.apiKeySaveText}>Save</Text>
                  </TouchableOpacity>
                  {hasApiKey && (
                    <TouchableOpacity
                      style={styles.apiKeyRemove}
                      onPress={() => {
                        Alert.alert('Remove API Key', 'Are you sure?', [
                          { text: 'Cancel', style: 'cancel' },
                          {
                            text: 'Remove', style: 'destructive', onPress: async () => {
                              await saveApiKey('');
                              setApiKeyValue('');
                              setHasApiKey(false);
                              setApiKeyVisible(false);
                            },
                          },
                        ]);
                      }}
                    >
                      <Text style={styles.apiKeyRemoveText}>Remove</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            )}
          </View>
        </View>

        <TouchableOpacity style={styles.importButton} onPress={onImportNew}>
          <Text style={styles.importButtonText}>+ Import New Itinerary</Text>
        </TouchableOpacity>
        {onCreateNew && (
          <TouchableOpacity style={styles.createButton} onPress={onCreateNew}>
            <Text style={styles.createButtonText}>+ Create New Itinerary</Text>
          </TouchableOpacity>
        )}
        {onShowHelp && (
          <TouchableOpacity style={styles.helpButton} onPress={onShowHelp}>
            <Text style={styles.helpButtonText}>Help</Text>
          </TouchableOpacity>
        )}
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
    paddingTop: 0,
    paddingHorizontal: 16,
  },
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginHorizontal: -16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    marginBottom: 16,
  },
  drawerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
    flex: 1,
    marginRight: 8,
  },
  closeButton: {
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
  actionButton: {
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    alignItems: 'center',
  },
  actionButtonDisabled: { opacity: 0.5 },
  actionButtonText: { fontSize: 14, fontWeight: '600', color: '#333' },
  list: { flex: 1, overflow: 'visible' },
  tripRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    borderRadius: 10,
  },
  tripRowAbs: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: ROW_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    borderRadius: 10,
    backgroundColor: '#fff',
  },
  tripRowDragging: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 12,
    borderRadius: 10,
  },
  tripRowActive: {
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
    shadowColor: '#007AFF',
    shadowOpacity: 0.55,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 2 },
    elevation: 8,
    backgroundColor: '#fff',
  },
  tripInfo: { flex: 1 },
  tripTitle: { fontSize: 15, fontWeight: '600', color: '#1a1a1a' },
  tripTitleActive: { color: '#007AFF' },
  tripDate: { fontSize: 12, color: '#888', marginTop: 2 },
  tripActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  refreshButton: { padding: 4 },
  refreshText: { fontSize: 18, color: '#34C759', fontWeight: '700' },
  refreshTextDisabled: { opacity: 0.4 },
  deleteButton: { padding: 4 },
  deleteText: { fontSize: 14, color: '#FF3B30' },
  apiKeyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 0,
    paddingHorizontal: 4,
    marginBottom: 0,
  },
  apiKeyLabel: {
    fontSize: 14,
    color: '#555',
  },
  apiKeyValue: {
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: 70,
  },
  apiKeyValueText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#007AFF',
  },
  apiKeyChevron: {
    fontSize: 11,
    color: '#888',
    marginLeft: 4,
  },
  apiKeyDropdown: {
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
    padding: 12,
    minWidth: 220,
  },
  apiKeyInput: {
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#ddd',
    marginBottom: 8,
  },
  apiKeyButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  apiKeySave: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  apiKeySaveText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  apiKeyRemove: {
    backgroundColor: '#ff3b30',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  apiKeyRemoveText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  createButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  createButtonText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  helpButton: {
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 8,
    marginBottom: 16,
  },
  helpButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
  },
  importButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  importButtonText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
