/**
 * Unit tests for OnboardingWizard component.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/svelte';
import OnboardingWizard from '@/newtab/components/OnboardingWizard.svelte';
import { settingsStore } from '@/lib/stores/settings';
import { DEFAULT_SETTINGS } from '@/lib/types';
import type { Settings } from '@/lib/types';

const { createStorageMock } = await vi.hoisted(() => import('../mocks/storage'));

vi.mock('@/lib/storage', () => ({
  ...createStorageMock(),
  getSettings: vi.fn(() => Promise.resolve({ ...DEFAULT_SETTINGS })),
  updateSettings: vi.fn((updates: Partial<Settings>) =>
    Promise.resolve({ ...DEFAULT_SETTINGS, ...updates })
  ),
  saveSettings: vi.fn(() => Promise.resolve()),
}));

function setSettingsState(overrides: Partial<Settings> = {}): void {
  settingsStore.set({
    settings: { ...DEFAULT_SETTINGS, ...overrides },
    loading: false,
    error: null,
    pendingLocalUpdate: false,
  });
}

describe('OnboardingWizard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setSettingsState();
  });

  afterEach(() => {
    cleanup();
  });

  describe('step 1 - Welcome', () => {
    it('should render step 1 by default with welcome text', () => {
      render(OnboardingWizard);

      expect(screen.getByText('onboarding_welcome')).toBeInTheDocument();
      expect(screen.getByText('onboarding_description')).toBeInTheDocument();
    });

    it('should show feature list', () => {
      render(OnboardingWizard);

      expect(screen.getByText('onboarding_feature_kanban')).toBeInTheDocument();
      expect(screen.getByText('onboarding_feature_drag')).toBeInTheDocument();
      expect(screen.getByText('onboarding_feature_search')).toBeInTheDocument();
    });

    it('should show Next button but no Back button on step 1', () => {
      render(OnboardingWizard);

      expect(screen.getByText('onboarding_next')).toBeInTheDocument();
      expect(screen.queryByText('onboarding_back')).not.toBeInTheDocument();
    });
  });

  describe('navigation', () => {
    it('should navigate forward with Next button', async () => {
      render(OnboardingWizard);

      const nextBtn = screen.getByText('onboarding_next');
      await fireEvent.click(nextBtn);

      expect(screen.getByText('onboarding_theme_title')).toBeInTheDocument();
    });

    it('should navigate backward with Back button', async () => {
      render(OnboardingWizard);

      // Go to step 2
      await fireEvent.click(screen.getByText('onboarding_next'));
      expect(screen.getByText('onboarding_theme_title')).toBeInTheDocument();

      // Go back to step 1 (during transition both steps may co-exist briefly)
      await fireEvent.click(screen.getByText('onboarding_back'));
      await waitFor(() => {
        expect(screen.getAllByText('onboarding_welcome').length).toBeGreaterThanOrEqual(1);
      });
    });

    it('should navigate through all 4 steps', async () => {
      render(OnboardingWizard);

      // Step 1 -> 2
      await fireEvent.click(screen.getByText('onboarding_next'));
      expect(screen.getByText('onboarding_theme_title')).toBeInTheDocument();

      // Step 2 -> 3
      await fireEvent.click(screen.getByText('onboarding_next'));
      expect(screen.getByText('onboarding_newtab_title')).toBeInTheDocument();

      // Step 3 -> 4
      await fireEvent.click(screen.getByText('onboarding_next'));
      expect(screen.getByText('onboarding_done_title')).toBeInTheDocument();
    });

    it('should show Get Started button on step 4', async () => {
      render(OnboardingWizard);

      // Navigate to step 4
      await fireEvent.click(screen.getByText('onboarding_next'));
      await fireEvent.click(screen.getByText('onboarding_next'));
      await fireEvent.click(screen.getByText('onboarding_next'));

      expect(screen.getByText('onboarding_get_started')).toBeInTheDocument();
    });
  });

  describe('step 2 - Theme selection', () => {
    it('should render theme selector with radiogroup', async () => {
      render(OnboardingWizard);
      await fireEvent.click(screen.getByText('onboarding_next'));

      const radiogroup = screen.getByRole('radiogroup');
      expect(radiogroup).toBeInTheDocument();
    });

    it('should render three theme options', async () => {
      render(OnboardingWizard);
      await fireEvent.click(screen.getByText('onboarding_next'));

      const radios = screen.getAllByRole('radio');
      expect(radios).toHaveLength(3);
    });

    it('should call setTheme when theme option is clicked', async () => {
      const setThemeSpy = vi.spyOn(settingsStore, 'setTheme');
      render(OnboardingWizard);
      await fireEvent.click(screen.getByText('onboarding_next'));

      const darkOption = screen.getByText('settings_theme_dark');
      await fireEvent.click(darkOption.closest('button')!);

      expect(setThemeSpy).toHaveBeenCalledWith('dark');
    });

    it('should have aria-checked on active theme', async () => {
      setSettingsState({ theme: 'system' });
      render(OnboardingWizard);
      await fireEvent.click(screen.getByText('onboarding_next'));

      const radios = screen.getAllByRole('radio');
      const systemRadio = radios.find(r => r.getAttribute('aria-checked') === 'true');
      expect(systemRadio).toBeTruthy();
    });
  });

  describe('step 3 - New Tab toggle', () => {
    it('should render toggle with aria-pressed', async () => {
      setSettingsState({ newtabEnabled: true });
      render(OnboardingWizard);

      // Navigate to step 3
      await fireEvent.click(screen.getByText('onboarding_next'));
      await fireEvent.click(screen.getByText('onboarding_next'));

      const toggle = screen.getByRole('button', { name: 'settings_enable_newtab' });
      expect(toggle).toBeInTheDocument();
      expect(toggle).toHaveAttribute('aria-pressed', 'true');
    });

    it('should call setNewtabEnabled when toggle is clicked', async () => {
      setSettingsState({ newtabEnabled: true });
      const setNewtabSpy = vi.spyOn(settingsStore, 'setNewtabEnabled');
      render(OnboardingWizard);

      // Navigate to step 3
      await fireEvent.click(screen.getByText('onboarding_next'));
      await fireEvent.click(screen.getByText('onboarding_next'));

      const toggle = screen.getByRole('button', { name: 'settings_enable_newtab' });
      await fireEvent.click(toggle);

      expect(setNewtabSpy).toHaveBeenCalledWith(false);
    });

    it('should show change-later hint text', async () => {
      render(OnboardingWizard);

      await fireEvent.click(screen.getByText('onboarding_next'));
      await fireEvent.click(screen.getByText('onboarding_next'));

      expect(screen.getByText('onboarding_change_later')).toBeInTheDocument();
    });
  });

  describe('step 4 - Completion', () => {
    it('should mark onboardingCompleted and dispatch close on Get Started', async () => {
      const updateSettingsSpy = vi.spyOn(settingsStore, 'updateSettings');
      const { component } = render(OnboardingWizard);
      const closeHandler = vi.fn();
      component.$on('close', closeHandler);

      // Navigate to step 4
      await fireEvent.click(screen.getByText('onboarding_next'));
      await fireEvent.click(screen.getByText('onboarding_next'));
      await fireEvent.click(screen.getByText('onboarding_next'));

      // Click Get Started
      await fireEvent.click(screen.getByText('onboarding_get_started'));

      expect(updateSettingsSpy).toHaveBeenCalledWith({ onboardingCompleted: true });
      expect(closeHandler).toHaveBeenCalled();
    });

    it('should show done description', async () => {
      render(OnboardingWizard);

      await fireEvent.click(screen.getByText('onboarding_next'));
      await fireEvent.click(screen.getByText('onboarding_next'));
      await fireEvent.click(screen.getByText('onboarding_next'));

      expect(screen.getByText('onboarding_done_description')).toBeInTheDocument();
    });
  });

  describe('dismiss without completing', () => {
    it('should dispatch close on Escape without marking as completed', async () => {
      const updateSettingsSpy = vi.spyOn(settingsStore, 'updateSettings');
      const { component } = render(OnboardingWizard);
      const closeHandler = vi.fn();
      component.$on('close', closeHandler);

      await fireEvent.keyDown(window, { key: 'Escape' });

      expect(closeHandler).toHaveBeenCalled();
      expect(updateSettingsSpy).not.toHaveBeenCalled();
    });

    it('should dispatch close on backdrop click without marking as completed', async () => {
      const updateSettingsSpy = vi.spyOn(settingsStore, 'updateSettings');
      const { component } = render(OnboardingWizard);
      const closeHandler = vi.fn();
      component.$on('close', closeHandler);

      const backdrop = screen.getByRole('dialog');
      await fireEvent.click(backdrop);

      expect(closeHandler).toHaveBeenCalled();
      expect(updateSettingsSpy).not.toHaveBeenCalled();
    });
  });

  describe('accessibility', () => {
    it('should have dialog role and aria-modal', () => {
      render(OnboardingWizard);

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
    });

    it('should have aria-labelledby pointing to title', () => {
      render(OnboardingWizard);

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-labelledby', 'onboarding-title');
    });

    it('should have progress dots with step info', () => {
      render(OnboardingWizard);

      const dotsGroup = screen.getByRole('group');
      expect(dotsGroup).toBeInTheDocument();
    });

    it('should show 4 progress dots', () => {
      const { container } = render(OnboardingWizard);

      const dots = container.querySelectorAll('.dot');
      expect(dots).toHaveLength(4);
    });

    it('should mark current step dot as active', () => {
      const { container } = render(OnboardingWizard);

      const activeDot = container.querySelector('.dot.active');
      expect(activeDot).toBeTruthy();
    });

    it('should update active dot when navigating', async () => {
      const { container } = render(OnboardingWizard);

      await fireEvent.click(screen.getByText('onboarding_next'));

      const dots = container.querySelectorAll('.dot');
      expect(dots[0]).toHaveClass('completed');
      expect(dots[1]).toHaveClass('active');
    });
  });
});
