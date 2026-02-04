<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { Collection } from '@/lib/types';
  import { isInboxCollection } from '@/lib/types';
  import { ALL_COLLECTIONS_FILTER } from '@/lib/filters';

  export let collections: Collection[] = [];
  export let selectedId: string | null = ALL_COLLECTIONS_FILTER;
  export let linkCounts: Map<string, number> = new Map();
  export let totalLinks: number = 0;

  const dispatch = createEventDispatcher<{
    select: string;
  }>();

  $: sortedCollections = [...collections].sort((a, b) => {
    if (isInboxCollection(a)) {
      return -1;
    }
    if (isInboxCollection(b)) {
      return 1;
    }
    return a.order - b.order;
  });

  $: isAllSelected = selectedId === ALL_COLLECTIONS_FILTER || selectedId === null;

  function handleSelect(collectionId: string): void {
    dispatch('select', collectionId);
  }

  function handleKeydown(event: KeyboardEvent, collectionId: string): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleSelect(collectionId);
    }
  }

  function getCount(collectionId: string): number {
    return linkCounts.get(collectionId) ?? 0;
  }
</script>

<div class="collection-selector" role="tablist" aria-label="Filtrar por coleção">
  <button
    type="button"
    class="tab"
    class:active={isAllSelected}
    role="tab"
    aria-selected={isAllSelected}
    tabindex={isAllSelected ? 0 : -1}
    on:click={() => handleSelect(ALL_COLLECTIONS_FILTER)}
    on:keydown={(e) => handleKeydown(e, ALL_COLLECTIONS_FILTER)}
  >
    <span class="tab-name">Todas</span>
    <span class="tab-count">{totalLinks}</span>
  </button>

  {#each sortedCollections as collection (collection.id)}
    {@const isActive = selectedId === collection.id}
    {@const isInbox = isInboxCollection(collection)}
    <button
      type="button"
      class="tab"
      class:active={isActive}
      class:inbox={isInbox}
      role="tab"
      aria-selected={isActive}
      tabindex={isActive ? 0 : -1}
      on:click={() => handleSelect(collection.id)}
      on:keydown={(e) => handleKeydown(e, collection.id)}
    >
      <span class="tab-name">{collection.name}</span>
      <span class="tab-count">{getCount(collection.id)}</span>
    </button>
  {/each}
</div>

<style>
  .collection-selector[role="tablist"] {
    display: flex;
    gap: var(--space-1);
    padding: 0;
    overflow-x: auto;
    scrollbar-width: none;
    -ms-overflow-style: none;
    flex-shrink: 0;
    position: relative;
    /* Scroll indicators via gradient masks */
    mask-image: linear-gradient(
      to right,
      transparent 0,
      black 8px,
      black calc(100% - 8px),
      transparent 100%
    );
    -webkit-mask-image: linear-gradient(
      to right,
      transparent 0,
      black 8px,
      black calc(100% - 8px),
      transparent 100%
    );
  }

  .collection-selector::-webkit-scrollbar {
    display: none;
  }

  .tab {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-2) var(--space-3);
    border: none;
    border-radius: var(--radius-full);
    background: transparent;
    color: var(--text-secondary);
    font-family: var(--font-body);
    font-size: var(--text-xs);
    font-weight: 500;
    letter-spacing: 0.02em;
    white-space: nowrap;
    cursor: pointer;
    transition: all var(--duration-fast) var(--ease-out);
    flex-shrink: 0;
    min-height: 32px;
  }

  .tab:hover {
    background: var(--surface-overlay);
    color: var(--text-primary);
  }

  .tab:focus {
    outline: none;
  }

  .tab:focus-visible {
    outline: 2px solid var(--accent-primary);
    outline-offset: 2px;
  }

  .tab.active {
    background: var(--accent-soft);
    color: var(--accent-primary);
  }

  .tab.active .tab-count {
    color: var(--accent-primary);
    background: rgba(232, 93, 66, 0.15);
  }

  .tab.inbox .tab-name {
    font-weight: 600;
  }

  .tab-name {
    text-transform: lowercase;
  }

  .tab-count {
    font-family: var(--font-mono);
    font-size: 0.625rem;
    font-weight: 500;
    color: var(--text-tertiary);
    font-variant-numeric: tabular-nums;
    min-width: 18px;
    text-align: center;
    background: var(--surface-subtle);
    padding: 2px 6px;
    border-radius: var(--radius-full);
    transition: all var(--duration-fast) var(--ease-out);
  }
</style>
