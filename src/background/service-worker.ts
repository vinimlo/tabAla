import { initializeInbox } from '@/lib/storage';
import { createTracker } from './activity';
import { chromeDeps, toTabInfo } from './chrome-deps';

// Learning from browsing (spec §8). Listeners are registered synchronously
// at the top level so Chrome wakes this worker for them.
const tracker = createTracker(chromeDeps);

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
  // An install or update clears the tab badges.
  void tracker.refresh();
});

chrome.runtime.onStartup.addListener(() => {
  void tracker.refresh();
});

// Completing, saving or discarding a link, or turning learning off, changes
// which tabs carry the dot.
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && ('links' in changes || 'collections' in changes || 'settings' in changes)) {
    void tracker.refresh();
  }
});

void chrome.action.setBadgeBackgroundColor({ color: '#E85D42' }).catch(() => undefined);

chrome.tabs.onUpdated.addListener((_tabId, changeInfo, tab) => {
  const info = toTabInfo(tab);
  if (info !== null && (changeInfo.status === 'complete' || changeInfo.url !== undefined)) {
    void tracker.tabUpdated(info, changeInfo.status === 'complete');
  }
});

chrome.tabs.onActivated.addListener(({ tabId }) => {
  void chrome.tabs.get(tabId)
    .then((tab) => {
      const info = toTabInfo(tab);
      return info === null ? undefined : tracker.tabActivated(info);
    })
    .catch(() => undefined);
});

chrome.tabs.onRemoved.addListener((tabId) => {
  void tracker.tabRemoved(tabId);
});

chrome.windows.onFocusChanged.addListener((windowId) => {
  void tracker.windowFocused(windowId === chrome.windows.WINDOW_ID_NONE ? null : windowId);
});

export {};
