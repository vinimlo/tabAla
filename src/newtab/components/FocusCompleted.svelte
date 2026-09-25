<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { t } from '@/lib/i18n';
  import type { Link } from '@/lib/types';
  import { shortDate } from '@/lib/recommend/dates';
  import { completedHistory } from '@/lib/recommend/progress';

  export let links: Link[];

  const dispatch = createEventDispatcher<{
    restore: Link;
    open: { link: Link; newTab: boolean };
  }>();

  $: history = completedHistory(links);
</script>

<section id="focus-completed" class="focus-section" aria-labelledby="focus-completed-title">
  <h2 id="focus-completed-title">{t('focus_completed_title')}</h2>
  {#if history.length === 0}
    <p class="focus-empty">{t('focus_completed_empty')}</p>
  {:else}
    {#each history as group (group.week)}
      <h3 class="completed-week">{t('focus_week_of', shortDate(group.start))}</h3>
      <ul class="completed-list">
        {#each group.links as link (link.id)}
          <li class="completed-row" data-link-id={link.id}>
            <button type="button" class="completed-title" on:click={() => dispatch('open', { link, newTab: true })}>
              {link.title || link.url}
            </button>
            <span class="completed-date">{shortDate(link.completedAt ?? 0)}</span>
            <button type="button" class="completed-undo" on:click={() => dispatch('restore', link)}>{t('progress_undo')}</button>
          </li>
        {/each}
      </ul>
    {/each}
  {/if}
</section>

<style>
  .completed-week {
    margin: var(--space-3) 0 var(--space-1);
    font-size: var(--text-xs);
    font-weight: 600;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .completed-list {
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .completed-row {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-1) var(--space-2);
    border-radius: var(--radius-md);
    font-size: var(--text-sm);
  }

  .completed-row:global(.revealed) {
    background: var(--accent-soft);
    box-shadow: 0 0 0 1px var(--accent-primary);
  }

  .completed-title {
    flex: 1;
    min-width: 0;
    padding: 0;
    border: none;
    background: transparent;
    color: var(--text-primary);
    font-family: var(--font-body);
    font-size: var(--text-sm);
    text-align: left;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    cursor: pointer;
  }

  .completed-date {
    font-size: var(--text-xs);
    color: var(--text-tertiary);
  }

  .completed-undo {
    padding: 0 var(--space-2);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-sm);
    background: transparent;
    color: var(--text-secondary);
    font-family: var(--font-body);
    font-size: var(--text-xs);
    cursor: pointer;
  }
</style>
