import AsyncStorage from '@react-native-async-storage/async-storage';

// Live FX conversion via Frankfurter (https://frankfurter.dev).
// ECB-sourced, free, no API key, no rate limits, daily updates.
//
// Coverage is ~30 major currencies. If either side of a conversion is
// outside the supported set we return null and the caller falls back to
// showing per-currency totals without a converted grand sum.

const LATEST_TTL_MS = 24 * 60 * 60 * 1000; // 24h cache for "today's rate"
const HISTORICAL_CACHE_KEY_PREFIX = 'fx_historical_';
const LATEST_CACHE_KEY_PREFIX = 'fx_latest_';

interface FrankfurterResponse {
  amount: number;
  base: string;
  date: string;
  rates: Record<string, number>;
}

interface CachedLatest {
  fetchedAt: number;
  base: string;
  rates: Record<string, number>;
}

/**
 * Currencies supported by Frankfurter. If a trip's default currency or an
 * expense's currency is outside this set, conversion is impossible — caller
 * should skip displaying a converted total.
 */
export const SUPPORTED_CURRENCIES = new Set([
  'AUD', 'BRL', 'CAD', 'CHF', 'CNY', 'CZK', 'DKK', 'EUR', 'GBP', 'HKD',
  'HUF', 'IDR', 'ILS', 'INR', 'ISK', 'JPY', 'KRW', 'MXN', 'MYR', 'NOK',
  'NZD', 'PHP', 'PLN', 'RON', 'SEK', 'SGD', 'THB', 'TRY', 'USD', 'ZAR',
]);

export function isSupported(currency: string): boolean {
  return SUPPORTED_CURRENCIES.has(currency);
}

async function readJsonCache<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

async function writeJsonCache(key: string, value: unknown): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Cache writes are best-effort.
  }
}

/**
 * Fetch the latest published rates relative to the given base currency.
 * Cached in AsyncStorage for 24h. Returns null if the API is unreachable
 * and there's no usable cached value.
 */
export async function getLatestRates(base: string): Promise<Record<string, number> | null> {
  if (!isSupported(base)) return null;
  const cacheKey = `${LATEST_CACHE_KEY_PREFIX}${base}`;
  const cached = await readJsonCache<CachedLatest>(cacheKey);
  const now = Date.now();
  if (cached && cached.base === base && now - cached.fetchedAt < LATEST_TTL_MS) {
    return cached.rates;
  }

  try {
    const resp = await fetch(`https://api.frankfurter.dev/v1/latest?base=${encodeURIComponent(base)}`);
    if (!resp.ok) throw new Error(`Frankfurter latest: HTTP ${resp.status}`);
    const json = (await resp.json()) as FrankfurterResponse;
    // Make `base → base` rate explicit so callers don't special-case it.
    const rates = { ...json.rates, [base]: 1 };
    await writeJsonCache(cacheKey, { fetchedAt: now, base, rates });
    return rates;
  } catch {
    // On network failure, fall back to whatever's cached (even if stale).
    return cached?.rates ?? null;
  }
}

/**
 * Fetch historical rates for a given YYYY-MM-DD date, relative to the given
 * base currency. Frankfurter returns the most recent available weekday rate
 * if `date` falls on a weekend or a holiday. Cached indefinitely (historical
 * rates don't change).
 */
export async function getHistoricalRates(
  date: string,
  base: string
): Promise<Record<string, number> | null> {
  if (!isSupported(base)) return null;
  const cacheKey = `${HISTORICAL_CACHE_KEY_PREFIX}${base}_${date}`;
  const cached = await readJsonCache<Record<string, number>>(cacheKey);
  if (cached) return cached;

  try {
    const resp = await fetch(
      `https://api.frankfurter.dev/v1/${encodeURIComponent(date)}?base=${encodeURIComponent(base)}`
    );
    if (!resp.ok) throw new Error(`Frankfurter historical: HTTP ${resp.status}`);
    const json = (await resp.json()) as FrankfurterResponse;
    const rates = { ...json.rates, [base]: 1 };
    await writeJsonCache(cacheKey, rates);
    return rates;
  } catch {
    return null;
  }
}

/**
 * Convert `amount` from `from` currency to `to` currency using the supplied
 * rates table (which must have been fetched with `to` as the base, so that
 * `rates[from]` gives "1 unit of to = X units of from").
 *
 * Returns null if the rates table is missing the `from` currency.
 */
export function convert(
  amount: number,
  from: string,
  to: string,
  ratesWithToAsBase: Record<string, number>
): number | null {
  if (from === to) return amount;
  const rate = ratesWithToAsBase[from];
  if (!rate || rate === 0) return null;
  return amount / rate;
}

/**
 * For a list of expenses, batch-fetch every distinct historical date's rate
 * table relative to the target base currency. Returns a map keyed by date.
 * Today's rate is always included under the key 'latest'.
 */
export async function getRatesForDates(
  dates: string[],
  base: string
): Promise<{ latest: Record<string, number> | null; historical: Record<string, Record<string, number> | null> }> {
  const uniqueDates = Array.from(new Set(dates));
  const [latest, ...historicalResults] = await Promise.all([
    getLatestRates(base),
    ...uniqueDates.map((d) => getHistoricalRates(d, base)),
  ]);
  const historical: Record<string, Record<string, number> | null> = {};
  uniqueDates.forEach((d, i) => {
    historical[d] = historicalResults[i];
  });
  return { latest, historical };
}
