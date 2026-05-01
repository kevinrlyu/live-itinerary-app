import AsyncStorage from '@react-native-async-storage/async-storage';
import { Trip, TripMeta } from '../types';

const TRIP_LIST_KEY = 'trip_list';
const ACTIVE_TRIP_KEY = 'active_trip_id';
const API_KEY_KEY = 'anthropic_api_key';
const WALKTHROUGH_SEEN_KEY = 'has_seen_walkthrough';
const SETTINGS_KEY = 'app_settings';
const tripKey = (id: string) => `trip_${id}`;

export async function saveTripFull(trip: Trip): Promise<void> {
  await AsyncStorage.setItem(tripKey(trip.id), JSON.stringify(trip));
}

export async function loadTripFull(id: string): Promise<Trip | null> {
  const json = await AsyncStorage.getItem(tripKey(id));
  if (!json) return null;
  const trip = JSON.parse(json) as Trip;
  if (!trip.defaultCurrency) trip.defaultCurrency = 'USD';
  // Migrate old culinarySpecialties → checklists
  const raw = trip as any;
  if (raw.culinarySpecialties && !trip.checklists) {
    trip.checklists = raw.culinarySpecialties;
    delete raw.culinarySpecialties;
  }
  // Sanitize checklist data — filter out items with missing names, migrate region → title
  if (trip.checklists) {
    trip.checklists = trip.checklists.map((group: any) => ({
      title: group.title || group.region || 'General',
      items: (group.items || []).filter((item: any) => item && item.name),
    }));
  }
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

export async function loadApiKey(): Promise<string | null> {
  return AsyncStorage.getItem(API_KEY_KEY);
}

export async function saveApiKey(key: string): Promise<void> {
  if (key) {
    await AsyncStorage.setItem(API_KEY_KEY, key);
  } else {
    await AsyncStorage.removeItem(API_KEY_KEY);
  }
}

const providerApiKeyKey = (providerId: string) => `api_key_${providerId}`;

export async function loadProviderApiKey(providerId: string): Promise<string | null> {
  // Migrate: if requesting anthropic key, fall back to old key
  const key = await AsyncStorage.getItem(providerApiKeyKey(providerId));
  if (key) return key;
  if (providerId === 'anthropic') return loadApiKey();
  return null;
}

export async function saveProviderApiKey(providerId: string, key: string): Promise<void> {
  if (key) {
    await AsyncStorage.setItem(providerApiKeyKey(providerId), key);
    // Keep old key in sync for anthropic
    if (providerId === 'anthropic') await AsyncStorage.setItem(API_KEY_KEY, key);
  } else {
    await AsyncStorage.removeItem(providerApiKeyKey(providerId));
    if (providerId === 'anthropic') await AsyncStorage.removeItem(API_KEY_KEY);
  }
}

const LLM_CONFIG_KEY = 'last_llm_config';

export async function loadLastLLMConfig(): Promise<{ providerId: string; model: string } | null> {
  const json = await AsyncStorage.getItem(LLM_CONFIG_KEY);
  return json ? JSON.parse(json) : null;
}

export async function saveLastLLMConfig(providerId: string, model: string): Promise<void> {
  await AsyncStorage.setItem(LLM_CONFIG_KEY, JSON.stringify({ providerId, model }));
}

export async function loadHasSeenWalkthrough(): Promise<boolean> {
  const v = await AsyncStorage.getItem(WALKTHROUGH_SEEN_KEY);
  return v === '1';
}

export async function saveHasSeenWalkthrough(): Promise<void> {
  await AsyncStorage.setItem(WALKTHROUGH_SEEN_KEY, '1');
}

export async function loadSettings(): Promise<Record<string, any> | null> {
  const json = await AsyncStorage.getItem(SETTINGS_KEY);
  return json ? JSON.parse(json) : null;
}

export async function saveSettings(settings: Record<string, any>): Promise<void> {
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
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
  return first === last ? fmt(first) : `${fmt(first)} – ${fmt(last)}`;
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
