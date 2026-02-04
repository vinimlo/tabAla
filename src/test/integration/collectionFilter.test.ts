/**
 * Collection filter integration tests.
 * Tests the complete filtering flow from selection to display.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { get } from 'svelte/store';
import type { Link, Collection } from '@/lib/types';
import { INBOX_COLLECTION_ID } from '@/lib/types';

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

vi.mock('@/lib/storage', () => ({
  getLinks: vi.fn(() => Promise.resolve([])),
  saveLinks: vi.fn(() => Promise.resolve()),
  getCollections: vi.fn(() => Promise.resolve([])),
  saveCollections: vi.fn(() => Promise.resolve()),
  initializeInbox: vi.fn(() => Promise.resolve()),
  removeCollection: vi.fn(() => Promise.resolve()),
}));

const mockLinks: Link[] = [
  {
    id: 'link-1',
    url: 'https://inbox1.com',
    title: 'Inbox Link 1',
    collectionId: INBOX_COLLECTION_ID,
    createdAt: 1000,
  },
  {
    id: 'link-2',
    url: 'https://work1.com',
    title: 'Work Link 1',
    collectionId: 'work',
    createdAt: 2000,
  },
  {
    id: 'link-3',
    url: 'https://inbox2.com',
    title: 'Inbox Link 2',
    collectionId: INBOX_COLLECTION_ID,
    createdAt: 3000,
  },
  {
    id: 'link-4',
    url: 'https://projects1.com',
    title: 'Projects Link 1',
    collectionId: 'projects',
    createdAt: 4000,
  },
];

const _mockCollections: Collection[] = [
  { id: INBOX_COLLECTION_ID, name: 'Inbox', order: 0, isDefault: true },
  { id: 'work', name: 'Work', order: 1 },
  { id: 'projects', name: 'Projects', order: 2 },
];

describe('Collection Filter Integration', () => {
  beforeEach(() => {
    vi.resetModules();
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Filter selection and persistence', () => {
    it('should persist filter selection across sessions', async () => {
      const { collectionFilterStore, selectedCollectionId } = await import(
        '@/popup/stores/collectionFilter'
      );

      collectionFilterStore.select('work');
      expect(get(selectedCollectionId)).toBe('work');
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'tabala_collection_filter',
        'work'
      );
    });

    it('should restore filter on initialization', async () => {
      localStorageMock.setItem('tabala_collection_filter', 'projects');

      const { selectedCollectionId } = await import(
        '@/popup/stores/collectionFilter'
      );

      expect(get(selectedCollectionId)).toBe('projects');
    });
  });

  describe('Filtering logic', () => {
    it('should filter links by selected collection', async () => {
      const { filterLinksByCollection } = await import('@/lib/filters');

      const inboxLinks = filterLinksByCollection(mockLinks, INBOX_COLLECTION_ID);
      expect(inboxLinks).toHaveLength(2);
      expect(inboxLinks.every((l) => l.collectionId === INBOX_COLLECTION_ID)).toBe(
        true
      );

      const workLinks = filterLinksByCollection(mockLinks, 'work');
      expect(workLinks).toHaveLength(1);
      expect(workLinks[0].collectionId).toBe('work');
    });

    it('should return all links when no filter is applied', async () => {
      const { filterLinksByCollection, ALL_COLLECTIONS_FILTER } = await import(
        '@/lib/filters'
      );

      const allLinks = filterLinksByCollection(mockLinks, ALL_COLLECTIONS_FILTER);
      expect(allLinks).toHaveLength(4);
    });
  });

  describe('Link counts', () => {
    it('should count links per collection correctly', async () => {
      const { countLinksByCollection } = await import('@/lib/filters');

      const counts = countLinksByCollection(mockLinks);

      expect(counts.get(INBOX_COLLECTION_ID)).toBe(2);
      expect(counts.get('work')).toBe(1);
      expect(counts.get('projects')).toBe(1);
    });

    it('should update counts when filter changes', async () => {
      const { getLinkCount, ALL_COLLECTIONS_FILTER } = await import(
        '@/lib/filters'
      );

      const totalCount = getLinkCount(mockLinks, ALL_COLLECTIONS_FILTER);
      expect(totalCount).toBe(4);

      const inboxCount = getLinkCount(mockLinks, INBOX_COLLECTION_ID);
      expect(inboxCount).toBe(2);
    });
  });

  describe('Collection validation', () => {
    it('should reset filter when selected collection is deleted', async () => {
      const {
        collectionFilterStore,
        selectedCollectionId,
        ALL_COLLECTIONS_FILTER,
      } = await import('@/popup/stores/collectionFilter');

      collectionFilterStore.select('deleted-collection');
      expect(get(selectedCollectionId)).toBe('deleted-collection');

      collectionFilterStore.validateSelection([
        INBOX_COLLECTION_ID,
        'work',
        'projects',
      ]);

      expect(get(selectedCollectionId)).toBe(ALL_COLLECTIONS_FILTER);
    });

    it('should keep filter when selected collection still exists', async () => {
      const { collectionFilterStore, selectedCollectionId } = await import(
        '@/popup/stores/collectionFilter'
      );

      collectionFilterStore.select('work');
      collectionFilterStore.validateSelection([
        INBOX_COLLECTION_ID,
        'work',
        'projects',
      ]);

      expect(get(selectedCollectionId)).toBe('work');
    });
  });

  describe('First use scenario', () => {
    it('should show all collections on first use', async () => {
      const {
        selectedCollectionId,
        ALL_COLLECTIONS_FILTER,
      } = await import('@/popup/stores/collectionFilter');

      expect(get(selectedCollectionId)).toBe(ALL_COLLECTIONS_FILTER);
    });
  });

  describe('Empty collection handling', () => {
    it('should handle filtering to empty collection', async () => {
      const { filterLinksByCollection } = await import('@/lib/filters');

      const emptyResult = filterLinksByCollection(mockLinks, 'empty-collection');
      expect(emptyResult).toHaveLength(0);
    });

    it('should return 0 count for empty collection', async () => {
      const { getLinkCount } = await import('@/lib/filters');

      const count = getLinkCount(mockLinks, 'empty-collection');
      expect(count).toBe(0);
    });
  });

  describe('Performance with large datasets', () => {
    it('should filter large datasets within acceptable time', async () => {
      const { filterLinksByCollection } = await import('@/lib/filters');

      const largeLinks: Link[] = Array.from({ length: 500 }, (_, i) => ({
        id: `link-${i}`,
        url: `https://example${i}.com`,
        title: `Link ${i}`,
        collectionId: i % 5 === 0 ? INBOX_COLLECTION_ID : `collection-${i % 3}`,
        createdAt: i,
      }));

      const start = performance.now();
      const result = filterLinksByCollection(largeLinks, INBOX_COLLECTION_ID);
      const elapsed = performance.now() - start;

      expect(result.length).toBeGreaterThan(0);
      expect(elapsed).toBeLessThan(100);
    });
  });
});
