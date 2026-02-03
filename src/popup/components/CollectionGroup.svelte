<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { slide } from 'svelte/transition';
  import type { Link, Collection } from '@/lib/types';
  import LinkItem from './LinkItem.svelte';
  import EditableCollectionName from './EditableCollectionName.svelte';

  export let collection: Collection;
  export let links: Link[];
  export let expanded: boolean = true;
  export let renameError: string | null = null;
  export let isRenaming: boolean = false;

  const dispatch = createEventDispatcher<{
    open: Link;
    remove: string;
    toggle: string;
    rename: { id: string; newName: string };
    cancelRename: string;
  }>();

  let editableNameRef: EditableCollectionName;

  function toggleExpanded(): void {
    if (editableNameRef?.isEditing()) return;
    dispatch('toggle', collection.id);
  }

  function handleOpen(event: CustomEvent<Link>): void {
    dispatch('open', event.detail);
  }

  function handleRemove(event: CustomEvent<string>): void {
    dispatch('remove', event.detail);
  }

  function handleKeydown(event: KeyboardEvent): void {
    if (editableNameRef?.isEditing()) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      toggleExpanded();
    }
  }

  function handleRename(event: CustomEvent<string>): void {
    dispatch('rename', { id: collection.id, newName: event.detail });
  }

  function handleCancelRename(): void {
    dispatch('cancelRename', collection.id);
  }

  export function exitEditMode(): void {
    editableNameRef?.exitEditMode();
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
    <EditableCollectionName
      bind:this={editableNameRef}
      name={collection.name}
      error={renameError}
      saving={isRenaming}
      on:save={handleRename}
      on:cancel={handleCancelRename}
    />
    <span class="count">{links.length}</span>
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

  .count {
    font-size: 0.6875rem;
    font-weight: 500;
    color: var(--text-tertiary);
    font-variant-numeric: tabular-nums;
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
