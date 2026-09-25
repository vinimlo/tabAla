/**
 * Triage (spec §6.4): pending links that need a decision — still worth it,
 * discard, reference, already done — before they are recommended.
 */
import type { Activity, Collection, Link, LinkActivity } from '@/lib/types';
import { EMPTY_ACTIVITY } from '@/lib/types';
import { addDays, dayKey } from './dates';
import { isPending } from './state';

export type TriageReason = 'skipped' | 'snoozedOften' | 'revisited' | 'stale';

export interface TriageItem {
  link: Link;
  collection: Collection | undefined;
  reason: TriageReason;
}

export const SKIP_DAYS = 3;
export const SNOOZE_LIMIT = 3;
export const REVISIT_DAYS = 3;
export const REVISIT_WINDOW_DAYS = 30;
export const STALE_DAYS = 60;

const REASON_ORDER: Record<TriageReason, number> = { skipped: 0, snoozedOften: 1, revisited: 2, stale: 3 };

export function activityOf(activity: Activity, linkId: string): LinkActivity {
  return activity[linkId] ?? EMPTY_ACTIVITY;
}

/** Last time the user touched the link: saved it, kept it or opened it. */
export function lastTouch(link: Link, activity: LinkActivity): number {
  return Math.max(link.createdAt, link.keptAt ?? 0, activity.lastOpenedAt ?? 0);
}

/**
 * Why a pending link needs a decision, or null. Days shown today do not
 * count yet, so the strip does not change during the day.
 */
export function triageReason(link: Link, activity: LinkActivity, now: number): TriageReason | null {
  const today = dayKey(now);
  if (activity.shownDays.filter((day) => day < today).length >= SKIP_DAYS) {
    return 'skipped';
  }
  if (activity.snoozes >= SNOOZE_LIMIT) {
    return 'snoozedOften';
  }
  const windowStart = dayKey(addDays(now, -REVISIT_WINDOW_DAYS));
  const keptDay = link.keptAt === undefined ? '' : dayKey(link.keptAt);
  const revisits = activity.openDays.filter((day) => day >= windowStart && day > keptDay);
  if (revisits.length >= REVISIT_DAYS) {
    return 'revisited';
  }
  if (lastTouch(link, activity) < addDays(now, -STALE_DAYS)) {
    return 'stale';
  }
  return null;
}

/** Skipped first, then snoozed too often, revisited and stale; oldest first within each. */
export function buildTriage(
  links: Link[],
  collections: Map<string, Collection>,
  activity: Activity,
  now: number
): TriageItem[] {
  const items: (TriageItem & { touch: number })[] = [];
  for (const link of links) {
    const collection = collections.get(link.collectionId);
    if (!isPending(link, collection, now)) {
      continue;
    }
    const linkActivity = activityOf(activity, link.id);
    const reason = triageReason(link, linkActivity, now);
    if (reason !== null) {
      items.push({ link, collection, reason, touch: lastTouch(link, linkActivity) });
    }
  }
  return items
    .sort((a, b) => REASON_ORDER[a.reason] - REASON_ORDER[b.reason] || a.touch - b.touch)
    .map(({ link, collection, reason }) => ({ link, collection, reason }));
}
