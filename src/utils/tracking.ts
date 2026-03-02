import { Activity } from '../types';

export function getCurrentActivityIndex(activities: Activity[], now: Date): number {
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  // Find the last timed, incomplete non-transport activity whose time has passed
  let lastPassedIndex = -1;
  for (let i = 0; i < activities.length; i++) {
    const activity = activities[i];
    if (activity.completed || !activity.time || activity.type === 'transport') continue;
    const [h, m] = activity.time.split(':').map(Number);
    const activityMinutes = h * 60 + m;
    if (activityMinutes <= currentMinutes) {
      lastPassedIndex = i;
    }
  }
  if (lastPassedIndex !== -1) return lastPassedIndex;

  // Fall back to first incomplete non-transport activity
  return activities.findIndex((a) => !a.completed && a.type !== 'transport');
}
