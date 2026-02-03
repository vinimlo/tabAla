/**
 * Svelte store for managing links state.
 * Provides reactive state management with persistence to chrome.storage.local.
 */

import { writable, derived, type Writable } from 'svelte/store';
import type { Link, Collection } from '@/lib/types';
import { getLinks, saveLinks, getCollections, saveCollections } from '@/lib/storage';

interface LinksState {
  links: Link[];
  collections: Collection[];
  loading: boolean;
  error: string | null;
  isAdding: boolean;
  isRemoving: Set<string>;
}

const INBOX_COLLECTION: Collection = {
  id: 'inbox',
  name: 'Inbox',
  order: 0,
};

function createLinksStore(): Writable<LinksState> & {
  load: () => Promise<void>;
  addLink: (link: Omit<Link, 'id' | 'createdAt'>) => Promise<void>;
  removeLink: (id: string) => Promise<void>;
  addCollection: (name: string) => Promise<Collection>;
  removeCollection: (id: string) => Promise<void>;
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
      const [links, collections] = await Promise.all([getLinks(), getCollections()]);

      const hasInbox = collections.some((c) => c.id === 'inbox');
      const finalCollections = hasInbox ? collections : [INBOX_COLLECTION, ...collections];

      if (!hasInbox) {
        await saveCollections(finalCollections);
      }

      update((state) => ({
        ...state,
        links: links.sort((a, b) => b.createdAt - a.createdAt),
        collections: finalCollections.sort((a, b) => a.order - b.order),
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

  async function addCollection(name: string): Promise<Collection> {
    let currentCollections: Collection[] = [];
    update((state) => {
      currentCollections = state.collections;
      return state;
    });

    const orders: number[] = currentCollections.map((c: Collection): number => c.order);
    const maxOrder = orders.length > 0 ? Math.max(...orders) : 0;
    const newCollection: Collection = {
      id: crypto.randomUUID(),
      name,
      order: maxOrder + 1,
    };

    let collectionsToSave: Collection[] = [];
    update((state) => {
      collectionsToSave = [...state.collections, newCollection].sort((a, b) => a.order - b.order);
      return {
        ...state,
        collections: collectionsToSave,
      };
    });

    try {
      await saveCollections(collectionsToSave);
    } catch (error) {
      update((state) => ({
        ...state,
        collections: state.collections.filter((c) => c.id !== newCollection.id),
        error: 'Failed to save collection',
      }));
    }

    return newCollection;
  }

  async function removeCollection(id: string): Promise<void> {
    if (id === 'inbox') {
      return;
    }

    let linksToSave: Link[] = [];
    let collectionsToSave: Collection[] = [];
    let previousLinks: Link[] = [];
    let previousCollections: Collection[] = [];

    update((state) => {
      previousLinks = state.links;
      previousCollections = state.collections;
      linksToSave = state.links.map((l) =>
        l.collectionId === id ? { ...l, collectionId: 'inbox' } : l
      );
      collectionsToSave = state.collections.filter((c) => c.id !== id);
      return {
        ...state,
        collections: collectionsToSave,
        links: linksToSave,
      };
    });

    try {
      await Promise.all([saveLinks(linksToSave), saveCollections(collectionsToSave)]);
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
  };
}

export const linksStore = createLinksStore();

export const linksByCollection = derived(linksStore, ($store) => {
  const grouped = new Map<string, Link[]>();

  for (const collection of $store.collections) {
    grouped.set(collection.id, []);
  }

  for (const link of $store.links) {
    const links = grouped.get(link.collectionId) ?? grouped.get('inbox')!;
    links.push(link);
  }

  return grouped;
});
