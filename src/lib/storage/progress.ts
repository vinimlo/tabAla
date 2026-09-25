/**
 * Storage for the recommendation space: link and collection state (spec §4-§5).
 */
import type { Activity, Collection, Link, LinkActivity, RecoStats, WeekStats } from '../types';
import { EMPTY_ACTIVITY, EMPTY_WEEK } from '../types';
import { t } from '../i18n';
import { dayKey, isoWeek } from '../recommend/dates';
import type { OperationResult } from './core';
import { getErrorMessage, storage, withDataLock } from './core';
import { getLinks, saveLinks, getCollections, saveCollections } from './data-access';
import { applyPatch, type Patch } from '../patch';

export type LinkStatePatch = Patch<Required<Pick<Link, 'completedAt' | 'snoozedUntil' | 'keptAt' | 'reference'>>>;
export type CollectionStatePatch = Patch<Required<Pick<Collection, 'reference' | 'focus'>>>;

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

// Activity and numbers (never exported)

export type ActivityEvent = 'open' | 'complete' | 'snooze' | 'keep' | 'reference' | 'discard';

export const MAX_DAYS = 10;
export const STATS_WEEKS = 12;

export async function getActivity(): Promise<Activity> {
  return (await storage.get<Activity>('activity')) ?? {};
}

export async function getRecoStats(): Promise<RecoStats> {
  return (await storage.get<RecoStats>('recoStats')) ?? {};
}

function addDay(days: string[], day: string): string[] {
  return days.includes(day) ? days : [...days, day].sort().slice(-MAX_DAYS);
}

/** Adds to this week's counters (queue is replaced) and keeps the last 12 weeks. */
function bump(stats: RecoStats, now: number, changes: Partial<WeekStats>): RecoStats {
  const week = isoWeek(now);
  const current: WeekStats = { ...EMPTY_WEEK, ...stats[week] };
  const next: WeekStats = {
    shown: current.shown + (changes.shown ?? 0),
    acted: current.acted + (changes.acted ?? 0),
    snoozed: current.snoozed + (changes.snoozed ?? 0),
    discarded: current.discarded + (changes.discarded ?? 0),
    skipped: current.skipped + (changes.skipped ?? 0),
    queue: changes.queue ?? current.queue,
  };
  const merged: RecoStats = { ...stats, [week]: next };
  const kept = Object.keys(merged).sort().slice(-STATS_WEEKS);
  return Object.fromEntries(kept.map((key) => [key, merged[key]]));
}

/** Any action clears what the strip showed; opens and snoozes are counted. */
function afterAction(current: LinkActivity, event: ActivityEvent, now: number): LinkActivity {
  const { skippedAt: _skippedAt, askCompleteAt, ...rest } = current;
  const updated: LinkActivity = { ...rest, shownDays: [] };
  if (askCompleteAt !== undefined && event !== 'complete') {
    updated.askCompleteAt = askCompleteAt;
  }
  if (event === 'open') {
    updated.opens = current.opens + 1;
    updated.lastOpenedAt = now;
    updated.openDays = addDay(current.openDays, dayKey(now));
  } else if (event === 'snooze') {
    updated.snoozes = current.snoozes + 1;
  } else if (event === 'keep' || event === 'complete') {
    updated.snoozes = 0;
  }
  return updated;
}

/**
 * Records what the user did with a link. Opening or completing a link the
 * strip had shown counts as acted; the action clears shownDays, so each
 * showing counts at most once.
 */
export async function recordAction(linkId: string, event: ActivityEvent, now: number): Promise<void> {
  await withDataLock(async () => {
    const [activity, stats] = await Promise.all([getActivity(), getRecoStats()]);
    const current = activity[linkId] ?? EMPTY_ACTIVITY;
    const changes: Partial<WeekStats> = {
      acted: (event === 'open' || event === 'complete') && current.shownDays.length > 0 ? 1 : 0,
      snoozed: event === 'snooze' ? 1 : 0,
      discarded: event === 'discard' ? 1 : 0,
    };
    const { [linkId]: _previous, ...others } = activity;
    const next: Activity = event === 'discard' ? others : { ...others, [linkId]: afterAction(current, event, now) };
    const counted = (changes.acted ?? 0) + (changes.snoozed ?? 0) + (changes.discarded ?? 0) > 0;
    await storage.setBatch(counted ? { activity: next, recoStats: bump(stats, now, changes) } : { activity: next });
  });
}

/**
 * Records that the strip showed these links today (once per link per day),
 * that these links left it after 3 days without action (once each), and the
 * queue size seen this week. Writes nothing when nothing changed.
 */
