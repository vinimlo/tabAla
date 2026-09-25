/**
 * What the user did with links (activity) and the weekly numbers (recoStats).
 * Storage is the source of truth: every write reads both back.
 */
import { writable, type Writable } from 'svelte/store';
import type { Activity, RecoStats } from '@/lib/types';
import {
  clearAsks as storageClearAsks,
  clearUsageData,
  dismissAsk as storageDismissAsk,
  getActivity,
  getRecoStats,
  recordAction,
  recordShown,
  storage,
  type ActivityEvent,
} from '@/lib/storage';

interface ActivityState {
  activity: Activity;
  stats: RecoStats;
  loading: boolean;
}

function createActivityStore(): {
  subscribe: Writable<ActivityState>['subscribe'];
  set: (state: ActivityState) => void;
  load: () => Promise<void>;
  record: (linkId: string, event: ActivityEvent, now?: number) => Promise<void>;
  recordShown: (shownIds: string[], skippedIds: string[], queueSize: number, now: number) => Promise<void>;
  clear: () => Promise<void>;
  dismissAsk: (linkId: string) => Promise<void>;
  clearAsks: () => Promise<void>;
} {
  const { subscribe, set, update } = writable<ActivityState>({ activity: {}, stats: {}, loading: true });

  storage.watch((changes) => {
    if (changes.activity === undefined && changes.recoStats === undefined) {
      return;
    }
    update((state) => ({
      ...state,
      activity: changes.activity === undefined ? state.activity : ((changes.activity.newValue as Activity | undefined) ?? {}),
      stats: changes.recoStats === undefined ? state.stats : ((changes.recoStats.newValue as RecoStats | undefined) ?? {}),
    }));
  });

  async function load(): Promise<void> {
    const [activity, stats] = await Promise.all([getActivity(), getRecoStats()]);
    set({ activity, stats, loading: false });
  }

  return {
    subscribe,
    set,
    load,
    async record(linkId: string, event: ActivityEvent, now = Date.now()): Promise<void> {
      await recordAction(linkId, event, now);
      await load();
    },
    async recordShown(shownIds: string[], skippedIds: string[], queueSize: number, now: number): Promise<void> {
      await recordShown(shownIds, skippedIds, queueSize, now);
      await load();
    },
    async clear(): Promise<void> {
      await clearUsageData();
      await load();
    },
    async dismissAsk(linkId: string): Promise<void> {
      await storageDismissAsk(linkId);
      await load();
    },
    async clearAsks(): Promise<void> {
      await storageClearAsks();
      await load();
    },
  };
}

export const activityStore = createActivityStore();
