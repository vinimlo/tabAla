/**
 * What the progress buttons do (complete, snooze, keep, reference, discard,
 * open): change the link through linksStore and record the action.
 * Shared by the dashboard and the popup.
 */
import type { Collection, Link } from '@/lib/types';
import { linksStore } from './links';
import { activityStore } from './activity';

export async function completeLink(link: Link, now = Date.now()): Promise<void> {
  await linksStore.patchLinkState(link.id, { completedAt: now, snoozedUntil: null });
  await activityStore.record(link.id, 'complete', now);
}

export async function restoreLink(link: Link): Promise<void> {
  await linksStore.patchLinkState(link.id, { completedAt: null });
}

export async function snoozeLink(link: Link, until: number, now = Date.now()): Promise<void> {
  await linksStore.patchLinkState(link.id, { snoozedUntil: until });
  await activityStore.record(link.id, 'snooze', now);
}

export async function keepLink(link: Link, now = Date.now()): Promise<void> {
  await linksStore.patchLinkState(link.id, { keptAt: now });
  await activityStore.record(link.id, 'keep', now);
}

/** true: reference; false: pending inside a reference collection; null: follow the collection. */
export async function setLinkReference(link: Link, value: boolean | null, now = Date.now()): Promise<void> {
  await linksStore.patchLinkState(link.id, { reference: value });
  await activityStore.record(link.id, 'reference', now);
}

export async function discardLink(link: Link, now = Date.now()): Promise<void> {
  await linksStore.removeLink(link.id);
  await activityStore.record(link.id, 'discard', now);
}

/** Undo of a discard: the link comes back with its id, position and state. */
export async function undoDiscard(link: Link): Promise<void> {
  await linksStore.reinsertLink(link);
}

export async function recordOpen(link: Link, now = Date.now()): Promise<void> {
  await activityStore.record(link.id, 'open', now);
}

export async function setCollectionReference(collection: Collection, value: boolean): Promise<void> {
  await linksStore.patchCollectionState(collection.id, { reference: value ? true : null });
}

export async function setCollectionFocus(collection: Collection, value: boolean): Promise<void> {
  await linksStore.patchCollectionState(collection.id, { focus: value ? true : null });
}
