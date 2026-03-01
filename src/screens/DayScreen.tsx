import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { Day } from '../types';
import ActivityCard from '../components/ActivityCard';
import { getCurrentActivityIndex } from '../utils/tracking';

interface Props {
  day: Day;
  onToggle: (activityId: string) => void;
}

export default function DayScreen({ day, onToggle }: Props) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(interval);
  }, []);

  const currentIndex = getCurrentActivityIndex(day.activities, now);

  return (
    <View style={styles.container}>
      <Text style={styles.theme}>{day.theme}</Text>
      <FlatList
        data={day.activities}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <ActivityCard
            activity={item}
            isCurrent={index === currentIndex}
            onToggle={onToggle}
          />
        )}
        contentContainerStyle={styles.list}
      />
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
});
