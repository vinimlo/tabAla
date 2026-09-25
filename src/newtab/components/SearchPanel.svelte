<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import { t } from '@/lib/i18n';
  import type { Collection, Link, Workspace } from '@/lib/types';
  import { LINK_KINDS, type LinkKind } from '@/lib/link-kind';
  import { buildIndex, search, type SearchHit } from '@/lib/search/engine';
  import { displayNames, hitPath, KIND_LABEL_KEYS } from '@/lib/search/labels';
  import { extractDomain } from '@/lib/tabs';
  import type { TranslateQuery } from '@/lib/ai/translator';

  export let links: Link[] = [];
  export let collections: Collection[] = [];
  export let workspaces: Workspace[] = [];
  /** Shown with "nothing found" when topic search is off but available. */
  export let topicSearchHint = false;
  /** Translates the query into English; null keeps the search in the typed language. */
  export let translate: TranslateQuery | null = null;

  let translatedQuery: string | null = null;

  async function requestTranslation(current: string, translator: TranslateQuery | null): Promise<void> {
    translatedQuery = null;
    if (translator === null || current.trim() === '') {
      return;
    }
    const translated = await translator(current);
    if (current === query) {
      translatedQuery = translated;
    }
  }

  $: void requestTranslation(query, translate);

  const dispatch = createEventDispatcher<{
    open: Link;
    openInNewTab: Link;
    reveal: Link;
    close: void;
  }>();

  let query = '';
  let selectedKinds: LinkKind[] = [];
  let activeIndex = 0;
  let input: HTMLInputElement;

  $: index = buildIndex(links, collections, workspaces, displayNames);
  $: result = search(index, translatedQuery === null ? query : [query, translatedQuery], { kinds: selectedKinds });
  $: showingPartial = result.results.length === 0 && result.partial.length > 0;
  $: hits = showingPartial ? result.partial : result.results;
  $: chipKinds = LINK_KINDS.filter(
    (kind) => (result.kindCounts[kind] ?? 0) > 0 || selectedKinds.includes(kind)
  );
  $: if (activeIndex > Math.max(hits.length - 1, 0)) {
    activeIndex = Math.max(hits.length - 1, 0);
  }
  $: searching = query.trim() !== '' || selectedKinds.length > 0;

  onMount(() => {
    input.focus();
  });

  function toggleKind(kind: LinkKind): void {
    selectedKinds = selectedKinds.includes(kind)
      ? selectedKinds.filter((k) => k !== kind)
      : [...selectedKinds, kind];
    activeIndex = 0;
  }

  function choose(hit: SearchHit | undefined, modifiers: { metaKey: boolean; ctrlKey: boolean; shiftKey: boolean }): void {
    if (hit === undefined) {
      return;
    }
    if (modifiers.shiftKey) {
      dispatch('reveal', hit.link);
    } else if (modifiers.metaKey || modifiers.ctrlKey) {
      dispatch('openInNewTab', hit.link);
    } else {
      dispatch('open', hit.link);
    }
  }

  function handleKeydown(event: KeyboardEvent): void {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      activeIndex = Math.min(activeIndex + 1, Math.max(hits.length - 1, 0));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      activeIndex = Math.max(activeIndex - 1, 0);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      choose(hits[activeIndex], event);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      dispatch('close');
    }
  }
</script>

