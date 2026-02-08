<script lang="ts">
  import { createEventDispatcher, tick } from 'svelte';
  import { fade, scale, fly } from 'svelte/transition';
  import { t } from '@lib/i18n';
  import { settingsStore } from '@/lib/stores/settings';
  import type { ThemePreference } from '@/lib/types';

  const dispatch = createEventDispatcher<{
    close: void;
  }>();

  const TOTAL_STEPS = 4;

  let currentStep = 1;
  let direction = 1; // 1 = forward, -1 = backward
  let wizardEl: HTMLDivElement;

  $: settings = $settingsStore.settings;

  function handleClose(): void {
    dispatch('close');
  }

  function handleBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      handleClose();
    }
  }

  function handleKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      handleClose();
    }
  }

  async function goNext(): Promise<void> {
    if (currentStep === TOTAL_STEPS) {
      await settingsStore.updateSettings({ onboardingCompleted: true });
      dispatch('close');
      return;
    }
    direction = 1;
    currentStep += 1;
    await tick();
    wizardEl?.focus();
  }

  async function goBack(): Promise<void> {
    if (currentStep <= 1) { return; }
    direction = -1;
    currentStep -= 1;
    await tick();
    wizardEl?.focus();
  }

  async function handleThemeChange(theme: ThemePreference): Promise<void> {
    await settingsStore.setTheme(theme);
  }

  async function toggleNewtab(): Promise<void> {
    await settingsStore.setNewtabEnabled(!settings.newtabEnabled);
  }
</script>

<svelte:window on:keydown={handleKeydown} />

<!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
<div
  class="backdrop"
  on:click={handleBackdropClick}
  on:keydown={handleKeydown}
  transition:fade={{ duration: 150 }}
  role="dialog"
  aria-modal="true"
  aria-labelledby="onboarding-title"
