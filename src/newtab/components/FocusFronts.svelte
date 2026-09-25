<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { plural, t } from '@/lib/i18n';
  import type { Collection, Workspace } from '@/lib/types';
  import { INBOX_COLLECTION_ID } from '@/lib/types';
  import { advanceReason, type Front } from '@/lib/recommend/engine';
  import { collectionPath, reasonText } from '../next-up-labels';

  export let fronts: Front[];
  export let workspaces: Workspace[] = [];

  const dispatch = createEventDispatcher<{
    collectionFocus: { collection: Collection; value: boolean };
    collectionReference: { collection: Collection; value: boolean };
  }>();
</script>

<section id="focus-fronts" class="focus-section" aria-labelledby="focus-fronts-title">
  <h2 id="focus-fronts-title">{t('focus_fronts_title')}</h2>
  {#if fronts.length === 0}
    <p class="focus-empty">{t('nextup_empty')}</p>
  {:else}
    <ul class="fronts">
      {#each fronts as front (front.collection.id)}
        <li class="front">
          <span class="front-path">{collectionPath(front.collection, workspaces)}</span>
          <span class="front-count">{plural(front.eligible.length, 'focus_front_count_one', 'focus_front_count_many')}</span>
          <span class="front-reason">{reasonText(advanceReason(front))}</span>
          <span class="front-actions">
            <button
              type="button"
              aria-pressed={front.collection.focus === true}
              on:click={() => dispatch('collectionFocus', { collection: front.collection, value: front.collection.focus !== true })}
            >{front.collection.focus === true ? t('column_unpin_focus') : t('column_pin_focus')}</button>
            {#if front.collection.id !== INBOX_COLLECTION_ID}
              <button
                type="button"
                on:click={() => dispatch('collectionReference', { collection: front.collection, value: true })}
              >{t('column_mark_reference')}</button>
            {/if}
          </span>
        </li>
      {/each}
    </ul>
  {/if}
</section>

<style>
  .fronts {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .front {
    display: grid;
    grid-template-columns: minmax(0, 2fr) auto minmax(0, 1.5fr) auto;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-2) var(--space-3);
    border-bottom: 1px solid var(--border-subtle);
    font-size: var(--text-sm);
  }

  .front-path {
    color: var(--text-primary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .front-count,
  .front-reason {
    color: var(--text-tertiary);
    font-size: var(--text-xs);
  }

  .front-actions {
    display: flex;
    gap: var(--space-2);
  }

  .front-actions button {
    padding: var(--space-1) var(--space-2);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-md);
    background: transparent;
    color: var(--text-secondary);
    font-family: var(--font-body);
    font-size: var(--text-xs);
    cursor: pointer;
  }

  .front-actions button[aria-pressed='true'] {
    border-color: var(--accent-primary);
    color: var(--accent-primary);
  }
</style>
