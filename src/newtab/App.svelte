<script lang="ts">
  import { onMount } from 'svelte';
  import './app.css';
  import { linksStore, linksByCollection } from '@/lib/stores/links';
  import { settingsStore } from '@/lib/stores/settings';
  import type { BrowserTab, TabGroup } from '@/lib/tabs';
  import KanbanBoard from './components/KanbanBoard.svelte';
  import QuickActionsBar from './components/QuickActionsBar.svelte';
  import StatusBar from './components/StatusBar.svelte';
  import TabsSidebar from './components/TabsSidebar.svelte';
  import Toast from '@/shared/components/Toast.svelte';
  import ConfirmDialog from '@/shared/components/ConfirmDialog.svelte';
  import SettingsModal from './components/SettingsModal.svelte';
  import CreateCollectionModal from './components/CreateCollectionModal.svelte';

  let mounted = false;
  let searchQuery = '';
  let errorMessage: string | null = null;
  let successMessage: string | null = null;
  let showSettings = false;
  let showCreateCollection = false;
  let linkToRemove: { id: string; title: string } | null = null;
  let sidebarExpanded = false;
  let collectionFromGroup: { name: string; tabs: BrowserTab[] } | null = null;

  $: loading = $linksStore.loading;
  $: error = $linksStore.error;
  $: collections = $linksStore.collections;
  $: links = $linksStore.links;

  onMount(async () => {
    await Promise.all([
      linksStore.load(),
      settingsStore.load(),
    ]);
    setTimeout(() => mounted = true, 50);
  });

  function handleSearch(event: CustomEvent<string>): void {
    searchQuery = event.detail;
  }

  function handleOpenSettings(): void {
    showSettings = true;
  }

  function handleCloseSettings(): void {
    showSettings = false;
  }

  function handleOpenCreateCollection(): void {
    showCreateCollection = true;
  }

  function handleCloseCreateCollection(): void {
    showCreateCollection = false;
  }

  async function handleCreateCollection(event: CustomEvent<string>): Promise<void> {
    const name = event.detail;
    try {
      const newCollection = await linksStore.addCollection(name);

      // If creating from a tab group, save all tabs as links
      if (collectionFromGroup !== null) {
        for (const tab of collectionFromGroup.tabs) {
          await linksStore.addLink({
            url: tab.url,
            title: tab.title,
            favicon: tab.favicon,
            collectionId: newCollection.id,
          });
        }
        successMessage = `Coleção "${name}" criada com ${collectionFromGroup.tabs.length} links`;
        collectionFromGroup = null;
      } else {
        successMessage = `Coleção "${name}" criada`;
      }

      showCreateCollection = false;
    } catch (err) {
      errorMessage = err instanceof Error ? err.message : 'Erro ao criar coleção';
      collectionFromGroup = null;
    }
  }

  function handleCreateCollectionFromGroup(event: CustomEvent<{ group: TabGroup; tabs: BrowserTab[] }>): void {
    const { group, tabs } = event.detail;
    collectionFromGroup = {
      name: group.title || 'Novo grupo',
      tabs,
    };
    showCreateCollection = true;
  }

  function handleRemoveLink(event: CustomEvent<{ id: string; title: string }>): void {
    linkToRemove = event.detail;
  }

  async function confirmRemoveLink(): Promise<void> {
    if (linkToRemove === null) {
      return;
    }

    try {
      await linksStore.removeLink(linkToRemove.id);
      successMessage = 'Link removido';
    } catch (err) {
      errorMessage = 'Erro ao remover link';
    }
    linkToRemove = null;
  }

  function cancelRemoveLink(): void {
    linkToRemove = null;
  }

  function handleError(event: CustomEvent<string>): void {
    errorMessage = event.detail;
  }

  function handleSuccess(event: CustomEvent<string>): void {
    successMessage = event.detail;
  }

  async function handleTabDrop(event: CustomEvent<{ url: string; title: string; favicon?: string; collectionId: string }>): Promise<void> {
    const { url, title, favicon, collectionId } = event.detail;

    try {
      await linksStore.addLink({
        url,
        title,
        favicon,
        collectionId,
      });

      const collectionName = collections.find(c => c.id === collectionId)?.name ?? 'coleção';
      successMessage = `Link salvo em ${collectionName}`;
    } catch (err) {
      errorMessage = 'Erro ao salvar link';
    }
  }

  function clearError(): void {
    errorMessage = null;
  }

  function clearSuccess(): void {
    successMessage = null;
  }

  function handleKeydown(event: KeyboardEvent): void {
    // Global keyboard shortcuts
    if (event.key === '/' || (event.ctrlKey && event.key === 'k')) {
      event.preventDefault();
      const searchInput = document.querySelector<HTMLInputElement>('[data-search-input]');
      searchInput?.focus();
    }

    if (event.key === 'Escape') {
      searchQuery = '';
      showSettings = false;
      showCreateCollection = false;
      linkToRemove = null;
      collectionFromGroup = null;
    }

    if (event.key === 'n' && !event.ctrlKey && !event.metaKey) {
      const activeElement = document.activeElement;
      const isInputFocused = activeElement?.tagName === 'INPUT' || activeElement?.tagName === 'TEXTAREA';
      if (!isInputFocused) {
        event.preventDefault();
        handleOpenCreateCollection();
      }
    }

    // Toggle sidebar with 't' key
    if (event.key === 't' && !event.ctrlKey && !event.metaKey) {
      const activeElement = document.activeElement;
      const isInputFocused = activeElement?.tagName === 'INPUT' || activeElement?.tagName === 'TEXTAREA';
      if (!isInputFocused) {
        event.preventDefault();
        sidebarExpanded = !sidebarExpanded;
      }
    }
  }
