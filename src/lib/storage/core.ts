export interface OperationResult {
  success: boolean;
  error?: string;
}

export interface StorageChange<T = unknown> {
  oldValue?: T;
  newValue?: T;
}

export type StorageChanges = Record<string, StorageChange>;

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

export type StorageErrorCode =
  | 'QUOTA_EXCEEDED'
  | 'INVALID_KEY'
  | 'INVALID_VALUE'
  | 'CHROME_API_ERROR'
  | 'INBOX_DELETE_FORBIDDEN'
  | 'UNKNOWN_ERROR';

export interface RemoveLinkResult {
  success: boolean;
  error?: string;
  collectionRemoved?: boolean;
}

export interface AddLinkInput {
  url: string;
  title: string;
  favicon?: string;
  collectionId?: string;
}

export interface CreateCollectionInput {
  name: string;
  color?: string;
  workspaceId?: string;
}

export function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

// Validation helpers

function validateKey(key: string): void {
  if (typeof key !== 'string' || key.trim() === '') {
    throw new StorageError(
      'Storage key must be a non-empty string',
      'INVALID_KEY'
    );
  }
}

function validateKeys(keys: string[]): void {
  if (!Array.isArray(keys) || keys.length === 0) {
    throw new StorageError(
      'Keys array must not be empty',
      'INVALID_KEY'
    );
  }
  keys.forEach(validateKey);
}

function validateItems(items: Record<string, unknown>): void {
  if (!items || typeof items !== 'object' || Object.keys(items).length === 0) {
    throw new StorageError('Items object must not be empty', 'INVALID_VALUE');
  }
}

function isQuotaExceededError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return message.includes('quota') || message.includes('exceeded');
}

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

  const message = getErrorMessage(error, 'Unknown error');
  return new StorageError(
    `Failed to ${operation}: ${message}`,
    'CHROME_API_ERROR',
    error
  );
}

// CRUD operations

async function get<T>(key: string): Promise<T | null> {
  validateKey(key);
  try {
    const result = await chrome.storage.local.get(key);
    return (result[key] as T) ?? null;
  } catch (error) {
    throw wrapError(error, `get value for key "${key}"`);
  }
}

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

async function remove(key: string): Promise<void> {
  validateKey(key);
  try {
    await chrome.storage.local.remove(key);
  } catch (error) {
    throw wrapError(error, `remove key "${key}"`);
  }
}

async function clear(): Promise<void> {
  try {
    await chrome.storage.local.clear();
  } catch (error) {
    throw wrapError(error, 'clear storage');
  }
}

async function getAll(): Promise<Record<string, unknown>> {
  try {
    return await chrome.storage.local.get(null);
  } catch (error) {
    throw wrapError(error, 'get all storage data');
  }
}

async function getBatch<T>(keys: string[]): Promise<Record<string, T>> {
  validateKeys(keys);
  try {
    return await chrome.storage.local.get(keys) as Record<string, T>;
  } catch (error) {
    throw wrapError(error, 'get batch values');
  }
}

async function setBatch(items: Record<string, unknown>): Promise<void> {
  validateItems(items);
  try {
    await chrome.storage.local.set(items);
  } catch (error) {
    throw wrapError(error, 'set batch values');
  }
}

async function removeBatch(keys: string[]): Promise<void> {
  validateKeys(keys);
  try {
    await chrome.storage.local.remove(keys);
  } catch (error) {
    throw wrapError(error, 'remove batch keys');
  }
}

function watch(callback: (changes: StorageChanges) => void): () => void {
  const listener = (
    changes: Record<string, chrome.storage.StorageChange>,
    areaName: string
  ): void => {
    if (areaName !== 'local') {
      return;
    }
    callback(changes);
  };

  chrome.storage.onChanged.addListener(listener);

  return () => {
    chrome.storage.onChanged.removeListener(listener);
  };
}

export const storage = {
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
