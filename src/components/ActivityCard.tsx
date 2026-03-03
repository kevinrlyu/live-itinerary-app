import React from 'react';
import { View, Text, TouchableOpacity, Linking, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Activity } from '../types';

const ACCENT_COLORS: Record<string, string> = {
  default: '#007AFF',
  hotel: '#E91E63',
  meal: '#E53935',
};

interface Props {
  activity: Activity;
  isCurrent: boolean;
  onToggle: (id: string) => void;
  isChild?: boolean;
  isGroupHeader?: boolean;
}

// Convert "HH:MM" (24h) to "h:mmam/pm" (12h)
function to12h(time: string): string {
  const [hStr, mStr] = time.split(':');
  let h = parseInt(hStr, 10);
  const m = mStr || '00';
  const suffix = h >= 12 ? 'pm' : 'am';
  if (h === 0) h = 12;
  else if (h > 12) h -= 12;
  return `${h}:${m}${suffix}`;
}

export default function ActivityCard({ activity, isCurrent, onToggle, isChild, isGroupHeader }: Props) {
  const openDirections = () => {
    if (!activity.location) return;
    const query = encodeURIComponent(activity.location);
    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${query}`);
  };

  const accent = ACCENT_COLORS[activity.category ?? 'default'] ?? ACCENT_COLORS.default;

  const formatTimeRange = () => {
    if (!activity.time) return null;
    if (activity.timeEnd) return `${to12h(activity.time)} – ${to12h(activity.timeEnd)}`;
    return to12h(activity.time);
  };

  // Transport: faint tappable row — entire row opens Google Maps
  if (activity.type === 'transport') {
    const label = activity.time
      ? `${to12h(activity.time)}: ${activity.title}`
      : activity.title;
    return (
      <TouchableOpacity
        style={styles.transportRow}
        onPress={activity.location ? openDirections : undefined}
        activeOpacity={activity.location ? 0.6 : 1}
      >
        <Text style={styles.transportTitle} numberOfLines={2}>{label}</Text>
      </TouchableOpacity>
    );
  }

  const timeLabel = formatTimeRange();

  return (
    <View style={[
      styles.card,
      isCurrent && [styles.currentCard, { borderLeftColor: accent }],
      activity.completed && styles.completedCard,
      isChild && styles.childCard,
      isGroupHeader && styles.groupHeaderCard,
    ]}>
      <View style={styles.row}>
        <TouchableOpacity testID="toggle-button" onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onToggle(activity.id); }} style={styles.checkbox}>
          <Text style={[styles.checkboxText, { color: accent }]}>
            {activity.completed ? '✓' : '○'}
          </Text>
        </TouchableOpacity>
        <View style={styles.content}>
          {timeLabel && <Text style={styles.time}>{timeLabel}</Text>}
          <Text style={[styles.title, activity.completed && styles.completedText]}>
            {activity.title}
          </Text>
          {activity.description && <Text style={styles.description}>{activity.description}</Text>}
          {activity.hours && <Text style={styles.hours}>Hours: {activity.hours}</Text>}
          {activity.notes && <Text style={styles.notes}>{activity.notes}</Text>}
        </View>
      </View>
      {activity.location && (
        <TouchableOpacity onPress={openDirections} style={[styles.directionsButton, { backgroundColor: accent }]}>
          <Text style={styles.directionsText}>Directions</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginVertical: 6,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  currentCard: {
    borderLeftWidth: 4,
  },
  completedCard: {
    opacity: 0.5,
  },
  childCard: {
    marginHorizontal: 0,
    marginTop: 2,
    marginBottom: 2,
    borderRadius: 8,
    shadowOpacity: 0.05,
  },
  groupHeaderCard: {
    paddingRight: 56,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  checkbox: {
    marginRight: 12,
    paddingTop: 2,
  },
  checkboxText: {
    fontSize: 20,
  },
  content: {
    flex: 1,
  },
  time: {
    fontSize: 12,
    color: '#888',
    marginBottom: 2,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  completedText: {
    textDecorationLine: 'line-through',
    color: '#999',
  },
  description: {
    fontSize: 13,
    color: '#666',
    marginTop: 4,
    lineHeight: 18,
  },
  hours: {
    fontSize: 12,
    color: '#888',
    marginTop: 3,
  },
  notes: {
    fontSize: 12,
    color: '#888',
    marginTop: 4,
    fontStyle: 'italic',
  },
  directionsButton: {
    marginTop: 10,
    alignSelf: 'flex-end',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
  },
  directionsText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  // Transport styles
  transportRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginVertical: 1,
    paddingVertical: 4,
  },
  transportTime: {
    fontSize: 11,
    color: '#bbb',
  },
  transportTitle: {
    flex: 1,
    fontSize: 12,
    color: '#aaa',
  },
});