>
  <div
    class="modal"
    bind:this={wizardEl}
    tabindex="-1"
    transition:scale={{ duration: 200, start: 0.95, opacity: 0 }}
  >
    <div class="modal-body">
      {#key currentStep}
        <div
          class="step-content"
          in:fly={{ x: direction * 40, duration: 200, delay: 50 }}
          out:fly={{ x: direction * -40, duration: 150 }}
        >
          {#if currentStep === 1}
            <!-- Welcome step -->
            <div class="step-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--accent-primary)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                <path d="M2 17l10 5 10-5"/>
                <path d="M2 12l10 5 10-5"/>
              </svg>
            </div>
            <h2 id="onboarding-title">{t('onboarding_welcome')}</h2>
            <p class="step-description">{t('onboarding_description')}</p>
            <ul class="feature-list">
              <li>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--semantic-success)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                {t('onboarding_feature_kanban')}
              </li>
              <li>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--semantic-success)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                {t('onboarding_feature_drag')}
              </li>
              <li>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--semantic-success)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                {t('onboarding_feature_search')}
              </li>
            </ul>

          {:else if currentStep === 2}
            <!-- Theme step -->
            <h2 id="onboarding-title">{t('onboarding_theme_title')}</h2>
            <p class="step-description">{t('onboarding_theme_description')}</p>
            <div class="theme-selector" role="radiogroup" aria-label={t('onboarding_theme_title')}>
              <button
                type="button"
                class="theme-option"
                class:active={settings.theme === 'system'}
                on:click={() => handleThemeChange('system')}
                role="radio"
                aria-checked={settings.theme === 'system'}
              >
                <div class="theme-preview theme-preview-system">
                  <div class="preview-half preview-light">
                    <div class="preview-bar"></div>
                    <div class="preview-line"></div>
                    <div class="preview-line short"></div>
                  </div>
                  <div class="preview-half preview-dark">
                    <div class="preview-bar"></div>
                    <div class="preview-line"></div>
                    <div class="preview-line short"></div>
                  </div>
                </div>
                <span class="theme-label">{t('settings_theme_system')}</span>
              </button>

              <button
                type="button"
                class="theme-option"
                class:active={settings.theme === 'light'}
                on:click={() => handleThemeChange('light')}
                role="radio"
                aria-checked={settings.theme === 'light'}
              >
                <div class="theme-preview theme-preview-light">
                  <div class="preview-bar"></div>
                  <div class="preview-line"></div>
                  <div class="preview-line short"></div>
                  <div class="preview-dot"></div>
                </div>
                <span class="theme-label">{t('settings_theme_light')}</span>
              </button>

              <button
                type="button"
                class="theme-option"
                class:active={settings.theme === 'dark'}
                on:click={() => handleThemeChange('dark')}
                role="radio"
                aria-checked={settings.theme === 'dark'}
              >
                <div class="theme-preview theme-preview-dark">
                  <div class="preview-bar"></div>
                  <div class="preview-line"></div>
                  <div class="preview-line short"></div>
                  <div class="preview-dot"></div>
                </div>
                <span class="theme-label">{t('settings_theme_dark')}</span>
              </button>
            </div>

          {:else if currentStep === 3}
            <!-- New Tab step -->
            <h2 id="onboarding-title">{t('onboarding_newtab_title')}</h2>
            <p class="step-description">{t('settings_newtab_description')}</p>
            <div class="newtab-setting">
              <div class="setting-info">
                <span class="setting-label">{t('settings_use_as_newtab')}</span>
              </div>
              <button
                type="button"
                class="toggle"
                class:active={settings.newtabEnabled}
                on:click={toggleNewtab}
                aria-pressed={settings.newtabEnabled}
                aria-label={t('settings_enable_newtab')}
              >
                <span class="toggle-track">
                  <span class="toggle-thumb"></span>
                </span>
              </button>
            </div>
            <p class="hint-text">{t('onboarding_change_later')}</p>

          {:else if currentStep === 4}
            <!-- Done step -->
            <div class="step-icon done-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--semantic-success)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                <polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
            </div>
            <h2 id="onboarding-title">{t('onboarding_done_title')}</h2>
            <p class="step-description">{t('onboarding_done_description')}</p>
          {/if}
        </div>
      {/key}
    </div>

    <footer class="modal-footer">
      <div class="footer-left">
        {#if currentStep > 1}
          <button type="button" class="btn-back" on:click={goBack}>
            {t('onboarding_back')}
          </button>
        {/if}
      </div>

      <div class="progress-dots" role="group" aria-label={t('onboarding_step_of', currentStep, TOTAL_STEPS)}>
        {#each Array(TOTAL_STEPS) as _, i}
          <span
            class="dot"
            class:active={i + 1 === currentStep}
            class:completed={i + 1 < currentStep}
          ></span>
        {/each}
      </div>

      <div class="footer-right">
        <button type="button" class="btn-next" on:click={goNext}>
          {currentStep === TOTAL_STEPS ? t('onboarding_get_started') : t('onboarding_next')}
        </button>
      </div>
    </footer>
  </div>
</div>

<style>
  .backdrop {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.7);
    backdrop-filter: blur(8px) saturate(150%);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }

  .modal {
    background: var(--surface-elevated);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-xl);
    width: 90%;
    max-width: 480px;
    box-shadow:
      var(--shadow-xl),
      0 0 40px rgba(0, 0, 0, 0.15);
    overflow: hidden;
    transform-origin: center center;
    display: flex;
    flex-direction: column;
    outline: none;
  }

  .modal-body {
    padding: var(--space-6) var(--space-5) var(--space-4);
    min-height: 280px;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    overflow: hidden;
  }

  .step-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    width: 100%;
  }

  .step-icon {
    margin-bottom: var(--space-4);
    opacity: 0.9;
  }

  .done-icon {
    animation: checkPop 0.4s var(--ease-spring);
  }

  @keyframes checkPop {
    0% { transform: scale(0.5); opacity: 0; }
    70% { transform: scale(1.1); }
    100% { transform: scale(1); opacity: 0.9; }
  }

  .step-content h2 {
    margin: 0 0 var(--space-2);
    font-family: var(--font-body);
    font-size: var(--text-xl);
    font-weight: 600;
    color: var(--text-primary);
  }

  .step-description {
    margin: 0 0 var(--space-5);
    font-family: var(--font-body);
    font-size: var(--text-sm);
    color: var(--text-secondary);
    line-height: 1.5;
    max-width: 340px;
  }

  .feature-list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    width: 100%;
    max-width: 280px;
  }

  .feature-list li {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    font-family: var(--font-body);
    font-size: var(--text-sm);
    color: var(--text-secondary);
    text-align: left;
  }

  .feature-list li svg {
    flex-shrink: 0;
  }

  /* Theme selector (mirrored from SettingsModal) */
  .theme-selector {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: var(--space-3);
    width: 100%;
  }

  .theme-option {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-3);
    background: transparent;
    border: 2px solid var(--border-default);
    border-radius: var(--radius-lg);
    cursor: pointer;
    transition: all var(--duration-fast) var(--ease-out);
  }

  .theme-option:hover {
    border-color: var(--border-strong);
    background: var(--surface-overlay);
  }

  .theme-option.active {
    border-color: var(--accent-primary);
    background: var(--accent-soft);
  }

  .theme-option:focus-visible {
    outline: 2px solid var(--accent-primary);
    outline-offset: 2px;
  }

  .theme-label {
    font-family: var(--font-body);
    font-size: var(--text-sm);
    font-weight: 500;
    color: var(--text-secondary);
    transition: color var(--duration-fast) var(--ease-out);
  }

  .theme-option.active .theme-label {
    color: var(--accent-primary);
  }

  .theme-preview {
    width: 100%;
    aspect-ratio: 4 / 3;
    border-radius: var(--radius-sm);
    overflow: hidden;
    display: flex;
    flex-direction: column;
    padding: 6px;
    gap: 4px;
    transition: transform var(--duration-fast) var(--ease-out);
  }

  .theme-option:hover .theme-preview {
    transform: scale(1.03);
  }

  .theme-preview-light {
    background: #F8F6F3;
    border: 1px solid rgba(0, 0, 0, 0.08);
  }

  .theme-preview-dark {
    background: #0F0E11;
    border: 1px solid rgba(255, 255, 255, 0.08);
  }

  .theme-preview-system {
    flex-direction: row;
    padding: 0;
    gap: 0;
    border: 1px solid rgba(0, 0, 0, 0.08);
  }

  .preview-half {
    flex: 1;
    display: flex;
    flex-direction: column;
    padding: 6px;
    gap: 4px;
  }

  .preview-light {
    background: #F8F6F3;
  }

  .preview-dark {
    background: #0F0E11;
  }

  .preview-bar {
    height: 4px;
    border-radius: 2px;
    width: 60%;
  }

  .theme-preview-light .preview-bar,
  .preview-light .preview-bar {
    background: #D14E35;
  }

  .theme-preview-dark .preview-bar,
  .preview-dark .preview-bar {
    background: #E85D42;
  }

  .preview-line {
    height: 3px;
    border-radius: 1.5px;
    width: 80%;
  }

  .preview-line.short {
    width: 50%;
  }

  .theme-preview-light .preview-line,
  .preview-light .preview-line {
    background: rgba(0, 0, 0, 0.08);
  }

  .theme-preview-dark .preview-line,
  .preview-dark .preview-line {
    background: rgba(255, 255, 255, 0.08);
  }

  .preview-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    margin-top: auto;
    align-self: flex-end;
  }

  .theme-preview-light .preview-dot {
    background: rgba(0, 0, 0, 0.12);
  }

  .theme-preview-dark .preview-dot {
    background: rgba(255, 255, 255, 0.12);
  }

  /* New tab toggle */
  .newtab-setting {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-4);
    padding: var(--space-4);
    border-radius: var(--radius-lg);
    background: var(--surface-overlay);
    width: 100%;
    max-width: 320px;
  }

  .setting-info {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .setting-label {
    font-family: var(--font-body);
    font-size: var(--text-base);
    font-weight: 500;
    color: var(--text-primary);
  }

  .toggle {
    position: relative;
    width: 52px;
    height: 28px;
    padding: 0;
    background: transparent;
    border: none;
    cursor: pointer;
    flex-shrink: 0;
  }

  .toggle:focus-visible {
    outline: 2px solid var(--accent-primary);
    outline-offset: 2px;
    border-radius: var(--radius-full);
  }

  .toggle-track {
    display: block;
    width: 100%;
    height: 100%;
    background: var(--surface-subtle);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-full);
    transition: all var(--duration-fast) var(--ease-out);
  }

  .toggle.active .toggle-track {
    background: var(--accent-primary);
    border-color: var(--accent-primary);
    box-shadow: 0 0 12px var(--accent-glow);
  }

  .toggle-thumb {
    position: absolute;
    top: 4px;
    left: 4px;
    width: 20px;
    height: 20px;
    background: white;
    border-radius: var(--radius-full);
    box-shadow: var(--shadow-sm);
    transition: transform var(--duration-fast) var(--ease-spring);
  }

  .toggle.active .toggle-thumb {
    transform: translateX(24px);
  }

  .hint-text {
    margin: var(--space-3) 0 0;
    font-family: var(--font-body);
    font-size: var(--text-xs);
    color: var(--text-tertiary);
  }

  /* Footer */
  .modal-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-4) var(--space-5);
    border-top: 1px solid var(--border-subtle);
  }

  .footer-left,
  .footer-right {
    flex: 1;
  }

  .footer-right {
    display: flex;
    justify-content: flex-end;
  }

  .progress-dots {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-2);
  }

  .dot {
    width: 8px;
    height: 8px;
    border-radius: var(--radius-full);
    background: var(--border-default);
    transition: all var(--duration-fast) var(--ease-out);
  }

  .dot.active {
    width: 24px;
    background: var(--accent-primary);
    border-radius: 4px;
  }

  .dot.completed {
    background: var(--accent-primary);
    opacity: 0.4;
  }

  .btn-back {
    padding: var(--space-2) var(--space-4);
    background: transparent;
    border: 1px solid var(--border-default);
    border-radius: var(--radius-lg);
    color: var(--text-secondary);
    font-family: var(--font-body);
    font-size: var(--text-sm);
    font-weight: 500;
    cursor: pointer;
    transition: all var(--duration-fast) var(--ease-out);
  }

  .btn-back:hover {
    background: var(--surface-overlay);
    border-color: var(--border-strong);
    color: var(--text-primary);
  }

  .btn-back:focus-visible {
    outline: 2px solid var(--accent-primary);
    outline-offset: 2px;
  }

  .btn-next {
    padding: var(--space-2) var(--space-5);
    background: var(--accent-primary);
    border: none;
    border-radius: var(--radius-lg);
    color: white;
    font-family: var(--font-body);
    font-size: var(--text-sm);
    font-weight: 600;
    cursor: pointer;
    transition: all var(--duration-fast) var(--ease-out);
  }

  .btn-next:hover {
    filter: brightness(1.1);
    transform: translateY(-1px);
  }

  .btn-next:active {
    transform: translateY(0);
  }

  .btn-next:focus-visible {
    outline: 2px solid var(--accent-primary);
    outline-offset: 2px;
  }

  /* Reduced motion */
  @media (prefers-reduced-motion: reduce) {
    .done-icon {
      animation: none;
    }
    .toggle-thumb {
      transition: transform var(--duration-fast) var(--ease-out);
    }
    .theme-option:hover .theme-preview {
      transform: none;
    }
    .btn-next:hover {
      transform: none;
    }
  }
</style>
