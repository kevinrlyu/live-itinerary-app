// Derives the Live Activity snapshot ("what's happening now" + "what's next")
// from a trip day and the current time.
//
// Kept free of react-native / expo imports so it stays a pure, testable unit —
// the native bridge lives in liveActivity.ts.

import { Activity, Day, Trip } from '../types';
import { getCurrentActivityIndex } from './tracking';

/** How long before the day's first activity the Live Activity may appear. */
const FIRST_ACTIVITY_LEAD_IN_MINUTES = 60;

/**
 * Snapshot of "what's happening now" + "what's next" for the active trip.
 * Mirrors what the Dynamic Island compact + expanded views render.
 */
export interface LiveActivityState {
  tripTitle: string;
  // Current activity (may be null if there's no scheduled activity for now)
  current: {
    title: string;
    location: string | null;
    startTime: string | null;     // formatted per user pref
    endTime: string | null;       // formatted per user pref
    timeRange: string | null;     // e.g. "6:00pm - 7:00pm"
    category: 'hotel' | 'meal' | null;
    isTransport: boolean;
  } | null;
  // Next upcoming activity — what fills the trailing slot when nothing is "now"
  next: {
    title: string;
    startTime: string | null;
  } | null;
}

function toMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

export function formatTimeForLA(
  time: string | null | undefined,
  format: '12h' | '24h',
): string | null {
  if (!time) return null;
  if (format === '24h') return time;
  const [hStr, mStr] = time.split(':');
  let h = parseInt(hStr, 10);
  const m = mStr || '00';
  const suffix = h >= 12 ? 'PM' : 'AM';
  if (h === 0) h = 12;
  else if (h > 12) h -= 12;
  return `${h}:${m}${suffix}`;
}

export function buildLiveActivityState(
  trip: Trip,
  day: Day,
  now: Date,
  timeFormat: '12h' | '24h',
): LiveActivityState {
  const idx = getCurrentActivityIndex(day.activities, now);
  const current = idx >= 0 ? day.activities[idx] : null;
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  let next: Activity | null = null;
  for (let i = idx >= 0 ? idx + 1 : 0; i < day.activities.length; i++) {
    const a = day.activities[i];
    if (a.completed || !a.time || a.type === 'transport') continue;
    if (toMinutes(a.time) <= currentMinutes) continue;
    next = a;
    break;
  }

  // Before the day has started, don't surface anything until the first activity
  // is within the lead-in window — otherwise the card sits on the lock screen
  // all night. Only the day's first activity is gated; once the day is under
  // way, gaps between activities surface the next one immediately.
  if (!current && next && next.time) {
    const firstOfDay = day.activities.find((a) => a.time && a.type !== 'transport');
    const dayHasNotStarted = firstOfDay?.id === next.id;
    if (dayHasNotStarted && toMinutes(next.time) - currentMinutes > FIRST_ACTIVITY_LEAD_IN_MINUTES) {
      next = null;
    }
  }

  return {
    tripTitle: trip.title,
    current: current
      ? {
          title: current.title,
          location: current.location ?? null,
          startTime: formatTimeForLA(current.time, timeFormat),
          endTime: formatTimeForLA(current.timeEnd, timeFormat),
          timeRange: current.time
            ? current.timeEnd
              ? `${formatTimeForLA(current.time, timeFormat)} – ${formatTimeForLA(current.timeEnd, timeFormat)}`
              : formatTimeForLA(current.time, timeFormat)
            : null,
          category: current.category ?? null,
          isTransport: current.type === 'transport',
        }
      : null,
    next: next
      ? { title: next.title, startTime: formatTimeForLA(next.time, timeFormat) }
      : null,
  };
}
