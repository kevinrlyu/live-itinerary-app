import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Modal, StyleSheet, View, Text, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView, SafeAreaProvider } from 'react-native-safe-area-context';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import WalkIcon from './src/components/icons/WalkIcon';
import ReceiptIcon from './src/components/icons/ReceiptIcon';
import { Trip, TripMeta, Activity } from './src/types';
import {
  loadTripFull, saveTripFull,
  loadTripList, saveTripList,
  loadActiveTripId, saveActiveTripId,
  deleteTrip as deleteTripFromStorage,
  migrateOldStorage,
  loadHasSeenWalkthrough, saveHasSeenWalkthrough,
} from './src/utils/storage';
import { createBlankDay, generateActivityId } from './src/utils/tripBuilder';
import { fetchDocText, fetchDocTitle } from './src/utils/googleDocs';
import { parseItineraryText } from './src/utils/parser';
import ImportScreen from './src/screens/ImportScreen';
import CreateTripScreen from './src/screens/CreateTripScreen';
import DayScreen from './src/screens/DayScreen';
import ExpenseSummaryScreen from './src/screens/ExpenseSummaryScreen';
import CulinaryScreen from './src/screens/CulinaryScreen';
import TripHeader from './src/components/TripHeader';
import TripDrawer from './src/components/TripDrawer';
import DayTabBar from './src/components/DayTabBar';
import ExpenseInput, { ExpenseInputTarget } from './src/components/ExpenseInput';
import Walkthrough from './src/components/Walkthrough';
import NewDayDialog from './src/components/NewDayDialog';
import SettingsScreen from './src/screens/SettingsScreen';
import { SettingsProvider, useSettings } from './src/contexts/SettingsContext';

const Tab = createMaterialTopTabNavigator();
const BottomTab = createBottomTabNavigator();

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
  return first === last ? fmt(first) : `${fmt(first)} – ${fmt(last)}`;
}

export default function App() {
  return (
    <SettingsProvider>
      <AppContent />
    </SettingsProvider>
  );
}

