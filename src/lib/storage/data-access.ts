import type { Link, Collection, Settings, Workspace } from '../types';
import { INBOX_COLLECTION_ID, DEFAULT_SETTINGS } from '../types';
import { storage } from './core';

export async function getLinks(): Promise<Link[]> {
  const links = await storage.get<Link[]>('links');
  return links ?? [];
}

export async function saveLinks(links: Link[]): Promise<void> {
  await storage.set('links', links);
}

/** Returns collections sorted with Inbox first, then by order ascending. */
export async function getCollections(): Promise<Collection[]> {
  const collections = await storage.get<Collection[]>('collections');
  return (collections ?? []).sort((a, b) => {
    if (a.id === INBOX_COLLECTION_ID) return -1;
    if (b.id === INBOX_COLLECTION_ID) return 1;
    return a.order - b.order;
  });
}

export async function saveCollections(collections: Collection[]): Promise<void> {
  await storage.set('collections', collections);
}

/** Returns workspaces sorted by order. */
export async function getWorkspaces(): Promise<Workspace[]> {
  const workspaces = await storage.get<Workspace[]>('workspaces');
  return (workspaces ?? []).sort((a, b) => a.order - b.order);
}

export async function saveWorkspaces(workspaces: Workspace[]): Promise<void> {
  await storage.set('workspaces', workspaces);
}

/** Returns settings merged with defaults (handles missing fields from older versions). */
export async function getSettings(): Promise<Settings> {
  const settings = await storage.get<Partial<Settings>>('settings');
  return { ...DEFAULT_SETTINGS, ...settings };
}

export async function saveSettings(settings: Settings): Promise<void> {
  await storage.set('settings', settings);
}

/** Merges partial updates into existing settings. */
export async function updateSettings(updates: Partial<Settings>): Promise<Settings> {
  const current = await getSettings();
  const updated = { ...current, ...updates };
  await saveSettings(updated);
  return updated;
}
