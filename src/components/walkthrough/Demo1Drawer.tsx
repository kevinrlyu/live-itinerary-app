import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';
import FingerCursor, { createCursor, moveTo, tap } from './FingerCursor';
import { FRAME_W as W, FRAME_H as H, s, STATUS_H } from './scale';

// Finger animation targets (computed from bottom-up with scaled values)
const LINK_BLOCK_H = s(12 * 2 + 18);       // paddingV 12 + lineHeight 18
const HELP_MARGIN_BOTTOM = s(16);
const HELP_MARGIN_TOP = s(-4);              // Help has marginTop -4 in real app
const SETTINGS_MARGIN_TOP = s(8);
const BTN_BLOCK_H = s(14 * 2 + 18);        // padding 14 + lineHeight 18
const BTN_MARGIN_TOP = s(8);

const HELP_CENTER_Y = H - HELP_MARGIN_BOTTOM - LINK_BLOCK_H / 2;
const SETTINGS_CENTER_Y = HELP_CENTER_Y - LINK_BLOCK_H / 2 - HELP_MARGIN_TOP - LINK_BLOCK_H / 2;
// Buttons render slightly taller than padding+lineHeight math predicts (shadow + tap-target);
// nudge finger centers up to visually center them.
const BTN_Y_NUDGE = s(5);
const CREATE_CENTER_Y = SETTINGS_CENTER_Y - LINK_BLOCK_H / 2 - SETTINGS_MARGIN_TOP - BTN_BLOCK_H / 2 - BTN_Y_NUDGE;
const IMPORT_CENTER_Y = CREATE_CENTER_Y - BTN_BLOCK_H / 2 - BTN_MARGIN_TOP - BTN_BLOCK_H / 2;

// Trip row geometry (used for drag/reorder animation)
// drawerHeader height is driven by the close button (padding 8*2 + icon 18 = 34),
// not the title (lineHeight 20). Include border + marginBottom.
const HEADER_BLOCK_H = s(8 * 2 + 34) + 1 + s(16);
const LIST_TOP_PAD = s(8) + 1;
const ROW_H = s(12 * 2 + 20 + 2 + 15) + 1; // paddingV + title + gap + date + border

const LIST_TOP_Y = STATUS_H + HEADER_BLOCK_H;
const VAN_ROW_TOP_Y = LIST_TOP_Y + LIST_TOP_PAD + ROW_H; // Japan row above
const VAN_CENTER_Y = VAN_ROW_TOP_Y + ROW_H / 2;

const START = { x: W - 22, y: H - 22 };
const IMPORT_CENTER = { x: W / 2 - s(1), y: IMPORT_CENTER_Y };
const CREATE_CENTER = { x: W / 2 - s(1), y: CREATE_CENTER_Y };
const VAN_CENTER = { x: W / 2, y: VAN_CENTER_Y };

interface Props {
  active: boolean;
}

