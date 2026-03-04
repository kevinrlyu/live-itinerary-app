import { Activity } from '../types';

function toMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

export function getCurrentActivityIndex(activities: Activity[], now: Date): number {
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  // Build a lookup by id for parent checks
  const byId: Record<string, Activity> = {};
  for (const a of activities) byId[a.id] = a;

  // Check if an activity's parent's time range has ended
  function isParentExpired(a: Activity): boolean {
    if (!a.parentId) return false;
    const parent = byId[a.parentId];
    if (!parent || !parent.timeEnd) return false;
    return currentMinutes > toMinutes(parent.timeEnd);
  }

  // Collect timed, non-transport, incomplete activities with their indices
  const timed: { index: number; start: number; end: number | null }[] = [];
  for (let i = 0; i < activities.length; i++) {
    const a = activities[i];
    if (a.completed || !a.time || a.type === 'transport') continue;
    timed.push({
      index: i,
      start: toMinutes(a.time),
      end: a.timeEnd ? toMinutes(a.timeEnd) : null,
    });
  }

  if (timed.length === 0) return -1;

  // Walk backwards through timed activities to find the current one
  for (let t = timed.length - 1; t >= 0; t--) {
    const entry = timed[t];
    if (currentMinutes < entry.start) continue; // haven't reached this one yet

    const activity = activities[entry.index];

    // If this activity's parent has an end time that's passed, skip it
    if (isParentExpired(activity)) return -1;

    // Current time is at or past this activity's start
    if (entry.end !== null) {
      // Has an explicit end time — only highlight if we're still within the range
      if (currentMinutes <= entry.end) return entry.index;
      // Past the end time — don't highlight this one, and don't fall through
      // to earlier activities either (we're between activities or done)
      return -1;
    } else {
      // No end time — highlight until the next timed activity starts
      const next = timed[t + 1];
      if (!next || currentMinutes < next.start) return entry.index;
      // If we're past the next activity's start, the loop will handle it
    }
  }

  // Before the first timed activity — no highlight
  return -1;
}
