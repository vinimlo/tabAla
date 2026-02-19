import type { Link } from '../types';
import { INBOX_COLLECTION_ID } from '../types';
import { t } from '../i18n';
import type { OperationResult, RemoveLinkResult, AddLinkInput } from './core';
import { getErrorMessage } from './core';
import { getLinks, saveLinks, getCollections, saveCollections } from './data-access';

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

/** Removes a link and cleans up the collection if it becomes empty. */
export async function removeLink(linkId: string): Promise<RemoveLinkResult> {
  try {
    const links = await getLinks();
    const linkIndex = links.findIndex((link) => link.id === linkId);

    if (linkIndex === -1) {
      return { success: false, error: t('storage_link_not_found') };
    }

    const { collectionId } = links[linkIndex];
    const updatedLinks = links.filter((link) => link.id !== linkId);
    await saveLinks(updatedLinks);

    const hasRemainingLinks = updatedLinks.some(
      (link) => link.collectionId === collectionId
    );

    let collectionRemoved = false;
    if (!hasRemainingLinks && collectionId !== INBOX_COLLECTION_ID) {
      const collections = await getCollections();
      await saveCollections(collections.filter((c) => c.id !== collectionId));
      collectionRemoved = true;
    }

    return { success: true, collectionRemoved };
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
}

export async function moveLink(
  linkId: string,
  toCollectionId: string
): Promise<OperationResult> {
  try {
    const links = await getLinks();

    if (!links.some((link) => link.id === linkId)) {
      return { success: false, error: t('storage_link_not_found') };
    }

    const collections = await getCollections();

    if (!collections.some((c) => c.id === toCollectionId)) {
      return { success: false, error: t('storage_target_collection_not_found') };
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
      error: getErrorMessage(error, t('error_move_link_failed')),
    };
  }
}
