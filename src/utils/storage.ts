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
  return json ? (JSON.parse(json) as Trip) : null;
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
