import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';
import Svg, { G, Path, Circle } from 'react-native-svg';
import FingerCursor, { createCursor, moveTo, tap, hold } from './FingerCursor';
import { FRAME_W as W, FRAME_H as H, s, STATUS_H } from './scale';

const HEADER_H = s(8 + 34 + 8);
const TAB_H = HEADER_H;
const BOTTOM_TAB_H = s(75); // 49 bar + 34 safe area, adjusted for frame aspect ratio
// Matches real app: paddingV 8 + doneBtn (paddingV 6 + text ~16)
const BANNER_H = s(8 + 28 + 8);
const THEME_H = s(16 + 22 + 8);

const CONTENT_TOP = STATUS_H + HEADER_H + TAB_H + BANNER_H + THEME_H;

// Basic card: time + title + btn row
const CARD_BASIC_H = s(16 + 15 + 2 + 20 + 8 + 30 + 16);
// Full card: + description (18 lineHeight + 4 marginTop) + hours (15 lineHeight + 3 marginTop)
const CARD_FULL_H = CARD_BASIC_H + s(4 + 18 + 3 + 15);
const CARD_GAP = s(12);

const INSERT_H = s(32);
const INSERT_GAP = s(4);

const INSERT0_TOP = CONTENT_TOP + s(4);
const CARD1_TOP = INSERT0_TOP + INSERT_H + INSERT_GAP;
const INSERT1_TOP = CARD1_TOP + CARD_BASIC_H + CARD_GAP;
const CARD2_TOP = INSERT1_TOP + INSERT_H + INSERT_GAP;
const INSERT2_TOP = CARD2_TOP + CARD_FULL_H + CARD_GAP;
const CARD3_TOP = INSERT2_TOP + INSERT_H + INSERT_GAP;

const SHEET_TOP = STATUS_H + s(8);
const SHEET_H = H - SHEET_TOP;

function ReceiptIconMini({ size, color = '#fff' }: { size: number; color?: string }) {
  const h = size * 1.4;
  return (
    <Svg width={size} height={h} viewBox="2.5 0.5 18 22.5" fill="none">
      <Path
        d="M5 1.5 C4.2 1.5 3.5 2.2 3.5 3 L3.5 22 L5.5 20.5 L7.5 22 L9.5 20.5 L11.5 22 L13.5 20.5 L15.5 22 L17.5 20.5 L19.5 22 L19.5 3 C19.5 2.2 18.8 1.5 18 1.5 Z"
        stroke={color} strokeWidth="1.5" strokeLinejoin="round" fill="none"
      />
      <Path d="M7 6.5 L16 6.5" stroke={color} strokeWidth="1.3" strokeLinecap="round" />
      <Path d="M7 10 L16 10" stroke={color} strokeWidth="1.3" strokeLinecap="round" />
      <Path d="M7 13.5 L13 13.5" stroke={color} strokeWidth="1.3" strokeLinecap="round" />
    </Svg>
  );
}

function WalkIconMini({ size, color }: { size: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="55 8 155 175">
      <G transform="matrix(25.882 0 0 -25.882 132.75 45.76)">
        <Path d="m0,0c.283-.023.529.188.553.471s-.19.529-.473.552-.529-.189-.551-.472 .188-.53.471-.551" fill={color} stroke={color} strokeWidth={0.08} />
      </G>
      <G transform="matrix(25.882 0 0 -25.882 121.47 51.218)">
        <Path d="m0,0c.102.07.225.117.361.105 .176-.013.321-.123.409-.255l.517-1.028 .707-.486c.061-.047.098-.121.09-.203-.01-.127-.121-.223-.248-.211-.039.002-.07.017-.106.033l-.771.531c-.023.02-.043.043-.059.069l-.193.384-.232-1.023 .91-1.076c.021-.033.035-.072.043-.111l.246-1.299c-.002-.03.002-.047 0-.071-.014-.193-.182-.334-.373-.32-.158.014-.276.131-.313.275l-.232,1.217-.74.811-.172-.789c-.006-.037-.055-.116-.069-.147l-.711-1.197c-.07-.109-.189-.18-.324-.168-.193.014-.336.182-.32.373 .004.055.027.111.047.15l.66,1.108 .551,2.439-.36-.291-.191-.869c-.025-.111-.127-.203-.246-.193-.129.01-.223.121-.213.25 0 .01.002.019.004.031l.226,1.014c.014.043.038.082.071.111l1.031.836z" fill={color} stroke={color} strokeWidth={0.12} strokeLinejoin="round" strokeLinecap="round" />
      </G>
    </Svg>
  );
}

