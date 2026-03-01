import React from 'react';
import { View, Text, TouchableOpacity, Linking, StyleSheet } from 'react-native';
import { Activity } from '../types';

interface Props {
  activity: Activity;
  isCurrent: boolean;
  onToggle: (id: string) => void;
}

export default function ActivityCard({ activity, isCurrent, onToggle }: Props) {
  const openDirections = () => {
    if (!activity.location) return;
    const query = encodeURIComponent(activity.location);
    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${query}`);
  };

  return (
    <View style={[styles.card, isCurrent && styles.currentCard, activity.completed && styles.completedCard]}>
      <View style={styles.row}>
        <TouchableOpacity testID="toggle-button" onPress={() => onToggle(activity.id)} style={styles.checkbox}>
          <Text style={styles.checkboxText}>{activity.completed ? '✓' : '○'}</Text>
        </TouchableOpacity>
        <View style={styles.content}>
          {activity.time && <Text style={styles.time}>{activity.time}</Text>}
          <Text style={[styles.title, activity.completed && styles.completedText]}>{activity.title}</Text>
          {activity.location && <Text style={styles.location}>{activity.location}</Text>}
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
});
