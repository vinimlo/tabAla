import type { Writable } from 'svelte/store';

/**
 * Optimistic update pattern: applies state immediately, persists async,
 * rolls back on failure. Sets pendingLocalUpdate to ignore storage.watch()
 * during local operations.
 *
 * If `prepare` returns `null`, the operation is skipped entirely (early return).
 * This supports guard patterns like double-click prevention.
 *
 * Optional `cleanup` provides additional state fields to merge in the finally
 * block (e.g., clearing per-operation guards like isAdding/isRemoving).
 */
export async function optimisticUpdate<S extends { pendingLocalUpdate: boolean; error: string | null }>(
  store: Writable<S>,
  prepare: (state: S) => { updated: S; rollback: Partial<S> } | null,
  persist: () => Promise<string | null | undefined>,
  fallbackError: string,
  cleanup?: Partial<S> | ((state: S) => Partial<S>)
): Promise<void> {
  let rollbackData: Partial<S> = {};
  let skipped = false;

  store.update((state) => {
    const result = prepare(state);
    if (result === null) {
      skipped = true;
      return state;
    }
    rollbackData = result.rollback;
    return {
      ...result.updated,
      pendingLocalUpdate: true,
    };
  });

  if (skipped) {
    return;
  }

  try {
    const error = await persist();
    if (error) {
      store.update((state) => ({
        ...state,
        ...rollbackData,
        error,
      }));
    }
  } catch {
    store.update((state) => ({
      ...state,
      ...rollbackData,
      error: fallbackError,
    }));
  } finally {
    store.update((state) => ({
      ...state,
      pendingLocalUpdate: false,
      ...(typeof cleanup === 'function' ? cleanup(state) : cleanup),
    }));
  }
}
