/**
 * Integration tests for delete collection functionality.
 * Tests the complete flow of deleting collections and moving links to Inbox.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mockStorage } from '../setup';
import {
  getCollections,
  saveCollections,
  getLinks,
  saveLinks,
  initializeInbox,
  addLink,
  validateCollectionDeletion,
  moveLinksToInbox,
  deleteCollection,
} from '@/lib/storage';
import { INBOX_COLLECTION_ID } from '@/lib/types';
import type { Collection, Link } from '@/lib/types';

const createMockCollection = (overrides: Partial<Collection> = {}): Collection => ({
  id: 'collection-1',
  name: 'Test Collection',
  order: 1,
  createdAt: Date.now(),
  ...overrides,
});

const createMockLink = (overrides: Partial<Link> = {}): Link => ({
  id: 'link-1',
  url: 'https://example.com',
  title: 'Test Link',
  collectionId: 'collection-1',
  createdAt: Date.now(),
  ...overrides,
});

describe('Delete Collection Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.keys(mockStorage).forEach((key) => delete mockStorage[key]);
  });

  describe('validateCollectionDeletion', () => {
    beforeEach(async () => {
      await initializeInbox();
    });

    it('should return error for Inbox collection', async () => {
      const result = await validateCollectionDeletion(INBOX_COLLECTION_ID);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('A coleção Inbox não pode ser excluída');
    });

    it('should return error for non-existent collection', async () => {
      const result = await validateCollectionDeletion('non-existent');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Coleção não encontrada');
    });

    it('should return valid for existing custom collection', async () => {
      const collection = createMockCollection({ id: 'custom', name: 'Custom' });
      const existingCollections = await getCollections();
      await saveCollections([...existingCollections, collection]);

      const result = await validateCollectionDeletion('custom');

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });
  });

  describe('moveLinksToInbox', () => {
    beforeEach(async () => {
      await initializeInbox();
    });

    it('should return success with 0 count for empty collection', async () => {
      const collection = createMockCollection({ id: 'empty-collection' });
      const existingCollections = await getCollections();
      await saveCollections([...existingCollections, collection]);

      const result = await moveLinksToInbox('empty-collection');

      expect(result.success).toBe(true);
      expect(result.movedCount).toBe(0);
    });

    it('should move all links to Inbox', async () => {
      const collection = createMockCollection({ id: 'source' });
      const existingCollections = await getCollections();
      await saveCollections([...existingCollections, collection]);

      await addLink({ url: 'https://example1.com', title: 'Link 1', collectionId: 'source' });
      await addLink({ url: 'https://example2.com', title: 'Link 2', collectionId: 'source' });
      await addLink({ url: 'https://example3.com', title: 'Link 3', collectionId: 'source' });

      const result = await moveLinksToInbox('source');

      expect(result.success).toBe(true);
      expect(result.movedCount).toBe(3);

      const links = await getLinks();
      const inboxLinks = links.filter((l) => l.collectionId === INBOX_COLLECTION_ID);
      expect(inboxLinks).toHaveLength(3);
    });

    it('should preserve link properties when moving', async () => {
      const collection = createMockCollection({ id: 'source' });
      const existingCollections = await getCollections();
      await saveCollections([...existingCollections, collection]);

      const originalLink = await addLink({
        url: 'https://example.com',
        title: 'Test Link',
        favicon: 'https://example.com/favicon.ico',
        collectionId: 'source',
      });

      await moveLinksToInbox('source');

      const links = await getLinks();
      const movedLink = links.find((l) => l.id === originalLink.id);

      expect(movedLink).toBeDefined();
      expect(movedLink!.url).toBe(originalLink.url);
      expect(movedLink!.title).toBe(originalLink.title);
      expect(movedLink!.favicon).toBe(originalLink.favicon);
      expect(movedLink!.createdAt).toBe(originalLink.createdAt);
      expect(movedLink!.collectionId).toBe(INBOX_COLLECTION_ID);
    });

    it('should not affect links in other collections', async () => {
      const collection1 = createMockCollection({ id: 'col-1' });
      const collection2 = createMockCollection({ id: 'col-2', order: 2 });
      const existingCollections = await getCollections();
      await saveCollections([...existingCollections, collection1, collection2]);

      await addLink({ url: 'https://example1.com', title: 'Link 1', collectionId: 'col-1' });
      await addLink({ url: 'https://example2.com', title: 'Link 2', collectionId: 'col-2' });

      await moveLinksToInbox('col-1');

      const links = await getLinks();
      const col2Links = links.filter((l) => l.collectionId === 'col-2');
      expect(col2Links).toHaveLength(1);
    });

    it('should return success with 0 for Inbox collection', async () => {
      const result = await moveLinksToInbox(INBOX_COLLECTION_ID);

      expect(result.success).toBe(true);
      expect(result.movedCount).toBe(0);
    });
  });

  describe('deleteCollection', () => {
    beforeEach(async () => {
      await initializeInbox();
    });

    it('should delete collection with few links successfully', async () => {
      const collection = createMockCollection({ id: 'work', name: 'Trabalho' });
      const existingCollections = await getCollections();
      await saveCollections([...existingCollections, collection]);

      await addLink({ url: 'https://example1.com', title: 'Link 1', collectionId: 'work' });
      await addLink({ url: 'https://example2.com', title: 'Link 2', collectionId: 'work' });
      await addLink({ url: 'https://example3.com', title: 'Link 3', collectionId: 'work' });
      await addLink({ url: 'https://example4.com', title: 'Link 4', collectionId: 'work' });
      await addLink({ url: 'https://example5.com', title: 'Link 5', collectionId: 'work' });

      const result = await deleteCollection('work');

      expect(result.success).toBe(true);
      expect(result.movedCount).toBe(5);

      const collections = await getCollections();
      expect(collections.some((c) => c.id === 'work')).toBe(false);

      const links = await getLinks();
      const inboxLinks = links.filter((l) => l.collectionId === INBOX_COLLECTION_ID);
      expect(inboxLinks).toHaveLength(5);
    });

    it('should delete empty collection successfully', async () => {
      const collection = createMockCollection({ id: 'temp', name: 'Temporária' });
      const existingCollections = await getCollections();
      await saveCollections([...existingCollections, collection]);

      const result = await deleteCollection('temp');

      expect(result.success).toBe(true);
      expect(result.movedCount).toBe(0);

      const collections = await getCollections();
      expect(collections.some((c) => c.id === 'temp')).toBe(false);
    });

    it('should fail when trying to delete Inbox', async () => {
      const result = await deleteCollection(INBOX_COLLECTION_ID);

      expect(result.success).toBe(false);
      expect(result.error).toBe('A coleção Inbox não pode ser excluída');

      const collections = await getCollections();
      expect(collections.some((c) => c.id === INBOX_COLLECTION_ID)).toBe(true);
    });

    it('should fail when collection does not exist', async () => {
      const result = await deleteCollection('non-existent');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Coleção não encontrada');
    });

    it('should keep other collections intact', async () => {
      const collection1 = createMockCollection({ id: 'col-1', name: 'Collection 1' });
      const collection2 = createMockCollection({ id: 'col-2', name: 'Collection 2', order: 2 });
      const existingCollections = await getCollections();
      await saveCollections([...existingCollections, collection1, collection2]);

      await addLink({ url: 'https://example1.com', title: 'Link 1', collectionId: 'col-1' });
      await addLink({ url: 'https://example2.com', title: 'Link 2', collectionId: 'col-2' });

      await deleteCollection('col-1');

      const collections = await getCollections();
      expect(collections.some((c) => c.id === 'col-2')).toBe(true);

      const links = await getLinks();
      const col2Links = links.filter((l) => l.collectionId === 'col-2');
      expect(col2Links).toHaveLength(1);
    });

    it('should handle deletion with storage error gracefully', async () => {
      const collection = createMockCollection({ id: 'test', name: 'Test' });
      const existingCollections = await getCollections();
      await saveCollections([...existingCollections, collection]);

      await addLink({ url: 'https://example.com', title: 'Link', collectionId: 'test' });

      // eslint-disable-next-line @typescript-eslint/unbound-method
      vi.mocked(chrome.storage.local.set).mockRejectedValueOnce(new Error('Storage error'));

      const result = await deleteCollection('test');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('Scenario: Full Deletion Flow', () => {
    beforeEach(async () => {
      await initializeInbox();
    });

    it('should complete full flow: validate -> move links -> delete collection', async () => {
      const workCollection = createMockCollection({ id: 'work', name: 'Trabalho' });
      const existingCollections = await getCollections();
      await saveCollections([...existingCollections, workCollection]);

      await addLink({ url: 'https://work1.com', title: 'Work 1', collectionId: 'work' });
      await addLink({ url: 'https://work2.com', title: 'Work 2', collectionId: 'work' });
      await addLink({ url: 'https://inbox1.com', title: 'Inbox 1', collectionId: INBOX_COLLECTION_ID });

      const validation = await validateCollectionDeletion('work');
      expect(validation.valid).toBe(true);

      const result = await deleteCollection('work');
      expect(result.success).toBe(true);
      expect(result.movedCount).toBe(2);

      const collections = await getCollections();
      expect(collections).toHaveLength(1);
      expect(collections[0].id).toBe(INBOX_COLLECTION_ID);

      const links = await getLinks();
      expect(links).toHaveLength(3);
      expect(links.every((l) => l.collectionId === INBOX_COLLECTION_ID)).toBe(true);
    });

    it('should handle cancellation flow correctly', async () => {
      const collection = createMockCollection({ id: 'test', name: 'Test' });
      const existingCollections = await getCollections();
      await saveCollections([...existingCollections, collection]);

      await addLink({ url: 'https://example.com', title: 'Link', collectionId: 'test' });

      const validation = await validateCollectionDeletion('test');
      expect(validation.valid).toBe(true);

      const collections = await getCollections();
      expect(collections.some((c) => c.id === 'test')).toBe(true);

      const links = await getLinks();
      expect(links[0].collectionId).toBe('test');
    });
  });

  describe('Scenario: Many Links (Batch Processing)', () => {
    beforeEach(async () => {
      await initializeInbox();
    });

    it('should handle collection with many links', async () => {
      const collection = createMockCollection({ id: 'research', name: 'Pesquisa' });
      const existingCollections = await getCollections();
      await saveCollections([...existingCollections, collection]);

      const links: Link[] = [];
      for (let i = 0; i < 60; i++) {
        links.push(createMockLink({
          id: `link-${i}`,
          url: `https://example${i}.com`,
          title: `Link ${i}`,
          collectionId: 'research',
          createdAt: Date.now() - i,
        }));
      }
      await saveLinks(links);

      const result = await deleteCollection('research');

      expect(result.success).toBe(true);
      expect(result.movedCount).toBe(60);

      const allLinks = await getLinks();
      expect(allLinks).toHaveLength(60);
      expect(allLinks.every((l) => l.collectionId === INBOX_COLLECTION_ID)).toBe(true);
    });
  });
});
