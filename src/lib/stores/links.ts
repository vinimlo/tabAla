/**
 * Svelte store for managing links state.
 * Provides reactive state management with persistence to chrome.storage.local.
 *
 * This is a shared store used by both popup and newtab interfaces.
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
  renameCollection as storageRenameCollection,
  moveLink as storageMoveLink,
  updateCollectionOrder as storageUpdateCollectionOrder,
  storage,
} from '@/lib/storage';
import { validateCollectionName, type ValidationResult } from '@/lib/validation';

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
  moveLink: (linkId: string, toCollectionId: string) => Promise<void>;
  addCollection: (name: string) => Promise<Collection>;
  removeCollection: (id: string) => Promise<void>;
  renameCollection: (id: string, newName: string) => Promise<void>;
  reorderCollections: (orderedCollections: Collection[]) => Promise<void>;
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

  // Watch for storage changes from other contexts (popup <-> newtab)
  storage.watch((changes) => {
    if (changes.links?.newValue || changes.collections?.newValue) {
      update((state) => ({
        ...state,
        links: changes.links?.newValue as Link[] ?? state.links,
        collections: changes.collections?.newValue as Collection[] ?? state.collections,
      }));
    }
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

  async function moveLink(linkId: string, toCollectionId: string): Promise<void> {
    let previousLinks: Link[] = [];

    update((state) => {
      previousLinks = state.links;
      const updatedLinks = state.links.map((link) =>
        link.id === linkId ? { ...link, collectionId: toCollectionId } : link
      );
      return {
        ...state,
        links: updatedLinks,
      };
    });

    try {
      const result = await storageMoveLink(linkId, toCollectionId);
      if (!result.success) {
        update((state) => ({
          ...state,
          links: previousLinks,
          error: result.error ?? 'Erro ao mover link',
        }));
      }
    } catch (error) {
      update((state) => ({
        ...state,
        links: previousLinks,
        error: 'Erro ao mover link',
      }));
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
    return validateCollectionName(name, '', currentCollections);
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

  async function renameCollection(id: string, newName: string): Promise<void> {
    let previousCollections: Collection[] = [];

    update((state) => {
      previousCollections = state.collections;
      const updatedCollections = state.collections.map((c) =>
        c.id === id ? { ...c, name: newName } : c
      );
      return {
        ...state,
        collections: updatedCollections,
      };
    });

    try {
      const result = await storageRenameCollection(id, newName);
      if (!result.success) {
        update((state) => ({
          ...state,
          collections: previousCollections,
          error: result.error ?? 'Erro ao renomear coleção',
        }));
      }
    } catch (error) {
      update((state) => ({
        ...state,
        collections: previousCollections,
        error: 'Erro ao renomear coleção',
      }));
    }
  }

  async function reorderCollections(orderedCollections: Collection[]): Promise<void> {
    let previousCollections: Collection[] = [];

    update((state) => {
      previousCollections = state.collections;
      return {
        ...state,
        collections: orderedCollections,
      };
    });

    try {
      const result = await storageUpdateCollectionOrder(orderedCollections);
      if (!result.success) {
        update((state) => ({
          ...state,
          collections: previousCollections,
          error: result.error ?? 'Erro ao reordenar coleções',
        }));
      }
    } catch (error) {
      update((state) => ({
        ...state,
        collections: previousCollections,
        error: 'Erro ao reordenar coleções',
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
    moveLink,
    addCollection,
    removeCollection,
    getCollectionNames,
    validateCollection,
    renameCollection,
    reorderCollections,
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

// Stats derived store for status bar
export const linksStats = derived(linksStore, ($store) => {
  const lastLink = $store.links[0];
  return {
    totalLinks: $store.links.length,
    totalCollections: $store.collections.length,
    lastSavedAt: lastLink?.createdAt ?? null,
  };
});
