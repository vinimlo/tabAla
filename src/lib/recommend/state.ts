/**
 * Link lifecycle (spec §4): pending, snoozed, reference, completed.
 */
import type { Collection, Link } from '@/lib/types';
import { startOfDay } from './dates';

export function isCompleted(link: Link): boolean {
  return link.completedAt !== undefined;
}

/** The link's own flag wins; otherwise it follows its collection. */
export function isReference(link: Link, collection: Collection | undefined): boolean {
  return link.reference ?? collection?.reference === true;
}

/** Snoozed until a day that has not started yet. */
export function isSnoozed(link: Link, now: number): boolean {
  return link.snoozedUntil !== undefined && link.snoozedUntil > startOfDay(now);
}

/** Not completed, not reference and not snoozed: a candidate for the queue or for triage. */
export function isPending(link: Link, collection: Collection | undefined, now: number): boolean {
  return !isCompleted(link) && !isReference(link, collection) && !isSnoozed(link, now);
}
