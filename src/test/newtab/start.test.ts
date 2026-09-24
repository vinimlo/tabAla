/**
 * The manifest always overrides the new tab. When the user turns the
 * dashboard off, the page hands the tab back to Chrome's own new tab page.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { chromeMock, clearMockStorage } from '../setup';
import { saveSettings } from '@/lib/storage';
import { DEFAULT_SETTINGS } from '@/lib/types';
import { startNewtab } from '@/newtab/start';

describe('startNewtab', () => {
  const mountApp = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    clearMockStorage();
  });

  it('shows the dashboard when the option is on', async () => {
    await saveSettings({ ...DEFAULT_SETTINGS, newtabEnabled: true });

    await startNewtab('', mountApp);

    expect(mountApp).toHaveBeenCalledTimes(1);
    expect(chromeMock.tabs.update).not.toHaveBeenCalled();
  });

  it("hands the tab to Chrome's new tab page when the option is off", async () => {
    await saveSettings({ ...DEFAULT_SETTINGS, newtabEnabled: false });
    chromeMock.tabs.getCurrent.mockResolvedValue({ id: 42, url: '', title: '' });

    await startNewtab('', mountApp);

    expect(mountApp).not.toHaveBeenCalled();
    expect(chromeMock.tabs.update).toHaveBeenCalledWith(42, { url: 'chrome://new-tab-page' });
  });

  it('shows the dashboard opened from the popup even with the option off', async () => {
    await saveSettings({ ...DEFAULT_SETTINGS, newtabEnabled: false });

    await startNewtab('?dashboard', mountApp);

    expect(mountApp).toHaveBeenCalledTimes(1);
    expect(chromeMock.tabs.update).not.toHaveBeenCalled();
  });

  it('shows the dashboard when the settings cannot be read', async () => {
    chromeMock.storage.local.get.mockRejectedValueOnce(new Error('storage down'));

    await startNewtab('', mountApp);

    expect(mountApp).toHaveBeenCalledTimes(1);
  });
});
