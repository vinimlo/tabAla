<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  export let searchQuery: string = '';

  const dispatch = createEventDispatcher<{
    search: string;
    openSettings: void;
    newCollection: void;
  }>();

  function handleSearchInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    dispatch('search', target.value);
  }

  function clearSearch(): void {
    dispatch('search', '');
  }
</script>

<header class="quick-actions-bar">
  <div class="search-container">
    <svg class="search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="11" cy="11" r="8"/>
      <path d="M21 21l-4.35-4.35"/>
    </svg>
    <input
      type="text"
      class="search-input"
      placeholder="Buscar links..."
      value={searchQuery}
      on:input={handleSearchInput}
      data-search-input
    />
    {#if searchQuery}
      <button class="clear-search" on:click={clearSearch} type="button" aria-label="Limpar busca">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <path d="M18 6L6 18M6 6l12 12"/>
        </svg>
      </button>
    {/if}
  </div>

  <div class="actions">
    <button
      type="button"
      class="btn-action btn-new-collection"
      on:click={() => dispatch('newCollection')}
      aria-label="Nova Colecao"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="12" y1="5" x2="12" y2="19"/>
        <line x1="5" y1="12" x2="19" y2="12"/>
      </svg>
      <span>Nova Colecao</span>
    </button>

    <button
      type="button"
      class="btn-action btn-settings"
      on:click={() => dispatch('openSettings')}
      aria-label="Configuracoes"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="3"/>
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
      </svg>
    </button>
  </div>
</header>

<style>
  .quick-actions-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-4);
    padding: var(--space-4) var(--space-5);
    background: var(--surface-elevated);
    border-bottom: 1px solid var(--border-subtle);
  }

  .search-container {
    position: relative;
    flex: 1;
    max-width: 480px;
  }

  .search-icon {
    position: absolute;
    left: var(--space-4);
    top: 50%;
    transform: translateY(-50%);
    color: var(--text-tertiary);
    pointer-events: none;
    transition: all var(--duration-fast) var(--ease-out);
  }

  .search-input {
    width: 100%;
    height: 48px;
    padding: 0 var(--space-4);
    padding-left: calc(var(--space-4) + 20px + var(--space-2));
    background: var(--surface-overlay);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-lg);
    color: var(--text-primary);
    font-family: var(--font-body);
    font-size: var(--text-sm);
    transition: all var(--duration-fast) var(--ease-out);
  }

  .search-input::placeholder {
    color: var(--text-tertiary);
  }

  .search-input:focus {
    outline: none;
    border-color: var(--accent-primary);
    background: var(--surface-base);
    box-shadow: 0 0 0 3px var(--accent-soft);
  }

  .search-container:focus-within .search-icon {
    color: var(--accent-primary);
    transform: translateY(-50%) scale(1.1);
  }

  .clear-search {
    position: absolute;
    right: var(--space-2);
    top: 50%;
    transform: translateY(-50%);
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    padding: 0;
    background: transparent;
    border: none;
    border-radius: var(--radius-full);
    color: var(--text-tertiary);
    cursor: pointer;
    transition: all var(--duration-fast) var(--ease-out);
  }

  .clear-search:hover {
    color: var(--text-primary);
    background: var(--border-default);
  }

  .clear-search:focus-visible {
    outline: 2px solid var(--accent-primary);
    outline-offset: 2px;
  }

  .actions {
    display: flex;
    align-items: center;
    gap: var(--space-3);
  }

  .btn-action {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-2) var(--space-4);
    background: var(--surface-overlay);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-lg);
    color: var(--text-secondary);
    font-family: var(--font-body);
    font-size: var(--text-sm);
    font-weight: 500;
    cursor: pointer;
    transition: all var(--duration-fast) var(--ease-out);
  }

  .btn-action:hover {
    background: var(--surface-subtle);
    color: var(--text-primary);
    border-color: var(--border-strong);
  }

  .btn-action:focus {
    outline: none;
  }

  .btn-action:focus-visible {
    outline: 2px solid var(--accent-primary);
    outline-offset: 2px;
  }

  .btn-new-collection {
    background: var(--accent-soft);
    border-color: transparent;
    color: var(--accent-primary);
  }

  .btn-new-collection:hover {
    background: var(--accent-primary);
    color: white;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px var(--accent-glow);
  }

  .btn-new-collection:active {
    transform: translateY(0);
  }

  .btn-settings {
    padding: var(--space-2);
    width: 40px;
    height: 40px;
    justify-content: center;
  }

  .btn-settings svg {
    transition: transform var(--duration-normal) var(--ease-out);
  }

  .btn-settings:hover svg {
    transform: rotate(45deg);
  }

  /* Reduced motion */
  @media (prefers-reduced-motion: reduce) {
    .btn-new-collection:hover,
    .btn-settings:hover svg {
      transform: none;
    }
    .search-container:focus-within .search-icon {
      transform: translateY(-50%);
    }
  }
</style>
