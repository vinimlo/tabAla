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
    return [];
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
    return [];
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
