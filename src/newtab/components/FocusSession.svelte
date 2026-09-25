<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { plural, t } from '@/lib/i18n';
  import type { Link } from '@/lib/types';
  import type { Queue } from '@/lib/recommend/engine';
  import { buildSession, SESSION_OPTIONS, type SessionItem, type SessionMinutes } from '@/lib/recommend/session';
  import { ACTION_KEYS, effortText } from '../next-up-labels';

  export let queue: Queue;

  const dispatch = createEventDispatcher<{
    open: { link: Link; newTab: boolean };
    complete: Link;
    openTriage: void;
  }>();

  let minutes: SessionMinutes | null = null;
  let opened = new Set<string>();
  /** The sequence as chosen: opening a link must not reshuffle it. */
  let planned: SessionItem[] = [];

  $: eligible = new Set(queue.fronts.flatMap((front) => front.eligible.map((link) => link.id)));
  $: items = planned.flatMap((item): SessionItem[] => {
    if (item.type === 'triage') {
      return queue.triage.length === 0 ? [] : [{ type: 'triage', count: Math.min(item.count, queue.triage.length) }];
    }
    return eligible.has(item.rec.link.id) ? [item] : [];
  });
  $: nextLink = items.flatMap((item) => (item.type === 'link' && !opened.has(item.rec.link.id) ? [item.rec.link] : []))[0];

  function choose(option: SessionMinutes): void {
    minutes = option;
    planned = buildSession(queue, option);
    opened = new Set();
  }

  /** The session keeps the Focus page: links open in a new tab. */
  function open(link: Link): void {
    opened = new Set([...opened, link.id]);
    dispatch('open', { link, newTab: true });
  }
</script>

<section id="focus-session" class="focus-section" aria-labelledby="focus-session-title">
  <h2 id="focus-session-title">{t('focus_session_title')}</h2>
  <div class="session-options" role="group" aria-label={t('focus_session_pick')}>
    <span class="session-question">{t('focus_session_pick')}</span>
    {#each SESSION_OPTIONS as option (option)}
      <button type="button" aria-pressed={minutes === option} on:click={() => choose(option)}>
        {t('focus_session_minutes', option)}
      </button>
    {/each}
  </div>

  {#if minutes !== null}
    {#if items.length === 0}
      <p class="focus-empty">{t('focus_session_empty')}</p>
    {:else}
      <ol class="session-items">
        {#each items as item (item.type === 'link' ? item.rec.link.id : 'triage')}
          <li class="session-item">
            {#if item.type === 'triage'}
              <button type="button" class="session-triage" on:click={() => dispatch('openTriage')}>
                {plural(item.count, 'focus_session_triage_one', 'focus_session_triage_many')}
              </button>
            {:else}
              <span class="session-action">{t(ACTION_KEYS[item.rec.action])}</span>
              <button type="button" class="session-title" class:opened={opened.has(item.rec.link.id)} on:click={() => open(item.rec.link)}>
                {item.rec.link.title || item.rec.link.url}
              </button>
              <span class="session-effort">
                {effortText(item.rec.effort)}{#if item.overBudget} · {t('focus_session_over_budget')}{/if}
              </span>
              <button
                type="button"
                class="session-complete"
                aria-label={t('progress_complete')}
                on:click={() => dispatch('complete', item.rec.link)}
              >✓</button>
            {/if}
          </li>
        {/each}
      </ol>
      {#if nextLink !== undefined}
        <button type="button" class="session-next" on:click={() => open(nextLink)}>{t('focus_session_next')}</button>
      {/if}
    {/if}
  {/if}
</section>

<style>
  .session-options {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    flex-wrap: wrap;
  }

  .session-question {
    font-size: var(--text-sm);
    color: var(--text-secondary);
    margin-right: var(--space-2);
  }

  .session-options button,
  .session-next {
    padding: var(--space-1) var(--space-3);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-full);
    background: transparent;
    color: var(--text-primary);
    font-family: var(--font-body);
    font-size: var(--text-sm);
    cursor: pointer;
  }

  .session-options button[aria-pressed='true'],
  .session-next {
    border-color: var(--accent-primary);
    background: var(--accent-soft);
    color: var(--accent-primary);
  }

  .session-items {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    margin: var(--space-3) 0;
    padding-left: var(--space-5);
  }

  .session-item {
    font-size: var(--text-sm);
  }

  .session-item > * {
    vertical-align: middle;
  }

  .session-action {
    font-size: var(--text-xs);
    color: var(--text-secondary);
    text-transform: uppercase;
    margin-right: var(--space-2);
  }

  .session-title,
  .session-triage {
    padding: 0;
    border: none;
    background: transparent;
    color: var(--text-primary);
    font-family: var(--font-body);
    font-size: var(--text-sm);
    text-align: left;
    cursor: pointer;
  }

  .session-title:hover,
  .session-triage:hover {
    color: var(--accent-primary);
  }

  .session-title.opened {
    color: var(--text-secondary);
  }

  .session-effort {
    font-size: var(--text-xs);
    color: var(--text-tertiary);
    margin: 0 var(--space-2);
  }

  .session-complete {
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-sm);
    background: transparent;
    color: var(--text-secondary);
    cursor: pointer;
  }

  .session-complete:hover {
    border-color: var(--accent-primary);
    color: var(--accent-primary);
  }
</style>
