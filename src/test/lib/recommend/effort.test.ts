/**
 * What to do with each kind of link, and roughly how long it takes.
 */
import { describe, it, expect } from 'vitest';
import { defaultEffort, linkAction } from '@/lib/recommend/effort';
import { LINK_KINDS } from '@/lib/link-kind';

describe('effort', () => {
  it.each([
    ['video', 'watch', 20],
    ['paper', 'read', 40],
    ['page', 'read', 10],
    ['docs', 'read', 15],
    ['repo', 'explore', 15],
    ['exercise', 'solve', 30],
    ['code-change', 'review', 15],
    ['chat', 'resume', 10],
    ['social', 'read', 3],
    ['search', 'searchAgain', 3],
    ['file', 'open', 10],
  ] as const)('%s: %s, ~%i min', (kind, action, minutes) => {
    expect(linkAction(kind)).toBe(action);
    expect(defaultEffort(kind)).toBe(minutes);
  });

  it('covers every kind', () => {
    expect(LINK_KINDS.every((kind) => defaultEffort(kind) > 0)).toBe(true);
  });
});
