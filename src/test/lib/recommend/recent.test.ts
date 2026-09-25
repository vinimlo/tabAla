import { describe, it, expect } from 'vitest';
import { recentlyOpened } from '@/lib/recommend/recent';
import { EMPTY_ACTIVITY, type LinkActivity } from '@/lib/types';
import { createMockLink } from '../../factories';

const opened = (at: number): LinkActivity => ({ ...EMPTY_ACTIVITY, opens: 1, lastOpenedAt: at });

describe('recentlyOpened', () => {
  const links = ['a', 'b', 'c', 'd'].map((id) => createMockLink({ id }));
  const activity = { a: opened(1), b: opened(3), c: opened(2) };

  it('lists pending opened links, newest first', () => {
    expect(recentlyOpened(links, activity, new Set()).map((link) => link.id)).toEqual(['b', 'c', 'a']);
  });

  it('skips completed links, the excluded ones and caps the list', () => {
    const done = links.map((link) => (link.id === 'b' ? { ...link, completedAt: 5 } : link));
    expect(recentlyOpened(done, activity, new Set(['c']), 1).map((link) => link.id)).toEqual(['a']);
  });
});
