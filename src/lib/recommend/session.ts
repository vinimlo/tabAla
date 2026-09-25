/**
 * Focus session (spec §6.5, §11): a triage batch, the link already started,
 * then the next links of the two best fronts that fit the time. A started
 * session is stored as ids under `focusSession` and followed in every tab.
 */
import { advanceReason, recommendation, type Queue, type Recommendation } from './engine';
import type { Collection, Link } from '@/lib/types';
import { isReference } from './state';

export type SessionMinutes = 15 | 30 | 60;

export const SESSION_OPTIONS: readonly SessionMinutes[] = [15, 30, 60];
export const TRIAGE_BATCH = 5;
export const SESSION_FRONTS = 2;
/** Stop filling when fewer minutes than this are left. */
export const MIN_LEFT = 5;

export type SessionItem =
  | { type: 'triage'; count: number }
  | { type: 'link'; rec: Recommendation; overBudget: boolean };

export function buildSession(queue: Queue, minutes: SessionMinutes): SessionItem[] {
  const items: SessionItem[] = [];
  const taken = new Set<string>();
  let left: number = minutes;

  if (queue.triage.length > 0) {
    items.push({ type: 'triage', count: Math.min(TRIAGE_BATCH, queue.triage.length) });
    left -= 1;
  }

  const continued = queue.slots.find((slot) => slot.role === 'continue');
  if (continued !== undefined) {
    items.push({ type: 'link', rec: continued, overBudget: continued.effort > left });
    taken.add(continued.link.id);
    left -= continued.effort;
  }

  for (const front of queue.fronts.slice(0, SESSION_FRONTS)) {
    for (const link of front.eligible) {
      if (left < MIN_LEFT) {
        break;
      }
      if (taken.has(link.id)) {
        continue;
      }
      const rec = recommendation(link, front.collection, 'advance', advanceReason(front), queue.effortOf(link));
      if (rec.effort <= left) {
        items.push({ type: 'link', rec, overBudget: false });
        taken.add(link.id);
        left -= rec.effort;
      }
    }
  }

  if (!items.some((item) => item.type === 'link') && queue.fronts.length > 0) {
    const front = queue.fronts[0];
    items.push({
      type: 'link',
      rec: recommendation(front.eligible[0], front.collection, 'advance', advanceReason(front), queue.effortOf(front.eligible[0])),
      overBudget: true,
    });
  }
  return items;
}

export type PlanItem = { type: 'triage'; count: number } | { type: 'link'; linkId: string };

export interface FocusSession {
  minutes: SessionMinutes;
  startedAt: number;
  items: PlanItem[];
  /** Links completed during the session, for the summary. */
  completedIds: string[];
}

/** A session left behind is dropped when the page loads this long after it started. */
export const SESSION_TTL_MS = 12 * 60 * 60_000;

export function startSession(queue: Queue, minutes: SessionMinutes, now: number): FocusSession {
  return {
    minutes,
    startedAt: now,
    completedIds: [],
    items: buildSession(queue, minutes).map((item): PlanItem =>
      (item.type === 'triage' ? { type: 'triage', count: item.count } : { type: 'link', linkId: item.rec.link.id })),
  };
}

/** A stored value if it is a session; anything malformed counts as none. */
export function parseFocusSession(value: unknown): FocusSession | null {
  if (typeof value !== 'object' || value === null) {
    return null;
  }
  const raw = value as Record<string, unknown>;
  if (!SESSION_OPTIONS.includes(raw.minutes as SessionMinutes) || typeof raw.startedAt !== 'number'
    || !Array.isArray(raw.items) || !Array.isArray(raw.completedIds)) {
    return null;
  }
  const completedIds: unknown[] = raw.completedIds;
  if (!completedIds.every((id): id is string => typeof id === 'string')) {
    return null;
  }
  const items: PlanItem[] = [];
  for (const entry of raw.items as unknown[]) {
    const item = (typeof entry === 'object' && entry !== null ? entry : {}) as Record<string, unknown>;
    if (item.type === 'triage' && typeof item.count === 'number') {
      items.push({ type: 'triage', count: item.count });
    } else if (item.type === 'link' && typeof item.linkId === 'string') {
      items.push({ type: 'link', linkId: item.linkId });
    } else {
      return null;
    }
  }
  return { minutes: raw.minutes as SessionMinutes, startedAt: raw.startedAt, items, completedIds };
}

export interface SessionView {
  /** The link to do now: the first of the plan not completed. */
  current?: Recommendation;
  /** The links after it. */
  next: Recommendation[];
  /** Links of the triage step still waiting; 0 when done or absent. */
  triageLeft: number;
  /** Links completed during the session (and still completed). */
  done: number;
  /** done plus the links still in the plan. */
  total: number;
  /** Place of `current`, from 1. */
  position: number;
  remainingMs: number;
  /** Share of the time gone, 0–1. */
  elapsed: number;
  timeUp: boolean;
  /** The time is up, or nothing is left. */
  finished: boolean;
}

/**
 * The session as it stands: links deleted, turned into reference or
 * completed outside the session leave the plan (spec §11.2).
 */
export function sessionView(session: FocusSession, links: Link[], queue: Queue, collections: Collection[], now: number): SessionView {
  const linkById = new Map(links.map((link) => [link.id, link]));
  const collectionById = new Map(collections.map((collection) => [collection.id, collection]));
  const slotById = new Map(queue.slots.map((rec) => [rec.link.id, rec]));
  const completedHere = new Set(session.completedIds);
  const pending: Recommendation[] = [];
  let done = 0;
  let triageCount = 0;

  for (const item of session.items) {
    if (item.type === 'triage') {
      triageCount = item.count;
      continue;
    }
    const link = linkById.get(item.linkId);
    const collection = link === undefined ? undefined : collectionById.get(link.collectionId);
    if (link === undefined || collection === undefined) {
      continue;
    }
    if (link.completedAt !== undefined) {
      done += completedHere.has(link.id) ? 1 : 0;
      continue;
    }
    if (isReference(link, collection)) {
      continue;
    }
    pending.push(slotById.get(link.id) ?? recommendation(link, collection, 'advance', { type: 'nextInColumn' }, queue.effortOf(link)));
  }

  const triageLeft = Math.min(triageCount, queue.triage.length);
  const durationMs = session.minutes * 60_000;
  const elapsedMs = Math.max(0, now - session.startedAt);
  const timeUp = elapsedMs >= durationMs;
  return {
    current: pending[0],
    next: pending.slice(1),
    triageLeft,
    done,
    total: done + pending.length,
    position: done + 1,
    remainingMs: Math.max(0, durationMs - elapsedMs),
    elapsed: Math.min(1, elapsedMs / durationMs),
    timeUp,
    finished: timeUp || (pending.length === 0 && triageLeft === 0),
  };
}