function RestaurantIconMini({ size, color }: { size: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 512 512" fill="none">
      <Path d="M57.49,47.74,425.92,416.17a37.28,37.28,0,0,1,0,52.72h0a37.29,37.29,0,0,1-52.72,0l-90-91.55A32,32,0,0,1,274,354.91v-5.53a32,32,0,0,0-9.52-22.78l-11.62-10.73a32,32,0,0,0-29.8-7.44h0A48.53,48.53,0,0,1,176.5,295.8L91.07,210.36C40.39,159.68,21.74,83.15,57.49,47.74Z" stroke={color} strokeLinejoin="round" strokeWidth="32" fill="none" />
      <Path d="M400,32l-77.25,77.25A64,64,0,0,0,304,154.51v14.86a16,16,0,0,1-4.69,11.32L288,192" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth="32" fill="none" />
      <Path d="M320,224l11.31-11.31A16,16,0,0,1,342.63,208h14.86a64,64,0,0,0,45.26-18.75L480,112" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth="32" fill="none" />
      <Path d="M440,72L360,152" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth="32" fill="none" />
      <Path d="M200,368,100.28,468.28a40,40,0,0,1-56.56,0h0a40,40,0,0,1,0-56.56L128,328" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth="32" fill="none" />
    </Svg>
  );
}

function MapPinIcon({ size, color = '#fff', holeColor = '#007AFF' }: { size: number; color?: string; holeColor?: string }) {
  return (
    <Svg width={size} height={size * 1.4} viewBox="0 0 24 34">
      <Path
        d="M12 0C5.4 0 0 5.4 0 12c0 9 12 22 12 22s12-13 12-22C24 5.4 18.6 0 12 0z"
        fill={color}
      />
      <Circle cx="12" cy="12" r="5" fill={holeColor} />
    </Svg>
  );
}

interface CardProps {
  time?: string;
  timeEnd?: string;
  title: string;
  description?: string;
  hours?: string;
  top: number;
  height: number;
  isEditMode?: boolean;
}

function Card({ time, timeEnd, title, description, hours, top, height, isEditMode }: CardProps) {
  const timeLabel = time ? (timeEnd ? `${time} – ${timeEnd}` : time) : null;
  return (
    <View style={[cardStyles.card, isEditMode && cardStyles.cardEdit, { top, height }]}>
      {timeLabel ? <Text style={cardStyles.time}>{timeLabel}</Text> : null}
      <View style={cardStyles.row}>
        <Text style={cardStyles.checkbox}>○</Text>
        <View style={cardStyles.content}>
          <Text style={cardStyles.title}>{title}</Text>
          {description ? <Text style={cardStyles.description}>{description}</Text> : null}
          {hours ? <Text style={cardStyles.hours}>Hours: {hours}</Text> : null}
        </View>
      </View>
      <View style={cardStyles.btnRow}>
        <View style={[cardStyles.iconBtn, isEditMode && cardStyles.iconBtnDisabled]}>
          <ReceiptIconMini size={s(14)} color="#fff" />
        </View>
        <View style={[cardStyles.iconBtn, isEditMode && cardStyles.iconBtnDisabled]}>
          <MapPinIcon size={s(14)} color="#fff" holeColor="#007AFF" />
        </View>
      </View>
    </View>
  );
}

interface SheetProps {
  isNew: boolean;
}

