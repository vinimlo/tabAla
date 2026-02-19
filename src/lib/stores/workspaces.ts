import { writable, derived, get, type Readable } from 'svelte/store';
import { type Workspace, type CreateWorkspaceInput, type Collection, DEFAULT_WORKSPACE_ID, INBOX_COLLECTION_ID } from '@/lib/types';
import {
  getWorkspaces,
  createWorkspace as storageCreateWorkspace,
  updateWorkspace as storageUpdateWorkspace,
  deleteWorkspace as storageDeleteWorkspace,
  updateWorkspaceOrder as storageUpdateWorkspaceOrder,
  moveCollectionToWorkspace as storageMoveCollectionToWorkspace,
  migrateToWorkspaces,
  initializeDefaultWorkspace,
  getErrorMessage,
  storage,
} from '@/lib/storage';
import { validateWorkspaceName, validateWorkspaceLimit, type ValidationResult } from '@/lib/validation';
import { linksStore } from './links';
import { t } from '@/lib/i18n';
import { optimisticUpdate } from './helpers';

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
  validateWorkspace: (name: string) => ValidationResult;
  isLimitReached: () => boolean;
  clearError: () => void;
} {
  const store = writable<WorkspacesState>({
    workspaces: [],
    activeWorkspaceId: DEFAULT_WORKSPACE_ID,
    loading: true,
    error: null,
    pendingLocalUpdate: false,
  });
  const { subscribe, set, update } = store;

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

  function getPersistedActiveWorkspaceId(): string {
    try {
      return localStorage.getItem(ACTIVE_WORKSPACE_KEY) ?? DEFAULT_WORKSPACE_ID;
    } catch {
      return DEFAULT_WORKSPACE_ID;
    }
  }

  function persistActiveWorkspaceId(id: string): void {
    try {
      localStorage.setItem(ACTIVE_WORKSPACE_KEY, id);
    } catch {
      // Ignore localStorage errors
    }
  }

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
      const message = getErrorMessage(error, t('error_update_workspace_failed'));
      update((state) => ({ ...state, loading: false, error: message }));
    }
  }

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
      const message = getErrorMessage(error, t('error_update_workspace_failed'));
      update((state) => ({ ...state, error: message }));
      throw error;
    } finally {
      update((state) => ({
        ...state,
        pendingLocalUpdate: false,
      }));
    }
  }

  async function updateWorkspace(
    id: string,
    updates: Partial<Omit<Workspace, 'id' | 'createdAt' | 'isDefault'>>
  ): Promise<void> {
    await optimisticUpdate(
      store,
      (state) => ({
        updated: {
          ...state,
          workspaces: state.workspaces.map((w) =>
            w.id === id ? { ...w, ...updates } : w
          ),
        },
        rollback: { workspaces: state.workspaces } as Partial<WorkspacesState>,
      }),
      async () => {
        const result = await storageUpdateWorkspace(id, updates);
        return result.success ? null : (result.error ?? t('error_update_workspace_failed'));
      },
      t('error_update_workspace_failed')
    );
  }

  // Cannot use optimisticUpdate: rollback requires localStorage writes
  // (restoring active workspace) and success requires reloading linksStore.
  async function removeWorkspace(id: string): Promise<void> {
    if (id === DEFAULT_WORKSPACE_ID) {
      update((state) => ({
        ...state,
        error: t('validation_workspace_default_delete'),
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

    function rollback(errorMsg: string): void {
      update((state) => ({
        ...state,
        workspaces: previousWorkspaces,
        activeWorkspaceId: wasActive ? id : state.activeWorkspaceId,
        error: errorMsg,
      }));
      if (wasActive) {
        persistActiveWorkspaceId(id);
      }
    }

    try {
      const result = await storageDeleteWorkspace(id);
      if (!result.success) {
        rollback(result.error ?? t('error_delete_workspace_failed'));
      } else {
        // Reload links store to reflect collection changes
        await linksStore.load();
      }
    } catch {
      rollback(t('error_delete_workspace_failed'));
    } finally {
      update((state) => ({
        ...state,
        pendingLocalUpdate: false,
      }));
    }
  }

  async function reorderWorkspaces(orderedWorkspaces: Workspace[]): Promise<void> {
    await optimisticUpdate(
      store,
      (state) => {
        const reorderedIds = new Set(orderedWorkspaces.map((w) => w.id));
        const merged = [
          ...orderedWorkspaces,
          ...state.workspaces.filter((w) => !reorderedIds.has(w.id)),
        ];
        return {
          updated: { ...state, workspaces: merged },
          rollback: { workspaces: state.workspaces } as Partial<WorkspacesState>,
        };
      },
      async () => {
        const result = await storageUpdateWorkspaceOrder(orderedWorkspaces);
        return result.success ? null : (result.error ?? t('error_reorder_workspaces_failed'));
      },
      t('error_reorder_workspaces_failed')
    );
  }

  // Cannot use optimisticUpdate: requires coordinating two stores
  // (linksStore for collections and workspacesStore for pendingLocalUpdate).
  async function moveCollectionToWorkspace(
    collectionId: string,
    workspaceId: string
  ): Promise<void> {
    let previousCollections: Collection[] = [];
    linksStore.update((state) => {
      previousCollections = state.collections;
      return {
        ...state,
        collections: state.collections.map((c) =>
          c.id === collectionId ? { ...c, workspaceId } : c
        ),
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
        linksStore.update((state) => ({
          ...state,
          collections: previousCollections,
        }));
        update((state) => ({
          ...state,
          error: result.error ?? t('error_move_collection_failed'),
        }));
      }
    } catch {
      linksStore.update((state) => ({
        ...state,
        collections: previousCollections,
      }));
      update((state) => ({
        ...state,
        error: t('error_move_collection_failed'),
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

  function getWorkspaceNames(): string[] {
    return get(store).workspaces.map((w) => w.name);
  }

  function validateWorkspace(name: string): ValidationResult {
    return validateWorkspaceName(name, '', get(store).workspaces);
  }

  function isLimitReached(): boolean {
    return !validateWorkspaceLimit(get(store).workspaces).valid;
  }

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

export const activeWorkspace: Readable<Workspace | undefined> = derived(
  workspacesStore,
  ($store) => $store.workspaces.find((w) => w.id === $store.activeWorkspaceId)
);

/** Always includes Inbox (which is global across all workspaces). */
export const collectionsByActiveWorkspace: Readable<Collection[]> = derived(
  [workspacesStore, linksStore],
  ([$workspacesStore, $linksStore]) => {
    const activeId = $workspacesStore.activeWorkspaceId;
    return $linksStore.collections.filter(
      (c) => c.id === INBOX_COLLECTION_ID || c.workspaceId === activeId
    );
  }
);
