<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { getCollectionDisplayName, plural, t } from '@/lib/i18n';
  import type { Link } from '@/lib/types';
  import type { Recommendation } from '@/lib/recommend/engine';
  import Icon from '@/shared/components/ui/Icon.svelte';
  import IconButton from '@/shared/components/ui/IconButton.svelte';
  import Kbd from '@/shared/components/ui/Kbd.svelte';
  import LinkTile from '@/shared/components/ui/LinkTile.svelte';
  import { ACTION_KEYS, effortText } from '../next-up-labels';

  export let recs: Recommendation[];
  export let triageCount = 0;
  /** The link just completed from Now, while Undo is offered. */
  export let justCompleted: Link | null = null;
  /** Inside a Focus session: other title, and "end" instead of "plan". */
  export let inSession = false;

  const dispatch = createEventDispatcher<{
    open: { link: Link; newTab: boolean };
    complete: Link;
    openTriage: void;
    openFocus: void;
    endSession: void;
    undo: Link;
  }>();
</script>

<aside class="later" aria-labelledby="now-later-title">
  <h3 id="now-later-title">{inSession ? t('now_later_session') : t('now_later')}</h3>

  {#each recs as rec (rec.link.id)}
    <div class="row">
      <button type="button" class="row-main" on:click={(event) => dispatch('open', { link: rec.link, newTab: event.metaKey || event.ctrlKey })}>
        <LinkTile link={rec.link} size={36} />
        <span class="row-text">
          <span class="row-do"><strong>{t(ACTION_KEYS[rec.action])}</strong> {effortText(rec.effort)} · {getCollectionDisplayName(rec.collection)}</span>
          <span class="row-title">{rec.link.title || rec.link.url}</span>
        </span>
      </button>
      <span class="row-check">
        <IconButton icon="check" size="sm" tone="success" label={t('progress_complete')} on:click={() => dispatch('complete', rec.link)} />
      </span>
    </div>
  {/each}

  {#if recs.length > 0}
    <hr />
  {/if}

  {#if justCompleted !== null}
    <div class="act done">
      <span class="act-icon"><Icon name="check" size={18} /></span>
      <span class="act-text">{t('now_just_completed', justCompleted.title || justCompleted.url)}</span>
      <button type="button" class="act-link" on:click={() => justCompleted !== null && dispatch('undo', justCompleted)}>{t('progress_undo')}</button>
    </div>
  {/if}

  {#if triageCount > 0}
    <button type="button" class="act" on:click={() => dispatch('openTriage')}>
      <span class="act-icon warning"><Icon name="alert" size={18} /></span>
      <span class="act-text">{plural(triageCount, 'now_triage_one', 'now_triage_many')}</span>
      <Icon name="chevron-right" size={14} />
    </button>
  {/if}

  {#if inSession}
    <button type="button" class="act" on:click={() => dispatch('endSession')}>
      <span class="act-icon accent"><Icon name="target" size={18} /></span>
      <span class="act-text">{t('now_end_session')}</span>
      <Icon name="chevron-right" size={14} />
    </button>
  {:else}
    <button type="button" class="act" on:click={() => dispatch('openFocus')}>
      <span class="act-icon accent"><Icon name="target" size={18} /></span>
      <span class="act-text">{t('now_plan_session')}</span>
      <span class="act-hint" aria-hidden="true"><Kbd>F</Kbd></span>
      <Icon name="chevron-right" size={14} />
    </button>
  {/if}
</aside>

<style>
  .later {
    display: flex;
    flex-direction: column;
    padding: var(--space-2);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-xl);
    background: var(--surface-elevated);
    box-shadow: var(--shadow-lift);
    min-width: 0;
  }

  h3 {
    margin: var(--space-2) 10px 6px;
    font: 600 var(--text-xs) / 1.2 var(--font-body);
    color: var(--text-tertiary);
  }

  .row {
    position: relative;
    display: flex;
    align-items: center;
    border-radius: 12px;
  }

  .row:hover {
    background: var(--state-hover);
  }

  .row-main {
    display: grid;
    grid-template-columns: 36px minmax(0, 1fr);
    align-items: center;
    gap: var(--space-3);
    flex: 1;
    min-width: 0;
    padding: 9px 10px;
    border: none;
    background: transparent;
    color: inherit;
    font: inherit;
    text-align: left;
    cursor: pointer;
  }

  .row-text {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  .row-do {
    font-size: var(--text-xs);
    color: var(--text-secondary);
  }

  .row-do strong {
    color: var(--text-primary);
    font-weight: 600;
  }

  .row-title {
    margin-top: 2px;
    font: 500 13.5px / 1.3 var(--font-body);
    color: var(--text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .row-check {
    padding-right: 6px;
    opacity: 0;
    transition: opacity var(--duration-fast) var(--ease-out);
  }

  .row:hover .row-check,
  .row:focus-within .row-check {
    opacity: 1;
  }

  hr {
    margin: 4px 10px;
    border: 0;
    border-top: 1px solid var(--border-subtle);
  }

  .act {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    padding: 9px 10px;
    border: none;
    border-radius: 12px;
    background: transparent;
    color: var(--text-secondary);
    font: 400 var(--text-sm) / 1.2 var(--font-body);
    text-align: left;
    cursor: pointer;
  }

  button.act:hover {
    background: var(--state-hover);
    color: var(--text-primary);
  }

  .act-icon {
    display: grid;
    place-items: center;
    width: 36px;
  }

  .act-icon.warning {
    color: var(--semantic-warning);
  }

  .act-icon.accent {
    color: var(--accent-primary);
  }

  .done .act-icon {
    color: var(--semantic-success);
  }

  .act-text {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .act-hint {
    display: inline-flex;
  }

  .act-link {
    padding: 0;
    border: none;
    background: transparent;
    color: var(--text-secondary);
    font: 500 var(--text-sm) / 1 var(--font-body);
    text-decoration: underline;
    text-underline-offset: 3px;
    cursor: pointer;
  }
</style>
