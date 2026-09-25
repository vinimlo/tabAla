/**
 * Settings: the next up strip and the usage data.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import SettingsModal from '@/newtab/components/SettingsModal.svelte';
import { settingsStore } from '@/lib/stores/settings';
import * as storage from '@/lib/storage';
import { DEFAULT_SETTINGS } from '@/lib/types';
const { createStorageMock } = await vi.hoisted(() => import('../mocks/storage'));

vi.mock('@/lib/storage', () => createStorageMock());
vi.mock('@/lib/ai/translator', () => ({
  getTranslationAvailability: vi.fn(() => Promise.resolve('unavailable')),
  downloadTranslation: vi.fn(() => Promise.resolve()),
  topicSearchView: vi.fn(() => 'unavailable'),
}));

describe('SettingsModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    settingsStore.set({ settings: { ...DEFAULT_SETTINGS }, loading: false, error: null, pendingLocalUpdate: false });
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
