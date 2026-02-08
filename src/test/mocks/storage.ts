/**
 * Shared storage mock factory for tests that need to mock @/lib/storage.
 * Used by tests that test store/component behavior rather than storage itself.
 */
import { vi } from 'vitest';
import { DEFAULT_SETTINGS } from '@/lib/types';

export function createStorageMock(): Record<string, unknown> {
  return {
    getLinks: vi.fn(() => Promise.resolve([])),
    saveLinks: vi.fn(() => Promise.resolve()),
    getCollections: vi.fn(() => Promise.resolve([])),
    saveCollections: vi.fn(() => Promise.resolve()),
    initializeInbox: vi.fn(() => Promise.resolve()),
    removeCollection: vi.fn(() => Promise.resolve()),
    createCollection: vi.fn(() => Promise.resolve({ id: 'new-collection', name: 'New', order: 1 })),
    renameCollection: vi.fn(() => Promise.resolve({ success: true })),
    moveLink: vi.fn(() => Promise.resolve({ success: true })),
    updateCollectionOrder: vi.fn(() => Promise.resolve({ success: true })),
    getWorkspaces: vi.fn(() => Promise.resolve([])),
    saveWorkspaces: vi.fn(() => Promise.resolve()),
    migrateToWorkspaces: vi.fn(() => Promise.resolve()),
    initializeDefaultWorkspace: vi.fn(() => Promise.resolve()),
    getSettings: vi.fn(() => Promise.resolve({ ...DEFAULT_SETTINGS })),
    updateSettings: vi.fn((updates: Partial<typeof DEFAULT_SETTINGS>) =>
      Promise.resolve({ ...DEFAULT_SETTINGS, ...updates })
    ),
    getErrorMessage: vi.fn((error: unknown, fallback: string) =>
      error instanceof Error ? error.message : fallback
    ),
    storage: {
      watch: vi.fn(() => () => {}),
    },
  };
}
