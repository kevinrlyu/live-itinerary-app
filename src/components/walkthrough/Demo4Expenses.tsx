import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';
import Svg, { G, Path, Circle } from 'react-native-svg';
import FingerCursor, { createCursor, moveTo, tap } from './FingerCursor';
import { FRAME_W as W, FRAME_H as H, s, STATUS_H } from './scale';

const HEADER_H = s(8 + 34 + 8);
const TAB_H = HEADER_H;
const BOTTOM_TAB_H = s(75); // 49 bar + 34 safe area, adjusted for frame aspect ratio
const THEME_H = s(16 + 22 + 8);

const CONTENT_TOP = STATUS_H + HEADER_H + TAB_H + THEME_H;

const CARD_BASIC_H = s(16 + 15 + 2 + 20 + 8 + 30 + 16);
const CARD_FULL_H = CARD_BASIC_H + s(4 + 18 + 3 + 15);
const CARD_GAP = s(12);

const CARD1_TOP = CONTENT_TOP + s(4);
const CARD2_TOP = CARD1_TOP + CARD_BASIC_H + CARD_GAP;
const CARD3_TOP = CARD2_TOP + CARD_FULL_H + CARD_GAP;

// ExpenseInput modal dimensions (mirrors real component: width 85%, padding 24)
const MODAL_W = Math.min(W * 0.85, s(340));
const MODAL_PAD = s(24);
const MODAL_LEFT = (W - MODAL_W) / 2;
// Heights — pad uses 3 cols × 4 rows, key paddingV s(12) + text s(22) ≈ s(46) per row
const KEY_ROW_H = s(46);
const PAD_ROWS_H = KEY_ROW_H * 4;
const TITLE_H = s(20);  // fontSize s(16) + lineHeight padding
const AMOUNT_ROW_H = s(36);
const ACTIONS_H = s(36);
const MODAL_H = MODAL_PAD * 2 + TITLE_H + s(16) + AMOUNT_ROW_H + s(16) + PAD_ROWS_H + s(16) + ACTIONS_H;
const MODAL_TOP = (H - MODAL_H) / 2;

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
  billHasAmount?: boolean;
}

function Card({ time, timeEnd, title, description, hours, top, height, billHasAmount }: CardProps) {
  const timeLabel = time ? (timeEnd ? `${time} – ${timeEnd}` : time) : null;
  return (
    <View style={[cardStyles.card, { top, height }]}>
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
        <View style={cardStyles.iconBtn}>
          {billHasAmount ? (
            <Text style={cardStyles.iconBtnAmount}>¥80</Text>
          ) : (
            <ReceiptIconMini size={s(14)} color="#fff" />
          )}
        </View>
        <View style={cardStyles.iconBtn}>
          <MapPinIcon size={s(14)} color="#fff" holeColor="#007AFF" />
        </View>
      </View>
    </View>
  );
}

