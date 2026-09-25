<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { plural, t } from '@/lib/i18n';
  import type { Workspace } from '@/lib/types';
  import type { Queue } from '@/lib/recommend/engine';
  import NextUpCard from './NextUpCard.svelte';
  import { collectionPath } from '../next-up-labels';

  export let queue: Queue;
  export let workspaces: Workspace[] = [];
  export let collapsed = false;

  const dispatch = createEventDispatcher<{
    toggleCollapsed: void;
    openTriage: void;
    openFocus: void;
  }>();
</script>

<section class="nextup" aria-label={t('nextup_title')}>
  <header class="nextup-header">
    <button
      type="button"
      class="nextup-toggle"
      aria-expanded={!collapsed}
      on:click={() => dispatch('toggleCollapsed')}
    >{t('nextup_title')}</button>
    <span class="nextup-spacer"></span>
    {#if queue.triage.length > 0}
      <button type="button" class="nextup-link" on:click={() => dispatch('openTriage')}>
        {plural(queue.triage.length, 'nextup_triage_one', 'nextup_triage_many')}
      </button>
    {/if}
    <button type="button" class="nextup-link" on:click={() => dispatch('openFocus')}>{t('focus_title')}</button>
  </header>

  {#if !collapsed}
    {#if queue.slots.length === 0}
      <p class="nextup-empty">{t('nextup_empty')}</p>
    {:else}
      <div class="nextup-cards">
        {#each queue.slots as rec (rec.link.id)}
          <NextUpCard
            {rec}
            path={collectionPath(rec.collection, workspaces)}
            on:open
            on:complete
            on:snooze
            on:reference
            on:discard
            on:reveal
            on:dismissAsk
          />
        {/each}
      </div>
    {/if}
  {/if}
</section>

<style>
  .nextup {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    padding: 0 var(--space-5) var(--space-3);
  }

  .nextup-header {
    display: flex;
    align-items: center;
    gap: var(--space-3);
  }

  .nextup-toggle {
    padding: 0;
    border: none;
    background: transparent;
    color: var(--text-secondary);
    font-family: var(--font-body);
    font-size: var(--text-xs);
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    cursor: pointer;
  }

  .nextup-toggle[aria-expanded='false']::after {
    content: ' ▸';
  }

  .nextup-toggle[aria-expanded='true']::after {
    content: ' ▾';
  }

  .nextup-spacer {
    flex: 1;
  }

  .nextup-link {
    padding: 0;
    border: none;
    background: transparent;
    color: var(--accent-primary);
    font-family: var(--font-body);
    font-size: var(--text-xs);
    cursor: pointer;
  }

  .nextup-cards {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    gap: var(--space-3);
  }

  .nextup-empty {
    margin: 0;
    font-size: var(--text-sm);
    color: var(--text-tertiary);
  }
</style>
