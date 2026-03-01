import React, { useEffect, useState, useCallback } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, SafeAreaProvider } from 'react-native-safe-area-context';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { NavigationContainer } from '@react-navigation/native';
import { Trip } from './src/types';
import { loadTrip, saveTrip } from './src/utils/storage';
import ImportScreen from './src/screens/ImportScreen';
import DayScreen from './src/screens/DayScreen';

const Tab = createMaterialTopTabNavigator();

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatDayLabel(dateStr: string): { dayOfWeek: string; monthDay: string } {
  // Parse as local date (append T12:00:00 to avoid timezone shifting the date)
  const d = new Date(`${dateStr}T12:00:00`);
  return {
    dayOfWeek: DAY_NAMES[d.getDay()],
    monthDay: `${MONTH_NAMES[d.getMonth()]} ${d.getDate()}`,
  };
}

function getTodayTabName(trip: Trip): string {
  const today = new Date().toISOString().split('T')[0];
  const day = trip.days.find((d) => d.date === today) ?? trip.days[0];
  return day.date;
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
      <SafeAreaProvider>
        <SafeAreaView style={styles.container}>
          <ImportScreen onImport={handleImport} />
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container}>
        <NavigationContainer>
          <Tab.Navigator initialRouteName={getTodayTabName(trip)}>
            {trip.days.map((day) => {
              const { dayOfWeek, monthDay } = formatDayLabel(day.date);
              return (
                <Tab.Screen
                  key={day.date}
                  name={day.date}
                  children={() => <DayScreen day={day} onToggle={handleToggle} />}
                  options={{
                    tabBarLabel: () => (
                      <View style={styles.tabLabel}>
                        <Text style={styles.tabDayOfWeek}>{dayOfWeek}</Text>
                        <Text style={styles.tabMonthDay}>{monthDay}</Text>
                      </View>
                    ),
                  }}
                />
              );
            })}
          </Tab.Navigator>
        </NavigationContainer>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  tabLabel: { alignItems: 'center' },
  tabDayOfWeek: { fontSize: 13, fontWeight: '700', color: '#1a1a1a' },
  tabMonthDay: { fontSize: 11, color: '#555', marginTop: 1 },
});
