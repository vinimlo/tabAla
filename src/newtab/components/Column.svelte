<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { flip } from 'svelte/animate';
  import { dndzone, SOURCES, TRIGGERS } from 'svelte-dnd-action';
  import type { Collection, Link } from '@/lib/types';
  import { INBOX_COLLECTION_ID } from '@/lib/types';
  import LinkCard from './LinkCard.svelte';

  export let collection: Collection;
  export let links: Link[] = [];
  export let searchQuery: string = '';
  export let dragDisabled: boolean = false;

  const dispatch = createEventDispatcher<{
    openLink: Link;
    removeLink: { id: string; title: string };
    moveLink: { linkId: string; toCollectionId: string };
    renameCollection: { id: string; newName: string };
    deleteCollection: { id: string; name: string; linkCount: number };
    tabDrop: { url: string; title: string; favicon?: string; collectionId: string };
  }>();

  const flipDurationMs = 200;
  let isTabDragOver = false;
  let isEditing = false;
  let editName = '';
  let showMenu = false;
  let menuRef: HTMLDivElement;

  $: isInbox = collection.id === INBOX_COLLECTION_ID;
  $: filteredLinks = searchQuery
    ? links.filter(link =>
        link.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        link.url.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : links;
  $: hasMatches = filteredLinks.length > 0;

  function handleDndConsider(e: CustomEvent): void {
    links = e.detail.items;
  }

  function handleDndFinalize(e: CustomEvent): void {
    links = e.detail.items;

    // Check if this is a drop from another column
    const { source, trigger } = e.detail.info;
    if (source === SOURCES.POINTER && trigger === TRIGGERS.DROPPED_INTO_ZONE) {
      // Find the newly dropped link (one that wasn't in this collection before)
      for (const link of e.detail.items) {
        if (link.collectionId !== collection.id) {
          dispatch('moveLink', {
            linkId: link.id,
            toCollectionId: collection.id,
          });
          break;
        }
      }
    }
  }

  function startEditing(): void {
    if (isInbox) {
      return;
    }
    editName = collection.name;
    isEditing = true;
  }

  function cancelEditing(): void {
    isEditing = false;
    editName = '';
  }

  function saveEditing(): void {
    const trimmed = editName.trim();
    if (trimmed && trimmed !== collection.name) {
      dispatch('renameCollection', { id: collection.id, newName: trimmed });
    }
    isEditing = false;
    editName = '';
  }

  function handleEditKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      saveEditing();
    } else if (event.key === 'Escape') {
      cancelEditing();
    }
  }

  function toggleMenu(): void {
    showMenu = !showMenu;
  }

  function closeMenu(): void {
    showMenu = false;
  }

  function handleDeleteCollection(): void {
    closeMenu();
    dispatch('deleteCollection', {
      id: collection.id,
      name: collection.name,
      linkCount: links.length,
    });
  }

  function handleOpenAll(): void {
    closeMenu();
    for (const link of filteredLinks) {
      dispatch('openLink', link);
    }
  }

  function handleOpenLink(event: CustomEvent<Link>): void {
    dispatch('openLink', event.detail);
  }

  function handleRemoveLink(event: CustomEvent<{ id: string; title: string }>): void {
    dispatch('removeLink', event.detail);
  }

  function handleClickOutside(event: MouseEvent): void {
    if (showMenu && menuRef !== undefined && !menuRef.contains(event.target as Node)) {
      closeMenu();
    }
  }

  function focusOnMount(node: HTMLInputElement): void {
    node.focus();
  }

  function handleNativeDragOver(event: DragEvent): void {
    // Check if this is a tab drag (from sidebar)
    if (event.dataTransfer !== null && event.dataTransfer.types.includes('application/json')) {
      event.preventDefault();
      event.dataTransfer.dropEffect = 'copy';
      isTabDragOver = true;
    }
  }

  function handleNativeDragLeave(): void {
    isTabDragOver = false;
  }

  function handleNativeDrop(event: DragEvent): void {
    isTabDragOver = false;

    if (event.dataTransfer === null) {
      return;
    }

    const jsonData = event.dataTransfer.getData('application/json');
    if (jsonData === '') {
      return;
    }

    try {
      const parsed = JSON.parse(jsonData) as { type?: string; data?: { url: string; title: string; favicon?: string } };
      if (parsed.type === 'tab' && parsed.data !== undefined) {
        event.preventDefault();
        event.stopPropagation();

        dispatch('tabDrop', {
          url: parsed.data.url,
          title: parsed.data.title,
          favicon: parsed.data.favicon,
          collectionId: collection.id,
        });
      }
    } catch (error) {
      console.error('Failed to parse drop data:', error);
    }
  }
</script>

<svelte:window on:click={handleClickOutside} />

