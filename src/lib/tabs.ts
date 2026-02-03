/**
 * Tab management utilities for the TabAla extension.
 * Provides functions for opening, listing, and managing browser tabs.
 */

import { isValidUrl } from './types';

// Re-export isValidUrl for backward compatibility
export { isValidUrl } from './types';

export interface CurrentTabInfo {
  url: string;
  title: string;
  favicon?: string;
}

/**
 * Represents a browser tab with all relevant information.
 */
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

/**
 * Represents a Chrome tab group.
 */
export interface TabGroup {
  id: number;
  title?: string;
  color: string;
  collapsed: boolean;
  windowId: number;
}

/**
 * Organized tabs structure for the sidebar.
 */
export interface OrganizedTabs {
  pinned: BrowserTab[];
  groups: Map<number, { group: TabGroup; tabs: BrowserTab[] }>;
  ungrouped: BrowserTab[];
  activeTabId?: number;
}

/**
 * Gets information about the currently active tab in the current window.
 * Returns null if the tab cannot be accessed or has no valid URL/title.
 */
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

/**
 * Checks if a URL is saveable (not a browser internal URL or localhost).
 */
export function isSaveableUrl(url: string): boolean {
  const blockedPrefixes = ['chrome://', 'chrome-extension://', 'about:', 'edge://', 'brave://'];
  const blockedHosts = ['localhost', '127.0.0.1', '0.0.0.0'];

  if (blockedPrefixes.some((prefix) => url.startsWith(prefix))) {
    return false;
  }

  try {
    const parsed = new URL(url);
    if (blockedHosts.includes(parsed.hostname)) {
      return false;
    }
  } catch {
    return false;
  }

  return true;
}

export interface OpenLinkResult {
  success: boolean;
  error?: string;
}

/**
 * Opens a link in a new browser tab using the Chrome Extension API.
 * Returns a result object indicating success or failure with an error message.
 */
export async function openLinkInNewTab(url: string): Promise<OpenLinkResult> {
  if (!isValidUrl(url)) {
    console.error('Invalid URL:', url);
    return {
      success: false,
      error: 'URL inválido. Não foi possível abrir o link.',
    };
  }

  try {
    await chrome.tabs.create({ url, active: true });
    return { success: true };
  } catch (error) {
    console.error('Failed to open link in new tab:', error);
    return {
      success: false,
      error: 'Erro ao abrir link. Tente novamente.',
    };
  }
}

/**
 * Gets all open tabs in the current window.
 */
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

/**
 * Gets all tab groups in the current window.
 */
export async function getTabGroups(): Promise<TabGroup[]> {
  try {
    // Check if tabGroups API is available
    if (chrome.tabGroups === undefined) {
      return [];
    }
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

/**
 * Gets tabs organized by pinned, groups, and ungrouped.
 */
export async function getOrganizedTabs(): Promise<OrganizedTabs> {
  const [tabs, groups] = await Promise.all([getAllTabs(), getTabGroups()]);

  const pinned: BrowserTab[] = [];
  const ungrouped: BrowserTab[] = [];
  const groupedTabs = new Map<number, { group: TabGroup; tabs: BrowserTab[] }>();
  let activeTabId: number | undefined;

  // Initialize group entries
  for (const group of groups) {
    groupedTabs.set(group.id, { group, tabs: [] });
  }

  // Organize tabs
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

/**
 * Focuses on a specific tab by making it active.
 */
export async function focusTab(tabId: number): Promise<boolean> {
  try {
    await chrome.tabs.update(tabId, { active: true });
    return true;
  } catch (error) {
    console.error('Failed to focus tab:', error);
    return false;
  }
}

/**
 * Closes a specific tab.
 */
export async function closeTab(tabId: number): Promise<boolean> {
  try {
    await chrome.tabs.remove(tabId);
    return true;
  } catch (error) {
    console.error('Failed to close tab:', error);
    return false;
  }
}

/**
 * Extracts the domain from a URL.
 */
export function extractDomain(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.hostname;
  } catch {
    return url;
  }
}
