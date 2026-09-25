<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { t } from '@lib/i18n';
  import type { Link } from '@/lib/types';
  import { extractDomain } from '@/lib/tabs';
  import { isSnoozed } from '@/lib/recommend/state';
  import { nextMonday, shortDate, tomorrow } from '@/lib/recommend/dates';

  export let link: Link;
  /** Counts as reference, by itself or through its collection. */
  export let reference = false;
  /** Its collection is a reference collection: unmarking then means `reference: false`. */
  export let collectionReference = false;

  const dispatch = createEventDispatcher<{
    open: Link;
    openInNewTab: Link;
    remove: { id: string; title: string };
    complete: Link;
    snooze: { link: Link; until: number };
    reference: { link: Link; value: boolean | null };
  }>();

  let showMenu = false;
  let menuRef: HTMLDivElement;

  function handleOpen(): void {
    dispatch('open', link);
  }

  function handleOpenInNewTab(event: MouseEvent): void {
    event.stopPropagation();
    dispatch('openInNewTab', link);
  }

  function handleRemove(event: MouseEvent): void {
    event.stopPropagation();
    dispatch('remove', { id: link.id, title: link.title });
  }

  function handleKeydown(event: KeyboardEvent): void {
    // Keys on the action buttons belong to those buttons.
    if (event.target !== event.currentTarget) {
      return;
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleOpen();
    }
  }

  function handleComplete(event: MouseEvent): void {
    event.stopPropagation();
    dispatch('complete', link);
  }

  function toggleMenu(event: MouseEvent): void {
    event.stopPropagation();
    showMenu = !showMenu;
  }

  function snooze(until: number): void {
    showMenu = false;
    dispatch('snooze', { link, until });
  }

  function toggleReference(): void {
    showMenu = false;
    dispatch('reference', { link, value: reference ? (collectionReference ? false : null) : true });
  }

  function handleWindowClick(event: MouseEvent): void {
    if (showMenu && menuRef !== undefined && !menuRef.contains(event.target as Node)) {
      showMenu = false;
    }
  }

  $: domain = extractDomain(link.url).replace('www.', '');
  $: snoozedUntil = isSnoozed(link, Date.now()) ? link.snoozedUntil : undefined;
</script>

<svelte:window on:click={handleWindowClick} />

<div
  class="link-card"
  data-link-id={link.id}
  on:click={handleOpen}
  on:keydown={handleKeydown}
  role="button"
  tabindex="0"
