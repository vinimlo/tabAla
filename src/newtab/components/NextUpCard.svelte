<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { t } from '@/lib/i18n';
  import type { Link } from '@/lib/types';
  import type { Recommendation } from '@/lib/recommend/engine';
  import { nextMonday, tomorrow } from '@/lib/recommend/dates';
  import { ACTION_KEYS, ROLE_KEYS, effortText, reasonText } from '../next-up-labels';

  export let rec: Recommendation;
  export let path: string;

  const dispatch = createEventDispatcher<{
    open: { link: Link; newTab: boolean };
    complete: Link;
    snooze: { link: Link; until: number };
    reference: Link;
    discard: Link;
    reveal: Link;
    dismissAsk: Link;
  }>();

  let menu: 'snooze' | 'more' | null = null;

  function toggle(name: 'snooze' | 'more'): void {
    menu = menu === name ? null : name;
  }

  function snooze(until: number): void {
    menu = null;
    dispatch('snooze', { link: rec.link, until });
  }

  function pick(event: 'reference' | 'discard' | 'reveal'): void {
    menu = null;
    dispatch(event, rec.link);
  }
</script>

<article class="nextup-card" class:asking={rec.reason.type === 'ask'} data-role={rec.role}>
  <p class="card-meta">
    <span class="card-role">{t(ROLE_KEYS[rec.role])}</span>
    <span class="card-path">{path}</span>
    {#if rec.reason.type !== 'ask'}
      <span class="card-reason">{reasonText(rec.reason)}</span>
    {/if}
  </p>
  {#if rec.reason.type === 'ask'}
    <p class="card-question">{reasonText(rec.reason)}</p>
  {/if}

  <button
    type="button"
    class="card-main"
    on:click={(event) => dispatch('open', { link: rec.link, newTab: event.metaKey || event.ctrlKey })}
  >
    <span class="card-action">{t(ACTION_KEYS[rec.action])}</span>
    <span class="card-title">{rec.link.title || rec.link.url}</span>
    <span class="card-effort">{effortText(rec.effort)}</span>
  </button>

  {#if rec.reason.type === 'ask'}
    <div class="card-actions">
      <button type="button" class="card-btn card-complete" on:click={() => dispatch('complete', rec.link)}>
        ✓ {t('nextup_ask_yes')}
      </button>
      <button type="button" class="card-btn" on:click={() => dispatch('dismissAsk', rec.link)}>{t('nextup_ask_no')}</button>
    </div>
  {:else}
  <div class="card-actions">
    <button type="button" class="card-btn card-complete" on:click={() => dispatch('complete', rec.link)}>
      ✓ {t('progress_complete')}
    </button>
    <div class="card-menu">
      <button type="button" class="card-btn" aria-expanded={menu === 'snooze'} on:click={() => toggle('snooze')}>
        {t('progress_snooze')}
      </button>
      {#if menu === 'snooze'}
        <div class="card-dropdown" role="menu">
          <button type="button" role="menuitem" on:click={() => snooze(tomorrow(Date.now()))}>{t('progress_snooze_tomorrow')}</button>
          <button type="button" role="menuitem" on:click={() => snooze(nextMonday(Date.now()))}>{t('progress_snooze_next_week')}</button>
        </div>
      {/if}
    </div>
    <div class="card-menu">
      <button
        type="button"
        class="card-btn"
        aria-label={t('progress_more')}
        aria-expanded={menu === 'more'}
        on:click={() => toggle('more')}
      >⋯</button>
      {#if menu === 'more'}
        <div class="card-dropdown" role="menu">
          <button type="button" role="menuitem" on:click={() => pick('reference')}>{t('progress_mark_reference')}</button>
          <button type="button" role="menuitem" on:click={() => pick('reveal')}>{t('progress_reveal')}</button>
          <button type="button" role="menuitem" class="danger" on:click={() => pick('discard')}>{t('progress_discard')}</button>
        </div>
      {/if}
    </div>
  </div>
  {/if}
</article>

<style>
  .nextup-card {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    padding: var(--space-3) var(--space-4);
    background: var(--surface-elevated);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-lg);
    min-width: 0;
  }

  .card-meta {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
    margin: 0;
    font-size: var(--text-xs);
    color: var(--text-tertiary);
  }

  .card-role {
    color: var(--accent-primary);
    font-weight: 600;
  }

  .card-main {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: var(--space-1);
    padding: 0;
    border: none;
    background: transparent;
    color: var(--text-primary);
    font-family: var(--font-body);
    text-align: left;
    cursor: pointer;
    min-width: 0;
  }

  .card-action {
    font-size: var(--text-xs);
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .card-title {
    font-size: var(--text-sm);
    font-weight: 500;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 100%;
  }

  .card-main:hover .card-title {
    color: var(--accent-primary);
  }

  .card-effort {
    font-size: var(--text-xs);
    color: var(--text-tertiary);
  }

  .card-actions {
    display: flex;
    gap: var(--space-2);
  }

  .card-menu {
    position: relative;
  }

  .card-btn {
    padding: var(--space-1) var(--space-2);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-md);
    background: transparent;
    color: var(--text-secondary);
    font-family: var(--font-body);
    font-size: var(--text-xs);
    cursor: pointer;
  }

  .card-btn:hover {
    border-color: var(--border-default);
    color: var(--text-primary);
  }

  .card-complete:hover {
    border-color: var(--accent-primary);
    color: var(--accent-primary);
  }

  .card-dropdown {
    position: absolute;
    top: calc(100% + 4px);
    left: 0;
    z-index: 20;
    display: flex;
    flex-direction: column;
    min-width: 200px;
    padding: var(--space-1);
    background: var(--surface-elevated);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-md);
  }

  .card-dropdown button {
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

  .card-dropdown button:hover {
    background: var(--surface-overlay);
  }

  .card-dropdown .danger {
    color: var(--semantic-error);
  }

  .nextup-card.asking {
    border-color: var(--accent-primary);
  }

  .card-question {
    margin: 0;
    font-size: var(--text-sm);
    color: var(--accent-primary);
  }
</style>
