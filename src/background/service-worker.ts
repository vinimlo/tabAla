/**
 * Background service worker for TabAla extension.
 * Handles extension lifecycle events and background operations.
 */

chrome.runtime.onInstalled.addListener((details) => {
  console.log('[TabAla] Extension installed:', details.reason);
});

console.log('[TabAla] Service worker loaded');

export {};
