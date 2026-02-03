<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { Link, Collection } from '@/lib/types';
  import LinkItem from './LinkItem.svelte';

  export let collection: Collection;
  export let links: Link[];
  export let expanded: boolean = true;

  const dispatch = createEventDispatcher<{
    open: Link;
    remove: string;
    toggle: string;
  }>();

  function toggleExpanded(): void {
    dispatch('toggle', collection.id);
  }

  function handleOpen(event: CustomEvent<Link>): void {
    dispatch('open', event.detail);
  }

  function handleRemove(event: CustomEvent<string>): void {
    dispatch('remove', event.detail);
  }

  function handleKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      toggleExpanded();
    }
  }
</script>

<section class="collection-group">
  <header
    class="header"
    role="button"
    tabindex="0"
    aria-expanded={expanded}
    on:click={toggleExpanded}
    on:keydown={handleKeydown}
  >
    <svg
      class="chevron"
      class:expanded
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="currentColor"
    >
      <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>
    </svg>
    <span class="name">{collection.name}</span>
    <span class="count">{links.length}</span>
  </header>

  {#if expanded && links.length > 0}
    <div class="links">
      {#each links as link (link.id)}
        <LinkItem
          {link}
          on:open={handleOpen}
          on:remove={handleRemove}
        />
      {/each}
    </div>
  {/if}
</section>

<style>
  .collection-group {
    margin-bottom: 4px;
  }

  .header {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    border-radius: 6px;
    cursor: pointer;
    user-select: none;
    transition: background-color 0.15s ease;
  }

  .header:hover {
    background-color: #f5f5f5;
  }

  .header:focus {
    outline: 2px solid #666;
    outline-offset: -2px;
  }

  .chevron {
    flex-shrink: 0;
    color: #666;
    transform: rotate(0deg);
    transition: transform 0.15s ease;
  }

  .chevron.expanded {
    transform: rotate(90deg);
  }

  .name {
    flex: 1;
    font-size: 13px;
    font-weight: 600;
    color: #444;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .count {
    font-size: 12px;
    font-weight: 500;
    color: #888;
    background-color: #f0f0f0;
    padding: 2px 8px;
    border-radius: 10px;
  }

  .links {
    padding-left: 8px;
  }
</style>
