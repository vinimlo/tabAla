<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { t } from '@lib/i18n';

  const dispatch = createEventDispatcher<{
    openSearch: void;
    openSettings: void;
    newCollection: void;
  }>();
</script>

<header class="quick-actions-bar">
  <button type="button" class="search-container search-trigger" on:click={() => dispatch('openSearch')}>
    <svg class="search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="11" cy="11" r="8"/>
      <path d="M21 21l-4.35-4.35"/>
    </svg>
    <span class="search-placeholder">{t('search_open_placeholder')}</span>
    <kbd class="search-kbd">⌘K</kbd>
  </button>

  <div class="actions">
    <button
      type="button"
      class="btn-action btn-new-collection"
      on:click={() => dispatch('newCollection')}
      aria-label={t('newtab_new_collection')}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="12" y1="5" x2="12" y2="19"/>
        <line x1="5" y1="12" x2="19" y2="12"/>
      </svg>
      <span>{t('newtab_new_collection')}</span>
    </button>

    <button
      type="button"
      class="btn-action btn-settings"
      on:click={() => dispatch('openSettings')}
      aria-label={t('popup_settings')}
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

  .search-trigger {
    width: 100%;
    height: 48px;
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: 0 var(--space-4);
    padding-left: calc(var(--space-4) + 20px + var(--space-2));
    background: var(--surface-overlay);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-lg);
    color: var(--text-tertiary);
    font-family: var(--font-body);
    font-size: var(--text-sm);
    text-align: left;
    cursor: text;
    transition: all var(--duration-fast) var(--ease-out);
  }

  .search-trigger:hover,
  .search-trigger:focus-visible {
    outline: none;
    border-color: var(--accent-primary);
    box-shadow: 0 0 0 3px var(--accent-soft);
  }

  .search-placeholder {
    flex: 1;
  }

  .search-kbd {
    padding: 2px 6px;
    border: 1px solid var(--border-default);
    border-radius: var(--radius-sm);
    font-family: var(--font-body);
    font-size: var(--text-xs);
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
