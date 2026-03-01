import React, { useEffect, useState, useCallback } from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { NavigationContainer } from '@react-navigation/native';
import { Trip } from './src/types';
import { loadTrip, saveTrip } from './src/utils/storage';
import ImportScreen from './src/screens/ImportScreen';
import DayScreen from './src/screens/DayScreen';

const Tab = createMaterialTopTabNavigator();

function getTodayTabIndex(trip: Trip): number {
  const today = new Date().toISOString().split('T')[0];
  const idx = trip.days.findIndex((d) => d.date === today);
  return idx >= 0 ? idx : 0;
}

export default function App() {
  const [trip, setTrip] = useState<Trip | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    loadTrip().then((saved) => {
      if (saved) setTrip(saved);
      setLoaded(true);
    });
  }, []);

  const handleImport = (newTrip: Trip) => setTrip(newTrip);

  const handleToggle = useCallback(
    (activityId: string) => {
      if (!trip) return;
      const updated: Trip = {
        ...trip,
        days: trip.days.map((day) => ({
          ...day,
          activities: day.activities.map((a) =>
            a.id === activityId ? { ...a, completed: !a.completed } : a
          ),
        })),
      };
      setTrip(updated);
      saveTrip(updated);
    },
    [trip]
  );

  if (!loaded) return null;

  if (!trip) {
    return (
      <SafeAreaView style={styles.container}>
        <ImportScreen onImport={handleImport} />
      </SafeAreaView>
    );
  }

  const initialTab = getTodayTabIndex(trip);

  return (
    <SafeAreaView style={styles.container}>
      <NavigationContainer>
        <Tab.Navigator initialRouteName={trip.days[initialTab]?.label ?? trip.days[0]?.label}>
          {trip.days.map((day) => (
            <Tab.Screen
              key={day.date}
              name={day.label}
              children={() => <DayScreen day={day} onToggle={handleToggle} />}
            />
          ))}
        </Tab.Navigator>
      </NavigationContainer>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
});
