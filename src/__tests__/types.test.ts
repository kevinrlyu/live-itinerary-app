import { Activity, Day, Trip, TripMeta } from '../types';

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

  it('Trip contains id, docUrl, and days', () => {
    const trip: Trip = {
      id: 'abc123',
      docUrl: 'https://docs.google.com/document/d/abc/edit',
      title: 'Tokyo Trip',
      defaultCurrency: 'USD',
      days: [
        {
          date: '2025-12-10',
          label: 'Wed, Dec 10',
          theme: 'Pre-Arrival',
          activities: [],
        },
      ],
    };
    expect(trip.id).toBe('abc123');
    expect(trip.days).toHaveLength(1);
  });

  it('TripMeta contains id, title, dateRange, docUrl', () => {
    const meta: TripMeta = {
      id: 'abc123',
      title: 'Tokyo Trip',
      dateRange: 'Dec 10\xe2\x80\x9313',
      docUrl: 'https://docs.google.com/document/d/abc/edit',
    };
    expect(meta.dateRange).toBe('Dec 10\xe2\x80\x9313');
  });
});
