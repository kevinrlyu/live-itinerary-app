import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, TextInput, ScrollView, TouchableOpacity,
  Animated, StyleSheet,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Day, Activity } from '../types';
import ActivityCard from '../components/ActivityCard';
import ActivityEditSheet from '../components/ActivityEditSheet';
import InsertActivityButton from '../components/InsertActivityButton';
import { getCurrentActivityIndex } from '../utils/tracking';

const PULL_THRESHOLD = 15;     // negative contentOffset.y needed to start hold
const PULL_MAX = 70;           // max visual pull distance (with resistance)
const HOLD_DURATION = 1000;    // ms to hold before edit mode activates

interface Props {
  day: Day;
  onToggle: (dayDate: string, activityId: string) => void;
  onOpenExpense?: (dayDate: string, activity: Activity) => void;
  onUpdateActivity?: (dayDate: string, activity: Activity) => void;
  onInsertActivity?: (dayDate: string, afterIndex: number, newActivity: Activity) => void;
  onDeleteActivity?: (dayDate: string, activityId: string) => void;
  onRemoveDay?: (dayDate: string) => void;
  onUpdateDayTheme?: (dayDate: string, theme: string) => void;
  onEditingChange?: (editing: boolean) => void;
}

export default function DayScreen({
  day, onToggle, onOpenExpense,
  onUpdateActivity, onInsertActivity, onDeleteActivity, onRemoveDay, onUpdateDayTheme,
  onEditingChange,
}: Props) {
  const [now, setNow] = useState(new Date());
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [editMode, setEditMode] = useState(false);
  const [editingTheme, setEditingTheme] = useState(false);
  const [themeText, setThemeText] = useState(day.theme);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [insertAfterIndex, setInsertAfterIndex] = useState<number | null>(null);
  const [isNewActivity, setIsNewActivity] = useState(false);

  useEffect(() => {
    onEditingChange?.(editingActivity !== null);
  }, [editingActivity, onEditingChange]);

  // Pull-and-hold state (driven by ScrollView's native overscroll)
  const pullAnim = useRef(new Animated.Value(0)).current;
  const holdProgressAnim = useRef(new Animated.Value(0)).current;
  const holdAnimRef = useRef<Animated.CompositeAnimation | null>(null);
  const isDraggingRef = useRef(false);
  const isOverscrollingRef = useRef(false);
  const hasFiredRef = useRef(false);
  const [isPulling, setIsPulling] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(interval);
  }, []);

  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const isToday = day.date === todayStr;
  const currentIndex = isToday ? getCurrentActivityIndex(day.activities, now) : -1;

  const flatIndexMap: Record<string, number> = {};
  day.activities.forEach((a, i) => { flatIndexMap[a.id] = i; });

  const childrenMap: Record<string, Activity[]> = {};
  for (const activity of day.activities) {
    if (activity.parentId) {
      if (!childrenMap[activity.parentId]) childrenMap[activity.parentId] = [];
      childrenMap[activity.parentId].push(activity);
    }
  }

  const currentActivity = currentIndex >= 0 ? day.activities[currentIndex] : null;
  const currentParentId = currentActivity?.parentId ?? null;

  const isActivityCurrent = (activity: Activity) => {
    if (flatIndexMap[activity.id] === currentIndex) return true;
    if (currentParentId && activity.id === currentParentId) return true;
    return false;
  };

  const toggle = (activityId: string) => onToggle(day.date, activityId);
  const handleOpenExpense = onOpenExpense
    ? (activity: Activity) => onOpenExpense(day.date, activity)
    : undefined;

  const toggleCollapse = useCallback((headerId: string) => {
    setCollapsed((prev) => ({ ...prev, [headerId]: !prev[headerId] }));
  }, []);

  const canEdit = !!(onUpdateActivity || onInsertActivity || onDeleteActivity);

  const cancelHold = useCallback(() => {
    if (holdAnimRef.current) {
      holdAnimRef.current.stop();
      holdAnimRef.current = null;
    }
    holdProgressAnim.setValue(0);
    isOverscrollingRef.current = false;
    setIsPulling(false);
    pullAnim.setValue(0);
  }, [holdProgressAnim, pullAnim]);

  const startHoldTimer = useCallback(() => {
    if (holdAnimRef.current || hasFiredRef.current) return;
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
        setEditMode(true);
        cancelHold();
      }
    });
  }, [holdProgressAnim, cancelHold]);

  const handleScroll = useCallback((event: any) => {
    if (editMode || !canEdit) return;
    const offsetY: number = event.nativeEvent.contentOffset.y;

    // On iOS, pulling down past the top gives negative contentOffset.y
    if (isDraggingRef.current && offsetY < -PULL_THRESHOLD) {
      const rawPull = Math.abs(offsetY) - PULL_THRESHOLD;
      const resistedPull = PULL_MAX * (1 - Math.exp(-rawPull / PULL_MAX));
      pullAnim.setValue(resistedPull);

      if (!isOverscrollingRef.current) {
        isOverscrollingRef.current = true;
        setIsPulling(true);
        startHoldTimer();
      }
    }
    // Don't cancel based on contentOffset fluctuations — only cancel on drag end
  }, [editMode, canEdit, pullAnim, startHoldTimer]);

  const handleScrollBeginDrag = useCallback(() => {
    isDraggingRef.current = true;
    hasFiredRef.current = false;
  }, []);

  const handleScrollEndDrag = useCallback(() => {
    isDraggingRef.current = false;
    if (isOverscrollingRef.current) {
      cancelHold();
    }
  }, [cancelHold]);

  const exitEditMode = () => {
    if (editingTheme) {
      saveTheme();
    }
    setEditMode(false);
    pullAnim.setValue(0);
    holdProgressAnim.setValue(0);
  };

  const saveTheme = () => {
    setEditingTheme(false);
    const trimmed = themeText.trim();
    if (trimmed !== day.theme) {
      onUpdateDayTheme?.(day.date, trimmed);
    }
  };

  // Edit actions
  const handleLongPress = (activity: Activity) => {
    setEditingActivity(activity);
    setIsNewActivity(false);
  };

  const handleInsertPress = (afterIndex: number) => {
    const tempId = `a_new_${Date.now()}`;
    const blank: Activity = {
      id: tempId,
      type: 'activity',
      category: null,
      time: null,
      timeEnd: null,
      title: '',
      location: null,
      description: null,
      hours: null,
      notes: null,
      completed: false,
      parentId: null,
      expense: null,
    };
    setEditingActivity(blank);
    setInsertAfterIndex(afterIndex);
    setIsNewActivity(true);
  };

  const handleSheetSave = (updated: Activity) => {
    if (isNewActivity && insertAfterIndex !== null) {
      onInsertActivity?.(day.date, insertAfterIndex, updated);
    } else {
      onUpdateActivity?.(day.date, updated);
    }
    setEditingActivity(null);
    setInsertAfterIndex(null);
    setIsNewActivity(false);
  };

  const handleSheetDelete = (activityId: string) => {
    onDeleteActivity?.(day.date, activityId);
    setEditingActivity(null);
  };

  const handleSheetClose = () => {
    setEditingActivity(null);
    setInsertAfterIndex(null);
    setIsNewActivity(false);
  };

  const renderActivity = (activity: Activity, isChild = false, isGroupHeader = false) => (
    <ActivityCard
      key={activity.id}
      activity={activity}
      isCurrent={isActivityCurrent(activity)}
      onToggle={toggle}
      isChild={isChild}
      isGroupHeader={isGroupHeader}
      onOpenExpense={handleOpenExpense}
      isEditMode={editMode}
      onLongPress={editMode ? handleLongPress : undefined}
    />
  );

  const renderGroup = (header: Activity, children: Activity[]) => {
    const isCollapsed = collapsed[header.id] ?? false;
    return (
      <View key={header.id} style={styles.group}>
        <View style={styles.headerRow}>
          {renderActivity(header, false, true)}
          <TouchableOpacity
            activeOpacity={0.6}
            onPress={() => toggleCollapse(header.id)}
            style={styles.chevronBadge}
          >
            <Text style={styles.chevronText}>{isCollapsed ? '▸' : '▾'} {children.length}</Text>
          </TouchableOpacity>
        </View>
        {!isCollapsed && (
          <View style={styles.childrenWrapper}>
            <View style={styles.groupLine} />
            <View style={styles.childrenList}>
              {children.map((child) => renderActivity(child, true))}
            </View>
          </View>
        )}
      </View>
    );
  };

  const topLevel = day.activities.filter((a) => !a.parentId);

  const getTopLevelFlatIndex = (topIdx: number): number => {
    const act = topLevel[topIdx];
    const children = childrenMap[act.id] || [];
    if (children.length > 0) {
      const lastChild = children[children.length - 1];
      return flatIndexMap[lastChild.id];
    }
    return flatIndexMap[act.id];
  };

  // Interpolate hold progress for the "Editing" label opacity
  const editLabelOpacity = holdProgressAnim.interpolate({
    inputRange: [0, 0.6, 1],
    outputRange: [0, 0, 1],
  });
  const editLabelScale = holdProgressAnim.interpolate({
    inputRange: [0, 0.8, 1],
    outputRange: [0.5, 0.8, 1],
  });

  return (
    <View style={styles.container}>
      {/* Edit mode banner */}
      {editMode && (
        <View style={styles.editBanner}>
          {onRemoveDay ? (
            <TouchableOpacity onPress={() => { exitEditMode(); onRemoveDay(day.date); }}>
              <Text style={styles.removeDayText}>Remove Day</Text>
            </TouchableOpacity>
          ) : (
            <Text style={styles.editBannerText}>Editing</Text>
          )}
          <TouchableOpacity onPress={exitEditMode} style={styles.doneBtnBanner}>
            <Text style={styles.doneBtnText}>Done</Text>
          </TouchableOpacity>
        </View>
      )}

      {editMode && editingTheme ? (
        <TextInput
          style={styles.themeInput}
          value={themeText}
          onChangeText={setThemeText}
          onBlur={saveTheme}
          onSubmitEditing={saveTheme}
          placeholder="Day title (e.g. Tokyo, Travel Day)"
          placeholderTextColor="#bbb"
          autoFocus
          returnKeyType="done"
        />
      ) : editMode ? (
        <TouchableOpacity onPress={() => { setThemeText(day.theme); setEditingTheme(true); }}>
          <Text style={styles.theme}>{day.theme || 'Tap to add title'}</Text>
        </TouchableOpacity>
      ) : (
        day.theme ? <Text style={styles.theme}>{day.theme}</Text> : null
      )}

      <ScrollView
        contentContainerStyle={styles.list}
        alwaysBounceVertical
        onScroll={handleScroll}
        onScrollBeginDrag={handleScrollBeginDrag}
        onScrollEndDrag={handleScrollEndDrag}
        scrollEventThrottle={16}
      >
        {editMode && (
          <InsertActivityButton onPress={() => handleInsertPress(-1)} />
        )}

        {topLevel.map((activity, topIdx) => {
          const children = childrenMap[activity.id];
          const rendered = children && children.length > 0
            ? renderGroup(activity, children)
            : renderActivity(activity);

          return (
            <React.Fragment key={activity.id}>
              {rendered}
              {editMode && (
                <InsertActivityButton
                  onPress={() => handleInsertPress(getTopLevelFlatIndex(topIdx))}
                />
              )}
            </React.Fragment>
          );
        })}
      </ScrollView>

      {/* Pull-and-hold overlay — absolutely positioned so it doesn't affect ScrollView layout */}
      {isPulling && !editMode && (
        <View style={styles.pullOverlay} pointerEvents="none">
          <View style={styles.pullContent}>
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
            <Animated.Text
              style={[
                styles.holdLabel,
                {
                  opacity: editLabelOpacity,
                  transform: [{ scale: editLabelScale }],
                },
              ]}
            >
              Editing
            </Animated.Text>
          </View>
        </View>
      )}

      {editingActivity && (
        <ActivityEditSheet
          activity={editingActivity}
          dayActivities={day.activities}
          isNew={isNewActivity}
          onSave={handleSheetSave}
          onDelete={!isNewActivity ? handleSheetDelete : undefined}
          onClose={handleSheetClose}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  theme: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
  },
  themeInput: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 2,
    borderBottomColor: '#007AFF',
  },
  list: { paddingBottom: 32, flexGrow: 1 },
  group: {
    marginBottom: 4,
  },
  headerRow: {
    position: 'relative',
  },
  chevronBadge: {
    position: 'absolute',
    right: 32,
    top: 16,
    backgroundColor: '#eee',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 3,
  },
  chevronText: {
    fontSize: 12,
    color: '#888',
  },
  childrenWrapper: {
    flexDirection: 'row',
    marginLeft: 24,
    marginRight: 16,
  },
  groupLine: {
    width: 2,
    backgroundColor: '#ccc',
    borderRadius: 1,
    marginTop: -2,
    marginBottom: 6,
  },
  childrenList: {
    flex: 1,
    marginLeft: 6,
  },
  // Pull-and-hold overlay (absolutely positioned — no layout impact)
  pullOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 50,
    paddingTop: 12,
    paddingBottom: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(245,245,245,0.92)',
  },
  pullContent: {
    alignItems: 'center',
    gap: 6,
  },
  progressTrack: {
    width: 120,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#ddd',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
    backgroundColor: '#007AFF',
  },
  holdLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#007AFF',
  },
  // Edit mode banner
  editBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#D6EAFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  editBannerText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#007AFF',
  },
  removeDayText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF3B30',
  },
  doneBtnBanner: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  doneBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
});
