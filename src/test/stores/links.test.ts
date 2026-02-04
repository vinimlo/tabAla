/**
 * Links store tests.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { get } from 'svelte/store';
import { linksStore, linksByCollection } from '@/popup/stores/links';
import * as storage from '@/lib/storage';
import type { Link, Collection } from '@/lib/types';

vi.mock('@/lib/storage', () => ({
  getLinks: vi.fn(() => Promise.resolve([])),
  saveLinks: vi.fn(() => Promise.resolve()),
  getCollections: vi.fn(() => Promise.resolve([])),
  saveCollections: vi.fn(() => Promise.resolve()),
  initializeInbox: vi.fn(() => Promise.resolve()),
  removeCollection: vi.fn(() => Promise.resolve()),
  createCollection: vi.fn(() => Promise.resolve({ id: 'new-collection', name: 'New', order: 1 })),
  renameCollection: vi.fn(() => Promise.resolve({ success: true })),
  moveLink: vi.fn(() => Promise.resolve({ success: true })),
  updateCollectionOrder: vi.fn(() => Promise.resolve({ success: true })),
  storage: {
    watch: vi.fn(() => () => {}),
  },
}));

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
];

const mockCollections: Collection[] = [
  { id: 'inbox', name: 'Inbox', order: 0 },
  { id: 'work', name: 'Work', order: 1 },
];

describe('linksStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    linksStore.set({
      links: [],
      collections: [{ id: 'inbox', name: 'Inbox', order: 0 }],
      loading: true,
      error: null,
      isAdding: false,
      isRemoving: new Set(),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('load', () => {
    it('should load links and collections from storage', async () => {
      vi.mocked(storage.getLinks).mockResolvedValue(mockLinks);
      vi.mocked(storage.getCollections).mockResolvedValue(mockCollections);

      await linksStore.load();

      const state = get(linksStore);
      expect(state.loading).toBe(false);
      expect(state.links).toHaveLength(2);
      expect(state.collections).toHaveLength(2);
    });

    it('should sort links by createdAt descending', async () => {
      vi.mocked(storage.getLinks).mockResolvedValue(mockLinks);
      vi.mocked(storage.getCollections).mockResolvedValue(mockCollections);

      await linksStore.load();

      const state = get(linksStore);
      expect(state.links[0].id).toBe('link-2');
      expect(state.links[1].id).toBe('link-1');
    });

    it('should initialize Inbox collection via initializeInbox', async () => {
      vi.mocked(storage.getLinks).mockResolvedValue([]);
      vi.mocked(storage.getCollections).mockResolvedValue([
        { id: 'inbox', name: 'Inbox', order: 0, isDefault: true },
      ]);

      await linksStore.load();

      const state = get(linksStore);
      expect(state.collections).toHaveLength(1);
      expect(state.collections[0].id).toBe('inbox');
      expect(storage.initializeInbox).toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      vi.mocked(storage.initializeInbox).mockRejectedValue(new Error('Storage error'));

      await linksStore.load();

      const state = get(linksStore);
      expect(state.loading).toBe(false);
      expect(state.error).toBe('Storage error');
    });
  });

  describe('removeLink', () => {
    beforeEach(async () => {
      vi.mocked(storage.getLinks).mockResolvedValue(mockLinks);
      vi.mocked(storage.getCollections).mockResolvedValue(mockCollections);
      await linksStore.load();
    });

    it('should remove link from state immediately', async () => {
      await linksStore.removeLink('link-1');

      const state = get(linksStore);
      expect(state.links).toHaveLength(1);
      expect(state.links[0].id).toBe('link-2');
    });

    it('should persist removal to storage', async () => {
      await linksStore.removeLink('link-1');

      expect(storage.saveLinks).toHaveBeenCalledWith(
        expect.not.arrayContaining([expect.objectContaining({ id: 'link-1' })])
      );
    });
  });

  describe('addLink', () => {
    beforeEach(async () => {
      vi.mocked(storage.getLinks).mockResolvedValue([]);
      vi.mocked(storage.getCollections).mockResolvedValue(mockCollections);
      await linksStore.load();
    });

    it('should add link to state', async () => {
      await linksStore.addLink({
        url: 'https://newlink.com',
        title: 'New Link',
        collectionId: 'inbox',
      });

      const state = get(linksStore);
      expect(state.links).toHaveLength(1);
      expect(state.links[0].url).toBe('https://newlink.com');
    });

    it('should generate id and createdAt for new link', async () => {
      await linksStore.addLink({
        url: 'https://newlink.com',
        title: 'New Link',
        collectionId: 'inbox',
      });

      const state = get(linksStore);
      expect(state.links[0].id).toBeDefined();
      expect(state.links[0].createdAt).toBeDefined();
    });

    it('should persist new link to storage', async () => {
      await linksStore.addLink({
        url: 'https://newlink.com',
        title: 'New Link',
        collectionId: 'inbox',
      });

      expect(storage.saveLinks).toHaveBeenCalled();
    });
  });
});

describe('linksByCollection', () => {
  beforeEach(async () => {
    vi.mocked(storage.getLinks).mockResolvedValue(mockLinks);
    vi.mocked(storage.getCollections).mockResolvedValue(mockCollections);
    await linksStore.load();
  });

  it('should group links by collection', () => {
    const grouped = get(linksByCollection);

    expect(grouped.get('inbox')).toHaveLength(1);
    expect(grouped.get('work')).toHaveLength(1);
  });

  it('should return empty array for collections with no links', async () => {
    vi.mocked(storage.getLinks).mockResolvedValue([]);
    await linksStore.load();

    const grouped = get(linksByCollection);
    expect(grouped.get('inbox')).toHaveLength(0);
  });
});
