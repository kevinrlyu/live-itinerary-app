import AsyncStorage from '@react-native-async-storage/async-storage';
import { Trip, TripMeta } from '../types';

const TRIP_LIST_KEY = 'trip_list';
const ACTIVE_TRIP_KEY = 'active_trip_id';
const tripKey = (id: string) => `trip_${id}`;

export async function saveTripFull(trip: Trip): Promise<void> {
  await AsyncStorage.setItem(tripKey(trip.id), JSON.stringify(trip));
}

export async function loadTripFull(id: string): Promise<Trip | null> {
  const json = await AsyncStorage.getItem(tripKey(id));
  if (!json) return null;
  const trip = JSON.parse(json) as Trip;
  if (!trip.defaultCurrency) trip.defaultCurrency = 'USD';
  return trip;
}

export async function deleteTrip(id: string): Promise<void> {
  await AsyncStorage.removeItem(tripKey(id));
}

export async function loadTripList(): Promise<TripMeta[]> {
  const json = await AsyncStorage.getItem(TRIP_LIST_KEY);
  return json ? (JSON.parse(json) as TripMeta[]) : [];
}

export async function saveTripList(list: TripMeta[]): Promise<void> {
  await AsyncStorage.setItem(TRIP_LIST_KEY, JSON.stringify(list));
}

export async function loadActiveTripId(): Promise<string | null> {
  return AsyncStorage.getItem(ACTIVE_TRIP_KEY);
}

export async function saveActiveTripId(id: string): Promise<void> {
  await AsyncStorage.setItem(ACTIVE_TRIP_KEY, id);
}

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function buildMigrationDateRange(days: any[]): string {
  if (!days || days.length === 0) return '';
  const first = days[0].date;
  const last = days[days.length - 1].date;
  const fmt = (d: string) => {
    const dt = new Date(`${d}T12:00:00`);
    return `${MONTHS[dt.getMonth()]} ${dt.getDate()}`;
  };
  return first === last ? fmt(first) : `${fmt(first)}–${fmt(last)}`;
}

export async function migrateOldStorage(): Promise<void> {
  // Don't migrate if new storage already has data
  const alreadyMigrated = await loadActiveTripId();
  if (alreadyMigrated) return;

  const oldJson = await AsyncStorage.getItem('saved_trip');
  if (!oldJson) return;

  const oldTrip = JSON.parse(oldJson);
  const id = `trip_${Date.now()}`;
  const trip: Trip = {
    id,
    docUrl: oldTrip.docUrl ?? '',
    title: oldTrip.title ?? 'My Trip',
    days: oldTrip.days ?? [],
    defaultCurrency: 'USD',
  };

  await saveTripFull(trip);
  const meta: TripMeta = {
    id,
    title: trip.title,
    dateRange: buildMigrationDateRange(trip.days),
    docUrl: trip.docUrl,
  };
  await saveTripList([meta]);
  await saveActiveTripId(id);
  await AsyncStorage.removeItem('saved_trip');
}
