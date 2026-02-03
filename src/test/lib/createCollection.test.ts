/**
 * Unit tests for createCollection storage function.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockStorage } from '../setup';
import {
  createCollection,
  getCollections,
  saveCollections,
  StorageError,
} from '@/lib/storage';
import { COLLECTION_NAME_ERRORS } from '@/lib/validation';
import type { Collection } from '@/lib/types';

const createMockCollection = (overrides: Partial<Collection> = {}): Collection => ({
  id: 'col-1',
  name: 'Test Collection',
  order: 0,
  createdAt: Date.now(),
  ...overrides,
});

describe('createCollection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.keys(mockStorage).forEach((key) => delete mockStorage[key]);
  });

  describe('successful creation', () => {
    it('should create a collection with valid name', async () => {
      const collection = await createCollection({ name: 'Estudos' });

      expect(collection.name).toBe('Estudos');
      expect(collection.id).toBeDefined();
      expect(collection.createdAt).toBeDefined();
      expect(collection.order).toBe(1);
    });

    it('should persist collection to storage', async () => {
      await createCollection({ name: 'Trabalho' });

      const collections = await getCollections();
      expect(collections).toHaveLength(1);
      expect(collections[0].name).toBe('Trabalho');
    });

    it('should generate unique ID for each collection', async () => {
      const col1 = await createCollection({ name: 'Coleção 1' });
      const col2 = await createCollection({ name: 'Coleção 2' });

      expect(col1.id).not.toBe(col2.id);
    });

    it('should assign incremental order values', async () => {
      const col1 = await createCollection({ name: 'Primeira' });
      const col2 = await createCollection({ name: 'Segunda' });
      const col3 = await createCollection({ name: 'Terceira' });

      expect(col1.order).toBe(1);
      expect(col2.order).toBe(2);
      expect(col3.order).toBe(3);
    });

    it('should trim whitespace from name', async () => {
      const collection = await createCollection({ name: '  Espaços  ' });

      expect(collection.name).toBe('Espaços');
    });

    it('should handle creation with optional color', async () => {
      const collection = await createCollection({
        name: 'Colorida',
        color: '#FF5733',
      });

      expect(collection.color).toBe('#FF5733');
    });

    it('should maintain existing collections when adding new one', async () => {
      const existing = createMockCollection({ id: 'existing-1', name: 'Existing', order: 0 });
      await saveCollections([existing]);

      await createCollection({ name: 'Nova' });

      const collections = await getCollections();
      expect(collections).toHaveLength(2);
      expect(collections.map((c) => c.name)).toContain('Existing');
      expect(collections.map((c) => c.name)).toContain('Nova');
    });
  });

  describe('validation errors', () => {
    it('should throw StorageError for empty name', async () => {
      await expect(createCollection({ name: '' })).rejects.toThrow(StorageError);
      await expect(createCollection({ name: '' })).rejects.toThrow(
        COLLECTION_NAME_ERRORS.EMPTY
      );
    });

    it('should throw StorageError for whitespace-only name', async () => {
      await expect(createCollection({ name: '   ' })).rejects.toThrow(StorageError);
    });

    it('should throw StorageError for duplicate name', async () => {
      await createCollection({ name: 'Duplicada' });

      await expect(createCollection({ name: 'Duplicada' })).rejects.toThrow(StorageError);
      await expect(createCollection({ name: 'Duplicada' })).rejects.toThrow(
        COLLECTION_NAME_ERRORS.DUPLICATE
      );
    });

    it('should throw StorageError for case-insensitive duplicate', async () => {
      await createCollection({ name: 'Trabalho' });

      await expect(createCollection({ name: 'trabalho' })).rejects.toThrow(StorageError);
      await expect(createCollection({ name: 'TRABALHO' })).rejects.toThrow(StorageError);
    });
  });

  describe('storage integration', () => {
    it('should call chrome.storage.local.set', async () => {
      await createCollection({ name: 'Test' });

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(chrome.storage.local.set).toHaveBeenCalled();
    });

    it('should persist data that survives multiple getCollections calls', async () => {
      await createCollection({ name: 'Persistente' });

      const first = await getCollections();
      const second = await getCollections();

      expect(first).toEqual(second);
      expect(first[0].name).toBe('Persistente');
    });
  });

  describe('order calculation', () => {
    it('should start with order 1 when no collections exist', async () => {
      const collection = await createCollection({ name: 'First' });
      expect(collection.order).toBe(1);
    });

    it('should use max existing order + 1', async () => {
      await saveCollections([
        createMockCollection({ id: 'col-1', order: 5 }),
        createMockCollection({ id: 'col-2', order: 10 }),
      ]);

      const newCollection = await createCollection({ name: 'New' });
      expect(newCollection.order).toBe(11);
    });
  });
});
