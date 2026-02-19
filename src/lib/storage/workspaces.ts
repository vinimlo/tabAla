import type { Workspace, CreateWorkspaceInput, Collection } from '../types';
import {
  DEFAULT_WORKSPACE_ID,
  DEFAULT_WORKSPACE_NAME,
  WORKSPACE_COLORS,
  INBOX_COLLECTION_ID,
  calculateNextOrder,
} from '../types';
import {
  validateWorkspaceName,
  validateWorkspaceDescription,
  validateWorkspaceColor,
  validateWorkspaceLimit,
  validateWorkspaceDeletion,
  type ValidationResult,
} from '../validation';
import { t } from '../i18n';
import type { OperationResult } from './core';
import { StorageError, getErrorMessage } from './core';
import { getWorkspaces, saveWorkspaces, getCollections, saveCollections } from './data-access';

function throwIfInvalid(result: ValidationResult, fallback: string): void {
  if (!result.valid) {
    throw new StorageError(result.error ?? fallback, 'INVALID_VALUE');
  }
}

export function createDefaultWorkspace(): Workspace {
  return {
    id: DEFAULT_WORKSPACE_ID,
    name: DEFAULT_WORKSPACE_NAME,
    color: WORKSPACE_COLORS[0],
    order: 0,
    createdAt: Date.now(),
    isDefault: true,
  };
}

/** Ensures the default workspace exists in storage. */
export async function initializeDefaultWorkspace(): Promise<void> {
  const workspaces = await getWorkspaces();
  const hasDefault = workspaces.some((w) => w.id === DEFAULT_WORKSPACE_ID);

  if (!hasDefault) {
    const defaultWorkspace = createDefaultWorkspace();
    await saveWorkspaces([defaultWorkspace, ...workspaces]);
  }
}

export async function createWorkspace(input: CreateWorkspaceInput): Promise<Workspace> {
  const trimmedName = input.name.trim();
  const trimmedDescription = input.description?.trim();
  const existingWorkspaces = await getWorkspaces();

  throwIfInvalid(validateWorkspaceLimit(existingWorkspaces), 'Workspace limit reached');
  throwIfInvalid(validateWorkspaceName(trimmedName, '', existingWorkspaces), 'Invalid workspace name');
  if (trimmedDescription) {
    throwIfInvalid(validateWorkspaceDescription(trimmedDescription), 'Invalid workspace description');
  }
  throwIfInvalid(validateWorkspaceColor(input.color), 'Invalid workspace color');

  const newWorkspace: Workspace = {
    id: crypto.randomUUID(),
    name: trimmedName,
    description: trimmedDescription,
    color: input.color,
    order: calculateNextOrder(existingWorkspaces),
    createdAt: Date.now(),
  };

  await saveWorkspaces([...existingWorkspaces, newWorkspace]);

  return newWorkspace;
}

export async function updateWorkspace(
  id: string,
  updates: Partial<Omit<Workspace, 'id' | 'createdAt' | 'isDefault'>>
): Promise<OperationResult> {
  try {
    const workspaces = await getWorkspaces();
    const workspace = workspaces.find((w) => w.id === id);

    if (!workspace) {
      return { success: false, error: t('storage_workspace_not_found') };
    }

    if (updates.name !== undefined) {
      const trimmedName = updates.name.trim();

      if (workspace.isDefault === true || workspace.id === DEFAULT_WORKSPACE_ID) {
        return { success: false, error: t('validation_workspace_default_rename') };
      }

      const nameValidation = validateWorkspaceName(trimmedName, id, workspaces);
      if (!nameValidation.valid) {
        return { success: false, error: nameValidation.error };
      }
      updates.name = trimmedName;
    }

    if (updates.description !== undefined) {
      const trimmedDescription = updates.description.trim();
      const descValidation = validateWorkspaceDescription(trimmedDescription);
      if (!descValidation.valid) {
        return { success: false, error: descValidation.error };
      }
      updates.description = trimmedDescription;
    }

    if (updates.color !== undefined) {
      const colorValidation = validateWorkspaceColor(updates.color);
      if (!colorValidation.valid) {
        return { success: false, error: colorValidation.error };
      }
    }

    const updatedWorkspaces = workspaces.map((w) =>
      w.id === id ? { ...w, ...updates } : w
    );

    await saveWorkspaces(updatedWorkspaces);

    return { success: true };
  } catch (error) {
    console.error('Failed to update workspace:', error);
    return {
      success: false,
      error: getErrorMessage(error, t('error_update_workspace_failed')),
    };
  }
}

