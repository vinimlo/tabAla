/**
 * Integration tests for create collection flow.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { get } from 'svelte/store';
import { linksStore } from '@/popup/stores/links';
import * as storage from '@/lib/storage';
import { mockStorage } from '../setup';
import type { Collection } from '@/lib/types';

vi.mock('@/lib/storage', async () => {
  const actual = await vi.importActual<typeof storage>('@/lib/storage');
  return {
    ...actual,
    initializeInbox: vi.fn(() => Promise.resolve()),
  };
});

describe('Create Collection Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.keys(mockStorage).forEach((key) => delete mockStorage[key]);

    linksStore.set({
      links: [],
      collections: [{ id: 'inbox', name: 'Inbox', order: 0, isDefault: true }],
      loading: false,
      error: null,
      isAdding: false,
      isRemoving: new Set(),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('successful creation flow', () => {
    it('should create collection and update store', async () => {
      const newCollection = await linksStore.addCollection('Estudos');

      const state = get(linksStore);
      expect(state.collections).toHaveLength(2);
      expect(state.collections.map((c) => c.name)).toContain('Estudos');
      expect(newCollection.name).toBe('Estudos');
    });

    it('should persist collection to storage', async () => {
      await linksStore.addCollection('Trabalho');

      const collections = await storage.getCollections();
      expect(collections.map((c) => c.name)).toContain('Trabalho');
    });

    it('should maintain Inbox as first collection', async () => {
      await linksStore.addCollection('Projetos');

      const state = get(linksStore);
      const sortedCollections = [...state.collections].sort((a, b) => a.order - b.order);
      expect(sortedCollections[0].id).toBe('inbox');
    });

    it('should generate unique IDs for multiple collections', async () => {
      const col1 = await linksStore.addCollection('Coleção 1');
      const col2 = await linksStore.addCollection('Coleção 2');

      expect(col1.id).not.toBe(col2.id);
      expect(col1.id).toBeDefined();
      expect(col2.id).toBeDefined();
    });

    it('should set createdAt timestamp', async () => {
      const before = Date.now();
      const collection = await linksStore.addCollection('Timestamped');
      const after = Date.now();

      expect(collection.createdAt).toBeGreaterThanOrEqual(before);
      expect(collection.createdAt).toBeLessThanOrEqual(after);
    });
  });

  describe('validation flow', () => {
    it('should reject empty name', async () => {
      await expect(linksStore.addCollection('')).rejects.toThrow(
        'Nome da coleção não pode estar vazio'
      );

      const state = get(linksStore);
      expect(state.collections).toHaveLength(1);
    });

    it('should reject duplicate name', async () => {
      await linksStore.addCollection('Duplicada');

      await expect(linksStore.addCollection('Duplicada')).rejects.toThrow(
        'Já existe uma coleção com este nome'
      );

      const state = get(linksStore);
      expect(state.collections.filter((c) => c.name === 'Duplicada')).toHaveLength(1);
    });

    it('should reject case-insensitive duplicate', async () => {
      await linksStore.addCollection('CaseSensitive');

      await expect(linksStore.addCollection('casesensitive')).rejects.toThrow(
        'Já existe uma coleção com este nome'
      );
    });

    it('should validate using getCollectionNames', () => {
      linksStore.set({
        links: [],
        collections: [
          { id: 'inbox', name: 'Inbox', order: 0, isDefault: true },
          { id: 'col-1', name: 'Trabalho', order: 1 },
        ],
        loading: false,
        error: null,
        isAdding: false,
        isRemoving: new Set(),
      });

      const names = linksStore.getCollectionNames();
      expect(names).toContain('Inbox');
      expect(names).toContain('Trabalho');
    });

    it('should use validateCollection helper', () => {
      linksStore.set({
        links: [],
        collections: [
          { id: 'inbox', name: 'Inbox', order: 0, isDefault: true },
          { id: 'col-1', name: 'Existente', order: 1 },
        ],
        loading: false,
        error: null,
        isAdding: false,
        isRemoving: new Set(),
      });

      const validResult = linksStore.validateCollection('Novo');
      expect(validResult.valid).toBe(true);

      const invalidResult = linksStore.validateCollection('Existente');
      expect(invalidResult.valid).toBe(false);
      expect(invalidResult.error).toBe('Já existe uma coleção com este nome');
    });
  });

  describe('persistence across reloads', () => {
    it('should persist collection after store reload', async () => {
      await linksStore.addCollection('Persistente');

      linksStore.set({
        links: [],
        collections: [{ id: 'inbox', name: 'Inbox', order: 0, isDefault: true }],
        loading: true,
        error: null,
        isAdding: false,
        isRemoving: new Set(),
      });

      await linksStore.load();

      const state = get(linksStore);
      const names = state.collections.map((c) => c.name);
      expect(names).toContain('Persistente');
    });
  });

  describe('error handling', () => {
    it('should set error state on failure', async () => {
      vi.spyOn(storage, 'createCollection').mockRejectedValueOnce(
        new Error('Storage failure')
      );

      await expect(linksStore.addCollection('Test')).rejects.toThrow();

      const state = get(linksStore);
      expect(state.error).toContain('Storage failure');
    });

    it('should not add collection to store on failure', async () => {
      vi.spyOn(storage, 'createCollection').mockRejectedValueOnce(
        new Error('Storage failure')
      );

      const initialState = get(linksStore);
      const initialCount = initialState.collections.length;

      await expect(linksStore.addCollection('FailedCollection')).rejects.toThrow();

      const finalState = get(linksStore);
      expect(finalState.collections.length).toBe(initialCount);
    });
  });

  describe('store reactivity', () => {
    it('should notify subscribers when collection is added', async () => {
      const updates: Collection[][] = [];
      const unsubscribe = linksStore.subscribe((state) => {
        updates.push([...state.collections]);
      });

      await linksStore.addCollection('Nova');

      expect(updates.length).toBeGreaterThan(1);
      const lastUpdate = updates[updates.length - 1];
      expect(lastUpdate.map((c) => c.name)).toContain('Nova');

      unsubscribe();
    });

    it('should maintain sorted order in collections', async () => {
      await linksStore.addCollection('Z Collection');
      await linksStore.addCollection('A Collection');

      const state = get(linksStore);
      const nonInbox = state.collections.filter((c) => c.id !== 'inbox');
      expect(nonInbox[0].order).toBeLessThan(nonInbox[1].order);
    });
  });
});
