<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { t } from '@/lib/i18n';
  import type { SessionView } from '@/lib/recommend/session';
  import IconButton from '@/shared/components/ui/IconButton.svelte';
  import ProgressRing from '@/shared/components/ui/ProgressRing.svelte';

  export let view: SessionView;

  const dispatch = createEventDispatcher<{ open: void; dismiss: void }>();

  $: minutesLeft = Math.ceil(view.remainingMs / 60_000);
</script>

<div class="pill" class:finished={view.finished}>
  <button type="button" class="main" on:click={() => dispatch('open')}>
    <ProgressRing value={view.finished ? 1 : view.elapsed} size={20} stroke={2.5} />
    {#if view.finished}
      <span class="name">{t('session_ended', view.done, view.total)}</span>
    {:else}
      <span class="name">{t('session_title')}</span>
      <span class="left">{t('session_left', minutesLeft)}</span>
    {/if}
  </button>
  {#if view.finished}
    <IconButton icon="close" size="sm" label={t('session_dismiss')} on:click={() => dispatch('dismiss')} />
  {/if}
</div>

<style>
  .pill {
    display: inline-flex;
    align-items: center;
    gap: 2px;
    height: var(--control-md);
    padding: 0 4px 0 0;
    border: 1px solid var(--accent-line);
    border-radius: 17px;
    background: var(--accent-soft);
  }

  .main {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    height: 100%;
    padding: 0 8px 0 7px;
    border: none;
    background: transparent;
    color: var(--accent-ink);
    font: 600 var(--text-sm) / 1 var(--font-body);
    cursor: pointer;
  }

  .left {
    color: var(--text-secondary);
    font-weight: 500;
    font-variant-numeric: tabular-nums;
  }

  .finished {
    border-color: var(--border-default);
    background: var(--surface-elevated);
  }

  .finished .main {
    color: var(--text-primary);
  }
</style>