function EditSheet({ isNew }: SheetProps) {
  const values = isNew
    ? { start: '', end: '', title: '', description: '', hours: '', notes: '', location: '' }
    : {
        start: '1:00pm',
        end: '3:00pm',
        title: 'Kiyomizu-dera Temple',
        description: 'Historic Buddhist temple',
        hours: '6:00am-6:00pm',
        notes: '',
        location: 'Kiyomizu-dera Temple',
      };

  // Parent Activity options — all activities on this day except self (and transports)
  const parentOptions = isNew
    ? ['Fushimi Inari Shrine', 'Kiyomizu-dera Temple', 'Gion District walk']
    : ['Fushimi Inari Shrine', 'Gion District walk'];

  return (
    <View style={styles.sheet}>
      <View style={styles.sheetHeader}>
        <Text style={styles.sheetHeading}>{isNew ? 'New Activity' : 'Edit Activity'}</Text>
        {!isNew && <Text style={styles.sheetDelete}>Delete</Text>}
      </View>

      {/* Pills at top */}
      <View style={styles.pillRow}>
        <Text style={styles.pillLabel}>Type</Text>
        <View style={[styles.pill, styles.pillActive]}>
          <Text style={styles.pillTextActive}>Place</Text>
        </View>
        <View style={styles.pill}>
          <Text style={styles.pillText}>Transit</Text>
        </View>
      </View>

      <View style={styles.pillRow}>
        <Text style={styles.pillLabel}>Category</Text>
        <View style={[styles.pill, styles.pillActive]}>
          <Text style={styles.pillTextActive}>Default</Text>
        </View>
        <View style={styles.pill}>
          <Text style={styles.pillText}>Stay</Text>
        </View>
        <View style={styles.pill}>
          <Text style={styles.pillText}>Food</Text>
        </View>
      </View>

      <View style={styles.parentRow}>
        <Text style={styles.pillLabel}>Parent Activity</Text>
        <View style={[styles.parentChip, styles.parentChipActive]}>
          <Text style={styles.parentChipTextActive}>None</Text>
        </View>
        {parentOptions.map((opt) => (
          <View key={opt} style={styles.parentChip}>
            <Text style={styles.parentChipText} numberOfLines={1}>{opt}</Text>
          </View>
        ))}
      </View>

      {/* Time fields — no labels, just placeholder text */}
      <View style={styles.timeRow}>
        <View style={styles.timeCol}>
          <View style={styles.timeInput}>
            <Text style={[styles.timeText, !values.start && styles.placeholder]}>
              {values.start || 'Start Time'}
            </Text>
          </View>
        </View>
        <View style={styles.timeCol}>
          <View style={styles.timeInput}>
            <Text style={[styles.timeText, !values.end && styles.placeholder]}>
              {values.end || 'End Time'}
            </Text>
          </View>
        </View>
      </View>

      {/* Text fields — no labels, just placeholder text */}
      <View style={styles.input}>
        <Text style={[styles.inputText, !values.title && styles.placeholder]}>
          {values.title || 'Title'}
        </Text>
      </View>

      <View style={styles.input}>
        <Text style={[styles.inputText, !values.description && styles.placeholder]}>
          {values.description || 'Description'}
        </Text>
      </View>

      <View style={styles.input}>
        <Text style={[styles.inputText, !values.hours && styles.placeholder]}>
          {values.hours || 'Opening Hours'}
        </Text>
      </View>

      <View style={styles.input}>
        <Text style={[styles.inputText, !values.notes && styles.placeholder]}>
          {values.notes || 'Additional Notes'}
        </Text>
      </View>

      <View style={styles.input}>
        <Text style={[styles.inputText, !values.location && styles.placeholder]}>
          {values.location || 'Location / Address'}
        </Text>
      </View>

      <View style={{ flex: 1 }} />

      <View style={styles.actions}>
        <Text style={styles.cancelText}>Cancel</Text>
        <View style={styles.saveBtn}>
          <Text style={styles.saveText}>Save</Text>
        </View>
      </View>
    </View>
  );
}

