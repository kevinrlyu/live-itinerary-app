import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  Animated, StyleSheet, NativeSyntheticEvent, NativeScrollEvent, LayoutChangeEvent,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useSettings } from '../contexts/SettingsContext';

const MIN_TAB_WIDTH = 70;

const HOLD_DURATION = 1000;

interface TabInfo {
  key: string;
  dayOfWeek: string;
  monthDay: string;
  isFocused: boolean;
}

interface Props {
  tabs: TabInfo[];
  onTabPress: (key: string) => void;
  onAddDay: () => void;
}

export default function DayTabBar({ tabs, onTabPress, onAddDay }: Props) {
  const { colors } = useSettings();
  const scrollViewRef = useRef<ScrollView>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  const tabWidth = containerWidth > 0
    ? Math.floor(containerWidth / Math.min(tabs.length, 5))
    : MIN_TAB_WIDTH;

  const onContainerLayout = useCallback((e: LayoutChangeEvent) => {
    setContainerWidth(e.nativeEvent.layout.width);
  }, []);

  const isDraggingRef = useRef(false);
  const isAtEdgeRef = useRef(false);

  // Hold-to-add state
  const holdProgressAnim = useRef(new Animated.Value(0)).current;
  const holdAnimRef = useRef<Animated.CompositeAnimation | null>(null);
  const hasFiredRef = useRef(false);
  const [showAddIndicator, setShowAddIndicator] = useState(false);

  const cancelHold = () => {
    if (holdAnimRef.current) {
      holdAnimRef.current.stop();
      holdAnimRef.current = null;
    }
    holdProgressAnim.setValue(0);
    isAtEdgeRef.current = false;
    setShowAddIndicator(false);
  };

  const startHold = () => {
    if (holdAnimRef.current || hasFiredRef.current) return;
    setShowAddIndicator(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const anim = Animated.timing(holdProgressAnim, {
      toValue: 1,
      duration: HOLD_DURATION,
      useNativeDriver: false,
    });
    holdAnimRef.current = anim;
    anim.start(({ finished }) => {
      if (finished && isDraggingRef.current) {
        hasFiredRef.current = true;
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onAddDay();
        cancelHold();
      }
    });
  };

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!isDraggingRef.current) return;
    const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
    const maxOffset = Math.max(0, contentSize.width - layoutMeasurement.width);
    const overscroll = contentOffset.x - maxOffset;

    if (overscroll > 10) {
      if (!isAtEdgeRef.current) {
        isAtEdgeRef.current = true;
        startHold();
      }
    } else {
      if (isAtEdgeRef.current) {
        cancelHold();
      }
    }
  };

  const handleScrollBeginDrag = () => {
    isDraggingRef.current = true;
    hasFiredRef.current = false;
  };

  const handleScrollEndDrag = () => {
    isDraggingRef.current = false;
    cancelHold();
  };

  // Scroll to center the focused tab
  useEffect(() => {
    const focusedIdx = tabs.findIndex((t) => t.isFocused);
    if (focusedIdx >= 0 && scrollViewRef.current && containerWidth > 0) {
      const tabCenter = focusedIdx * tabWidth + tabWidth / 2;
      const scrollX = tabCenter - containerWidth / 2;
      const maxScroll = Math.max(0, tabs.length * tabWidth - containerWidth);
      scrollViewRef.current.scrollTo({ x: Math.max(0, Math.min(scrollX, maxScroll)), animated: true });
    }
  }, [tabs.length, tabs.find((t) => t.isFocused)?.key, tabWidth, containerWidth]);

  const addLabelOpacity = holdProgressAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 0.3, 1],
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.headerBackground, borderBottomColor: colors.border }]} onLayout={onContainerLayout}>
      <ScrollView
        ref={scrollViewRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        onScrollBeginDrag={handleScrollBeginDrag}
        onScrollEndDrag={handleScrollEndDrag}
        scrollEventThrottle={16}
        bounces={true}
        alwaysBounceHorizontal={true}
        contentContainerStyle={{ flexGrow: 1 }}
      >
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, { width: tabWidth }, tab.isFocused && [styles.tabActive, { borderBottomColor: colors.accent }]]}
            onPress={() => onTabPress(tab.key)}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabDayOfWeek, { color: colors.textPrimary }, tab.isFocused && { color: colors.accent }]}>{tab.dayOfWeek}</Text>
            <Text style={[styles.tabMonthDay, { color: colors.textSecondary }, tab.isFocused && { color: colors.accent }]}>{tab.monthDay}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Overlay progress indicator — does not affect tab bar size */}
      {showAddIndicator && (
        <View style={[styles.addOverlay, { backgroundColor: colors.headerBackground + 'D9' }]} pointerEvents="none">
          <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
            <Animated.View
              style={[
                styles.progressFill,
                { backgroundColor: colors.accent },
                {
                  width: holdProgressAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%'],
                  }),
                },
              ]}
            />
          </View>
          <Animated.Text style={[styles.addLabel, { opacity: addLabelOpacity, color: colors.accent }]}>
            Adding day
          </Animated.Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ddd',
  },
  tab: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#007AFF',
  },
  tabDayOfWeek: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  tabMonthDay: {
    fontSize: 12,
    color: '#888',
    marginTop: 1,
  },
  tabTextActive: {
    color: '#007AFF',
  },
  // Absolutely positioned overlay — no layout impact on tab bar
  addOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.85)',
    gap: 4,
  },
  progressTrack: {
    width: 100,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#ddd',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 1.5,
    backgroundColor: '#007AFF',
  },
  addLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#007AFF',
  },
});
