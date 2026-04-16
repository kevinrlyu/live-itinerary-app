import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import FingerCursor, { createCursor, moveTo, tap, hold } from './FingerCursor';
import { FRAME_W as W, FRAME_H as H, s, STATUS_H } from './scale';

const HEADER_H = s(10 + 20 + 10);
const TAB_H = s(10 + 17 + 1 + 14 + 10);
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

function BillIcon({ size, color = '#fff' }: { size: number; color?: string }) {
  const w = size;
  const h = size * 1.2;
  const stripeH = Math.max(1, size * 0.107);
  const stripeGap = size * 0.179;
  const borderW = Math.max(1, size * 0.107);
  return (
    <View style={{ width: w, height: h, justifyContent: 'center', alignItems: 'center' }}>
      <View style={{
        width: w, height: h, borderRadius: 2, borderWidth: borderW, borderColor: color,
        paddingTop: h * 0.2, paddingHorizontal: w * 0.15, justifyContent: 'flex-start',
      }}>
        <View style={{ width: '100%', height: stripeH, backgroundColor: color, marginBottom: stripeGap }} />
        <View style={{ width: '70%', height: stripeH, backgroundColor: color, marginBottom: stripeGap }} />
        <View style={{ width: '85%', height: stripeH, backgroundColor: color }} />
      </View>
    </View>
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
          <BillIcon size={s(14)} color="#fff" />
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
    ? { start: 'tap to set', end: 'tap to set', title: '', description: '', hours: '', notes: '', location: '' }
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

      <View style={styles.timeRow}>
        <View style={styles.timeCol}>
          <Text style={styles.label}>Start Time</Text>
          <View style={styles.timeInput}>
            <Text style={[styles.timeText, isNew && styles.placeholder]}>{values.start}</Text>
          </View>
        </View>
        <View style={styles.timeCol}>
          <Text style={styles.label}>End Time</Text>
          <View style={styles.timeInput}>
            <Text style={[styles.timeText, isNew && styles.placeholder]}>{values.end}</Text>
          </View>
        </View>
      </View>

      <Text style={styles.label}>Title</Text>
      <View style={styles.input}>
        <Text style={[styles.inputText, !values.title && styles.placeholder]}>
          {values.title || 'Activity title'}
        </Text>
      </View>

      <Text style={styles.label}>Description</Text>
      <View style={styles.input}>
        <Text style={[styles.inputText, !values.description && styles.placeholder]}>
          {values.description || 'Short description'}
        </Text>
      </View>

      <Text style={styles.label}>Hours</Text>
      <View style={styles.input}>
        <Text style={[styles.inputText, !values.hours && styles.placeholder]}>
          {values.hours || 'e.g., 8:00am-8:00pm'}
        </Text>
      </View>

      <Text style={styles.label}>Notes</Text>
      <View style={styles.input}>
        <Text style={[styles.inputText, !values.notes && styles.placeholder]}>
          {values.notes || 'Additional notes'}
        </Text>
      </View>

      <Text style={styles.label}>Location</Text>
      <View style={styles.input}>
        <Text style={[styles.inputText, !values.location && styles.placeholder]}>
          {values.location || 'Location name or address'}
        </Text>
      </View>

      <Text style={styles.label}>Type</Text>
      <View style={styles.pillRow}>
        <View style={[styles.pill, styles.pillActive]}>
          <Text style={styles.pillTextActive}>Activity</Text>
        </View>
        <View style={styles.pill}>
          <Text style={styles.pillText}>Transport</Text>
        </View>
      </View>

      <Text style={styles.label}>Category</Text>
      <View style={styles.pillRow}>
        <View style={[styles.pill, styles.pillActive]}>
          <Text style={styles.pillTextActive}>Default</Text>
        </View>
        <View style={styles.pill}>
          <Text style={styles.pillText}>Check-In</Text>
        </View>
        <View style={styles.pill}>
          <Text style={styles.pillText}>Eat/Drink</Text>
        </View>
      </View>

      <Text style={styles.label}>Parent Activity</Text>
      <View style={styles.pillRow}>
        <View style={[styles.parentChip, styles.parentChipActive]}>
          <Text style={styles.parentChipTextActive}>None</Text>
        </View>
        {parentOptions.map((opt) => (
          <View key={opt} style={styles.parentChip}>
            <Text style={styles.parentChipText} numberOfLines={1}>{opt}</Text>
          </View>
        ))}
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
    // Save button: sheet paddingH s(16), paddingB s(16).
    // "Save" text ~s(28) wide + paddingH s(20)*2 ≈ s(68). paddingV s(8)*2 + lh s(15.6) ≈ s(32).
    const saveBtnW = s(60);
    const saveBtnH = s(32);
    const saveBtnCenter = { x: W - s(16) - saveBtnW / 2 - s(8), y: H - s(16) - saveBtnH / 2 - s(4) };
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
        // Tap Save button
        moveTo(cursor, saveBtnCenter.x, saveBtnCenter.y, 700),
        Animated.delay(150),
        tap(cursor),
        Animated.timing(newSheetY, { toValue: SHEET_H, duration: 300, useNativeDriver: true }),
        moveTo(cursor, start.x, start.y, 500),
        Animated.delay(600),

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
          {['Sat', 'Sun', 'Mon', 'Tue'].map((dow, i) => (
            <View key={i} style={[styles.tab, i === 2 && styles.tabActive]}>
              <Text style={[styles.tabDow, i === 2 && styles.tabDowActive]}>{dow}</Text>
              <Text style={[styles.tabDate, i === 2 && styles.tabDateActive]}>Apr {11 + i}</Text>
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
  tab: { width: s(70), alignItems: 'center', justifyContent: 'center', paddingVertical: s(10) },
  tabActive: { borderBottomWidth: 2, borderBottomColor: '#007AFF' },
  tabDow: { fontSize: s(13), lineHeight: s(17), fontWeight: '700', color: '#1a1a1a' },
  tabDate: { fontSize: s(11), lineHeight: s(14), color: '#555', marginTop: 1 },
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
    paddingTop: s(16),
    paddingHorizontal: s(16),
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
    marginBottom: s(8),
  },
  sheetHeading: {
    fontSize: s(16), lineHeight: s(20),
    fontWeight: '700', color: '#1a1a1a',
  },
  sheetDelete: {
    fontSize: s(12),
    fontWeight: '600',
    color: '#FF3B30',
  },
  timeRow: {
    flexDirection: 'row',
    gap: s(10),
  },
  timeCol: { flex: 1 },
  label: {
    fontSize: s(9),
    fontWeight: '600',
    color: '#888',
    textTransform: 'uppercase',
    marginBottom: s(3),
    marginTop: s(8),
  },
  timeInput: {
    backgroundColor: '#f5f5f5',
    borderRadius: s(6),
    height: s(28),
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeText: { fontSize: s(11), color: '#1a1a1a' },
  placeholder: { color: '#bbb', fontWeight: '400' },
  input: {
    backgroundColor: '#f5f5f5',
    borderRadius: s(6),
    height: s(28),
    paddingHorizontal: s(10),
    justifyContent: 'center',
  },
  inputText: { fontSize: s(11), color: '#1a1a1a' },
  pillRow: {
    flexDirection: 'row',
    gap: s(6),
    marginBottom: s(2),
    flexWrap: 'wrap',
  },
  pill: {
    paddingHorizontal: s(10),
    paddingVertical: s(5),
    borderRadius: s(14),
    backgroundColor: '#f0f0f0',
  },
  pillActive: {
    backgroundColor: '#007AFF',
  },
  pillText: { fontSize: s(10), fontWeight: '600', color: '#666' },
  pillTextActive: { fontSize: s(10), fontWeight: '600', color: '#fff' },
  parentChip: {
    paddingHorizontal: s(10),
    paddingVertical: s(5),
    borderRadius: s(12),
    backgroundColor: '#f0f0f0',
    maxWidth: s(90),
  },
  parentChipActive: {
    backgroundColor: '#007AFF',
  },
  parentChipText: { fontSize: s(10), fontWeight: '600', color: '#666' },
  parentChipTextActive: { fontSize: s(10), fontWeight: '600', color: '#fff' },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: s(12),
    marginTop: s(10),
  },
  cancelText: {
    fontSize: s(13),
    fontWeight: '600',
    color: '#888',
    paddingHorizontal: s(12),
    paddingVertical: s(8),
  },
  saveBtn: {
    backgroundColor: '#007AFF',
    borderRadius: s(8),
    paddingHorizontal: s(20),
    paddingVertical: s(8),
  },
  saveText: {
    fontSize: s(13),
    fontWeight: '600',
    color: '#fff',
  },
});
