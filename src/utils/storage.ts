import AsyncStorage from '@react-native-async-storage/async-storage';
import { Trip } from '../types';

const TRIP_KEY = 'saved_trip';

export async function saveTrip(trip: Trip): Promise<void> {
  await AsyncStorage.setItem(TRIP_KEY, JSON.stringify(trip));
}

export async function loadTrip(): Promise<Trip | null> {
  const json = await AsyncStorage.getItem(TRIP_KEY);
  return json ? (JSON.parse(json) as Trip) : null;
}

export async function clearTrip(): Promise<void> {
  await AsyncStorage.removeItem(TRIP_KEY);
}
