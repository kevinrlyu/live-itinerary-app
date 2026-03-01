import { getCurrentActivityIndex } from '../utils/tracking';
import { Activity } from '../types';

const makeActivity = (id: string, time: string | null, completed = false): Activity => ({
  id, time, title: `Activity ${id}`, location: null, notes: null, completed,
});

describe('getCurrentActivityIndex', () => {
  it('returns index of last incomplete timed activity whose time has passed', () => {
    const now = new Date('2024-12-10T10:30:00');
    const activities = [
      makeActivity('1', '09:00'),  // past
      makeActivity('2', '10:00'),  // past — this is "current" (last passed)
      makeActivity('3', '12:00'),  // future
    ];
    expect(getCurrentActivityIndex(activities, now)).toBe(1);
  });

  it('returns first incomplete untimed activity when nothing matches by time', () => {
    const now = new Date('2024-12-10T10:30:00');
    const activities = [
      makeActivity('1', null, true),   // completed
      makeActivity('2', null, false),  // first incomplete — returned
      makeActivity('3', null, false),
    ];
    expect(getCurrentActivityIndex(activities, now)).toBe(1);
  });

  it('returns -1 when all activities are completed', () => {
    const now = new Date();
    const activities = [
      makeActivity('1', '09:00', true),
      makeActivity('2', '10:00', true),
    ];
    expect(getCurrentActivityIndex(activities, now)).toBe(-1);
  });
});
