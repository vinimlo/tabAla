import type { Link } from '../types';
import { INBOX_COLLECTION_ID, isValidUrl } from '../types';
import { t } from '../i18n';
import type { OperationResult, RemoveLinkResult, AddLinkInput } from './core';
import { StorageError, getErrorMessage, withDataLock } from './core';
import { getLinks, saveLinks, getCollections } from './data-access';
import { applyLinkOrder } from '../link-order';

/**
 * Prepends a link built by the caller (e.g. an optimistic store update).
 * Every save path ends here, including tabs dropped from outside the extension.
 */
export async function insertLink(link: Link): Promise<void> {
  if (!isValidUrl(link.url) || typeof link.title !== 'string') {
    throw new StorageError(t('error_tab_invalid_url'), 'INVALID_VALUE');
  }
  await withDataLock(async () => {
    const links = await getLinks();
    await saveLinks([link, ...links]);
  });
}

export async function addLink(input: AddLinkInput): Promise<Link> {
  const newLink: Link = {
    id: crypto.randomUUID(),
    url: input.url,
    title: input.title,
    favicon: input.favicon,
    collectionId: input.collectionId ?? INBOX_COLLECTION_ID,
    createdAt: Date.now(),
  };

  await insertLink(newLink);

  return newLink;
}

/** Removes a link. Its collection stays, even when it ends up empty. */
export async function removeLink(linkId: string): Promise<RemoveLinkResult> {
  try {
    return await withDataLock(async () => {
      const links = await getLinks();

      if (!links.some((link) => link.id === linkId)) {
        return { success: false, error: t('storage_link_not_found') };
      }

      await saveLinks(links.filter((link) => link.id !== linkId));
      return { success: true };
    });
  } catch (error) {
    console.error('Failed to remove link from storage:', error);
    return {
      success: false,
      error: getErrorMessage(error, 'Unknown error'),
    };
  }
}

/** Reassigns links whose collectionId doesn't match any existing collection to Inbox. */
export async function recoverOrphanedLinks(): Promise<number> {
  return withDataLock(async () => {
    const [links, collections] = await Promise.all([getLinks(), getCollections()]);
    const collectionIds = new Set(collections.map((c) => c.id));

    const orphaned = links.filter((l) => !collectionIds.has(l.collectionId));
    if (orphaned.length === 0) {
      return 0;
    }

    const updatedLinks = links.map((l) =>
      collectionIds.has(l.collectionId) ? l : { ...l, collectionId: INBOX_COLLECTION_ID }
    );

    await saveLinks(updatedLinks);
    return orphaned.length;
  });
}

export async function moveLink(
  linkId: string,
  toCollectionId: string
): Promise<OperationResult> {
  try {
    return await withDataLock(async () => {
      const links = await getLinks();

      if (!links.some((link) => link.id === linkId)) {
        return { success: false, error: t('storage_link_not_found') };
      }

      const collections = await getCollections();

      if (!collections.some((c) => c.id === toCollectionId)) {
        return { success: false, error: t('storage_target_collection_not_found') };
      }

      // Its old position meant nothing in the new collection: it goes on top.
      const updatedLinks = links.map((link) => {
        if (link.id !== linkId) {
          return link;
        }
        const { order: _order, ...unplaced } = link;
        return { ...unplaced, collectionId: toCollectionId };
      });

      await saveLinks(updatedLinks);

      return { success: true };
    });
  } catch (error) {
    console.error('Failed to move link:', error);
    return {
      success: false,
      error: getErrorMessage(error, t('error_move_link_failed')),
    };
  }
}

/** Saves the order of a collection after a drag, moving in links dropped from elsewhere. */
export async function reorderLinks(
  collectionId: string,
  orderedIds: string[]
): Promise<OperationResult> {
  try {
    return await withDataLock(async () => {
      const collections = await getCollections();

      if (!collections.some((c) => c.id === collectionId)) {
        return { success: false, error: t('storage_target_collection_not_found') };
      }

      await saveLinks(applyLinkOrder(await getLinks(), collectionId, orderedIds));
      return { success: true };
    });
  } catch (error) {
    console.error('Failed to reorder links:', error);
    return {
      success: false,
      error: getErrorMessage(error, t('error_move_link_failed')),
    };
  }
}
