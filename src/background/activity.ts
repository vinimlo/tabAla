/**
 * Visit tracker (spec §8.1). Turns tab and window events into opens, visit
 * time and the "completed?" question. Chrome is injected (TrackerDeps) so the
 * state machine can be tested; the visit in progress lives in
 * storage.session because the service worker can be stopped at any time.
 */
import type { Activity, Collection, Link } from '@/lib/types';
import { normalizeUrl } from '@/lib/url-match';
import { effortEstimator } from '@/lib/recommend/learned';
import { isPending } from '@/lib/recommend/state';

export interface TabInfo {
  id: number;
  windowId: number;
  url?: string;
  active: boolean;
  incognito: boolean;
}

export interface Visit {
  tabId: number;
  linkIds: string[];
  startedAt: number;
}

export interface Snapshot {
  links: Link[];
  collections: Collection[];
  activity: Activity;
  /** settings.learnFromBrowsing */
  learn: boolean;
}

export interface TrackerDeps {
  now(): number;
  snapshot(): Promise<Snapshot>;
  getVisit(): Promise<Visit | null>;
  setVisit(visit: Visit | null): Promise<void>;
  activeTab(windowId: number): Promise<TabInfo | null>;
  isWindowFocused(windowId: number): Promise<boolean>;
  setBadge(tabId: number, text: string): Promise<void>;
  recordOpen(linkIds: string[], now: number): Promise<void>;
  recordVisit(linkIds: string[], elapsedMs: number, thresholds: Record<string, number> | null, now: number): Promise<void>;
}

export interface Tracker {
  /** `loaded`: the page finished loading (one open per load). */
  tabUpdated(tab: TabInfo, loaded: boolean): Promise<void>;
  tabActivated(tab: TabInfo): Promise<void>;
  tabRemoved(tabId: number): Promise<void>;
  /** null: no browser window has focus. */
  windowFocused(windowId: number | null): Promise<void>;
}

type EndReason = 'switched' | 'blurred' | 'closed' | 'navigated';

export const MIN_ASK_MS = 2 * 60_000;
export const BADGE = '•';

interface Context {
  snapshot: Snapshot;
  collections: Map<string, Collection>;
  effortOf: (link: Link) => number;
}

export function createTracker(deps: TrackerDeps): Tracker {
  let queue: Promise<void> = Promise.resolve();

  /** Events run one at a time; a failure is logged, never thrown at Chrome. */
  function serial(task: () => Promise<void>): Promise<void> {
    queue = queue.then(task).catch((error: unknown) => {
      console.error('[TabAla] Visit tracking failed:', error);
    });
    return queue;
  }

  async function context(): Promise<Context | null> {
    const snapshot = await deps.snapshot();
    if (!snapshot.learn) {
      return null;
    }
    return {
      snapshot,
      collections: new Map(snapshot.collections.map((c) => [c.id, c])),
      effortOf: effortEstimator(snapshot.links, snapshot.activity),
    };
  }

  /** Saved, not completed links for this URL. */
  function linksAt(ctx: Context, url: string | undefined): Link[] {
    const key = url === undefined ? null : normalizeUrl(url);
    if (key === null) {
      return [];
    }
    return ctx.snapshot.links.filter((link) => link.completedAt === undefined && normalizeUrl(link.url) === key);
  }

  function sameLinks(a: string[], b: string[]): boolean {
    return a.length === b.length && a.every((id) => b.includes(id));
  }

  async function end(ctx: Context | null, reason: EndReason): Promise<void> {
    const visit = await deps.getVisit();
    if (visit === null) {
      return;
    }
    await deps.setVisit(null);
    if (ctx === null) {
      return; // learning is off: the visit is dropped
    }
    const now = deps.now();
    let thresholds: Record<string, number> | null = null;
    if (reason === 'closed' || reason === 'navigated') {
      thresholds = {};
      for (const id of visit.linkIds) {
        const link = ctx.snapshot.links.find((l) => l.id === id);
        if (link !== undefined) {
          thresholds[id] = Math.max(MIN_ASK_MS, (ctx.effortOf(link) * 60_000) / 2);
        }
      }
    }
    await deps.recordVisit(visit.linkIds, now - visit.startedAt, thresholds, now);
  }

  async function start(ctx: Context, tab: TabInfo): Promise<void> {
    const links = linksAt(ctx, tab.url);
    if (links.length === 0 || !tab.active || !(await deps.isWindowFocused(tab.windowId))) {
      return;
    }
    await deps.setVisit({ tabId: tab.id, linkIds: links.map((l) => l.id), startedAt: deps.now() });
  }

  async function mark(ctx: Context | null, tab: TabInfo): Promise<void> {
    const pending = ctx === null
      ? []
      : linksAt(ctx, tab.url).filter((l) => isPending(l, ctx.collections.get(l.collectionId), deps.now()));
    await deps.setBadge(tab.id, pending.length > 0 ? BADGE : '');
  }

  return {
    tabUpdated: (tab, loaded) => serial(async () => {
      if (tab.incognito) {
        return;
      }
      const ctx = await context();
      await mark(ctx, tab);
      if (ctx === null) {
        await end(null, 'navigated');
        return;
      }
      const ids = linksAt(ctx, tab.url).map((l) => l.id);
      if (loaded && ids.length > 0) {
        await deps.recordOpen(ids, deps.now());
      }
      const visit = await deps.getVisit();
      if (visit !== null && visit.tabId === tab.id) {
        if (sameLinks(visit.linkIds, ids)) {
          return;
        }
        await end(ctx, 'navigated');
      }
      if (visit === null || visit.tabId === tab.id) {
        await start(ctx, tab);
      }
    }),

    tabActivated: (tab) => serial(async () => {
      if (tab.incognito) {
        return;
      }
      const ctx = await context();
      const visit = await deps.getVisit();
      if (visit !== null && visit.tabId === tab.id) {
        return;
      }
      await end(ctx, 'switched');
      if (ctx !== null) {
        await start(ctx, tab);
      }
    }),

    tabRemoved: (tabId) => serial(async () => {
      const visit = await deps.getVisit();
      if (visit !== null && visit.tabId === tabId) {
        await end(await context(), 'closed');
      }
    }),

    windowFocused: (windowId) => serial(async () => {
      const ctx = await context();
      await end(ctx, 'blurred');
      if (ctx === null || windowId === null) {
        return;
      }
      const tab = await deps.activeTab(windowId);
      if (tab !== null && !tab.incognito) {
        await start(ctx, tab);
      }
    }),
  };
}
