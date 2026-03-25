import React, { useRef, useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  Animated, StyleSheet, NativeSyntheticEvent, NativeScrollEvent,
} from 'react-native';
import * as Haptics from 'expo-haptics';

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
  const scrollViewRef = useRef<ScrollView>(null);

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
    const maxOffset = contentSize.width - layoutMeasurement.width;
    const overscroll = contentOffset.x - maxOffset;

    if (overscroll > 10 && maxOffset > 0) {
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

  // Scroll to show the focused tab (especially after adding a new day)
  useEffect(() => {
    const focusedIdx = tabs.findIndex((t) => t.isFocused);
    if (focusedIdx >= 0 && scrollViewRef.current) {
      const TAB_WIDTH = 70;
      scrollViewRef.current.scrollTo({ x: Math.max(0, (focusedIdx + 1) * TAB_WIDTH - 200), animated: true });
    }
  }, [tabs.length, tabs.find((t) => t.isFocused)?.key]);

  const addLabelOpacity = holdProgressAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 0.3, 1],
  });

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollViewRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        onScrollBeginDrag={handleScrollBeginDrag}
        onScrollEndDrag={handleScrollEndDrag}
        scrollEventThrottle={16}
        bounces={true}
      >
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, tab.isFocused && styles.tabActive]}
            onPress={() => onTabPress(tab.key)}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabDayOfWeek, tab.isFocused && styles.tabTextActive]}>{tab.dayOfWeek}</Text>
            <Text style={[styles.tabMonthDay, tab.isFocused && styles.tabTextActive]}>{tab.monthDay}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Overlay progress indicator — does not affect tab bar size */}
      {showAddIndicator && (
        <View style={styles.addOverlay} pointerEvents="none">
          <View style={styles.progressTrack}>
            <Animated.View
              style={[
                styles.progressFill,
                {
                  width: holdProgressAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%'],
                  }),
                },
              ]}
            />
          </View>
          <Animated.Text style={[styles.addLabel, { opacity: addLabelOpacity }]}>
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
    width: 70,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#007AFF',
  },
  tabDayOfWeek: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  tabMonthDay: {
    fontSize: 11,
    color: '#555',
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
    fontSize: 11,
    fontWeight: '700',
    color: '#007AFF',
  },
});
