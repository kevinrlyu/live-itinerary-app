import AsyncStorage from '@react-native-async-storage/async-storage';

const WORKER_URL = 'https://trotter-weather.kevin-rl-yu.workers.dev/weather';
const CACHE_PREFIX = 'weather:';
const PAST_TTL = Infinity;
const PRESENT_FUTURE_TTL = 3 * 60 * 60 * 1000; // 3 hours

// WeatherKit condition codes → lowercase display strings
const CONDITION_MAP: Record<string, string> = {
  Clear: 'clear',
  MostlyClear: 'mostly clear',
  PartlyCloudy: 'partly cloudy',
  MostlyCloudy: 'mostly cloudy',
  Cloudy: 'cloudy',
  Drizzle: 'drizzle',
  Rain: 'rain',
  HeavyRain: 'heavy rain',
  Snow: 'snow',
  HeavySnow: 'heavy snow',
  Sleet: 'sleet',
  FreezingRain: 'freezing rain',
  Thunderstorms: 'thunderstorms',
  SevereThunderstorm: 'severe thunderstorm',
  Foggy: 'foggy',
  Haze: 'haze',
  Smoky: 'smoky',
  Breezy: 'breezy',
  Windy: 'windy',
  Blizzard: 'blizzard',
  Flurries: 'flurries',
  ScatteredThunderstorms: 'scattered thunderstorms',
  IsolatedThunderstorms: 'isolated thunderstorms',
  TropicalStorm: 'tropical storm',
  Hurricane: 'hurricane',
  SunShowers: 'sun showers',
  FreezingDrizzle: 'freezing drizzle',
  BlowingSnow: 'blowing snow',
  BlowingDust: 'blowing dust',
  Hot: 'hot',
  Frigid: 'frigid',
  WintryMix: 'wintry mix',
};

export interface DayWeather {
  tempHigh: number; // Celsius
  tempLow: number;  // Celsius
  condition: string; // lowercase display string
  hourly?: HourWeather[];
}

export interface HourWeather {
  hour: number; // 0-23
  temp: number; // Celsius
  condition: string;
}

interface CacheEntry {
  data: DayWeather;
  fetchedAt: number;
}

function cacheKey(lat: number, lng: number, dateStr: string): string {
  // Round coords to 2 decimal places for cache consistency
  return `${CACHE_PREFIX}${lat.toFixed(2)},${lng.toFixed(2)}:${dateStr}`;
}

function isDatePast(dateStr: string): boolean {
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  return dateStr < todayStr;
}

function isDateToday(dateStr: string): boolean {
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  return dateStr === todayStr;
}

function shiftDate(dateStr: string, offset: number): string {
  const d = new Date(dateStr + 'T12:00:00'); // noon to avoid DST edge cases
  d.setDate(d.getDate() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function daysBetween(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + 'T00:00:00');
  return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

async function getCached(key: string, isPast: boolean): Promise<DayWeather | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;
    const entry: CacheEntry = JSON.parse(raw);
    if (isPast) return entry.data; // Never expires for past days
    const age = Date.now() - entry.fetchedAt;
    if (age < PRESENT_FUTURE_TTL) return entry.data;
    return null; // Stale
  } catch {
    return null;
  }
}

async function setCache(key: string, data: DayWeather): Promise<void> {
  try {
    const entry: CacheEntry = { data, fetchedAt: Date.now() };
    await AsyncStorage.setItem(key, JSON.stringify(entry));
  } catch {}
}

/**
 * Fetch weather for a location and date range.
 * Returns a map of dateStr → DayWeather.
 */
