/**
 * Manual link order inside a collection.
 *
 * `Link.order` is set when the user drags links. Links without it (saved
 * after the last drag) sit on top, newest first; positioned links follow.
 */
import type { Link } from './types';

function compareLinks(a: Link, b: Link): number {
  if (a.order === undefined && b.order === undefined) {
    return b.createdAt - a.createdAt;
  }
  if (a.order === undefined) {
    return -1;
  }
  if (b.order === undefined) {
    return 1;
  }
  return a.order - b.order;
}

/** Display order of the links of one collection. */
export function sortCollectionLinks(links: Link[]): Link[] {
  return [...links].sort(compareLinks);
}

/**
 * Places `orderedIds` in `collectionId` in the given order, moving in links
 * dropped from other collections. Links of the collection missing from the
 * list (hidden by a search) follow, keeping their previous order.
 */
export function applyLinkOrder(links: Link[], collectionId: string, orderedIds: string[]): Link[] {
  const listed = new Set(orderedIds);
  const hidden = sortCollectionLinks(
    links.filter((l) => l.collectionId === collectionId && !listed.has(l.id))
  );
  const position = new Map([...orderedIds, ...hidden.map((l) => l.id)].map((id, i) => [id, i]));

  return links.map((link) => {
    const order = position.get(link.id);
    return order === undefined ? link : { ...link, collectionId, order };
  });
}
