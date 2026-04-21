import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';
import Svg, { G, Path, Circle } from 'react-native-svg';
import FingerCursor, { createCursor, moveTo, tap, hold } from './FingerCursor';
import { FRAME_W as W, FRAME_H as H, s, STATUS_H } from './scale';

const HOLD_MS = 1000;

const HEADER_H = s(8 + 34 + 8); // paddingV 8 + menu button (pad 8 + icon 18 + pad 8) + paddingV 8
const TAB_H = HEADER_H;           // match header thickness as in real app
const BOTTOM_TAB_H = s(75); // 49 bar + 34 safe area, adjusted for frame aspect ratio
const TAB_W_4 = W / 4;  // width when 4 days
const TAB_W_5 = W / 5;  // width when 5 days

const MON_IDX = 2;
const WED_IDX = 4;

const CONTENT_TOP = STATUS_H + HEADER_H + TAB_H;

const THEME_H = s(12 + 20 + 12);
// Banner rendered height: paddingV 8 + max content. Done btn is taller: paddingV 6 + text lineHeight ~16
const BANNER_H = s(8 + 28 + 8);

// Prompt dialog dimensions
const DIALOG_W = s(270);
const DIALOG_TITLE_H = s(14 + 18);
const DIALOG_INPUT_H = s(32);
const DIALOG_BTNS_H = s(40);
const DIALOG_PADDING = s(16);
const DIALOG_H = DIALOG_PADDING + DIALOG_TITLE_H + s(12) + DIALOG_INPUT_H + s(4) + DIALOG_BTNS_H;
const DIALOG_TOP = (H - DIALOG_H) / 2;
const DIALOG_LEFT = (W - DIALOG_W) / 2;

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
  isEditMode?: boolean;
}

