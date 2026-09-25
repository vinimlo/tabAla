<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { fade } from 'svelte/transition';
  import { plural, t } from '@/lib/i18n';
  import type { Activity, Link } from '@/lib/types';
  import type { Queue } from '@/lib/recommend/engine';
  import { completedThisWeek, weekDots } from '@/lib/recommend/progress';
  import Button from '@/shared/components/ui/Button.svelte';
  import IconButton from '@/shared/components/ui/IconButton.svelte';
  import { ACTION_KEYS } from '../next-up-labels';
  import NowHero from './NowHero.svelte';
  import NowLater from './NowLater.svelte';

  export let queue: Queue;
  /** Every link, for the week dots. */
  export let links: Link[];
  export let activity: Activity;
  export let now: number;
  export let collapsed = false;
  export let justCompleted: Link | null = null;

  const dispatch = createEventDispatcher<{ toggleCollapsed: void; openTriage: void }>();

  $: hero = queue.slots[0];
  $: later = queue.slots.slice(1);
  $: dots = weekDots(links, now);
  $: weekText = plural(completedThisWeek(links, now), 'focus_week_one', 'focus_week_many');
</script>

<section class="now" aria-labelledby="now-title">
  <header class="now-head">
    <h2 id="now-title">{t('now_title')}</h2>
    <span class="toggle" class:collapsed>
      <IconButton icon="chevron-down" size="sm" label={t('now_toggle')} expanded={!collapsed} on:click={() => dispatch('toggleCollapsed')} />
    </span>
    {#if collapsed && hero !== undefined}
      <button type="button" class="summary" on:click={() => dispatch('toggleCollapsed')}>
        <strong>{t(ACTION_KEYS[hero.action])}</strong> {hero.link.title || hero.link.url}
      </button>
    {/if}
    <div class="week">
      <span class="dots" aria-hidden="true">
        {#each dots as dot (dot.day)}
          <i class:done={dot.done} class:today={dot.today}></i>
        {/each}
      </span>
      <span>{weekText}</span>
    </div>
  </header>

  {#if !collapsed}
    {#if hero === undefined}
      <div class="empty">
        {#if queue.triage.length > 0}
          <p class="empty-title">{t('now_only_triage', queue.triage.length)}</p>
          <Button variant="primary" icon="alert" on:click={() => dispatch('openTriage')}>{t('now_triage_now')}</Button>
        {:else}
          <p class="empty-title">{t('now_empty_title')}</p>
          <p class="empty-body">{t('now_empty_body')}</p>
        {/if}
      </div>
    {:else}
      <div class="grid">
        {#key hero.link.id}
          <div class="hero-slot" in:fade={{ duration: 220 }}>
            <NowHero
              rec={hero}
              activeMs={activity[hero.link.id]?.activeMs ?? 0}
              on:open
              on:complete
              on:snooze
              on:reference
              on:discard
              on:reveal
              on:dismissAsk
            />
          </div>
        {/key}
        <NowLater
          recs={later}
          triageCount={queue.triage.length}
          {justCompleted}
          on:open
          on:complete
          on:openTriage
          on:openFocus
          on:undo
        />
      </div>
    {/if}
  {/if}
</section>

<style>
  .now {
    padding: var(--space-5) 32px 30px;
  }

  .now-head {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    margin-bottom: var(--space-3);
  }

  h2 {
    margin: 0;
    font: 650 15px / 1 var(--font-body);
    color: var(--text-primary);
  }

  /* A disclosure, not an action: no coral when open. */
  .toggle :global(.icon-btn[aria-expanded]) {
    color: var(--text-tertiary);
  }

  .toggle :global(svg) {
    transition: transform var(--duration-fast) var(--ease-out);
  }

  .toggle.collapsed :global(svg) {
    transform: rotate(-90deg);
  }

  .summary {
    min-width: 0;
    padding: 0;
    border: none;
    background: transparent;
    color: var(--text-secondary);
    font: 400 var(--text-sm) / 1.2 var(--font-body);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    cursor: pointer;
  }

  .summary strong {
    color: var(--text-primary);
    font-weight: 600;
  }

  .week {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-left: auto;
    font-size: 12.5px;
    color: var(--text-secondary);
    white-space: nowrap;
  }

  .dots {
    display: flex;
    gap: 4px;
  }

  .dots i {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--border-default);
  }

  .dots i.done {
    background: var(--semantic-success);
  }

  .dots i.today {
    box-shadow: 0 0 0 2px var(--surface-base), 0 0 0 3px var(--border-strong);
  }

  .grid {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 400px;
    gap: 14px;
  }

  .hero-slot {
    min-width: 0;
  }

  .empty {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: var(--space-3);
    padding: var(--space-5);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-xl);
    background: var(--surface-elevated);
  }

  .empty-title {
    margin: 0;
    font: 600 34px / 1 var(--font-display);
    letter-spacing: -0.02em;
    color: var(--text-primary);
  }

  .empty-body {
    margin: 0;
    font-size: var(--text-base);
    color: var(--text-secondary);
  }

  @media (max-width: 1279px) {
    .grid {
      grid-template-columns: minmax(0, 1fr) 320px;
    }
  }

  @media (max-width: 1023px) {
    .grid {
      grid-template-columns: minmax(0, 1fr);
    }
  }
</style>
