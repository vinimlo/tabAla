/**
 * Numbers of the Focus space.
 */
import { describe, it, expect } from 'vitest';
import { completedByWeek, completedHistory, completedThisWeek, previousQueue, queueForecast, weekDots, type WeekBar } from '@/lib/recommend/progress';
import { EMPTY_WEEK } from '@/lib/types';
import { createMockLink } from '../../factories';

const now = new Date(2026, 8, 24, 10).getTime();
const links = [
  createMockLink({ id: 'a', completedAt: new Date(2026, 8, 23).getTime() }),
  createMockLink({ id: 'b', completedAt: new Date(2026, 8, 21).getTime() }),
  createMockLink({ id: 'c', completedAt: new Date(2026, 8, 15).getTime() }),
  createMockLink({ id: 'd', completedAt: new Date(2026, 0, 5).getTime() }),
  createMockLink({ id: 'e' }),
];

describe('Focus numbers', () => {
  it('counts completions in each of the last 8 weeks, oldest first', () => {
    const bars = completedByWeek(links, now);

    expect(bars).toHaveLength(8);
    expect(bars.slice(-2)).toEqual([{ week: '2026-W38', completed: 1 }, { week: '2026-W39', completed: 2 }]);
    expect(bars.reduce((total, bar) => total + bar.completed, 0)).toBe(3);
  });

  it('reads the queue size recorded last week', () => {
    expect(previousQueue({ '2026-W38': { ...EMPTY_WEEK, queue: 120 } }, now)).toBe(120);
    expect(previousQueue({}, now)).toBeUndefined();
  });

  it('groups completed links by week, newest first', () => {
    const history = completedHistory(links);

    expect(history.map((group) => [group.week, group.links.map((l) => l.id)])).toEqual([
      ['2026-W39', ['a', 'b']],
      ['2026-W38', ['c']],
      ['2026-W02', ['d']],
    ]);
    expect(history[0].start).toBe(new Date(2026, 8, 21).getTime());
  });
});
describe('weekDots', () => {
  // Thursday, 2026-09-24.
  const now = new Date(2026, 8, 24, 15).getTime();

  it('lists Monday to Sunday, marking the days with a completion and today', () => {
    const links = [
      createMockLink({ id: 'mon', completedAt: new Date(2026, 8, 21, 9).getTime() }),
      createMockLink({ id: 'thu', completedAt: new Date(2026, 8, 24, 8).getTime() }),
      createMockLink({ id: 'last-week', completedAt: new Date(2026, 8, 18, 9).getTime() }),
      createMockLink({ id: 'pending' }),
    ];

    const dots = weekDots(links, now);

    expect(dots.map((dot) => dot.day)).toEqual([
      '2026-09-21', '2026-09-22', '2026-09-23', '2026-09-24', '2026-09-25', '2026-09-26', '2026-09-27',
    ]);
    expect(dots.map((dot) => dot.done)).toEqual([true, false, false, true, false, false, false]);
    expect(dots.map((dot) => dot.today)).toEqual([false, false, false, true, false, false, false]);
  });

  it('counts the completions of this week', () => {
    const links = [
      createMockLink({ id: 'a', completedAt: new Date(2026, 8, 21, 9).getTime() }),
      createMockLink({ id: 'b', completedAt: new Date(2026, 8, 24, 8).getTime() }),
      createMockLink({ id: 'c', completedAt: new Date(2026, 8, 20, 23).getTime() }),
    ];
    expect(completedThisWeek(links, now)).toBe(2);
  });
});
describe('queueForecast', () => {
  const bars = (counts: number[]): WeekBar[] => counts.map((completed, i) => ({ week: `w${i}`, completed }));

  it('uses the pace of the four full weeks before this one', () => {
    expect(queueForecast(bars([9, 9, 9, 2, 4, 6, 4, 1]), 14)).toEqual({ perWeek: 4, weeks: 4 });
  });

  it('says nothing without completions in those weeks', () => {
    expect(queueForecast(bars([5, 0, 0, 0, 0, 3]), 14)).toBeNull();
  });

  it('drops the weeks beyond a year, and knows an empty queue', () => {
    expect(queueForecast(bars([0, 0, 0, 1, 0, 0, 0, 0]), 100)).toEqual({ perWeek: 0.25, weeks: null });
    expect(queueForecast(bars([0, 0, 0, 0, 0]), 0)).toEqual({ perWeek: 0, weeks: 0 });
  });
});