<div class="search-overlay">
  <button
    type="button"
    class="search-backdrop"
    tabindex="-1"
    aria-label={t('common_close')}
    on:click={() => dispatch('close')}
  ></button>

  <div class="search-panel" role="dialog" aria-modal="true" aria-label={t('search_dialog_label')}>
    <input
      bind:this={input}
      bind:value={query}
      on:input={() => (activeIndex = 0)}
      on:keydown={handleKeydown}
      class="search-field"
      type="text"
      placeholder={t('search_placeholder')}
      aria-controls="search-results"
    />

    {#if chipKinds.length > 0}
      <div class="kind-chips">
        {#each chipKinds as kind (kind)}
          <button
            type="button"
            class="kind-chip"
            class:active={selectedKinds.includes(kind)}
            aria-pressed={selectedKinds.includes(kind)}
            on:mousedown|preventDefault
            on:click={() => toggleKind(kind)}
          >
            {t(KIND_LABEL_KEYS[kind])}
            <span class="chip-count">{result.kindCounts[kind] ?? 0}</span>
          </button>
        {/each}
      </div>
    {/if}

    {#if showingPartial}
      <p class="section-label">{t('search_partial')}</p>
    {/if}

    <ul id="search-results" class="results" role="listbox">
      {#each hits as hit, i (hit.link.id)}
        <li role="option" aria-selected={i === activeIndex} class:active={i === activeIndex}>
          <button
            type="button"
            class="hit"
            tabindex="-1"
            on:mousedown|preventDefault
            on:click={(event) => choose(hit, event)}
            on:mousemove={() => (activeIndex = i)}
          >
            <span class="hit-favicon">
              {#if hit.link.favicon}
                <img src={hit.link.favicon} alt="" width="16" height="16" loading="lazy" />
              {/if}
            </span>
            <span class="hit-body">
              <span class="hit-title">{hit.link.title || hit.link.url}</span>
              <span class="hit-meta">
                <span class="hit-path">{hitPath(hit)}</span>
                <span class="hit-kind">{t(KIND_LABEL_KEYS[hit.kind])}</span>
                <span class="hit-domain">{extractDomain(hit.link.url).replace(/^www\./, '')}</span>
                {#if hit.link.completedAt !== undefined}
                  <span class="hit-completed">{t('search_completed_badge')}</span>
                {/if}
              </span>
              {#if hit.tags.length > 0}
                <span class="hit-tags">
                  {#each hit.tags as tag (tag)}
                    <span class="hit-tag" class:matched={hit.matchedTags.includes(tag)}>{tag}</span>
                  {/each}
                </span>
              {/if}
            </span>
          </button>
        </li>
      {/each}
    </ul>

    {#if hits.length === 0 && searching}
      <p class="empty">{t('search_empty')}</p>
      {#if topicSearchHint}
        <p class="empty-hint">{t('search_enable_topic_hint')}</p>
      {/if}
    {/if}

    <p class="keys-hint">{t('search_hint_keys')}</p>
  </div>
</div>

<style>
  .search-overlay {
    position: fixed;
    inset: 0;
    z-index: 100;
    display: flex;
    justify-content: center;
    align-items: flex-start;
    padding-top: 12vh;
  }

  .search-backdrop {
    position: absolute;
    inset: 0;
    border: none;
    background: rgba(0, 0, 0, 0.45);
    cursor: default;
  }

  .search-panel {
    position: relative;
    width: min(640px, 92vw);
    max-height: 70vh;
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    padding: var(--space-4);
    background: var(--surface-elevated);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-xl);
    box-shadow: var(--shadow-card-hover);
  }

  .search-field {
    width: 100%;
    height: 48px;
    padding: 0 var(--space-4);
    background: var(--surface-overlay);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-lg);
    color: var(--text-primary);
    font-family: var(--font-body);
    font-size: var(--text-md);
  }

  .search-field:focus {
    outline: none;
    border-color: var(--accent-primary);
    box-shadow: 0 0 0 3px var(--accent-soft);
  }

  .kind-chips {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
  }

  .kind-chip {
    display: inline-flex;
    align-items: center;
    gap: var(--space-1);
    padding: 4px 10px;
    background: var(--surface-overlay);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-full);
    color: var(--text-secondary);
    font-family: var(--font-body);
    font-size: var(--text-xs);
    cursor: pointer;
  }

  .kind-chip.active {
    border-color: var(--accent-primary);
    color: var(--text-primary);
    background: var(--accent-soft);
  }

  .chip-count {
    color: var(--text-tertiary);
  }

  .section-label,
  .empty,
  .empty-hint,
  .keys-hint {
    margin: 0;
    font-family: var(--font-body);
    font-size: var(--text-xs);
    color: var(--text-tertiary);
  }

  .empty {
    font-size: var(--text-sm);
    color: var(--text-secondary);
  }

  .results {
    list-style: none;
    margin: 0;
    padding: 0;
    overflow-y: auto;
  }

  .results li.active .hit {
    background: var(--surface-overlay);
    border-color: var(--border-default);
  }

  .hit {
    width: 100%;
    display: flex;
    gap: var(--space-3);
    padding: var(--space-2) var(--space-3);
    background: transparent;
    border: 1px solid transparent;
    border-radius: var(--radius-md);
    color: inherit;
    font: inherit;
    text-align: left;
    cursor: pointer;
  }

  .hit-favicon {
    flex-shrink: 0;
    width: 16px;
    height: 16px;
    margin-top: 2px;
  }

  .hit-body {
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .hit-title {
    font-family: var(--font-body);
    font-size: var(--text-sm);
    color: var(--text-primary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .hit-meta,
  .hit-tags {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
    font-family: var(--font-body);
    font-size: var(--text-xs);
    color: var(--text-tertiary);
  }

  .hit-tag {
    padding: 0 6px;
    border-radius: var(--radius-full);
    background: var(--surface-overlay);
  }

  .hit-tag.matched {
    color: var(--text-primary);
    background: var(--accent-soft);
  }

  .hit-completed {
    color: var(--semantic-success);
  }
</style>
