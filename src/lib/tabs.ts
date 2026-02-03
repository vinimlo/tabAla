/**
 * Tab management utilities for the TabAla extension.
 * Provides functions for opening links in new browser tabs.
 */

export interface OpenLinkResult {
  success: boolean;
  error?: string;
}

/**
 * Validates if a string is a valid URL that can be opened in a browser tab.
 */
export function isValidUrl(url: string): boolean {
  if (!url || typeof url !== 'string') {
    return false;
  }

  try {
    const parsed = new URL(url);
    return ['http:', 'https:', 'file:'].includes(parsed.protocol);
  } catch {
    return false;
  }
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
