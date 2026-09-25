/** Numbers of the page header (spec §5.1). */
import type { Collection, Link } from '@/lib/types';
import { isReference } from '@/lib/recommend/state';

export interface PendingSummary {
  links: number;
  collections: number;
}

/** Links of the collections on screen that are neither completed nor reference; snoozed ones count. */
export function pendingSummary(links: Link[], collections: Collection[]): PendingSummary {
  const byId = new Map(collections.map((collection) => [collection.id, collection]));
  const pending = links.filter((link) => {
    const collection = byId.get(link.collectionId);
    return collection !== undefined && link.completedAt === undefined && !isReference(link, collection);
  });
  return { links: pending.length, collections: new Set(pending.map((link) => link.collectionId)).size };
}
