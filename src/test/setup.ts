/**
 * Vitest global setup file.
 * Configures Chrome Extension API mocks and test environment.
 */
import { vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import '@testing-library/svelte/vitest';

type StorageData = Record<string, unknown>;
type StorageCallback = (items: StorageData) => void;

const mockStorage: StorageData = {};

const createStorageArea = () => ({
  get: vi.fn((keys: string | string[] | null, callback?: StorageCallback) => {
    const result: StorageData = {};
    if (keys === null) {
      Object.assign(result, mockStorage);
    } else if (typeof keys === 'string') {
      result[keys] = mockStorage[keys];
    } else if (Array.isArray(keys)) {
      keys.forEach((key) => {
        result[key] = mockStorage[key];
      });
    }
    if (callback) {
      callback(result);
    }
    return Promise.resolve(result);
  }),

  set: vi.fn((items: StorageData, callback?: () => void) => {
    Object.assign(mockStorage, items);
    if (callback) {
      callback();
    }
    return Promise.resolve();
  }),

  remove: vi.fn((keys: string | string[], callback?: () => void) => {
    const keysToRemove = Array.isArray(keys) ? keys : [keys];
    keysToRemove.forEach((key) => {
      delete mockStorage[key];
    });
    if (callback) {
      callback();
    }
    return Promise.resolve();
  }),

  clear: vi.fn((callback?: () => void) => {
    Object.keys(mockStorage).forEach((key) => {
      delete mockStorage[key];
    });
    if (callback) {
      callback();
    }
    return Promise.resolve();
  }),
});

const chromeMock = {
  storage: {
    local: createStorageArea(),
    sync: createStorageArea(),
    onChanged: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
      hasListener: vi.fn(() => false),
    },
  },

  tabs: {
    query: vi.fn(() => Promise.resolve([])),
    get: vi.fn((tabId: number) => Promise.resolve({ id: tabId, url: '', title: '' })),
    create: vi.fn((props) => Promise.resolve({ id: 1, ...props })),
    update: vi.fn((tabId: number, props) => Promise.resolve({ id: tabId, ...props })),
    remove: vi.fn(() => Promise.resolve()),
    onCreated: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
    },
    onRemoved: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
    },
    onUpdated: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
    },
  },

  runtime: {
    id: 'test-extension-id',
    getURL: vi.fn((path: string) => `chrome-extension://test-extension-id/${path}`),
    sendMessage: vi.fn(() => Promise.resolve()),
    onMessage: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
    },
    onInstalled: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
    },
    lastError: null,
  },

  commands: {
    getAll: vi.fn(() => Promise.resolve([])),
    onCommand: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
    },
  },
};

vi.stubGlobal('chrome', chromeMock);

export { chromeMock, mockStorage };
