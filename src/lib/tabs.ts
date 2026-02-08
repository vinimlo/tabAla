import { isValidUrl } from './types';
import { t } from './i18n';

export interface CurrentTabInfo {
  url: string;
  title: string;
  favicon?: string;
}

export interface BrowserTab {
  id: number;
  url: string;
  title: string;
  favicon?: string;
  pinned: boolean;
  active: boolean;
  groupId: number;
  windowId: number;
  index: number;
}

export interface TabGroup {
  id: number;
  title?: string;
  color: string;
  collapsed: boolean;
  windowId: number;
}

export interface OrganizedTabs {
  pinned: BrowserTab[];
  groups: Map<number, { group: TabGroup; tabs: BrowserTab[] }>;
  ungrouped: BrowserTab[];
  activeTabId?: number;
}

/** Returns null if the tab cannot be accessed or has no valid URL/title. */
export async function getCurrentTab(): Promise<CurrentTabInfo | null> {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.url || !tab.title) {
      return null;
    }

    return {
      url: tab.url,
      title: tab.title,
      favicon: tab.favIconUrl,
    };
  } catch (error) {
    console.error('Failed to get current tab:', error);
    return null;
  }
}

const BLOCKED_PREFIXES = ['chrome://', 'chrome-extension://', 'about:', 'edge://', 'brave://'];
const BLOCKED_HOSTS = ['localhost', '127.0.0.1', '0.0.0.0'];

/** Returns false for browser internal URLs (chrome://, about:, etc.) and localhost. */
export function isSaveableUrl(url: string): boolean {
  if (BLOCKED_PREFIXES.some((prefix) => url.startsWith(prefix))) {
    return false;
  }

  try {
    return !BLOCKED_HOSTS.includes(new URL(url).hostname);
  } catch {
    return false;
  }
}

export interface OpenLinkResult {
  success: boolean;
  error?: string;
}

export async function openLinkInNewTab(url: string): Promise<OpenLinkResult> {
  if (!isValidUrl(url)) {
    console.error('Invalid URL:', url);
    return { success: false, error: t('error_tab_invalid_url') };
  }

  try {
    await chrome.tabs.create({ url, active: true });
    return { success: true };
  } catch (error) {
    console.error('Failed to open link in new tab:', error);
    return { success: false, error: t('error_open_link_failed') };
  }
}

export async function openLinkInCurrentTab(url: string): Promise<OpenLinkResult> {
  if (!isValidUrl(url)) {
    console.error('Invalid URL:', url);
    return { success: false, error: t('error_tab_invalid_url') };
  }

  try {
    const [currentTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (currentTab?.id !== undefined) {
      await chrome.tabs.update(currentTab.id, { url });
    } else {
      await chrome.tabs.create({ url, active: true });
    }
    return { success: true };
  } catch (error) {
    console.error('Failed to open link in current tab:', error);
    return { success: false, error: t('error_open_link_failed') };
  }
}

export async function getAllTabs(): Promise<BrowserTab[]> {
  try {
    const tabs = await chrome.tabs.query({ currentWindow: true });
    return tabs
      .filter((tab): tab is chrome.tabs.Tab & { id: number; url: string } =>
        tab.id !== undefined && tab.url !== undefined
      )
      .map((tab) => ({
        id: tab.id,
        url: tab.url,
        title: tab.title || tab.url,
        favicon: tab.favIconUrl,
        pinned: tab.pinned ?? false,
        active: tab.active ?? false,
        groupId: tab.groupId ?? chrome.tabGroups?.TAB_GROUP_ID_NONE ?? -1,
        windowId: tab.windowId ?? -1,
        index: tab.index,
      }))
      .filter((tab) => isSaveableUrl(tab.url));
  } catch (error) {
    console.error('Failed to get all tabs:', error);
    return [];
  }
}

export async function getTabGroups(): Promise<TabGroup[]> {
  try {
    if (!chrome.tabGroups) return [];

    const groups = await chrome.tabGroups.query({ windowId: chrome.windows.WINDOW_ID_CURRENT });
    return groups.map((group) => ({
      id: group.id,
      title: group.title,
      color: group.color,
      collapsed: group.collapsed,
      windowId: group.windowId,
    }));
  } catch (error) {
    console.error('Failed to get tab groups:', error);
    return [];
  }
}

export async function getOrganizedTabs(): Promise<OrganizedTabs> {
  const [tabs, groups] = await Promise.all([getAllTabs(), getTabGroups()]);

  const pinned: BrowserTab[] = [];
  const ungrouped: BrowserTab[] = [];
  const groupedTabs = new Map<number, { group: TabGroup; tabs: BrowserTab[] }>();
  let activeTabId: number | undefined;

  for (const group of groups) {
    groupedTabs.set(group.id, { group, tabs: [] });
  }

  for (const tab of tabs) {
    if (tab.active) {
      activeTabId = tab.id;
    }

    if (tab.pinned) {
      pinned.push(tab);
    } else if (tab.groupId !== -1 && groupedTabs.has(tab.groupId)) {
      groupedTabs.get(tab.groupId)!.tabs.push(tab);
    } else {
      ungrouped.push(tab);
    }
  }

  return {
    pinned,
    groups: groupedTabs,
    ungrouped,
    activeTabId,
  };
}

export async function focusTab(tabId: number): Promise<boolean> {
  try {
    await chrome.tabs.update(tabId, { active: true });
    return true;
  } catch (error) {
    console.error('Failed to focus tab:', error);
    return false;
  }
}

export async function closeTab(tabId: number): Promise<boolean> {
  try {
    await chrome.tabs.remove(tabId);
    return true;
  } catch (error) {
    console.error('Failed to close tab:', error);
    return false;
  }
}

export const GROUP_COLORS: Record<string, string> = {
  grey: '#5F6368',
  blue: '#1A73E8',
  red: '#D93025',
  yellow: '#F9AB00',
  green: '#188038',
  pink: '#D01884',
  purple: '#9334E6',
  cyan: '#007B83',
  orange: '#E8710A',
};

export function extractDomain(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.hostname;
  } catch {
    return url;
  }
}
