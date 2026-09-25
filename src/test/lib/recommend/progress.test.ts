/**
 * Numbers of the Focus space.
 */
import { describe, it, expect } from 'vitest';
import { completedByWeek, completedHistory, previousQueue } from '@/lib/recommend/progress';
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
