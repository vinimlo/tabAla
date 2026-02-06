/**
 * Storage wrapper for chrome.storage.local API.
 * Provides type-safe CRUD operations with error handling and change observation.
 *
 * @module storage
 * @example
 * ```typescript
 * import { storage } from '@/lib/storage';
 *
 * // Save and retrieve data
 * await storage.set('user', { name: 'John', age: 30 });
 * const user = await storage.get<{ name: string; age: number }>('user');
 *
 * // Batch operations
 * await storage.setBatch({ key1: 'value1', key2: 'value2' });
 * const items = await storage.getBatch<string>(['key1', 'key2']);
 *
 * // Watch for changes
 * const unwatch = storage.watch((changes) => {
 *   console.log('Storage changed:', changes);
 * });
 * // Later: unwatch() to stop listening
 * ```
 */

import type { Link, Collection, InboxCollection, Settings, Workspace, CreateWorkspaceInput } from './types';
import {
  INBOX_COLLECTION_ID,
  INBOX_COLLECTION_NAME,
  DEFAULT_SETTINGS,
  DEFAULT_WORKSPACE_ID,
  DEFAULT_WORKSPACE_NAME,
  WORKSPACE_COLORS,
} from './types';
import {
  validateCollectionName,
  validateWorkspaceName,
  validateWorkspaceDescription,
  validateWorkspaceColor,
  validateWorkspaceLimit,
  validateWorkspaceDeletion,
} from './validation';

/**
 * Represents a storage change for a single key.
 * Contains the old and new values when a storage key is modified.
 */
export interface StorageChange<T = unknown> {
  /** Previous value (undefined if key was newly created) */
  oldValue?: T;
  /** New value (undefined if key was removed) */
  newValue?: T;
}

/**
 * Record of all storage changes in a single update.
 * Keys are storage keys, values contain the change details.
 */
export type StorageChanges = Record<string, StorageChange>;

/**
 * Custom error class for storage-related errors.
 * Provides specific error codes for different failure scenarios.
 */
export class StorageError extends Error {
  constructor(
    message: string,
    public readonly code: StorageErrorCode,
    public readonly originalError?: unknown
  ) {
    super(message);
    this.name = 'StorageError';
  }
}

/**
 * Error codes for storage operations.
 */
export type StorageErrorCode =
  | 'QUOTA_EXCEEDED'
  | 'INVALID_KEY'
  | 'INVALID_VALUE'
  | 'CHROME_API_ERROR'
  | 'INBOX_DELETE_FORBIDDEN'
  | 'UNKNOWN_ERROR';

/**
 * Interface defining all storage wrapper methods.
 * Provides type-safe operations for interacting with chrome.storage.local.
 */
export interface StorageWrapper {
  /**
   * Retrieves a value from storage by key.
   *
   * @template T - The expected type of the stored value
   * @param key - The storage key to retrieve
   * @returns The stored value or null if the key doesn't exist
   * @throws {StorageError} If key is empty or API call fails
   *
   * @example
   * ```typescript
   * const user = await storage.get<User>('currentUser');
   * if (user) {
   *   console.log(user.name);
   * }
   * ```
   */
  get<T>(key: string): Promise<T | null>;

  /**
   * Stores a value in storage under the specified key.
   *
   * @template T - The type of the value being stored
   * @param key - The storage key
   * @param value - The value to store
   * @throws {StorageError} If quota is exceeded, key/value is invalid, or API call fails
   *
   * @example
   * ```typescript
   * await storage.set('preferences', { theme: 'dark', fontSize: 14 });
   * ```
   *
   * @remarks
   * Chrome storage has a quota limit of approximately 5MB (QUOTA_BYTES).
   * If the quota is exceeded, a StorageError with code 'QUOTA_EXCEEDED' is thrown.
   */
  set<T>(key: string, value: T): Promise<void>;

  /**
   * Removes a value from storage by key.
   *
   * @param key - The storage key to remove
   * @throws {StorageError} If key is empty or API call fails
   *
   * @example
   * ```typescript
   * await storage.remove('temporaryData');
   * ```
   */
  remove(key: string): Promise<void>;

  /**
   * Clears all data from storage.
   *
   * @throws {StorageError} If API call fails
   *
   * @example
   * ```typescript
   * await storage.clear();
   * ```
   *
   * @remarks
   * This is a destructive operation that removes ALL stored data.
   * Use with caution.
   */
  clear(): Promise<void>;

