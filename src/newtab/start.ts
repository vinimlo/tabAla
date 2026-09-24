import { getSettings } from '@/lib/storage';
import { DASHBOARD_PARAM } from '@/lib/tabs';

const CHROME_NEW_TAB_URL = 'chrome://new-tab-page';

/**
 * The manifest always overrides the new tab and MV3 cannot undo that at
 * runtime. With the option off, the tab goes to Chrome's own new tab page;
 * the dashboard opened on purpose (popup, `?dashboard`) still shows.
 */
export async function startNewtab(search: string, mountApp: () => void): Promise<void> {
  if (!new URLSearchParams(search).has(DASHBOARD_PARAM)) {
    let enabled = true;
    try {
      enabled = (await getSettings()).newtabEnabled;
    } catch (error) {
      console.error('[TabAla] Could not read settings, showing the dashboard:', error);
    }
    if (!enabled) {
      const tab = await chrome.tabs.getCurrent();
      if (tab?.id !== undefined) {
        await chrome.tabs.update(tab.id, { url: CHROME_NEW_TAB_URL });
        return;
      }
    }
  }
  mountApp();
}
