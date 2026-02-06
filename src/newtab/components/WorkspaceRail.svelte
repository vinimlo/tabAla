<script lang="ts">
  import { createEventDispatcher, onMount, onDestroy } from 'svelte';
  import { flip } from 'svelte/animate';
  import { fade } from 'svelte/transition';
  import type { Workspace, CreateWorkspaceInput } from '@/lib/types';
  import { DEFAULT_WORKSPACE_ID } from '@/lib/types';
  import { workspacesStore } from '@/lib/stores/workspaces';
  import WorkspaceRailItem from './WorkspaceRailItem.svelte';
  import WorkspaceModal from '@/shared/components/WorkspaceModal.svelte';

  const dispatch = createEventDispatcher<{
    error: string;
    success: string;
  }>();

  let showCreateModal = false;
  let editingWorkspace: Workspace | null = null;
  let contextMenu: { workspace: Workspace; x: number; y: number } | null = null;
  let draggedWorkspace: Workspace | null = null;
  let dragOverIndex: number | null = null;

  $: workspaces = $workspacesStore.workspaces;
  $: activeWorkspaceId = $workspacesStore.activeWorkspaceId;
  $: isLimitReached = workspacesStore.isLimitReached();

  function handleSelectWorkspace(event: CustomEvent<string>): void {
    workspacesStore.setActiveWorkspace(event.detail);
  }

  function handleContextMenu(event: CustomEvent<{ workspace: Workspace; x: number; y: number }>): void {
    contextMenu = event.detail;
  }

  function closeContextMenu(): void {
    contextMenu = null;
  }

  function handleEditWorkspace(): void {
    if (contextMenu) {
      editingWorkspace = contextMenu.workspace;
      closeContextMenu();
    }
  }

  async function handleDeleteWorkspace(): Promise<void> {
    if (contextMenu === null) {
      return;
    }

    const workspace = contextMenu.workspace;
    closeContextMenu();

    if (workspace.id === DEFAULT_WORKSPACE_ID || workspace.isDefault === true) {
      dispatch('error', 'O workspace padrão não pode ser excluído');
      return;
    }

    try {
      await workspacesStore.removeWorkspace(workspace.id);
      dispatch('success', `Workspace "${workspace.name}" excluído`);
    } catch {
      dispatch('error', 'Erro ao excluir workspace');
    }
  }

  function handleOpenCreateModal(): void {
    if (isLimitReached) {
      dispatch('error', 'Limite máximo de 12 workspaces atingido');
      return;
    }
    showCreateModal = true;
  }

  function handleDragEnter(_event: DragEvent): void {
    // Handled by dragover
  }

  function handleCloseModal(): void {
    showCreateModal = false;
    editingWorkspace = null;
  }

  async function handleSaveWorkspace(event: CustomEvent<CreateWorkspaceInput>): Promise<void> {
    const input = event.detail;

    try {
      if (editingWorkspace) {
        await workspacesStore.updateWorkspace(editingWorkspace.id, input);
        dispatch('success', `Workspace "${input.name}" atualizado`);
      } else {
        await workspacesStore.addWorkspace(input);
        dispatch('success', `Workspace "${input.name}" criado`);
      }
      handleCloseModal();
    } catch (error) {
      dispatch('error', error instanceof Error ? error.message : 'Erro ao salvar workspace');
    }
  }

  // Drag and drop handlers
  function handleDragStart(event: DragEvent, workspace: Workspace): void {
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', workspace.id);
    }
    draggedWorkspace = workspace;
  }

  function handleDragEnd(): void {
    draggedWorkspace = null;
    dragOverIndex = null;
  }

  function handleDragOver(event: DragEvent, index: number): void {
    event.preventDefault();
    if (event.dataTransfer !== null) {
      event.dataTransfer.dropEffect = 'move';
    }
    dragOverIndex = index;
  }

  function handleDragLeave(): void {
    dragOverIndex = null;
  }

  function handleDrop(event: DragEvent, targetIndex: number): void {
    event.preventDefault();

    if (draggedWorkspace === null) {
      return;
    }

    const sourceIndex = workspaces.findIndex((w) => w.id === draggedWorkspace!.id);
    if (sourceIndex === -1 || sourceIndex === targetIndex) {
      handleDragEnd();
      return;
    }

    const reordered = [...workspaces];
    const [removed] = reordered.splice(sourceIndex, 1);
    reordered.splice(targetIndex, 0, removed);

    void workspacesStore.reorderWorkspaces(reordered);
    handleDragEnd();
  }

  // Close context menu on click outside
  function handleWindowClick(_event: MouseEvent): void {
    if (contextMenu !== null) {
      closeContextMenu();
    }
  }

  onMount(() => {
    window.addEventListener('click', handleWindowClick);
  });

  onDestroy(() => {
    window.removeEventListener('click', handleWindowClick);
  });
</script>