  /**
   * Retrieves all stored data.
   *
   * @returns An object containing all stored key-value pairs
   * @throws {StorageError} If API call fails
   *
   * @example
   * ```typescript
   * const allData = await storage.getAll();
   * console.log(Object.keys(allData));
   * ```
   */
  getAll(): Promise<Record<string, unknown>>;

  /**
   * Retrieves multiple values from storage in a single operation.
   *
   * @template T - The expected type of the stored values
   * @param keys - Array of storage keys to retrieve
   * @returns An object containing the requested key-value pairs
   * @throws {StorageError} If keys array is empty or API call fails
   *
   * @example
   * ```typescript
   * const items = await storage.getBatch<string>(['setting1', 'setting2']);
   * console.log(items.setting1, items.setting2);
   * ```
   */
  getBatch<T>(keys: string[]): Promise<Record<string, T>>;

  /**
   * Stores multiple values in storage in a single operation.
   *
   * @param items - Object containing key-value pairs to store
   * @throws {StorageError} If quota is exceeded, items is empty, or API call fails
   *
   * @example
   * ```typescript
   * await storage.setBatch({
   *   user: { name: 'John' },
   *   settings: { theme: 'dark' }
   * });
   * ```
   *
   * @remarks
   * Batch operations are more efficient than multiple individual set() calls.
   */
  setBatch(items: Record<string, unknown>): Promise<void>;

  /**
   * Removes multiple values from storage in a single operation.
   *
   * @param keys - Array of storage keys to remove
   * @throws {StorageError} If keys array is empty or API call fails
   *
   * @example
   * ```typescript
   * await storage.removeBatch(['tempData1', 'tempData2', 'cache']);
   * ```
   */
  removeBatch(keys: string[]): Promise<void>;

  /**
   * Registers a callback to be invoked when storage changes.
   *
   * @param callback - Function called with storage changes whenever data is modified
   * @returns A function to unregister the callback (stop watching)
   *
   * @example
   * ```typescript
   * const unwatch = storage.watch((changes) => {
   *   for (const [key, change] of Object.entries(changes)) {
   *     console.log(`Key "${key}" changed from`, change.oldValue, 'to', change.newValue);
   *   }
   * });
   *
   * // Later, to stop watching:
   * unwatch();
   * ```
   */
  watch(callback: (changes: StorageChanges) => void): () => void;
}

/**
 * Validates that a key is a non-empty string.
 *
 * @param key - The key to validate
 * @throws {StorageError} If key is not a valid non-empty string
 */
function validateKey(key: string): void {
  if (typeof key !== 'string' || key.trim() === '') {
    throw new StorageError(
      'Storage key must be a non-empty string',
      'INVALID_KEY'
    );
  }
}

/**
 * Validates that a keys array is non-empty.
 *
 * @param keys - The keys array to validate
 * @throws {StorageError} If keys is empty
 */
function validateKeys(keys: string[]): void {
  if (!Array.isArray(keys) || keys.length === 0) {
    throw new StorageError(
      'Keys array must not be empty',
      'INVALID_KEY'
    );
  }
  keys.forEach(validateKey);
}

/**
 * Validates that items object is non-empty.
 *
 * @param items - The items object to validate
 * @throws {StorageError} If items is empty
 */
function validateItems(items: Record<string, unknown>): void {
  if (
    items === null ||
    items === undefined ||
    typeof items !== 'object' ||
    Object.keys(items).length === 0
  ) {
    throw new StorageError('Items object must not be empty', 'INVALID_VALUE');
  }
}

/**
 * Checks if an error is a quota exceeded error.
 *
 * @param error - The error to check
 * @returns True if the error indicates quota exceeded
 */
function isQuotaExceededError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return message.includes('quota') || message.includes('exceeded');
  }
  return false;
}

/**
 * Wraps an error in a StorageError with appropriate code.
 *
 * @param error - The original error
 * @param operation - Description of the operation that failed
 * @returns A StorageError with the appropriate code
 */
function wrapError(error: unknown, operation: string): StorageError {
  if (error instanceof StorageError) {
    return error;
  }

  if (isQuotaExceededError(error)) {
    return new StorageError(
      'Storage quota exceeded. Please remove some collections or links to continue.',
      'QUOTA_EXCEEDED',
      error
    );
  }

  const message = error instanceof Error ? error.message : 'Unknown error';
  return new StorageError(
    `Failed to ${operation}: ${message}`,
    'CHROME_API_ERROR',
    error
  );
}

/**
 * Retrieves a value from storage by key.
 */
async function get<T>(key: string): Promise<T | null> {
  validateKey(key);

  try {
    const result = await chrome.storage.local.get(key);
    return (result[key] as T) ?? null;
  } catch (error) {
    throw wrapError(error, `get value for key "${key}"`);
  }
}