export default function Demo4Expenses({ active }: { active: boolean }) {
  const cursor = useRef(createCursor(W - 22, H - 22)).current;
  const modalOpacity = useRef(new Animated.Value(0)).current;
  const digit1Opacity = useRef(new Animated.Value(0)).current;  // "8"
  const digit2Opacity = useRef(new Animated.Value(0)).current;  // "0"
  const placeholderOpacity = useRef(new Animated.Value(1)).current; // "0" placeholder
  const symActiveOpacity = useRef(new Animated.Value(0)).current; // bold ¥ symbol
  const mapsOpacity = useRef(new Animated.Value(0)).current;
  const billFlag = useRef(new Animated.Value(0)).current;
  const [billHasAmount, setBillHasAmount] = useState(false);

  useEffect(() => {
    const id = billFlag.addListener(({ value }) => {
      setBillHasAmount(value >= 0.5);
    });
    return () => billFlag.removeListener(id);
  }, []);

  useEffect(() => {
    if (!active) return;

    const reset = () => {
      modalOpacity.setValue(0);
      digit1Opacity.setValue(0);
      digit2Opacity.setValue(0);
      placeholderOpacity.setValue(1);
      symActiveOpacity.setValue(0);
      mapsOpacity.setValue(0);
      billFlag.setValue(0);
    };

    // Bill/pin button positions: card has left:s(16) + padding:s(16) so inner right edge = W - s(32)
    const BTN_H = s(30);
    const BILL_W = s(34);
    const PIN_W = s(34);
    const GAP = s(8);
    const CARD_INNER_R = W - s(32);
    const PAD_B = s(16);
    // Card 1: bill is leftmost of the two btns
    const card1PinLeft = CARD_INNER_R - PIN_W;
    const card1BillRight = card1PinLeft - GAP;
    const X_NUDGE = s(3);
    const billBtn = { x: card1BillRight - BILL_W / 2 - X_NUDGE, y: CARD1_TOP + CARD_BASIC_H - PAD_B - BTN_H / 2 };
    // Card 2: map pin is rightmost
    const pinBtn = { x: CARD_INNER_R - PIN_W / 2 - X_NUDGE, y: CARD2_TOP + CARD_FULL_H - PAD_B - BTN_H / 2 };

    // Keypad keys within modal (3 cols × 4 rows)
    const padTopInModal = MODAL_PAD + TITLE_H + s(16) + AMOUNT_ROW_H + s(16);
    const PAD_TOP = MODAL_TOP + padTopInModal;
    const PAD_LEFT = MODAL_LEFT + MODAL_PAD;
    const PAD_W = MODAL_W - MODAL_PAD * 2;
    const COL_W = PAD_W / 3;
    const keyCenter = (row: number, col: number) => ({
      x: PAD_LEFT + col * COL_W + COL_W / 2,
      y: PAD_TOP + row * KEY_ROW_H + KEY_ROW_H / 2,
    });
    // 8 is row 2, col 1; 0 is row 3, col 1
    const rawTap8 = keyCenter(2, 1);
    const rawTap0 = keyCenter(3, 1);
    const tap8 = { x: rawTap8.x - X_NUDGE, y: rawTap8.y };
    const tap0 = { x: rawTap0.x - X_NUDGE, y: rawTap0.y };
    // Modal Save button in actions row (right-aligned)
    const actionsTop = MODAL_TOP + MODAL_PAD + TITLE_H + s(16) + AMOUNT_ROW_H + s(16) + PAD_ROWS_H + s(16);
    const SAVE_W = s(60);
    const saveCenter = { x: MODAL_LEFT + MODAL_W - MODAL_PAD - SAVE_W / 2 - X_NUDGE, y: actionsTop + ACTIONS_H / 2 + 1 };
    const start = { x: W - 22, y: H - 22 };

    const script = Animated.loop(
      Animated.sequence([
        Animated.timing(modalOpacity, { toValue: 0, duration: 0, useNativeDriver: true }),
        Animated.timing(digit1Opacity, { toValue: 0, duration: 0, useNativeDriver: true }),
        Animated.timing(digit2Opacity, { toValue: 0, duration: 0, useNativeDriver: true }),
        Animated.timing(placeholderOpacity, { toValue: 1, duration: 0, useNativeDriver: true }),
        Animated.timing(symActiveOpacity, { toValue: 0, duration: 0, useNativeDriver: true }),
        Animated.timing(mapsOpacity, { toValue: 0, duration: 0, useNativeDriver: true }),

        // Phase 1: tap bill → modal → tap 8 → tap 0 → Save
        Animated.delay(300),
        moveTo(cursor, billBtn.x, billBtn.y, 700),
        Animated.delay(150),
        tap(cursor),
        Animated.timing(modalOpacity, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.delay(200),
        moveTo(cursor, tap8.x, tap8.y, 350),
        Animated.delay(80),
        tap(cursor),
        Animated.parallel([
          Animated.timing(digit1Opacity, { toValue: 1, duration: 120, useNativeDriver: true }),
          Animated.timing(placeholderOpacity, { toValue: 0, duration: 120, useNativeDriver: true }),
          Animated.timing(symActiveOpacity, { toValue: 1, duration: 120, useNativeDriver: true }),
        ]),
        Animated.delay(150),
        moveTo(cursor, tap0.x, tap0.y, 250),
        Animated.delay(80),
        tap(cursor),
        Animated.timing(digit2Opacity, { toValue: 1, duration: 120, useNativeDriver: true }),
        Animated.delay(300),
        moveTo(cursor, saveCenter.x, saveCenter.y, 500),
        Animated.delay(100),
        tap(cursor),
        Animated.parallel([
          Animated.timing(modalOpacity, { toValue: 0, duration: 250, useNativeDriver: true }),
          Animated.timing(billFlag, { toValue: 1, duration: 0, useNativeDriver: false }),
        ]),
        Animated.delay(800),

        // Phase 2: tap map pin on Kiyomizu → Maps overlay
        moveTo(cursor, pinBtn.x, pinBtn.y, 700),
        Animated.delay(150),
        tap(cursor),
        Animated.timing(mapsOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.parallel([
          moveTo(cursor, start.x, start.y, 500),
          Animated.timing(billFlag, { toValue: 0, duration: 0, useNativeDriver: false }),
        ]),
        Animated.delay(1800),
        Animated.timing(mapsOpacity, { toValue: 0, duration: 400, useNativeDriver: true }),
        Animated.delay(500),
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

        <View style={styles.header}>
          <Text style={styles.headerTitle}>Japan 2026</Text>
          <View style={styles.menuIcon}>
            <View style={styles.menuBar} />
            <View style={styles.menuBar} />
            <View style={styles.menuBar} />
          </View>
        </View>

        <View style={styles.tabBar}>
          {['Sat', 'Sun', 'Mon', 'Tue', 'Wed'].map((dow, i) => (
            <View key={i} style={[styles.tab, i === 2 && styles.tabActive]}>
              <Text style={[styles.tabDow, i === 2 && styles.tabDowActive]}>{dow}</Text>
              <Text style={[styles.tabDate, i === 2 && styles.tabDateActive]}>Aug {22 + i}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.dayTitle}>Kyoto Temples</Text>

        <Card
          top={CARD1_TOP}
          height={CARD_BASIC_H}
          time="9:00am"
          title="Fushimi Inari Shrine"
          billHasAmount={billHasAmount}
        />
        <Card
          top={CARD2_TOP}
          height={CARD_FULL_H}
          time="1:00pm"
          timeEnd="3:00pm"
          title="Kiyomizu-dera Temple"
          description="Historic Buddhist temple"
          hours="6:00am-6:00pm"
        />
        <Card
          top={CARD3_TOP}
          height={CARD_BASIC_H}
          time="5:00pm"
          title="Gion District walk"
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

        {/* Expense input modal — mirrors real ExpenseInput */}
        <Animated.View style={[styles.modalOverlay, { opacity: modalOpacity }]} pointerEvents="none">
          <View style={styles.modalBackdrop} />
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle} numberOfLines={1}>Fushimi Inari Shrine</Text>

            <View style={styles.modalAmountRow}>
              <View style={styles.modalAmountText}>
                <Animated.Text style={[styles.modalAmountPlaceholder, { opacity: placeholderOpacity }]}>
                  ¥0
                </Animated.Text>
                <View style={styles.modalAmountTyped}>
                  <View>
                    <Text style={styles.modalAmountSymInactive}>¥</Text>
                    <Animated.Text style={[styles.modalAmountSym, { opacity: symActiveOpacity, position: 'absolute', left: 0, top: 0 }]}>¥</Animated.Text>
                  </View>
                  <Animated.Text style={[styles.modalAmountDigit, { opacity: digit1Opacity }]}>8</Animated.Text>
                  <Animated.Text style={[styles.modalAmountDigit, { opacity: digit2Opacity }]}>0</Animated.Text>
                </View>
              </View>
              <View style={styles.modalCurrencyBtn}>
                <Text style={styles.modalCurrencyText}>{'\u{1F1EF}\u{1F1F5}'} JPY</Text>
              </View>
            </View>

            <View style={styles.modalPad}>
              {['1','2','3','4','5','6','7','8','9','.','0','⌫'].map((k) => (
                <View key={k} style={styles.modalPadKey}>
                  <Text style={styles.modalPadKeyText}>{k}</Text>
                </View>
              ))}
            </View>

            <View style={styles.modalActions}>
              <View style={{ flex: 1 }} />
              <View style={styles.modalCancelBtn}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </View>
              <View style={styles.modalSaveBtn}>
                <Text style={styles.modalSaveText}>Save</Text>
              </View>
            </View>
          </View>
        </Animated.View>

        {/* Google Maps mock */}
        <Animated.View style={[styles.maps, { opacity: mapsOpacity }]} pointerEvents="none">
          <View style={styles.mapBg}>
            <View style={[styles.road, { top: s(120), left: -s(40), right: -s(40), transform: [{ rotate: '15deg' }] }]} />
            <View style={[styles.road, { top: s(320), left: -s(40), right: -s(40), transform: [{ rotate: '-8deg' }] }]} />
            <View style={[styles.roadV, { left: s(100), top: -s(40), bottom: 0 }]} />
            <View style={[styles.roadV, { left: s(260), top: 0, bottom: -s(40), transform: [{ rotate: '10deg' }] }]} />
            <View style={[styles.park, { top: s(190), left: s(140), width: s(70), height: s(55) }]} />
            <View style={[styles.park, { top: s(400), left: s(50), width: s(90), height: s(70) }]} />
          </View>
          <View style={styles.mapPinWrap}>
            <MapPinIcon size={s(36)} color="#EA4335" holeColor="#00000022" />
          </View>
          <View style={styles.mapSearch}>
            <Text style={styles.mapSearchText}>Kiyomizu-dera Temple</Text>
          </View>
          <View style={styles.mapBottomCard}>
            <Text style={styles.mapPlaceName}>Kiyomizu-dera Temple</Text>
            <Text style={styles.mapPlaceSub}>Buddhist temple · 4.6 ★</Text>
            <View style={styles.mapDirectionsBtn}>
              <Text style={styles.mapDirectionsText}>Directions</Text>
            </View>
          </View>
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
    fontSize: s(12),
    lineHeight: s(17),
    color: '#1a1a1a',
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
  iconBtnAmount: {
    fontSize: s(13),
    fontWeight: '700',
    color: '#fff',
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
  tabDow: { fontSize: s(12), lineHeight: s(16), fontWeight: '700', color: '#1a1a1a' },
  tabDate: { fontSize: s(12), lineHeight: s(16), color: '#888', marginTop: 1 },
  tabDowActive: { color: '#007AFF' },
  tabDateActive: { color: '#007AFF' },
  dayTitle: {
    paddingHorizontal: s(16),
    paddingTop: s(12),
    paddingBottom: s(12),
    fontSize: s(16),
    lineHeight: s(20),
    fontWeight: '700',
    color: '#333',
  },
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modalCard: {
    backgroundColor: '#fff',
    borderRadius: s(16),
    padding: MODAL_PAD,
    width: MODAL_W,
  },
  modalTitle: {
    fontSize: s(16),
    lineHeight: s(20),
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: s(16),
  },
  modalAmountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: s(16),
    height: AMOUNT_ROW_H,
  },
  modalAmountText: {
    flex: 1,
    position: 'relative',
    justifyContent: 'center',
    height: AMOUNT_ROW_H,
  },
  modalAmountPlaceholder: {
    position: 'absolute',
    left: 0,
    fontSize: s(28),
    fontWeight: '700',
    color: '#ccc',
  },
  modalAmountTyped: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  modalAmountSymInactive: {
    fontSize: s(28),
    fontWeight: '700',
    color: '#ccc',
  },
  modalAmountSym: {
    fontSize: s(28),
    fontWeight: '700',
    color: '#1a1a1a',
  },
  modalAmountDigit: {
    fontSize: s(28),
    fontWeight: '700',
    color: '#1a1a1a',
  },
  modalCurrencyBtn: {
    backgroundColor: '#f0f0f0',
    borderRadius: s(8),
    paddingVertical: s(6),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: s(70),
  },
  modalCurrencyText: {
    fontSize: s(14),
    fontWeight: '700',
    color: '#007AFF',
  },
  modalPad: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: s(16),
  },
  modalPadKey: {
    width: '33.33%',
    height: KEY_ROW_H,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalPadKeyText: {
    fontSize: s(20),
    fontWeight: '500',
    color: '#1a1a1a',
  },
  modalActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(8),
    marginTop: s(8),
  },
  modalCancelBtn: {
    paddingHorizontal: s(12),
    paddingVertical: s(6),
    borderRadius: s(8),
  },
  modalCancelText: {
    fontSize: s(12),
    fontWeight: '600',
    color: '#888',
  },
  modalSaveBtn: {
    backgroundColor: '#007AFF',
    paddingHorizontal: s(16),
    paddingVertical: s(6),
    borderRadius: s(8),
  },
  modalSaveText: {
    fontSize: s(12),
    fontWeight: '600',
    color: '#fff',
  },
  maps: {
    ...StyleSheet.absoluteFillObject,
  },
  mapBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#e8eadf',
    overflow: 'hidden',
  },
  road: {
    position: 'absolute',
    height: s(14),
    backgroundColor: '#fff',
  },
  roadV: {
    position: 'absolute',
    width: s(14),
    backgroundColor: '#fff',
  },
  park: {
    position: 'absolute',
    backgroundColor: '#c8e0b4',
    borderRadius: s(10),
  },
  mapPinWrap: {
    position: 'absolute',
    left: W / 2 - s(18),
    top: H / 2 - s(40),
  },
  mapSearch: {
    position: 'absolute',
    top: STATUS_H + s(10),
    left: s(14), right: s(14),
    backgroundColor: '#fff',
    borderRadius: s(24),
    paddingVertical: s(12),
    paddingHorizontal: s(16),
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: s(6),
    shadowOffset: { width: 0, height: 2 },
  },
  mapSearchText: { fontSize: s(14), fontWeight: '600', color: '#333' },
  mapBottomCard: {
    position: 'absolute',
    left: 0, right: 0, bottom: 0,
    backgroundColor: '#fff',
    paddingHorizontal: s(20),
    paddingTop: s(16),
    paddingBottom: s(28),
    borderTopLeftRadius: s(20),
    borderTopRightRadius: s(20),
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: s(10),
    shadowOffset: { width: 0, height: -3 },
  },
  mapPlaceName: { fontSize: s(17), fontWeight: '700', color: '#1a1a1a' },
  mapPlaceSub: { fontSize: s(13), color: '#666', marginTop: s(2) },
  mapDirectionsBtn: {
    backgroundColor: '#1a73e8',
    borderRadius: s(24),
    paddingVertical: s(10),
    alignItems: 'center',
    marginTop: s(12),
  },
  mapDirectionsText: { fontSize: s(14), fontWeight: '700', color: '#fff' },
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
