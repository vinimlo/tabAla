<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { slide } from 'svelte/transition';
  import type { Link, Collection } from '@/lib/types';
  import { isInboxCollection } from '@/lib/types';
  import LinkItem from './LinkItem.svelte';

  export let collection: Collection;
  export let links: Link[];
  export let expanded: boolean = true;
  export let isDeleting: boolean = false;

  $: canDelete = !isInboxCollection(collection);

  const dispatch = createEventDispatcher<{
    open: Link;
    remove: string;
    toggle: string;
    deleteCollection: { id: string; name: string; linkCount: number };
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

  function handleDeleteClick(event: MouseEvent): void {
    event.stopPropagation();
    if (!canDelete || isDeleting) {
      return;
    }
    dispatch('deleteCollection', {
      id: collection.id,
      name: collection.name,
      linkCount: links.length,
    });
  }

  function handleDeleteKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      event.stopPropagation();
      if (!canDelete || isDeleting) {
        return;
      }
      dispatch('deleteCollection', {
        id: collection.id,
        name: collection.name,
        linkCount: links.length,
      });
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
    <span class="dot" class:expanded></span>
    <span class="name">{collection.name}</span>
    <span class="count">{links.length}</span>
    {#if canDelete}
      <button
        class="delete-btn"
        class:deleting={isDeleting}
        on:click={handleDeleteClick}
        on:keydown={handleDeleteKeydown}
        disabled={isDeleting}
        title="Excluir coleção"
        aria-label="Excluir coleção {collection.name}"
        type="button"
      >
        {#if isDeleting}
          <span class="spinner"></span>
        {:else}
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          </svg>
        {/if}
      </button>
    {/if}
  </header>

  {#if expanded && links.length > 0}
    <div
      class="links"
      transition:slide={{ duration: 250, easing: t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2 }}
    >
      {#each links as link, i (link.id)}
        <div class="link-wrapper" style="--link-delay: {i * 30}ms">
          <LinkItem
            {link}
            on:open={handleOpen}
            on:remove={handleRemove}
          />
        </div>
      {/each}
    </div>
  {/if}
</section>

<style>
  .collection-group {
    margin-bottom: var(--space-1);
  }

  .header {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-2) var(--space-3);
    border-radius: var(--radius-sm);
    cursor: pointer;
    user-select: none;
    transition: background-color var(--duration-fast) var(--ease-out);
  }

  .header:hover {
    background-color: var(--bg-secondary);
  }

  .header:focus {
    outline: none;
    background-color: var(--bg-secondary);
  }

  .header:focus-visible {
    outline: 1px solid var(--accent);
    outline-offset: -1px;
  }

  .dot {
    width: 6px;
    height: 6px;
    border-radius: var(--radius-full);
    background-color: var(--text-tertiary);
    transition: all var(--duration-fast) var(--ease-out);
    flex-shrink: 0;
  }

  .dot.expanded {
    background-color: var(--accent);
    box-shadow: 0 0 8px var(--accent-glow);
  }

  .name {
    flex: 1;
    font-size: 0.75rem;
    font-weight: 500;
    color: var(--text-secondary);
    text-transform: lowercase;
    letter-spacing: 0.02em;
    transition: color var(--duration-fast) var(--ease-out);
  }

  .header:hover .name {
    color: var(--text-primary);
  }

  .count {
    font-size: 0.6875rem;
    font-weight: 500;
    color: var(--text-tertiary);
    font-variant-numeric: tabular-nums;
  }

  .delete-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    padding: 0;
    background: transparent;
    border: none;
    border-radius: var(--radius-sm);
    color: var(--text-tertiary);
    cursor: pointer;
    opacity: 0;
    transition: all var(--duration-fast) var(--ease-out);
    flex-shrink: 0;
  }

  .header:hover .delete-btn {
    opacity: 1;
  }

  .delete-btn:hover {
    color: var(--error);
    background-color: rgba(248, 113, 113, 0.1);
  }

  .delete-btn:focus {
    outline: none;
    opacity: 1;
  }

  .delete-btn:focus-visible {
    outline: 1px solid var(--accent);
  }

  .delete-btn:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }

  .delete-btn.deleting {
    opacity: 1;
  }

  .delete-btn .spinner {
    width: 12px;
    height: 12px;
    border: 2px solid var(--border);
    border-top-color: var(--accent);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .links {
    padding-left: var(--space-4);
    padding-top: var(--space-1);
  }

  .link-wrapper {
    animation: linkFadeIn var(--duration-normal) var(--ease-out) forwards;
    animation-delay: var(--link-delay, 0ms);
    opacity: 0;
  }

  @keyframes linkFadeIn {
    to {
      opacity: 1;
    }
  }
</style>