/**
 * Stores a value in storage under the specified key.
 */
async function set<T>(key: string, value: T): Promise<void> {
  validateKey(key);

  if (value === undefined) {
    throw new StorageError(
      'Cannot store undefined value. Use remove() to delete a key.',
      'INVALID_VALUE'
    );
  }

  try {
    await chrome.storage.local.set({ [key]: value });
  } catch (error) {
    throw wrapError(error, `set value for key "${key}"`);
  }
}

/**
 * Removes a value from storage by key.
 */
async function remove(key: string): Promise<void> {
  validateKey(key);

  try {
    await chrome.storage.local.remove(key);
  } catch (error) {
    throw wrapError(error, `remove key "${key}"`);
  }
}

/**
 * Clears all data from storage.
 */
async function clear(): Promise<void> {
  try {
    await chrome.storage.local.clear();
  } catch (error) {
    throw wrapError(error, 'clear storage');
  }
}

/**
 * Retrieves all stored data.
 */
async function getAll(): Promise<Record<string, unknown>> {
  try {
    return await chrome.storage.local.get(null);
  } catch (error) {
    throw wrapError(error, 'get all storage data');
  }
}

/**
 * Retrieves multiple values from storage in a single operation.
 */
async function getBatch<T>(keys: string[]): Promise<Record<string, T>> {
  validateKeys(keys);

  try {
    const result = await chrome.storage.local.get(keys);
    return result as Record<string, T>;
  } catch (error) {
    throw wrapError(error, 'get batch values');
  }
}

/**
 * Stores multiple values in storage in a single operation.
 */
async function setBatch(items: Record<string, unknown>): Promise<void> {
  validateItems(items);

  try {
    await chrome.storage.local.set(items);
  } catch (error) {
    throw wrapError(error, 'set batch values');
  }
}

/**
 * Removes multiple values from storage in a single operation.
 */
async function removeBatch(keys: string[]): Promise<void> {
  validateKeys(keys);

  try {
    await chrome.storage.local.remove(keys);
  } catch (error) {
    throw wrapError(error, 'remove batch keys');
  }
}

/**
 * Registers a callback to be invoked when storage changes.
 */
function watch(callback: (changes: StorageChanges) => void): () => void {
  const listener = (
    changes: Record<string, chrome.storage.StorageChange>,
    areaName: string
  ): void => {
    if (areaName !== 'local') {
      return;
    }

    const typedChanges: StorageChanges = {};
    for (const [key, change] of Object.entries(changes)) {
      typedChanges[key] = {
        oldValue: change.oldValue,
        newValue: change.newValue,
      };
    }

    callback(typedChanges);
  };

  chrome.storage.onChanged.addListener(listener);

  return () => {
    chrome.storage.onChanged.removeListener(listener);
  };
}

/**
 * Storage wrapper instance providing type-safe CRUD operations
 * for chrome.storage.local.
 *
 * @example
 * ```typescript
 * import { storage } from '@/lib/storage';
 *
 * // Basic operations
 * await storage.set('key', 'value');
 * const value = await storage.get<string>('key');
 * await storage.remove('key');
 *
 * // Batch operations
 * await storage.setBatch({ a: 1, b: 2 });
 * const items = await storage.getBatch<number>(['a', 'b']);
 *
 * // Watch for changes
 * const unwatch = storage.watch((changes) => console.log(changes));
 * ```
 */
export const storage: StorageWrapper = {
  get,
  set,
  remove,
  clear,
  getAll,
  getBatch,
  setBatch,
  removeBatch,
  watch,
};

export default storage;

// Domain-specific storage functions

/**
 * Retrieves all links from storage.
 *
 * @returns Array of Link objects, or empty array if none exist
 */
export async function getLinks(): Promise<Link[]> {
  const links = await storage.get<Link[]>('links');
  return links ?? [];
}

/**
 * Saves links array to storage.
 *
 * @param links - Array of Link objects to save
 */
export async function saveLinks(links: Link[]): Promise<void> {
  await storage.set('links', links);
}

/**
 * Retrieves all collections from storage, sorted with Inbox first.
 * Collections are ordered with Inbox at position [0], followed by
 * remaining collections sorted by createdAt (most recent first).
 *
 * @returns Array of Collection objects, or empty array if none exist
 */
export async function getCollections(): Promise<Collection[]> {
  const collections = await storage.get<Collection[]>('collections');
  if (!collections || collections.length === 0) {
    return [];
  }

  return collections.sort((a, b) => {
    if (a.id === INBOX_COLLECTION_ID) {
      return -1;
    }
    if (b.id === INBOX_COLLECTION_ID) {
      return 1;
    }
    return (b.createdAt ?? 0) - (a.createdAt ?? 0);
  });
}

