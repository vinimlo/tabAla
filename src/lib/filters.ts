/**
 * Filtering utilities for links and collections.
 * Optimized for performance with large datasets (100+ links).
 */

import type { Link } from './types';

/**
 * Special value representing "show all collections" filter.
 */
export const ALL_COLLECTIONS_FILTER = '__all__';

/**
 * Simple memoization cache for filter results.
 * Automatically invalidates when links array reference changes.
 */
let filterCache: {
  linksRef: Link[] | null;
  results: Map<string, Link[]>;
} = {
  linksRef: null,
  results: new Map(),
};

function getOrCreateFilterCache(links: Link[]): Map<string, Link[]> {
  if (filterCache.linksRef !== links) {
    filterCache = {
      linksRef: links,
      results: new Map(),
    };
  }
  return filterCache.results;
}

/**
 * Filters links by collection ID with memoization for performance.
 *
 * @param links - Array of links to filter
 * @param collectionId - Collection ID to filter by, or ALL_COLLECTIONS_FILTER/null for all
 * @returns Filtered array of links
 *
 * @example
 * ```typescript
 * const filtered = filterLinksByCollection(links, 'inbox');
 * const all = filterLinksByCollection(links, ALL_COLLECTIONS_FILTER);
 * ```
 */
export function filterLinksByCollection(
  links: Link[],
  collectionId: string | null
): Link[] {
  if (collectionId === null || collectionId === ALL_COLLECTIONS_FILTER) {
    return links;
  }

  const cache = getOrCreateFilterCache(links);
  const cached = cache.get(collectionId);
  if (cached !== undefined) {
    return cached;
  }

  const result = links.filter((link) => link.collectionId === collectionId);
  cache.set(collectionId, result);
  return result;
}

/**
 * Counts links per collection.
 *
 * @param links - Array of links to count
 * @returns Map of collection ID to link count
 */
export function countLinksByCollection(links: Link[]): Map<string, number> {
  const counts = new Map<string, number>();

  for (const link of links) {
    const current = counts.get(link.collectionId) ?? 0;
    counts.set(link.collectionId, current + 1);
  }

  return counts;
}

/**
 * Gets the count of links for a specific collection or all links.
 *
 * @param links - Array of links
 * @param collectionId - Collection ID or ALL_COLLECTIONS_FILTER for total
 * @returns Number of links
 */
export function getLinkCount(links: Link[], collectionId: string | null): number {
  if (collectionId === null || collectionId === ALL_COLLECTIONS_FILTER) {
    return links.length;
  }
  return links.filter((link) => link.collectionId === collectionId).length;
}
