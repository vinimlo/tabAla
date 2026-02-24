<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { flip } from 'svelte/animate';
  import { dndzone } from 'svelte-dnd-action';
  import { t } from '@lib/i18n';
  import type { Collection, Link, Workspace } from '@/lib/types';
  import { INBOX_COLLECTION_ID } from '@/lib/types';
  import { linksStore } from '@/lib/stores/links';
  import { workspacesStore } from '@/lib/stores/workspaces';
  import { openLinkInNewTab, openLinkInCurrentTab } from '@/lib/tabs';
  import Column from './Column.svelte';

  export let collections: Collection[] = [];
  export let linksByCollection: Map<string, Link[]>;
  export let searchQuery: string = '';
  export let workspaces: Workspace[] = [];
  export let currentWorkspaceId: string = '';

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
    const result = await openLinkInCurrentTab(link.url);
    if (!result.success) {
      dispatch('error', result.error ?? t('error_open_link_failed'));
    }
  }

  async function handleOpenLinkInNewTab(event: CustomEvent<Link>): Promise<void> {
    const link = event.detail;
    const result = await openLinkInNewTab(link.url);
    if (!result.success) {
      dispatch('error', result.error ?? t('error_open_link_failed'));
    }
  }

  async function handleMoveLink(event: CustomEvent<{ linkId: string; toCollectionId: string }>): Promise<void> {
    const { linkId, toCollectionId } = event.detail;
    try {
      await linksStore.moveLink(linkId, toCollectionId);
    } catch (_err) {
      dispatch('error', t('error_move_link_failed'));
    }
  }

  async function handleRenameCollection(event: CustomEvent<{ id: string; newName: string }>): Promise<void> {
    const { id, newName } = event.detail;
    try {
      await linksStore.renameCollection(id, newName);
    } catch (_err) {
      dispatch('error', t('error_rename_collection_failed'));
    }
  }

  async function handleDeleteCollection(event: CustomEvent<{ id: string; name: string; linkCount: number }>): Promise<void> {
    const { id, name, linkCount } = event.detail;
    try {
      await linksStore.removeCollection(id);
      if (linkCount > 0) {
        dispatch('success', t('success_collection_deleted_moved_many', name, linkCount));
      } else {
        dispatch('success', t('success_collection_deleted', name));
      }
    } catch (_err) {
      dispatch('error', t('error_delete_collection_failed'));
    }
  }

  async function handleMoveToWorkspace(event: CustomEvent<{ collectionId: string; workspaceId: string }>): Promise<void> {
    const { collectionId, workspaceId } = event.detail;
    try {
      await workspacesStore.moveCollectionToWorkspace(collectionId, workspaceId);
      const workspace = workspaces.find((w) => w.id === workspaceId);
      dispatch('success', t('success_collection_moved', workspace?.name ?? 'workspace'));
    } catch {
      dispatch('error', t('error_move_collection_failed'));
    }
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
          {workspaces}
          {currentWorkspaceId}
          on:openLink={handleOpenLink}
          on:openLinkInNewTab={handleOpenLinkInNewTab}
          on:removeLink={(e) => dispatch('removeLink', e.detail)}
          on:moveLink={handleMoveLink}
          on:renameCollection={handleRenameCollection}
          on:deleteCollection={handleDeleteCollection}
          on:tabDrop={(e) => dispatch('tabDrop', e.detail)}
          on:moveToWorkspace={handleMoveToWorkspace}
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
      <p>{t('newtab_no_links_found', searchQuery)}</p>
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
    overflow-y: hidden;
    padding-bottom: var(--space-4);
    flex: 1;
    min-height: 0;
    align-items: flex-start;
  }

  .columns-container::-webkit-scrollbar {
    height: 8px;
  }

  .columns-container::-webkit-scrollbar-track {
    background: var(--surface-elevated);
    border-radius: var(--radius-full);
  }

  .columns-container::-webkit-scrollbar-thumb {
    background-color: var(--border-default);
    border-radius: var(--radius-full);
  }

  .columns-container::-webkit-scrollbar-thumb:hover {
    background-color: var(--border-strong);
  }

  .column-wrapper {
    flex-shrink: 0;
    max-height: 100%;
    align-self: stretch;
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
