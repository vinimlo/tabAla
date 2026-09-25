/**
 * Storage for the recommendation space: link and collection state (spec §4-§5).
 */
import type { Collection, Link } from '../types';
import { t } from '../i18n';
import type { OperationResult } from './core';
import { getErrorMessage, withDataLock } from './core';
import { getLinks, saveLinks, getCollections, saveCollections } from './data-access';

/** A value sets the field; null removes it; an absent key leaves it alone. */
type Patch<T> = { [K in keyof T]?: T[K] | null };

export type LinkStatePatch = Patch<Required<Pick<Link, 'completedAt' | 'snoozedUntil' | 'keptAt' | 'reference'>>>;
export type CollectionStatePatch = Patch<Required<Pick<Collection, 'reference' | 'focus'>>>;

export function applyPatch<T extends object>(target: T, patch: Record<string, unknown>): T {
  const result = { ...target } as Record<string, unknown>;
  for (const [key, value] of Object.entries(patch)) {
    if (value === null) {
      delete result[key];
    } else if (value !== undefined) {
      result[key] = value;
    }
  }
  return result as T;
}

export async function patchLinkState(linkId: string, patch: LinkStatePatch): Promise<OperationResult> {
  try {
    return await withDataLock(async () => {
      const links = await getLinks();
      if (!links.some((link) => link.id === linkId)) {
        return { success: false, error: t('storage_link_not_found') };
      }
      await saveLinks(links.map((link) => (link.id === linkId ? applyPatch(link, patch) : link)));
      return { success: true };
    });
  } catch (error) {
    console.error('Failed to update link state:', error);
    return { success: false, error: getErrorMessage(error, t('error_update_link_failed')) };
  }
}

export async function patchCollectionState(collectionId: string, patch: CollectionStatePatch): Promise<OperationResult> {
  try {
    return await withDataLock(async () => {
      const collections = await getCollections();
      if (!collections.some((c) => c.id === collectionId)) {
        return { success: false, error: t('storage_collection_not_found') };
      }
      await saveCollections(collections.map((c) => (c.id === collectionId ? applyPatch(c, patch) : c)));
      return { success: true };
    });
  } catch (error) {
    console.error('Failed to update collection state:', error);
    return { success: false, error: getErrorMessage(error, t('error_update_collection_failed')) };
  }
}
