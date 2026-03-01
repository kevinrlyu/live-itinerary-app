import { saveTrip, loadTrip, clearTrip } from '../utils/storage';
import { Trip } from '../types';

jest.mock('@react-native-async-storage/async-storage', () => {
  let store: Record<string, string> = {};
  return {
    __esModule: true,
    default: {
      setItem: jest.fn((key: string, value: string) => { store[key] = value; return Promise.resolve(); }),
      getItem: jest.fn((key: string) => Promise.resolve(store[key] ?? null)),
      removeItem: jest.fn((key: string) => { delete store[key]; return Promise.resolve(); }),
    },
  };
});

const mockTrip: Trip = {
  title: 'Test Trip',
  days: [],
};

describe('storage', () => {
  it('saves and loads a trip', async () => {
    await saveTrip(mockTrip);
    const loaded = await loadTrip();
    expect(loaded?.title).toBe('Test Trip');
  });

  it('returns null when no trip is saved', async () => {
    await clearTrip();
    const loaded = await loadTrip();
    expect(loaded).toBeNull();
  });
});
