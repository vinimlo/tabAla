<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { fade, scale } from 'svelte/transition';
  import { settingsStore } from '@/lib/stores/settings';

  const dispatch = createEventDispatcher<{
    close: void;
  }>();

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
  aria-labelledby="settings-title"
>
  <div
    class="modal"
    transition:scale={{ duration: 200, start: 0.95, opacity: 0 }}
  >
    <header class="modal-header">
      <h2 id="settings-title">Configuracoes</h2>
      <button
        type="button"
        class="btn-close"
        on:click={handleClose}
        aria-label="Fechar"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <path d="M18 6L6 18M6 6l12 12"/>
        </svg>
      </button>
    </header>

    <div class="modal-content">
      <div class="setting-item">
        <div class="setting-info">
          <span class="setting-label">Usar como nova aba</span>
          <span class="setting-description">
            Substitui a pagina de nova aba do Chrome pelo dashboard do TabAla
          </span>
        </div>
        <button
          type="button"
          class="toggle"
          class:active={settings.newtabEnabled}
          on:click={toggleNewtab}
          aria-pressed={settings.newtabEnabled}
          aria-label="Ativar como nova aba"
        >
          <span class="toggle-track">
            <span class="toggle-thumb"></span>
          </span>
        </button>
      </div>

      <div class="setting-divider"></div>

      <div class="setting-info-section">
        <h3>Atalhos de teclado</h3>
        <div class="shortcuts-list">
          <div class="shortcut">
            <kbd>/</kbd> ou <kbd>Ctrl+K</kbd>
            <span>Buscar</span>
          </div>
          <div class="shortcut">
            <kbd>N</kbd>
            <span>Nova colecao</span>
          </div>
          <div class="shortcut">
            <kbd>Esc</kbd>
            <span>Fechar modal</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>

<style>
  .backdrop {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }

  .modal {
    background: var(--bg-secondary);
    border: 1px solid var(--border);
    border-radius: var(--radius-xl);
    width: 90%;
    max-width: 420px;
    box-shadow:
      0 8px 32px rgba(0, 0, 0, 0.4),
      0 0 0 1px rgba(255, 255, 255, 0.03);
    overflow: hidden;
  }

  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-4) var(--space-5);
    border-bottom: 1px solid var(--border);
  }

  .modal-header h2 {
    margin: 0;
    font-size: 1rem;
    font-weight: 600;
    color: var(--text-primary);
  }

  .btn-close {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    padding: 0;
    background: transparent;
    border: none;
    border-radius: var(--radius-sm);
    color: var(--text-tertiary);
    cursor: pointer;
    transition: all var(--duration-fast) var(--ease-out);
  }

  .btn-close:hover {
    background: var(--bg-tertiary);
    color: var(--text-primary);
  }

  .modal-content {
    padding: var(--space-5);
  }

  .setting-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-4);
  }

  .setting-info {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .setting-label {
    font-size: 0.9375rem;
    font-weight: 500;
    color: var(--text-primary);
  }

  .setting-description {
    font-size: 0.8125rem;
    color: var(--text-tertiary);
  }

  .toggle {
    position: relative;
    width: 48px;
    height: 28px;
    padding: 0;
    background: transparent;
    border: none;
    cursor: pointer;
    flex-shrink: 0;
  }

  .toggle-track {
    display: block;
    width: 100%;
    height: 100%;
    background: var(--bg-tertiary);
    border: 1px solid var(--border);
    border-radius: var(--radius-full);
    transition: all var(--duration-fast) var(--ease-out);
  }

  .toggle.active .toggle-track {
    background: var(--accent);
    border-color: var(--accent);
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
    transition: transform var(--duration-fast) var(--ease-out);
  }

  .toggle.active .toggle-thumb {
    transform: translateX(20px);
  }

  .setting-divider {
    height: 1px;
    background: var(--border);
    margin: var(--space-5) 0;
  }

  .setting-info-section h3 {
    margin: 0 0 var(--space-3);
    font-size: 0.8125rem;
    font-weight: 600;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .shortcuts-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .shortcut {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    font-size: 0.8125rem;
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
    min-width: 24px;
    padding: 2px 6px;
    background: var(--bg-tertiary);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    font-family: inherit;
    font-size: 0.6875rem;
    font-weight: 500;
    color: var(--text-primary);
  }
</style>