export async function recordShown(shownIds: string[], skippedIds: string[], queueSize: number, now: number): Promise<void> {
  await withDataLock(async () => {
    const [activity, stats] = await Promise.all([getActivity(), getRecoStats()]);
    const today = dayKey(now);
    const next: Activity = { ...activity };
    let shown = 0;
    let skipped = 0;
    let changed = false;
    for (const id of shownIds) {
      const current = next[id] ?? EMPTY_ACTIVITY;
      if (!current.shownDays.includes(today)) {
        next[id] = { ...current, shownDays: addDay(current.shownDays, today), countedDay: today };
        changed = true;
        // An action clears shownDays; the day is counted only once all the same.
        if (current.countedDay !== today) {
          shown += 1;
        }
      }
    }
    for (const id of skippedIds) {
      const current = next[id] ?? EMPTY_ACTIVITY;
      if (current.skippedAt === undefined) {
        next[id] = { ...current, skippedAt: now };
        skipped += 1;
        changed = true;
      }
    }
    const queueChanged = stats[isoWeek(now)]?.queue !== queueSize;
    if (!changed && !queueChanged) {
      return;
    }
    const recoStats = bump(stats, now, { shown, skipped, queue: queueSize });
    await storage.setBatch(changed ? { activity: next, recoStats } : { recoStats });
  });
}

/** Removes what the user did, the numbers and the session in progress; links stay. */
export async function clearUsageData(): Promise<void> {
  await withDataLock(() => storage.removeBatch(['activity', 'recoStats', 'focusSession']));
}

// Browsing signals (phase 2, written by the service worker)

/** An open TabAla recorded this recently is the same open the service worker sees. */
export const OPEN_DEDUP_MS = 60_000;
/** Without the `idle` permission a forgotten tab would count for hours. */
export const VISIT_CAP_MS = 30 * 60_000;

/** Opens seen in the browser, by any path; one per link per minute. */
export async function recordBrowsingOpen(linkIds: string[], now: number): Promise<void> {
  await withDataLock(async () => {
    const [activity, stats] = await Promise.all([getActivity(), getRecoStats()]);
    const next: Activity = { ...activity };
    let acted = 0;
    let changed = false;
    for (const id of linkIds) {
      const current = next[id] ?? EMPTY_ACTIVITY;
      if (current.lastOpenedAt !== undefined && now - current.lastOpenedAt < OPEN_DEDUP_MS) {
        continue;
      }
      if (current.shownDays.length > 0) {
        acted += 1;
      }
      next[id] = afterAction(current, 'open', now);
      changed = true;
    }
    if (!changed) {
      return;
    }
    await storage.setBatch(acted > 0 ? { activity: next, recoStats: bump(stats, now, { acted }) } : { activity: next });
  });
}

/**
 * Adds a visit's active time (at most 30 min). `thresholds` is set when the
 * visit ended by closing the tab or leaving the page: a link whose total
 * reaches its threshold gets the "completed?" question.
 */
export async function recordVisit(
  linkIds: string[], elapsedMs: number, thresholds: Record<string, number> | null, now: number
): Promise<void> {
  const added = Math.max(0, Math.min(elapsedMs, VISIT_CAP_MS));
  await withDataLock(async () => {
    const activity = await getActivity();
    const next: Activity = { ...activity };
    for (const id of linkIds) {
      const current = next[id] ?? EMPTY_ACTIVITY;
      const updated: LinkActivity = { ...current, activeMs: current.activeMs + added };
      const threshold = thresholds?.[id];
      // After "not yet", only the time spent since that answer counts.
      if (threshold !== undefined && updated.activeMs - (current.dismissedMs ?? 0) >= threshold) {
        updated.askCompleteAt = now;
      }
      next[id] = updated;
    }
    await storage.set('activity', next);
  });
}

function withoutAsk(current: LinkActivity): LinkActivity {
  const { askCompleteAt: _askCompleteAt, ...rest } = current;
  return rest;
}

/** "Not yet": the question about this link goes away. */
export async function dismissAsk(linkId: string): Promise<void> {
  await withDataLock(async () => {
    const activity = await getActivity();
    const current = activity[linkId];
    if (current?.askCompleteAt === undefined) {
      return;
    }
    await storage.set('activity', { ...activity, [linkId]: { ...withoutAsk(current), dismissedMs: current.activeMs } });
  });
}

/** Turning learning off clears every pending question. */
export async function clearAsks(): Promise<void> {
  await withDataLock(async () => {
    const activity = await getActivity();
    const next = Object.fromEntries(Object.entries(activity).map(([id, entry]) => [id, withoutAsk(entry)]));
    await storage.set('activity', next);
  });
}
