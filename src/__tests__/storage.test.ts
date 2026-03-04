import {
  saveTripFull, loadTripFull, deleteTrip,
  loadTripList, saveTripList,
  loadActiveTripId, saveActiveTripId,
} from '../utils/storage';
import { Trip, TripMeta } from '../types';

let store: Record<string, string> = {};

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    setItem: jest.fn((key: string, value: string) => { store[key] = value; return Promise.resolve(); }),
    getItem: jest.fn((key: string) => Promise.resolve(store[key] ?? null)),
    removeItem: jest.fn((key: string) => { delete store[key]; return Promise.resolve(); }),
  },
}));

const mockTrip: Trip = {
  id: 'trip-1',
  docUrl: 'https://docs.google.com/document/d/abc/edit',
  title: 'Tokyo Trip',
  days: [],
  defaultCurrency: 'USD',
};

const mockMeta: TripMeta = {
  id: 'trip-1',
  title: 'Tokyo Trip',
  dateRange: 'Dec 10–13',
  docUrl: 'https://docs.google.com/document/d/abc/edit',
};

beforeEach(() => { store = {}; });

describe('storage', () => {
  it('saves and loads a full trip by id', async () => {
    await saveTripFull(mockTrip);
    const loaded = await loadTripFull('trip-1');
    expect(loaded?.title).toBe('Tokyo Trip');
    expect(loaded?.id).toBe('trip-1');
  });

  it('returns null when trip id not found', async () => {
    const loaded = await loadTripFull('nonexistent');
    expect(loaded).toBeNull();
  });

  it('deletes a trip by id', async () => {
    await saveTripFull(mockTrip);
    await deleteTrip('trip-1');
    const loaded = await loadTripFull('trip-1');
    expect(loaded).toBeNull();
  });

  it('saves and loads trip list', async () => {
    await saveTripList([mockMeta]);
    const list = await loadTripList();
    expect(list).toHaveLength(1);
    expect(list[0].title).toBe('Tokyo Trip');
  });

  it('saves and loads active trip id', async () => {
    await saveActiveTripId('trip-1');
    const id = await loadActiveTripId();
    expect(id).toBe('trip-1');
  });
});
