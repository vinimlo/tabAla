/**
 * Unit tests for tabs.ts utility functions.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { openLinkInNewTab, openLinkInCurrentTab, getCurrentTab, isSaveableUrl } from '@/lib/tabs';

function createMockTab(overrides: Partial<chrome.tabs.Tab> = {}): chrome.tabs.Tab {
  return {
    id: 1,
    index: 0,
    windowId: 1,
    highlighted: true,
    active: true,
    pinned: false,
    incognito: false,
    ...overrides,
  };
}

describe('openLinkInNewTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should open valid URL in new tab and return success', async () => {
    const url = 'https://example.com';
    const result = await openLinkInNewTab(url);

    expect(chrome.tabs.create).toHaveBeenCalledWith({ url, active: true });
    expect(result).toEqual({ success: true });
  });

  it('should return error for invalid URL without calling chrome.tabs.create', async () => {
    const url = 'invalid-url';
    const result = await openLinkInNewTab(url);

    expect(chrome.tabs.create).not.toHaveBeenCalled();
    expect(result.success).toBe(false);
    expect(result.error).toBe('error_tab_invalid_url');
  });

  it('should return error for empty URL', async () => {
    const result = await openLinkInNewTab('');

    expect(chrome.tabs.create).not.toHaveBeenCalled();
    expect(result.success).toBe(false);
    expect(result.error).toBe('error_tab_invalid_url');
  });

  it('should return error when chrome.tabs.create fails', async () => {
    vi.mocked(chrome.tabs.create).mockRejectedValueOnce(new Error('Tab creation failed'));

    const url = 'https://example.com';
    const result = await openLinkInNewTab(url);

    expect(chrome.tabs.create).toHaveBeenCalled();
    expect(result.success).toBe(false);
    expect(result.error).toBe('error_open_link_failed');
  });

  it('should handle multiple concurrent calls', async () => {
    const urls = [
      'https://example1.com',
      'https://example2.com',
      'https://example3.com',
    ];

    const results = await Promise.all(urls.map((url) => openLinkInNewTab(url)));

    expect(chrome.tabs.create).toHaveBeenCalledTimes(3);
    results.forEach((result) => {
      expect(result).toEqual({ success: true });
    });
  });

  it('should log error to console for invalid URL', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await openLinkInNewTab('invalid-url');

    expect(consoleSpy).toHaveBeenCalledWith('Invalid URL:', 'invalid-url');
    consoleSpy.mockRestore();
  });

  it('should log error to console when chrome.tabs.create fails', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const error = new Error('Tab creation failed');
    vi.mocked(chrome.tabs.create).mockRejectedValueOnce(error);

    await openLinkInNewTab('https://example.com');

    expect(consoleSpy).toHaveBeenCalledWith('Failed to open link in new tab:', error);
    consoleSpy.mockRestore();
  });
});

describe('openLinkInCurrentTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should navigate current tab to valid URL', async () => {
    vi.mocked(chrome.tabs.query).mockResolvedValueOnce([
      createMockTab({ id: 42, url: 'chrome://newtab', title: 'New Tab' }),
    ]);

    const result = await openLinkInCurrentTab('https://example.com');

    expect(chrome.tabs.query).toHaveBeenCalledWith({ active: true, currentWindow: true });
    expect(chrome.tabs.update).toHaveBeenCalledWith(42, { url: 'https://example.com' });
    expect(result).toEqual({ success: true });
  });

  it('should return error for invalid URL without calling chrome.tabs', async () => {
    const result = await openLinkInCurrentTab('invalid-url');

    expect(chrome.tabs.query).not.toHaveBeenCalled();
    expect(chrome.tabs.update).not.toHaveBeenCalled();
    expect(result.success).toBe(false);
    expect(result.error).toBe('error_tab_invalid_url');
  });

  it('should return error for empty URL', async () => {
    const result = await openLinkInCurrentTab('');

    expect(chrome.tabs.query).not.toHaveBeenCalled();
    expect(result.success).toBe(false);
    expect(result.error).toBe('error_tab_invalid_url');
  });

  it('should fallback to create when no current tab found', async () => {
    vi.mocked(chrome.tabs.query).mockResolvedValueOnce([]);

    const result = await openLinkInCurrentTab('https://example.com');

    expect(chrome.tabs.update).not.toHaveBeenCalled();
    expect(chrome.tabs.create).toHaveBeenCalledWith({ url: 'https://example.com', active: true });
    expect(result).toEqual({ success: true });
  });

  it('should fallback to create when current tab has no id', async () => {
    vi.mocked(chrome.tabs.query).mockResolvedValueOnce([
      createMockTab({ id: undefined }),
    ]);

    const result = await openLinkInCurrentTab('https://example.com');

    expect(chrome.tabs.update).not.toHaveBeenCalled();
    expect(chrome.tabs.create).toHaveBeenCalledWith({ url: 'https://example.com', active: true });
    expect(result).toEqual({ success: true });
  });

  it('should return error when chrome.tabs.update fails', async () => {
    const error = new Error('Update failed');
    vi.mocked(chrome.tabs.query).mockResolvedValueOnce([
      createMockTab({ id: 42 }),
    ]);
    vi.mocked(chrome.tabs.update).mockRejectedValueOnce(error);

    const result = await openLinkInCurrentTab('https://example.com');

    expect(result.success).toBe(false);
    expect(result.error).toBe('error_open_link_failed');
  });

  it('should log error to console for invalid URL', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await openLinkInCurrentTab('invalid-url');

    expect(consoleSpy).toHaveBeenCalledWith('Invalid URL:', 'invalid-url');
    consoleSpy.mockRestore();
  });

  it('should log error to console when chrome.tabs.update fails', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const error = new Error('Update failed');
    vi.mocked(chrome.tabs.query).mockResolvedValueOnce([
      createMockTab({ id: 42 }),
    ]);
    vi.mocked(chrome.tabs.update).mockRejectedValueOnce(error);

    await openLinkInCurrentTab('https://example.com');

    expect(consoleSpy).toHaveBeenCalledWith('Failed to open link in current tab:', error);
    consoleSpy.mockRestore();
  });
});

describe('getCurrentTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return current tab info with url, title, and favicon', async () => {
    vi.mocked(chrome.tabs.query).mockResolvedValueOnce([
      createMockTab({
        url: 'https://example.com',
        title: 'Example Page',
        favIconUrl: 'https://example.com/favicon.ico',
      }),
    ]);

    const result = await getCurrentTab();

    expect(chrome.tabs.query).toHaveBeenCalledWith({ active: true, currentWindow: true });
    expect(result).toEqual({
      url: 'https://example.com',
      title: 'Example Page',
      favicon: 'https://example.com/favicon.ico',
    });
  });

  it('should return null if no active tab found', async () => {
    vi.mocked(chrome.tabs.query).mockResolvedValueOnce([]);

    const result = await getCurrentTab();

    expect(result).toBeNull();
  });

  it('should return null if tab has no url', async () => {
    vi.mocked(chrome.tabs.query).mockResolvedValueOnce([
      createMockTab({ title: 'Tab without URL' }),
    ]);

    const result = await getCurrentTab();

    expect(result).toBeNull();
  });

  it('should return null if tab has no title', async () => {
    vi.mocked(chrome.tabs.query).mockResolvedValueOnce([
      createMockTab({ url: 'https://example.com' }),
    ]);

    const result = await getCurrentTab();

    expect(result).toBeNull();
  });

  it('should handle favicon being undefined', async () => {
    vi.mocked(chrome.tabs.query).mockResolvedValueOnce([
      createMockTab({ url: 'https://example.com', title: 'Example Page' }),
    ]);

    const result = await getCurrentTab();

    expect(result).toEqual({
      url: 'https://example.com',
      title: 'Example Page',
      favicon: undefined,
    });
  });

  it('should return null when chrome.tabs.query fails', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(chrome.tabs.query).mockRejectedValueOnce(new Error('Query failed'));

    const result = await getCurrentTab();

    expect(result).toBeNull();
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});

describe('isSaveableUrl', () => {
  it('should return true for https URLs', () => {
    expect(isSaveableUrl('https://example.com')).toBe(true);
  });

  it('should return true for http URLs', () => {
    expect(isSaveableUrl('http://example.com')).toBe(true);
  });

  it('should return true for file URLs', () => {
    expect(isSaveableUrl('file:///path/to/file.html')).toBe(true);
  });

  it('should return false for chrome:// URLs', () => {
    expect(isSaveableUrl('chrome://extensions')).toBe(false);
  });

  it('should return false for chrome-extension:// URLs', () => {
    expect(isSaveableUrl('chrome-extension://abcdef/popup.html')).toBe(false);
  });

  it('should return false for about: URLs', () => {
    expect(isSaveableUrl('about:blank')).toBe(false);
  });

  it('should return false for edge:// URLs', () => {
    expect(isSaveableUrl('edge://settings')).toBe(false);
  });

  it('should return false for brave:// URLs', () => {
    expect(isSaveableUrl('brave://settings')).toBe(false);
  });
});