<nav class="workspace-rail" aria-label="Workspaces">
  <div class="workspace-list">
    {#each workspaces as workspace, index (workspace.id)}
      <!-- svelte-ignore a11y-no-static-element-interactions -->
      <div
        class="workspace-slot"
        class:drag-over={dragOverIndex === index}
        animate:flip={{ duration: 200 }}
        on:dragover={(e) => handleDragOver(e, index)}
        on:dragleave={handleDragLeave}
        on:drop={(e) => handleDrop(e, index)}
        on:dragstart={(e) => handleDragStart(e, workspace)}
        on:dragend={handleDragEnd}
        on:dragenter={handleDragEnter}
      >
        <WorkspaceRailItem
          {workspace}
          isActive={activeWorkspaceId === workspace.id}
          on:select={handleSelectWorkspace}
          on:contextmenu={handleContextMenu}
        />
      </div>
    {/each}
  </div>

  <div class="rail-divider"></div>

  <button
    type="button"
    class="add-workspace-btn"
    on:click={handleOpenCreateModal}
    aria-label="Criar novo workspace"
    disabled={isLimitReached}
    title={isLimitReached ? 'Limite máximo de 12 workspaces atingido' : 'Criar novo workspace'}
  >
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 5v14M5 12h14"/>
    </svg>
  </button>
</nav>

{#if contextMenu}
  <div
    class="context-menu"
    style="top: {contextMenu.y}px; left: {contextMenu.x}px;"
    transition:fade={{ duration: 100 }}
    role="menu"
  >
    <button type="button" class="context-menu-item" on:click={handleEditWorkspace} role="menuitem">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
      </svg>
      Editar
    </button>
    {#if contextMenu.workspace.id !== DEFAULT_WORKSPACE_ID && !contextMenu.workspace.isDefault}
      <button type="button" class="context-menu-item danger" on:click={handleDeleteWorkspace} role="menuitem">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="3 6 5 6 21 6"/>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
        </svg>
        Excluir
      </button>
    {/if}
  </div>
{/if}

{#if showCreateModal || editingWorkspace}
  <WorkspaceModal
    workspace={editingWorkspace}
    existingNames={workspacesStore.getWorkspaceNames()}
    on:save={handleSaveWorkspace}
    on:cancel={handleCloseModal}
  />
{/if}

<style>
  .workspace-rail {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 64px;
    min-width: 64px;
    height: 100%;
    padding: var(--space-3) var(--space-1);
    background: var(--surface-elevated);
    border-right: 1px solid var(--border-subtle);
    gap: var(--space-2);
    overflow: visible;
  }

  .workspace-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    flex: 1;
    overflow-y: auto;
    overflow-x: visible;
    scrollbar-width: none;
    padding: 4px;
  }

  .workspace-list::-webkit-scrollbar {
    display: none;
  }

  .workspace-slot {
    transition: transform var(--duration-fast) var(--ease-out);
  }

  .workspace-slot.drag-over {
    transform: translateY(4px);
  }

  .rail-divider {
    width: 24px;
    height: 1px;
    background: var(--border-default);
    margin: var(--space-2) 0;
    flex-shrink: 0;
  }

  .add-workspace-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    padding: 0;
    background: var(--surface-overlay);
    border: 1px dashed var(--border-default);
    border-radius: var(--radius-full);
    color: var(--text-tertiary);
    cursor: pointer;
    transition: all var(--duration-fast) var(--ease-out);
    flex-shrink: 0;
  }

  .add-workspace-btn:hover:not(:disabled) {
    background: var(--surface-subtle);
    border-color: var(--accent-primary);
    color: var(--accent-primary);
    transform: scale(1.1);
  }

  .add-workspace-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .add-workspace-btn:focus-visible {
    outline: 2px solid var(--accent-primary);
    outline-offset: 2px;
  }

  .context-menu {
    position: fixed;
    background: var(--surface-elevated);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-md);
    padding: var(--space-1);
    min-width: 140px;
    box-shadow: var(--shadow-lg);
    z-index: 1000;
  }

  .context-menu-item {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    width: 100%;
    padding: var(--space-2) var(--space-3);
    background: transparent;
    border: none;
    border-radius: var(--radius-sm);
    color: var(--text-secondary);
    font-family: var(--font-body);
    font-size: var(--text-sm);
    text-align: left;
    cursor: pointer;
    transition: all var(--duration-fast) var(--ease-out);
  }

  .context-menu-item:hover {
    background: var(--surface-overlay);
    color: var(--text-primary);
  }

  .context-menu-item.danger:hover {
    background: var(--semantic-error-soft);
    color: var(--semantic-error);
  }

  /* Reduced motion */
  @media (prefers-reduced-motion: reduce) {
    .add-workspace-btn:hover:not(:disabled) {
      transform: none;
    }
    .workspace-slot.drag-over {
      transform: none;
    }
  }
</style>
