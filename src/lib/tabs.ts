/**
 * Tab management utilities for the TabAla extension.
 * Provides functions for opening links in new browser tabs.
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
 * Checks if a URL is saveable (not a browser internal URL).
 */
export function isSaveableUrl(url: string): boolean {
  const blockedPrefixes = ['chrome://', 'chrome-extension://', 'about:', 'edge://', 'brave://'];
  return !blockedPrefixes.some((prefix) => url.startsWith(prefix));
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
