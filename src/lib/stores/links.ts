import { writable, derived, get, type Writable } from 'svelte/store';
import { type Link, type Collection, INBOX_COLLECTION_ID } from '@/lib/types';
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
  recoverOrphanedLinks,
  getErrorMessage,
  storage,
} from '@/lib/storage';
import { validateCollectionName, type ValidationResult } from '@/lib/validation';
import { t } from '@/lib/i18n';
import { optimisticUpdate } from './helpers';

interface LinksState {
  links: Link[];
  collections: Collection[];
  loading: boolean;
  error: string | null;
  isAdding: boolean;
  isRemoving: Set<string>;
  pendingLocalUpdate: boolean; // Flag to ignore storage.watch() during local operations
}

/**
 * Remove duplicate links by ID, keeping the first occurrence.
 * This prevents race conditions from creating duplicate entries.
 */
function deduplicateLinks(links: Link[]): Link[] {
  const seen = new Set<string>();
  return links.filter((link) => {
    if (seen.has(link.id)) { return false; }
    seen.add(link.id);
    return true;
  });
}

function createLinksStore(): Writable<LinksState> & {
  load: () => Promise<void>;
  addLink: (link: Omit<Link, 'id' | 'createdAt'>) => Promise<void>;
  removeLink: (id: string) => Promise<void>;
  moveLink: (linkId: string, toCollectionId: string) => Promise<void>;
  addCollection: (name: string, workspaceId?: string) => Promise<Collection>;
  removeCollection: (id: string) => Promise<void>;
  renameCollection: (id: string, newName: string) => Promise<void>;
  reorderCollections: (orderedCollections: Collection[]) => Promise<void>;
  getCollectionNames: () => string[];
  validateCollection: (name: string) => ValidationResult;
} {
  const store = writable<LinksState>({
    links: [],
    collections: [],
    loading: true,
    error: null,
    isAdding: false,
    isRemoving: new Set(),
    pendingLocalUpdate: false,
  });
  const { subscribe, set, update } = store;

  // Watch for storage changes from other contexts (popup <-> newtab)
  storage.watch((changes) => {
    if (changes.links?.newValue !== undefined || changes.collections?.newValue !== undefined) {
      update((state) => {
        // Ignore storage updates triggered by our own local operations
        if (state.pendingLocalUpdate) {
          return state;
        }
        const newLinks = (changes.links?.newValue as Link[]) ?? state.links;
        return {
          ...state,
          links: deduplicateLinks(newLinks),
          collections: (changes.collections?.newValue as Collection[]) ?? state.collections,
        };
      });
    }
  });

  async function load(): Promise<void> {
    update((state) => ({ ...state, loading: true, error: null }));

    try {
      await initializeInbox();
      await recoverOrphanedLinks();
      const [linksData, collections] = await Promise.all([getLinks(), getCollections()]);
      const links = deduplicateLinks(linksData.sort((a, b) => b.createdAt - a.createdAt));

      update((state) => ({
        ...state,
        links,
        collections,
        loading: false,
        error: null,
      }));
    } catch (error) {
      const message = getErrorMessage(error, 'Failed to load data');
      update((state) => ({ ...state, loading: false, error: message }));
    }
  }

  async function addLink(linkData: Omit<Link, 'id' | 'createdAt'>): Promise<void> {
    const newLink: Link = {
      ...linkData,
      id: crypto.randomUUID(),
      createdAt: Date.now(),
    };
    let linksToSave: Link[] = [];

    await optimisticUpdate(
      store,
      (state) => {
        if (state.isAdding) {
          return null;
        }
        linksToSave = [newLink, ...state.links];
        return {
          updated: { ...state, links: linksToSave, isAdding: true },
          rollback: { links: state.links } as Partial<LinksState>,
        };
      },
      async () => {
        await saveLinks(linksToSave);
        return null;
      },
      'Failed to save link',
      { isAdding: false } as Partial<LinksState>
    );
  }

  async function removeLink(id: string): Promise<void> {
    let linksToSave: Link[] = [];

    await optimisticUpdate(
      store,
      (state) => {
        // Per-link guard prevents duplicate removal from rapid clicks
        if (state.isRemoving.has(id)) {
          return null;
        }
        const removedLink = state.links.find((l) => l.id === id);
        linksToSave = state.links.filter((l) => l.id !== id);
        const newIsRemoving = new Set(state.isRemoving);
        newIsRemoving.add(id);
        return {
          updated: { ...state, links: linksToSave, isRemoving: newIsRemoving },
          rollback: removedLink
            ? { links: [...linksToSave, removedLink].sort((a, b) => b.createdAt - a.createdAt) } as Partial<LinksState>
            : {},
        };
      },
      async () => {
        await saveLinks(linksToSave);
        return null;
      },
      'Failed to remove link',
      (state) => {
        const newIsRemoving = new Set(state.isRemoving);
        newIsRemoving.delete(id);
        return { isRemoving: newIsRemoving } as Partial<LinksState>;
      }
    );
  }

  async function moveLink(linkId: string, toCollectionId: string): Promise<void> {
    await optimisticUpdate(
      store,
      (state) => ({
        updated: {
          ...state,
          links: state.links.map((link) =>
            link.id === linkId ? { ...link, collectionId: toCollectionId } : link
          ),
        },
        rollback: { links: state.links } as Partial<LinksState>,
      }),
      async () => {
        const result = await storageMoveLink(linkId, toCollectionId);
        return result.success ? null : (result.error ?? t('error_move_link_failed'));
      },
      t('error_move_link_failed')
    );
  }

  function getCollectionNames(): string[] {
    return get(store).collections.map((c) => c.name);
  }

  function validateCollection(name: string): ValidationResult {
    return validateCollectionName(name, '', get(store).collections);
  }

  async function addCollection(name: string, workspaceId?: string): Promise<Collection> {
    update((state) => ({
      ...state,
      pendingLocalUpdate: true,
    }));

    try {
      const newCollection = await storageCreateCollection({ name, workspaceId });

      update((state) => ({
        ...state,
        collections: [...state.collections, newCollection].sort((a, b) => a.order - b.order),
      }));

      return newCollection;
    } catch (error) {
      const message = getErrorMessage(error, 'Failed to save collection');
      update((state) => ({ ...state, error: message }));
      throw error;
    } finally {
      update((state) => ({
        ...state,
        pendingLocalUpdate: false,
      }));
    }
  }

  async function removeCollection(id: string): Promise<void> {
    if (id === INBOX_COLLECTION_ID) {
      return;
    }

    await optimisticUpdate(
      store,
      (state) => ({
        updated: {
          ...state,
          collections: state.collections.filter((c) => c.id !== id),
          links: state.links.map((l) =>
            l.collectionId === id ? { ...l, collectionId: INBOX_COLLECTION_ID } : l
          ),
        },
        rollback: { links: state.links, collections: state.collections } as Partial<LinksState>,
      }),
      async () => {
        await storageRemoveCollection(id);
        return null;
      },
      'Failed to remove collection'
    );
  }

  async function renameCollection(id: string, newName: string): Promise<void> {
    await optimisticUpdate(
      store,
      (state) => ({
        updated: {
          ...state,
          collections: state.collections.map((c) =>
            c.id === id ? { ...c, name: newName } : c
          ),
        },
        rollback: { collections: state.collections } as Partial<LinksState>,
      }),
      async () => {
        const result = await storageRenameCollection(id, newName);
        return result.success ? null : (result.error ?? t('error_rename_collection_storage'));
      },
      t('error_rename_collection_storage')
    );
  }

  async function reorderCollections(orderedCollections: Collection[]): Promise<void> {
    await optimisticUpdate(
      store,
      (state) => {
        const reorderedIds = new Set(orderedCollections.map((c) => c.id));
        const merged = [
          ...orderedCollections,
          ...state.collections.filter((c) => !reorderedIds.has(c.id)),
        ];
        return {
          updated: { ...state, collections: merged },
          rollback: { collections: state.collections } as Partial<LinksState>,
        };
      },
      async () => {
        const result = await storageUpdateCollectionOrder(orderedCollections);
        return result.success ? null : (result.error ?? t('error_reorder_collections_failed'));
      },
      t('error_reorder_collections_failed')
    );
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