export default function Demo3Activities({ active }: { active: boolean }) {
  const cursor = useRef(createCursor(W - 22, H - 22)).current;
  const newSheetY = useRef(new Animated.Value(SHEET_H)).current;
  const editSheetY = useRef(new Animated.Value(SHEET_H)).current;

  useEffect(() => {
    if (!active) return;

    const reset = () => {
      newSheetY.setValue(SHEET_H);
      editSheetY.setValue(SHEET_H);
    };

    // Center targets — finger appears slightly off-center visually; nudge left
    const X_NUDGE = s(2);
    const insert1Center = { x: W / 2 - X_NUDGE, y: INSERT1_TOP + INSERT_H / 2 };
    const card2Center = { x: W / 2 - X_NUDGE, y: CARD2_TOP + CARD_FULL_H / 2 };

    // Actions row button geometry (sheet paddingH s(20), paddingB s(16))
    // Save button: paddingH s(24) + "Save" ~s(30) wide ≈ s(78) total, paddingV s(10) + text ~s(18) ≈ s(38) tall
    const saveBtnW = s(78);
    const saveBtnH = s(38);
    const saveBtnCenter = { x: W - s(20) - saveBtnW / 2 - s(3) - 2, y: H - s(16) - saveBtnH / 2 - s(3) - 1 };
    // Cancel text: paddingH s(16) + "Cancel" ~s(45) wide ≈ s(77), same height
    const cancelW = s(77);
    const cancelCenter = { x: W - s(20) - saveBtnW - s(12) - cancelW / 2 - s(3) - 6.5, y: H - s(16) - saveBtnH / 2 - s(3) - 1 };
    const start = { x: W - 22, y: H - 22 };

    const script = Animated.loop(
      Animated.sequence([
        Animated.timing(newSheetY, { toValue: SHEET_H, duration: 0, useNativeDriver: true }),
        Animated.timing(editSheetY, { toValue: SHEET_H, duration: 0, useNativeDriver: true }),

        // --- Phase 1: tap "+" between cards → new-activity sheet ---
        Animated.delay(300),
        moveTo(cursor, insert1Center.x, insert1Center.y, 700),
        Animated.delay(150),
        tap(cursor),
        Animated.timing(newSheetY, { toValue: 0, duration: 350, useNativeDriver: true }),
        Animated.delay(800),
        // Tap Cancel button
        moveTo(cursor, cancelCenter.x, cancelCenter.y, 700),
        Animated.delay(150),
        tap(cursor),
        Animated.timing(newSheetY, { toValue: SHEET_H, duration: 300, useNativeDriver: true }),
        Animated.delay(400),

        // --- Phase 2: long-press Kiyomizu card → edit-activity sheet ---
        moveTo(cursor, card2Center.x, card2Center.y, 700),
        Animated.delay(150),
        hold(cursor, 600),
        Animated.timing(editSheetY, { toValue: 0, duration: 350, useNativeDriver: true }),
        Animated.delay(800),
        // Tap Save button
        moveTo(cursor, saveBtnCenter.x, saveBtnCenter.y, 700),
        Animated.delay(150),
        tap(cursor),
        Animated.timing(editSheetY, { toValue: SHEET_H, duration: 300, useNativeDriver: true }),
        moveTo(cursor, start.x, start.y, 500),
        Animated.delay(600),
      ])
    );

    reset();
    script.start();
    return () => {
      script.stop();
      reset();
    };
  }, [active]);

  return (
    <View style={styles.wrapper}>
      <View style={styles.frame}>
        <View style={{ height: STATUS_H }} />

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Japan 2026</Text>
          <View style={styles.menuIcon}>
            <View style={styles.menuBar} />
            <View style={styles.menuBar} />
            <View style={styles.menuBar} />
          </View>
        </View>

        {/* Day tab bar */}
        <View style={styles.tabBar}>
          {['Sat', 'Sun', 'Mon', 'Tue', 'Wed'].map((dow, i) => (
            <View key={i} style={[styles.tab, i === 2 && styles.tabActive]}>
              <Text style={[styles.tabDow, i === 2 && styles.tabDowActive]}>{dow}</Text>
              <Text style={[styles.tabDate, i === 2 && styles.tabDateActive]}>Aug {22 + i}</Text>
            </View>
          ))}
        </View>

        {/* Edit mode banner */}
        <View style={styles.editBanner}>
          <Text style={styles.removeDayText}>Remove Day</Text>
          <View style={styles.doneBtnBanner}>
            <Text style={styles.doneBtnText}>Done</Text>
          </View>
        </View>

        <Text style={styles.dayTitle}>Kyoto Temples</Text>

        {/* Insert + cards */}
        <View style={[styles.insertBtn, { top: INSERT0_TOP }]}>
          <Text style={styles.insertText}>+</Text>
        </View>
        <Card
          top={CARD1_TOP}
          height={CARD_BASIC_H}
          time="9:00am"
          title="Fushimi Inari Shrine"
          isEditMode
        />
        <View style={[styles.insertBtn, { top: INSERT1_TOP }]}>
          <Text style={styles.insertText}>+</Text>
        </View>
        <Card
          top={CARD2_TOP}
          height={CARD_FULL_H}
          time="1:00pm"
          timeEnd="3:00pm"
          title="Kiyomizu-dera Temple"
          description="Historic Buddhist temple"
          hours="6:00am-6:00pm"
          isEditMode
        />
        <View style={[styles.insertBtn, { top: INSERT2_TOP }]}>
          <Text style={styles.insertText}>+</Text>
        </View>
        <Card
          top={CARD3_TOP}
          height={CARD_BASIC_H}
          time="5:00pm"
          title="Gion District walk"
          isEditMode
        />

        {/* Bottom tab bar */}
        <View style={styles.bottomTabBar}>
          <View style={styles.bottomTab}>
            <WalkIconMini size={s(25)} color="#007AFF" />
          </View>
          <View style={styles.bottomTab}>
            <RestaurantIconMini size={s(25)} color="#1a1a1a" />
          </View>
          <View style={styles.bottomTab}>
            <ReceiptIconMini size={s(18)} color="#1a1a1a" />
          </View>
        </View>

        {/* New-activity sheet */}
        <Animated.View
          style={[styles.sheetWrap, { transform: [{ translateY: newSheetY }] }]}
          pointerEvents="none"
        >
          <EditSheet isNew={true} />
        </Animated.View>

        {/* Edit-activity sheet */}
        <Animated.View
          style={[styles.sheetWrap, { transform: [{ translateY: editSheetY }] }]}
          pointerEvents="none"
        >
          <EditSheet isNew={false} />
        </Animated.View>

        <FingerCursor cursor={cursor} />
      </View>
    </View>
  );
}

