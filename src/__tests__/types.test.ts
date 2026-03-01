import { Activity, Day, Trip } from '../types';

describe('Types', () => {
  it('Activity allows null time and location', () => {
    const activity: Activity = {
      id: '1',
      time: null,
      title: 'Explore Ueno Park',
      location: null,
      notes: null,
      completed: false,
    };
    expect(activity.completed).toBe(false);
  });

  it('Trip contains days with activities', () => {
    const trip: Trip = {
      title: 'Tokyo Trip',
      days: [
        {
          date: '2024-12-10',
          label: 'Wed, Dec 10',
          theme: 'Pre-Arrival',
          activities: [],
        },
      ],
    };
    expect(trip.days).toHaveLength(1);
  });
});
