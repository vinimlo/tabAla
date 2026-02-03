/**
 * Unit tests for storage module - removeLink functionality.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockStorage } from '../setup';
import { removeLink, getLinks, getCollections, saveLinks, saveCollections } from '@/lib/storage';
import type { Link, Collection } from '@/lib/types';

const createMockLink = (overrides: Partial<Link> = {}): Link => ({
  id: 'link-1',
  url: 'https://example.com',
  title: 'Example Link',
  collectionId: 'collection-1',
  createdAt: Date.now(),
  ...overrides,
});

const createMockCollection = (overrides: Partial<Collection> = {}): Collection => ({
  id: 'collection-1',
  name: 'Test Collection',
  order: 0,
  ...overrides,
});

describe('removeLink', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.keys(mockStorage).forEach((key) => delete mockStorage[key]);
  });

  it('should successfully remove an existing link', async () => {
    const link1 = createMockLink({ id: 'link-1' });
    const link2 = createMockLink({ id: 'link-2', url: 'https://other.com' });
    await saveLinks([link1, link2]);

    const result = await removeLink('link-1');

    expect(result.success).toBe(true);
    expect(result.error).toBeUndefined();

    const remainingLinks = await getLinks();
    expect(remainingLinks).toHaveLength(1);
    expect(remainingLinks[0].id).toBe('link-2');
  });

  it('should return error when link does not exist', async () => {
    const link = createMockLink({ id: 'link-1' });
    await saveLinks([link]);

    const result = await removeLink('non-existent-id');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Link not found');

    const links = await getLinks();
    expect(links).toHaveLength(1);
  });

  it('should handle empty links array', async () => {
    await saveLinks([]);

    const result = await removeLink('any-id');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Link not found');
  });

  it('should remove collection when last link is removed', async () => {
    const collection = createMockCollection({ id: 'collection-1' });
    const link = createMockLink({ id: 'link-1', collectionId: 'collection-1' });
    await saveLinks([link]);
    await saveCollections([collection]);

    const result = await removeLink('link-1');

    expect(result.success).toBe(true);
    expect(result.collectionRemoved).toBe(true);

    const collections = await getCollections();
    expect(collections).toHaveLength(0);
  });

  it('should not remove collection when other links remain', async () => {
    const collection = createMockCollection({ id: 'collection-1' });
    const link1 = createMockLink({ id: 'link-1', collectionId: 'collection-1' });
    const link2 = createMockLink({ id: 'link-2', collectionId: 'collection-1' });
    await saveLinks([link1, link2]);
    await saveCollections([collection]);

    const result = await removeLink('link-1');

    expect(result.success).toBe(true);
    expect(result.collectionRemoved).toBe(false);

    const collections = await getCollections();
    expect(collections).toHaveLength(1);
  });

  it('should not remove inbox collection even when last link is removed', async () => {
    const inboxCollection = createMockCollection({ id: 'inbox', name: 'Inbox' });
    const link = createMockLink({ id: 'link-1', collectionId: 'inbox' });
    await saveLinks([link]);
    await saveCollections([inboxCollection]);

    const result = await removeLink('link-1');

    expect(result.success).toBe(true);
    expect(result.collectionRemoved).toBe(false);

    const collections = await getCollections();
    expect(collections).toHaveLength(1);
    expect(collections[0].id).toBe('inbox');
  });

  it('should persist removal in chrome.storage.local', async () => {
    const link = createMockLink({ id: 'link-1' });
    await saveLinks([link]);

    await removeLink('link-1');

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(chrome.storage.local.set).toHaveBeenCalled();
    const storedLinks = await getLinks();
    expect(storedLinks).toHaveLength(0);
  });

  it('should handle multiple collections correctly', async () => {
    const collection1 = createMockCollection({ id: 'col-1', name: 'Collection 1' });
    const collection2 = createMockCollection({ id: 'col-2', name: 'Collection 2', order: 1 });
    const link1 = createMockLink({ id: 'link-1', collectionId: 'col-1' });
    const link2 = createMockLink({ id: 'link-2', collectionId: 'col-2' });
    await saveLinks([link1, link2]);
    await saveCollections([collection1, collection2]);

    const result = await removeLink('link-1');

    expect(result.success).toBe(true);
    expect(result.collectionRemoved).toBe(true);

    const collections = await getCollections();
    expect(collections).toHaveLength(1);
    expect(collections[0].id).toBe('col-2');

    const links = await getLinks();
    expect(links).toHaveLength(1);
    expect(links[0].id).toBe('link-2');
  });

  it('should handle storage errors gracefully', async () => {
    const link = createMockLink({ id: 'link-1' });
    await saveLinks([link]);

    // eslint-disable-next-line @typescript-eslint/unbound-method
    vi.mocked(chrome.storage.local.set).mockRejectedValueOnce(new Error('Storage error'));

    const result = await removeLink('link-1');

    expect(result.success).toBe(false);
    expect(result.error).toContain('Storage error');
  });
});
