import { Trip, Day, Activity } from '../types';

export function createBlankActivity(id: string): Activity {
  return {
    id,
    type: 'activity',
    category: null,
    time: null,
    timeEnd: null,
    title: '',
    location: null,
    description: null,
    hours: null,
    notes: null,
    completed: false,
    parentId: null,
    expense: null,
  };
}

export function createBlankDay(dateStr: string): Day {
  const d = new Date(`${dateStr}T12:00:00`);
  const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const DAY_NAMES = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  return {
    date: dateStr,
    label: `${DAY_NAMES[d.getDay()]}, ${MONTH_NAMES[d.getMonth()]} ${d.getDate()}`,
    theme: '',
    activities: [],
  };
}

export function generateActivityId(trip: Trip): string {
  let maxN = 0;
  for (const day of trip.days) {
    for (const a of day.activities) {
      const match = a.id.match(/^a(\d+)$/);
      if (match) {
        const n = parseInt(match[1], 10);
        if (n > maxN) maxN = n;
      }
    }
  }
  return `a${maxN + 1}`;
}

export function createBlankTrip(title: string, startDate: string, endDate: string, currency: string): Trip {
  const days: Day[] = [];
  const current = new Date(`${startDate}T12:00:00`);
  const end = new Date(`${endDate}T12:00:00`);

  while (current <= end) {
    const dateStr = current.toISOString().split('T')[0];
    days.push(createBlankDay(dateStr));
    current.setDate(current.getDate() + 1);
  }

  return {
    id: `trip_${Date.now()}`,
    docUrl: '',
    title,
    days,
    defaultCurrency: currency,
  };
}
