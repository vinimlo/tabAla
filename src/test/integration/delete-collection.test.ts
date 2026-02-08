/**
 * Integration tests for delete collection functionality.
 * Tests the complete flow of deleting collections and moving links to Inbox.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { clearMockStorage } from '../setup';
import {
  getCollections,
  saveCollections,
  getLinks,
  saveLinks,
  initializeInbox,
  addLink,
  removeCollection,
  StorageError,
} from '@/lib/storage';
import { INBOX_COLLECTION_ID } from '@/lib/types';
import type { Collection, Link } from '@/lib/types';
import { createMockCollection, createMockLink } from '../factories';

/** Appends collections to storage alongside existing ones. */
async function appendCollections(...collections: Collection[]): Promise<void> {
  const existing = await getCollections();
  await saveCollections([...existing, ...collections]);
}

describe('Delete Collection Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearMockStorage();
  });

  describe('removeCollection', () => {
    beforeEach(async () => {
      await initializeInbox();
    });

    it('should throw StorageError for Inbox collection', async () => {
      await expect(removeCollection(INBOX_COLLECTION_ID)).rejects.toThrow(StorageError);
      await expect(removeCollection(INBOX_COLLECTION_ID)).rejects.toThrow(
        'The Inbox collection cannot be removed.'
      );

      const collections = await getCollections();
      expect(collections.some((c) => c.id === INBOX_COLLECTION_ID)).toBe(true);
    });

    it('should remove collection with links and move them to Inbox', async () => {
      await appendCollections(createMockCollection({ id: 'work', name: 'Trabalho' }));

      await addLink({ url: 'https://example1.com', title: 'Link 1', collectionId: 'work' });
      await addLink({ url: 'https://example2.com', title: 'Link 2', collectionId: 'work' });
      await addLink({ url: 'https://example3.com', title: 'Link 3', collectionId: 'work' });
      await addLink({ url: 'https://example4.com', title: 'Link 4', collectionId: 'work' });
      await addLink({ url: 'https://example5.com', title: 'Link 5', collectionId: 'work' });

      await removeCollection('work');

      const collections = await getCollections();
      expect(collections.some((c) => c.id === 'work')).toBe(false);

      const links = await getLinks();
      const inboxLinks = links.filter((l) => l.collectionId === INBOX_COLLECTION_ID);
      expect(inboxLinks).toHaveLength(5);
    });

    it('should remove empty collection successfully', async () => {
      await appendCollections(createMockCollection({ id: 'temp', name: 'Temporária' }));

      await removeCollection('temp');

      const collections = await getCollections();
      expect(collections.some((c) => c.id === 'temp')).toBe(false);
    });

    it('should preserve link properties when moving to Inbox', async () => {
      await appendCollections(createMockCollection({ id: 'source' }));

      const originalLink = await addLink({
        url: 'https://example.com',
        title: 'Test Link',
        favicon: 'https://example.com/favicon.ico',
        collectionId: 'source',
      });

      await removeCollection('source');

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
      await appendCollections(
        createMockCollection({ id: 'col-1' }),
        createMockCollection({ id: 'col-2', order: 2 }),
      );

      await addLink({ url: 'https://example1.com', title: 'Link 1', collectionId: 'col-1' });
      await addLink({ url: 'https://example2.com', title: 'Link 2', collectionId: 'col-2' });

      await removeCollection('col-1');

      const links = await getLinks();
      const col2Links = links.filter((l) => l.collectionId === 'col-2');
      expect(col2Links).toHaveLength(1);
    });

    it('should keep other collections intact', async () => {
      await appendCollections(
        createMockCollection({ id: 'col-1', name: 'Collection 1' }),
        createMockCollection({ id: 'col-2', name: 'Collection 2', order: 2 }),
      );

      await addLink({ url: 'https://example1.com', title: 'Link 1', collectionId: 'col-1' });
      await addLink({ url: 'https://example2.com', title: 'Link 2', collectionId: 'col-2' });

      await removeCollection('col-1');

      const collections = await getCollections();
      expect(collections.some((c) => c.id === 'col-2')).toBe(true);

      const links = await getLinks();
      const col2Links = links.filter((l) => l.collectionId === 'col-2');
      expect(col2Links).toHaveLength(1);
    });
  });

  describe('Scenario: Full Deletion Flow', () => {
    beforeEach(async () => {
      await initializeInbox();
    });

    it('should remove collection and move all its links to Inbox', async () => {
      await appendCollections(createMockCollection({ id: 'work', name: 'Trabalho' }));

      await addLink({ url: 'https://work1.com', title: 'Work 1', collectionId: 'work' });
      await addLink({ url: 'https://work2.com', title: 'Work 2', collectionId: 'work' });
      await addLink({ url: 'https://inbox1.com', title: 'Inbox 1', collectionId: INBOX_COLLECTION_ID });

      await removeCollection('work');

      const collections = await getCollections();
      expect(collections).toHaveLength(1);
      expect(collections[0].id).toBe(INBOX_COLLECTION_ID);

      const links = await getLinks();
      expect(links).toHaveLength(3);
      expect(links.every((l) => l.collectionId === INBOX_COLLECTION_ID)).toBe(true);
    });
  });

  describe('Scenario: Many Links (Batch Processing)', () => {
    beforeEach(async () => {
      await initializeInbox();
    });

    it('should handle collection with many links', async () => {
      await appendCollections(createMockCollection({ id: 'research', name: 'Pesquisa' }));

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

      await removeCollection('research');

      const allLinks = await getLinks();
      expect(allLinks).toHaveLength(60);
      expect(allLinks.every((l) => l.collectionId === INBOX_COLLECTION_ID)).toBe(true);
    });
  });
});
