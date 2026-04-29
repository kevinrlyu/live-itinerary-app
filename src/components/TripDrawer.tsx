import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, Animated,
  ScrollView, StyleSheet, Dimensions, Alert,
  PanResponder,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TripMeta } from '../types';
import { useSettings } from '../contexts/SettingsContext';

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
  onShareTrip: (id: string) => void;
  onReorderTrips?: (fromIndex: number, toIndex: number) => void;
  reimportingTripId?: string | null;
  reimportProgress?: string;
  onViewCulinary?: () => void;
  onViewExpenses?: () => void;
  onShowHelp?: () => void;
  onShowSettings?: () => void;
}

const ROW_HEIGHT = 61; // measured: paddingV 12*2 + content ~37

interface DraggableListProps {
  trips: TripMeta[];
  activeTripId: string;
  reimportingTripId?: string | null;
  reimportProgress?: string;
  onSelectTrip: (id: string) => void;
  onReimportPress: (trip: TripMeta) => void;
  onDeletePress: (trip: TripMeta) => void;
  onSharePress: (trip: TripMeta) => void;
  onReorder?: (fromIndex: number, toIndex: number) => void;
}

function DraggableTripList({
  trips, activeTripId, reimportingTripId, reimportProgress,
  onSelectTrip, onReimportPress, onDeletePress, onSharePress, onReorder,
}: DraggableListProps) {
  const { colors } = useSettings();
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
      <View style={{ borderBottomWidth: 1, borderBottomColor: colors.borderLight, marginHorizontal: 8 }} />
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
              onReimportPress={onReimportPress}
              onDeletePress={onDeletePress}
              onSharePress={onSharePress}
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
  onReimportPress: (trip: TripMeta) => void;
  onDeletePress: (trip: TripMeta) => void;
  onSharePress: (trip: TripMeta) => void;
  onDragStart: (index: number) => void;
  onDragMove: (dy: number) => void;
  onDragEnd: () => void;
}

function TripRow({
  item, index, top, isDragging, isActive, isReimporting, reimportProgress,
  disableActions, dragY, onSelectTrip, onReimportPress, onDeletePress, onSharePress,
  onDragStart, onDragMove, onDragEnd,
}: TripRowProps) {
  const { colors } = useSettings();
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
        { backgroundColor: colors.cardBackground, borderBottomColor: colors.borderLight },
        isActive && [styles.tripRowActive, { borderLeftColor: colors.accent, shadowColor: colors.accent, backgroundColor: colors.cardBackground }],
        isDragging && [styles.tripRowDragging, { backgroundColor: colors.cardBackground }],
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
        <Text style={[styles.tripTitle, { color: colors.textPrimary }, isActive && { color: colors.accent }]} numberOfLines={1}>{item.title}</Text>
        <Text style={[styles.tripDate, { color: colors.textSecondary }]}>
          {isReimporting ? (reimportProgress || 'Re-importing...') : item.dateRange}
        </Text>
      </View>
      <View style={styles.tripActions}>
        <TouchableOpacity
          onPress={() => onSharePress(item)}
          style={styles.refreshButton}
          disabled={disableActions || isDragging}
        >
          <Text style={[styles.refreshText, { color: colors.accent }, disableActions && styles.refreshTextDisabled]}>↗</Text>
        </TouchableOpacity>
        {!!item.docUrl && (
          <TouchableOpacity
            onPress={() => onReimportPress(item)}
            style={styles.refreshButton}
            disabled={disableActions || isDragging}
          >
            <Text style={[styles.refreshText, { color: colors.success }, disableActions && styles.refreshTextDisabled]}>↻</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          onPress={() => onDeletePress(item)}
          style={styles.deleteButton}
          disabled={isDragging}
        >
          <Text style={[styles.deleteText, { color: colors.destructive }]}>✕</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

export default function TripDrawer({
  visible, trips, activeTripId, onClose,
  onSelectTrip, onImportNew, onCreateNew, onReimportTrip, onDeleteTrip, onShareTrip, reimportingTripId, reimportProgress,
  onViewCulinary, onViewExpenses, onReorderTrips, onShowHelp, onShowSettings,
}: Props) {
  const { colors } = useSettings();
  const insets = useSafeAreaInsets();
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

  const confirmReimport = (trip: TripMeta) => {
    Alert.alert(
      'Refresh Itinerary',
      `Refresh "${trip.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Refresh', isPreferred: true, onPress: () => onReimportTrip(trip.id) },
      ]
    );
  };

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
      <Animated.View style={[styles.drawer, { paddingTop: insets.top, transform: [{ translateX: slideAnim }], backgroundColor: colors.cardBackground }]}>
        <View style={[styles.drawerHeader, { borderBottomColor: colors.borderMedium }]}>
          <Text style={[styles.drawerTitle, { color: colors.textPrimary }]}>My Itineraries</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <View style={styles.menuIconContainer}>
              <View style={[styles.menuBar, { backgroundColor: colors.accent }]} />
              <View style={[styles.menuBar, { backgroundColor: colors.accent }]} />
              <View style={[styles.menuBar, { backgroundColor: colors.accent }]} />
            </View>
          </TouchableOpacity>
        </View>

        <DraggableTripList
          trips={trips}
          activeTripId={activeTripId}
          reimportingTripId={reimportingTripId}
          reimportProgress={reimportProgress}
          onSelectTrip={onSelectTrip}
          onReimportPress={confirmReimport}
          onDeletePress={confirmDelete}
          onSharePress={(trip) => onShareTrip(trip.id)}
          onReorder={onReorderTrips}
        />

        <TouchableOpacity style={[styles.importButton, { backgroundColor: colors.accent }]} onPress={onImportNew}>
          <Text style={styles.importButtonText}>+ Import New Itinerary</Text>
        </TouchableOpacity>
        {onCreateNew && (
          <TouchableOpacity style={[styles.createButton, { backgroundColor: colors.accent }]} onPress={onCreateNew}>
            <Text style={styles.createButtonText}>+ Create New Itinerary</Text>
          </TouchableOpacity>
        )}
        {onShowSettings && (
          <TouchableOpacity style={styles.helpButton} onPress={onShowSettings}>
            <Text style={[styles.helpButtonText, { color: colors.accent }]}>Settings</Text>
          </TouchableOpacity>
        )}
        {onShowHelp && (
          <TouchableOpacity style={[styles.helpButton, { marginTop: -4, marginBottom: 16 }]} onPress={onShowHelp}>
            <Text style={[styles.helpButtonText, { color: colors.accent }]}>Help</Text>
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
  tripTitle: { fontSize: 16, fontWeight: '600', color: '#1a1a1a' },
  tripTitleActive: { color: '#007AFF' },
  tripDate: { fontSize: 12, color: '#888', marginTop: 2 },
  tripActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  refreshButton: { padding: 4 },
  refreshText: { fontSize: 14, color: '#34C759', fontWeight: '600' },
  refreshTextDisabled: { opacity: 0.4 },
  deleteButton: { padding: 4 },
  deleteText: { fontSize: 14, color: '#FF3B30' },
  createButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  createButtonText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  helpButton: {
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 8,
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
  importButtonText: { color: '#fff', fontSize: 14, fontWeight: '600' },
});
