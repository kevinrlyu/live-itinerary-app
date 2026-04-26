import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_PREFIX = 'geocode:';

export interface GeoResult {
  lat: number;
  lng: number;
  city: string;
}

export async function geocodeLocation(placeName: string): Promise<GeoResult | null> {
  if (!placeName.trim()) return null;

  const cacheKey = CACHE_PREFIX + placeName.toLowerCase().trim();
  try {
    const cached = await AsyncStorage.getItem(cacheKey);
    if (cached) return JSON.parse(cached);
  } catch {}

  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(placeName)}&format=json&limit=1&addressdetails=1`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Trotter/1.0' },
    });
    if (!res.ok) return null;

    const data = await res.json();
    if (!data.length) return null;

    const item = data[0];
    const addr = item.address || {};
    const city = addr.city || addr.town || addr.village || addr.county || addr.state || '';

    const result: GeoResult = {
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon),
      city,
    };

    try {
      await AsyncStorage.setItem(cacheKey, JSON.stringify(result));
    } catch {}

    return result;
  } catch {
    return null;
  }
}

/**
 * Cluster geocoded locations by proximity.
 * Returns one representative per cluster with the time range of its activities.
 */
export function clusterLocations(
  items: { geo: GeoResult; time: string | null }[],
  radiusKm: number = 20,
): { geo: GeoResult; city: string; startTime: string | null; endTime: string | null }[] {
  const clusters: { geo: GeoResult; city: string; times: (string | null)[] }[] = [];

  for (const item of items) {
    let matched = false;
    for (const cluster of clusters) {
      if (haversineKm(cluster.geo.lat, cluster.geo.lng, item.geo.lat, item.geo.lng) < radiusKm) {
        cluster.times.push(item.time);
        matched = true;
        break;
      }
    }
    if (!matched) {
      clusters.push({ geo: item.geo, city: item.geo.city, times: [item.time] });
    }
  }

  return clusters.map((c) => {
    const validTimes = c.times.filter((t): t is string => t !== null).sort();
    return {
      geo: c.geo,
      city: c.city,
      startTime: validTimes[0] || null,
      endTime: validTimes[validTimes.length - 1] || null,
    };
  });
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