const cardStyles = StyleSheet.create({
  card: {
    position: 'absolute',
    left: s(16), right: s(16),
    backgroundColor: '#fff',
    borderRadius: s(12),
    padding: s(16),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: s(4),
  },
  cardEdit: {
    borderWidth: 1,
    borderColor: '#007AFF44',
    borderStyle: 'dashed',
  },
  time: {
    fontSize: s(12),
    lineHeight: s(15),
    color: '#888',
    marginLeft: s(32),
    marginBottom: s(2),
  },
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  checkbox: {
    fontSize: s(20),
    lineHeight: s(22),
    color: '#007AFF',
    marginRight: s(12),
    marginTop: -s(2),
  },
  content: { flex: 1 },
  title: {
    fontSize: s(16),
    lineHeight: s(20),
    fontWeight: '600',
    color: '#1a1a1a',
  },
  description: {
    fontSize: s(13),
    lineHeight: s(18),
    color: '#666',
    fontStyle: 'italic',
    marginTop: s(4),
  },
  hours: {
    fontSize: s(12),
    lineHeight: s(15),
    color: '#888',
    marginTop: s(3),
  },
  btnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: s(8),
    marginTop: s(8),
  },
  iconBtn: {
    backgroundColor: '#007AFF',
    paddingHorizontal: s(10),
    height: s(30),
    borderRadius: s(8),
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconBtnDisabled: {
    opacity: 0.4,
  },
});

