import { useState, useEffect } from 'react';
import { Day } from '../types';
import { geocodeLocation, clusterLocations, GeoResult } from '../utils/geocode';
import {
  fetchWeather, getConditionForTimeRange, formatTemp,
  DayWeather,
} from '../utils/weather';

export interface LocationWeather {
  city: string;
  temp: string; // formatted, e.g. "24°C"
  condition: string; // lowercase, e.g. "partly cloudy"
  timeLabel: string | null; // "morning", "afternoon", etc., or null if single location
}

export interface DayWeatherResult {
  locations: LocationWeather[];
  pending: boolean; // true if beyond 10-day forecast range
  loading: boolean;
}

function timeToHour(time: string): number {
  const [h] = time.split(':').map(Number);
  return h;
}

function hourToLabel(hour: number): string {
  if (hour < 6) return 'midnight';
  if (hour < 12) return 'morning';
  if (hour < 18) return 'afternoon';
  return 'evening';
}

function daysBetween(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + 'T00:00:00');
  return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export function useWeather(day: Day, tempUnit: 'C' | 'F'): DayWeatherResult {
  const [result, setResult] = useState<DayWeatherResult>({
    locations: [],
    pending: false,
    loading: true,
  });

  useEffect(() => {
    if (daysBetween(day.date) > 10) {
      setResult({ locations: [], pending: true, loading: false });
      return;
    }

    let cancelled = false;

    async function load() {
      // Collect locations from non-transport activities
      const items: { location: string; time: string | null }[] = [];
      for (const a of day.activities) {
        if (a.type === 'transport' || !a.location) continue;
        items.push({ location: a.location, time: a.time });
      }

      if (items.length === 0) {
        if (!cancelled) setResult({ locations: [], pending: false, loading: false });
        return;
      }

      // Geocode all locations
      const geocoded: { geo: GeoResult; time: string | null }[] = [];
      for (const item of items) {
        const geo = await geocodeLocation(item.location);
        if (geo && !cancelled) {
          geocoded.push({ geo, time: item.time });
        }
      }

      if (cancelled || geocoded.length === 0) {
        if (!cancelled) setResult({ locations: [], pending: false, loading: false });
        return;
      }

      // Cluster by proximity
      const clusters = clusterLocations(geocoded);

      // Fetch weather for each cluster
      const locationWeathers: LocationWeather[] = [];
      const multipleLocations = clusters.length > 1;

      for (const cluster of clusters) {
        const weatherMap = await fetchWeather(cluster.geo.lat, cluster.geo.lng, [day.date]);
        if (cancelled) return;

        const dayWeather = weatherMap[day.date];
        if (!dayWeather) continue;

        const startHour = cluster.startTime ? timeToHour(cluster.startTime) : null;
        // endTime is the last activity's start time, so add 3h buffer for its duration
        const endHour = cluster.endTime
          ? Math.min(timeToHour(cluster.endTime) + 3, 23)
          : null;
        const { temp, condition } = getConditionForTimeRange(dayWeather, startHour, endHour);

        let timeLabel: string | null = null;
        if (multipleLocations && startHour !== null) {
          timeLabel = hourToLabel(startHour);
        }

        locationWeathers.push({
          city: cluster.city,
          temp: formatTemp(temp, tempUnit),
          condition,
          timeLabel,
        });
      }

      if (!cancelled) {
        setResult({ locations: locationWeathers, pending: false, loading: false });
      }
    }

    setResult((prev) => ({ ...prev, loading: true }));
    load();

    return () => { cancelled = true; };
  }, [day.date, day.activities.length, tempUnit]);

  return result;
}
