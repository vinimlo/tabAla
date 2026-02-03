/**
 * Validation utilities for TabAla extension.
 * Provides functions to validate user input with structured error responses.
 *
 * @module validation
 */

import type { Collection } from './types';

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
