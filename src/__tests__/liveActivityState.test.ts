import { buildLiveActivityState } from '../utils/liveActivityState';
import { Activity, Day, Trip } from '../types';

const makeActivity = (
  id: string,
  time: string | null,
  timeEnd: string | null = null,
  overrides: Partial<Activity> = {},
): Activity => ({
  id, time, timeEnd, title: `Activity ${id}`,
  location: null, notes: null, completed: false,
  ...overrides,
});

const makeDay = (activities: Activity[]): Day => ({
  date: '2025-12-10', label: 'Day 1', theme: '', activities,
});

const makeTrip = (day: Day): Trip => ({
  id: 't1', docUrl: '', title: 'Tokyo', days: [day], defaultCurrency: 'JPY',
});

const at = (hhmm: string) => new Date(`2025-12-10T${hhmm}:00`);

const build = (activities: Activity[], time: string) => {
  const day = makeDay(activities);
  return buildLiveActivityState(makeTrip(day), day, at(time), '12h');
};

describe('buildLiveActivityState — first-activity lead-in gate', () => {
  it('hides the day\'s first activity more than an hour before it starts', () => {
    const state = build([makeActivity('1', '09:00')], '06:00');
    expect(state.current).toBeNull();
    expect(state.next).toBeNull();
  });

  it('shows the day\'s first activity exactly an hour before it starts', () => {
    const state = build([makeActivity('1', '09:00')], '08:00');
    expect(state.next?.title).toBe('Activity 1');
  });

  it('shows the day\'s first activity within the hour before it starts', () => {
    const state = build([makeActivity('1', '09:00')], '08:15');
    expect(state.next?.title).toBe('Activity 1');
  });

  it('ignores transport when deciding which activity is the day\'s first', () => {
    const activities = [
      makeActivity('t', '07:00', null, { type: 'transport' }),
      makeActivity('1', '09:00'),
    ];
    const state = build(activities, '06:00');
    expect(state.next).toBeNull();
  });
});

describe('buildLiveActivityState — mid-day gaps are not gated', () => {
  it('shows the next activity immediately after an earlier one ends', () => {
    const activities = [
      makeActivity('1', '09:00', '10:00'),
      makeActivity('2', '15:00'),
    ];
    const state = build(activities, '11:00');
    expect(state.current).toBeNull();
    expect(state.next?.title).toBe('Activity 2');
  });

  it('shows the next activity even when the first one was completed early', () => {
    const activities = [
      makeActivity('1', '09:00', '10:00', { completed: true }),
      makeActivity('2', '15:00'),
    ];
    const state = build(activities, '10:30');
    expect(state.next?.title).toBe('Activity 2');
  });
});

describe('buildLiveActivityState — existing behavior is preserved', () => {
  it('still reports next alongside current', () => {
    const activities = [
      makeActivity('1', '09:00', '10:00'),
      makeActivity('2', '12:00'),
    ];
    const state = build(activities, '09:30');
    expect(state.current?.title).toBe('Activity 1');
    expect(state.next?.title).toBe('Activity 2');
  });

  it('reports nothing once the day\'s last activity has ended', () => {
    const activities = [makeActivity('1', '09:00', '10:00')];
    const state = build(activities, '22:00');
    expect(state.current).toBeNull();
    expect(state.next).toBeNull();
  });

  it('formats the time range for the current activity', () => {
    const activities = [makeActivity('1', '09:00', '10:00')];
    const state = build(activities, '09:30');
    expect(state.current?.timeRange).toBe('9:00AM – 10:00AM');
  });

  it('carries the trip title through', () => {
    const state = build([makeActivity('1', '09:00', '10:00')], '09:30');
    expect(state.tripTitle).toBe('Tokyo');
  });
});
