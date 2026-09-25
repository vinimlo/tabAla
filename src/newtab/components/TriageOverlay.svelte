<script lang="ts">
  import { createEventDispatcher, onMount, tick } from 'svelte';
  import { fly } from 'svelte/transition';
  import { plural, t } from '@/lib/i18n';
  import type { Link, Workspace } from '@/lib/types';
  import type { TriageItem } from '@/lib/recommend/triage';
  import { shortDate } from '@/lib/recommend/dates';
  import { extractDomain } from '@/lib/tabs';
  import Button from '@/shared/components/ui/Button.svelte';
  import Icon from '@/shared/components/ui/Icon.svelte';
  import Kbd from '@/shared/components/ui/Kbd.svelte';
  import LinkTile from '@/shared/components/ui/LinkTile.svelte';
  import { trapFocus } from '@/shared/focus-trap';
  import { isEditable } from '../shortcuts';
  import { TRIAGE_KEYS, collectionPath } from '../next-up-labels';

  export let items: TriageItem[];
  export let workspaces: Workspace[] = [];
  /** All links: an opened link leaves triage, but stays on screen until decided. */
  export let links: Link[] = [];

  const dispatch = createEventDispatcher<{
    keep: Link;
    discard: Link;
    reference: Link;
    complete: Link;
    open: { link: Link; newTab: boolean };
    close: void;
  }>();

  const DECISIONS = [
    { key: '1', event: 'keep', label: 'triage_keep', icon: 'keep' },
    { key: '2', event: 'discard', label: 'progress_discard', icon: 'trash' },
    { key: '3', event: 'reference', label: 'triage_reference', icon: 'reference' },
    { key: '4', event: 'complete', label: 'triage_already_done', icon: 'check' },
  ] as const;

  type Decision = (typeof DECISIONS)[number]['event'];

  /** Fixed when the layer opens: the progress counts against it. */
  const total = items.length;
  let counts: Record<Decision, number> = { keep: 0, discard: 0, reference: 0, complete: 0 };
  /** Decided here; skipped even before the list catches up. */
  let decidedIds = new Set<string>();
  /** The link opened from here: opening renews it, so it leaves `items`. */
  let pinned: TriageItem | null = null;
  let root: HTMLDivElement;

  $: decided = counts.keep + counts.discard + counts.reference + counts.complete;
  $: current = resolveCurrent(pinned, items, links, decidedIds);
  $: position = Math.min(decided + 1, Math.max(total, 1));
  $: summary = [
    counts.keep > 0 ? plural(counts.keep, 'triage_count_kept_one', 'triage_count_kept_many') : '',
    counts.discard > 0 ? plural(counts.discard, 'triage_count_discarded_one', 'triage_count_discarded_many') : '',
    counts.reference > 0 ? plural(counts.reference, 'triage_count_reference_one', 'triage_count_reference_many') : '',
    counts.complete > 0 ? plural(counts.complete, 'triage_count_completed_one', 'triage_count_completed_many') : '',
  ].filter((part) => part !== '').join(', ');

  function resolveCurrent(held: TriageItem | null, list: TriageItem[], all: Link[], done: Set<string>): TriageItem | undefined {
    if (held !== null && !done.has(held.link.id)) {
      const live = all.find((link) => link.id === held.link.id);
      if (live !== undefined && live.completedAt === undefined && live.reference !== true) {
        return list.find((item) => item.link.id === live.id) ?? { ...held, link: live };
      }
    }
    return list.find((item) => !done.has(item.link.id));
  }

  function decide(decision: Decision): void {
    if (current === undefined) {
      return;
    }
    const link = current.link;
    pinned = null;
    decidedIds = new Set([...decidedIds, link.id]);
    counts = { ...counts, [decision]: counts[decision] + 1 };
    dispatch(decision, link);
    void focusFirst();
  }

  /** The decided card leaves the page; the focus goes to the next one, or to Close at the end. */
  async function focusFirst(): Promise<void> {
    await tick();
    root.querySelector<HTMLElement>('.decision, .finished button')?.focus();
  }

  function open(item: TriageItem): void {
    pinned = item;
    dispatch('open', { link: item.link, newTab: true });
  }

  /** Another dialog or a menu owns the keyboard while it is open. */
  function otherLayerOpen(): boolean {
    return [...document.querySelectorAll('[role="dialog"], [role="menu"]')].some((element) => element !== root && !root.contains(element));
  }

  function handleKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      if (!otherLayerOpen()) {
        event.preventDefault();
        dispatch('close');
      }
      return;
    }
    if (event.repeat || current === undefined || isEditable(event.target)
      || event.metaKey || event.ctrlKey || event.altKey || otherLayerOpen()) {
      return;
    }
    const decision = DECISIONS.find((d) => d.key === event.key);
    if (decision !== undefined) {
      event.preventDefault();
      decide(decision.event);
    }
  }

  onMount(focusFirst);