/**
 * Saves collections array to storage.
 *
 * @param collections - Array of Collection objects to save
 */
export async function saveCollections(collections: Collection[]): Promise<void> {
  await storage.set('collections', collections);
}

/**
 * Result of a removeLink operation.
 */
export interface RemoveLinkResult {
  /** Whether the link was successfully removed */
  success: boolean;
  /** Error message if operation failed */
  error?: string;
  /** Whether the link's collection was also removed (if empty and not inbox) */
  collectionRemoved?: boolean;
}

/**
 * Removes a link from storage and optionally cleans up empty collections.
 *
 * If removing the link leaves its collection empty (and the collection is not
 * the inbox), the collection is also removed.
 *
 * @param linkId - The ID of the link to remove
 * @returns Result object indicating success/failure and whether collection was removed
 */
/**
 * Result of a renameCollection operation.
 */
export interface RenameCollectionResult {
  /** Whether the collection was successfully renamed */
  success: boolean;
  /** Error message if operation failed */
  error?: string;
}

/**
 * Renames a collection in storage.
 *
 * Performs an atomic read-modify-write operation to update the collection name.
 * The new name should be trimmed before calling this function.
 *
 * @param collectionId - The ID of the collection to rename
 * @param newName - The new name for the collection (should be pre-trimmed)
 * @returns Result object indicating success/failure
 *
 * @example
 * ```typescript
 * const result = await renameCollection('col-123', 'New Name');
 * if (!result.success) {
 *   console.error(result.error);
 * }
 * ```
 */
export async function renameCollection(
  collectionId: string,
  newName: string
): Promise<RenameCollectionResult> {
  try {
    const collections = await getCollections();
    const collectionIndex = collections.findIndex((c) => c.id === collectionId);

    if (collectionIndex === -1) {
      return { success: false, error: 'Coleção não encontrada' };
    }

    const updatedCollections = collections.map((c) =>
      c.id === collectionId ? { ...c, name: newName } : c
    );

    await saveCollections(updatedCollections);

    return { success: true };
  } catch (error) {
    console.error('Failed to rename collection:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao renomear coleção',
    };
  }
}