{#if searchQuery === '' || hasMatches}
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <div
    class="column"
    class:inbox={isInbox}
    class:tab-drag-over={isTabDragOver}
    on:dragover={handleNativeDragOver}
    on:dragleave={handleNativeDragLeave}
    on:drop={handleNativeDrop}
  >
    <header class="column-header">
      {#if isEditing}
        <input
          type="text"
          class="edit-input"
          bind:value={editName}
          on:keydown={handleEditKeydown}
          on:blur={saveEditing}
          use:focusOnMount
        />
      {:else}
        <button
          type="button"
          class="column-title"
          class:editable={!isInbox}
          on:dblclick={startEditing}
          title={isInbox ? 'Inbox' : 'Clique duplo para renomear'}
        >
          {collection.name}
          <span class="link-count">{filteredLinks.length}</span>
        </button>
      {/if}

      {#if !isInbox}
        <div class="column-menu" bind:this={menuRef}>
          <button
            type="button"
            class="btn-menu"
            on:click|stopPropagation={toggleMenu}
            aria-label="Menu da colecao"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
              <circle cx="12" cy="12" r="1"/>
              <circle cx="12" cy="5" r="1"/>
              <circle cx="12" cy="19" r="1"/>
            </svg>
          </button>

          {#if showMenu}
            <div class="menu-dropdown">
              <button type="button" class="menu-item" on:click={handleOpenAll} disabled={filteredLinks.length === 0}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                  <polyline points="15 3 21 3 21 9"/>
                  <line x1="10" y1="14" x2="21" y2="3"/>
                </svg>
                Abrir todos
              </button>
              <button type="button" class="menu-item menu-item-danger" on:click={handleDeleteCollection}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="3 6 5 6 21 6"/>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                </svg>
                Excluir colecao
              </button>
            </div>
          {/if}
        </div>
      {/if}
    </header>

    <div
      class="column-content"
      use:dndzone={{
        items: filteredLinks,
        flipDurationMs,
        dropTargetStyle: {},
        dropTargetClasses: ['drop-target'],
        dragDisabled: dragDisabled,
        type: 'links',
      }}
      on:consider={handleDndConsider}
      on:finalize={handleDndFinalize}
    >
      {#each filteredLinks as link (link.id)}
        <div animate:flip={{ duration: flipDurationMs }}>
          <LinkCard
            {link}
            on:open={handleOpenLink}
            on:remove={handleRemoveLink}
          />
        </div>
      {:else}
        <div class="empty-column">
          {#if searchQuery}
            <span>Nenhum resultado</span>
          {:else}
            <span>Arraste links aqui</span>
          {/if}
        </div>
      {/each}
    </div>
  </div>
{/if}

<style>
  .column {
    display: flex;
    flex-direction: column;
    width: var(--column-width);
    min-width: var(--column-min-width);
    max-width: var(--column-max-width);
    max-height: calc(100vh - 140px);
    background: var(--bg-secondary);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    flex-shrink: 0;
  }

  .column.inbox {
    border-color: var(--accent-soft);
  }

  .column.tab-drag-over {
    border-color: var(--accent);
    background: var(--accent-soft);
    box-shadow: 0 0 0 2px var(--accent-glow);
  }

  .column-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-3) var(--space-4);
    border-bottom: 1px solid var(--border);
  }

  .column-title {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-1) var(--space-2);
    margin: calc(-1 * var(--space-1)) calc(-1 * var(--space-2));
    background: transparent;
    border: none;
    border-radius: var(--radius-sm);
    color: var(--text-primary);
    font-family: inherit;
    font-size: 0.875rem;
    font-weight: 600;
    cursor: default;
    transition: all var(--duration-fast) var(--ease-out);
  }

  .column-title.editable {
    cursor: pointer;
  }

  .column-title.editable:hover {
    background: var(--bg-tertiary);
  }

  .link-count {
    font-size: 0.6875rem;
    font-weight: 500;
    color: var(--text-tertiary);
    background: var(--bg-tertiary);
    padding: 2px 6px;
    border-radius: var(--radius-full);
  }

  .edit-input {
    flex: 1;
    padding: var(--space-1) var(--space-2);
    background: var(--bg-tertiary);
    border: 1px solid var(--accent);
    border-radius: var(--radius-sm);
    color: var(--text-primary);
    font-family: inherit;
    font-size: 0.875rem;
    font-weight: 600;
  }

  .edit-input:focus {
    outline: none;
    box-shadow: 0 0 0 2px var(--accent-soft);
  }

  .column-menu {
    position: relative;
  }

  .btn-menu {
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
    transition: all var(--duration-fast) var(--ease-out);
  }

  .btn-menu:hover {
    background: var(--bg-tertiary);
    color: var(--text-primary);
  }

  .menu-dropdown {
    position: absolute;
    top: 100%;
    right: 0;
    margin-top: var(--space-1);
    min-width: 160px;
    background: var(--bg-elevated);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-lg);
    z-index: 100;
    overflow: hidden;
  }

  .menu-item {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    width: 100%;
    padding: var(--space-2) var(--space-3);
    background: transparent;
    border: none;
    color: var(--text-secondary);
    font-family: inherit;
    font-size: 0.8125rem;
    text-align: left;
    cursor: pointer;
    transition: all var(--duration-fast) var(--ease-out);
  }

  .menu-item:hover {
    background: var(--bg-tertiary);
    color: var(--text-primary);
  }

  .menu-item:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .menu-item-danger:hover {
    background: rgba(248, 113, 113, 0.1);
    color: var(--error);
  }

  .column-content {
    flex: 1;
    padding: var(--space-3);
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    overflow-y: auto;
    min-height: 100px;
  }

  .column-content::-webkit-scrollbar {
    width: 4px;
  }

  .column-content::-webkit-scrollbar-track {
    background: transparent;
  }

  .column-content::-webkit-scrollbar-thumb {
    background-color: var(--border);
    border-radius: var(--radius-full);
  }

  :global(.column-content.drop-target) {
    background: var(--accent-soft);
    border-radius: var(--radius-md);
  }

  .empty-column {
    display: flex;
    align-items: center;
    justify-content: center;
    flex: 1;
    min-height: 80px;
    color: var(--text-tertiary);
    font-size: 0.8125rem;
    text-align: center;
  }
</style>