function AppContent() {
  const { colors } = useSettings();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [tripList, setTripList] = useState<TripMeta[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showCreateTrip, setShowCreateTrip] = useState(false);
  const [reimportingTripId, setReimportingTripId] = useState<string | null>(null);
  const [reimportProgress, setReimportProgress] = useState('');
  const [expenseTarget, setExpenseTarget] = useState<{ dayDate: string; target: ExpenseInputTarget } | null>(null);
  const [showWalkthrough, setShowWalkthrough] = useState(false);
  const [showNewDayDialog, setShowNewDayDialog] = useState(false);
  const [isEditingActivity, setIsEditingActivity] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [scrollToTopTrigger, setScrollToTopTrigger] = useState(0);

  useEffect(() => {
    (async () => {
      await migrateOldStorage();
      const [list, activeId, seen] = await Promise.all([
        loadTripList(),
        loadActiveTripId(),
        loadHasSeenWalkthrough(),
      ]);
      setTripList(list);
      if (activeId) {
        const active = await loadTripFull(activeId);
        if (active) setTrip(active);
      }
      setLoaded(true);
      if (!seen) setShowWalkthrough(true);
    })();
  }, []);

  const handleCloseWalkthrough = useCallback(() => {
    setShowWalkthrough(false);
    saveHasSeenWalkthrough();
  }, []);

  const handleShowHelp = useCallback(() => {
    setDrawerOpen(false);
    setShowWalkthrough(true);
  }, []);

  const handleShowSettings = useCallback(() => {
    setDrawerOpen(false);
    setShowSettings(true);
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

  const handleReimportTrip = useCallback(async (tripId: string) => {
    const targetTrip = tripId === trip?.id ? trip : await loadTripFull(tripId);
    if (!targetTrip?.docUrl) return;

    setReimportingTripId(tripId);
    setReimportProgress('Fetching document...');
    try {
      const [text, docTitle] = await Promise.all([
        fetchDocText(targetTrip.docUrl),
        fetchDocTitle(targetTrip.docUrl),
      ]);
      setReimportProgress('Starting parse...');
      const updated = await parseItineraryText(text, targetTrip.docUrl, docTitle ?? undefined, setReimportProgress, targetTrip.id);
      // Preserve expenses from old trip
      const oldExpenses: Record<string, { amount: number; currency: string }> = {};
      for (const day of targetTrip.days) {
        for (const a of day.activities) {
          if (a.expense) oldExpenses[a.id] = a.expense;
        }
      }
      // Preserve culinary checked states by region+name
      const oldChecked = new Set<string>();
      for (const region of targetTrip.culinarySpecialties ?? []) {
        for (const item of region.items) {
          if (item.checked) oldChecked.add(`${region.region}::${item.name}`);
        }
      }
      const newCulinary = updated.culinarySpecialties?.map((region) => ({
        ...region,
        items: region.items.map((item) => ({
          ...item,
          checked: oldChecked.has(`${region.region}::${item.name}`),
        })),
      }));

      const refreshed: Trip = {
        ...updated,
        id: targetTrip.id,
        defaultCurrency: targetTrip.defaultCurrency,
        culinarySpecialties: newCulinary || targetTrip.culinarySpecialties,
        days: updated.days.map((day) => ({
          ...day,
          activities: day.activities.map((a) =>
            oldExpenses[a.id] ? { ...a, expense: oldExpenses[a.id] } : a
          ),
        })),
      };
      await saveTripFull(refreshed);
      const newMeta: TripMeta = {
        id: targetTrip.id,
        title: refreshed.title,
        dateRange: buildDateRange(refreshed),
        docUrl: targetTrip.docUrl,
      };
      const newList = tripList.map((t) => t.id === targetTrip.id ? newMeta : t);
      await saveTripList(newList);
      setTripList(newList);
      if (tripId === trip?.id) setTrip(refreshed);
    } catch (err: any) {
      alert(`Re-import failed: ${err.message}`);
    } finally {
      setReimportingTripId(null);
    }
  }, [trip, tripList]);

  const handleOpenExpense = useCallback((dayDate: string, activity: import('./src/types').Activity) => {
    if (!trip) return;
    setExpenseTarget({
      dayDate,
      target: {
        activityId: activity.id,
        activityTitle: activity.title,
        existingExpense: activity.expense ?? null,
        defaultCurrency: trip.defaultCurrency,
      },
    });
  }, [trip]);

  const handleExpenseSave = useCallback((activityId: string, expense: { amount: number; currency: string } | null) => {
    if (!trip || !expenseTarget) return;
    const dayDate = expenseTarget.dayDate;
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
  }, [trip, expenseTarget]);

  const handleSetCurrency = useCallback((currency: string) => {
    if (!trip) return;
    const updated: Trip = { ...trip, defaultCurrency: currency };
    setTrip(updated);
    saveTripFull(updated);
  }, [trip]);

  const handleToggleCulinaryItem = useCallback((regionIndex: number, itemIndex: number) => {
    if (!trip?.culinarySpecialties) return;
    const updated: Trip = {
      ...trip,
      culinarySpecialties: trip.culinarySpecialties.map((region, rIdx) =>
        rIdx !== regionIndex ? region : {
          ...region,
          items: region.items.map((item, iIdx) =>
            iIdx !== itemIndex ? item : { ...item, checked: !item.checked }
          ),
        }
      ),
    };
    setTrip(updated);
    saveTripFull(updated);
  }, [trip]);

  const handleAddCulinaryItem = useCallback((regionIndex: number, name: string) => {
    if (!trip?.culinarySpecialties) return;
    const updated: Trip = {
      ...trip,
      culinarySpecialties: trip.culinarySpecialties.map((region, rIdx) =>
        rIdx !== regionIndex ? region : {
          ...region,
          items: [...region.items, { name, checked: false }],
        }
      ),
    };
    setTrip(updated);
    saveTripFull(updated);
  }, [trip]);

  const handleAddCulinaryRegion = useCallback((regionName: string) => {
    if (!trip) return;
    const newRegion = { region: regionName, items: [] };
    const updated: Trip = {
      ...trip,
      culinarySpecialties: [...(trip.culinarySpecialties ?? []), newRegion],
    };
    setTrip(updated);
    saveTripFull(updated);
  }, [trip]);

  const handleDeleteCulinaryItem = useCallback((regionIndex: number, itemIndex: number) => {
    if (!trip?.culinarySpecialties) return;
    const updated: Trip = {
      ...trip,
      culinarySpecialties: trip.culinarySpecialties.map((region, rIdx) =>
        rIdx !== regionIndex ? region : {
          ...region,
          items: region.items.filter((_, iIdx) => iIdx !== itemIndex),
        }
      ),
    };
    setTrip(updated);
    saveTripFull(updated);
  }, [trip]);

  const handleEditCulinaryItem = useCallback((regionIndex: number, itemIndex: number, name: string) => {
    if (!trip?.culinarySpecialties) return;
    const updated: Trip = {
      ...trip,
      culinarySpecialties: trip.culinarySpecialties.map((region, rIdx) =>
        rIdx !== regionIndex ? region : {
          ...region,
          items: region.items.map((item, iIdx) =>
            iIdx === itemIndex ? { ...item, name } : item
          ),
        }
      ),
    };
    setTrip(updated);
    saveTripFull(updated);
  }, [trip]);

  const handleDeleteCulinaryRegion = useCallback((regionIndex: number) => {
    if (!trip?.culinarySpecialties) return;
    const updated: Trip = {
      ...trip,
      culinarySpecialties: trip.culinarySpecialties.filter((_, rIdx) => rIdx !== regionIndex),
    };
    setTrip(updated);
    saveTripFull(updated);
  }, [trip]);

  const handleCreateTrip = useCallback(async (newTrip: Trip) => {
    await saveTripFull(newTrip);
    await saveActiveTripId(newTrip.id);
    const meta: TripMeta = {
      id: newTrip.id,
      title: newTrip.title,
      dateRange: buildDateRange(newTrip),
      docUrl: '',
    };
    const newList = [...tripList, meta];
    await saveTripList(newList);
    setTripList(newList);
    setTrip(newTrip);
    setShowCreateTrip(false);
    setDrawerOpen(false);
  }, [tripList]);

  const handleUpdateActivity = useCallback((dayDate: string, activity: Activity) => {
    if (!trip) return;
    const updated: Trip = {
      ...trip,
      days: trip.days.map((day) =>
        day.date !== dayDate ? day : {
          ...day,
          activities: day.activities.map((a) =>
            a.id === activity.id ? activity : a
          ),
        }
      ),
    };
    setTrip(updated);
    saveTripFull(updated);
  }, [trip]);

  const handleInsertActivity = useCallback((dayDate: string, afterIndex: number, newActivity: Activity) => {
    if (!trip) return;
    // Generate a proper ID
    const id = generateActivityId(trip);
    const actWithId = { ...newActivity, id };
    const updated: Trip = {
      ...trip,
      days: trip.days.map((day) => {
        if (day.date !== dayDate) return day;
        const activities = [...day.activities];
        activities.splice(afterIndex + 1, 0, actWithId);
        return { ...day, activities };
      }),
    };
    setTrip(updated);
    saveTripFull(updated);
  }, [trip]);

  const handleDeleteActivity = useCallback((dayDate: string, activityId: string) => {
    if (!trip) return;
    const updated: Trip = {
      ...trip,
      days: trip.days.map((day) =>
        day.date !== dayDate ? day : {
          ...day,
          activities: day.activities.filter((a) => a.id !== activityId && a.parentId !== activityId),
        }
      ),
    };
    setTrip(updated);
    saveTripFull(updated);
  }, [trip]);

  const handleUpdateDayTheme = useCallback((dayDate: string, theme: string) => {
    if (!trip) return;
    const updated: Trip = {
      ...trip,
      days: trip.days.map((d) => d.date === dayDate ? { ...d, theme } : d),
    };
    setTrip(updated);
    saveTripFull(updated);
  }, [trip]);

  const handleAddDay = useCallback(() => {
    if (!trip) return;
    setShowNewDayDialog(true);
  }, [trip]);

  const handleConfirmAddDay = useCallback((theme: string) => {
    setShowNewDayDialog(false);
    if (!trip) return;
    const lastDay = trip.days[trip.days.length - 1];
    const lastDate = new Date(`${lastDay.date}T12:00:00`);
    lastDate.setDate(lastDate.getDate() + 1);
    const newDateStr = lastDate.toISOString().split('T')[0];
    const newDay = { ...createBlankDay(newDateStr), theme: theme.trim() };
    const updated: Trip = { ...trip, days: [...trip.days, newDay] };
    setTrip(updated);
    saveTripFull(updated);
    const newMeta: TripMeta = {
      id: trip.id,
      title: trip.title,
      dateRange: buildDateRange(updated),
      docUrl: trip.docUrl,
    };
    const newList = tripList.map((t) => t.id === trip.id ? newMeta : t);
    saveTripList(newList);
    setTripList(newList);
    setTimeout(() => {
      navigationRef.current?.navigate(newDateStr);
    }, 100);
  }, [trip, tripList]);

  const handleReorderTrips = useCallback(async (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;
    const newList = [...tripList];
    const [moved] = newList.splice(fromIndex, 1);
    newList.splice(toIndex, 0, moved);
    setTripList(newList);
    await saveTripList(newList);
  }, [tripList]);

  const navigationRef = useRef<any>(null);
  const [activeBottomTab, setActiveBottomTab] = useState('Itinerary');

  const handleRemoveDay = useCallback((dayDate: string) => {
    if (!trip) return;
    if (trip.days.length <= 1) {
      Alert.alert('Cannot Remove', 'A trip must have at least one day.');
      return;
    }
    // Find the closest day to navigate to after deletion (prefer day before, then after)
    const idx = trip.days.findIndex((d) => d.date === dayDate);
    const fallbackDay = idx > 0 ? trip.days[idx - 1] : trip.days[idx + 1];

    Alert.alert(
      'Remove Day',
      `Remove ${dayDate} and all its activities?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            // Navigate to fallback day before removing
            if (fallbackDay && navigationRef.current) {
              navigationRef.current.navigate(fallbackDay.date);
            }
            const updated: Trip = {
              ...trip,
              days: trip.days.filter((d) => d.date !== dayDate),
            };
            setTrip(updated);
            saveTripFull(updated);
            const newMeta: TripMeta = {
              id: trip.id,
              title: trip.title,
              dateRange: buildDateRange(updated),
              docUrl: trip.docUrl,
            };
            const newList = tripList.map((t) => t.id === trip.id ? newMeta : t);
            saveTripList(newList);
            setTripList(newList);
          },
        },
      ]
    );
  }, [trip, tripList]);

  if (!loaded) return null;

  if (!trip) {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
          {showCreateTrip ? (
            <CreateTripScreen
              defaultCurrency="USD"
              onCreateTrip={handleCreateTrip}
              onCancel={() => setShowCreateTrip(false)}
            />
          ) : (
            <View style={[styles.container, { backgroundColor: colors.background }]}>
              <ImportScreen onImport={handleImport} />
              <TouchableOpacity
                style={styles.createFromEmptyBtn}
                onPress={() => setShowCreateTrip(true)}
              >
                <Text style={[styles.createFromEmptyText, { color: colors.accent }]}>or Create New Itinerary</Text>
              </TouchableOpacity>
            </View>
          )}
          <Walkthrough visible={showWalkthrough} onClose={handleCloseWalkthrough} />
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
        <TripHeader
          title={activeBottomTab === 'Culinary' ? 'Local Cuisine' : activeBottomTab === 'Expenses' ? 'Trip Expenses' : trip.title}
          onOpenDrawer={() => setDrawerOpen(true)}
        />
        <NavigationContainer key={trip.id} ref={navigationRef}>
          <BottomTab.Navigator
            screenOptions={{
              headerShown: false,
              tabBarShowLabel: false,
              tabBarActiveTintColor: colors.accent,
              tabBarInactiveTintColor: colors.textPrimary,
              tabBarStyle: isEditingActivity
                ? { display: 'none' }
                : {
                    backgroundColor: colors.cardBackground,
                    borderTopWidth: StyleSheet.hairlineWidth,
                    borderTopColor: colors.border,
                    paddingTop: 8,
                    overflow: 'visible',
                  },
            }}
            screenListeners={{
              state: (e) => {
                const state = (e as any).data?.state;
                if (state) {
                  setActiveBottomTab(state.routes[state.index].name);
                }
              },
            }}
          >
            <BottomTab.Screen
              name="Itinerary"
              options={{
                tabBarIcon: ({ color, size }) => (
                  <WalkIcon size={size} color={color} />
                ),
              }}
            >
              {() => (
                <Tab.Navigator
                  initialRouteName={getTodayTabName(trip!) as any}
                  tabBar={(props) => {
                    const tabs = trip!.days.map((day) => {
                      const { dayOfWeek, monthDay } = formatDayLabel(day.date);
                      return {
                        key: day.date,
                        dayOfWeek,
                        monthDay,
                        isFocused: props.state.routes[props.state.index]?.name === day.date,
                      };
                    });
                    return (
                      <DayTabBar
                        tabs={tabs}
                        onTabPress={(key) => {
                          const idx = props.state.routes.findIndex((r) => r.name === key);
                          if (idx >= 0) props.navigation.navigate(props.state.routes[idx].name);
                        }}
                        onFocusedTabPress={() => setScrollToTopTrigger((n) => n + 1)}
                        onAddDay={handleAddDay}
                      />
                    );
                  }}
                  screenOptions={{
                    tabBarScrollEnabled: true,
                    tabBarItemStyle: { width: 70 },
                    swipeEnabled: !isEditingActivity,
                  }}
                >
                  {trip!.days.map((day) => (
                    <Tab.Screen
                      key={day.date}
                      name={day.date}
                      children={() => (
                        <DayScreen
                          day={day}
                          onToggle={handleToggle}
                          onOpenExpense={handleOpenExpense}
                          onUpdateActivity={handleUpdateActivity}
                          onInsertActivity={handleInsertActivity}
                          onDeleteActivity={handleDeleteActivity}
                          onRemoveDay={handleRemoveDay}
                          onUpdateDayTheme={handleUpdateDayTheme}
                          onEditingChange={setIsEditingActivity}
                          scrollToTopTrigger={scrollToTopTrigger}
                        />
                      )}
                    />
                  ))}
                </Tab.Navigator>
              )}
            </BottomTab.Screen>
            <BottomTab.Screen
              name="Culinary"
              options={{
                tabBarIcon: ({ color, size }) => (
                  <Ionicons name="restaurant-outline" size={size} color={color} />
                ),
              }}
            >
              {() => (
                <CulinaryScreen
                  regions={trip!.culinarySpecialties ?? []}
                  onToggle={handleToggleCulinaryItem}
                  onAddItem={handleAddCulinaryItem}
                  onEditItem={handleEditCulinaryItem}
                  onAddRegion={handleAddCulinaryRegion}
                  onDeleteItem={handleDeleteCulinaryItem}
                  onDeleteRegion={handleDeleteCulinaryRegion}
                />
              )}
            </BottomTab.Screen>
            <BottomTab.Screen
              name="Expenses"
              options={{
                tabBarIcon: ({ color, size }) => (
                  <ReceiptIcon size={size} color={color} />
                ),
              }}
            >
              {() => (
                <ExpenseSummaryScreen
                  trip={trip!}
                  defaultCurrency={trip!.defaultCurrency}
                  onSetCurrency={handleSetCurrency}
                />
              )}
            </BottomTab.Screen>
          </BottomTab.Navigator>
        </NavigationContainer>

        <TripDrawer
          visible={drawerOpen}
          trips={tripList}
          activeTripId={trip.id}
          onClose={() => setDrawerOpen(false)}
          onSelectTrip={handleSelectTrip}
          onImportNew={() => { setDrawerOpen(false); setShowImport(true); }}
          onCreateNew={() => { setDrawerOpen(false); setShowCreateTrip(true); }}
          onReimportTrip={handleReimportTrip}
          onDeleteTrip={handleDeleteTrip}
          reimportingTripId={reimportingTripId}
          reimportProgress={reimportProgress}
          onReorderTrips={handleReorderTrips}
          onShowHelp={handleShowHelp}
          onShowSettings={handleShowSettings}
        />

        <Modal visible={showImport} animationType="slide">
          <SafeAreaView style={styles.container}>
            <ImportScreen
              onImport={handleImport}
              onCancel={() => setShowImport(false)}
            />
          </SafeAreaView>
        </Modal>

        <Modal visible={showCreateTrip} animationType="slide">
          <SafeAreaProvider>
            <CreateTripScreen
              defaultCurrency={trip?.defaultCurrency || 'USD'}
              onCreateTrip={handleCreateTrip}
              onCancel={() => setShowCreateTrip(false)}
            />
          </SafeAreaProvider>
        </Modal>

        {expenseTarget && (
          <ExpenseInput
            target={expenseTarget.target}
            onSave={handleExpenseSave}
            onClose={() => setExpenseTarget(null)}
          />
        )}

        <Modal visible={showSettings} animationType="slide">
          <SafeAreaProvider>
            <SettingsScreen onClose={() => setShowSettings(false)} />
          </SafeAreaProvider>
        </Modal>

        <Walkthrough visible={showWalkthrough} onClose={handleCloseWalkthrough} />

        <NewDayDialog
          visible={showNewDayDialog}
          onCancel={() => setShowNewDayDialog(false)}
          onAdd={handleConfirmAddDay}
        />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  createFromEmptyBtn: {
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 32,
  },
  createFromEmptyText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#007AFF',
  },
});
