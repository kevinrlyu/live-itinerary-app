import React, { useEffect, useState, useCallback } from 'react';
import { Modal, StyleSheet, View, Text } from 'react-native';
import { SafeAreaView, SafeAreaProvider } from 'react-native-safe-area-context';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { NavigationContainer } from '@react-navigation/native';
import { Trip, TripMeta } from './src/types';
import {
  loadTripFull, saveTripFull,
  loadTripList, saveTripList,
  loadActiveTripId, saveActiveTripId,
  deleteTrip as deleteTripFromStorage,
  migrateOldStorage,
} from './src/utils/storage';
import { fetchDocText, fetchDocTitle } from './src/utils/googleDocs';
import { parseItineraryText } from './src/utils/parser';
import ImportScreen from './src/screens/ImportScreen';
import DayScreen from './src/screens/DayScreen';
import ExpenseSummaryScreen from './src/screens/ExpenseSummaryScreen';
import TripHeader from './src/components/TripHeader';
import TripDrawer from './src/components/TripDrawer';

const Tab = createMaterialTopTabNavigator();

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function formatDayLabel(dateStr: string): { dayOfWeek: string; monthDay: string } {
  const d = new Date(`${dateStr}T12:00:00`);
  return {
    dayOfWeek: DAY_NAMES[d.getDay()],
    monthDay: `${MONTH_NAMES[d.getMonth()]} ${d.getDate()}`,
  };
}

function getTodayTabName(trip: Trip): string {
  const today = new Date().toISOString().split('T')[0];
  const day = trip.days.find((d) => d.date === today) ?? trip.days[0];
  return day?.date ?? '';
}

function buildDateRange(trip: Trip): string {
  if (trip.days.length === 0) return '';
  const first = trip.days[0].date;
  const last = trip.days[trip.days.length - 1].date;
  const fmt = (d: string) => {
    const dt = new Date(`${d}T12:00:00`);
    return `${MONTH_NAMES[dt.getMonth()]} ${dt.getDate()}`;
  };
  return first === last ? fmt(first) : `${fmt(first)}–${fmt(last)}`;
}

