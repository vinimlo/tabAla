<script lang="ts">
  import { onMount } from 'svelte';
  import type { Link } from '@/lib/types';
  import { INBOX_COLLECTION_ID } from '@/lib/types';
  import { openLinkInNewTab, getCurrentTab, isSaveableUrl } from '@/lib/tabs';
  import { linksStore, linksByCollection } from '@stores/links';
  import CollectionGroup from '@components/CollectionGroup.svelte';
  import EmptyState from '@components/EmptyState.svelte';
  import ConfirmDialog from './components/ConfirmDialog.svelte';
  import Toast from './components/Toast.svelte';
  import SaveButton from './components/SaveButton.svelte';
  import CreateCollectionModal from './components/CreateCollectionModal.svelte';

  const BATCH_SIZE = 50;

  let expandedCollections: Set<string> = new Set([INBOX_COLLECTION_ID]);
  let visibleCount = BATCH_SIZE;
  let scrollContainer: HTMLElement;
  let linkToRemove: Link | null = null;
  let errorMessage: string | null = null;
  let successMessage: string | null = null;
  let isSaving = false;
  let mounted = false;
  let showCreateCollectionModal = false;

  $: loading = $linksStore.loading;
  $: error = $linksStore.error;
  $: collections = $linksStore.collections;
  $: totalLinks = $linksStore.links.length;
  $: isEmpty = loading === false && totalLinks === 0;

  $: visibleCollections = collections.map((collection) => {
    const allLinks = $linksByCollection.get(collection.id) ?? [];
    return {
      collection,
      links: allLinks,
    };
  }).filter((group) => group.links.length > 0 || group.collection.id === INBOX_COLLECTION_ID);

  $: hasMoreToLoad = visibleCount < totalLinks;

  onMount(() => {
    linksStore.load();
    expandedCollections = new Set([INBOX_COLLECTION_ID]);
    setTimeout(() => mounted = true, 50);
  });

  function handleToggle(event: CustomEvent<string>): void {
    const collectionId = event.detail;
    if (expandedCollections.has(collectionId)) {
      expandedCollections.delete(collectionId);
    } else {
      expandedCollections.add(collectionId);
    }
    expandedCollections = expandedCollections;
  }

  async function handleOpenLink(event: CustomEvent<Link>): Promise<void> {
    const link = event.detail;
    const result = await openLinkInNewTab(link.url);
    if (!result.success) {
      errorMessage = result.error ?? 'Erro ao abrir link. Tente novamente.';
    }
  }

  function handleRemoveLink(event: CustomEvent<string>): void {
    const linkId = event.detail;
    const link = $linksStore.links.find((l) => l.id === linkId);
    if (link !== undefined) {
      linkToRemove = link;
    }
  }

  async function handleConfirmRemove(): Promise<void> {
    if (!linkToRemove) {
      return;
    }

    const linkId = linkToRemove.id;
    linkToRemove = null;

    try {
      await linksStore.removeLink(linkId);
    } catch (err) {
      console.error('Failed to remove link:', err);
      errorMessage = 'Erro ao remover link. Tente novamente.';
    }
  }

  function handleCancelRemove(): void {
    linkToRemove = null;
  }

  function clearError(): void {
    errorMessage = null;
  }

  function handleScroll(): void {
    if (scrollContainer === undefined || hasMoreToLoad === false) {
      return;
    }

    const { scrollTop, scrollHeight, clientHeight } = scrollContainer;
    const scrollPercentage = (scrollTop + clientHeight) / scrollHeight;

    if (scrollPercentage >= 0.8) {
      visibleCount = Math.min(visibleCount + BATCH_SIZE, totalLinks);
    }
  }

  async function handleSaveCurrentTab(): Promise<void> {
    if (isSaving) {
      return;
    }

    isSaving = true;

    try {
      const tabInfo = await getCurrentTab();

      if (!tabInfo) {
        errorMessage = 'Não foi possível obter a aba atual.';
        return;
      }

      if (!isSaveableUrl(tabInfo.url)) {
        errorMessage = 'Esta página não pode ser salva.';
        return;
      }

      await linksStore.addLink({
        url: tabInfo.url,
        title: tabInfo.title,
        favicon: tabInfo.favicon,
        collectionId: INBOX_COLLECTION_ID,
      });

      successMessage = 'Link salvo!';
    } catch (err) {
      console.error('Failed to save current tab:', err);
      errorMessage = 'Erro ao salvar link. Tente novamente.';
    } finally {
      isSaving = false;
    }
  }

  function clearSuccess(): void {
    successMessage = null;
  }

  function openCreateCollectionModal(): void {
    showCreateCollectionModal = true;
  }

  function closeCreateCollectionModal(): void {
    showCreateCollectionModal = false;
  }

  async function handleCreateCollection(event: CustomEvent<string>): Promise<void> {
    const name = event.detail;

    try {
      const newCollection = await linksStore.addCollection(name);
      showCreateCollectionModal = false;
      successMessage = `Coleção "${newCollection.name}" criada!`;
      expandedCollections.add(newCollection.id);
      expandedCollections = expandedCollections;
    } catch (err) {
      console.error('Failed to create collection:', err);
      errorMessage = err instanceof Error ? err.message : 'Erro ao criar coleção. Tente novamente.';
      showCreateCollectionModal = false;
    }
  }
