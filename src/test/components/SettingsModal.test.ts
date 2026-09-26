/**
 * Settings: the next up strip and the usage data.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import SettingsModal from '@/newtab/components/SettingsModal.svelte';
import { settingsStore } from '@/lib/stores/settings';
import * as storage from '@/lib/storage';
import { DEFAULT_SETTINGS } from '@/lib/types';
import { queryLanguageName } from '@/lib/ai/translator';
const { createStorageMock } = await vi.hoisted(() => import('../mocks/storage'));

vi.mock('@/lib/storage', () => createStorageMock());
vi.mock('@/lib/ai/translator', () => ({
  getTranslationAvailability: vi.fn(() => Promise.resolve('unavailable')),
  downloadTranslation: vi.fn(() => Promise.resolve()),
  topicSearchView: vi.fn(() => 'unavailable'),
  queryLanguageName: vi.fn(() => 'Portuguese'),
}));

describe('SettingsModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    settingsStore.set({ settings: { ...DEFAULT_SETTINGS }, loading: false, error: null, pendingLocalUpdate: false });
  });

  it('says which language topic search translates from', () => {
    render(SettingsModal);

    expect(screen.getByText('topic_search_description_from')).toBeInTheDocument();
    expect(chrome.i18n.getMessage).toHaveBeenCalledWith('topic_search_description_from', ['Portuguese']);
  });

  it('keeps a general description when every language is English', () => {
    vi.mocked(queryLanguageName).mockReturnValueOnce(null);
    render(SettingsModal);

    expect(screen.getByText('topic_search_description')).toBeInTheDocument();
  });

  it('lists every dashboard shortcut, with no text outside the locales', () => {
    const { container } = render(SettingsModal);
    const list = container.querySelector('.shortcuts-list') as HTMLElement;

    for (const label of ['settings_shortcut_search', 'settings_shortcut_new_collection', 'focus_open', 'tabs_sidebar_title', 'settings_shortcut_close_modal']) {
      expect(list).toHaveTextContent(label);
    }
    expect(list).toHaveTextContent('common_or');
    expect(list).not.toHaveTextContent(/\bou\b/);
    expect([...list.querySelectorAll('kbd')].map((kbd) => kbd.textContent)).toEqual(['/', 'Ctrl', 'K', 'N', 'F', 'T', 'Esc']);
  });

  it('turns the next up strip off', async () => {
    render(SettingsModal);

    await fireEvent.click(screen.getByRole('button', { name: 'settings_nextup_toggle_label' }));

    expect(storage.updateSettings).toHaveBeenCalledWith({ showNextUp: false });
  });

  it('turning learning off stops it and clears pending questions', async () => {
    render(SettingsModal);

    await fireEvent.click(screen.getByRole('button', { name: 'settings_learn_toggle_label' }));

    expect(storage.updateSettings).toHaveBeenCalledWith({ learnFromBrowsing: false });
    await waitFor(() => expect(storage.clearAsks).toHaveBeenCalledTimes(1));
  });

  it('clears usage data only after confirming', async () => {
    render(SettingsModal);

    await fireEvent.click(screen.getByRole('button', { name: 'settings_usage_clear' }));
    expect(storage.clearUsageData).not.toHaveBeenCalled();
    await fireEvent.click(screen.getByRole('button', { name: 'common_delete' }));

    await waitFor(() => expect(storage.clearUsageData).toHaveBeenCalledTimes(1));
  });
});
