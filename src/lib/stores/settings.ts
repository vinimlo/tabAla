import { writable, type Writable } from 'svelte/store';
import { type Settings, type ThemePreference, DEFAULT_SETTINGS } from '@/lib/types';
import { getSettings, updateSettings, storage, getErrorMessage } from '@/lib/storage';

interface SettingsState {
  settings: Settings;
  loading: boolean;
  error: string | null;
  pendingLocalUpdate: boolean;
}

/** Resolves 'system' to the actual theme based on OS/browser preference. */
function resolveTheme(pref: ThemePreference): 'light' | 'dark' {
  if (pref !== 'system') {
    return pref;
  }
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return 'dark';
}

/** Applies the resolved theme to the document root element. */
export function applyTheme(pref: ThemePreference): void {
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('data-theme', resolveTheme(pref));
  }
}

function createSettingsStore(): Writable<SettingsState> & {
  load: () => Promise<void>;
  updateSettings: (updates: Partial<Settings>) => Promise<void>;
  setNewtabEnabled: (enabled: boolean) => Promise<void>;
  setTheme: (theme: ThemePreference) => Promise<void>;
} {
  const { subscribe, set, update: storeUpdate } = writable<SettingsState>({
    settings: { ...DEFAULT_SETTINGS },
    loading: true,
    error: null,
    pendingLocalUpdate: false,
  });

  // Listen for OS theme changes when preference is 'system'
  if (typeof window !== 'undefined' && window.matchMedia) {
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    mql.addEventListener('change', () => {
      let currentTheme: ThemePreference = 'system';
      subscribe((state) => { currentTheme = state.settings.theme; })();
      if (currentTheme === 'system') {
        applyTheme('system');
      }
    });
  }

  // Watch for storage changes from other contexts (popup <-> newtab)
  storage.watch((changes) => {
    if (changes.settings?.newValue) {
      storeUpdate((state) => {
        if (state.pendingLocalUpdate) {
          return state;
        }
        const newSettings = changes.settings.newValue as Settings;
        applyTheme(newSettings.theme);
        return {
          ...state,
          settings: newSettings,
        };
      });
    }
  });

  async function load(): Promise<void> {
    storeUpdate((state) => ({ ...state, loading: true, error: null }));

    try {
      const settings = await getSettings();
      applyTheme(settings.theme);
      storeUpdate((state) => ({
        ...state,
        settings,
        loading: false,
        error: null,
      }));
    } catch (error) {
      const message = getErrorMessage(error, 'Failed to load settings');
      storeUpdate((state) => ({ ...state, loading: false, error: message }));
    }
  }

  async function updateSettingsStore(updates: Partial<Settings>): Promise<void> {
    storeUpdate((state) => ({ ...state, pendingLocalUpdate: true }));
    try {
      const updatedSettings = await updateSettings(updates);
      if (updates.theme !== undefined) {
        applyTheme(updatedSettings.theme);
      }
      storeUpdate((state) => ({
        ...state,
        settings: updatedSettings,
      }));
    } catch (error) {
      const message = getErrorMessage(error, 'Failed to update settings');
      storeUpdate((state) => ({ ...state, error: message }));
    } finally {
      storeUpdate((state) => ({ ...state, pendingLocalUpdate: false }));
    }
  }

  async function setNewtabEnabled(enabled: boolean): Promise<void> {
    await updateSettingsStore({ newtabEnabled: enabled });
  }

  async function setTheme(theme: ThemePreference): Promise<void> {
    await updateSettingsStore({ theme });
  }

  return {
    subscribe,
    set,
    update: storeUpdate,
    load,
    updateSettings: updateSettingsStore,
    setNewtabEnabled,
    setTheme,
  };
}

export const settingsStore = createSettingsStore();
