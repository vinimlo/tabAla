/**
 * Example unit tests to validate Vitest configuration.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockStorage } from './setup';
import type { Link } from '@/lib/types';

describe('Vitest Configuration', () => {
  it('should have globals available', () => {
    expect(describe).toBeDefined();
    expect(it).toBeDefined();
    expect(expect).toBeDefined();
  });

  it('should have jsdom environment', () => {
    expect(document).toBeDefined();
    expect(window).toBeDefined();
    expect(typeof document.querySelector).toBe('function');
  });

  it('should resolve @ alias correctly', () => {
    const link: Link = {
      id: '1',
      url: 'https://example.com',
      title: 'Example',
      collectionId: 'inbox',
      createdAt: Date.now(),
    };
    expect(link.id).toBe('1');
  });
});

describe('Chrome API Mocks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.keys(mockStorage).forEach((key) => delete mockStorage[key]);
  });

  it('should have chrome global defined', () => {
    expect(chrome).toBeDefined();
    expect(chrome.storage).toBeDefined();
    expect(chrome.tabs).toBeDefined();
    expect(chrome.runtime).toBeDefined();
  });

  it('should mock chrome.storage.local.set and get', async () => {
    const testData = { key: 'value' };
    await chrome.storage.local.set(testData);
    const result = await chrome.storage.local.get('key');
    expect(result).toEqual({ key: 'value' });
  });

  it('should mock chrome.storage.local.remove', async () => {
    await chrome.storage.local.set({ toRemove: 'data' });
    await chrome.storage.local.remove('toRemove');
    const result = await chrome.storage.local.get('toRemove');
    expect(result.toRemove).toBeUndefined();
  });

  it('should mock chrome.storage.local.clear', async () => {
    await chrome.storage.local.set({ a: 1, b: 2 });
    await chrome.storage.local.clear();
    const result = await chrome.storage.local.get(null);
    expect(result).toEqual({});
  });

  it('should mock chrome.tabs.query', async () => {
    const tabs = await chrome.tabs.query({});
    expect(Array.isArray(tabs)).toBe(true);
  });

  it('should mock chrome.runtime.getURL', () => {
    const url = chrome.runtime.getURL('popup.html');
    expect(url).toContain('chrome-extension://');
    expect(url).toContain('popup.html');
  });
});

describe('DOM Operations (jsdom environment)', () => {
  it('should create and query DOM elements', () => {
    const div = document.createElement('div');
    div.id = 'test-element';
    div.textContent = 'Hello TabAla';
    document.body.appendChild(div);

    const found = document.querySelector('#test-element');
    expect(found).not.toBeNull();
    expect(found?.textContent).toBe('Hello TabAla');

    document.body.removeChild(div);
  });

  it('should handle event listeners', () => {
    const button = document.createElement('button');
    const handler = vi.fn();
    button.addEventListener('click', handler);
    button.click();
    expect(handler).toHaveBeenCalledTimes(1);
  });
});
