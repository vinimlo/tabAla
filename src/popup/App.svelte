<script lang="ts">
  import { onMount } from 'svelte';
  import { slide } from 'svelte/transition';
  import type { Link } from '@/lib/types';
  import { INBOX_COLLECTION_ID } from '@/lib/types';
  import { getCurrentTab, isSaveableUrl, openLinkInNewTab } from '@/lib/tabs';
  import { linksStore, linksByCollection } from '@/lib/stores/links';
  import Toast from './components/Toast.svelte';
  import ConfirmDialog from './components/ConfirmDialog.svelte';

  let mounted = false;
  let selectedCollectionId = INBOX_COLLECTION_ID;
  let isSaving = false;
  let expandedCollectionId: string | null = null;
  let errorMessage: string | null = null;
  let successMessage: string | null = null;
  let linkToRemove: Link | null = null;

  $: loading = $linksStore.loading;
  $: collections = $linksStore.collections;
  $: allLinks = $linksStore.links;
  $: totalLinks = allLinks.length;

  $: linkCounts = new Map<string, number>();
  $: {
    const counts = new Map<string, number>();
    for (const collection of collections) {
      const collectionLinks = $linksByCollection.get(collection.id) ?? [];
      counts.set(collection.id, collectionLinks.length);
    }
    linkCounts = counts;
  }

  onMount(() => {
    void linksStore.load();
    setTimeout(() => { mounted = true; }, 50);
  });

  function toggleCollection(collectionId: string): void {
    expandedCollectionId = expandedCollectionId === collectionId ? null : collectionId;
  }

  async function handleSaveCurrentTab(): Promise<void> {
    if (isSaving) {
      return;
    }
    isSaving = true;

    try {
      const tabInfo = await getCurrentTab();

      if (!tabInfo) {
        errorMessage = 'Não foi possível obter informações da aba';
        return;
      }

      if (!isSaveableUrl(tabInfo.url)) {
        errorMessage = 'Esta página não pode ser salva';
        return;
      }

      await linksStore.addLink({
        url: tabInfo.url,
        title: tabInfo.title,
        favicon: tabInfo.favicon,
        collectionId: selectedCollectionId,
      });

      successMessage = 'Link salvo';
    } catch {
      errorMessage = 'Erro ao salvar link';
    } finally {
      isSaving = false;
    }
  }

  function getRecentLinks(collectionId: string): Link[] {
    return ($linksByCollection.get(collectionId) ?? []).slice(0, 4);
  }

  function openDashboard(): void {
    void chrome.tabs.create({ url: 'chrome://newtab' });
  }

  async function handleOpenLink(link: Link): Promise<void> {
    const result = await openLinkInNewTab(link.url);
    if (!result.success) {
      errorMessage = result.error ?? 'Erro ao abrir link';
    }
  }

  function handleRemoveLink(link: Link): void {
    linkToRemove = link;
  }

  async function confirmRemoveLink(): Promise<void> {
    if (!linkToRemove) {
      return;
    }
    const id = linkToRemove.id;
    linkToRemove = null;

    try {
      await linksStore.removeLink(id);
    } catch {
      errorMessage = 'Erro ao remover link';
    }
  }

  function clearError(): void {
    errorMessage = null;
  }

  function clearSuccess(): void {
    successMessage = null;
  }
</script>

