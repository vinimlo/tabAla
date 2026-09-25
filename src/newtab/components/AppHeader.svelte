<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { plural, t } from '@/lib/i18n';
  import Button from '@/shared/components/ui/Button.svelte';
  import Icon from '@/shared/components/ui/Icon.svelte';
  import Kbd from '@/shared/components/ui/Kbd.svelte';
  import { modLabel } from '@/shared/platform';
  import type { PendingSummary } from '../header';

  /** Workspace name; null in Focus, where the header shows only the search. */
  export let title: string | null;
  export let summary: PendingSummary | null = null;

  const dispatch = createEventDispatcher<{ openSearch: void; newCollection: void }>();

  $: summaryText = summary === null
    ? ''
    : summary.links === 0
      ? t('header_nothing_pending')
      : `${plural(summary.links, 'header_pending_links_one', 'header_pending_links_many')} ${plural(summary.collections, 'header_pending_in_one', 'header_pending_in_many')}`;
</script>

<header class="app-header" class:compact={title === null}>
  {#if title !== null}
    <div class="where">
      <h1>{title}</h1>
      {#if summaryText !== ''}
        <p>{summaryText}</p>
      {/if}
    </div>
  {/if}

  <button type="button" class="search-trigger" on:click={() => dispatch('openSearch')}>
    <Icon name="search" size={17} />
    <span class="placeholder">{t('search_open_placeholder')}</span>
    <span class="keys" aria-hidden="true"><Kbd>{modLabel()}</Kbd><Kbd>K</Kbd></span>
  </button>

  <div class="actions">
    <slot name="session" />
    {#if title !== null}
      <Button variant="quiet" icon="plus" on:click={() => dispatch('newCollection')}>{t('newtab_new_collection')}</Button>
    {/if}
  </div>
</header>

<style>
  .app-header {
    display: grid;
    grid-template-columns: minmax(120px, 1fr) minmax(220px, 520px) minmax(max-content, 1fr);
    align-items: center;
    gap: var(--space-4);
    padding: 18px 32px 0;
    min-height: 62px;
  }

  .compact {
    grid-template-columns: minmax(220px, 520px) minmax(0, 1fr);
  }

  .where {
    min-width: 0;
  }

  .where h1,
  .where p {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .where h1 {
    margin: 0;
    font: 650 var(--text-xl) / 1 var(--font-body);
    letter-spacing: -0.015em;
    color: var(--text-primary);
  }

  .where p {
    margin: 6px 0 0;
    font-size: var(--text-xs);
    color: var(--text-tertiary);
  }

  .search-trigger {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    height: var(--control-lg);
    padding: 0 8px 0 14px;
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-md);
    background: var(--surface-elevated);
    box-shadow: var(--shadow-lift);
    color: var(--text-tertiary);
    font: 400 var(--text-base) / 1 var(--font-body);
    cursor: pointer;
    transition: border-color var(--duration-fast) var(--ease-out);
  }

  .search-trigger:hover {
    border-color: var(--border-strong);
  }

  .placeholder {
    flex: 1;
    min-width: 0;
    text-align: left;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .keys {
    display: flex;
    gap: 3px;
  }

  .actions {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: var(--space-2);
  }
</style>
