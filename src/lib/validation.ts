/**
 * Validation utilities for TabAla extension.
 * Provides functions to validate user input with structured error responses.
 *
 * @module validation
 */

import type { Collection, Workspace } from './types';
import { WORKSPACE_LIMIT, DEFAULT_WORKSPACE_ID, isValidHexColor } from './types';

/**
 * Result of a validation operation.
 * Contains the validation status and an optional error message.
 */
export interface ValidationResult {
  /** Whether the input is valid */
  valid: boolean;
  /** Error message if validation failed */
  error?: string;
}

/**
 * Error messages for collection name validation.
 */
export const COLLECTION_NAME_ERRORS = {
  EMPTY: 'O nome da coleção não pode estar vazio',
  DUPLICATE: 'Já existe uma coleção com este nome',
} as const;

/**
 * Validates a collection name for renaming operations.
 *
 * Performs the following validations:
 * - Trims whitespace from the name
 * - Rejects empty names or names with only whitespace
 * - Rejects duplicate names (case-insensitive comparison)
 * - Ignores the current collection when checking for duplicates
 *
 * @param newName - The proposed new name for the collection
 * @param currentCollectionId - The ID of the collection being renamed (to exclude from duplicate check)
 * @param existingCollections - Array of all existing collections
 * @returns ValidationResult with valid status and optional error message
 *
 * @example
 * ```typescript
 * const result = validateCollectionName('Work', 'col-123', collections);
 * if (!result.valid) {
 *   console.error(result.error);
 * }
 * ```
 */
export function validateCollectionName(
  newName: string,
  currentCollectionId: string,
  existingCollections: Collection[]
): ValidationResult {
  const trimmedName = newName.trim();

  if (trimmedName === '') {
    return {
      valid: false,
      error: COLLECTION_NAME_ERRORS.EMPTY,
    };
  }

  const normalizedNewName = trimmedName.toLowerCase();
  const isDuplicate = existingCollections.some(
    (collection) =>
      collection.id !== currentCollectionId &&
      collection.name.toLowerCase() === normalizedNewName
  );

  if (isDuplicate) {
    return {
      valid: false,
      error: COLLECTION_NAME_ERRORS.DUPLICATE,
    };
  }

  return { valid: true };
}

// Workspace validation

/**
 * Maximum length for workspace name.
 */
export const WORKSPACE_NAME_MAX_LENGTH = 50;

/**
 * Maximum length for workspace description.
 */
export const WORKSPACE_DESCRIPTION_MAX_LENGTH = 200;

/**
 * Error messages for workspace validation.
 */
export const WORKSPACE_ERRORS = {
  NAME_EMPTY: 'O nome do workspace não pode estar vazio',
  NAME_TOO_LONG: `O nome do workspace deve ter no máximo ${WORKSPACE_NAME_MAX_LENGTH} caracteres`,
  NAME_DUPLICATE: 'Já existe um workspace com este nome',
  DESCRIPTION_TOO_LONG: `A descrição deve ter no máximo ${WORKSPACE_DESCRIPTION_MAX_LENGTH} caracteres`,
  LIMIT_REACHED: `Limite máximo de ${WORKSPACE_LIMIT} workspaces atingido`,
  INVALID_COLOR: 'Cor inválida. Use o formato #RRGGBB',
  DEFAULT_DELETE: 'O workspace padrão não pode ser excluído',
  DEFAULT_RENAME: 'O workspace padrão não pode ser renomeado',
  NOT_FOUND: 'Workspace não encontrado',
} as const;

/**
 * Validates a workspace name.
 *
 * Performs the following validations:
 * - Trims whitespace from the name
 * - Rejects empty names or names with only whitespace
 * - Rejects names longer than 50 characters
 * - Rejects duplicate names (case-insensitive comparison)
 * - Ignores the current workspace when checking for duplicates
 *
 * @param name - The proposed name for the workspace
 * @param currentWorkspaceId - The ID of the workspace being renamed (to exclude from duplicate check), empty for new workspaces
 * @param existingWorkspaces - Array of all existing workspaces
 * @returns ValidationResult with valid status and optional error message
 */
