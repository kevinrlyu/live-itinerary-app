import React from 'react';
import { View, Text, TouchableOpacity, Linking, StyleSheet } from 'react-native';
import { Activity } from '../types';

interface Props {
  activity: Activity;
  isCurrent: boolean;
  onToggle: (id: string) => void;
  isChild?: boolean;
}

export default function ActivityCard({ activity, isCurrent, onToggle, isChild }: Props) {
  const openDirections = () => {
    if (!activity.location) return;
    const query = encodeURIComponent(activity.location);
    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${query}`);
  };

  const formatTimeRange = () => {
    if (!activity.time) return null;
    if (activity.timeEnd) return `${activity.time} – ${activity.timeEnd}`;
    return activity.time;
  };

  // Transport items: faint row, no checkbox, directions button if location exists
  if (activity.type === 'transport') {
    return (
      <View style={styles.transportRow}>
        <View style={styles.transportContent}>
          {activity.time && <Text style={styles.transportTime}>{activity.time}</Text>}
          <Text style={styles.transportTitle}>→  {activity.title}</Text>
          {activity.notes && <Text style={styles.transportNotes}>{activity.notes}</Text>}
        </View>
        {activity.location && (
          <TouchableOpacity onPress={openDirections} style={styles.transportDirBtn}>
            <Text style={styles.transportDirText}>Directions</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  const timeLabel = formatTimeRange();

  return (
    <View style={[
      styles.card,
      isCurrent && styles.currentCard,
      activity.completed && styles.completedCard,
      isChild && styles.childCard,
    ]}>
      <View style={styles.row}>
        <TouchableOpacity testID="toggle-button" onPress={() => onToggle(activity.id)} style={styles.checkbox}>
          <Text style={styles.checkboxText}>{activity.completed ? '✓' : '○'}</Text>
        </TouchableOpacity>
        <View style={styles.content}>
          {timeLabel && <Text style={styles.time}>{timeLabel}</Text>}
          <Text style={[styles.title, activity.completed && styles.completedText]}>{activity.title}</Text>
          {activity.location && <Text style={styles.location}>{activity.location}</Text>}
          {activity.description && <Text style={styles.description}>{activity.description}</Text>}
          {activity.hours && <Text style={styles.hours}>Hours: {activity.hours}</Text>}
          {activity.notes && <Text style={styles.notes}>{activity.notes}</Text>}
        </View>
      </View>
      {activity.location && (
        <TouchableOpacity onPress={openDirections} style={styles.directionsButton}>
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
    borderLeftColor: '#007AFF',
  },
  completedCard: {
    opacity: 0.5,
  },
  childCard: {
    marginLeft: 28,
    marginTop: 2,
    marginBottom: 2,
    borderRadius: 8,
    shadowOpacity: 0.05,
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
    color: '#007AFF',
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
  location: {
    fontSize: 13,
    color: '#555',
    marginTop: 2,
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
    backgroundColor: '#007AFF',
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
    marginHorizontal: 16,
    marginVertical: 2,
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  transportContent: {
    flex: 1,
  },
  transportTime: {
    fontSize: 11,
    color: '#bbb',
    marginBottom: 1,
  },
  transportTitle: {
    fontSize: 13,
    color: '#aaa',
    fontStyle: 'italic',
  },
  transportNotes: {
    fontSize: 12,
    color: '#bbb',
    marginTop: 2,
    fontStyle: 'italic',
  },
  transportDirBtn: {
    backgroundColor: '#e8e8e8',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    marginLeft: 8,
  },
  transportDirText: {
    color: '#666',
    fontSize: 12,
    fontWeight: '600',
  },
});
