/**
 * Learned effort: the user's own median time, after 3 completed links.
 */
import { describe, it, expect } from 'vitest';
import { effortEstimator } from '@/lib/recommend/learned';
import { EMPTY_ACTIVITY, type Link, type LinkActivity } from '@/lib/types';
import { createMockLink } from '../../factories';

const MIN = 60_000;
const page = (id: string, collectionId: string, extra: Partial<Link> = {}): Link =>
  createMockLink({ id, url: `https://example.com/${id}`, collectionId, ...extra });
const spent = (minutes: number): LinkActivity => ({ ...EMPTY_ACTIVITY, activeMs: minutes * MIN });

describe('effortEstimator', () => {
  it('uses the default of the kind until there are 3 completed links', () => {
    const links = [page('d1', 'a', { completedAt: 1 }), page('d2', 'a', { completedAt: 1 }), page('next', 'a')];
    const estimate = effortEstimator(links, { d1: spent(30), d2: spent(30) });
    expect(estimate(links[2])).toBe(10);
  });

  it('uses the median of the same collection and kind, rounded to 5 minutes', () => {
    const links = [
      page('d1', 'a', { completedAt: 1 }), page('d2', 'a', { completedAt: 1 }), page('d3', 'a', { completedAt: 1 }), page('next', 'a'),
    ];
    const estimate = effortEstimator(links, { d1: spent(18), d2: spent(33), d3: spent(90) });
    expect(estimate(links[3])).toBe(35);
  });

  it('falls back to the same kind in any collection', () => {
    const links = [
      page('d1', 'b', { completedAt: 1 }), page('d2', 'c', { completedAt: 1 }), page('d3', 'c', { completedAt: 1 }), page('next', 'a'),
    ];
    const estimate = effortEstimator(links, { d1: spent(20), d2: spent(22), d3: spent(40) });
    expect(estimate(links[3])).toBe(20);
  });

  it('never goes below 5 minutes and ignores completions without time', () => {
    const links = [
      page('d1', 'a', { completedAt: 1 }), page('d2', 'a', { completedAt: 1 }), page('d3', 'a', { completedAt: 1 }),
      page('d4', 'a', { completedAt: 1 }), page('next', 'a'),
    ];
    const estimate = effortEstimator(links, { d1: spent(1), d2: spent(1), d3: spent(2) });
    expect(estimate(links[4])).toBe(5);
  });
});
