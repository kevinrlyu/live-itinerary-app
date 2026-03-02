import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { Day, Activity } from '../types';
import ActivityCard from '../components/ActivityCard';
import { getCurrentActivityIndex } from '../utils/tracking';

interface Props {
  day: Day;
  onToggle: (dayDate: string, activityId: string) => void;
}

export default function DayScreen({ day, onToggle }: Props) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(interval);
  }, []);

  const currentIndex = getCurrentActivityIndex(day.activities, now);

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

  const toggle = (activityId: string) => onToggle(day.date, activityId);

  const renderActivity = (activity: Activity, isChild = false) => (
    <ActivityCard
      key={activity.id}
      activity={activity}
      isCurrent={flatIndexMap[activity.id] === currentIndex}
      onToggle={toggle}
      isChild={isChild}
    />
  );

  const renderGroup = (header: Activity, children: Activity[]) => (
    <View key={header.id} style={styles.group}>
      {renderActivity(header)}
      <View style={styles.childrenWrapper}>
        <View style={styles.groupLine} />
        <View style={styles.childrenList}>
          {children.map((child) => renderActivity(child, true))}
        </View>
      </View>
    </View>
  );

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
  childrenWrapper: {
    flexDirection: 'row',
    marginLeft: 32,
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