<main class="popup" class:mounted>
  {#if loading}
    <div class="loading-state">
      <div class="spinner"></div>
      <span>carregando...</span>
    </div>
  {:else}
    <!-- Header -->
    <header class="header">
      <div class="brand">
        <span class="logo">TabAla</span>
        <span class="badge">{totalLinks}</span>
      </div>
      <button type="button" class="btn-dashboard" on:click={openDashboard} title="Abrir Dashboard">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="3" width="7" height="7"/>
          <rect x="14" y="3" width="7" height="7"/>
          <rect x="14" y="14" width="7" height="7"/>
          <rect x="3" y="14" width="7" height="7"/>
        </svg>
      </button>
    </header>

    <!-- Save Section -->
    <section class="save-section">
      <div class="save-row">
        <div class="save-icon">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 5v14M5 12h14"/>
          </svg>
        </div>
        <div class="save-info">
          <span class="save-label">Salvar em</span>
          <select class="collection-select" bind:value={selectedCollectionId}>
            {#each collections as col}
              <option value={col.id}>{col.name}</option>
            {/each}
          </select>
        </div>
        <button
          type="button"
          class="btn-save"
          on:click={handleSaveCurrentTab}
          disabled={isSaving}
        >
          {#if isSaving}
            <span class="mini-spinner"></span>
          {:else}
            Salvar
          {/if}
        </button>
      </div>
    </section>

    <!-- Collections List -->
    <section class="collections">
      {#each collections as collection (collection.id)}
        {@const count = linkCounts.get(collection.id) ?? 0}
        {@const isExpanded = expandedCollectionId === collection.id}
        {@const recentLinks = getRecentLinks(collection.id)}

        <div class="collection-item" class:expanded={isExpanded}>
          <button
            type="button"
            class="collection-header"
            on:click={() => toggleCollection(collection.id)}
          >
            <svg class="folder-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
            </svg>
            <span class="collection-name">{collection.name}</span>
            <span class="collection-count">{count}</span>
            <svg class="chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </button>

          {#if isExpanded}
            <div class="collection-links" transition:slide={{ duration: 150 }}>
              {#if recentLinks.length > 0}
                {#each recentLinks as link (link.id)}
                  <div class="link-row">
                    <button
                      type="button"
                      class="link-btn"
                      on:click={() => handleOpenLink(link)}
                      title={link.url}
                    >
                      {#if link.favicon}
                        <img src={link.favicon} alt="" width="14" height="14" class="link-favicon" />
                      {:else}
                        <span class="link-favicon-placeholder"></span>
                      {/if}
                      <span class="link-title">{link.title}</span>
                    </button>
                    <button
                      type="button"
                      class="link-remove"
                      on:click|stopPropagation={() => handleRemoveLink(link)}
                      title="Remover"
                    >
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
                        <path d="M18 6L6 18M6 6l12 12"/>
                      </svg>
                    </button>
                  </div>
                {/each}
                {#if count > 4}
                  <button type="button" class="view-more" on:click={openDashboard}>
                    Ver todos ({count})
                  </button>
                {/if}
              {:else}
                <span class="empty-hint">Nenhum link</span>
              {/if}
            </div>
          {/if}
        </div>
      {/each}
    </section>

    <!-- Footer -->
    <footer class="footer">
      <button type="button" class="btn-open-dashboard" on:click={openDashboard}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
          <polyline points="15 3 21 3 21 9"/>
          <line x1="10" y1="14" x2="21" y2="3"/>
        </svg>
        Abrir Dashboard Completo
      </button>
    </footer>
  {/if}
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
    on:cancel={() => linkToRemove = null}
  />
{/if}

<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');

  :global(:root) {
    --surface-base: #0F0E11;
    --surface-elevated: #17161A;
    --surface-overlay: #1E1D22;
    --surface-subtle: #26252B;
    --text-primary: #F5F3F0;
    --text-secondary: #A8A5A0;
    --text-tertiary: #6B6865;
    --accent-primary: #E85D42;
    --accent-secondary: #F07A62;
    --accent-soft: rgba(232, 93, 66, 0.12);
    --accent-glow: rgba(232, 93, 66, 0.24);
    --semantic-success: #7CB890;
    --semantic-error: #D4726A;
    --border-subtle: rgba(255, 255, 255, 0.04);
    --border-default: rgba(255, 255, 255, 0.08);
    --border-strong: rgba(255, 255, 255, 0.12);
    --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.3);
    --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.4);
    --shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.45);
    --shadow-xl: 0 16px 48px rgba(0, 0, 0, 0.5);
    --space-1: 0.25rem;
    --space-2: 0.5rem;
    --space-3: 0.75rem;
    --space-4: 1rem;
    --space-5: 1.5rem;
    --space-6: 2rem;
    --radius-sm: 6px;
    --radius-md: 10px;
    --radius-lg: 16px;
    --radius-xl: 20px;
    --radius-full: 9999px;
    --font-body: "Inter", system-ui, sans-serif;
    --font-mono: "JetBrains Mono", monospace;
    --text-xs: 0.6875rem;
    --text-sm: 0.75rem;
    --text-base: 0.8125rem;
    --text-md: 0.875rem;
    --duration-fast: 150ms;
    --duration-normal: 200ms;
    --duration-slow: 300ms;
    --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
    --ease-smooth: cubic-bezier(0.4, 0, 0.2, 1);
  }

  :global(*) {
    box-sizing: border-box;
  }

  :global(body) {
    margin: 0;
    padding: 0;
    font-family: var(--font-body);
    font-size: 13px;
    line-height: 1.4;
    color: var(--text-primary);
    background-color: var(--surface-base);
    -webkit-font-smoothing: antialiased;
  }

  :global(::selection) {
    background: var(--accent-soft);
    color: var(--text-primary);
  }

  .popup {
    display: flex;
    flex-direction: column;
    width: 380px;
    min-height: 480px;
    max-height: 550px;
    background: var(--surface-base);
    opacity: 0;
    transform: translateY(4px);
    transition: opacity var(--duration-fast) var(--ease-out), transform var(--duration-fast) var(--ease-out);
  }

  .popup.mounted {
    opacity: 1;
    transform: translateY(0);
  }

  .loading-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--space-2);
    padding: var(--space-5);
    color: var(--text-tertiary);
    font-size: 0.75rem;
    letter-spacing: 0.05em;
    text-transform: lowercase;
  }

  .spinner {
    width: 20px;
    height: 20px;
    border: 2px solid var(--border-subtle);
    border-top-color: var(--accent-primary);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  /* Header */
  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-3) var(--space-4);
    border-bottom: 1px solid var(--border-subtle);
  }

  .brand {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }

  .logo {
    font-size: 0.9375rem;
    font-weight: 600;
    color: var(--text-primary);
    letter-spacing: -0.02em;
  }

  .badge {
    font-family: var(--font-mono);
    font-size: 0.6875rem;
    font-weight: 500;
    color: var(--accent-primary);
    background: var(--accent-soft);
    padding: 2px 8px;
    border-radius: var(--radius-full);
  }

  .btn-dashboard {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    padding: 0;
    background: transparent;
    border: none;
    border-radius: var(--radius-sm);
    color: var(--text-tertiary);
    cursor: pointer;
    transition: all var(--duration-fast) var(--ease-out);
  }

  .btn-dashboard:hover {
    background: var(--surface-elevated);
    color: var(--text-primary);
  }

  /* Save Section */
  .save-section {
    padding: var(--space-3) var(--space-4);
    border-bottom: 1px solid var(--border-subtle);
  }

  .save-row {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-2) var(--space-3);
    background: var(--surface-elevated);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-md);
  }

  .save-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    background: var(--accent-soft);
    border-radius: var(--radius-sm);
    color: var(--accent-primary);
    flex-shrink: 0;
  }

  .save-info {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .save-label {
    font-size: 0.6875rem;
    color: var(--text-tertiary);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .collection-select {
    padding: 2px 4px;
    background: transparent;
    border: none;
    color: var(--text-primary);
    font-family: var(--font-body);
    font-size: 0.8125rem;
    font-weight: 500;
    cursor: pointer;
    margin-left: -4px;
  }

  .collection-select:focus {
    outline: none;
  }

  .collection-select option {
    background: var(--surface-elevated);
    color: var(--text-primary);
  }

  .btn-save {
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 64px;
    height: 32px;
    padding: 0 var(--space-3);
    background: var(--accent-primary);
    border: none;
    border-radius: var(--radius-sm);
    color: white;
    font-family: var(--font-body);
    font-size: 0.8125rem;
    font-weight: 500;
    cursor: pointer;
    flex-shrink: 0;
    transition: all var(--duration-fast) var(--ease-out);
  }

  .btn-save:hover:not(:disabled) {
    background: var(--accent-secondary);
    transform: translateY(-1px);
  }

  .btn-save:active:not(:disabled) {
    transform: translateY(0);
  }

  .btn-save:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }

  .mini-spinner {
    width: 14px;
    height: 14px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-top-color: white;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  /* Collections */
  .collections {
    flex: 1;
    overflow-y: auto;
    padding: var(--space-2);
  }

  .collections::-webkit-scrollbar {
    width: 4px;
  }

  .collections::-webkit-scrollbar-track {
    background: transparent;
  }

  .collections::-webkit-scrollbar-thumb {
    background-color: var(--border-default);
    border-radius: var(--radius-full);
  }

  .collection-item {
    margin-bottom: var(--space-1);
  }

  .collection-header {
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
    font-size: 0.8125rem;
    text-align: left;
    cursor: pointer;
    transition: all var(--duration-fast) var(--ease-out);
  }

  .collection-header:hover {
    background: var(--surface-elevated);
    color: var(--text-primary);
  }

  .folder-icon {
    flex-shrink: 0;
    color: var(--text-tertiary);
  }

  .collection-name {
    flex: 1;
    font-weight: 500;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .collection-count {
    font-family: var(--font-mono);
    font-size: 0.6875rem;
    color: var(--text-tertiary);
    background: var(--surface-overlay);
    padding: 1px 6px;
    border-radius: var(--radius-full);
  }

  .chevron {
    flex-shrink: 0;
    color: var(--text-tertiary);
    transition: transform var(--duration-fast) var(--ease-out);
  }

  .collection-item.expanded .chevron {
    transform: rotate(180deg);
  }

  .collection-links {
    padding-left: calc(var(--space-3) + 14px + var(--space-2));
    padding-right: var(--space-2);
    padding-bottom: var(--space-2);
  }

  .link-row {
    display: flex;
    align-items: center;
    gap: var(--space-1);
  }

  .link-btn {
    flex: 1;
    display: flex;
    align-items: center;
    gap: var(--space-2);
    min-width: 0;
    padding: var(--space-1) var(--space-2);
    background: transparent;
    border: none;
    border-radius: var(--radius-sm);
    color: var(--text-secondary);
    font-family: var(--font-body);
    font-size: 0.75rem;
    text-align: left;
    cursor: pointer;
    transition: all var(--duration-fast) var(--ease-out);
  }

  .link-btn:hover {
    background: var(--surface-elevated);
    color: var(--text-primary);
  }

  .link-favicon {
    width: 14px;
    height: 14px;
    border-radius: 2px;
    flex-shrink: 0;
  }

  .link-favicon-placeholder {
    width: 14px;
    height: 14px;
    background: var(--surface-subtle);
    border-radius: 2px;
    flex-shrink: 0;
  }

  .link-title {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .link-remove {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    padding: 0;
    background: transparent;
    border: none;
    border-radius: var(--radius-sm);
    color: var(--text-tertiary);
    cursor: pointer;
    opacity: 0;
    transition: all var(--duration-fast) var(--ease-out);
  }

  .link-row:hover .link-remove {
    opacity: 1;
  }

  .link-remove:hover {
    background: rgba(212, 114, 106, 0.15);
    color: var(--semantic-error);
  }

  .view-more {
    display: block;
    width: 100%;
    padding: var(--space-1) var(--space-2);
    background: transparent;
    border: none;
    color: var(--accent-primary);
    font-family: var(--font-body);
    font-size: 0.6875rem;
    font-weight: 500;
    text-align: left;
    cursor: pointer;
    transition: color var(--duration-fast) var(--ease-out);
  }

  .view-more:hover {
    color: var(--accent-secondary);
    text-decoration: underline;
  }

  .empty-hint {
    display: block;
    padding: var(--space-2);
    font-size: 0.75rem;
    color: var(--text-tertiary);
    font-style: italic;
  }

  /* Footer */
  .footer {
    padding: var(--space-3) var(--space-4);
    border-top: 1px solid var(--border-subtle);
  }

  .btn-open-dashboard {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-2);
    width: 100%;
    padding: var(--space-3);
    background: var(--surface-elevated);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-md);
    color: var(--text-secondary);
    font-family: var(--font-body);
    font-size: 0.8125rem;
    font-weight: 500;
    cursor: pointer;
    transition: all var(--duration-fast) var(--ease-out);
  }

  .btn-open-dashboard:hover {
    background: var(--surface-overlay);
    border-color: var(--border-default);
    color: var(--text-primary);
  }

  .btn-open-dashboard svg {
    color: var(--text-tertiary);
    transition: color var(--duration-fast) var(--ease-out);
  }

  .btn-open-dashboard:hover svg {
    color: var(--accent-primary);
  }
</style>