>
  <div class="link-favicon">
    {#if link.favicon}
      <img src={link.favicon} alt="" width="22" height="22" loading="lazy" />
    {:else}
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <circle cx="12" cy="12" r="10"/>
        <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
      </svg>
    {/if}
  </div>

  <div class="link-content">
    <span class="link-title" title={link.title}>{link.title}</span>
    <span class="link-domain">{domain}</span>
    {#if reference || snoozedUntil !== undefined}
      <span class="link-state">
        {#if reference}
          <span class="state-badge">{t('linkcard_reference_badge')}</span>
        {/if}
        {#if snoozedUntil !== undefined}
          <span class="state-badge">{t('linkcard_snoozed_until', shortDate(snoozedUntil))}</span>
        {/if}
      </span>
    {/if}
  </div>

  <div class="link-actions">
    <button
      type="button"
      class="btn-action btn-complete"
      on:click={handleComplete}
      aria-label={t('progress_complete')}
      title={t('linkcard_complete_title')}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="20 6 9 17 4 12"/>
      </svg>
    </button>
    <button
      type="button"
      class="btn-action btn-open"
      on:click={handleOpenInNewTab}
      aria-label={t('linkcard_open')}
      title={t('linkcard_open_new_tab')}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
        <polyline points="15 3 21 3 21 9"/>
        <line x1="10" y1="14" x2="21" y2="3"/>
      </svg>
    </button>
    <div class="card-menu" bind:this={menuRef}>
      <button
        type="button"
        class="btn-action btn-more"
        on:click={toggleMenu}
        aria-label={t('progress_more')}
        aria-expanded={showMenu}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>
        </svg>
      </button>
      {#if showMenu}
        <div class="card-menu-dropdown" role="menu">
          <button type="button" role="menuitem" on:click|stopPropagation={() => snooze(tomorrow(Date.now()))}>
            {t('progress_snooze_tomorrow')}
          </button>
          <button type="button" role="menuitem" on:click|stopPropagation={() => snooze(nextMonday(Date.now()))}>
            {t('progress_snooze_next_week')}
          </button>
          <button type="button" role="menuitem" on:click|stopPropagation={toggleReference}>
            {reference ? t('progress_unmark_reference') : t('progress_mark_reference')}
          </button>
        </div>
      {/if}
    </div>
    <button
      type="button"
      class="btn-action btn-remove"
      on:click={handleRemove}
      aria-label={t('linkcard_remove')}
      title={t('linkcard_remove_title')}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
        <path d="M18 6L6 18M6 6l12 12"/>
      </svg>
    </button>
  </div>
</div>

<style>
  .link-card:global(.revealed) {
    border-color: var(--accent-primary);
    box-shadow: 0 0 0 2px var(--accent-soft);
  }

  .link-card {
    position: relative;
    display: flex;
    align-items: flex-start;
    gap: var(--space-3);
    padding: var(--space-3) var(--space-4);
    background: var(--surface-elevated);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-lg);
    cursor: pointer;
    transition: all var(--duration-fast) var(--ease-out);
    user-select: none;
    min-height: 72px;
  }

  .link-card:hover {
    background: var(--surface-overlay);
    border-color: var(--border-default);
    transform: translateY(-2px);
    box-shadow:
      var(--shadow-card-hover),
      0 0 0 1px var(--accent-soft);
  }

  .link-card:focus {
    outline: none;
  }

  .link-card:focus-visible {
    outline: 2px solid var(--accent-primary);
    outline-offset: 2px;
  }

  .link-favicon {
    flex-shrink: 0;
    width: 38px;
    height: 38px;
    margin-top: 2px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--surface-overlay);
    border-radius: var(--radius-md);
    border: 1px solid var(--border-default);
    color: var(--text-tertiary);
  }

  .link-favicon img {
    width: 22px;
    height: 22px;
    border-radius: 4px;
    object-fit: contain;
  }

  .link-favicon svg {
    width: 18px;
    height: 18px;
  }

  .link-content {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .link-title {
    font-family: var(--font-body);
    font-size: var(--text-sm);
    font-weight: 500;
    color: var(--text-primary);
    line-height: 1.4;
    letter-spacing: -0.01em;

    /* Multi-linha com line-clamp */
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .link-domain {
    font-family: var(--font-mono);
    font-size: var(--text-xs);
    color: var(--text-tertiary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    letter-spacing: -0.02em;
    margin-top: 2px;
  }

  .link-actions {
    position: absolute;
    right: var(--space-3);
    top: 50%;
    transform: translateY(-50%);
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-1) var(--space-2);
    background: var(--surface-elevated);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    border-radius: var(--radius-md);
    border: 1px solid var(--border-default);
    opacity: 0;
    transition: opacity var(--duration-fast) var(--ease-out);
  }

  .link-card:hover .link-actions,
  .link-card:focus-within .link-actions {
    opacity: 1;
  }

  .btn-action {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    padding: 0;
    background: transparent;
    border: none;
    border-radius: var(--radius-md);
    color: var(--text-tertiary);
    cursor: pointer;
    transition: all var(--duration-fast) var(--ease-out);
  }

  .btn-action svg {
    width: 16px;
    height: 16px;
  }

  .btn-action:hover {
    background: var(--border-default);
    color: var(--text-primary);
  }

  .btn-action:focus {
    outline: none;
  }

  .btn-action:focus-visible {
    outline: 2px solid var(--accent-primary);
    outline-offset: 2px;
  }

  .btn-remove:hover {
    background: var(--semantic-error-soft);
    color: var(--semantic-error);
  }

  .link-state {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-1);
    margin-top: var(--space-1);
  }

  .state-badge {
    font-size: var(--text-xs);
    color: var(--text-tertiary);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-sm);
    padding: 0 var(--space-1);
  }

  .btn-complete:hover {
    background: var(--accent-soft);
    color: var(--accent-primary);
  }

  .card-menu {
    position: relative;
  }

  .card-menu-dropdown {
    position: absolute;
    top: 100%;
    right: 0;
    z-index: 20;
    display: flex;
    flex-direction: column;
    min-width: 220px;
    padding: var(--space-1);
    background: var(--surface-elevated);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-md);
  }

  .card-menu-dropdown button {
    padding: var(--space-2) var(--space-3);
    border: none;
    background: transparent;
    color: var(--text-primary);
    font-family: var(--font-body);
    font-size: var(--text-sm);
    text-align: left;
    border-radius: var(--radius-sm);
    cursor: pointer;
  }

  .card-menu-dropdown button:hover,
  .card-menu-dropdown button:focus-visible {
    background: var(--surface-overlay);
  }
</style>
