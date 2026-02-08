// Core: storage wrapper, error types, interfaces
export {
  storage,
  StorageError,
  getErrorMessage,
  type StorageErrorCode,
  type StorageChange,
  type StorageChanges,
  type OperationResult,
  type RemoveLinkResult,
  type AddLinkInput,
  type CreateCollectionInput,
} from './core';

// Data access: low-level getters/setters
export {
  getLinks,
  saveLinks,
  getCollections,
  saveCollections,
  getWorkspaces,
  saveWorkspaces,
  getSettings,
  saveSettings,
  updateSettings,
} from './data-access';

// Collections
export {
  createInboxCollection,
  initializeInbox,
  createCollection,
  renameCollection,
  removeCollection,
  updateCollectionOrder,
} from './collections';

// Links
export {
  addLink,
  removeLink,
  moveLink,
} from './links';

// Workspaces
export {
  createDefaultWorkspace,
  initializeDefaultWorkspace,
  createWorkspace,
  updateWorkspace,
  deleteWorkspace,
  updateWorkspaceOrder,
  getCollectionsByWorkspace,
  moveCollectionToWorkspace,
  migrateToWorkspaces,
} from './workspaces';
