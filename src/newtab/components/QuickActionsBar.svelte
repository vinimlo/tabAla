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
    background: var(--bg-secondary);
    border-bottom: 1px solid var(--border);
  }

  .search-container {
    position: relative;
    flex: 1;
    max-width: 480px;
  }

  .search-icon {
    position: absolute;
    left: var(--space-3);
    top: 50%;
    transform: translateY(-50%);
    color: var(--text-tertiary);
    pointer-events: none;
  }

  .search-input {
    width: 100%;
    padding: var(--space-3) var(--space-4);
    padding-left: calc(var(--space-3) + 18px + var(--space-2));
    background: var(--bg-tertiary);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    color: var(--text-primary);
    font-family: inherit;
    font-size: 0.875rem;
    transition: all var(--duration-fast) var(--ease-out);
  }

  .search-input::placeholder {
    color: var(--text-tertiary);
  }

  .search-input:focus {
    outline: none;
    border-color: var(--accent);
    background: var(--bg-primary);
    box-shadow: 0 0 0 3px var(--accent-soft);
  }

  .clear-search {
    position: absolute;
    right: var(--space-2);
    top: 50%;
    transform: translateY(-50%);
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
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
    background: var(--border);
  }

  .actions {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }

  .btn-action {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-2) var(--space-3);
    background: var(--bg-tertiary);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    color: var(--text-secondary);
    font-family: inherit;
    font-size: 0.8125rem;
    font-weight: 500;
    cursor: pointer;
    transition: all var(--duration-fast) var(--ease-out);
  }

  .btn-action:hover {
    background: var(--bg-elevated);
    color: var(--text-primary);
    border-color: var(--border-hover);
  }

  .btn-action:focus {
    outline: none;
  }

  .btn-action:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }

  .btn-new-collection {
    background: var(--accent-soft);
    border-color: transparent;
    color: var(--accent);
  }

  .btn-new-collection:hover {
    background: var(--accent);
    color: white;
  }

  .btn-settings {
    padding: var(--space-2);
  }

  .btn-settings svg {
    transition: transform var(--duration-normal) var(--ease-out);
  }

  .btn-settings:hover svg {
    transform: rotate(45deg);
  }
</style>
