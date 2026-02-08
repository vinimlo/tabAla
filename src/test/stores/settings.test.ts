/**
 * Settings store tests.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { get } from 'svelte/store';
import { DEFAULT_SETTINGS } from '@/lib/types';
import type { Settings } from '@/lib/types';
import { settingsStore, applyTheme } from '@/lib/stores/settings';
import * as storage from '@/lib/storage';
const { createStorageMock } = await vi.hoisted(() => import('../mocks/storage'));

vi.mock('@/lib/storage', () => createStorageMock());

const INITIAL_STORE_STATE = {
  settings: { ...DEFAULT_SETTINGS },
  loading: true,
  error: null,
  pendingLocalUpdate: false,
};

describe('settingsStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    settingsStore.set(INITIAL_STORE_STATE);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initial state', () => {
    it('should have loading: true, settings: DEFAULT_SETTINGS, error: null', () => {
      settingsStore.set(INITIAL_STORE_STATE);
      const state = get(settingsStore);

      expect(state.loading).toBe(true);
      expect(state.settings).toEqual(DEFAULT_SETTINGS);
      expect(state.error).toBeNull();
    });
  });

  describe('load', () => {
    it('should load settings from storage and apply theme', async () => {
      const customSettings: Settings = {
        newtabEnabled: false,
        onboardingCompleted: true,
        theme: 'dark',
      };
      vi.mocked(storage.getSettings).mockResolvedValue(customSettings);

      await settingsStore.load();

      const state = get(settingsStore);
      expect(state.loading).toBe(false);
      expect(state.settings).toEqual(customSettings);
      expect(state.error).toBeNull();
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    });

    it('should set error and loading: false on failure', async () => {
      vi.mocked(storage.getSettings).mockRejectedValue(new Error('Storage error'));

      await settingsStore.load();

      const state = get(settingsStore);
      expect(state.loading).toBe(false);
      expect(state.error).toBe('Storage error');
    });
  });

  describe('setTheme', () => {
    it('should persist theme and apply it', async () => {
      vi.mocked(storage.updateSettings).mockResolvedValue({
        ...DEFAULT_SETTINGS,
        theme: 'dark',
      });

      await settingsStore.setTheme('dark');

      const state = get(settingsStore);
      expect(state.settings.theme).toBe('dark');
      expect(storage.updateSettings).toHaveBeenCalledWith({ theme: 'dark' });
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    });
  });

  describe('setNewtabEnabled', () => {
    it('should persist newtabEnabled to storage', async () => {
      vi.mocked(storage.updateSettings).mockResolvedValue({
        ...DEFAULT_SETTINGS,
        newtabEnabled: false,
      });

      await settingsStore.setNewtabEnabled(false);

      expect(storage.updateSettings).toHaveBeenCalledWith({ newtabEnabled: false });
      const state = get(settingsStore);
      expect(state.settings.newtabEnabled).toBe(false);
    });
  });

  describe('updateSettings', () => {
    it('should set error on failure', async () => {
      vi.mocked(storage.updateSettings).mockRejectedValue(new Error('Update failed'));

      await settingsStore.updateSettings({ newtabEnabled: false });

      const state = get(settingsStore);
      expect(state.error).toBe('Update failed');
    });
  });
});

describe('applyTheme', () => {
  it('should set data-theme attribute on documentElement', () => {
    applyTheme('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');

    applyTheme('light');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  it('should resolve system theme based on matchMedia', () => {
    // matchMedia is mocked to return matches: false (light mode)
    applyTheme('system');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');

    // Mock matchMedia to return dark mode
    vi.mocked(window.matchMedia).mockReturnValue({
      matches: true,
      media: '(prefers-color-scheme: dark)',
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    });

    applyTheme('system');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });
});
