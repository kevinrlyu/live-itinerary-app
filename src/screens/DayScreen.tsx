import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Day, Activity } from '../types';
import ActivityCard from '../components/ActivityCard';
import { getCurrentActivityIndex } from '../utils/tracking';

interface Props {
  day: Day;
  onToggle: (dayDate: string, activityId: string) => void;
  defaultCurrency?: string;
  onExpense?: (dayDate: string, activityId: string, expense: { amount: number; currency: string } | null) => void;
}

export default function DayScreen({ day, onToggle, defaultCurrency, onExpense }: Props) {
  const [now, setNow] = useState(new Date());
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(interval);
  }, []);

  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const isToday = day.date === todayStr;
  const currentIndex = isToday ? getCurrentActivityIndex(day.activities, now) : -1;

  // Map each activity id to its flat index (for isCurrent tracking)
  const flatIndexMap: Record<string, number> = {};
  day.activities.forEach((a, i) => { flatIndexMap[a.id] = i; });

  // Build child map: parentId -> children[]
  const childrenMap: Record<string, Activity[]> = {};
  for (const activity of day.activities) {
    if (activity.parentId) {
      if (!childrenMap[activity.parentId]) childrenMap[activity.parentId] = [];
      childrenMap[activity.parentId].push(activity);
    }
  }

  // If the current activity is a child, its parent should also glow
  const currentActivity = currentIndex >= 0 ? day.activities[currentIndex] : null;
  const currentParentId = currentActivity?.parentId ?? null;

  const isActivityCurrent = (activity: Activity) => {
    if (flatIndexMap[activity.id] === currentIndex) return true;
    // Parent glows if any of its children is current
    if (currentParentId && activity.id === currentParentId) return true;
    return false;
  };

  const toggle = (activityId: string) => onToggle(day.date, activityId);
  const handleExpense = onExpense
    ? (id: string, expense: { amount: number; currency: string } | null) => onExpense(day.date, id, expense)
    : undefined;

  const toggleCollapse = useCallback((headerId: string) => {
    setCollapsed((prev) => ({ ...prev, [headerId]: !prev[headerId] }));
  }, []);

  const renderActivity = (activity: Activity, isChild = false, isGroupHeader = false) => (
    <ActivityCard
      key={activity.id}
      activity={activity}
      isCurrent={isActivityCurrent(activity)}
      onToggle={toggle}
      isChild={isChild}
      isGroupHeader={isGroupHeader}
      defaultCurrency={defaultCurrency}
      onExpense={handleExpense}
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

  // Render top-level activities (skip children — they render under their parent)
  const topLevel = day.activities.filter((a) => !a.parentId);

  return (
    <View style={styles.container}>
      <Text style={styles.theme}>{day.theme}</Text>
      <ScrollView contentContainerStyle={styles.list}>
        {topLevel.map((activity) => {
          const children = childrenMap[activity.id];
          if (children && children.length > 0) {
            return renderGroup(activity, children);
          }
          return renderActivity(activity);
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  theme: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  list: { paddingBottom: 32 },
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
});