export default function Demo1Drawer({ active }: Props) {
  const cursor = useRef(createCursor(START.x, START.y)).current;
  const importScale = useRef(new Animated.Value(1)).current;
  const createScale = useRef(new Animated.Value(1)).current;
  const dragProgress = useRef(new Animated.Value(0)).current;
  const vanScale = useRef(new Animated.Value(1)).current;
  const vanShadow = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!active) return;

    const pressFeedback = (v: Animated.Value) =>
      Animated.sequence([
        Animated.timing(v, { toValue: 0.95, duration: 110, useNativeDriver: true }),
        Animated.timing(v, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]);

    const script = Animated.loop(
      Animated.sequence([
        Animated.delay(400),
        moveTo(cursor, IMPORT_CENTER.x, IMPORT_CENTER.y, 800),
        Animated.delay(150),
        Animated.parallel([tap(cursor), pressFeedback(importScale)]),
        Animated.delay(400),
        moveTo(cursor, CREATE_CENTER.x, CREATE_CENTER.y, 600),
        Animated.delay(150),
        Animated.parallel([tap(cursor), pressFeedback(createScale)]),
        Animated.delay(500),

        // Reorder demo: drag Vancouver below Zermatt
        moveTo(cursor, VAN_CENTER.x, VAN_CENTER.y, 800),
        Animated.delay(250),
        // Long-press pop-up
        Animated.parallel([
          Animated.timing(vanScale, { toValue: 1.05, duration: 180, useNativeDriver: false }),
          Animated.timing(vanShadow, { toValue: 1, duration: 180, useNativeDriver: false }),
        ]),
        Animated.delay(200),
        // Drag cursor down by one row, rows swap in parallel
        Animated.parallel([
          Animated.timing(cursor.ty, { toValue: VAN_CENTER.y + ROW_H, duration: 600, useNativeDriver: true }),
          Animated.timing(dragProgress, { toValue: 1, duration: 600, useNativeDriver: false }),
        ]),
        Animated.delay(350),
        // Release pop-down
        Animated.parallel([
          Animated.timing(vanScale, { toValue: 1, duration: 180, useNativeDriver: false }),
          Animated.timing(vanShadow, { toValue: 0, duration: 180, useNativeDriver: false }),
        ]),
        Animated.delay(700),

        // Return home and reset for next loop iteration
        moveTo(cursor, START.x, START.y, 700),
        Animated.delay(400),
        Animated.timing(dragProgress, { toValue: 0, duration: 0, useNativeDriver: false }),
        Animated.delay(100),
      ])
    );
    script.start();
    return () => script.stop();
  }, [active, cursor, importScale, createScale, dragProgress, vanScale, vanShadow]);

  const vanTranslateY = dragProgress.interpolate({ inputRange: [0, 1], outputRange: [0, ROW_H] });
  const zerTranslateY = dragProgress.interpolate({ inputRange: [0, 1], outputRange: [0, -ROW_H] });
  const vanShadowOpacity = vanShadow.interpolate({ inputRange: [0, 1], outputRange: [0, 0.25] });

  return (
    <View style={styles.wrapper}>
      <View style={styles.frame}>
        {/* Status bar / safe area spacer */}
        <View style={{ height: STATUS_H }} />

        <View style={styles.drawerContent}>
          {/* Header */}
          <View style={styles.drawerHeader}>
            <Text style={styles.drawerTitle}>My Itineraries</Text>
            <View style={styles.closeButton}>
              <View style={styles.menuIconContainer}>
                <View style={styles.menuBar} />
                <View style={styles.menuBar} />
                <View style={styles.menuBar} />
              </View>
            </View>
          </View>

          {/* Trip list */}
          <View style={styles.list}>
            <View style={styles.listHeaderDivider} />
            <View style={styles.tripRow}>
              <View style={styles.tripInfo}>
                <Text style={styles.tripTitle} numberOfLines={1}>Japan 2026</Text>
                <Text style={styles.tripDate}>Aug 22 – Sep 7</Text>
              </View>
              <View style={styles.tripActions}>
                <Text style={styles.refreshText}>↻</Text>
                <Text style={styles.deleteText}>✕</Text>
              </View>
            </View>
            <Animated.View
              style={[
                styles.tripRow,
                styles.tripRowDraggable,
                {
                  transform: [{ translateY: vanTranslateY }, { scale: vanScale }],
                  shadowOpacity: vanShadowOpacity,
                },
              ]}
            >
              <View style={styles.tripInfo}>
                <Text style={styles.tripTitle} numberOfLines={1}>Summer in Vancouver</Text>
                <Text style={styles.tripDate}>Jul 25 – Aug 2</Text>
              </View>
              <View style={styles.tripActions}>
                <Text style={styles.refreshText}>↻</Text>
                <Text style={styles.deleteText}>✕</Text>
              </View>
            </Animated.View>
            <Animated.View
              style={[
                styles.tripRow,
                { transform: [{ translateY: zerTranslateY }] },
              ]}
            >
              <View style={styles.tripInfo}>
                <Text style={styles.tripTitle} numberOfLines={1}>Zermatt Ski Trip</Text>
                <Text style={styles.tripDate}>Mar 26 – Mar 31</Text>
              </View>
              <View style={styles.tripActions}>
                <Text style={styles.refreshText}>↻</Text>
                <Text style={styles.deleteText}>✕</Text>
              </View>
            </Animated.View>
          </View>

          {/* Import button */}
          <Animated.View style={[styles.importButton, { transform: [{ scale: importScale }] }]}>
            <Text style={styles.importButtonText}>+ Import New Itinerary</Text>
          </Animated.View>

          {/* Create button */}
          <Animated.View style={[styles.createButton, { transform: [{ scale: createScale }] }]}>
            <Text style={styles.createButtonText}>+ Create New Itinerary</Text>
          </Animated.View>

          {/* Settings link */}
          <View style={styles.settingsButton}>
            <Text style={styles.helpButtonText}>Settings</Text>
          </View>

          {/* Help link */}
          <View style={[styles.settingsButton, { marginTop: s(-4), marginBottom: s(16) }]}>
            <Text style={styles.helpButtonText}>Help</Text>
          </View>
        </View>

        <FingerCursor cursor={cursor} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  frame: {
    width: W,
    height: H,
    backgroundColor: '#fff',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    overflow: 'hidden',
    position: 'relative',
  },
  drawerContent: {
    flex: 1,
    paddingHorizontal: s(16),
  },
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: s(8),
    paddingHorizontal: s(16),
    marginHorizontal: -s(16),
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    marginBottom: s(16),
  },
  drawerTitle: {
    fontSize: s(16),
    lineHeight: s(20),
    fontWeight: '700',
    color: '#1a1a1a',
    flex: 1,
    marginRight: s(8),
  },
  closeButton: {
    padding: s(8),
  },
  menuIconContainer: {
    width: s(22),
    height: s(18),
    justifyContent: 'space-between',
  },
  menuBar: {
    width: s(22),
    height: s(2.5),
    backgroundColor: '#007AFF',
    borderRadius: 1,
  },
  actionButton: {
    backgroundColor: '#f0f0f0',
    borderRadius: s(10),
    padding: s(12),
    marginBottom: s(8),
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: s(14),
    lineHeight: s(18),
    fontWeight: '600',
    color: '#333',
  },
  list: {
    flex: 1,
    overflow: 'hidden',
  },
  listHeaderDivider: {
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    marginHorizontal: s(8),
    marginTop: s(8),
  },
  tripRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: s(12),
    paddingHorizontal: s(8),
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    borderRadius: s(10),
    backgroundColor: '#fff',
  },
  tripRowDraggable: {
    zIndex: 2,
    shadowColor: '#000',
    shadowRadius: s(10),
    shadowOffset: { width: 0, height: s(4) },
  },
  tripInfo: { flex: 1 },
  tripTitle: {
    fontSize: s(16),
    lineHeight: s(20),
    fontWeight: '600',
    color: '#1a1a1a',
  },
  tripDate: {
    fontSize: s(12),
    lineHeight: s(15),
    color: '#888',
    marginTop: s(2),
  },
  tripActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(8),
  },
  refreshText: {
    fontSize: s(14),
    color: '#34C759',
    fontWeight: '600',
  },
  deleteText: {
    fontSize: s(14),
    color: '#FF3B30',
  },
  importButton: {
    backgroundColor: '#007AFF',
    borderRadius: s(12),
    padding: s(14),
    alignItems: 'center',
    marginTop: s(8),
  },
  importButtonText: {
    color: '#fff',
    fontSize: s(14),
    lineHeight: s(18),
    fontWeight: '600',
  },
  createButton: {
    backgroundColor: '#007AFF',
    borderRadius: s(12),
    padding: s(14),
    alignItems: 'center',
    marginTop: s(8),
  },
  createButtonText: {
    color: '#fff',
    fontSize: s(14),
    lineHeight: s(18),
    fontWeight: '600',
  },
  settingsButton: {
    alignItems: 'center',
    paddingVertical: s(12),
    marginTop: s(8),
  },
  helpButtonText: {
    fontSize: s(14),
    lineHeight: s(18),
    fontWeight: '600',
    color: '#007AFF',
  },
});