const styles = StyleSheet.create({
  wrapper: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  frame: {
    width: W, height: H, backgroundColor: '#f5f5f5',
    borderRadius: 22, borderWidth: 1, borderColor: '#e0e0e0',
    shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 16, shadowOffset: { width: 0, height: 4 },
    overflow: 'hidden', position: 'relative',
  },
  header: {
    height: HEADER_H, backgroundColor: '#fff',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: s(16),
    borderBottomWidth: 1, borderBottomColor: '#eee',
  },
  headerTitle: { fontSize: s(16), lineHeight: s(20), fontWeight: '700', color: '#1a1a1a' },
  menuIcon: { width: s(22), height: s(18), justifyContent: 'space-between' },
  menuBar: { width: s(22), height: s(2.5), backgroundColor: '#007AFF', borderRadius: 1 },
  tabBar: {
    height: TAB_H, backgroundColor: '#fff',
    flexDirection: 'row',
    borderBottomWidth: 1, borderBottomColor: '#eee',
  },
  tab: { width: W / 5, alignItems: 'center', justifyContent: 'center', paddingVertical: s(8) },
  tabActive: { borderBottomWidth: 2, borderBottomColor: '#007AFF' },
  tabDow: { fontSize: s(13), lineHeight: s(17), fontWeight: '700', color: '#1a1a1a' },
  tabDate: { fontSize: s(11), lineHeight: s(14), color: '#888', marginTop: 1 },
  tabDowActive: { color: '#007AFF' },
  tabDateActive: { color: '#007AFF' },
  editBanner: {
    backgroundColor: '#D6EAFF',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: s(16),
    paddingVertical: s(8),
  },
  removeDayText: {
    fontSize: s(13),
    lineHeight: s(17),
    fontWeight: '600',
    color: '#FF3B30',
  },
  doneBtnBanner: {
    backgroundColor: '#007AFF', borderRadius: s(8),
    paddingHorizontal: s(16), paddingVertical: s(6),
  },
  doneBtnText: { fontSize: s(13), lineHeight: s(17), fontWeight: '700', color: '#fff' },
  dayTitle: {
    paddingHorizontal: s(16),
    paddingTop: s(16),
    paddingBottom: s(8),
    fontSize: s(18),
    lineHeight: s(22),
    fontWeight: '700',
    color: '#333',
  },
  insertBtn: {
    position: 'absolute',
    left: 0, right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    height: INSERT_H,
  },
  insertText: {
    fontSize: s(18),
    fontWeight: '600',
    color: '#007AFF',
    backgroundColor: '#D6EAFF',
    paddingHorizontal: s(20),
    height: s(32),
    lineHeight: s(32),
    borderRadius: s(16),
    overflow: 'hidden',
    textAlign: 'center',
  },
  sheetWrap: {
    position: 'absolute',
    left: 0, right: 0,
    top: SHEET_TOP,
    bottom: 0,
  },
  sheet: {
    flex: 1,
    backgroundColor: '#fff',
    borderTopLeftRadius: s(20),
    borderTopRightRadius: s(20),
    paddingTop: s(20),
    paddingHorizontal: s(20),
    paddingBottom: s(16),
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: s(10),
    shadowOffset: { width: 0, height: -3 },
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: s(12),
  },
  sheetHeading: {
    fontSize: s(18), lineHeight: s(22),
    fontWeight: '700', color: '#1a1a1a',
  },
  sheetDelete: {
    fontSize: s(14),
    fontWeight: '600',
    color: '#FF3B30',
  },
  pillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(8),
    marginBottom: s(12),
  },
  parentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(8),
    marginBottom: s(12),
    overflow: 'hidden',
  },
  pillLabel: {
    fontSize: s(12),
    fontWeight: '600',
    color: '#888',
    marginRight: s(4),
  },
  pill: {
    minWidth: s(68),
    alignItems: 'center',
    paddingHorizontal: s(12),
    paddingVertical: s(8),
    borderRadius: s(20),
    backgroundColor: '#f0f0f0',
  },
  pillActive: {
    backgroundColor: '#007AFF',
  },
  pillText: { fontSize: s(13), fontWeight: '600', color: '#666' },
  pillTextActive: { fontSize: s(13), fontWeight: '600', color: '#fff' },
  parentChip: {
    minWidth: s(68),
    alignItems: 'center',
    paddingHorizontal: s(12),
    paddingVertical: s(8),
    borderRadius: s(20),
    backgroundColor: '#f0f0f0',
    maxWidth: s(120),
  },
  parentChipActive: {
    backgroundColor: '#007AFF',
  },
  parentChipText: { fontSize: s(13), fontWeight: '600', color: '#666' },
  parentChipTextActive: { fontSize: s(13), fontWeight: '600', color: '#fff' },
  timeRow: {
    flexDirection: 'row',
    gap: s(12),
  },
  timeCol: { flex: 1 },
  timeInput: {
    backgroundColor: '#f5f5f5',
    borderRadius: s(8),
    height: s(44),
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeText: { fontSize: s(15), color: '#1a1a1a' },
  placeholder: { color: '#bbb', fontWeight: '400' },
  input: {
    backgroundColor: '#f5f5f5',
    borderRadius: s(8),
    height: s(44),
    paddingHorizontal: s(12),
    justifyContent: 'center',
    marginTop: s(8),
  },
  inputText: { fontSize: s(15), color: '#1a1a1a' },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: s(12),
    marginTop: s(12),
  },
  cancelText: {
    fontSize: s(15),
    fontWeight: '600',
    color: '#888',
    paddingHorizontal: s(16),
    paddingVertical: s(10),
  },
  saveBtn: {
    backgroundColor: '#007AFF',
    borderRadius: s(10),
    paddingHorizontal: s(24),
    paddingVertical: s(10),
  },
  saveText: {
    fontSize: s(15),
    fontWeight: '600',
    color: '#fff',
  },
  bottomTabBar: {
    position: 'absolute',
    left: 0, right: 0,
    bottom: 0,
    height: BOTTOM_TAB_H,
    backgroundColor: '#fff',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#ddd',
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-around',
    paddingTop: s(10),
  },
  bottomTab: {
    flex: 1,
    alignItems: 'center',
  },
});
