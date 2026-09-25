<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { plural, t } from '@/lib/i18n';
  import type { TriageItem } from '@/lib/recommend/triage';
  import Button from '@/shared/components/ui/Button.svelte';
  import LinkTile from '@/shared/components/ui/LinkTile.svelte';
  import { TRIAGE_KEYS } from '../next-up-labels';

  export let items: TriageItem[];

  const dispatch = createEventDispatcher<{ openTriage: void }>();

  $: first = items[0];
</script>

<section id="focus-triage" class="focus-section" aria-labelledby="focus-triage-title">
  <div class="focus-section-head">
    <h2 id="focus-triage-title">{t('focus_triage_title')}</h2>
    {#if items.length > 0}
      <span class="aside">{plural(items.length, 'focus_triage_waiting_one', 'focus_triage_waiting_many')}</span>
    {/if}
  </div>
  {#if first === undefined}
    <p class="focus-empty">{t('triage_empty')}</p>
  {:else}
    <div class="mini-stack">
      {#if items.length > 2}<span class="sheet s2" aria-hidden="true"></span>{/if}
      {#if items.length > 1}<span class="sheet s1" aria-hidden="true"></span>{/if}
      <div class="sheet s0">
        <LinkTile link={first.link} size={36} />
        <span class="text">
          <span class="why">{t(TRIAGE_KEYS[first.reason])}</span>
          <span class="title">{first.link.title || first.link.url}</span>
        </span>
      </div>
    </div>
    <Button on:click={() => dispatch('openTriage')}>{t('now_triage_now')}</Button>
  {/if}
</section>

<style>
  .aside {
    margin-left: auto;
    font-size: 12.5px;
    color: var(--text-tertiary);
  }

  .mini-stack {
    position: relative;
    height: 92px;
    margin-bottom: 14px;
  }

  .sheet {
    position: absolute;
    left: 0;
    right: 0;
    height: 76px;
    border: 1px solid var(--border-default);
    border-radius: 14px;
    background: var(--surface-overlay);
  }

  .s2 {
    top: 16px;
    transform: scale(0.94);
    opacity: 0.5;
  }

  .s1 {
    top: 8px;
    transform: scale(0.97);
    opacity: 0.8;
  }

  .s0 {
    top: 0;
    display: grid;
    grid-template-columns: 36px minmax(0, 1fr);
    align-items: center;
    gap: var(--space-3);
    padding: 0 14px;
  }

  .text {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  .why {
    font: 600 var(--text-xs) / 1.2 var(--font-body);
    color: var(--semantic-warning);
  }

  .title {
    margin-top: 2px;
    font: 500 var(--text-base) / 1.3 var(--font-body);
    color: var(--text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
</style>
