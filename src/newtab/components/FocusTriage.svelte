<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { plural, t } from '@/lib/i18n';
  import type { Link, Workspace } from '@/lib/types';
  import type { TriageItem } from '@/lib/recommend/triage';
  import { shortDate } from '@/lib/recommend/dates';
  import { isEditable } from '../shortcuts';
  import { TRIAGE_KEYS, collectionPath } from '../next-up-labels';

  export let items: TriageItem[];
  export let workspaces: Workspace[] = [];
  /** All links: an opened link leaves triage, but stays on screen until decided. */
  export let links: Link[] = [];
  /** False while a dialog or the search is open: keys 1–4 then belong to it. */
  export let keyboard = true;

  const dispatch = createEventDispatcher<{
    keep: Link;
    discard: Link;
    reference: Link;
    complete: Link;
    open: { link: Link; newTab: boolean };
  }>();

  const DECISIONS = [
    { key: '1', event: 'keep', label: 'triage_keep' },
    { key: '2', event: 'discard', label: 'progress_discard' },
    { key: '3', event: 'reference', label: 'progress_mark_reference' },
    { key: '4', event: 'complete', label: 'triage_already_done' },
  ] as const;

  type Decision = (typeof DECISIONS)[number]['event'];

  /** The link opened from triage: opening renews it, so it leaves `items`. */
  let pinned: TriageItem | null = null;

  $: current = resolveCurrent(pinned, items, links);

  function resolveCurrent(held: TriageItem | null, list: TriageItem[], all: Link[]): TriageItem | undefined {
    if (held !== null) {
      const live = all.find((link) => link.id === held.link.id);
      if (live !== undefined && live.completedAt === undefined && live.reference !== true) {
        return list.find((item) => item.link.id === live.id) ?? { ...held, link: live };
      }
    }
    return list[0];
  }

  function decide(decision: Decision): void {
    if (current !== undefined) {
      pinned = null;
      dispatch(decision, current.link);
    }
  }

  function open(item: TriageItem): void {
    pinned = item;
    dispatch('open', { link: item.link, newTab: true });
  }

  /** A dialog, the search or a menu owns the keyboard while it is open. */
  function overlayOpen(): boolean {
    return document.querySelector('[role="dialog"], [role="menu"]') !== null;
  }

  function handleKeydown(event: KeyboardEvent): void {
    if (!keyboard || event.repeat || current === undefined || isEditable(event.target)
      || event.metaKey || event.ctrlKey || event.altKey || overlayOpen()) {
      return;
    }
    const decision = DECISIONS.find((d) => d.key === event.key);
    if (decision !== undefined) {
      event.preventDefault();
      decide(decision.event);
    }
  }
</script>

<svelte:window on:keydown={handleKeydown} />

<section id="focus-triage" class="focus-section" aria-labelledby="focus-triage-title">
  <h2 id="focus-triage-title">{t('focus_triage_title')}</h2>
  {#if current === undefined}
    <p class="focus-empty">{t('triage_empty')}</p>
  {:else}
    <p class="triage-left">{plural(items.length, 'triage_left_one', 'triage_left_many')}</p>
    <article class="triage-card">
      <p class="triage-reason">{t(TRIAGE_KEYS[current.reason])}</p>
      <button type="button" class="triage-title" on:click={() => open(current)}>
        {current.link.title || current.link.url}
      </button>
      <p class="triage-meta">
        {#if current.collection !== undefined}{collectionPath(current.collection, workspaces)} · {/if}{t('triage_saved_on', shortDate(current.link.createdAt))}
      </p>
      <div class="triage-decisions">
        {#each DECISIONS as decision (decision.key)}
          <button type="button" on:click={() => decide(decision.event)}>
            <kbd>{decision.key}</kbd> {t(decision.label)}
          </button>
        {/each}
      </div>
    </article>
  {/if}
</section>

<style>
  .triage-left {
    margin: 0 0 var(--space-2);
    font-size: var(--text-xs);
    color: var(--text-tertiary);
  }

  .triage-card {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    padding: var(--space-4);
    background: var(--surface-elevated);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-lg);
  }

  .triage-reason {
    margin: 0;
    font-size: var(--text-sm);
    color: var(--accent-primary);
  }

  .triage-title {
    padding: 0;
    border: none;
    background: transparent;
    color: var(--text-primary);
    font-family: var(--font-body);
    font-size: var(--text-md);
    font-weight: 500;
    text-align: left;
    cursor: pointer;
    word-break: break-word;
  }

  .triage-title:hover {
    color: var(--accent-primary);
  }

  .triage-meta {
    margin: 0;
    font-size: var(--text-xs);
    color: var(--text-tertiary);
  }

  .triage-decisions {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
    margin-top: var(--space-2);
  }

  .triage-decisions button {
    padding: var(--space-1) var(--space-3);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-md);
    background: transparent;
    color: var(--text-primary);
    font-family: var(--font-body);
    font-size: var(--text-sm);
    cursor: pointer;
  }

  .triage-decisions button:hover {
    border-color: var(--accent-primary);
  }

  kbd {
    font-family: var(--font-mono);
    font-size: var(--text-xs);
    color: var(--text-tertiary);
  }
</style>
