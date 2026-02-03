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
