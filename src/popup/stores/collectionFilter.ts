/**
 * Svelte store for managing collection filter state.
 * Provides reactive state management with persistence to localStorage.
 */

import { writable, derived, type Readable } from 'svelte/store';

/**
 * Special value representing "show all collections" filter.
 */
export const ALL_COLLECTIONS_FILTER = '__all__';

/**
 * Storage key for persisting the selected collection filter.
 */
const STORAGE_KEY = 'tabala_collection_filter';

/**
 * Represents the current filter state.
 * - null or ALL_COLLECTIONS_FILTER: show all links
 * - string (collection id): show only links from that collection
 */
export type CollectionFilterValue = string | null;

interface CollectionFilterState {
  selectedCollectionId: CollectionFilterValue;
  initialized: boolean;
}

function loadFromStorage(): CollectionFilterValue {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === null) {
      return ALL_COLLECTIONS_FILTER;
    }
    return stored;
  } catch {
    return ALL_COLLECTIONS_FILTER;
  }
}

function saveToStorage(value: CollectionFilterValue): void {
  try {
    if (value === null || value === ALL_COLLECTIONS_FILTER) {
      localStorage.setItem(STORAGE_KEY, ALL_COLLECTIONS_FILTER);
    } else {
      localStorage.setItem(STORAGE_KEY, value);
    }
  } catch {
    // Silently fail if localStorage is not available
  }
}

interface CollectionFilterStore {
  subscribe: (run: (value: CollectionFilterState) => void) => () => void;
  select: (collectionId: CollectionFilterValue) => void;
  reset: () => void;
  validateSelection: (validCollectionIds: string[]) => void;
}

function createCollectionFilterStore(): CollectionFilterStore {
  const initialValue = loadFromStorage();

  const { subscribe, set, update } = writable<CollectionFilterState>({
    selectedCollectionId: initialValue,
    initialized: true,
  });

  return {
    subscribe,

    /**
     * Sets the selected collection filter.
     * @param collectionId - Collection ID to filter by, or ALL_COLLECTIONS_FILTER for all
     */
    select(collectionId: CollectionFilterValue): void {
      const value = collectionId ?? ALL_COLLECTIONS_FILTER;
      saveToStorage(value);
      update((state) => ({
        ...state,
        selectedCollectionId: value,
      }));
    },

    /**
     * Resets the filter to show all collections.
     */
    reset(): void {
      saveToStorage(ALL_COLLECTIONS_FILTER);
      set({
        selectedCollectionId: ALL_COLLECTIONS_FILTER,
        initialized: true,
      });
    },

    /**
     * Validates that the selected collection still exists.
     * If not, resets to ALL_COLLECTIONS_FILTER.
     * @param validCollectionIds - Array of valid collection IDs
     */
    validateSelection(validCollectionIds: string[]): void {
      update((state) => {
        if (
          state.selectedCollectionId !== ALL_COLLECTIONS_FILTER &&
          state.selectedCollectionId !== null &&
          !validCollectionIds.includes(state.selectedCollectionId)
        ) {
          saveToStorage(ALL_COLLECTIONS_FILTER);
          return {
            ...state,
            selectedCollectionId: ALL_COLLECTIONS_FILTER,
          };
        }
        return state;
      });
    },
  };
}

export const collectionFilterStore = createCollectionFilterStore();

/**
 * Derived store that provides just the selected collection ID.
 */
export const selectedCollectionId: Readable<CollectionFilterValue> = derived(
  collectionFilterStore,
  ($store) => $store.selectedCollectionId
);

/**
 * Derived store that indicates if a specific collection is selected (not "All").
 */
export const isFiltered: Readable<boolean> = derived(
  collectionFilterStore,
  ($store) =>
    $store.selectedCollectionId !== ALL_COLLECTIONS_FILTER &&
    $store.selectedCollectionId !== null
);
