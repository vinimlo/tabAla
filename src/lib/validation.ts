import type { Collection, Workspace } from './types';
import { WORKSPACE_LIMIT, DEFAULT_WORKSPACE_ID, isValidHexColor } from './types';
import { t } from './i18n';

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export const COLLECTION_NAME_MAX_LENGTH = 100;

export const COLLECTION_NAME_ERRORS = {
  EMPTY: (): string => t('validation_collection_name_empty'),
  TOO_LONG: (): string => t('validation_collection_name_too_long', COLLECTION_NAME_MAX_LENGTH),
  DUPLICATE: (): string => t('validation_collection_name_duplicate'),
};

/** Trims, checks empty, checks max length, and checks case-insensitive duplicates. */
function validateName(
  name: string,
  existingNames: string[],
  config: { maxLength: number; emptyError: () => string; tooLongError: () => string; duplicateError: () => string }
): ValidationResult {
  const trimmedName = name.trim();

  if (trimmedName === '') {
    return { valid: false, error: config.emptyError() };
  }

  if (trimmedName.length > config.maxLength) {
    return { valid: false, error: config.tooLongError() };
  }

  const normalized = trimmedName.toLowerCase();
  if (existingNames.some((n) => n.toLowerCase() === normalized)) {
    return { valid: false, error: config.duplicateError() };
  }

  return { valid: true };
}

export function validateCollectionName(
  newName: string,
  existingNames: string[]
): ValidationResult;
export function validateCollectionName(
  newName: string,
  currentCollectionId: string,
  existingCollections: Collection[]
): ValidationResult;
export function validateCollectionName(
  newName: string,
  secondArg: string | string[],
  existingCollections?: Collection[]
): ValidationResult {
  const config = {
    maxLength: COLLECTION_NAME_MAX_LENGTH,
    emptyError: COLLECTION_NAME_ERRORS.EMPTY,
    tooLongError: COLLECTION_NAME_ERRORS.TOO_LONG,
    duplicateError: COLLECTION_NAME_ERRORS.DUPLICATE,
  };

  if (Array.isArray(secondArg)) {
    return validateName(newName, secondArg, config);
  }

  // Filter out the current collection's name to allow renaming to the same name
  const otherNames = (existingCollections ?? [])
    .filter((item) => item.id !== secondArg)
    .map((item) => item.name);

  return validateName(newName, otherNames, config);
}

// Workspace validation

export const WORKSPACE_NAME_MAX_LENGTH = 50;
export const WORKSPACE_DESCRIPTION_MAX_LENGTH = 200;

export const WORKSPACE_ERRORS = {
  NAME_EMPTY: (): string => t('validation_workspace_name_empty'),
  NAME_TOO_LONG: (): string => t('validation_workspace_name_too_long', WORKSPACE_NAME_MAX_LENGTH),
  NAME_DUPLICATE: (): string => t('validation_workspace_name_duplicate'),
  DESCRIPTION_TOO_LONG: (): string => t('validation_workspace_description_too_long', WORKSPACE_DESCRIPTION_MAX_LENGTH),
  LIMIT_REACHED: (): string => t('validation_workspace_limit_reached', WORKSPACE_LIMIT),
  INVALID_COLOR: (): string => t('validation_workspace_invalid_color'),
  DEFAULT_DELETE: (): string => t('validation_workspace_default_delete'),
  DEFAULT_RENAME: (): string => t('validation_workspace_default_rename'),
  NOT_FOUND: (): string => t('validation_workspace_not_found'),
};

export function validateWorkspaceName(
  name: string,
  existingNames: string[]
): ValidationResult;
export function validateWorkspaceName(
  name: string,
  currentWorkspaceId: string,
  existingWorkspaces: Workspace[]
): ValidationResult;
export function validateWorkspaceName(
  name: string,
  secondArg: string | string[],
  existingWorkspaces?: Workspace[]
): ValidationResult {
  const config = {
    maxLength: WORKSPACE_NAME_MAX_LENGTH,
    emptyError: WORKSPACE_ERRORS.NAME_EMPTY,
    tooLongError: WORKSPACE_ERRORS.NAME_TOO_LONG,
    duplicateError: WORKSPACE_ERRORS.NAME_DUPLICATE,
  };

  if (Array.isArray(secondArg)) {
    return validateName(name, secondArg, config);
  }

  const otherNames = (existingWorkspaces ?? [])
    .filter((item) => item.id !== secondArg)
    .map((item) => item.name);

  return validateName(name, otherNames, config);
}

export function validateWorkspaceDescription(description: string): ValidationResult {
  return description.length > WORKSPACE_DESCRIPTION_MAX_LENGTH
    ? { valid: false, error: WORKSPACE_ERRORS.DESCRIPTION_TOO_LONG() }
    : { valid: true };
}

export function validateWorkspaceColor(color: string): ValidationResult {
  return isValidHexColor(color)
    ? { valid: true }
    : { valid: false, error: WORKSPACE_ERRORS.INVALID_COLOR() };
}

export function validateWorkspaceLimit(existingWorkspaces: Workspace[]): ValidationResult {
  return existingWorkspaces.length >= WORKSPACE_LIMIT
    ? { valid: false, error: WORKSPACE_ERRORS.LIMIT_REACHED() }
    : { valid: true };
}

export function validateWorkspaceDeletion(
  workspaceId: string,
  existingWorkspaces: Workspace[]
): ValidationResult {
  if (workspaceId === DEFAULT_WORKSPACE_ID) {
    return { valid: false, error: WORKSPACE_ERRORS.DEFAULT_DELETE() };
  }
  if (!existingWorkspaces.some((w) => w.id === workspaceId)) {
    return { valid: false, error: WORKSPACE_ERRORS.NOT_FOUND() };
  }
  return { valid: true };
}