/** Collections belonging to the deleted workspace are moved to the default workspace. */
export async function deleteWorkspace(id: string): Promise<OperationResult> {
  try {
    const workspaces = await getWorkspaces();

    const validation = validateWorkspaceDeletion(id, workspaces);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    const collections = await getCollections();

    await Promise.all([
      saveWorkspaces(workspaces.filter((w) => w.id !== id)),
      saveCollections(collections.map((c) =>
        c.workspaceId === id ? { ...c, workspaceId: DEFAULT_WORKSPACE_ID } : c
      )),
    ]);

    return { success: true };
  } catch (error) {
    console.error('Failed to delete workspace:', error);
    return {
      success: false,
      error: getErrorMessage(error, t('error_delete_workspace_failed')),
    };
  }
}

export async function updateWorkspaceOrder(
  orderedWorkspaces: Workspace[]
): Promise<OperationResult> {
  try {
    const allWorkspaces = await getWorkspaces();
    const reorderedIds = new Map(orderedWorkspaces.map((w, i) => [w.id, i]));

    const merged = allWorkspaces.map((w) => {
      const newOrder = reorderedIds.get(w.id);
      return newOrder !== undefined ? { ...w, order: newOrder } : w;
    });

    await saveWorkspaces(merged);

    return { success: true };
  } catch (error) {
    console.error('Failed to update workspace order:', error);
    return {
      success: false,
      error: getErrorMessage(error, t('error_reorder_workspaces_failed')),
    };
  }
}

export async function getCollectionsByWorkspace(workspaceId: string): Promise<Collection[]> {
  const collections = await getCollections();
  return collections.filter((c) => c.workspaceId === workspaceId);
}

export async function moveCollectionToWorkspace(
  collectionId: string,
  workspaceId: string
): Promise<OperationResult> {
  try {
    if (collectionId === INBOX_COLLECTION_ID) {
      return { success: false, error: t('storage_inbox_cannot_move') };
    }

    const [collections, workspaces] = await Promise.all([
      getCollections(),
      getWorkspaces(),
    ]);

    if (!collections.some((c) => c.id === collectionId)) {
      return { success: false, error: t('storage_collection_not_found') };
    }

    if (!workspaces.some((w) => w.id === workspaceId)) {
      return { success: false, error: t('storage_target_workspace_not_found') };
    }

    const updatedCollections = collections.map((c) =>
      c.id === collectionId ? { ...c, workspaceId } : c
    );

    await saveCollections(updatedCollections);

    return { success: true };
  } catch (error) {
    console.error('Failed to move collection to workspace:', error);
    return {
      success: false,
      error: getErrorMessage(error, t('error_move_collection_failed')),
    };
  }
}

/** Assigns existing unowned collections to the default workspace. */
export async function migrateToWorkspaces(): Promise<void> {
  const workspaces = await getWorkspaces();

  if (workspaces.length > 0) {
    return;
  }

  const defaultWorkspace = createDefaultWorkspace();
  await saveWorkspaces([defaultWorkspace]);

  const collections = await getCollections();
  await saveCollections(
    collections.map((c) =>
      c.id === INBOX_COLLECTION_ID ? c : { ...c, workspaceId: DEFAULT_WORKSPACE_ID }
    )
  );
}
