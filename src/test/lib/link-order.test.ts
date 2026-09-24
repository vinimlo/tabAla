/**
 * Manual link order inside a collection.
 */
import { describe, it, expect } from 'vitest';
import { applyLinkOrder, sortCollectionLinks } from '@/lib/link-order';
import { createMockLink } from '../factories';

const ids = (links: { id: string }[]): string[] => links.map((l) => l.id);

describe('sortCollectionLinks', () => {
  it('keeps new links (no position) on top, newest first, then positioned links in order', () => {
    const links = [
      createMockLink({ id: 'placed-2', order: 2, createdAt: 900 }),
      createMockLink({ id: 'old-new', createdAt: 100 }),
      createMockLink({ id: 'placed-0', order: 0, createdAt: 50 }),
      createMockLink({ id: 'newest', createdAt: 500 }),
      createMockLink({ id: 'placed-1', order: 1, createdAt: 999 }),
    ];

    expect(ids(sortCollectionLinks(links))).toEqual(['newest', 'old-new', 'placed-0', 'placed-1', 'placed-2']);
  });
});

describe('applyLinkOrder', () => {
  const a = createMockLink({ id: 'a', collectionId: 'col', createdAt: 3 });
  const b = createMockLink({ id: 'b', collectionId: 'col', createdAt: 2 });
  const c = createMockLink({ id: 'c', collectionId: 'col', createdAt: 1 });
  const other = createMockLink({ id: 'x', collectionId: 'elsewhere', createdAt: 4 });

  it('positions the listed links in the given order', () => {
    const result = applyLinkOrder([a, b, c, other], 'col', ['c', 'a', 'b']);

    expect(ids(sortCollectionLinks(result.filter((l) => l.collectionId === 'col')))).toEqual(['c', 'a', 'b']);
  });

  it('brings a link dropped from another collection into this one at its drop position', () => {
    const result = applyLinkOrder([a, b, other], 'col', ['a', 'x', 'b']);

    const col = sortCollectionLinks(result.filter((l) => l.collectionId === 'col'));
    expect(ids(col)).toEqual(['a', 'x', 'b']);
  });

  it('keeps links hidden by a search after the listed ones, in their previous order', () => {
    const result = applyLinkOrder([a, b, c], 'col', ['c']);

    expect(ids(sortCollectionLinks(result))).toEqual(['c', 'a', 'b']);
  });

  it('leaves links of other collections untouched', () => {
    const result = applyLinkOrder([a, b, other], 'col', ['b', 'a']);

    expect(result.find((l) => l.id === 'x')).toEqual(other);
  });
});
