/**
 * Svelte store for managing links state.
 * Provides reactive state management with persistence to chrome.storage.local.
 */

import { writable, derived, type Writable } from 'svelte/store';
import type { Link, Collection } from '@/lib/types';
import { INBOX_COLLECTION_ID } from '@/lib/types';
import {
  getLinks,
  saveLinks,
  getCollections,
  initializeInbox,
  removeCollection as storageRemoveCollection,
  createCollection as storageCreateCollection,
  validateCollectionName,
  type ValidationResult,
} from '@/lib/storage';

interface LinksState {
  links: Link[];
  collections: Collection[];
  loading: boolean;
  error: string | null;
  isAdding: boolean;
  isRemoving: Set<string>;
}

const INBOX_COLLECTION: Collection = {
  id: INBOX_COLLECTION_ID,
  name: 'Inbox',
  order: 0,
  isDefault: true,
};

function createLinksStore(): Writable<LinksState> & {
  load: () => Promise<void>;
  addLink: (link: Omit<Link, 'id' | 'createdAt'>) => Promise<void>;
  removeLink: (id: string) => Promise<void>;
  addCollection: (name: string) => Promise<Collection>;
  removeCollection: (id: string) => Promise<void>;
  getCollectionNames: () => string[];
  validateCollection: (name: string) => ValidationResult;
} {
  const { subscribe, set, update } = writable<LinksState>({
    links: [],
    collections: [INBOX_COLLECTION],
    loading: true,
    error: null,
    isAdding: false,
    isRemoving: new Set(),
  });

  async function load(): Promise<void> {
    update((state) => ({ ...state, loading: true, error: null }));

    try {
      await initializeInbox();
      const [links, collections] = await Promise.all([getLinks(), getCollections()]);

      update((state) => ({
        ...state,
        links: links.sort((a, b) => b.createdAt - a.createdAt),
        collections,
        loading: false,
        error: null,
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load data';
      update((state) => ({ ...state, loading: false, error: message }));
    }
  }

  async function addLink(linkData: Omit<Link, 'id' | 'createdAt'>): Promise<void> {
    let currentState: LinksState | null = null;
    update((state) => {
      currentState = state;
      return state;
    });

    if (currentState!.isAdding) {
      return;
    }

    const newLink: Link = {
      ...linkData,
      id: crypto.randomUUID(),
      createdAt: Date.now(),
    };

    let linksToSave: Link[] = [];
    update((state) => {
      linksToSave = [newLink, ...state.links];
      return {
        ...state,
        links: linksToSave,
        isAdding: true,
      };
    });

    try {
      await saveLinks(linksToSave);
    } catch (error) {
      update((state) => ({
        ...state,
        links: state.links.filter((l) => l.id !== newLink.id),
        error: 'Failed to save link',
      }));
    } finally {
      update((state) => ({ ...state, isAdding: false }));
    }
  }

  async function removeLink(id: string): Promise<void> {
    let currentState: LinksState | null = null;
    update((state) => {
      currentState = state;
      return state;
    });

    if (currentState!.isRemoving.has(id)) {
      return;
    }

    let removedLink: Link | undefined;
    let linksToSave: Link[] = [];

    update((state) => {
      removedLink = state.links.find((l) => l.id === id);
      linksToSave = state.links.filter((l) => l.id !== id);
      const newIsRemoving = new Set(state.isRemoving);
      newIsRemoving.add(id);
      return {
        ...state,
        links: linksToSave,
        isRemoving: newIsRemoving,
      };
    });

    try {
      await saveLinks(linksToSave);
    } catch (error) {
      if (removedLink) {
        update((state) => ({
          ...state,
          links: [...state.links, removedLink!].sort((a, b) => b.createdAt - a.createdAt),
          error: 'Failed to remove link',
        }));
      }
    } finally {
      update((state) => {
        const newIsRemoving = new Set(state.isRemoving);
        newIsRemoving.delete(id);
        return { ...state, isRemoving: newIsRemoving };
      });
    }
  }

  function getCollectionNames(): string[] {
    let names: string[] = [];
    update((state) => {
      names = state.collections.map((c) => c.name);
      return state;
    });
    return names;
  }

  function validateCollection(name: string): ValidationResult {
    let currentCollections: Collection[] = [];
    update((state) => {
      currentCollections = state.collections;
      return state;
    });
    return validateCollectionName(name, currentCollections);
  }

  async function addCollection(name: string): Promise<Collection> {
    try {
      const newCollection = await storageCreateCollection({ name });

      update((state) => ({
        ...state,
        collections: [...state.collections, newCollection].sort((a, b) => a.order - b.order),
      }));

      return newCollection;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save collection';
      update((state) => ({ ...state, error: message }));
      throw error;
    }
  }

  async function removeCollection(id: string): Promise<void> {
    if (id === INBOX_COLLECTION_ID) {
      return;
    }

    let previousLinks: Link[] = [];
    let previousCollections: Collection[] = [];

    update((state) => {
      previousLinks = state.links;
      previousCollections = state.collections;
      return {
        ...state,
        collections: state.collections.filter((c) => c.id !== id),
        links: state.links.map((l) =>
          l.collectionId === id ? { ...l, collectionId: INBOX_COLLECTION_ID } : l
        ),
      };
    });

    try {
      await storageRemoveCollection(id);
    } catch (error) {
      update((state) => ({
        ...state,
        links: previousLinks,
        collections: previousCollections,
        error: 'Failed to remove collection',
      }));
    }
  }

  return {
    subscribe,
    set,
    update,
    load,
    addLink,
    removeLink,
    addCollection,
    removeCollection,
    getCollectionNames,
    validateCollection,
  };
}

export const linksStore = createLinksStore();

export const linksByCollection = derived(linksStore, ($store) => {
  const grouped = new Map<string, Link[]>();

  for (const collection of $store.collections) {
    grouped.set(collection.id, []);
  }

  for (const link of $store.links) {
    let links = grouped.get(link.collectionId);
    if (!links) {
      links = grouped.get(INBOX_COLLECTION_ID);
      if (!links) {
        links = [];
        grouped.set(INBOX_COLLECTION_ID, links);
      }
    }
    links.push(link);
  }

  return grouped;
});