</script>

<svelte:window on:keydown={handleKeydown} />

<main class="dashboard" class:mounted>
  <TabsSidebar
    bind:expanded={sidebarExpanded}
    on:createCollectionFromGroup={handleCreateCollectionFromGroup}
  />

  <div class="main-content">
    {#if loading}
      <div class="loading">
        <div class="spinner"></div>
        <span>carregando...</span>
      </div>
    {:else if error}
      <div class="error-state">
        <p>Erro ao carregar dados</p>
        <button type="button" on:click={() => linksStore.load()}>Tentar novamente</button>
      </div>
    {:else}
      <QuickActionsBar
        {searchQuery}
        on:search={handleSearch}
        on:openSettings={handleOpenSettings}
        on:newCollection={handleOpenCreateCollection}
      />

      <KanbanBoard
        {collections}
        linksByCollection={$linksByCollection}
        {searchQuery}
        on:removeLink={handleRemoveLink}
        on:error={handleError}
        on:success={handleSuccess}
        on:tabDrop={handleTabDrop}
      />

      <StatusBar {links} {collections} />
    {/if}
  </div>
</main>

{#if successMessage}
  <Toast message={successMessage} type="success" onClose={clearSuccess} />
{/if}

{#if errorMessage}
  <Toast message={errorMessage} onClose={clearError} />
{/if}

{#if linkToRemove}
  <ConfirmDialog
    message="Remover este link?"
    confirmText="Remover"
    cancelText="Cancelar"
    on:confirm={confirmRemoveLink}
    on:cancel={cancelRemoveLink}
  />
{/if}

{#if showSettings}
  <SettingsModal on:close={handleCloseSettings} />
{/if}

{#if showCreateCollection}
  <CreateCollectionModal
    existingNames={linksStore.getCollectionNames()}
    initialName={collectionFromGroup?.name ?? ''}
    on:create={handleCreateCollection}
    on:cancel={handleCloseCreateCollection}
  />
{/if}

<style>
  .dashboard {
    display: flex;
    flex-direction: row;
    height: 100vh;
    width: 100vw;
    background: var(--bg-primary);
    opacity: 0;
    transition: opacity var(--duration-normal) var(--ease-out);
  }

  .dashboard.mounted {
    opacity: 1;
  }

  .main-content {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-width: 0;
    height: 100%;
  }

  .loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--space-3);
    flex: 1;
    color: var(--text-secondary);
    font-size: 0.875rem;
    letter-spacing: 0.05em;
    text-transform: lowercase;
  }

  .spinner {
    width: 32px;
    height: 32px;
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

  .error-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--space-4);
    flex: 1;
    text-align: center;
  }

  .error-state p {
    color: var(--error);
    margin: 0;
    font-size: 1rem;
  }

  .error-state button {
    padding: var(--space-2) var(--space-4);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    background: var(--bg-secondary);
    color: var(--text-primary);
    font-family: inherit;
    font-size: 0.875rem;
    cursor: pointer;
    transition: all var(--duration-fast) var(--ease-out);
  }

  .error-state button:hover {
    background-color: var(--bg-tertiary);
    border-color: var(--border-hover);
  }
</style>
