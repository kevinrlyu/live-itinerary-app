import { useState, useEffect } from 'react';
import { Pedometer } from 'expo-sensors';

/**
 * Returns the step count for a given date string (YYYY-MM-DD).
 * For today's date, updates live every 5 seconds.
 * For past dates, fetches once.
 */
export function useStepCount(dateStr: string): number | null {
  const [steps, setSteps] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    let interval: ReturnType<typeof setInterval> | null = null;

    const start = new Date(dateStr + 'T00:00:00');
    const end = new Date(dateStr + 'T23:59:59.999');

    const isToday = (() => {
      const now = new Date();
      return (
        now.getFullYear() === start.getFullYear() &&
        now.getMonth() === start.getMonth() &&
        now.getDate() === start.getDate()
      );
    })();

    const fetch = async () => {
      try {
        const available = await Pedometer.isAvailableAsync();
        if (!available || cancelled) return;
        const result = await Pedometer.getStepCountAsync(start, isToday ? new Date() : end);
        if (!cancelled) setSteps(result.steps);
      } catch {
        // Pedometer not available or permission denied
      }
    };

    fetch();

    if (isToday) {
      interval = setInterval(fetch, 60000);
    }

    return () => {
      cancelled = true;
      if (interval) clearInterval(interval);
    };
  }, [dateStr]);

  return steps;
}
