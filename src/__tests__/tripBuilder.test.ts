import { createBlankTrip } from '../utils/tripBuilder';

describe('createBlankTrip', () => {
  it('generates one day per date in the range, inclusive', () => {
    const trip = createBlankTrip('Tokyo', '2025-12-10', '2025-12-13', 'JPY');
    expect(trip.days.map((d) => d.date)).toEqual([
      '2025-12-10', '2025-12-11', '2025-12-12', '2025-12-13',
    ]);
  });

  it('handles a single-day trip', () => {
    const trip = createBlankTrip('Day trip', '2025-12-10', '2025-12-10', 'USD');
    expect(trip.days.map((d) => d.date)).toEqual(['2025-12-10']);
  });

  it('spans a month boundary', () => {
    const trip = createBlankTrip('NYE', '2025-12-30', '2026-01-02', 'USD');
    expect(trip.days.map((d) => d.date)).toEqual([
      '2025-12-30', '2025-12-31', '2026-01-01', '2026-01-02',
    ]);
  });

  it('carries the requested title and currency', () => {
    const trip = createBlankTrip('Tokyo', '2025-12-10', '2025-12-10', 'JPY');
    expect(trip.title).toBe('Tokyo');
    expect(trip.defaultCurrency).toBe('JPY');
  });
});
