/**
 * Calendar helpers: everything the recommender does is by local day.
 */
import { describe, it, expect } from 'vitest';
import {
  addDays, dayKey, daysBetween, isoWeek, nextMonday, shortDate, startOfDay, tomorrow, weekStart,
} from '@/lib/recommend/dates';

const at = (year: number, month: number, day: number, hour = 10): number => new Date(year, month - 1, day, hour).getTime();

describe('dates', () => {
  it('keys a local day as AAAA-MM-DD, which sorts in date order', () => {
    expect(dayKey(at(2026, 9, 4, 23))).toBe('2026-09-04');
  });

  it('counts calendar days, not 24-hour spans', () => {
    expect(daysBetween(at(2026, 9, 23, 23), at(2026, 9, 24, 1))).toBe(1);
    expect(daysBetween(at(2026, 9, 24, 1), at(2026, 9, 24, 23))).toBe(0);
  });

  it('adds days from the start of the day', () => {
    expect(addDays(at(2026, 9, 24, 15), -60)).toBe(new Date(2026, 6, 26).getTime());
    expect(startOfDay(at(2026, 9, 24, 15))).toBe(new Date(2026, 8, 24).getTime());
  });

  it('snoozing until tomorrow means the start of the next day', () => {
    expect(tomorrow(at(2026, 9, 24, 22))).toBe(new Date(2026, 8, 25).getTime());
  });

  it.each([
    [at(2026, 9, 21), new Date(2026, 8, 28)],
    [at(2026, 9, 24), new Date(2026, 8, 28)],
    [at(2026, 9, 27), new Date(2026, 8, 28)],
  ])('next week starts on the next Monday (%#)', (now, expected) => {
    expect(nextMonday(now)).toBe(expected.getTime());
  });

  it('finds the Monday a week starts on', () => {
    expect(weekStart(at(2026, 9, 24))).toBe(new Date(2026, 8, 21).getTime());
    expect(weekStart(at(2026, 9, 27))).toBe(new Date(2026, 8, 21).getTime());
  });

  it.each([
    [at(2026, 9, 24), '2026-W39'],
    [at(2026, 1, 1), '2026-W01'],
    [at(2026, 12, 28), '2026-W53'],
    [at(2027, 1, 1), '2026-W53'],
    [at(2027, 1, 4), '2027-W01'],
  ])('ISO week of %s is %s', (ms, week) => {
    expect(isoWeek(ms)).toBe(week);
  });

  it('writes a short day and month', () => {
    const text = shortDate(at(2026, 9, 25));
    expect(text).toContain('25');
    expect(text).toContain('09');
  });
});
