/**
 * Svelte store for managing workspaces state.
 * Provides reactive state management with persistence to chrome.storage.local.
 *
 * This is a shared store used by both popup and newtab interfaces.
 */

import { writable, derived, type Readable } from 'svelte/store';
import type { Workspace, CreateWorkspaceInput, Collection } from '@/lib/types';
import { DEFAULT_WORKSPACE_ID, INBOX_COLLECTION_ID } from '@/lib/types';
import {
  getWorkspaces,
  createWorkspace as storageCreateWorkspace,
  updateWorkspace as storageUpdateWorkspace,
  deleteWorkspace as storageDeleteWorkspace,
  updateWorkspaceOrder as storageUpdateWorkspaceOrder,
  moveCollectionToWorkspace as storageMoveCollectionToWorkspace,
  migrateToWorkspaces,
  initializeDefaultWorkspace,
  storage,
} from '@/lib/storage';
import {
  validateWorkspaceName,
  validateWorkspaceLimit,
  type ValidationResult,
} from '@/lib/validation';
import { linksStore } from './links';

const ACTIVE_WORKSPACE_KEY = 'tabala_active_workspace';

interface WorkspacesState {
  workspaces: Workspace[];
  activeWorkspaceId: string;
  loading: boolean;
  error: string | null;
  pendingLocalUpdate: boolean;
}

