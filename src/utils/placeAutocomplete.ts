import { Platform } from 'react-native';
import { requireNativeModule } from 'expo-modules-core';

export interface PlaceSuggestion {
  name: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
}

interface NativeMapSearchModule {
  search(query: string, limit: number, biasLat: number | null, biasLng: number | null): Promise<Array<{
    name: string;
    address: string;
    latitude: number | null;
    longitude: number | null;
  }>>;
}

function getNativeModule(): NativeMapSearchModule | null {
  if (Platform.OS !== 'ios') return null;
  try {
    return requireNativeModule<NativeMapSearchModule>('TrotterMapSearch');
  } catch {
    return null;
  }
}

export async function fetchPlaceSuggestions(
  query: string,
  limit: number = 5,
  bias?: { latitude: number; longitude: number },
): Promise<PlaceSuggestion[]> {
  if (query.length < 3) return [];

  const mod = getNativeModule();
  if (!mod) return [];

  try {
    const results = await mod.search(
      query,
      limit,
      bias?.latitude ?? null,
      bias?.longitude ?? null,
    );
    return results;
  } catch {
    return [];
  }
}
