/**
 * Collection filter store tests.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { get } from 'svelte/store';

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

describe('collectionFilterStore', () => {
  beforeEach(() => {
    vi.resetModules();
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should initialize with ALL_COLLECTIONS_FILTER when no stored value', async () => {
    const {
      collectionFilterStore,
      ALL_COLLECTIONS_FILTER,
    } = await import('@/popup/stores/collectionFilter');

    const state = get(collectionFilterStore);
    expect(state.selectedCollectionId).toBe(ALL_COLLECTIONS_FILTER);
    expect(state.initialized).toBe(true);
  });

  it('should restore stored value on initialization', async () => {
    localStorageMock.setItem('tabala_collection_filter', 'inbox');

    const { collectionFilterStore } = await import(
      '@/popup/stores/collectionFilter'
    );

    const state = get(collectionFilterStore);
    expect(state.selectedCollectionId).toBe('inbox');
  });

  it('should update selected collection on select()', async () => {
    const { collectionFilterStore } = await import(
      '@/popup/stores/collectionFilter'
    );

    collectionFilterStore.select('work');

    const state = get(collectionFilterStore);
    expect(state.selectedCollectionId).toBe('work');
  });

  it('should persist selection to localStorage', async () => {
    const { collectionFilterStore } = await import(
      '@/popup/stores/collectionFilter'
    );

    collectionFilterStore.select('projects');

    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'tabala_collection_filter',
      'projects'
    );
  });

  it('should reset to ALL_COLLECTIONS_FILTER on reset()', async () => {
    const {
      collectionFilterStore,
      ALL_COLLECTIONS_FILTER,
    } = await import('@/popup/stores/collectionFilter');

    collectionFilterStore.select('work');
    collectionFilterStore.reset();

    const state = get(collectionFilterStore);
    expect(state.selectedCollectionId).toBe(ALL_COLLECTIONS_FILTER);
  });

  it('should validate selection and reset if collection not found', async () => {
    const {
      collectionFilterStore,
      ALL_COLLECTIONS_FILTER,
    } = await import('@/popup/stores/collectionFilter');

    collectionFilterStore.select('deleted-collection');
    collectionFilterStore.validateSelection(['inbox', 'work']);

    const state = get(collectionFilterStore);
    expect(state.selectedCollectionId).toBe(ALL_COLLECTIONS_FILTER);
  });

  it('should keep valid selection after validateSelection', async () => {
    const { collectionFilterStore } = await import(
      '@/popup/stores/collectionFilter'
    );

    collectionFilterStore.select('work');
    collectionFilterStore.validateSelection(['inbox', 'work', 'projects']);

    const state = get(collectionFilterStore);
    expect(state.selectedCollectionId).toBe('work');
  });

  it('should not reset ALL_COLLECTIONS_FILTER during validation', async () => {
    const {
      collectionFilterStore,
      ALL_COLLECTIONS_FILTER,
    } = await import('@/popup/stores/collectionFilter');

    collectionFilterStore.select(ALL_COLLECTIONS_FILTER);
    collectionFilterStore.validateSelection(['inbox']);

    const state = get(collectionFilterStore);
    expect(state.selectedCollectionId).toBe(ALL_COLLECTIONS_FILTER);
  });
});

describe('selectedCollectionId derived store', () => {
  beforeEach(() => {
    vi.resetModules();
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  it('should derive selected collection ID from main store', async () => {
    const { collectionFilterStore, selectedCollectionId } = await import(
      '@/popup/stores/collectionFilter'
    );

    collectionFilterStore.select('inbox');

    const value = get(selectedCollectionId);
    expect(value).toBe('inbox');
  });
});

describe('isFiltered derived store', () => {
  beforeEach(() => {
    vi.resetModules();
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  it('should return false when ALL_COLLECTIONS_FILTER is selected', async () => {
    const {
      collectionFilterStore,
      isFiltered,
      ALL_COLLECTIONS_FILTER,
    } = await import('@/popup/stores/collectionFilter');

    collectionFilterStore.select(ALL_COLLECTIONS_FILTER);

    const value = get(isFiltered);
    expect(value).toBe(false);
  });

  it('should return true when a specific collection is selected', async () => {
    const { collectionFilterStore, isFiltered } = await import(
      '@/popup/stores/collectionFilter'
    );

    collectionFilterStore.select('inbox');

    const value = get(isFiltered);
    expect(value).toBe(true);
  });
});