</script>

<main class="app" class:mounted>
  {#if loading}
    <div class="loading">
      <div class="spinner"></div>
      <span>carregando...</span>
    </div>
  {:else if error}
    <div class="error">
      <p>Erro ao carregar dados</p>
      <button type="button" on:click={() => linksStore.load()}>Tentar novamente</button>
    </div>
  {:else}
    <header class="header">
      <button
        type="button"
        class="btn-new-collection"
        on:click={openCreateCollectionModal}
        aria-label="Nova Coleção"
      >
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
          <line x1="12" y1="5" x2="12" y2="19"></line>
          <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
        <span>Nova Coleção</span>
      </button>
    </header>

    {#if isEmpty}
      <EmptyState />
    {:else}
      <div
        class="scroll-container"
        bind:this={scrollContainer}
        on:scroll={handleScroll}
      >
        {#each visibleCollections as { collection, links }, i (collection.id)}
          <div class="collection-wrapper" style="--delay: {i * 50}ms">
            <CollectionGroup
              {collection}
              {links}
              expanded={expandedCollections.has(collection.id)}
              on:toggle={handleToggle}
              on:open={handleOpenLink}
              on:remove={handleRemoveLink}
            />
          </div>
        {/each}
      </div>
    {/if}
  {/if}

  <SaveButton loading={isSaving} disabled={loading} on:click={handleSaveCurrentTab} />

  <footer class="watermark">
    <span>tabala</span>
  </footer>
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
    on:confirm={handleConfirmRemove}
    on:cancel={handleCancelRemove}
  />
{/if}

{#if showCreateCollectionModal}
  <CreateCollectionModal
    existingNames={linksStore.getCollectionNames()}
    on:create={handleCreateCollection}
    on:cancel={closeCreateCollectionModal}
  />
{/if}

<style>
  :global(:root) {
    /* Base - Dark theme for futuristic feel */
    --bg-primary: #0D0D0F;
    --bg-secondary: #151518;
    --bg-tertiary: #1C1C21;

    /* Text - High contrast, refined */
    --text-primary: #FAFAFA;
    --text-secondary: #8A8A8E;
    --text-tertiary: #4A4A4E;

    /* Accent - Warm coral */
    --accent: #FF6B4A;
    --accent-soft: rgba(255, 107, 74, 0.12);
    --accent-glow: rgba(255, 107, 74, 0.25);

    /* Semantic */
    --success: #4ADE80;
    --error: #F87171;

    /* Borders & Dividers */
    --border: rgba(255, 255, 255, 0.06);
    --border-hover: rgba(255, 255, 255, 0.12);

    /* Spacing */
    --space-1: 0.25rem;
    --space-2: 0.5rem;
    --space-3: 0.75rem;
    --space-4: 1rem;
    --space-5: 1.5rem;
    --space-6: 2rem;

    /* Radius */
    --radius-sm: 6px;
    --radius-md: 10px;
    --radius-lg: 16px;
    --radius-full: 9999px;

    /* Motion */
    --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
    --ease-in-out: cubic-bezier(0.65, 0, 0.35, 1);
    --duration-fast: 150ms;
    --duration-normal: 250ms;
    --duration-slow: 400ms;
  }

  :global(*) {
    box-sizing: border-box;
  }

  :global(body) {
    margin: 0;
    padding: 0;
    font-family: "Satoshi", "SF Pro Display", -apple-system, BlinkMacSystemFont, sans-serif;
    font-size: 14px;
    line-height: 1.5;
    color: var(--text-primary);
    background-color: var(--bg-primary);
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  .app {
    display: flex;
    flex-direction: column;
    height: 100vh;
    max-height: 600px;
    min-width: 300px;
    max-width: 400px;
    background: var(--bg-primary);
    position: relative;
    opacity: 0;
    transition: opacity var(--duration-normal) var(--ease-out);
  }

  .app.mounted {
    opacity: 1;
  }

  .loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--space-3);
    flex: 1;
    color: var(--text-secondary);
    font-size: 0.75rem;
    letter-spacing: 0.05em;
    text-transform: lowercase;
  }

  .spinner {
    width: 20px;
    height: 20px;
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

  .error {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--space-3);
    flex: 1;
    padding: var(--space-5);
    text-align: center;
  }

  .error p {
    color: var(--error);
    margin: 0;
    font-size: 0.875rem;
  }

  .error button {
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

  .error button:hover {
    background-color: var(--bg-tertiary);
    border-color: var(--border-hover);
  }

  .scroll-container {
    flex: 1;
    overflow-y: auto;
    padding: var(--space-3);
    padding-bottom: var(--space-6);
  }

  .scroll-container::-webkit-scrollbar {
    width: 4px;
  }

  .scroll-container::-webkit-scrollbar-track {
    background: transparent;
  }

  .scroll-container::-webkit-scrollbar-thumb {
    background-color: var(--border);
    border-radius: var(--radius-full);
  }

  .scroll-container::-webkit-scrollbar-thumb:hover {
    background-color: var(--border-hover);
  }

  .collection-wrapper {
    opacity: 0;
    transform: translateY(8px);
    animation: fadeSlideIn var(--duration-slow) var(--ease-out) forwards;
    animation-delay: var(--delay, 0ms);
  }

  @keyframes fadeSlideIn {
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .watermark {
    position: absolute;
    bottom: var(--space-3);
    left: 0;
    right: 0;
    display: flex;
    justify-content: center;
    pointer-events: none;
  }

  .watermark span {
    font-size: 0.6875rem;
    font-weight: 500;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    color: var(--text-tertiary);
    opacity: 0.5;
  }

  .header {
    display: flex;
    justify-content: flex-end;
    padding: var(--space-3);
    padding-bottom: 0;
  }

  .btn-new-collection {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-2) var(--space-3);
    background: var(--bg-secondary);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    color: var(--text-secondary);
    font-family: inherit;
    font-size: 0.75rem;
    font-weight: 500;
    cursor: pointer;
    transition: all var(--duration-fast) var(--ease-out);
  }

  .btn-new-collection:hover {
    background: var(--bg-tertiary);
    color: var(--text-primary);
    border-color: var(--border-hover);
  }

  .btn-new-collection:focus {
    outline: none;
  }

  .btn-new-collection:focus-visible {
    outline: 1px solid var(--accent);
    outline-offset: 2px;
  }

  .btn-new-collection svg {
    width: 14px;
    height: 14px;
  }
</style>