export async function removeLink(linkId: string): Promise<RemoveLinkResult> {
  try {
    const links = await getLinks();
    const linkIndex = links.findIndex((link) => link.id === linkId);

    if (linkIndex === -1) {
      return { success: false, error: 'Link not found' };
    }

    const removedLink = links[linkIndex];
    const collectionId = removedLink.collectionId;
    const updatedLinks = links.filter((link) => link.id !== linkId);
    await saveLinks(updatedLinks);

    const remainingLinksInCollection = updatedLinks.filter(
      (link) => link.collectionId === collectionId
    );

    let collectionRemoved = false;
    if (remainingLinksInCollection.length === 0 && collectionId !== 'inbox') {
      const collections = await getCollections();
      const updatedCollections = collections.filter((c) => c.id !== collectionId);
      await saveCollections(updatedCollections);
      collectionRemoved = true;
    }

    return { success: true, collectionRemoved };
  } catch (error) {
    console.error('Failed to remove link from storage:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Creates a new Inbox collection object with default properties.
 * This is a pure function that returns a new InboxCollection instance
 * without persisting to storage.
 *
 * @returns A new InboxCollection object with all required properties
 */
export function createInboxCollection(): InboxCollection {
  return {
    id: INBOX_COLLECTION_ID,
    name: INBOX_COLLECTION_NAME,
    order: 0,
    createdAt: Date.now(),
    isDefault: true,
  };
}

/**
 * Initializes the Inbox collection if it doesn't exist in storage.
 * This function is idempotent and safe to call multiple times.
 * If the Inbox already exists, no action is taken.
 *
 * @returns Promise that resolves when initialization is complete
 * @throws {StorageError} If storage operations fail
 */
export async function initializeInbox(): Promise<void> {
  const collections = await getCollections();
  const hasInbox = collections.some((c) => c.id === INBOX_COLLECTION_ID);

  if (!hasInbox) {
    const inbox = createInboxCollection();
    await saveCollections([inbox, ...collections]);
  }
}

/**
 * Removes a collection from storage.
 * The Inbox collection cannot be removed and will throw an error.
 * Links belonging to the removed collection are moved to Inbox.
 *
 * @param collectionId - The ID of the collection to remove
 * @throws {StorageError} If attempting to delete the Inbox collection
 */
export async function removeCollection(collectionId: string): Promise<void> {
  if (collectionId === INBOX_COLLECTION_ID) {
    throw new StorageError(
      'The Inbox collection cannot be removed.',
      'INBOX_DELETE_FORBIDDEN'
    );
  }

  const [collections, links] = await Promise.all([getCollections(), getLinks()]);

  const updatedCollections = collections.filter((c) => c.id !== collectionId);
  const updatedLinks = links.map((link) =>
    link.collectionId === collectionId
      ? { ...link, collectionId: INBOX_COLLECTION_ID }
      : link
  );

  await Promise.all([saveCollections(updatedCollections), saveLinks(updatedLinks)]);
}

/**
 * Input data for creating a new link.
 * collectionId is optional and defaults to Inbox.
 */
export interface AddLinkInput {
  url: string;
  title: string;
  favicon?: string;
  collectionId?: string;
}

/**
 * Adds a new link to storage.
 * If no collectionId is provided, the link is added to the Inbox collection.
 *
 * @param input - The link data to save
 * @returns The created link with generated id and timestamp
 */
export async function addLink(input: AddLinkInput): Promise<Link> {
  const newLink: Link = {
    id: crypto.randomUUID(),
    url: input.url,
    title: input.title,
    favicon: input.favicon,
    collectionId: input.collectionId ?? INBOX_COLLECTION_ID,
    createdAt: Date.now(),
  };

  const links = await getLinks();
  await saveLinks([newLink, ...links]);

  return newLink;
}

/**
 * Result of validating a collection deletion.
 */
export interface ValidateCollectionDeletionResult {
  valid: boolean;
  error?: string;
}

/**
 * Validates whether a collection can be deleted.
 * Returns an error if the collection is the Inbox or doesn't exist.
 *
 * @param collectionId - The ID of the collection to validate
 * @returns Validation result with valid flag and optional error message
 */
export async function validateCollectionDeletion(
  collectionId: string
): Promise<ValidateCollectionDeletionResult> {
  if (collectionId === INBOX_COLLECTION_ID) {
    return {
      valid: false,
      error: 'A coleção Inbox não pode ser excluída',
    };
  }

  const collections = await getCollections();
  const collectionExists = collections.some((c) => c.id === collectionId);

  if (!collectionExists) {
    return {
      valid: false,
      error: 'Coleção não encontrada',
    };
  }

  return { valid: true };
}

/**
 * Input data for creating a new collection.
 */
export interface CreateCollectionInput {
  name: string;
  color?: string;
  workspaceId?: string;
}

/**
 * Creates a new collection and persists it to storage.
 * Validates the name to ensure it's not empty or a duplicate.
 *
 * @param input - The collection data
 * @returns The created collection with generated id and timestamp
 * @throws {StorageError} If validation fails or storage operation fails
 */
export async function createCollection(input: CreateCollectionInput): Promise<Collection> {
  const trimmedName = input.name.trim();
  const existingCollections = await getCollections();

  const validation = validateCollectionName(trimmedName, '', existingCollections);
  if (!validation.valid) {
    throw new StorageError(
      validation.error ?? 'Invalid collection name',
      'INVALID_VALUE'
    );
  }

  const orders = existingCollections.map((c) => c.order);
  const maxOrder = orders.length > 0 ? Math.max(...orders) : 0;

  const newCollection: Collection = {
    id: crypto.randomUUID(),
    name: trimmedName,
    order: maxOrder + 1,
    createdAt: Date.now(),
    color: input.color,
    workspaceId: input.workspaceId ?? DEFAULT_WORKSPACE_ID,
  };

  await saveCollections([...existingCollections, newCollection]);

  return newCollection;
}

/**
 * Result of moving links to Inbox.
 */
export interface MoveLinksToInboxResult {
  success: boolean;
  movedCount: number;
  error?: string;
}

/**
 * Moves all links from a collection to the Inbox collection.
 *
 * @param collectionId - The ID of the collection whose links should be moved
 * @returns Result with success flag and number of links moved
 */
export async function moveLinksToInbox(
  collectionId: string
): Promise<MoveLinksToInboxResult> {
  if (collectionId === INBOX_COLLECTION_ID) {
    return { success: true, movedCount: 0 };
  }

  try {
    const links = await getLinks();
    const linksToMove = links.filter((l) => l.collectionId === collectionId);

    if (linksToMove.length === 0) {
      return { success: true, movedCount: 0 };
    }

    const updatedLinks = links.map((link) =>
      link.collectionId === collectionId
        ? { ...link, collectionId: INBOX_COLLECTION_ID }
        : link
    );

    await saveLinks(updatedLinks);

    return { success: true, movedCount: linksToMove.length };
  } catch (error) {
    return {
      success: false,
      movedCount: 0,
      error: error instanceof Error ? error.message : 'Erro ao mover links',
    };
  }
}

/**
 * Result of deleting a collection.
 */
export interface DeleteCollectionResult {
  success: boolean;
  movedCount: number;
  error?: string;
}

/**
 * Deletes a collection after moving its links to Inbox.
 * Implements atomic operation with rollback on failure.
 *
 * @param collectionId - The ID of the collection to delete
 * @returns Result with success flag and number of links moved
 */
export async function deleteCollection(
  collectionId: string
): Promise<DeleteCollectionResult> {
  const validation = await validateCollectionDeletion(collectionId);
  if (!validation.valid) {
    return {
      success: false,
      movedCount: 0,
      error: validation.error,
    };
  }

  const [originalLinks, originalCollections] = await Promise.all([
    getLinks(),
    getCollections(),
  ]);

  try {
    const moveResult = await moveLinksToInbox(collectionId);
    if (!moveResult.success) {
      return {
        success: false,
        movedCount: 0,
        error: moveResult.error ?? 'Erro ao mover links para Inbox',
      };
    }

    const collections = await getCollections();
    const updatedCollections = collections.filter((c) => c.id !== collectionId);
    await saveCollections(updatedCollections);

    return {
      success: true,
      movedCount: moveResult.movedCount,
    };
  } catch (error) {
    try {
      await Promise.all([
        saveLinks(originalLinks),
        saveCollections(originalCollections),
      ]);
    } catch (rollbackError) {
      console.error('Rollback failed:', rollbackError);
    }

    return {
      success: false,
      movedCount: 0,
      error: 'Não foi possível excluir a coleção. Tente novamente',
    };
  }
}

// Settings functions

/**
 * Retrieves user settings from storage.
 * Returns default settings if none exist.
 *
 * @returns The user's settings
 */
export async function getSettings(): Promise<Settings> {
  const settings = await storage.get<Settings>('settings');
  return settings ?? { ...DEFAULT_SETTINGS };
}

/**
 * Saves user settings to storage.
 *
 * @param settings - The settings to save
 */
export async function saveSettings(settings: Settings): Promise<void> {
  await storage.set('settings', settings);
}

/**
 * Updates specific settings fields without overwriting others.
 *
 * @param updates - Partial settings to update
 * @returns The updated settings
 */
export async function updateSettings(updates: Partial<Settings>): Promise<Settings> {
  const current = await getSettings();
  const updated = { ...current, ...updates };
  await saveSettings(updated);
  return updated;
}

// Link management functions for Kanban

/**
 * Result of moving a link operation.
 */
export interface MoveLinkResult {
  success: boolean;
  error?: string;
}

/**
 * Moves a link to a different collection.
 *
 * @param linkId - The ID of the link to move
 * @param toCollectionId - The ID of the target collection
 * @returns Result indicating success or failure
 */
export async function moveLink(
  linkId: string,
  toCollectionId: string
): Promise<MoveLinkResult> {
  try {
    const links = await getLinks();
    const linkIndex = links.findIndex((link) => link.id === linkId);

    if (linkIndex === -1) {
      return { success: false, error: 'Link não encontrado' };
    }

    const collections = await getCollections();
    const targetExists = collections.some((c) => c.id === toCollectionId);

    if (!targetExists) {
      return { success: false, error: 'Coleção de destino não encontrada' };
    }

    const updatedLinks = links.map((link) =>
      link.id === linkId ? { ...link, collectionId: toCollectionId } : link
    );

    await saveLinks(updatedLinks);

    return { success: true };
  } catch (error) {
    console.error('Failed to move link:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao mover link',
    };
  }
}

/**
 * Result of updating collection order.
 */
export interface UpdateCollectionOrderResult {
  success: boolean;
  error?: string;
}

/**
 * Updates the order of collections.
 * The order is determined by the position in the array.
 *
 * @param orderedCollections - Collections in desired order
 * @returns Result indicating success or failure
 */
export async function updateCollectionOrder(
  orderedCollections: Collection[]
): Promise<UpdateCollectionOrderResult> {
  try {
    const updatedCollections = orderedCollections.map((collection, index) => ({
      ...collection,
      order: index,
    }));

    await saveCollections(updatedCollections);

    return { success: true };
  } catch (error) {
    console.error('Failed to update collection order:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao reordenar coleções',
    };
  }
}

// Workspace storage functions

/**
 * Retrieves all workspaces from storage, sorted by order.
 *
 * @returns Array of Workspace objects, or empty array if none exist
 */
export async function getWorkspaces(): Promise<Workspace[]> {
  const workspaces = await storage.get<Workspace[]>('workspaces');
  if (!workspaces || workspaces.length === 0) {
    return [];
  }

  return workspaces.sort((a, b) => a.order - b.order);
}

/**
 * Saves workspaces array to storage.
 *
 * @param workspaces - Array of Workspace objects to save
 */
export async function saveWorkspaces(workspaces: Workspace[]): Promise<void> {
  await storage.set('workspaces', workspaces);
}

/**
 * Creates the default "Geral" workspace object.
 * This is a pure function that returns a new Workspace instance
 * without persisting to storage.
 *
 * @returns A new default Workspace object
 */
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

/**
 * Initializes the default workspace if it doesn't exist in storage.
 * This function is idempotent and safe to call multiple times.
 * If the default workspace already exists, no action is taken.
 *
 * @returns Promise that resolves when initialization is complete
 */
export async function initializeDefaultWorkspace(): Promise<void> {
  const workspaces = await getWorkspaces();
  const hasDefault = workspaces.some((w) => w.id === DEFAULT_WORKSPACE_ID);

  if (!hasDefault) {
    const defaultWorkspace = createDefaultWorkspace();
    await saveWorkspaces([defaultWorkspace, ...workspaces]);
  }
}

/**
 * Result of a workspace operation.
 */
export interface WorkspaceOperationResult {
  success: boolean;
  error?: string;
}

/**
 * Creates a new workspace and persists it to storage.
 *
 * @param input - The workspace data
 * @returns The created workspace
 * @throws {StorageError} If validation fails or storage operation fails
 */
export async function createWorkspace(input: CreateWorkspaceInput): Promise<Workspace> {
  const trimmedName = input.name.trim();
  const trimmedDescription = input.description?.trim();
  const existingWorkspaces = await getWorkspaces();

  // Validate limit
  const limitValidation = validateWorkspaceLimit(existingWorkspaces);
  if (!limitValidation.valid) {
    throw new StorageError(
      limitValidation.error ?? 'Workspace limit reached',
      'INVALID_VALUE'
    );
  }

  // Validate name
  const nameValidation = validateWorkspaceName(trimmedName, '', existingWorkspaces);
  if (!nameValidation.valid) {
    throw new StorageError(
      nameValidation.error ?? 'Invalid workspace name',
      'INVALID_VALUE'
    );
  }

  // Validate description
  if (trimmedDescription) {
    const descValidation = validateWorkspaceDescription(trimmedDescription);
    if (!descValidation.valid) {
      throw new StorageError(
        descValidation.error ?? 'Invalid workspace description',
        'INVALID_VALUE'
      );
    }
  }

  // Validate color
  const colorValidation = validateWorkspaceColor(input.color);
  if (!colorValidation.valid) {
    throw new StorageError(
      colorValidation.error ?? 'Invalid workspace color',
      'INVALID_VALUE'
    );
  }

  const orders = existingWorkspaces.map((w) => w.order);
  const maxOrder = orders.length > 0 ? Math.max(...orders) : 0;

  const newWorkspace: Workspace = {
    id: crypto.randomUUID(),
    name: trimmedName,
    description: trimmedDescription,
    color: input.color,
    order: maxOrder + 1,
    createdAt: Date.now(),
  };

  await saveWorkspaces([...existingWorkspaces, newWorkspace]);

  return newWorkspace;
}

/**
 * Updates an existing workspace.
 *
 * @param id - The ID of the workspace to update
 * @param updates - Partial workspace data to update
 * @returns Result indicating success or failure
 */
export async function updateWorkspace(
  id: string,
  updates: Partial<Omit<Workspace, 'id' | 'createdAt' | 'isDefault'>>
): Promise<WorkspaceOperationResult> {
  try {
    const workspaces = await getWorkspaces();
    const workspaceIndex = workspaces.findIndex((w) => w.id === id);

    if (workspaceIndex === -1) {
      return { success: false, error: 'Workspace não encontrado' };
    }

    const workspace = workspaces[workspaceIndex];

    // Validate name update
    if (updates.name !== undefined) {
      const trimmedName = updates.name.trim();

      // Check if trying to rename default workspace
      if (workspace.isDefault === true || workspace.id === DEFAULT_WORKSPACE_ID) {
        return { success: false, error: 'O workspace padrão não pode ser renomeado' };
      }

      const nameValidation = validateWorkspaceName(trimmedName, id, workspaces);
      if (!nameValidation.valid) {
        return { success: false, error: nameValidation.error };
      }
      updates.name = trimmedName;
    }

    // Validate description update
    if (updates.description !== undefined) {
      const trimmedDescription = updates.description.trim();
      const descValidation = validateWorkspaceDescription(trimmedDescription);
      if (!descValidation.valid) {
        return { success: false, error: descValidation.error };
      }
      updates.description = trimmedDescription;
    }

    // Validate color update
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
      error: error instanceof Error ? error.message : 'Erro ao atualizar workspace',
    };
  }
}

/**
 * Deletes a workspace and moves its collections to the default workspace.
 *
 * @param id - The ID of the workspace to delete
 * @returns Result indicating success or failure
 */
export async function deleteWorkspace(id: string): Promise<WorkspaceOperationResult> {
  try {
    const workspaces = await getWorkspaces();

    // Validate deletion
    const validation = validateWorkspaceDeletion(id, workspaces);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    // Move collections from deleted workspace to default workspace
    const collections = await getCollections();
    const updatedCollections = collections.map((c) =>
      c.workspaceId === id ? { ...c, workspaceId: DEFAULT_WORKSPACE_ID } : c
    );

    // Remove the workspace
    const updatedWorkspaces = workspaces.filter((w) => w.id !== id);

    await Promise.all([
      saveWorkspaces(updatedWorkspaces),
      saveCollections(updatedCollections),
    ]);

    return { success: true };
  } catch (error) {
    console.error('Failed to delete workspace:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao excluir workspace',
    };
  }
}

/**
 * Updates the order of workspaces.
 *
 * @param orderedWorkspaces - Workspaces in desired order
 * @returns Result indicating success or failure
 */
export async function updateWorkspaceOrder(
  orderedWorkspaces: Workspace[]
): Promise<WorkspaceOperationResult> {
  try {
    const updatedWorkspaces = orderedWorkspaces.map((workspace, index) => ({
      ...workspace,
      order: index,
    }));

    await saveWorkspaces(updatedWorkspaces);

    return { success: true };
  } catch (error) {
    console.error('Failed to update workspace order:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao reordenar workspaces',
    };
  }
}

/**
 * Gets collections filtered by workspace ID.
 *
 * @param workspaceId - The ID of the workspace to filter by
 * @returns Array of collections belonging to the workspace
 */
export async function getCollectionsByWorkspace(workspaceId: string): Promise<Collection[]> {
  const collections = await getCollections();
  return collections.filter((c) => c.workspaceId === workspaceId);
}

/**
 * Moves a collection to a different workspace.
 *
 * @param collectionId - The ID of the collection to move
 * @param workspaceId - The ID of the target workspace
 * @returns Result indicating success or failure
 */
export async function moveCollectionToWorkspace(
  collectionId: string,
  workspaceId: string
): Promise<WorkspaceOperationResult> {
  try {
    // Cannot move Inbox
    if (collectionId === INBOX_COLLECTION_ID) {
      return { success: false, error: 'O Inbox não pode ser movido' };
    }

    const [collections, workspaces] = await Promise.all([
      getCollections(),
      getWorkspaces(),
    ]);

    // Check if collection exists
    const collection = collections.find((c) => c.id === collectionId);
    if (!collection) {
      return { success: false, error: 'Coleção não encontrada' };
    }

    // Check if workspace exists
    const workspace = workspaces.find((w) => w.id === workspaceId);
    if (!workspace) {
      return { success: false, error: 'Workspace de destino não encontrado' };
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
      error: error instanceof Error ? error.message : 'Erro ao mover coleção',
    };
  }
}

/**
 * Migrates existing data to support workspaces.
 * - Creates the default "Geral" workspace if not exists
 * - Updates existing collections (except Inbox) to belong to "Geral"
 *
 * This function is idempotent and safe to call multiple times.
 */
export async function migrateToWorkspaces(): Promise<void> {
  const workspaces = await getWorkspaces();

  // If workspaces already exist, skip migration
  if (workspaces.length > 0) {
    return;
  }

  // Create default workspace
  const defaultWorkspace = createDefaultWorkspace();
  await saveWorkspaces([defaultWorkspace]);

  // Update existing collections to belong to default workspace
  // (except Inbox which remains global)
  const collections = await getCollections();
  const migratedCollections = collections.map((c) =>
    c.id === INBOX_COLLECTION_ID ? c : { ...c, workspaceId: DEFAULT_WORKSPACE_ID }
  );

  await saveCollections(migratedCollections);
}