export async function fetchWeather(
  lat: number,
  lng: number,
  dates: string[],
): Promise<Record<string, DayWeather>> {
  const result: Record<string, DayWeather> = {};
  const datesToFetch: string[] = [];

  // Check cache first
  for (const dateStr of dates) {
    const days = daysBetween(dateStr);
    if (days > 10) continue; // Beyond forecast range

    const key = cacheKey(lat, lng, dateStr);
    const cached = await getCached(key, isDatePast(dateStr));
    if (cached) {
      result[dateStr] = cached;
    } else {
      datesToFetch.push(dateStr);
    }
  }

  if (datesToFetch.length === 0) return result;

  // Fetch from worker
  const sorted = [...datesToFetch].sort();
  const startDate = sorted[0];
  const endDate = sorted[sorted.length - 1];

  // Widen range by 1 day each side to handle UTC/local timezone misalignment.
  // WeatherKit aligns daily forecasts to local midnight, but the worker sends
  // UTC midnight timestamps — so the returned forecastStart can land in the
  // previous local day. The datesToFetch filter below ensures we only keep
  // the dates we actually requested.
  const fetchStart = shiftDate(startDate, -1);
  const fetchEnd = shiftDate(endDate, 1);

  try {
    const url = `${WORKER_URL}?lat=${lat.toFixed(4)}&lng=${lng.toFixed(4)}&startDate=${fetchStart}&endDate=${fetchEnd}`;
    console.log('[weather] fetching URL:', url);
    const res = await fetch(url);
    console.log('[weather] response status:', res.status);
    if (!res.ok) {
      const body = await res.text();
      console.log('[weather] error body:', body);
      return result;
    }

    const data = await res.json();
    console.log('[weather] response keys:', Object.keys(data));

    // Parse daily forecasts
    const dailyForecasts = data.forecastDaily?.days || [];
    const historyDays = data.weatherHistory?.dailySummary?.days || [];
    const allDays = [...historyDays, ...dailyForecasts];
    console.log('[weather] allDays count:', allDays.length, 'dailyForecasts:', dailyForecasts.length, 'historyDays:', historyDays.length);

    // Parse hourly data
    const hourlyForecasts = data.forecastHourly?.hours || [];
    const historyHours = data.weatherHistory?.hourly?.hours || [];
    const allHours = [...historyHours, ...hourlyForecasts];

    // Group hourly by date
    const hourlyByDate: Record<string, HourWeather[]> = {};
    for (const h of allHours) {
      const dt = new Date(h.forecastStart);
      const ds = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
      if (!hourlyByDate[ds]) hourlyByDate[ds] = [];
      hourlyByDate[ds].push({
        hour: dt.getHours(),
        temp: h.temperature,
        condition: CONDITION_MAP[h.conditionCode] || h.conditionCode?.toLowerCase() || 'unknown',
      });
    }

    for (const day of allDays) {
      const dt = new Date(day.forecastStart);
      const ds = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
      console.log('[weather] day forecastStart:', day.forecastStart, '-> parsed date:', ds, 'looking for:', datesToFetch);

      if (!datesToFetch.includes(ds)) continue;

      const weather: DayWeather = {
        tempHigh: day.temperatureMax,
        tempLow: day.temperatureMin,
        condition: CONDITION_MAP[day.conditionCode] || day.conditionCode?.toLowerCase() || 'unknown',
        hourly: hourlyByDate[ds],
      };

      result[ds] = weather;
      await setCache(cacheKey(lat, lng, ds), weather);
    }
  } catch (err) {
    console.log('[weather] fetch error:', err);
  }

  return result;
}

export function formatTemp(celsius: number, unit: 'C' | 'F'): string {
  if (unit === 'F') {
    return `${Math.round(celsius * 9 / 5 + 32)}°F`;
  }
  return `${Math.round(celsius)}°C`;
}

/**
 * Get the weather condition for a specific time range from hourly data.
 * Falls back to the daily condition if no hourly data.
 */
export function getConditionForTimeRange(
  weather: DayWeather,
  startHour: number | null,
  endHour: number | null,
): { temp: number; condition: string } {
  if (!weather.hourly || startHour === null) {
    return {
      temp: Math.round((weather.tempHigh + weather.tempLow) / 2),
      condition: weather.condition,
    };
  }

  const start = startHour;
  const end = endHour ?? Math.min(start + 3, 23);
  const relevant = weather.hourly.filter((h) => h.hour >= start && h.hour <= end);

  if (relevant.length === 0) {
    return {
      temp: Math.round((weather.tempHigh + weather.tempLow) / 2),
      condition: weather.condition,
    };
  }

  const avgTemp = relevant.reduce((sum, h) => sum + h.temp, 0) / relevant.length;

  // Most common condition in the range
  const condCounts: Record<string, number> = {};
  for (const h of relevant) {
    condCounts[h.condition] = (condCounts[h.condition] || 0) + 1;
  }
  const condition = Object.entries(condCounts).sort((a, b) => b[1] - a[1])[0][0];

  return { temp: Math.round(avgTemp), condition };
}
