/**
 * Storage wrapper for chrome.storage.local API.
 */

import type { Link, Collection } from '@/lib/types';

export async function getLinks(): Promise<Link[]> {
  try {
    const result = await chrome.storage.local.get('links');
    return (result.links as Link[] | undefined) ?? [];
  } catch (error) {
    console.error('Failed to get links from storage:', error);
    throw error;
  }
}

export async function saveLinks(links: Link[]): Promise<void> {
  try {
    await chrome.storage.local.set({ links });
  } catch (error) {
    console.error('Failed to save links to storage:', error);
    throw error;
  }
}

export async function getCollections(): Promise<Collection[]> {
  try {
    const result = await chrome.storage.local.get('collections');
    return (result.collections as Collection[] | undefined) ?? [];
  } catch (error) {
    console.error('Failed to get collections from storage:', error);
    throw error;
  }
}

export async function saveCollections(collections: Collection[]): Promise<void> {
  try {
    await chrome.storage.local.set({ collections });
  } catch (error) {
    console.error('Failed to save collections to storage:', error);
    throw error;
  }
}

export interface RemoveLinkResult {
  success: boolean;
  error?: string;
  collectionRemoved?: boolean;
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
