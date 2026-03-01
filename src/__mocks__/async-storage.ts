let store: Record<string, string> = {};
export default {
  setItem: jest.fn((key: string, value: string) => { store[key] = value; return Promise.resolve(); }),
  getItem: jest.fn((key: string) => Promise.resolve(store[key] ?? null)),
  removeItem: jest.fn((key: string) => { delete store[key]; return Promise.resolve(); }),
};
