<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { flip } from 'svelte/animate';
  import { dndzone } from 'svelte-dnd-action';
  import { t } from '@lib/i18n';
  import type { Collection, Link, Workspace } from '@/lib/types';
  import { linksStore } from '@/lib/stores/links';
  import { workspacesStore } from '@/lib/stores/workspaces';
  import { openLinkInNewTab, openLinkInCurrentTab } from '@/lib/tabs';
  import Column from './Column.svelte';
  import {
    completeLink, recordOpen, setCollectionFocus, setCollectionReference, setLinkReference, snoozeLink,
  } from '@/lib/stores/progress';

  export let collections: Collection[] = [];
  export let linksByCollection: Map<string, Link[]>;
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
    await recordOpen(link);
    const result = await openLinkInCurrentTab(link.url);
    if (!result.success) {
      dispatch('error', result.error ?? t('error_open_link_failed'));
    }
  }

  async function handleOpenLinkInNewTab(event: CustomEvent<Link>): Promise<void> {
    const link = event.detail;
    await recordOpen(link);
    const result = await openLinkInNewTab(link.url);
    if (!result.success) {
      dispatch('error', result.error ?? t('error_open_link_failed'));
    }
  }

  async function handleCompleteLink(event: CustomEvent<Link>): Promise<void> {
    await completeLink(event.detail);
    dispatch('success', t('success_link_completed'));
  }

  async function handleSnoozeLink(event: CustomEvent<{ link: Link; until: number }>): Promise<void> {
    await snoozeLink(event.detail.link, event.detail.until);
    dispatch('success', t('success_link_snoozed'));
  }

  async function handleLinkReference(event: CustomEvent<{ link: Link; value: boolean | null }>): Promise<void> {
    await setLinkReference(event.detail.link, event.detail.value);
    if (event.detail.value === true) {
      dispatch('success', t('success_link_reference'));
    }
  }

  async function handleCollectionFocus(event: CustomEvent<{ collection: Collection; value: boolean }>): Promise<void> {
    await setCollectionFocus(event.detail.collection, event.detail.value);
  }

  async function handleCollectionReference(event: CustomEvent<{ collection: Collection; value: boolean }>): Promise<void> {
    await setCollectionReference(event.detail.collection, event.detail.value);
  }

  async function handleReorderLinks(event: CustomEvent<{ collectionId: string; orderedIds: string[] }>): Promise<void> {
    const { collectionId, orderedIds } = event.detail;
    try {
      await linksStore.reorderLinks(collectionId, orderedIds);
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
          {workspaces}
          {currentWorkspaceId}
          on:openLink={handleOpenLink}
          on:openLinkInNewTab={handleOpenLinkInNewTab}
          on:removeLink={(e) => dispatch('removeLink', e.detail)}
          on:reorderLinks={handleReorderLinks}
          on:renameCollection={handleRenameCollection}
          on:deleteCollection={handleDeleteCollection}
          on:tabDrop={(e) => dispatch('tabDrop', e.detail)}
          on:moveToWorkspace={handleMoveToWorkspace}
          on:completeLink={handleCompleteLink}
          on:snoozeLink={handleSnoozeLink}
          on:linkReference={handleLinkReference}
          on:collectionFocus={handleCollectionFocus}
          on:collectionReference={handleCollectionReference}
        />
      </div>
    {/each}
  </div>

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

</style>
