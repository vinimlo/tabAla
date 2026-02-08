import { initializeInbox } from '@/lib/storage';

chrome.runtime.onInstalled.addListener((details) => {
  const reason = details.reason as string;
  if (reason === 'install' || reason === 'update') {
    void (async () => {
      try {
        await initializeInbox();
      } catch (error) {
        console.error('[TabAla] Failed to initialize Inbox:', error);
      }
    })();
  }
});

export {};
