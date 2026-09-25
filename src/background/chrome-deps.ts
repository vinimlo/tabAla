/** Chrome and storage behind the visit tracker (see activity.ts). */
import type { TabInfo, TrackerDeps, Visit } from './activity';
import {
  getActivity, getCollections, getLinks, getSettings, recordBrowsingOpen, recordVisit,
} from '@/lib/storage';

const VISIT_KEY = 'visit';
const UNSEEN_KEY = 'unseen';

export function toTabInfo(tab: chrome.tabs.Tab): TabInfo | null {
  if (tab.id === undefined) {
    return null;
  }
  return { id: tab.id, windowId: tab.windowId, url: tab.url, active: tab.active, incognito: tab.incognito };
}

export const chromeDeps: TrackerDeps = {
  now: () => Date.now(),

  async snapshot() {
    const [links, collections, activity, settings] = await Promise.all([
      getLinks(), getCollections(), getActivity(), getSettings(),
    ]);
    return { links, collections, activity, learn: settings.learnFromBrowsing };
  },

  async getVisit() {
    const stored = await chrome.storage.session.get(VISIT_KEY);
    return (stored[VISIT_KEY] as Visit | undefined) ?? null;
  },

  async setVisit(visit) {
    if (visit === null) {
      await chrome.storage.session.remove(VISIT_KEY);
    } else {
      await chrome.storage.session.set({ [VISIT_KEY]: visit });
    }
  },

  async getUnseen() {
    const stored = await chrome.storage.session.get(UNSEEN_KEY);
    return (stored[UNSEEN_KEY] as number[] | undefined) ?? [];
  },

  async setUnseen(tabIds) {
    await chrome.storage.session.set({ [UNSEEN_KEY]: tabIds });
  },

  async allTabs() {
    const tabs = await chrome.tabs.query({});
    return tabs.flatMap((tab) => {
      const info = toTabInfo(tab);
      return info === null ? [] : [info];
    });
  },

  async focusedWindow() {
    try {
      const window = await chrome.windows.getLastFocused();
      return window.focused && window.id !== undefined ? window.id : null;
    } catch {
      return null;
    }
  },

  async activeTab(windowId) {
    const [tab] = await chrome.tabs.query({ active: true, windowId });
    return tab === undefined ? null : toTabInfo(tab);
  },

  async isWindowFocused(windowId) {
    try {
      return (await chrome.windows.get(windowId)).focused;
    } catch {
      return false; // the window is gone
    }
  },

  async setBadge(tabId, text) {
    try {
      await chrome.action.setBadgeText({ tabId, text });
    } catch {
      // the tab closed meanwhile
    }
  },

  recordOpen: (linkIds, now) => recordBrowsingOpen(linkIds, now),
  recordVisit: (linkIds, elapsedMs, thresholds, now) => recordVisit(linkIds, elapsedMs, thresholds, now),
};