</script>

<svelte:window on:keydown={handleKeydown} />

<div class="layer">
  <button type="button" class="scrim" tabindex="-1" aria-hidden="true" aria-label={t('common_close')} on:click={() => dispatch('close')}></button>

  <div class="triage" role="dialog" aria-modal="true" aria-labelledby="triage-title" bind:this={root} use:trapFocus>
    <header class="head">
      <h2 id="triage-title">{t('focus_triage_title')}</h2>
      <span class="bar" aria-hidden="true"><i style:width="{total === 0 ? 100 : (decided / total) * 100}%"></i></span>
      <span class="count">{t('triage_progress', position, Math.max(total, 1))}</span>
      <Kbd>esc</Kbd>
    </header>

    {#if current !== undefined}
      {@const item = current}
      <div class="stack">
        <div class="sheet back two" aria-hidden="true"></div>
        <div class="sheet back one" aria-hidden="true"></div>
        {#key item.link.id}
          <article class="sheet front" in:fly={{ y: 12, duration: 180 }} out:fly={{ y: -16, duration: 180 }}>
            <span class="why"><Icon name="alert" size={14} />{t(TRIAGE_KEYS[item.reason])}</span>
            <div class="what">
              <LinkTile link={item.link} size={56} />
              <div class="what-text">
                <button type="button" class="title" on:click={() => open(item)}>{item.link.title || item.link.url}</button>
                <p class="meta">
                  <span>{extractDomain(item.link.url).replace(/^www\./, '')}</span>
                  {#if item.collection !== undefined}
                    <span>{collectionPath(item.collection, workspaces)}</span>
                  {/if}
                  <span>{t('triage_saved_on', shortDate(item.link.createdAt))}</span>
                </p>
              </div>
            </div>
            <button type="button" class="open" on:click={() => open(item)}>
              <Icon name="external" size={15} />{t('triage_open')}
            </button>
          </article>
        {/key}
      </div>

      <div class="decisions">
        {#each DECISIONS as decision (decision.key)}
          <button type="button" class="decision {decision.event}" on:click={() => decide(decision.event)}>
            <Icon name={decision.icon} size={20} />
            <span>{t(decision.label)}</span>
            <Kbd>{decision.key}</Kbd>
          </button>
        {/each}
      </div>
    {:else}
      <div class="finished">
        <p class="finished-title">{total === 0 ? t('triage_empty') : t('triage_done_title')}</p>
        {#if summary !== ''}
          <p class="finished-counts">{summary}</p>
        {/if}
        <Button variant="primary" on:click={() => dispatch('close')}>{t('common_close')}</Button>
      </div>
    {/if}
  </div>
</div>

<style>
  .layer {
    position: fixed;
    inset: 0;
    z-index: 110;
    display: flex;
    justify-content: center;
    align-items: flex-start;
    padding: 110px var(--space-4) var(--space-4);
  }

  .scrim {
    position: absolute;
    inset: 0;
    border: none;
    background: var(--scrim);
    backdrop-filter: blur(6px) saturate(0.9);
    cursor: default;
  }

  .triage {
    position: relative;
    width: min(640px, 100%);
  }

  .head {
    display: flex;
    align-items: center;
    gap: 14px;
    margin-bottom: 18px;
    font-size: var(--text-sm);
    color: var(--text-secondary);
  }

  h2 {
    margin: 0;
    font: 650 22px / 1 var(--font-body);
    letter-spacing: -0.015em;
    color: var(--text-primary);
  }

  .bar {
    flex: 1;
    height: 4px;
    border-radius: 2px;
    background: var(--border-default);
    overflow: hidden;
  }

  .bar i {
    display: block;
    height: 100%;
    background: var(--semantic-warning);
    transition: width var(--duration-normal) var(--ease-out);
  }

  .count {
    font-variant-numeric: tabular-nums;
  }

  .stack {
    position: relative;
    height: 250px;
  }

  .sheet {
    position: absolute;
    inset: 0;
    border: 1px solid var(--border-default);
    border-radius: var(--radius-xl);
    background: var(--surface-elevated);
    box-shadow: var(--shadow-float);
  }

  .back.one {
    transform: translateY(12px) scale(0.96);
    opacity: 0.75;
  }

  .back.two {
    transform: translateY(24px) scale(0.92);
    opacity: 0.45;
  }

  .front {
    display: flex;
    flex-direction: column;
    padding: 28px 30px;
  }

  .why {
    display: inline-flex;
    align-self: flex-start;
    align-items: center;
    gap: var(--space-2);
    height: 28px;
    padding: 0 12px;
    border-radius: 14px;
    background: var(--warning-soft);
    color: var(--semantic-warning);
    font: 600 12.5px / 1 var(--font-body);
  }

  .what {
    display: flex;
    align-items: center;
    gap: 18px;
    margin-top: var(--space-5);
  }

  .what-text {
    min-width: 0;
  }

  .title {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    overflow-wrap: anywhere;
    padding: 0;
    border: none;
    background: transparent;
    color: var(--text-primary);
    font: 650 24px / 1.2 var(--font-body);
    letter-spacing: -0.015em;
    text-align: left;
    cursor: pointer;
  }

  .meta {
    display: flex;
    flex-wrap: wrap;
    gap: 14px;
    margin: var(--space-2) 0 0;
    font-size: var(--text-sm);
    color: var(--text-tertiary);
  }

  .open {
    display: inline-flex;
    align-items: center;
    align-self: flex-start;
    gap: var(--space-2);
    margin-top: auto;
    padding: 0;
    border: none;
    background: transparent;
    color: var(--text-secondary);
    font: 400 var(--text-sm) / 1 var(--font-body);
    cursor: pointer;
  }

  .open:hover {
    color: var(--text-primary);
  }

  .decisions {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 10px;
    margin-top: 44px;
  }

  .decision {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    padding: 14px var(--space-2) 12px;
    border: 1px solid var(--border-default);
    border-radius: var(--radius-lg);
    background: var(--surface-elevated);
    color: var(--text-primary);
    font: 550 var(--text-sm) / 1.2 var(--font-body);
    cursor: pointer;
    transition: border-color var(--duration-fast) var(--ease-out), background-color var(--duration-fast) var(--ease-out);
  }

  .decision:hover {
    border-color: var(--border-strong);
    background: var(--surface-overlay);
  }

  .keep :global(svg),
  .complete :global(svg) {
    color: var(--semantic-success);
  }

  .discard :global(svg) {
    color: var(--accent-primary);
  }

  .reference :global(svg) {
    color: var(--text-secondary);
  }

  .finished {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: var(--space-3);
    padding: 28px 30px;
    border: 1px solid var(--border-default);
    border-radius: var(--radius-xl);
    background: var(--surface-elevated);
    box-shadow: var(--shadow-float);
  }

  .finished-title {
    margin: 0;
    font: 600 34px / 1 var(--font-display);
    color: var(--text-primary);
  }

  .finished-counts {
    margin: 0;
    color: var(--text-secondary);
  }
</style>
