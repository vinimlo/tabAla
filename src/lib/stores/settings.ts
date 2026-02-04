/**
 * Svelte store for managing user settings.
 * Provides reactive state management with persistence to chrome.storage.local.
 */

import { writable, type Writable } from 'svelte/store';
import type { Settings } from '@/lib/types';
import { DEFAULT_SETTINGS } from '@/lib/types';
import { getSettings, updateSettings, storage } from '@/lib/storage';

interface SettingsState {
  settings: Settings;
  loading: boolean;
  error: string | null;
}

function createSettingsStore(): Writable<SettingsState> & {
  load: () => Promise<void>;
  updateSettings: (updates: Partial<Settings>) => Promise<void>;
  setNewtabEnabled: (enabled: boolean) => Promise<void>;
  completeOnboarding: () => Promise<void>;
} {
  const { subscribe, set, update: storeUpdate } = writable<SettingsState>({
    settings: { ...DEFAULT_SETTINGS },
    loading: true,
    error: null,
  });

  // Watch for storage changes from other contexts (popup <-> newtab)
  storage.watch((changes) => {
    if (changes.settings?.newValue) {
      storeUpdate((state) => ({
        ...state,
        settings: changes.settings.newValue as Settings,
      }));
    }
  });

  async function load(): Promise<void> {
    storeUpdate((state) => ({ ...state, loading: true, error: null }));

    try {
      const settings = await getSettings();
      storeUpdate((state) => ({
        ...state,
        settings,
        loading: false,
        error: null,
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load settings';
      storeUpdate((state) => ({ ...state, loading: false, error: message }));
    }
  }

  async function updateSettingsStore(updates: Partial<Settings>): Promise<void> {
    try {
      const updatedSettings = await updateSettings(updates);
      storeUpdate((state) => ({
        ...state,
        settings: updatedSettings,
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update settings';
      storeUpdate((state) => ({ ...state, error: message }));
    }
  }

  async function setNewtabEnabled(enabled: boolean): Promise<void> {
    await updateSettingsStore({ newtabEnabled: enabled });
  }

  async function completeOnboarding(): Promise<void> {
    await updateSettingsStore({ onboardingCompleted: true });
  }

  return {
    subscribe,
    set,
    update: storeUpdate,
    load,
    updateSettings: updateSettingsStore,
    setNewtabEnabled,
    completeOnboarding,
  };
}

export const settingsStore = createSettingsStore();

// Derived values for convenience
export function isNewtabEnabled(state: SettingsState): boolean {
  return state.settings.newtabEnabled;
}

export function isOnboardingCompleted(state: SettingsState): boolean {
  return state.settings.onboardingCompleted;
}
