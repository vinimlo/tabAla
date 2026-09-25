<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { flip } from 'svelte/animate';
  import { dndzone, TRIGGERS } from 'svelte-dnd-action';
  import { t, getCollectionDisplayName, getWorkspaceDisplayName } from '@lib/i18n';
  import type { Collection, Link, Workspace } from '@/lib/types';
  import { INBOX_COLLECTION_ID } from '@/lib/types';
  import LinkCard from './LinkCard.svelte';
  import IconButton from '@/shared/components/ui/IconButton.svelte';
  import Icon from '@/shared/components/ui/Icon.svelte';
  import type { CardMeta } from '../card-meta';
  import { isReference } from '@/lib/recommend/state';

  export let collection: Collection;
  export let links: Link[] = [];
  export let workspaces: Workspace[] = [];
  export let currentWorkspaceId: string = '';
  /** The meta line of each card; null leaves only reference and snooze. */
  export let metaOf: ((link: Link) => CardMeta | null) | null = null;

  const dispatch = createEventDispatcher<{
    openLink: Link;
    openLinkInNewTab: Link;
    removeLink: { id: string; title: string };
    reorderLinks: { collectionId: string; orderedIds: string[] };
    renameCollection: { id: string; newName: string };
    deleteCollection: { id: string; name: string; linkCount: number };
    tabDrop: { url: string; title: string; favicon?: string; collectionId: string };
    moveToWorkspace: { collectionId: string; workspaceId: string };
    completeLink: Link;
    snoozeLink: { link: Link; until: number };
    linkReference: { link: Link; value: boolean | null };
    collectionFocus: { collection: Collection; value: boolean };
    collectionReference: { collection: Collection; value: boolean };
  }>();

  $: otherWorkspaces = workspaces.filter((w) => w.id !== currentWorkspaceId);

  const flipDurationMs = 200;
  let isTabDragOver = false;
  let isEditing = false;
  let editName = '';
  let showMenu = false;
  let showMoveSubmenu = false;
  let menuRef: HTMLDivElement;

  $: isInbox = collection.id === INBOX_COLLECTION_ID;

  function handleDndConsider(e: CustomEvent): void {
    links = e.detail.items;
  }

  function handleDndFinalize(e: CustomEvent): void {
    links = e.detail.items;

    // Only the column that received the drop saves: its list carries both the
    // new order and any link dragged in from another column (mouse or keyboard).
    if (e.detail.info.trigger === TRIGGERS.DROPPED_INTO_ZONE) {
      dispatch('reorderLinks', {
        collectionId: collection.id,
        orderedIds: (e.detail.items as Link[]).map((link) => link.id),
      });
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
    showMoveSubmenu = false;
  }

  function handleMoveToWorkspace(workspaceId: string): void {
    closeMenu();
    dispatch('moveToWorkspace', {
      collectionId: collection.id,
      workspaceId,
    });
  }

  function handleDeleteCollection(): void {
    closeMenu();
    dispatch('deleteCollection', {
      id: collection.id,
      name: getCollectionDisplayName(collection),
      linkCount: links.length,
    });
  }

  function handleToggleFocus(): void {
    closeMenu();
    dispatch('collectionFocus', { collection, value: collection.focus !== true });
  }

  function handleToggleReference(): void {
    closeMenu();
    dispatch('collectionReference', { collection, value: collection.reference !== true });
  }

  function handleOpenAll(): void {
    closeMenu();
    for (const link of links) {
      dispatch('openLinkInNewTab', link);
    }
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
    if (event.dataTransfer?.types.includes('application/json') === true) {
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
          title={isInbox ? t('common_inbox') : t('column_double_click_rename')}
        >
          <span class="dot" style:--dot={collection.color ?? 'var(--text-tertiary)'} aria-hidden="true"></span>
          {getCollectionDisplayName(collection)}
          <span class="link-count">{links.length}</span>
          {#if collection.focus === true}
            <span class="pin" title={t('reason_focus')}><Icon name="pin-filled" size={13} /></span>
          {/if}
        </button>
      {/if}

      {#if !isInbox}
        <div class="column-menu" bind:this={menuRef}>
          <IconButton icon="more" size="sm" label={t('column_menu')} expanded={showMenu} on:click={(event) => { event.stopPropagation(); toggleMenu(); }} />

          {#if showMenu}
            <div class="menu-dropdown">
              <button type="button" class="menu-item" on:click={handleOpenAll} disabled={links.length === 0}>
                <Icon name="external" size={14} />
                {t('column_open_all')}
              </button>
              {#if otherWorkspaces.length > 0}
                <!-- svelte-ignore a11y-no-static-element-interactions -->
                <div class="menu-item-with-submenu" on:mouseenter={() => showMoveSubmenu = true} on:mouseleave={() => showMoveSubmenu = false}>
                  <button type="button" class="menu-item" on:click|stopPropagation={() => showMoveSubmenu = true}>
                    <Icon name="folder" size={14} />
                    {t('column_move_to')}
                    <span class="chevron"><Icon name="chevron-right" size={12} /></span>
                  </button>
                  {#if showMoveSubmenu}
                    <div class="submenu">
                      {#each otherWorkspaces as ws}
                        <button
                          type="button"
                          class="menu-item"
                          on:click={() => handleMoveToWorkspace(ws.id)}
                        >
                          <span
                            class="workspace-dot"
                            class:is-default={ws.isDefault === true}
                            style="--color: {ws.color}"
                          ></span>
                          {getWorkspaceDisplayName(ws)}
                        </button>
                      {/each}
                    </div>
                  {/if}
                </div>
              {/if}
              <button type="button" class="menu-item" on:click={handleToggleFocus}>
                <Icon name="target" size={14} />
                {collection.focus === true ? t('column_unpin_focus') : t('column_pin_focus')}
              </button>
              <button type="button" class="menu-item" on:click={handleToggleReference}>
                <Icon name="reference" size={14} />
                {collection.reference === true ? t('column_unmark_reference') : t('column_mark_reference')}
              </button>
              <button type="button" class="menu-item menu-item-danger" on:click={handleDeleteCollection}>
                <Icon name="trash" size={14} />
                {t('column_delete_collection')}
              </button>
            </div>
          {/if}
        </div>
      {/if}
    </header>

    <div
      class="column-content scrollbar-thin"
      use:dndzone={{
        items: links,
        flipDurationMs,
        dropTargetStyle: {},
        dropTargetClasses: ['drop-target'],
        dragDisabled: false,
        type: 'links',
      }}
      on:consider={handleDndConsider}
      on:finalize={handleDndFinalize}
    >
      {#each links as link (link.id)}
        <div animate:flip={{ duration: flipDurationMs }}>
          <LinkCard
            {link}
            reference={isReference(link, collection)}
            collectionReference={collection.reference === true}
            meta={metaOf === null ? null : metaOf(link)}
            on:open={(e) => dispatch('openLink', e.detail)}
            on:openInNewTab={(e) => dispatch('openLinkInNewTab', e.detail)}
            on:remove={(e) => dispatch('removeLink', e.detail)}
            on:complete={(e) => dispatch('completeLink', e.detail)}
            on:snooze={(e) => dispatch('snoozeLink', e.detail)}
            on:reference={(e) => dispatch('linkReference', e.detail)}
          />
        </div>
      {:else}
        <div class="empty-column">
          <span>{t('newtab_drag_links_here')}</span>
        </div>
           {/each}
    </div>
  </div>

<style>
  .column {
    display: flex;
    flex-direction: column;
    width: var(--column-width);
    min-width: var(--column-min-width);
    max-width: var(--column-max-width);
    max-height: 100%;
    border-radius: var(--radius-lg);
    flex-shrink: 0;
    transition: background-color var(--duration-fast) var(--ease-out);
  }

  .column.tab-drag-over {
    background: var(--accent-soft);
    outline: 1px dashed var(--accent-line);
    outline-offset: 4px;
  }

  .column-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    min-height: 30px;
    padding: 0 4px;
    margin-bottom: var(--space-2);
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
    font: 600 13.5px / 1 var(--font-body);
    cursor: default;
  }

  .dot {
    width: 8px;
    height: 8px;
    border-radius: 3px;
    background: var(--dot);
  }

  .link-count {
    font-size: var(--text-xs);
    font-weight: 500;
    color: var(--text-tertiary);
  }

  .pin {
    display: inline-grid;
    color: var(--accent-primary);
  }
  .column-title.editable {
    cursor: pointer;
  }

  .column-title.editable:hover {
    background: var(--surface-overlay);
  }

  .edit-input {
    flex: 1;
    padding: var(--space-2) var(--space-3);
    background: var(--surface-overlay);
    border: 1px solid var(--accent-primary);
    border-radius: var(--radius-md);
    color: var(--text-primary);
    font-family: var(--font-body);
    font-size: var(--text-sm);
    font-weight: 600;
  }

  .edit-input:focus {
    outline: none;
    box-shadow: 0 0 0 3px var(--accent-soft);
  }

  .column-menu {
    position: relative;
  }

  .menu-dropdown {
    position: absolute;
    top: 100%;
    right: 0;
    margin-top: var(--space-1);
    min-width: 180px;
    background: var(--surface-subtle);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-xl);
    z-index: 100;
    overflow: visible;
    animation: menuSlide var(--duration-fast) var(--ease-spring);
  }

  @keyframes menuSlide {
    from {
      opacity: 0;
      transform: translateY(-4px) scale(0.95);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  .menu-item {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    width: 100%;
    padding: var(--space-3) var(--space-4);
    background: transparent;
    border: none;
    color: var(--text-secondary);
    font-family: var(--font-body);
    font-size: var(--text-sm);
    text-align: left;
    cursor: pointer;
    transition: all var(--duration-fast) var(--ease-out);
  }

  .menu-item:hover {
    background: var(--surface-overlay);
    color: var(--text-primary);
  }

  .menu-item:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .menu-item-danger:hover {
    background: var(--semantic-error-soft);
    color: var(--semantic-error);
  }

  .menu-item-with-submenu {
    position: relative;
  }

  .menu-item .chevron {
    margin-left: auto;
  }

  .submenu {
    position: absolute;
    left: 100%;
    top: -4px;
    min-width: 170px;
    background: var(--surface-subtle);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-xl);
    overflow: hidden;
    padding: var(--space-1) 0;
    animation: menuSlide var(--duration-fast) var(--ease-spring);
  }

  .workspace-dot {
    width: 12px;
    height: 12px;
    border-radius: var(--radius-full);
    background-color: var(--color);
    flex-shrink: 0;
    box-shadow:
      0 0 0 1.5px var(--border-default),
      0 1px 3px var(--shadow-sm);
  }

  .workspace-dot.is-default {
    background: linear-gradient(135deg, var(--accent-primary), var(--accent-secondary));
  }

  .column-content {
    flex: 1;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
    overflow-y: auto;
    min-height: 100px;
  }

  :global(.column-content.drop-target) {
    background: var(--accent-soft);
    border-radius: var(--radius-lg);
  }

  .empty-column {
    display: flex;
    align-items: center;
    justify-content: center;
    flex: 1;
    min-height: 80px;
    color: var(--text-tertiary);
    font-family: var(--font-body);
    font-size: var(--text-sm);
    text-align: center;
    border: 1px dashed var(--border-default);
    border-radius: var(--radius-lg);
    margin: var(--space-2);
  }

  /* Reduced motion */
  @media (prefers-reduced-motion: reduce) {
    .column {
      transition: none;
    }
    .menu-dropdown {
      animation: none;
    }
  }
</style>
