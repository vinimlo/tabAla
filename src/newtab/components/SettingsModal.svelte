<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { fade, scale } from 'svelte/transition';
  import { t } from '@lib/i18n';
  import { settingsStore } from '@/lib/stores/settings';
  import type { ThemePreference } from '@/lib/types';
  import {
    validateExportFile,
    previewImport,
    executeImport,
    exportData,
    downloadExport,
  } from '@/lib/storage';
  import ConfirmDialog from '@/shared/components/ConfirmDialog.svelte';
  import Toast from '@/shared/components/Toast.svelte';

  const dispatch = createEventDispatcher<{
    close: void;
  }>();

  $: settings = $settingsStore.settings;

  let fileInput: HTMLInputElement;
  let showConfirmDialog = false;
  let confirmMessage = '';
  let importPreviewData: { workspaces: number; collections: number; links: number; warnings: string[] } | null = null;
  let pendingFileContent: string | null = null;
  let toastMessage = '';
  let toastType: 'success' | 'error' = 'success';
  let showToast = false;

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

  async function toggleNewtab(): Promise<void> {
    await settingsStore.setNewtabEnabled(!settings.newtabEnabled);
  }

  async function handleThemeChange(theme: ThemePreference): Promise<void> {
    await settingsStore.setTheme(theme);
  }

  async function handleExport(): Promise<void> {
    try {
      const data = await exportData();
      downloadExport(data);
      showToastMessage(t('export_success'), 'success');
    } catch (error) {
      console.error('Export failed:', error);
      showToastMessage(t('import_error_parse'), 'error');
    }
  }

  function handleImportClick(): void {
    fileInput.click();
  }

  async function handleFileSelect(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) {
      return;
    }

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const content = e.target?.result as string;
        pendingFileContent = content;

        try {
          const parsed = JSON.parse(content);
          const validated = validateExportFile(parsed);
          const preview = await previewImport(validated);

          importPreviewData = preview;

          // Build confirmation message
          let msg = t('import_confirm_message')
            .replace('$1', String(preview.workspaces))
            .replace('$2', String(preview.collections))
            .replace('$3', String(preview.links));

          if (preview.warnings.length > 0) {
            msg += '\n\n' + preview.warnings.join('\n');
          }

          confirmMessage = msg;
          showConfirmDialog = true;
        } catch (error) {
          console.error('Validation failed:', error);
          showToastMessage(
            error instanceof Error ? error.message : t('import_error_invalid_file'),
            'error'
          );
          pendingFileContent = null;
        }
      };

      reader.readAsText(file);
    } catch (error) {
      console.error('File read failed:', error);
      showToastMessage(t('import_error_parse'), 'error');
    } finally {
      // Reset input so same file can be selected again
      input.value = '';
    }
  }

  async function handleConfirmImport(): Promise<void> {
    showConfirmDialog = false;

    if (!pendingFileContent) {
      return;
    }

    try {
      const parsed = JSON.parse(pendingFileContent);
      const validated = validateExportFile(parsed);
      const result = await executeImport(validated);

      if (result.success) {
        showToastMessage(t('import_success'), 'success');
      } else {
        showToastMessage(result.error || t('import_error_invalid_file'), 'error');
      }
    } catch (error) {
      console.error('Import failed:', error);
      showToastMessage(t('import_error_parse'), 'error');
    } finally {
      pendingFileContent = null;
      importPreviewData = null;
    }
  }

  function handleCancelImport(): void {
    showConfirmDialog = false;
    pendingFileContent = null;
    importPreviewData = null;
  }

  function showToastMessage(message: string, type: 'success' | 'error'): void {
    toastMessage = message;
    toastType = type;
    showToast = true;
  }

  function handleToastClose(): void {
    showToast = false;
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
  aria-labelledby="settings-title"
>
  <div
    class="modal"
    transition:scale={{ duration: 200, start: 0.95, opacity: 0 }}
  >
    <header class="modal-header">
      <h2 id="settings-title">{t('settings_title')}</h2>
      <button
        type="button"
        class="btn-close"
        on:click={handleClose}
        aria-label={t('common_close')}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <path d="M18 6L6 18M6 6l12 12"/>
        </svg>
      </button>
    </header>

    <div class="modal-content">
      <!-- Theme selector -->
      <div class="setting-section">
        <h3>{t('settings_theme_title')}</h3>
        <div class="theme-selector" role="radiogroup" aria-label={t('settings_theme_title')}>
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
      </div>

      <div class="setting-divider"></div>

      <div class="setting-item">
        <div class="setting-info">
          <span class="setting-label">{t('settings_use_as_newtab')}</span>
          <span class="setting-description">
            {t('settings_newtab_description')}
          </span>
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

      <div class="setting-divider"></div>

      <div class="setting-info-section">
        <h3>{t('settings_keyboard_shortcuts')}</h3>
        <div class="shortcuts-list">
          <div class="shortcut">
            <kbd>/</kbd> ou <kbd>Ctrl+K</kbd>
            <span>{t('settings_shortcut_search')}</span>
          </div>
          <div class="shortcut">
            <kbd>N</kbd>
            <span>{t('settings_shortcut_new_collection')}</span>
          </div>
          <div class="shortcut">
            <kbd>Esc</kbd>
            <span>{t('settings_shortcut_close_modal')}</span>
          </div>
        </div>
      </div>

      <div class="setting-divider"></div>

      <div class="setting-section">
        <h3>{t('settings_data_title')}</h3>

        <div class="setting-item">
          <div class="setting-info">
            <span class="setting-label">{t('settings_export_button')}</span>
            <span class="setting-description">
              {t('settings_export_description')}
            </span>
          </div>
          <button
            type="button"
            class="btn-action"
            on:click={handleExport}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
          </button>
        </div>

        <div class="setting-item">
          <div class="setting-info">
            <span class="setting-label">{t('settings_import_button')}</span>
            <span class="setting-description">
              {t('settings_import_description')}
            </span>
          </div>
          <button
            type="button"
            class="btn-action"
            on:click={handleImportClick}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/>
              <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
          </button>
        </div>

        <input
          type="file"
          accept=".json"
          bind:this={fileInput}
          on:change={handleFileSelect}
          style="display: none;"
        />
      </div>
    </div>
  </div>
</div>

{#if showConfirmDialog}
  <ConfirmDialog
    message={confirmMessage}
    confirmText={t('common_save')}
    cancelText={t('common_cancel')}
    on:confirm={handleConfirmImport}
    on:cancel={handleCancelImport}
  />
{/if}

{#if showToast}
  <Toast
    message={toastMessage}
    type={toastType}
    onClose={handleToastClose}
  />
{/if}

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
    max-width: 440px;
    box-shadow:
      var(--shadow-xl),
      0 0 40px rgba(0, 0, 0, 0.15);
    overflow: hidden;
    transform-origin: center center;
  }

  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-4) var(--space-5);
    border-bottom: 1px solid var(--border-subtle);
  }

  .modal-header h2 {
    margin: 0;
    font-family: var(--font-body);
    font-size: var(--text-md);
    font-weight: 600;
    color: var(--text-primary);
  }

  .btn-close {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    padding: 0;
    background: transparent;
    border: none;
    border-radius: var(--radius-md);
    color: var(--text-tertiary);
    cursor: pointer;
    transition: all var(--duration-fast) var(--ease-out);
  }

  .btn-close:hover {
    background: var(--surface-overlay);
    color: var(--text-primary);
  }

  .btn-close:focus-visible {
    outline: 2px solid var(--accent-primary);
    outline-offset: 2px;
  }

  .modal-content {
    padding: var(--space-5);
  }

  /* Theme selector */
  .setting-section h3 {
    margin: 0 0 var(--space-3);
    font-family: var(--font-body);
    font-size: var(--text-xs);
    font-weight: 600;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  .theme-selector {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: var(--space-3);
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

  /* Theme preview cards */
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

  /* Settings items */
  .setting-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-4);
    padding: var(--space-3);
    border-radius: var(--radius-lg);
    transition: background-color var(--duration-fast) var(--ease-out);
  }

  .setting-item:hover {
    background: var(--surface-overlay);
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

  .setting-description {
    font-family: var(--font-body);
    font-size: var(--text-sm);
    color: var(--text-tertiary);
    line-height: 1.4;
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

  .setting-divider {
    height: 1px;
    background: var(--border-subtle);
    margin: var(--space-5) 0;
  }

  .setting-info-section h3 {
    margin: 0 0 var(--space-4);
    font-family: var(--font-body);
    font-size: var(--text-xs);
    font-weight: 600;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  .shortcuts-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  .shortcut {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    font-family: var(--font-body);
    font-size: var(--text-sm);
    color: var(--text-secondary);
  }

  .shortcut span {
    margin-left: auto;
    color: var(--text-tertiary);
  }

  kbd {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 28px;
    padding: 4px 8px;
    background: var(--surface-subtle);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-sm);
    font-family: var(--font-mono);
    font-size: var(--text-xs);
    font-weight: 500;
    color: var(--text-primary);
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
  }

  .btn-action {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    padding: 0;
    background: var(--surface-overlay);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-lg);
    color: var(--text-secondary);
    cursor: pointer;
    transition: all var(--duration-fast) var(--ease-out);
    flex-shrink: 0;
  }

  .btn-action:hover {
    background: var(--surface-subtle);
    border-color: var(--border-strong);
    color: var(--text-primary);
    transform: translateY(-1px);
  }

  .btn-action:active {
    transform: translateY(0);
  }

  .btn-action:focus-visible {
    outline: 2px solid var(--accent-primary);
    outline-offset: 2px;
  }

  /* Reduced motion */
  @media (prefers-reduced-motion: reduce) {
    .toggle-thumb {
      transition: transform var(--duration-fast) var(--ease-out);
    }
    .theme-option:hover .theme-preview {
      transform: none;
    }
    .btn-action:hover {
      transform: none;
    }
  }
</style>
