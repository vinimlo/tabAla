/**
 * Background service worker for TabAla extension.
 * Handles extension lifecycle events and background operations.
 */

import { initializeInbox } from '@/lib/storage';

chrome.runtime.onInstalled.addListener((details) => {
  // eslint-disable-next-line no-console
  console.log('[TabAla] Extension installed:', details.reason);

  const reason = details.reason as string;
  if (reason === 'install' || reason === 'update') {
    initializeInbox()
      .then(() => {
        // eslint-disable-next-line no-console
        console.log('[TabAla] Inbox collection initialized');
      })
      .catch((error) => {
        // eslint-disable-next-line no-console
        console.error('[TabAla] Failed to initialize Inbox:', error);
      });
  }
});

// eslint-disable-next-line no-console
console.log('[TabAla] Service worker loaded');

export {};