export function validateWorkspaceName(
  name: string,
  currentWorkspaceId: string,
  existingWorkspaces: Workspace[]
): ValidationResult {
  const trimmedName = name.trim();

  if (trimmedName === '') {
    return {
      valid: false,
      error: WORKSPACE_ERRORS.NAME_EMPTY,
    };
  }

  if (trimmedName.length > WORKSPACE_NAME_MAX_LENGTH) {
    return {
      valid: false,
      error: WORKSPACE_ERRORS.NAME_TOO_LONG,
    };
  }

  const normalizedNewName = trimmedName.toLowerCase();
  const isDuplicate = existingWorkspaces.some(
    (workspace) =>
      workspace.id !== currentWorkspaceId &&
      workspace.name.toLowerCase() === normalizedNewName
  );

  if (isDuplicate) {
    return {
      valid: false,
      error: WORKSPACE_ERRORS.NAME_DUPLICATE,
    };
  }

  return { valid: true };
}

/**
 * Validates a workspace description.
 *
 * @param description - The description to validate
 * @returns ValidationResult with valid status and optional error message
 */
export function validateWorkspaceDescription(description: string): ValidationResult {
  if (description.length > WORKSPACE_DESCRIPTION_MAX_LENGTH) {
    return {
      valid: false,
      error: WORKSPACE_ERRORS.DESCRIPTION_TOO_LONG,
    };
  }

  return { valid: true };
}

/**
 * Validates a workspace color.
 *
 * @param color - The color to validate
 * @returns ValidationResult with valid status and optional error message
 */
export function validateWorkspaceColor(color: string): ValidationResult {
  if (!isValidHexColor(color)) {
    return {
      valid: false,
      error: WORKSPACE_ERRORS.INVALID_COLOR,
    };
  }

  return { valid: true };
}

/**
 * Validates if a new workspace can be created based on the limit.
 *
 * @param existingWorkspaces - Array of existing workspaces
 * @returns ValidationResult with valid status and optional error message
 */
export function validateWorkspaceLimit(existingWorkspaces: Workspace[]): ValidationResult {
  if (existingWorkspaces.length >= WORKSPACE_LIMIT) {
    return {
      valid: false,
      error: WORKSPACE_ERRORS.LIMIT_REACHED,
    };
  }

  return { valid: true };
}

/**
 * Validates if a workspace can be deleted.
 *
 * @param workspaceId - The ID of the workspace to validate
 * @param existingWorkspaces - Array of existing workspaces
 * @returns ValidationResult with valid status and optional error message
 */
export function validateWorkspaceDeletion(
  workspaceId: string,
  existingWorkspaces: Workspace[]
): ValidationResult {
  if (workspaceId === DEFAULT_WORKSPACE_ID) {
    return {
      valid: false,
      error: WORKSPACE_ERRORS.DEFAULT_DELETE,
    };
  }

  const workspace = existingWorkspaces.find((w) => w.id === workspaceId);
  if (!workspace) {
    return {
      valid: false,
      error: WORKSPACE_ERRORS.NOT_FOUND,
    };
  }

  if (workspace.isDefault === true) {
    return {
      valid: false,
      error: WORKSPACE_ERRORS.DEFAULT_DELETE,
    };
  }

  return { valid: true };
}

/**
 * Validates if a workspace can be renamed.
 *
 * @param workspaceId - The ID of the workspace to validate
 * @param existingWorkspaces - Array of existing workspaces
 * @returns ValidationResult with valid status and optional error message
 */
export function validateWorkspaceRename(
  workspaceId: string,
  existingWorkspaces: Workspace[]
): ValidationResult {
  if (workspaceId === DEFAULT_WORKSPACE_ID) {
    return {
      valid: false,
      error: WORKSPACE_ERRORS.DEFAULT_RENAME,
    };
  }

  const workspace = existingWorkspaces.find((w) => w.id === workspaceId);
  if (!workspace) {
    return {
      valid: false,
      error: WORKSPACE_ERRORS.NOT_FOUND,
    };
  }

  if (workspace.isDefault === true) {
    return {
      valid: false,
      error: WORKSPACE_ERRORS.DEFAULT_RENAME,
    };
  }

  return { valid: true };
}
