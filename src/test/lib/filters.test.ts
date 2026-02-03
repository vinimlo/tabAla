/**
 * Filters module tests.
 */
import { describe, it, expect } from 'vitest';
import type { Link } from '@/lib/types';
import {
  filterLinksByCollection,
  countLinksByCollection,
  getLinkCount,
  ALL_COLLECTIONS_FILTER,
} from '@/lib/filters';

const mockLinks: Link[] = [
  {
    id: 'link-1',
    url: 'https://example1.com',
    title: 'Example 1',
    collectionId: 'inbox',
    createdAt: 1000,
  },
  {
    id: 'link-2',
    url: 'https://example2.com',
    title: 'Example 2',
    collectionId: 'work',
    createdAt: 2000,
  },
  {
    id: 'link-3',
    url: 'https://example3.com',
    title: 'Example 3',
    collectionId: 'inbox',
    createdAt: 3000,
  },
  {
    id: 'link-4',
    url: 'https://example4.com',
    title: 'Example 4',
    collectionId: 'projects',
    createdAt: 4000,
  },
];

describe('filterLinksByCollection', () => {
  it('should return all links when filter is ALL_COLLECTIONS_FILTER', () => {
    const result = filterLinksByCollection(mockLinks, ALL_COLLECTIONS_FILTER);
    expect(result).toHaveLength(4);
    expect(result).toBe(mockLinks);
  });

  it('should return all links when filter is null', () => {
    const result = filterLinksByCollection(mockLinks, null);
    expect(result).toHaveLength(4);
    expect(result).toBe(mockLinks);
  });

  it('should filter links by collection ID', () => {
    const result = filterLinksByCollection(mockLinks, 'inbox');
    expect(result).toHaveLength(2);
    expect(result.every((link) => link.collectionId === 'inbox')).toBe(true);
  });

  it('should return empty array for non-existent collection', () => {
    const result = filterLinksByCollection(mockLinks, 'non-existent');
    expect(result).toHaveLength(0);
  });

  it('should handle empty links array', () => {
    const result = filterLinksByCollection([], 'inbox');
    expect(result).toHaveLength(0);
  });

  it('should cache results for same links reference', () => {
    const result1 = filterLinksByCollection(mockLinks, 'inbox');
    const result2 = filterLinksByCollection(mockLinks, 'inbox');
    expect(result1).toBe(result2);
  });

  it('should invalidate cache when links reference changes', () => {
    const links1 = [...mockLinks];
    const links2 = [...mockLinks];

    const result1 = filterLinksByCollection(links1, 'inbox');
    const result2 = filterLinksByCollection(links2, 'inbox');

    expect(result1).not.toBe(result2);
    expect(result1).toEqual(result2);
  });
});

describe('countLinksByCollection', () => {
  it('should count links per collection', () => {
    const counts = countLinksByCollection(mockLinks);

    expect(counts.get('inbox')).toBe(2);
    expect(counts.get('work')).toBe(1);
    expect(counts.get('projects')).toBe(1);
  });

  it('should handle empty links array', () => {
    const counts = countLinksByCollection([]);
    expect(counts.size).toBe(0);
  });

  it('should return 0 for non-existent collections', () => {
    const counts = countLinksByCollection(mockLinks);
    expect(counts.get('non-existent')).toBeUndefined();
  });
});

describe('getLinkCount', () => {
  it('should return total count for ALL_COLLECTIONS_FILTER', () => {
    const count = getLinkCount(mockLinks, ALL_COLLECTIONS_FILTER);
    expect(count).toBe(4);
  });

  it('should return total count for null', () => {
    const count = getLinkCount(mockLinks, null);
    expect(count).toBe(4);
  });

  it('should return count for specific collection', () => {
    const count = getLinkCount(mockLinks, 'inbox');
    expect(count).toBe(2);
  });

  it('should return 0 for non-existent collection', () => {
    const count = getLinkCount(mockLinks, 'non-existent');
    expect(count).toBe(0);
  });

  it('should return 0 for empty links array', () => {
    const count = getLinkCount([], 'inbox');
    expect(count).toBe(0);
  });
});

describe('performance', () => {
  it('should handle large datasets efficiently', () => {
    const largeLinks: Link[] = Array.from({ length: 1000 }, (_, i) => ({
      id: `link-${i}`,
      url: `https://example${i}.com`,
      title: `Example ${i}`,
      collectionId: i % 10 === 0 ? 'inbox' : `collection-${i % 5}`,
      createdAt: i,
    }));

    const start = performance.now();

    for (let i = 0; i < 100; i++) {
      filterLinksByCollection(largeLinks, 'inbox');
    }

    const elapsed = performance.now() - start;

    expect(elapsed).toBeLessThan(100);
  });
});
