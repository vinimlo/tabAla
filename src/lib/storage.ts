/**
 * Storage wrapper for chrome.storage.local API.
 */

import type { Link, Collection } from '@/lib/types';

export async function getLinks(): Promise<Link[]> {
  const result = await chrome.storage.local.get('links');
  return result.links ?? [];
}

export async function saveLinks(links: Link[]): Promise<void> {
  await chrome.storage.local.set({ links });
}

export async function getCollections(): Promise<Collection[]> {
  const result = await chrome.storage.local.get('collections');
  return result.collections ?? [];
}

export async function saveCollections(collections: Collection[]): Promise<void> {
  await chrome.storage.local.set({ collections });
}
