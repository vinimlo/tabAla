<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { flip } from 'svelte/animate';
  import { dndzone } from 'svelte-dnd-action';
  import type { Collection, Link } from '@/lib/types';
  import { INBOX_COLLECTION_ID } from '@/lib/types';
  import { linksStore } from '@/lib/stores/links';
  import { openLinkInNewTab } from '@/lib/tabs';
  import Column from './Column.svelte';

  export let collections: Collection[] = [];
  export let linksByCollection: Map<string, Link[]>;
  export let searchQuery: string = '';

  const dispatch = createEventDispatcher<{
    removeLink: { id: string; title: string };
    error: string;
    success: string;
    tabDrop: { url: string; title: string; favicon?: string; collectionId: string };
  }>();

  const flipDurationMs = 200;

  // Prepare collections with their links for DnD
  $: columnsWithLinks = collections.map(collection => ({
    ...collection,
    links: linksByCollection.get(collection.id) ?? [],
  }));

  // Filter out hidden columns (no matches in search)
  $: visibleColumns = searchQuery
    ? columnsWithLinks.filter(col => {
        const hasMatches = col.links.some(link =>
          link.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          link.url.toLowerCase().includes(searchQuery.toLowerCase())
        );
        return hasMatches || col.id === INBOX_COLLECTION_ID;
      })
    : columnsWithLinks;

  function handleColumnDndConsider(e: CustomEvent): void {
    columnsWithLinks = e.detail.items;
  }

  function handleColumnDndFinalize(e: CustomEvent): void {
    columnsWithLinks = e.detail.items;
    // Update collection order in store
    const reordered = columnsWithLinks.map(({ links: _links, ...col }) => col as Collection);
    void linksStore.reorderCollections(reordered);
  }

  async function handleOpenLink(event: CustomEvent<Link>): Promise<void> {
    const link = event.detail;
    const result = await openLinkInNewTab(link.url);
    if (!result.success) {
      dispatch('error', result.error ?? 'Erro ao abrir link');
    }
  }

  function handleRemoveLink(event: CustomEvent<{ id: string; title: string }>): void {
    dispatch('removeLink', event.detail);
  }

  async function handleMoveLink(event: CustomEvent<{ linkId: string; toCollectionId: string }>): Promise<void> {
    const { linkId, toCollectionId } = event.detail;
    try {
      await linksStore.moveLink(linkId, toCollectionId);
    } catch (err) {
      dispatch('error', 'Erro ao mover link');
    }
  }

  async function handleRenameCollection(event: CustomEvent<{ id: string; newName: string }>): Promise<void> {
    const { id, newName } = event.detail;
    try {
      await linksStore.renameCollection(id, newName);
    } catch (err) {
      dispatch('error', 'Erro ao renomear colecao');
    }
  }

  async function handleDeleteCollection(event: CustomEvent<{ id: string; name: string; linkCount: number }>): Promise<void> {
    const { id, name, linkCount } = event.detail;
    try {
      await linksStore.removeCollection(id);
      if (linkCount > 0) {
        dispatch('success', `Colecao "${name}" excluida. ${linkCount} links movidos para Inbox.`);
      } else {
        dispatch('success', `Colecao "${name}" excluida.`);
      }
    } catch (err) {
      dispatch('error', 'Erro ao excluir colecao');
    }
  }

  function handleTabDrop(event: CustomEvent<{ url: string; title: string; favicon?: string; collectionId: string }>): void {
    dispatch('tabDrop', event.detail);
  }
</script>

<div class="kanban-board">
  <div
    class="columns-container"
    use:dndzone={{
      items: columnsWithLinks,
      flipDurationMs,
      type: 'columns',
      dropTargetStyle: {},
    }}
    on:consider={handleColumnDndConsider}
    on:finalize={handleColumnDndFinalize}
  >
    {#each columnsWithLinks as column (column.id)}
      <div class="column-wrapper" animate:flip={{ duration: flipDurationMs }}>
        <Column
          collection={column}
          links={column.links}
          {searchQuery}
          on:openLink={handleOpenLink}
          on:removeLink={handleRemoveLink}
          on:moveLink={handleMoveLink}
          on:renameCollection={handleRenameCollection}
          on:deleteCollection={handleDeleteCollection}
          on:tabDrop={handleTabDrop}
        />
      </div>
    {/each}
  </div>

  {#if searchQuery && visibleColumns.length === 0}
    <div class="no-results">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="11" cy="11" r="8"/>
        <path d="M21 21l-4.35-4.35"/>
        <path d="M8 8l6 6M14 8l-6 6"/>
      </svg>
      <p>Nenhum link encontrado para "{searchQuery}"</p>
    </div>
  {/if}
</div>

<style>
  .kanban-board {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    padding: var(--space-4);
  }

  .columns-container {
    display: flex;
    gap: var(--column-gap);
    overflow-x: auto;
    padding-bottom: var(--space-4);
    flex: 1;
    align-items: flex-start;
  }

  .columns-container::-webkit-scrollbar {
    height: 8px;
  }

  .columns-container::-webkit-scrollbar-track {
    background: var(--bg-secondary);
    border-radius: var(--radius-full);
  }

  .columns-container::-webkit-scrollbar-thumb {
    background-color: var(--border);
    border-radius: var(--radius-full);
  }

  .columns-container::-webkit-scrollbar-thumb:hover {
    background-color: var(--border-hover);
  }

  .column-wrapper {
    flex-shrink: 0;
  }

  .no-results {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--space-4);
    flex: 1;
    color: var(--text-tertiary);
  }

  .no-results svg {
    opacity: 0.4;
  }

  .no-results p {
    margin: 0;
    font-size: 0.9375rem;
  }
</style>
