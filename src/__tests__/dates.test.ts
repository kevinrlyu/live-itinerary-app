import { localDateString } from '../utils/dates';

describe('localDateString', () => {
  it('formats a date from local calendar parts', () => {
    expect(localDateString(new Date('2025-12-10T13:00:00'))).toBe('2025-12-10');
  });

  it('zero-pads single-digit months and days', () => {
    expect(localDateString(new Date('2025-01-05T13:00:00'))).toBe('2025-01-05');
  });

  it('reports the local day late in the evening, not the UTC day', () => {
    // 8pm local. West of UTC this is already "tomorrow" in UTC, which is the
    // bug that made the app open on the wrong day tab.
    const evening = new Date(2025, 11, 10, 20, 0, 0);
    expect(localDateString(evening)).toBe('2025-12-10');
  });

  it('reports the local day early in the morning, not the UTC day', () => {
    // 6am local. East of UTC this is still "yesterday" in UTC.
    const morning = new Date(2025, 11, 10, 6, 0, 0);
    expect(localDateString(morning)).toBe('2025-12-10');
  });

  it('stays on the local day at both midnight boundaries', () => {
    expect(localDateString(new Date(2025, 11, 10, 0, 0, 0))).toBe('2025-12-10');
    expect(localDateString(new Date(2025, 11, 10, 23, 59, 0))).toBe('2025-12-10');
  });
});
