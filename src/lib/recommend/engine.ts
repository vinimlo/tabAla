/**
 * Recommendation engine (spec §6). Pure: no chrome.* access.
 *
 * A front is a collection with eligible links; its next link is the first
 * eligible one in the column order the user drags. The strip has up to three
 * cards from different fronts: Continue (a link opened recently, or the
 * pinned focus), Advance (momentum, then closest to empty) and Revive (the
 * front untouched for longest, after 14 days).
 */
import type { Activity, Collection, Link } from '@/lib/types';
import { linkKind, type LinkKind } from '@/lib/link-kind';
import { sortCollectionLinks } from '@/lib/link-order';
import { addDays, daysBetween } from './dates';
import { defaultEffort, linkAction, type LinkAction } from './effort';
import { isPending } from './state';
import { activityOf, buildTriage, lastTouch, type TriageItem } from './triage';

export type SlotRole = 'continue' | 'advance' | 'revive';

export type Reason =
  | { type: 'opened'; days: number }
  | { type: 'focus' }
  | { type: 'momentum'; count: number }
  | { type: 'nearlyDone'; remaining: number }
  | { type: 'nextInColumn' }
  | { type: 'stale'; weeks: number };

export interface Front {
  collection: Collection;
  /** Eligible links in column order; the first is the next one. */
  eligible: Link[];
  /** Links of the collection completed in the last 7 days. */
  momentum: number;
  /** Last time any link of the collection was saved, completed, kept or opened. */
  lastTouch: number;
}

export interface Recommendation {
  link: Link;
  collection: Collection;
  role: SlotRole;
  reason: Reason;
  kind: LinkKind;
  action: LinkAction;
  /** Minutes. */
  effort: number;
}

export interface Queue {
  slots: Recommendation[];
  triage: TriageItem[];
  /** Every front, in Advance order. */
  fronts: Front[];
  /** Eligible links plus triage: what is left to do or decide. */
  size: number;
}

export interface EngineInput {
  links: Link[];
  collections: Collection[];
  activity: Activity;
  now: number;
}

export const SLOTS = 3;
export const CONTINUE_DAYS = 14;
export const REVIVE_DAYS = 14;
export const MOMENTUM_DAYS = 7;
export const NEARLY_DONE = 3;

export function recommendation(link: Link, collection: Collection, role: SlotRole, reason: Reason): Recommendation {
  const kind = linkKind(link.url);
  return { link, collection, role, reason, kind, action: linkAction(kind), effort: defaultEffort(kind) };
}

/**
 * Focus first, then momentum, then the front with most left to do (where
 * links pile up), then collection order.
 */
function compareFronts(a: Front, b: Front): number {
  return Number(b.collection.focus === true) - Number(a.collection.focus === true)
    || b.momentum - a.momentum
    || b.eligible.length - a.eligible.length
    || a.collection.order - b.collection.order;
}

/** Why a front is worth advancing; the first that applies. */
export function advanceReason(front: Front): Reason {
  if (front.collection.focus === true) {
    return { type: 'focus' };
  }
  if (front.momentum > 0) {
    return { type: 'momentum', count: front.momentum };
  }
  if (front.eligible.length <= NEARLY_DONE) {
    return { type: 'nearlyDone', remaining: front.eligible.length };
  }
  return { type: 'nextInColumn' };
}

function buildFronts(links: Link[], collections: Collection[], activity: Activity, inTriage: Set<string>, now: number): Front[] {
  const momentumSince = addDays(now, -MOMENTUM_DAYS);
  const fronts: Front[] = [];
  for (const collection of collections) {
    const own = links.filter((link) => link.collectionId === collection.id);
    const eligible = sortCollectionLinks(
      own.filter((link) => isPending(link, collection, now) && !inTriage.has(link.id))
    );
    if (eligible.length === 0) {
      continue;
    }
    fronts.push({
      collection,
      eligible,
      momentum: own.filter((link) => link.completedAt !== undefined && link.completedAt >= momentumSince).length,
      lastTouch: Math.max(...own.map((link) => Math.max(lastTouch(link, activityOf(activity, link.id)), link.completedAt ?? 0))),
    });
  }
  return fronts.sort(compareFronts);
}

function continueSlot(fronts: Front[], activity: Activity, now: number): Recommendation | null {
  const since = addDays(now, -CONTINUE_DAYS);
  let best: { link: Link; front: Front; openedAt: number } | null = null;
  for (const front of fronts) {
    for (const link of front.eligible) {
      const openedAt = activityOf(activity, link.id).lastOpenedAt;
      if (openedAt !== undefined && openedAt >= since && (best === null || openedAt > best.openedAt)) {
        best = { link, front, openedAt };
      }
    }
  }
  if (best !== null) {
    return recommendation(best.link, best.front.collection, 'continue', {
      type: 'opened',
      days: daysBetween(best.openedAt, now),
    });
  }
  // Fronts are sorted with focus first, then by momentum.
  const focus = fronts.find((front) => front.collection.focus === true);
  return focus === undefined ? null : recommendation(focus.eligible[0], focus.collection, 'continue', { type: 'focus' });
}

function pickSlots(fronts: Front[], activity: Activity, now: number): Recommendation[] {
  const slots: Recommendation[] = [];
  const used = new Set<string>();

  const continued = continueSlot(fronts, activity, now);
  if (continued !== null) {
    slots.push(continued);
    used.add(continued.collection.id);
  }

  const reviveBefore = addDays(now, -REVIVE_DAYS);
  const revive = fronts
    .filter((front) => !used.has(front.collection.id) && front.lastTouch < reviveBefore)
    .sort((a, b) => a.lastTouch - b.lastTouch)[0];
  if (revive !== undefined) {
    used.add(revive.collection.id);
  }

  const advanceCount = SLOTS - slots.length - (revive === undefined ? 0 : 1);
  for (const front of fronts.filter((f) => !used.has(f.collection.id)).slice(0, advanceCount)) {
    slots.push(recommendation(front.eligible[0], front.collection, 'advance', advanceReason(front)));
  }

  if (revive !== undefined) {
    slots.push(recommendation(revive.eligible[0], revive.collection, 'revive', {
      type: 'stale',
      weeks: Math.floor(daysBetween(revive.lastTouch, now) / 7),
    }));
  }
  return slots;
}

export function buildQueue({ links, collections, activity, now }: EngineInput): Queue {
  const byId = new Map(collections.map((collection) => [collection.id, collection]));
  const triage = buildTriage(links, byId, activity, now);
  const inTriage = new Set(triage.map((item) => item.link.id));
  const fronts = buildFronts(links, collections, activity, inTriage, now);
  return {
    slots: pickSlots(fronts, activity, now),
    triage,
    fronts,
    size: fronts.reduce((total, front) => total + front.eligible.length, 0) + triage.length,
  };
}