function Card({ time, timeEnd, title, description, hours, isEditMode }: CardProps) {
  const timeLabel = time ? (timeEnd ? `${time} – ${timeEnd}` : time) : null;
  return (
    <View style={[cardStyles.card, isEditMode && cardStyles.cardEdit]}>
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

export default function Demo2Day({ active }: { active: boolean }) {
  const cursor = useRef(createCursor(W - 22, H - 22)).current;

  // Phase 1: add day
  const tabsTranslate = useRef(new Animated.Value(0)).current;
  const addProgress = useRef(new Animated.Value(0)).current;
  const addOverlayOpacity = useRef(new Animated.Value(0)).current;
  const wedTabOpacity = useRef(new Animated.Value(0)).current;
  // Animates from 0 (4-day layout) to 1 (5-day layout)
  const layoutProgress = useRef(new Animated.Value(0)).current;
  const animTabW = layoutProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [TAB_W_4, TAB_W_5],
  });
  const activeUnderX = useRef(new Animated.Value(TAB_W_4 * MON_IDX)).current;

  // Day content swap
  const oldContentOpacity = useRef(new Animated.Value(1)).current;
  const newContentOpacity = useRef(new Animated.Value(0)).current;

  // Prompt dialog
  const dialogOpacity = useRef(new Animated.Value(0)).current;
  const dimOpacity = useRef(new Animated.Value(0)).current;
  const promptTypedOpacity = useRef(new Animated.Value(0)).current;

  // Theme in new day (shown after prompt Add)
  const themeNaraOpacity = useRef(new Animated.Value(0)).current;

  // Phase 2: pull-down + remove
  const pullOverlayOpacity = useRef(new Animated.Value(0)).current;
  const holdProgress = useRef(new Animated.Value(0)).current;
  const editBannerOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!active) return;

    const reset = () => {
      tabsTranslate.setValue(0);
      addProgress.setValue(0);
      addOverlayOpacity.setValue(0);
      wedTabOpacity.setValue(0);
      activeUnderX.setValue(TAB_W_4 * MON_IDX);
      layoutProgress.setValue(0);
      oldContentOpacity.setValue(1);
      newContentOpacity.setValue(0);
      dialogOpacity.setValue(0);
      dimOpacity.setValue(0);
      promptTypedOpacity.setValue(0);
      themeNaraOpacity.setValue(0);
      pullOverlayOpacity.setValue(0);
      holdProgress.setValue(0);
      editBannerOpacity.setValue(0);
    };

    const tabBarCenterY = STATUS_H + HEADER_H + TAB_H / 2;
    const tabDragStart = { x: W - s(30), y: tabBarCenterY };
    const tabDragged = { x: W - s(70), y: tabBarCenterY };

    const dayPullStart = { x: W / 2, y: CONTENT_TOP + s(20) };
    const dayPulled = { x: W / 2, y: CONTENT_TOP + s(80) };

    // Dialog text input center (computed from actual rendered layout)
    // pad(16) + title-height(18) + input-mt(12) + input-h/2(16)
    const dialogInputY = DIALOG_TOP + s(16 + 18 + 12) + DIALOG_INPUT_H / 2;
    const dialogInputCenter = { x: W / 2, y: dialogInputY };
    // Dialog Add button (right half of bottom row): above dialog bottom by half btn height
    // Actual dialog rendered height: pad(16) + title(18) + input-mt(12) + input(32) + btns-mt(14) + btns(40)
    const dialogRenderedH = s(16 + 18 + 12 + 32 + 14 + 40);
    const dialogBtnsY = DIALOG_TOP + dialogRenderedH - DIALOG_BTNS_H / 2;
    const dialogAddCenter = { x: DIALOG_LEFT + DIALOG_W * 0.75, y: dialogBtnsY };

    // "Remove Day" text center — vertically centered in edit banner
    const removeDayCenter = { x: s(54), y: CONTENT_TOP + BANNER_H / 2 };

    const script = Animated.loop(
      Animated.sequence([
        Animated.timing(tabsTranslate, { toValue: 0, duration: 0, useNativeDriver: true }),
        Animated.timing(addProgress, { toValue: 0, duration: 0, useNativeDriver: false }),
        Animated.timing(addOverlayOpacity, { toValue: 0, duration: 0, useNativeDriver: true }),
        Animated.timing(wedTabOpacity, { toValue: 0, duration: 0, useNativeDriver: false }),
        Animated.timing(activeUnderX, { toValue: TAB_W_4 * MON_IDX, duration: 0, useNativeDriver: false }),
        Animated.timing(layoutProgress, { toValue: 0, duration: 0, useNativeDriver: false }),
        Animated.timing(oldContentOpacity, { toValue: 1, duration: 0, useNativeDriver: true }),
        Animated.timing(newContentOpacity, { toValue: 0, duration: 0, useNativeDriver: true }),
        Animated.timing(dialogOpacity, { toValue: 0, duration: 0, useNativeDriver: true }),
        Animated.timing(dimOpacity, { toValue: 0, duration: 0, useNativeDriver: true }),
        Animated.timing(promptTypedOpacity, { toValue: 0, duration: 0, useNativeDriver: true }),
        Animated.timing(themeNaraOpacity, { toValue: 0, duration: 0, useNativeDriver: true }),
        Animated.timing(pullOverlayOpacity, { toValue: 0, duration: 0, useNativeDriver: true }),
        Animated.timing(holdProgress, { toValue: 0, duration: 0, useNativeDriver: false }),
        Animated.timing(editBannerOpacity, { toValue: 0, duration: 0, useNativeDriver: true }),

        Animated.delay(400),

        // Phase 1: drag day tabs right + hold → new day
        moveTo(cursor, tabDragStart.x, tabDragStart.y, 600),
        Animated.delay(150),
        Animated.parallel([
          moveTo(cursor, tabDragged.x, tabDragged.y, 500),
          Animated.timing(tabsTranslate, { toValue: s(60), duration: 500, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(addOverlayOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
          hold(cursor, HOLD_MS),
          Animated.timing(addProgress, { toValue: 1, duration: HOLD_MS, useNativeDriver: false }),
        ]),

        // Release add bar + show prompt dialog
        Animated.parallel([
          Animated.timing(addOverlayOpacity, { toValue: 0, duration: 250, useNativeDriver: true }),
          Animated.timing(tabsTranslate, { toValue: 0, duration: 400, useNativeDriver: true }),
          Animated.timing(wedTabOpacity, { toValue: 1, duration: 400, useNativeDriver: false }),
          Animated.timing(layoutProgress, { toValue: 1, duration: 500, useNativeDriver: false }),
          Animated.timing(activeUnderX, { toValue: TAB_W_5 * WED_IDX, duration: 500, useNativeDriver: false }),
          Animated.timing(oldContentOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
          Animated.timing(newContentOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.timing(dimOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.timing(dialogOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
        ]),
        Animated.delay(400),

        // Tap text input → type "Nara"
        moveTo(cursor, dialogInputCenter.x, dialogInputCenter.y, 600),
        Animated.delay(150),
        tap(cursor),
        Animated.delay(250),
        Animated.timing(promptTypedOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.delay(500),

        // Tap Add → dialog dismisses → theme "Nara" appears below banner when in edit mode
        moveTo(cursor, dialogAddCenter.x, dialogAddCenter.y, 600),
        Animated.delay(150),
        tap(cursor),
        Animated.parallel([
          Animated.timing(dialogOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
          Animated.timing(dimOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
          Animated.timing(themeNaraOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        ]),
        Animated.delay(700),

        // Phase 2: pull-down + hold on new day → edit mode
        moveTo(cursor, dayPullStart.x, dayPullStart.y, 500),
        Animated.delay(150),
        Animated.parallel([
          moveTo(cursor, dayPulled.x, dayPulled.y, 400),
          Animated.timing(pullOverlayOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
        ]),
        Animated.parallel([
          hold(cursor, HOLD_MS),
          Animated.timing(holdProgress, { toValue: 1, duration: HOLD_MS, useNativeDriver: false }),
        ]),
        Animated.parallel([
          Animated.timing(pullOverlayOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
          Animated.timing(editBannerOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
        ]),
        Animated.delay(500),

        // Tap Remove Day
        moveTo(cursor, removeDayCenter.x, removeDayCenter.y, 500),
        Animated.delay(150),
        tap(cursor),

        // Day removed: swap back to old content
        Animated.parallel([
          Animated.timing(editBannerOpacity, { toValue: 0, duration: 250, useNativeDriver: true }),
          Animated.timing(wedTabOpacity, { toValue: 0, duration: 400, useNativeDriver: false }),
          Animated.timing(layoutProgress, { toValue: 0, duration: 500, useNativeDriver: false }),
          Animated.timing(activeUnderX, { toValue: TAB_W_4 * MON_IDX, duration: 500, useNativeDriver: false }),
          Animated.timing(newContentOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
          Animated.timing(themeNaraOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
          Animated.timing(promptTypedOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
          Animated.timing(oldContentOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
          moveTo(cursor, W - 22, H - 22, 500),
        ]),
        Animated.delay(900),
      ])
    );

    reset();
    script.start();
    return () => {
      script.stop();
      reset();
    };
  }, [active]);

  const addLabelOpacity = addProgress.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 0.3, 1],
  });
  const editLabelOpacity = holdProgress.interpolate({
    inputRange: [0, 0.6, 1],
    outputRange: [0, 0, 1],
  });

  return (
    <View style={styles.wrapper}>
      <View style={styles.frame}>
        <View style={{ height: STATUS_H, backgroundColor: '#f5f5f5' }} />

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle} numberOfLines={1}>Japan 2026</Text>
          <View style={styles.menuIconContainer}>
            <View style={styles.menuBar} />
            <View style={styles.menuBar} />
            <View style={styles.menuBar} />
          </View>
        </View>

        {/* Day tab bar */}
        <View style={styles.tabBar}>
          <Animated.View
            style={[styles.tabStrip, { transform: [{ translateX: Animated.multiply(tabsTranslate, -1) }] }]}
          >
            {['Sat', 'Sun', 'Mon', 'Tue'].map((dow, i) => (
              <Animated.View key={i} style={[styles.tab, { width: animTabW }]}>
                <Text style={styles.tabDow}>{dow}</Text>
                <Text style={styles.tabDate}>Aug {22 + i}</Text>
              </Animated.View>
            ))}
            <Animated.View style={[styles.tab, { width: animTabW, opacity: wedTabOpacity }]}>
              <Text style={styles.tabDow}>Wed</Text>
              <Text style={styles.tabDate}>Aug 26</Text>
            </Animated.View>
            <Animated.View
              style={[styles.activeUnderline, { width: animTabW, transform: [{ translateX: activeUnderX }] }]}
            />
          </Animated.View>

          <Animated.View style={[styles.addOverlay, { opacity: addOverlayOpacity }]} pointerEvents="none">
            <View style={styles.progressTrack}>
              <Animated.View
                style={[
                  styles.progressFill,
                  { width: addProgress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) },
                ]}
              />
            </View>
            <Animated.Text style={[styles.addLabel, { opacity: addLabelOpacity }]}>Adding day</Animated.Text>
          </Animated.View>
        </View>

        {/* Old day content */}
        <Animated.View style={[styles.dayContent, { opacity: oldContentOpacity }]}>
          <Text style={styles.theme}>Kyoto Temples</Text>
          <Card time="9:00am" title="Fushimi Inari Shrine" />
          <Card
            time="1:00pm"
            timeEnd="3:00pm"
            title="Kiyomizu-dera Temple"
            description="Historic Buddhist temple"
            hours="6:00am-6:00pm"
          />
          <Card time="5:00pm" title="Gion District walk" />
        </Animated.View>

        {/* New (empty) day content — shifts down when edit banner appears so theme stays visible under banner */}
        <Animated.View
          style={[
            styles.dayContent,
            {
              opacity: newContentOpacity,
              transform: [{ translateY: Animated.multiply(editBannerOpacity, BANNER_H) }],
            },
          ]}
          pointerEvents="none"
        >
          <Animated.Text style={[styles.theme, { opacity: themeNaraOpacity }]}>
            Nara
          </Animated.Text>
        </Animated.View>

        {/* Edit banner — positioned over top of new day content */}
        <Animated.View style={[styles.editBanner, { opacity: editBannerOpacity }]} pointerEvents="none">
          <Text style={styles.removeDayText}>Remove Day</Text>
          <View style={styles.doneBtn}>
            <Text style={styles.doneBtnText}>Done</Text>
          </View>
        </Animated.View>

        {/* Pull-and-hold overlay */}
        <Animated.View style={[styles.pullOverlay, { opacity: pullOverlayOpacity }]} pointerEvents="none">
          <View style={styles.pullProgressTrack}>
            <Animated.View
              style={[
                styles.progressFill,
                { width: holdProgress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) },
              ]}
            />
          </View>
          <Animated.Text style={[styles.holdLabel, { opacity: editLabelOpacity }]}>Editing</Animated.Text>
        </Animated.View>

        {/* iOS-style Alert.prompt dialog */}
        <Animated.View style={[styles.dim, { opacity: dimOpacity }]} pointerEvents="none" />
        <Animated.View style={[styles.dialog, { opacity: dialogOpacity }]} pointerEvents="none">
          <Text style={styles.dialogTitle}>New Day</Text>
          <View style={styles.dialogInput}>
            <Animated.Text
              style={[styles.dialogInputPlaceholder, { opacity: Animated.subtract(1, promptTypedOpacity) }]}
            >
              Title
            </Animated.Text>
            <Animated.Text
              style={[styles.dialogInputText, { opacity: promptTypedOpacity }]}
            >
              Nara
            </Animated.Text>
          </View>
          <View style={styles.dialogBtns}>
            <View style={[styles.dialogBtn, styles.dialogBtnLeft]}>
              <Text style={styles.dialogBtnText}>Cancel</Text>
            </View>
            <View style={styles.dialogBtnDivider} />
            <View style={styles.dialogBtn}>
              <Text style={[styles.dialogBtnText, styles.dialogBtnBold]}>Add</Text>
            </View>
          </View>
        </Animated.View>

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

        <FingerCursor cursor={cursor} />
      </View>
    </View>
  );
}

const cardStyles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: s(12),
    padding: s(16),
    marginVertical: s(6),
    marginHorizontal: s(16),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: s(4),
  },
  cardEdit: {
    borderWidth: 1,
    borderColor: '#007AFF44',
    borderStyle: 'dashed',
    borderRadius: s(10),
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
  iconBtnDisabled: {
    opacity: 0.4,
  },
});

const styles = StyleSheet.create({
  wrapper: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  frame: {
    width: W, height: H,
    backgroundColor: '#f5f5f5',
    borderRadius: 22,
    borderWidth: 1, borderColor: '#e0e0e0',
    shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 16, shadowOffset: { width: 0, height: 4 },
    overflow: 'hidden',
    position: 'relative',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: s(16),
    height: HEADER_H,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: s(16),
    lineHeight: s(20),
    fontWeight: '700',
    color: '#1a1a1a',
    flex: 1,
    marginRight: s(8),
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
  tabBar: {
    backgroundColor: '#fff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ddd',
    height: TAB_H,
    overflow: 'hidden',
  },
  tabStrip: {
    flexDirection: 'row',
    height: TAB_H,
    position: 'relative',
  },
  tab: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: s(8),
  },
  tabDow: {
    fontSize: s(12),
    lineHeight: s(16),
    fontWeight: '700',
    color: '#1a1a1a',
  },
  tabDate: {
    fontSize: s(12),
    lineHeight: s(16),
    color: '#888',
    marginTop: s(1),
  },
  activeUnderline: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    height: 2,
    backgroundColor: '#007AFF',
  },
  addOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  progressTrack: {
    width: s(100),
    height: s(3),
    borderRadius: s(1.5),
    backgroundColor: '#ddd',
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 2, backgroundColor: '#007AFF' },
  addLabel: {
    fontSize: s(12),
    lineHeight: s(15),
    fontWeight: '700',
    color: '#007AFF',
    marginTop: s(4),
  },
  dayContent: {
    position: 'absolute',
    left: 0, right: 0,
    top: CONTENT_TOP,
    bottom: BOTTOM_TAB_H,
  },
  theme: {
    fontSize: s(16),
    lineHeight: s(20),
    fontWeight: '700',
    color: '#333',
    paddingHorizontal: s(16),
    paddingTop: s(12),
    paddingBottom: s(12),
  },
  pullOverlay: {
    position: 'absolute',
    left: 0, right: 0,
    top: CONTENT_TOP,
    paddingVertical: s(12),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(245,245,245,0.94)',
  },
  pullProgressTrack: {
    width: s(120),
    height: s(4),
    borderRadius: s(2),
    backgroundColor: '#ddd',
    overflow: 'hidden',
  },
  holdLabel: {
    fontSize: s(14),
    lineHeight: s(18),
    fontWeight: '700',
    color: '#007AFF',
    marginTop: s(6),
  },
  editBanner: {
    position: 'absolute',
    left: 0, right: 0,
    top: CONTENT_TOP,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#D6EAFF',
    paddingHorizontal: s(16),
    paddingVertical: s(8),
  },
  removeDayText: {
    fontSize: s(14),
    lineHeight: s(18),
    fontWeight: '600',
    color: '#FF3B30',
  },
  doneBtn: {
    backgroundColor: '#007AFF',
    borderRadius: s(8),
    paddingHorizontal: s(16),
    paddingVertical: s(6),
  },
  doneBtnText: {
    fontSize: s(14),
    lineHeight: s(18),
    fontWeight: '600',
    color: '#fff',
  },
  dim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  dialog: {
    position: 'absolute',
    top: DIALOG_TOP,
    left: DIALOG_LEFT,
    width: DIALOG_W,
    backgroundColor: '#f9f9f9',
    borderRadius: s(14),
    paddingTop: DIALOG_PADDING,
    overflow: 'hidden',
  },
  dialogTitle: {
    fontSize: s(16),
    lineHeight: s(18),
    fontWeight: '700',
    color: '#1a1a1a',
    textAlign: 'center',
    height: DIALOG_TITLE_H - s(14),
  },
  dialogInput: {
    marginTop: s(12),
    marginHorizontal: s(14),
    height: DIALOG_INPUT_H,
    backgroundColor: '#fff',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#ccc',
    borderRadius: s(4),
    paddingHorizontal: s(8),
    justifyContent: 'center',
  },
  dialogInputPlaceholder: {
    position: 'absolute',
    left: s(8),
    right: s(8),
    fontSize: s(13),
    color: '#bbb',
  },
  dialogInputText: {
    position: 'absolute',
    left: s(8),
    right: s(8),
    fontSize: s(13),
    color: '#1a1a1a',
  },
  dialogBtns: {
    flexDirection: 'row',
    marginTop: s(14),
    height: DIALOG_BTNS_H,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#ccc',
  },
  dialogBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dialogBtnLeft: {
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: '#ccc',
  },
  dialogBtnDivider: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: '#ccc',
  },
  dialogBtnText: {
    fontSize: s(15),
    color: '#007AFF',
  },
  dialogBtnBold: {
    fontWeight: '700',
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