export default function App() {
  const [trip, setTrip] = useState<Trip | null>(null);
  const [tripList, setTripList] = useState<TripMeta[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [reimporting, setReimporting] = useState(false);
  const [reimportProgress, setReimportProgress] = useState('');
  const [showExpenses, setShowExpenses] = useState(false);

  useEffect(() => {
    (async () => {
      await migrateOldStorage();
      const [list, activeId] = await Promise.all([loadTripList(), loadActiveTripId()]);
      setTripList(list);
      if (activeId) {
        const active = await loadTripFull(activeId);
        if (active) setTrip(active);
      }
      setLoaded(true);
    })();
  }, []);

  const handleImport = useCallback(async (newTrip: Trip) => {
    setTrip(newTrip);
    const list = await loadTripList();
    setTripList(list);
    setShowImport(false);
    setDrawerOpen(false);
  }, []);

  const handleToggle = useCallback((dayDate: string, activityId: string) => {
    if (!trip) return;
    const updated: Trip = {
      ...trip,
      days: trip.days.map((day) =>
        day.date !== dayDate ? day : {
          ...day,
          activities: day.activities.map((a) =>
            a.id === activityId ? { ...a, completed: !a.completed } : a
          ),
        }
      ),
    };
    setTrip(updated);
    saveTripFull(updated);
  }, [trip]);

  const handleSelectTrip = useCallback(async (id: string) => {
    const selected = await loadTripFull(id);
    if (selected) {
      setTrip(selected);
      await saveActiveTripId(id);
    }
    setDrawerOpen(false);
  }, []);

  const handleDeleteTrip = useCallback(async (id: string) => {
    await deleteTripFromStorage(id);
    const newList = tripList.filter((t) => t.id !== id);
    await saveTripList(newList);
    setTripList(newList);
    if (trip?.id === id) {
      if (newList.length > 0) {
        const next = await loadTripFull(newList[0].id);
        if (next) {
          setTrip(next);
          await saveActiveTripId(newList[0].id);
        }
      } else {
        setTrip(null);
      }
    }
    setDrawerOpen(false);
  }, [trip, tripList]);

  const handleReimport = useCallback(async () => {
    if (!trip?.docUrl) {
      // Legacy trip with no saved URL — open import screen so user can paste it
      setDrawerOpen(false);
      setShowImport(true);
      return;
    }
    setReimporting(true);
    setReimportProgress('Fetching document...');
    try {
      const [text, docTitle] = await Promise.all([
        fetchDocText(trip.docUrl),
        fetchDocTitle(trip.docUrl),
      ]);
      setReimportProgress('Starting parse...');
      const updated = await parseItineraryText(text, trip.docUrl, docTitle ?? undefined, setReimportProgress, trip.id);
      // Preserve expenses from old trip
      const oldExpenses: Record<string, { amount: number; currency: string }> = {};
      for (const day of trip.days) {
        for (const a of day.activities) {
          if (a.expense) oldExpenses[a.id] = a.expense;
        }
      }
      const refreshed: Trip = {
        ...updated,
        id: trip.id,
        defaultCurrency: trip.defaultCurrency,
        days: updated.days.map((day) => ({
          ...day,
          activities: day.activities.map((a) =>
            oldExpenses[a.id] ? { ...a, expense: oldExpenses[a.id] } : a
          ),
        })),
      };
      await saveTripFull(refreshed);
      const newMeta: TripMeta = {
        id: trip.id,
        title: refreshed.title,
        dateRange: buildDateRange(refreshed),
        docUrl: trip.docUrl,
      };
      const newList = tripList.map((t) => t.id === trip.id ? newMeta : t);
      await saveTripList(newList);
      setTripList(newList);
      setTrip(refreshed);
      setDrawerOpen(false);
    } catch (err: any) {
      alert(`Re-import failed: ${err.message}`);
    } finally {
      setReimporting(false);
    }
  }, [trip, tripList]);

  const handleExpense = useCallback((dayDate: string, activityId: string, expense: { amount: number; currency: string } | null) => {
    if (!trip) return;
    const updated: Trip = {
      ...trip,
      days: trip.days.map((day) =>
        day.date !== dayDate ? day : {
          ...day,
          activities: day.activities.map((a) =>
            a.id === activityId ? { ...a, expense } : a
          ),
        }
      ),
    };
    setTrip(updated);
    saveTripFull(updated);
  }, [trip]);

  const handleSetCurrency = useCallback((currency: string) => {
    if (!trip) return;
    const updated: Trip = { ...trip, defaultCurrency: currency };
    setTrip(updated);
    saveTripFull(updated);
  }, [trip]);

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
        <TripHeader title={trip.title} onOpenDrawer={() => setDrawerOpen(true)} />
        <NavigationContainer key={trip.id}>
          <Tab.Navigator
            initialRouteName={getTodayTabName(trip) as any}
            screenOptions={{
              tabBarScrollEnabled: true,
              tabBarItemStyle: { width: 70 },
            }}
          >
            {trip.days.map((day) => {
              const { dayOfWeek, monthDay } = formatDayLabel(day.date);
              return (
                <Tab.Screen
                  key={day.date}
                  name={day.date}
                  children={() => <DayScreen day={day} onToggle={handleToggle} defaultCurrency={trip.defaultCurrency} onExpense={handleExpense} />}
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

        <TripDrawer
          visible={drawerOpen}
          trips={tripList}
          activeTripId={trip.id}
          onClose={() => setDrawerOpen(false)}
          onSelectTrip={handleSelectTrip}
          onImportNew={() => { setDrawerOpen(false); setShowImport(true); }}
          onReimportCurrent={handleReimport}
          onDeleteTrip={handleDeleteTrip}
          reimporting={reimporting}
          reimportProgress={reimportProgress}
          onViewExpenses={() => { setDrawerOpen(false); setShowExpenses(true); }}
          defaultCurrency={trip.defaultCurrency}
          onSetCurrency={handleSetCurrency}
        />

        <Modal visible={showImport} animationType="slide">
          <SafeAreaView style={styles.container}>
            <ImportScreen
              onImport={handleImport}
              onCancel={() => setShowImport(false)}
            />
          </SafeAreaView>
        </Modal>

        <Modal visible={showExpenses} animationType="slide">
          <SafeAreaView style={styles.container}>
            <ExpenseSummaryScreen trip={trip} onClose={() => setShowExpenses(false)} />
          </SafeAreaView>
        </Modal>
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
