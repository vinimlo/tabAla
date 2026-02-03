/**
 * Integration tests for Inbox collection functionality.
 * Tests the complete flow of Inbox creation, link management, and deletion protection.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mockStorage } from '../setup';
import {
  getCollections,
  saveCollections,
  getLinks,
  saveLinks,
  createInboxCollection,
  initializeInbox,
  removeCollection,
  addLink,
  StorageError,
} from '@/lib/storage';
import {
  INBOX_COLLECTION_ID,
  INBOX_COLLECTION_NAME,
  isInboxCollection,
} from '@/lib/types';
import type { Collection } from '@/lib/types';

const createMockCollection = (overrides: Partial<Collection> = {}): Collection => ({
  id: 'collection-1',
  name: 'Test Collection',
  order: 1,
  createdAt: Date.now(),
  ...overrides,
});

describe('Inbox Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.keys(mockStorage).forEach((key) => delete mockStorage[key]);
  });

  describe('Scenario 1: First Installation', () => {
    it('should create Inbox collection on first initialization', async () => {
      await initializeInbox();

      const collections = await getCollections();
      expect(collections).toHaveLength(1);
      expect(collections[0].id).toBe(INBOX_COLLECTION_ID);
      expect(collections[0].name).toBe(INBOX_COLLECTION_NAME);
      expect(collections[0].isDefault).toBe(true);
    });

    it('should have Inbox with system collection properties', async () => {
      await initializeInbox();

      const collections = await getCollections();
      const inbox = collections[0];

      expect(isInboxCollection(inbox)).toBe(true);
      expect(inbox.order).toBe(0);
      expect(inbox.createdAt).toBeDefined();
    });
  });

  describe('Scenario 2: Save Link Without Collection', () => {
    beforeEach(async () => {
      await initializeInbox();
    });

    it('should assign link to Inbox when no collectionId provided', async () => {
      const link = await addLink({
        url: 'https://example.com',
        title: 'Test Link',
      });

      expect(link.collectionId).toBe(INBOX_COLLECTION_ID);

      const links = await getLinks();
      expect(links).toHaveLength(1);
      expect(links[0].collectionId).toBe(INBOX_COLLECTION_ID);
    });

    it('should preserve explicit collectionId when provided', async () => {
      const customCollection = createMockCollection({ id: 'custom' });
      const existingCollections = await getCollections();
      await saveCollections([...existingCollections, customCollection]);

      const link = await addLink({
        url: 'https://example.com',
        title: 'Test Link',
        collectionId: 'custom',
      });

      expect(link.collectionId).toBe('custom');
    });
  });

  describe('Scenario 3: Attempting to Delete Inbox', () => {
    beforeEach(async () => {
      await initializeInbox();
    });

    it('should throw StorageError when trying to delete Inbox', async () => {
      await expect(removeCollection(INBOX_COLLECTION_ID)).rejects.toThrow(StorageError);
    });

    it('should throw error with INBOX_DELETE_FORBIDDEN code', async () => {
      try {
        await removeCollection(INBOX_COLLECTION_ID);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(StorageError);
        expect((error as StorageError).code).toBe('INBOX_DELETE_FORBIDDEN');
      }
    });

    it('should throw error with Portuguese message', async () => {
      try {
        await removeCollection(INBOX_COLLECTION_ID);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect((error as StorageError).message).toContain('Inbox não pode ser removida');
      }
    });

    it('should keep Inbox intact after failed deletion attempt', async () => {
      try {
        await removeCollection(INBOX_COLLECTION_ID);
      } catch {
        // Expected to throw
      }

      const collections = await getCollections();
      const inbox = collections.find((c) => c.id === INBOX_COLLECTION_ID);
      expect(inbox).toBeDefined();
    });
  });

  describe('Scenario 4: Renaming Inbox', () => {
    beforeEach(async () => {
      await initializeInbox();
    });

    it('should allow renaming Inbox while keeping system properties', async () => {
      const collections = await getCollections();
      const inbox = collections.find((c) => c.id === INBOX_COLLECTION_ID)!;

      const renamedInbox = { ...inbox, name: 'Pendentes' };
      await saveCollections([renamedInbox, ...collections.filter((c) => c.id !== INBOX_COLLECTION_ID)]);

      const updatedCollections = await getCollections();
      const updatedInbox = updatedCollections.find((c) => c.id === INBOX_COLLECTION_ID)!;

      expect(updatedInbox.name).toBe('Pendentes');
      expect(updatedInbox.id).toBe(INBOX_COLLECTION_ID);
      expect(updatedInbox.isDefault).toBe(true);
    });
  });

  describe('Scenario 5: Automatic Recovery', () => {
    it('should recreate Inbox if missing from storage', async () => {
      // Simulate corrupted state - no collections
      await saveCollections([]);

      await initializeInbox();

      const collections = await getCollections();
      expect(collections).toHaveLength(1);
      expect(collections[0].id).toBe(INBOX_COLLECTION_ID);
    });

    it('should recreate Inbox while preserving other collections', async () => {
      const otherCollection = createMockCollection({ id: 'other', name: 'Other' });
      await saveCollections([otherCollection]);

      await initializeInbox();

      const collections = await getCollections();
      expect(collections).toHaveLength(2);
      expect(collections.some((c) => c.id === INBOX_COLLECTION_ID)).toBe(true);
      expect(collections.some((c) => c.id === 'other')).toBe(true);
    });

    it('should be idempotent - multiple calls should not duplicate Inbox', async () => {
      await initializeInbox();
      await initializeInbox();
      await initializeInbox();

      const collections = await getCollections();
      const inboxCollections = collections.filter((c) => c.id === INBOX_COLLECTION_ID);
      expect(inboxCollections).toHaveLength(1);
    });
  });

  describe('Scenario 6: Collection Ordering', () => {
    beforeEach(async () => {
      await initializeInbox();
    });

    it('should always return Inbox at position [0]', async () => {
      const collection1 = createMockCollection({ id: 'col-1', name: 'A Collection', createdAt: Date.now() - 1000 });
      const collection2 = createMockCollection({ id: 'col-2', name: 'B Collection', createdAt: Date.now() });

      const existingCollections = await getCollections();
      await saveCollections([...existingCollections, collection1, collection2]);

      const orderedCollections = await getCollections();
      expect(orderedCollections[0].id).toBe(INBOX_COLLECTION_ID);
    });

    it('should order other collections by createdAt descending after Inbox', async () => {
      const olderCollection = createMockCollection({ id: 'older', createdAt: 1000 });
      const newerCollection = createMockCollection({ id: 'newer', createdAt: 2000 });

      const existingCollections = await getCollections();
      await saveCollections([...existingCollections, olderCollection, newerCollection]);

      const orderedCollections = await getCollections();
      expect(orderedCollections[0].id).toBe(INBOX_COLLECTION_ID);
      expect(orderedCollections[1].id).toBe('newer');
      expect(orderedCollections[2].id).toBe('older');
    });
  });

  describe('Scenario 7: Moving Links from Inbox', () => {
    beforeEach(async () => {
      await initializeInbox();
    });

    it('should allow moving link from Inbox to another collection', async () => {
      await addLink({
        url: 'https://example.com',
        title: 'Test Link',
      });

      const otherCollection = createMockCollection({ id: 'other' });
      const existingCollections = await getCollections();
      await saveCollections([...existingCollections, otherCollection]);

      const links = await getLinks();
      const updatedLink = { ...links[0], collectionId: 'other' };
      await saveLinks([updatedLink]);

      const updatedLinks = await getLinks();
      expect(updatedLinks[0].collectionId).toBe('other');
    });

    it('should keep Inbox available even when empty', async () => {
      await addLink({
        url: 'https://example.com',
        title: 'Test Link',
      });

      const otherCollection = createMockCollection({ id: 'other' });
      const existingCollections = await getCollections();
      await saveCollections([...existingCollections, otherCollection]);

      const links = await getLinks();
      const updatedLink = { ...links[0], collectionId: 'other' };
      await saveLinks([updatedLink]);

      const collections = await getCollections();
      const inbox = collections.find((c) => c.id === INBOX_COLLECTION_ID);
      expect(inbox).toBeDefined();
    });
  });

  describe('Scenario 8: Removing Other Collections', () => {
    beforeEach(async () => {
      await initializeInbox();
    });

    it('should allow removing non-Inbox collections', async () => {
      const customCollection = createMockCollection({ id: 'custom' });
      const existingCollections = await getCollections();
      await saveCollections([...existingCollections, customCollection]);

      await removeCollection('custom');

      const collections = await getCollections();
      expect(collections.some((c) => c.id === 'custom')).toBe(false);
    });

    it('should move orphaned links to Inbox when collection is deleted', async () => {
      const customCollection = createMockCollection({ id: 'custom' });
      const existingCollections = await getCollections();
      await saveCollections([...existingCollections, customCollection]);

      await addLink({
        url: 'https://example.com',
        title: 'Test Link',
        collectionId: 'custom',
      });

      await removeCollection('custom');

      const links = await getLinks();
      expect(links[0].collectionId).toBe(INBOX_COLLECTION_ID);
    });
  });
});

describe('createInboxCollection', () => {
  it('should return object with correct structure', () => {
    const inbox = createInboxCollection();

    expect(inbox.id).toBe(INBOX_COLLECTION_ID);
    expect(inbox.name).toBe(INBOX_COLLECTION_NAME);
    expect(inbox.order).toBe(0);
    expect(inbox.isDefault).toBe(true);
    expect(inbox.createdAt).toBeDefined();
    expect(typeof inbox.createdAt).toBe('number');
  });

  it('should be a pure function returning new object each time', () => {
    const inbox1 = createInboxCollection();
    const inbox2 = createInboxCollection();

    expect(inbox1).not.toBe(inbox2);
    expect(inbox1.createdAt).toBeLessThanOrEqual(inbox2.createdAt);
  });
});

describe('isInboxCollection', () => {
  it('should return true for Inbox collection', () => {
    const inbox = createInboxCollection();
    expect(isInboxCollection(inbox)).toBe(true);
  });

  it('should return false for regular collection', () => {
    const collection = createMockCollection({ id: 'other' });
    expect(isInboxCollection(collection)).toBe(false);
  });

  it('should return false for collection with similar but different id', () => {
    const collection = createMockCollection({ id: 'inbox2' });
    expect(isInboxCollection(collection)).toBe(false);
  });
});

describe('INBOX_COLLECTION_ID constant', () => {
  it('should be immutable string "inbox"', () => {
    expect(INBOX_COLLECTION_ID).toBe('inbox');
  });
});
