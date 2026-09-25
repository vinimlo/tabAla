/**
 * Local-calendar helpers. The recommender works by day, so a new tab never
 * reshuffles the strip within the same day.
 */
export const DAY_MS = 86_400_000;

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

export function startOfDay(ms: number): number {
  const date = new Date(ms);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

/** Start of the day `days` after the day of `ms` (safe across DST changes). */
export function addDays(ms: number, days: number): number {
  const date = new Date(startOfDay(ms));
  date.setDate(date.getDate() + days);
  return date.getTime();
}

/** Local day as AAAA-MM-DD; sorts as text in date order. */
export function dayKey(ms: number): string {
  const date = new Date(ms);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Calendar days from the day of `from` to the day of `to`. */
export function daysBetween(from: number, to: number): number {
  return Math.round((startOfDay(to) - startOfDay(from)) / DAY_MS);
}

export function tomorrow(now: number): number {
  return addDays(now, 1);
}

/** Start of next Monday; on a Monday, the one a week later. */
export function nextMonday(now: number): number {
  const weekday = new Date(now).getDay(); // 0 = Sunday
  return addDays(now, weekday === 0 ? 1 : 8 - weekday);
}

/** Start of the Monday of the week of `ms`. */
export function weekStart(ms: number): number {
  return addDays(ms, -((new Date(ms).getDay() + 6) % 7));
}

/** ISO 8601 week, e.g. 2026-W39. */
export function isoWeek(ms: number): string {
  const thursday = new Date(addDays(weekStart(ms), 3));
  const year = thursday.getFullYear();
  const firstThursday = new Date(addDays(weekStart(new Date(year, 0, 4).getTime()), 3));
  const week = 1 + Math.round((thursday.getTime() - firstThursday.getTime()) / (7 * DAY_MS));
  return `${year}-W${pad(week)}`;
}

/** Day and month in the browser's locale (25/09, 09/25). */
export function shortDate(ms: number): string {
  return new Date(ms).toLocaleDateString(undefined, { day: '2-digit', month: '2-digit' });
}