function createWorkspacesStore(): ReturnType<typeof writable<WorkspacesState>> & {
  load: () => Promise<void>;
  setActiveWorkspace: (id: string) => void;
  addWorkspace: (input: CreateWorkspaceInput) => Promise<Workspace>;
  updateWorkspace: (id: string, updates: Partial<Omit<Workspace, 'id' | 'createdAt' | 'isDefault'>>) => Promise<void>;
  removeWorkspace: (id: string) => Promise<void>;
  reorderWorkspaces: (orderedWorkspaces: Workspace[]) => Promise<void>;
  moveCollectionToWorkspace: (collectionId: string, workspaceId: string) => Promise<void>;
  getWorkspaceNames: () => string[];
  validateWorkspace: (name: string) => { valid: boolean; error?: string };
  isLimitReached: () => boolean;
  clearError: () => void;
} {
  const { subscribe, set, update } = writable<WorkspacesState>({
    workspaces: [],
    activeWorkspaceId: DEFAULT_WORKSPACE_ID,
    loading: true,
    error: null,
    pendingLocalUpdate: false,
  });

  // Watch for storage changes from other contexts (popup <-> newtab)
  storage.watch((changes) => {
    if (changes.workspaces?.newValue !== undefined) {
      update((state) => {
        if (state.pendingLocalUpdate) {
          return state;
        }
        return {
          ...state,
          workspaces: (changes.workspaces?.newValue as Workspace[]) ?? state.workspaces,
        };
      });
    }
  });

  /**
   * Gets the persisted active workspace ID from localStorage.
   */
  function getPersistedActiveWorkspaceId(): string {
    try {
      return localStorage.getItem(ACTIVE_WORKSPACE_KEY) ?? DEFAULT_WORKSPACE_ID;
    } catch {
      return DEFAULT_WORKSPACE_ID;
    }
  }

  /**
   * Persists the active workspace ID to localStorage.
   */
  function persistActiveWorkspaceId(id: string): void {
    try {
      localStorage.setItem(ACTIVE_WORKSPACE_KEY, id);
    } catch {
      // Ignore localStorage errors
    }
  }

  /**
   * Loads workspaces from storage.
   * Runs migration if needed.
   */
  async function load(): Promise<void> {
    update((state) => ({ ...state, loading: true, error: null }));

    try {
      // Run migration first
      await migrateToWorkspaces();
      await initializeDefaultWorkspace();

      const workspaces = await getWorkspaces();
      const persistedActiveId = getPersistedActiveWorkspaceId();

      // Validate persisted workspace still exists
      const activeExists = workspaces.some((w) => w.id === persistedActiveId);
      const activeWorkspaceId = activeExists ? persistedActiveId : DEFAULT_WORKSPACE_ID;

      update((state) => ({
        ...state,
        workspaces,
        activeWorkspaceId,
        loading: false,
        error: null,
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao carregar workspaces';
      update((state) => ({ ...state, loading: false, error: message }));
    }
  }

  /**
   * Sets the active workspace.
   */
  function setActiveWorkspace(id: string): void {
    update((state) => {
      const exists = state.workspaces.some((w) => w.id === id);
      if (!exists) {
        return state;
      }
      persistActiveWorkspaceId(id);
      return { ...state, activeWorkspaceId: id };
    });
  }

  /**
   * Creates a new workspace.
   */
  async function addWorkspace(input: CreateWorkspaceInput): Promise<Workspace> {
    update((state) => ({
      ...state,
      pendingLocalUpdate: true,
    }));

    try {
      const newWorkspace = await storageCreateWorkspace(input);

      update((state) => ({
        ...state,
        workspaces: [...state.workspaces, newWorkspace].sort((a, b) => a.order - b.order),
      }));

      return newWorkspace;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao criar workspace';
      update((state) => ({ ...state, error: message }));
      throw error;
    } finally {
      update((state) => ({
        ...state,
        pendingLocalUpdate: false,
      }));
    }
  }

  /**
   * Updates a workspace.
   */
  async function updateWorkspace(
    id: string,
    updates: Partial<Omit<Workspace, 'id' | 'createdAt' | 'isDefault'>>
  ): Promise<void> {
    let previousWorkspaces: Workspace[] = [];

    update((state) => {
      previousWorkspaces = state.workspaces;
      const updatedWorkspaces = state.workspaces.map((w) =>
        w.id === id ? { ...w, ...updates } : w
      );
      return {
        ...state,
        workspaces: updatedWorkspaces,
        pendingLocalUpdate: true,
      };
    });

    try {
      const result = await storageUpdateWorkspace(id, updates);
      if (!result.success) {
        update((state) => ({
          ...state,
          workspaces: previousWorkspaces,
          error: result.error ?? 'Erro ao atualizar workspace',
        }));
      }
    } catch (error) {
      update((state) => ({
        ...state,
        workspaces: previousWorkspaces,
        error: 'Erro ao atualizar workspace',
      }));
    } finally {
      update((state) => ({
        ...state,
        pendingLocalUpdate: false,
      }));
    }
  }

  /**
   * Deletes a workspace.
   */
  async function removeWorkspace(id: string): Promise<void> {
    if (id === DEFAULT_WORKSPACE_ID) {
      update((state) => ({
        ...state,
        error: 'O workspace padrão não pode ser excluído',
      }));
      return;
    }

    let previousWorkspaces: Workspace[] = [];
    let wasActive = false;

    update((state) => {
      previousWorkspaces = state.workspaces;
      wasActive = state.activeWorkspaceId === id;
      return {
        ...state,
        workspaces: state.workspaces.filter((w) => w.id !== id),
        activeWorkspaceId: wasActive ? DEFAULT_WORKSPACE_ID : state.activeWorkspaceId,
        pendingLocalUpdate: true,
      };
    });

    if (wasActive) {
      persistActiveWorkspaceId(DEFAULT_WORKSPACE_ID);
    }

    try {
      const result = await storageDeleteWorkspace(id);
      if (!result.success) {
        update((state) => ({
          ...state,
          workspaces: previousWorkspaces,
          activeWorkspaceId: wasActive ? id : state.activeWorkspaceId,
          error: result.error ?? 'Erro ao excluir workspace',
        }));
        if (wasActive) {
          persistActiveWorkspaceId(id);
        }
      } else {
        // Reload links store to reflect collection changes
        await linksStore.load();
      }
    } catch (error) {
      update((state) => ({
        ...state,
        workspaces: previousWorkspaces,
        activeWorkspaceId: wasActive ? id : state.activeWorkspaceId,
        error: 'Erro ao excluir workspace',
      }));
      if (wasActive) {
        persistActiveWorkspaceId(id);
      }
    } finally {
      update((state) => ({
        ...state,
        pendingLocalUpdate: false,
      }));
    }
  }

  /**
   * Reorders workspaces.
   */
  async function reorderWorkspaces(orderedWorkspaces: Workspace[]): Promise<void> {
    let previousWorkspaces: Workspace[] = [];

    update((state) => {
      previousWorkspaces = state.workspaces;
      return {
        ...state,
        workspaces: orderedWorkspaces,
        pendingLocalUpdate: true,
      };
    });

    try {
      const result = await storageUpdateWorkspaceOrder(orderedWorkspaces);
      if (!result.success) {
        update((state) => ({
          ...state,
          workspaces: previousWorkspaces,
          error: result.error ?? 'Erro ao reordenar workspaces',
        }));
      }
    } catch (error) {
      update((state) => ({
        ...state,
        workspaces: previousWorkspaces,
        error: 'Erro ao reordenar workspaces',
      }));
    } finally {
      update((state) => ({
        ...state,
        pendingLocalUpdate: false,
      }));
    }
  }

  /**
   * Moves a collection to a different workspace.
   * Uses optimistic update pattern: updates local state immediately,
   * then persists to storage, rolling back on failure.
   */
  async function moveCollectionToWorkspace(
    collectionId: string,
    workspaceId: string
  ): Promise<void> {
    // Optimistically update linksStore collections to reflect the move
    let previousCollections: Collection[] = [];
    linksStore.update((state) => {
      previousCollections = state.collections;
      const updatedCollections = state.collections.map((c) =>
        c.id === collectionId ? { ...c, workspaceId } : c
      );
      return {
        ...state,
        collections: updatedCollections,
        pendingLocalUpdate: true,
      };
    });

    update((state) => ({
      ...state,
      pendingLocalUpdate: true,
    }));

    try {
      const result = await storageMoveCollectionToWorkspace(collectionId, workspaceId);
      if (!result.success) {
        // Rollback on failure
        linksStore.update((state) => ({
          ...state,
          collections: previousCollections,
        }));
        const errorMessage = result.error ?? 'Erro ao mover coleção';
        update((state) => ({
          ...state,
          error: errorMessage,
        }));
        throw new Error(errorMessage);
      }
    } catch (error) {
      // Rollback on exception
      linksStore.update((state) => ({
        ...state,
        collections: previousCollections,
      }));
      update((state) => ({
        ...state,
        error: 'Erro ao mover coleção',
      }));
    } finally {
      linksStore.update((state) => ({
        ...state,
        pendingLocalUpdate: false,
      }));
      update((state) => ({
        ...state,
        pendingLocalUpdate: false,
      }));
    }
  }

  /**
   * Gets workspace names for validation.
   */
  function getWorkspaceNames(): string[] {
    let names: string[] = [];
    update((state) => {
      names = state.workspaces.map((w) => w.name);
      return state;
    });
    return names;
  }

  /**
   * Validates a workspace name.
   */
  function validateWorkspace(name: string): ValidationResult {
    let currentWorkspaces: Workspace[] = [];
    update((state) => {
      currentWorkspaces = state.workspaces;
      return state;
    });
    return validateWorkspaceName(name, '', currentWorkspaces);
  }

  /**
   * Checks if workspace limit is reached.
   */
  function isLimitReached(): boolean {
    let currentWorkspaces: Workspace[] = [];
    update((state) => {
      currentWorkspaces = state.workspaces;
      return state;
    });
    return !validateWorkspaceLimit(currentWorkspaces).valid;
  }

  /**
   * Clears the error state.
   */
  function clearError(): void {
    update((state) => ({ ...state, error: null }));
  }

  return {
    subscribe,
    set,
    update,
    load,
    setActiveWorkspace,
    addWorkspace,
    updateWorkspace,
    removeWorkspace,
    reorderWorkspaces,
    moveCollectionToWorkspace,
    getWorkspaceNames,
    validateWorkspace,
    isLimitReached,
    clearError,
  };
}

export const workspacesStore = createWorkspacesStore();

/**
 * Derived store for the active workspace.
 */
export const activeWorkspace: Readable<Workspace | undefined> = derived(
  workspacesStore,
  ($store) => $store.workspaces.find((w) => w.id === $store.activeWorkspaceId)
);

/**
 * Derived store for collections filtered by the active workspace.
 * Always includes Inbox (which is global).
 */
export const collectionsByActiveWorkspace: Readable<Collection[]> = derived(
  [workspacesStore, linksStore],
  ([$workspacesStore, $linksStore]) => {
    const activeId = $workspacesStore.activeWorkspaceId;

    return $linksStore.collections.filter((collection) => {
      // Inbox is always visible (global)
      if (collection.id === INBOX_COLLECTION_ID) {
        return true;
      }
      // Show collections that belong to the active workspace
      return collection.workspaceId === activeId;
    });
  }
);
