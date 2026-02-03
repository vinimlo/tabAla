/**
 * Unit tests for tabs.ts utility functions.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { isValidUrl, openLinkInNewTab, getCurrentTab, isSaveableUrl } from '@/lib/tabs';

describe('isValidUrl', () => {
  it('should return true for valid http URL', () => {
    expect(isValidUrl('http://example.com')).toBe(true);
  });

  it('should return true for valid https URL', () => {
    expect(isValidUrl('https://example.com')).toBe(true);
  });

  it('should return true for https URL with path and query', () => {
    expect(isValidUrl('https://example.com/path?query=value')).toBe(true);
  });

  it('should return true for file protocol URL', () => {
    expect(isValidUrl('file:///path/to/file.html')).toBe(true);
  });

  it('should return false for empty string', () => {
    expect(isValidUrl('')).toBe(false);
  });

  it('should return false for null', () => {
    expect(isValidUrl(null as unknown as string)).toBe(false);
  });

  it('should return false for undefined', () => {
    expect(isValidUrl(undefined as unknown as string)).toBe(false);
  });

  it('should return false for malformed URL', () => {
    expect(isValidUrl('htp://invalid')).toBe(false);
  });

  it('should return false for javascript protocol', () => {
    expect(isValidUrl('javascript:alert(1)')).toBe(false);
  });

  it('should return false for data protocol', () => {
    expect(isValidUrl('data:text/html,<h1>Hello</h1>')).toBe(false);
  });

  it('should return false for plain text', () => {
    expect(isValidUrl('just some text')).toBe(false);
  });

  it('should return false for number', () => {
    expect(isValidUrl(12345 as unknown as string)).toBe(false);
  });
});

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
    expect(result.error).toBe('URL inválido. Não foi possível abrir o link.');
  });

  it('should return error for empty URL', async () => {
    const result = await openLinkInNewTab('');

    expect(chrome.tabs.create).not.toHaveBeenCalled();
    expect(result.success).toBe(false);
    expect(result.error).toBe('URL inválido. Não foi possível abrir o link.');
  });

  it('should return error when chrome.tabs.create fails', async () => {
    vi.mocked(chrome.tabs.create).mockRejectedValueOnce(new Error('Tab creation failed'));

    const url = 'https://example.com';
    const result = await openLinkInNewTab(url);

    expect(chrome.tabs.create).toHaveBeenCalled();
    expect(result.success).toBe(false);
    expect(result.error).toBe('Erro ao abrir link. Tente novamente.');
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

describe('getCurrentTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return current tab info with url, title, and favicon', async () => {
    vi.mocked(chrome.tabs.query).mockResolvedValueOnce([
      {
        id: 1,
        index: 0,
        windowId: 1,
        highlighted: true,
        active: true,
        pinned: false,
        incognito: false,
        url: 'https://example.com',
        title: 'Example Page',
        favIconUrl: 'https://example.com/favicon.ico',
      },
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
      {
        id: 1,
        index: 0,
        windowId: 1,
        highlighted: true,
        active: true,
        pinned: false,
        incognito: false,
        title: 'Tab without URL',
      },
    ]);

    const result = await getCurrentTab();

    expect(result).toBeNull();
  });

  it('should return null if tab has no title', async () => {
    vi.mocked(chrome.tabs.query).mockResolvedValueOnce([
      {
        id: 1,
        index: 0,
        windowId: 1,
        highlighted: true,
        active: true,
        pinned: false,
        incognito: false,
        url: 'https://example.com',
      },
    ]);

    const result = await getCurrentTab();

    expect(result).toBeNull();
  });

  it('should handle favicon being undefined', async () => {
    vi.mocked(chrome.tabs.query).mockResolvedValueOnce([
      {
        id: 1,
        index: 0,
        windowId: 1,
        highlighted: true,
        active: true,
        pinned: false,
        incognito: false,
        url: 'https://example.com',
        title: 'Example Page',
      },
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
