<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { getCollectionDisplayName, plural, t } from '@/lib/i18n';
  import type { Link } from '@/lib/types';
  import type { Queue } from '@/lib/recommend/engine';
  import { buildSession, SESSION_OPTIONS, type SessionItem, type SessionMinutes } from '@/lib/recommend/session';
  import Button from '@/shared/components/ui/Button.svelte';
  import Icon from '@/shared/components/ui/Icon.svelte';
  import IconButton from '@/shared/components/ui/IconButton.svelte';
  import LinkTile from '@/shared/components/ui/LinkTile.svelte';
  import Segmented from '@/shared/components/ui/Segmented.svelte';
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

  const options = SESSION_OPTIONS.map((value) => ({ value, label: t('focus_session_minutes', value) }));
  $: eligible = new Set(queue.fronts.flatMap((front) => front.eligible.map((link) => link.id)));
  $: items = planned.flatMap((item): SessionItem[] => {
    if (item.type === 'triage') {
      return queue.triage.length === 0 ? [] : [{ type: 'triage', count: Math.min(item.count, queue.triage.length) }];
    }
    return eligible.has(item.rec.link.id) ? [item] : [];
  });
  $: timeline = withStarts(items);
  $: plannedMinutes = timeline.reduce((sum, row) => sum + row.minutes, 0);
  $: nextLink = items.flatMap((item) => (item.type === 'link' && !opened.has(item.rec.link.id) ? [item.rec.link] : []))[0];

  /** The engine counts one minute for the triage step. */
  function stepMinutes(item: SessionItem): number {
    return item.type === 'triage' ? 1 : item.rec.effort;
  }

  function withStarts(list: SessionItem[]): { item: SessionItem; start: number; minutes: number }[] {
    let start = 0;
    return list.map((item) => {
      const row = { item, start, minutes: stepMinutes(item) };
      start += row.minutes;
      return row;
    });
  }

  function tone(item: SessionItem): string {
    if (item.type === 'triage') {
      return 'warning';
    }
    return item.rec.role === 'continue' ? 'accent' : 'plain';
  }

  function choose(event: CustomEvent<string | number>): void {
    minutes = event.detail as SessionMinutes;
    planned = buildSession(queue, minutes);
    opened = new Set();
  }

  /** The session keeps the Focus page: links open in a new tab. */
  function open(link: Link): void {
    opened = new Set([...opened, link.id]);
    dispatch('open', { link, newTab: true });
  }
</script>

<section id="focus-session" class="focus-section" aria-labelledby="focus-session-title">
  <div class="focus-section-head">
    <h2 id="focus-session-title">{t('focus_session_title')}</h2>
    <span class="question">{t('focus_session_pick')}</span>
    <Segmented label={t('focus_session_pick')} {options} value={minutes} on:change={choose} />
  </div>

  {#if minutes !== null}
    {#if items.length === 0}
      <p class="focus-empty">{t('focus_session_empty')}</p>
    {:else}
      <ol class="timeline">
        {#each timeline as row (row.item.type === 'link' ? row.item.rec.link.id : 'triage')}
          <li class="step" class:opened={row.item.type === 'link' && opened.has(row.item.rec.link.id)}>
            <span class="at">{t('focus_session_at', row.start)}</span>
            {#if row.item.type === 'triage'}
              <span class="triage-tile"><Icon name="alert" size={17} /></span>
              <button type="button" class="what" on:click={() => dispatch('openTriage')}>
                <span class="title">{plural(row.item.count, 'focus_session_triage_one', 'focus_session_triage_many')}</span>
              </button>
              <span class="min">{effortText(1)}</span>
              <span></span>
            {:else}
              {@const rec = row.item.rec}
              <LinkTile link={rec.link} size={36} />
              <button type="button" class="what" on:click={() => open(rec.link)}>
                <span class="do"><strong>{t(ACTION_KEYS[rec.action])}</strong> · {getCollectionDisplayName(rec.collection)}</span>
                <span class="title">{rec.link.title || rec.link.url}</span>
              </button>
              <span class="min">
                {effortText(rec.effort)}
                {#if row.item.overBudget}<span class="over">{t('focus_session_over_budget')}</span>{/if}
              </span>
              <IconButton icon="check" size="sm" tone="success" label={t('progress_complete')} on:click={() => dispatch('complete', rec.link)} />
            {/if}
          </li>
        {/each}
      </ol>

      <div class="budget">
        <span class="bar" aria-hidden="true">
          {#each timeline as row, i (i)}
            <i class={tone(row.item)} style:flex-grow={row.minutes}></i>
          {/each}
          {#if plannedMinutes < minutes}
            <i class="rest" style:flex-grow={minutes - plannedMinutes}></i>
          {/if}
        </span>
        <span class="label">{t('focus_session_budget', plannedMinutes, minutes)}</span>
        {#if nextLink !== undefined}
          <Button variant="primary" on:click={() => nextLink !== undefined && open(nextLink)}>{t('focus_session_next')}</Button>
        {/if}
      </div>
    {/if}
  {/if}
</section>

<style>
  .question {
    margin-left: auto;
    font-size: 12.5px;
    color: var(--text-tertiary);
  }

  .timeline {
    margin: var(--space-2) 0 0;
    padding: 0;
    list-style: none;
  }

  .step {
    display: grid;
    grid-template-columns: 44px 36px minmax(0, 1fr) auto 28px;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-2) 0;
  }

  .step.opened .title {
    color: var(--text-secondary);
  }

  .at {
    font-size: var(--text-xs);
    color: var(--text-tertiary);
    font-variant-numeric: tabular-nums;
    text-align: right;
  }

  .triage-tile {
    display: grid;
    place-items: center;
    width: 36px;
    height: 36px;
    border-radius: 10px;
    background: var(--warning-soft);
    color: var(--semantic-warning);
  }

  .what {
    display: flex;
    flex-direction: column;
    min-width: 0;
    padding: 0;
    border: none;
    background: transparent;
    color: inherit;
    font: inherit;
    text-align: left;
    cursor: pointer;
  }

  .do {
    font-size: var(--text-xs);
    color: var(--text-secondary);
  }

  .do strong {
    color: var(--text-primary);
    font-weight: 600;
  }

  .title {
    margin-top: 2px;
    font: 500 var(--text-base) / 1.3 var(--font-body);
    color: var(--text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .what:hover .title {
    text-decoration: underline;
    text-decoration-color: var(--border-strong);
    text-underline-offset: 3px;
  }

  .min {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    font-size: 12.5px;
    color: var(--text-tertiary);
    font-variant-numeric: tabular-nums;
  }

  .over {
    font-size: var(--text-2xs);
  }

  .budget {
    display: flex;
    align-items: center;
    gap: 14px;
    margin-top: var(--space-4);
    padding-top: var(--space-4);
    border-top: 1px solid var(--border-subtle);
  }

  .bar {
    display: flex;
    flex: 1;
    gap: 2px;
    height: 6px;
    border-radius: 3px;
    background: var(--surface-well);
    overflow: hidden;
  }

  .bar i {
    display: block;
    height: 100%;
    background: var(--text-secondary);
  }

  .bar i.warning {
    background: var(--semantic-warning);
  }

  .bar i.accent {
    background: var(--accent-primary);
  }

  .bar i.rest {
    background: transparent;
  }

  .label {
    font-size: 12.5px;
    color: var(--text-secondary);
    font-variant-numeric: tabular-nums;
  }
</style>
