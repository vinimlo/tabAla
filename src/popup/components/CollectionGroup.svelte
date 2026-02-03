<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { slide } from 'svelte/transition';
  import type { Link, Collection } from '@/lib/types';
  import { isInboxCollection } from '@/lib/types';
  import LinkItem from './LinkItem.svelte';
  import EditableCollectionName from './EditableCollectionName.svelte';

  export let collection: Collection;
  export let links: Link[];
  export let expanded: boolean = true;
  export let isDeleting: boolean = false;
  export let renameError: string | null = null;
  export let isRenaming: boolean = false;

  $: canDelete = !isInboxCollection(collection);

  const dispatch = createEventDispatcher<{
    open: Link;
    remove: string;
    toggle: string;
    deleteCollection: { id: string; name: string; linkCount: number };
    rename: { id: string; newName: string };
    cancelRename: string;
  }>();

  let editableNameRef: EditableCollectionName;

  function toggleExpanded(): void {
    if (editableNameRef?.isEditing() === true) {
      return;
    }
    dispatch('toggle', collection.id);
  }

  function handleOpen(event: CustomEvent<Link>): void {
    dispatch('open', event.detail);
  }

  function handleRemove(event: CustomEvent<string>): void {
    dispatch('remove', event.detail);
  }

  function handleKeydown(event: KeyboardEvent): void {
    if (editableNameRef?.isEditing() === true) {
      return;
    }
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
    margin-bottom: var(--space-2);
    background: var(--surface-elevated);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-xl);
    overflow: hidden;
  }

  .header {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-3) var(--space-4);
    min-height: 52px;
    cursor: pointer;
    user-select: none;
    transition: background-color var(--duration-fast) var(--ease-out);
  }

  .header:hover {
    background-color: var(--surface-overlay);
  }

  .header:focus {
    outline: none;
    background-color: var(--surface-overlay);
  }

  .header:focus-visible {
    outline: 2px solid var(--accent-primary);
    outline-offset: -2px;
  }

  .dot {
    width: 8px;
    height: 8px;
    border-radius: var(--radius-full);
    background-color: var(--text-tertiary);
    transition: all var(--duration-fast) var(--ease-out);
    flex-shrink: 0;
    transform: rotate(0deg);
  }

  .dot.expanded {
    background-color: var(--accent-primary);
    box-shadow: 0 0 10px var(--accent-glow);
    transform: rotate(90deg);
  }

  .count {
    font-family: var(--font-mono);
    font-size: var(--text-xs);
    font-weight: 500;
    color: var(--text-tertiary);
    font-variant-numeric: tabular-nums;
    background: var(--surface-subtle);
    padding: 2px 8px;
    border-radius: var(--radius-full);
    min-width: 24px;
    text-align: center;
  }

  .delete-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    padding: 0;
    background: transparent;
    border: none;
    border-radius: var(--radius-sm);
    color: var(--text-tertiary);
    cursor: pointer;
    opacity: 0;
    transform: translateX(4px);
    transition: all var(--duration-fast) var(--ease-out);
    flex-shrink: 0;
  }

  .header:hover .delete-btn {
    opacity: 1;
    transform: translateX(0);
  }

  .delete-btn:hover {
    color: var(--semantic-error);
    background-color: rgba(212, 114, 106, 0.12);
  }

  .delete-btn:focus {
    outline: none;
    opacity: 1;
    transform: translateX(0);
  }

  .delete-btn:focus-visible {
    outline: 2px solid var(--accent-primary);
    outline-offset: 2px;
  }

  .delete-btn:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }

  .delete-btn.deleting {
    opacity: 1;
    transform: translateX(0);
  }

  .delete-btn .spinner {
    width: 14px;
    height: 14px;
    border: 2px solid var(--border-subtle);
    border-top-color: var(--accent-primary);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .links {
    padding: 0 var(--space-3) var(--space-3) var(--space-3);
    border-top: 1px solid var(--border-subtle);
  }

  .link-wrapper {
    animation: linkFadeIn var(--duration-normal) var(--ease-out) forwards;
    animation-delay: var(--link-delay, 0ms);
    opacity: 0;
    transform: translateY(4px);
  }

  @keyframes linkFadeIn {
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  /* Reduced motion support */
  @media (prefers-reduced-motion: reduce) {
    .dot {
      transition: none;
    }
    .link-wrapper {
      animation: none;
      opacity: 1;
      transform: none;
    }
  }
</style>
