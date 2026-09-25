<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { t } from '@lib/i18n';
  import type { Link } from '@/lib/types';
  import { extractDomain } from '@/lib/tabs';
  import { isSnoozed } from '@/lib/recommend/state';
  import { nextMonday, tomorrow } from '@/lib/recommend/dates';
  import Icon from '@/shared/components/ui/Icon.svelte';
  import IconButton from '@/shared/components/ui/IconButton.svelte';
  import LinkTile from '@/shared/components/ui/LinkTile.svelte';
  import Menu from '@/shared/components/ui/Menu.svelte';
  import MenuItem from '@/shared/components/ui/MenuItem.svelte';
  import { metaView, type CardMeta } from '../card-meta';

  export let link: Link;
  /** Counts as reference, by itself or through its collection. */
  export let reference = false;
  /** Its collection is a reference collection: unmarking then means `reference: false`. */
  export let collectionReference = false;
  /** The line under the title; without it, only reference and snooze show. */
  export let meta: CardMeta | null = null;

  const dispatch = createEventDispatcher<{
    open: Link;
    openInNewTab: Link;
    remove: { id: string; title: string };
    complete: Link;
    snooze: { link: Link; until: number };
    reference: { link: Link; value: boolean | null };
  }>();

  let showMenu = false;
  let menuAnchor: HTMLDivElement;

  function handleOpen(): void {
    dispatch('open', link);
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

  function handleOpenInNewTab(event: MouseEvent): void {
    event.stopPropagation();
    dispatch('openInNewTab', link);
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

  function remove(): void {
    showMenu = false;
    dispatch('remove', { id: link.id, title: link.title });
  }

  $: domain = extractDomain(link.url).replace('www.', '');
  $: fallback = reference
    ? ({ type: 'reference' } as const)
    : isSnoozed(link, Date.now()) && link.snoozedUntil !== undefined
      ? ({ type: 'snoozed', until: link.snoozedUntil } as const)
      : null;
  $: shown = meta ?? fallback;
  $: view = shown === null ? null : metaView(shown);
</script>

<div
  class="link-card"
  class:dim={shown?.type === 'snoozed'}
  data-link-id={link.id}
  on:click={handleOpen}
  on:keydown={handleKeydown}
  role="button"
  tabindex="0"
>
  <LinkTile {link} size={32} />

  <div class="link-content">
    <span class="link-title" title={link.title}>{link.title || link.url}</span>
    <span class="link-meta">
      {#if view !== null}
        <span class="meta-state {view.tone}"><Icon name={view.icon} size={12} />{view.text}</span>
      {/if}
      <span class="link-domain">{domain}</span>
    </span>
  </div>

  <div class="link-actions">
    <IconButton icon="check" size="sm" tone="success" label={t('progress_complete')} on:click={handleComplete} />
    <IconButton icon="external" size="sm" label={t('linkcard_open')} on:click={handleOpenInNewTab} />
    <div class="card-menu" bind:this={menuAnchor}>
      <IconButton icon="more" size="sm" label={t('progress_more')} expanded={showMenu} on:click={toggleMenu} />
      {#if showMenu}
        <Menu label={t('progress_more')} align="end" anchor={menuAnchor} on:close={() => (showMenu = false)}>
          <MenuItem icon="clock" on:select={() => snooze(tomorrow(Date.now()))}>{t('progress_snooze_tomorrow')}</MenuItem>
          <MenuItem icon="clock" on:select={() => snooze(nextMonday(Date.now()))}>{t('progress_snooze_next_week')}</MenuItem>
          <MenuItem icon="reference" on:select={toggleReference}>
            {reference ? t('progress_unmark_reference') : t('progress_mark_reference')}
          </MenuItem>
          <MenuItem icon="trash" danger on:select={remove}>{t('linkcard_remove')}</MenuItem>
        </Menu>
      {/if}
    </div>
  </div>
</div>

<style>
  .link-card:global(.revealed) {
    border-color: var(--accent-primary);
    box-shadow: 0 0 0 2px var(--accent-soft);
  }

  .link-card {
    position: relative;
    display: grid;
    grid-template-columns: 32px minmax(0, 1fr);
    gap: var(--space-3);
    padding: 11px 12px;
    background: var(--surface-elevated);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-lift);
    cursor: pointer;
    user-select: none;
    transition: border-color var(--duration-fast) var(--ease-out);
  }

  .link-card:hover {
    border-color: var(--border-strong);
  }

  .link-card:focus {
    outline: none;
  }

  .link-card:focus-visible {
    outline: 2px solid var(--accent-primary);
    outline-offset: 2px;
  }

  .dim {
    opacity: 0.6;
  }

  .link-content {
    min-width: 0;
    display: flex;
    flex-direction: column;
  }

  .link-title {
    font: 500 var(--text-base) / 1.35 var(--font-body);
    color: var(--text-primary);
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    overflow-wrap: anywhere;
  }

  .link-meta {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    margin-top: 4px;
    font-size: var(--text-xs);
    color: var(--text-tertiary);
    white-space: nowrap;
    overflow: hidden;
  }

  .meta-state {
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }

  .meta-state.warning {
    color: var(--semantic-warning);
  }

  .meta-state.progress {
    color: var(--accent-ink);
  }

  .link-domain {
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .link-actions {
    position: absolute;
    top: 8px;
    right: 8px;
    display: flex;
    gap: 2px;
    padding: 2px;
    border: 1px solid var(--border-default);
    border-radius: 10px;
    background: var(--surface-overlay);
    box-shadow: var(--shadow-lift);
    opacity: 0;
    transition: opacity var(--duration-fast) var(--ease-out);
  }

  .link-card:hover .link-actions,
  .link-card:focus-within .link-actions {
    opacity: 1;
  }

  .card-menu {
    position: relative;
  }
</style>
