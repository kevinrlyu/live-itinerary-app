/**
 * Date helpers.
 *
 * Trip days are keyed by a plain `YYYY-MM-DD` string and activity times are
 * bare `HH:MM` wall-clock strings, both interpreted in the device's local
 * timezone — an itinerary written as "1pm" means 1pm wherever you happen to
 * be standing. Anything that asks "what is today?" must therefore build the
 * string from local calendar parts.
 *
 * `Date.toISOString()` converts to UTC first, so it reports the wrong day for
 * as many hours as the local zone is offset from UTC (evenings west of UTC,
 * mornings east of it). Use this helper instead.
 */
export function localDateString(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
