<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { t } from '@/lib/i18n';
  import type { Link } from '@/lib/types';
  import { shortDate, weekStart } from '@/lib/recommend/dates';
  import { completedHistory } from '@/lib/recommend/progress';
  import Button from '@/shared/components/ui/Button.svelte';
  import Icon from '@/shared/components/ui/Icon.svelte';

  export let links: Link[];
  export let now: number = Date.now();

  const dispatch = createEventDispatcher<{
    restore: Link;
    open: { link: Link; newTab: boolean };
  }>();

  let showAll = false;

  $: history = completedHistory(links);
  $: thisWeek = weekStart(now);
  $: shown = showAll ? history : history.slice(0, 2);

  function weekLabel(start: number): string {
    return start === thisWeek ? t('focus_completed_this_week') : t('focus_week_of', shortDate(start));
  }

  function dayLabel(ms: number): string {
    return ms >= thisWeek ? new Date(ms).toLocaleDateString(undefined, { weekday: 'short' }) : shortDate(ms);
  }
</script>

<section id="focus-completed" class="focus-section" aria-labelledby="focus-completed-title">
  <div class="focus-section-head">
    <h2 id="focus-completed-title">{t('focus_completed_title')}</h2>
    {#if history.length > 2}
      <span class="toggle">
        <Button variant="quiet" size="sm" on:click={() => (showAll = !showAll)}>
          {showAll ? t('focus_completed_less') : t('focus_completed_all')}
        </Button>
      </span>
    {/if}
  </div>
  {#if history.length === 0}
    <p class="focus-empty">{t('focus_completed_empty')}</p>
  {:else}
    {#each shown as group (group.week)}
      <h3 class="week">{weekLabel(group.start)}</h3>
      <ul class="rows">
        {#each group.links as link (link.id)}
          <li class="row" data-link-id={link.id}>
            <span class="ok" aria-hidden="true"><Icon name="check" size={10} stroke={3} /></span>
            <button type="button" class="title" on:click={() => dispatch('open', { link, newTab: true })}>{link.title || link.url}</button>
            <span class="date">{dayLabel(link.completedAt ?? 0)}</span>
            <span class="undo">
              <Button variant="quiet" size="sm" on:click={() => dispatch('restore', link)}>{t('progress_undo')}</Button>
            </span>
          </li>
        {/each}
      </ul>
    {/each}
  {/if}
</section>

<style>
  .toggle {
    margin-left: auto;
  }

  .week {
    margin: var(--space-2) 0 6px;
    font: 500 11.5px / 1.2 var(--font-body);
    color: var(--text-tertiary);
  }

  .rows {
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .row {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 5px 0;
    border-radius: var(--radius-sm);
    font-size: var(--text-sm);
  }

  .row:global(.revealed) {
    background: var(--accent-soft);
    box-shadow: 0 0 0 1px var(--accent-primary);
  }

  .ok {
    display: grid;
    place-items: center;
    flex-shrink: 0;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: var(--success-soft);
    color: var(--semantic-success);
  }

  .title {
    flex: 1;
    min-width: 0;
    padding: 0;
    border: none;
    background: transparent;
    color: var(--text-primary);
    font: 400 var(--text-sm) / 1.3 var(--font-body);
    text-align: left;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    cursor: pointer;
  }

  .date {
    font-size: 11.5px;
    color: var(--text-tertiary);
  }

  .undo {
    opacity: 0;
    transition: opacity var(--duration-fast) var(--ease-out);
  }

  .row:hover .undo,
  .row:focus-within .undo {
    opacity: 1;
  }
</style>
