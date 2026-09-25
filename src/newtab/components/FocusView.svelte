<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { plural, t } from '@/lib/i18n';
  import type { Link, RecoStats, Workspace } from '@/lib/types';
  import type { Queue } from '@/lib/recommend/engine';
  import { addDays, shortDate, weekStart } from '@/lib/recommend/dates';
  import { completedByWeek, previousQueue, queueForecast } from '@/lib/recommend/progress';
  import FocusSession from './FocusSession.svelte';
  import FocusTriagePanel from './FocusTriagePanel.svelte';
  import FocusFronts from './FocusFronts.svelte';
  import FocusCompleted from './FocusCompleted.svelte';

  export let queue: Queue;
  export let links: Link[];
  export let stats: RecoStats;
  export let now: number;
  export let workspaces: Workspace[] = [];

  const dispatch = createEventDispatcher<{ openTriage: void }>();

  $: bars = completedByWeek(links, now);
  $: thisWeek = bars[bars.length - 1].completed;
  $: tallest = Math.max(1, ...bars.map((bar) => bar.completed));
  $: previous = previousQueue(stats, now);
  $: queueChange = previous === undefined || previous === queue.size
    ? ''
    : queue.size < previous ? t('focus_queue_fell', previous, queue.size) : t('focus_queue_rose', previous, queue.size);
  $: forecast = queueForecast(bars, queue.size);
  $: forecastText = forecast === null
    ? ''
    : queue.size === 0
      ? t('focus_forecast_zero')
      : [
        t('focus_forecast_rate', Math.max(1, Math.round(forecast.perWeek))),
        forecast.weeks === null ? '' : plural(forecast.weeks, 'focus_forecast_weeks_one', 'focus_forecast_weeks_many'),
      ].filter((part) => part !== '').join(' ');
  $: labels = bars.map((_, i) => {
    if (i === bars.length - 1) {
      return t('focus_week_now');
    }
    return i % 2 === 0 ? shortDate(weekStart(addDays(now, -7 * (bars.length - 1 - i)))) : '';
  });
</script>

<div class="focus-view scrollbar-thin">
  <header class="focus-head">
    <h1>{t('focus_title')}</h1>
    <p><strong>{plural(thisWeek, 'focus_week_one', 'focus_week_many')}.</strong>{#if queueChange !== ''} {queueChange}{/if}</p>
  </header>

  <div class="focus-grid">
    <div class="focus-column">
      <FocusSession {queue} on:open on:complete on:openTriage={() => dispatch('openTriage')} />
      <FocusTriagePanel items={queue.triage} on:openTriage={() => dispatch('openTriage')} />
    </div>

    <div class="focus-column">
      <section id="focus-progress" class="focus-section" aria-labelledby="focus-progress-title">
        <div class="focus-section-head">
          <h2 id="focus-progress-title">{t('focus_progress_title')}</h2>
        </div>
        <div class="bars" aria-hidden="true">
          {#each bars as bar, i (bar.week)}
            <span class="bar" class:current={i === bars.length - 1} style:--height="{Math.round((bar.completed / tallest) * 100)}%" title={String(bar.completed)}></span>
          {/each}
        </div>
        <div class="bar-labels" aria-hidden="true">
          {#each labels as label, i (i)}<span>{label}</span>{/each}
        </div>
        {#if forecastText !== ''}
          <p class="forecast">{forecastText}</p>
        {/if}
      </section>

      <FocusFronts fronts={queue.fronts} {workspaces} on:collectionFocus on:collectionReference />
      <FocusCompleted {links} {now} on:restore on:open />
    </div>
  </div>
</div>

<style>
  .focus-view {
    flex: 1;
    overflow-y: auto;
    padding: var(--space-2) 32px var(--space-8);
  }

  .focus-head {
    display: flex;
    align-items: flex-end;
    gap: 20px;
    margin: var(--space-4) 0 26px;
  }

  h1 {
    margin: 0;
    font: 600 48px / 0.85 var(--font-display);
    letter-spacing: -0.03em;
    color: var(--text-primary);
  }

  .focus-head p {
    margin: 0 0 2px;
    font-size: var(--text-base);
    color: var(--text-secondary);
  }

  .focus-head strong {
    color: var(--semantic-success);
    font-weight: 650;
  }

  .focus-grid {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 380px;
    gap: var(--space-4);
    align-items: start;
  }

  .focus-column {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
    min-width: 0;
  }

  .focus-view :global(.focus-section) {
    padding: 20px 22px;
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-xl);
    background: var(--surface-elevated);
    box-shadow: var(--shadow-lift);
  }

  .focus-view :global(.focus-section-head) {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    margin-bottom: var(--space-4);
  }

  .focus-view :global(.focus-section h2) {
    margin: 0;
    font: 650 var(--text-md) / 1.2 var(--font-body);
    letter-spacing: -0.01em;
    color: var(--text-primary);
  }

  .focus-view :global(.focus-empty) {
    margin: 0;
    font-size: var(--text-sm);
    color: var(--text-tertiary);
  }

  .bars,
  .bar-labels {
    display: grid;
    grid-template-columns: repeat(8, 1fr);
    gap: 7px;
  }

  .bars {
    align-items: end;
    height: 92px;
  }

  .bar {
    height: max(3px, var(--height));
    border-radius: 5px 5px 2px 2px;
    background: color-mix(in srgb, var(--semantic-success) 28%, transparent);
  }

  .bar.current {
    background: var(--semantic-success);
  }

  .bar-labels {
    margin-top: 7px;
    font-size: 10.5px;
    color: var(--text-tertiary);
    text-align: center;
  }

  .forecast {
    margin: 14px 0 0;
    font-size: var(--text-sm);
    line-height: 1.5;
    color: var(--text-secondary);
  }

  @media (max-width: 1199px) {
    .focus-grid {
      grid-template-columns: minmax(0, 1fr);
    }
  }
</style>
