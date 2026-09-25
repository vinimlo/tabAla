<script lang="ts">
  import { plural, t } from '@/lib/i18n';
  import type { Link, RecoStats, Workspace } from '@/lib/types';
  import type { Queue } from '@/lib/recommend/engine';
  import { completedByWeek, previousQueue } from '@/lib/recommend/progress';
  import FocusSession from './FocusSession.svelte';
  import FocusTriage from './FocusTriage.svelte';
  import FocusFronts from './FocusFronts.svelte';
  import FocusCompleted from './FocusCompleted.svelte';

  export let queue: Queue;
  export let links: Link[];
  export let stats: RecoStats;
  export let now: number;
  export let workspaces: Workspace[] = [];
  export let keyboard = true;

  $: bars = completedByWeek(links, now);
  $: thisWeek = bars[bars.length - 1].completed;
  $: tallest = Math.max(1, ...bars.map((bar) => bar.completed));
  $: previous = previousQueue(stats, now);

  function scrollTo(id: string): void {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
</script>

<div class="focus-view scrollbar-thin">
  <section id="focus-progress" class="focus-section" aria-labelledby="focus-progress-title">
    <h2 id="focus-progress-title">{t('focus_progress_title')}</h2>
    <div class="bars" aria-hidden="true">
      {#each bars as bar (bar.week)}
        <span class="bar" style="--height: {Math.round((bar.completed / tallest) * 100)}%" title="{bar.week}: {bar.completed}"></span>
      {/each}
    </div>
    <p class="progress-summary">
      {plural(thisWeek, 'focus_week_one', 'focus_week_many')} · {t('focus_queue', queue.size)}{#if previous !== undefined && previous !== queue.size}
        · {queue.size < previous ? t('focus_queue_down', previous - queue.size) : t('focus_queue_up', queue.size - previous)}{/if}
    </p>
  </section>

  <FocusSession {queue} on:open on:complete on:openTriage={() => scrollTo('focus-triage')} />
  <FocusTriage items={queue.triage} {workspaces} {links} {keyboard} on:keep on:discard on:reference on:complete on:open />
  <FocusFronts fronts={queue.fronts} {workspaces} on:collectionFocus on:collectionReference />
  <FocusCompleted {links} on:restore on:open />
</div>

<style>
  .focus-view {
    flex: 1;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: var(--space-6);
    padding: var(--space-4) var(--space-6) var(--space-8);
    max-width: 920px;
  }

  .focus-view :global(.focus-section h2) {
    margin: 0 0 var(--space-3);
    font-family: var(--font-display);
    font-size: var(--text-lg);
    color: var(--text-primary);
  }

  .focus-view :global(.focus-empty) {
    margin: 0;
    font-size: var(--text-sm);
    color: var(--text-tertiary);
  }

  .bars {
    display: flex;
    align-items: flex-end;
    gap: var(--space-2);
    height: 64px;
  }

  .bar {
    flex: 1;
    max-width: 32px;
    height: max(2px, var(--height));
    background: var(--accent-primary);
    border-radius: var(--radius-sm) var(--radius-sm) 0 0;
    opacity: 0.85;
  }

  .progress-summary {
    margin: var(--space-2) 0 0;
    font-size: var(--text-sm);
    color: var(--text-secondary);
  }
</style>
