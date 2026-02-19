import type { Collection, InboxCollection } from '../types';
import {
  INBOX_COLLECTION_ID,
  INBOX_COLLECTION_NAME,
  DEFAULT_WORKSPACE_ID,
  calculateNextOrder,
} from '../types';
import { validateCollectionName } from '../validation';
import { t } from '../i18n';
import type { OperationResult, CreateCollectionInput } from './core';
import { StorageError, getErrorMessage } from './core';
import { getLinks, saveLinks, getCollections, saveCollections } from './data-access';

export function createInboxCollection(): InboxCollection {
  return {
    id: INBOX_COLLECTION_ID,
    name: INBOX_COLLECTION_NAME,
    order: 0,
    createdAt: Date.now(),
    isDefault: true,
  };
}

/** Ensures the Inbox collection exists in storage. */
export async function initializeInbox(): Promise<void> {
  const collections = await getCollections();
  const hasInbox = collections.some((c) => c.id === INBOX_COLLECTION_ID);

  if (!hasInbox) {
    const inbox = createInboxCollection();
    await saveCollections([inbox, ...collections]);
  }
}

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

  const newCollection: Collection = {
    id: crypto.randomUUID(),
    name: trimmedName,
    order: calculateNextOrder(existingCollections),
    createdAt: Date.now(),
    color: input.color,
    workspaceId: input.workspaceId ?? DEFAULT_WORKSPACE_ID,
  };

  await saveCollections([...existingCollections, newCollection]);

  return newCollection;
}

export async function renameCollection(
  collectionId: string,
  newName: string
): Promise<OperationResult> {
  try {
    const collections = await getCollections();

    if (!collections.some((c) => c.id === collectionId)) {
      return { success: false, error: t('storage_collection_not_found') };
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
      error: getErrorMessage(error, t('error_rename_collection_storage')),
    };
  }
}

/** Links belonging to the removed collection are moved to Inbox. */
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

export async function updateCollectionOrder(
  orderedCollections: Collection[]
): Promise<OperationResult> {
  try {
    const allCollections = await getCollections();
    const reorderedIds = new Map(orderedCollections.map((c, i) => [c.id, i]));

    const merged = allCollections.map((c) => {
      const newOrder = reorderedIds.get(c.id);
      return newOrder !== undefined ? { ...c, order: newOrder } : c;
    });

    await saveCollections(merged);

    return { success: true };
  } catch (error) {
    console.error('Failed to update collection order:', error);
    return {
      success: false,
      error: getErrorMessage(error, t('error_reorder_collections_failed')),
    };
  }
}
