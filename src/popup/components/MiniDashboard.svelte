<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { slide } from 'svelte/transition';
  import type { Link, Collection } from '@/lib/types';
  import { INBOX_COLLECTION_ID } from '@/lib/types';
  import { linksStore, linksByCollection } from '@/lib/stores/links';
  import { getCurrentTab, isSaveableUrl, openLinkInNewTab } from '@/lib/tabs';

  export let collections: Collection[] = [];
  export let links: Link[] = [];

  const dispatch = createEventDispatcher<{
    openSettings: void;
    success: string;
    error: string;
  }>();

  let selectedCollectionId = INBOX_COLLECTION_ID;
  let isSaving = false;
  let expandedCollectionId: string | null = null;

  $: linkCounts = new Map<string, number>();
  $: {
    const counts = new Map<string, number>();
    for (const collection of collections) {
      const collectionLinks = $linksByCollection.get(collection.id) ?? [];
      counts.set(collection.id, collectionLinks.length);
    }
    linkCounts = counts;
  }

  function toggleCollection(collectionId: string): void {
    if (expandedCollectionId === collectionId) {
      expandedCollectionId = null;
    } else {
      expandedCollectionId = collectionId;
    }
  }

  async function handleSaveCurrentTab(): Promise<void> {
    if (isSaving) return;

    isSaving = true;

    try {
      const tabInfo = await getCurrentTab();

      if (!tabInfo) {
        dispatch('error', 'Nao foi possivel obter informacoes da aba');
        return;
      }

      if (!isSaveableUrl(tabInfo.url)) {
        dispatch('error', 'Esta pagina nao pode ser salva');
        return;
      }

      await linksStore.addLink({
        url: tabInfo.url,
        title: tabInfo.title,
        favicon: tabInfo.favicon,
        collectionId: selectedCollectionId,
      });

      dispatch('success', 'Link salvo');
    } catch (err) {
      dispatch('error', 'Erro ao salvar link');
    } finally {
      isSaving = false;
    }
  }

  function getRecentLinks(collectionId: string): Link[] {
    const collectionLinks = $linksByCollection.get(collectionId) ?? [];
    return collectionLinks.slice(0, 3);
  }

  function openDashboard(): void {
    chrome.tabs.create({ url: 'chrome://newtab' });
  }

  async function handleOpenLink(link: Link): Promise<void> {
    const result = await openLinkInNewTab(link.url);
    if (!result.success) {
      dispatch('error', result.error ?? 'Erro ao abrir link');
    }
  }

  function openFilteredDashboard(collectionId: string): void {
    // Opens newtab - in future could pass filter param
    chrome.tabs.create({ url: 'chrome://newtab' });
  }
</script>

<div class="mini-dashboard">
  <header class="header">
    <span class="logo">TabAla</span>
    <button
      type="button"
      class="btn-settings"
      on:click={() => dispatch('openSettings')}
      aria-label="Configuracoes"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="3"/>
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
      </svg>
    </button>
  </header>

  <section class="save-section">
    <div class="save-card">
      <div class="save-icon">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
          <polyline points="17 21 17 13 7 13 7 21"/>
          <polyline points="7 3 7 8 15 8"/>
        </svg>
      </div>
      <div class="save-content">
        <span class="save-title">Salvar aba atual</span>
        <select
          class="collection-select"
          bind:value={selectedCollectionId}
        >
          {#each collections as collection}
            <option value={collection.id}>{collection.name}</option>
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
          <span class="spinner"></span>
        {:else}
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        {/if}
      </button>
    </div>
  </section>

  <section class="collections-section">
    {#each collections as collection}
      <div class="collection-item">
        <button
          type="button"
          class="collection-header"
          class:expanded={expandedCollectionId === collection.id}
          on:click={() => toggleCollection(collection.id)}
        >
          <svg class="folder-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
          </svg>
          <span class="collection-name">{collection.name}</span>
          <span class="collection-count">({linkCounts.get(collection.id) ?? 0})</span>
          <svg class="chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </button>

        {#if expandedCollectionId === collection.id}
          <div class="collection-links" transition:slide={{ duration: 200 }}>
            {#each getRecentLinks(collection.id) as link}
              <button
                type="button"
                class="link-item"
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
            {:else}
              <span class="empty-collection">Nenhum link</span>
            {/each}
            {#if (linkCounts.get(collection.id) ?? 0) > 3}
              <button
                type="button"
                class="view-all"
                on:click={() => openFilteredDashboard(collection.id)}
              >
                Ver todos ({linkCounts.get(collection.id)})
              </button>
            {/if}
          </div>
        {/if}
      </div>
    {/each}
  </section>

  <footer class="footer">
    <button type="button" class="btn-dashboard" on:click={openDashboard}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect x="3" y="3" width="7" height="7"/>
        <rect x="14" y="3" width="7" height="7"/>
        <rect x="14" y="14" width="7" height="7"/>
        <rect x="3" y="14" width="7" height="7"/>
      </svg>
      Abrir Dashboard
    </button>
  </footer>
</div>

<style>
  .mini-dashboard {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: var(--bg-primary);
  }

  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-3) var(--space-4);
    border-bottom: 1px solid var(--border);
  }

  .logo {
    font-size: 0.9375rem;
    font-weight: 600;
    color: var(--text-primary);
    letter-spacing: -0.01em;
  }

  .btn-settings {
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

  .btn-settings:hover {
    background: var(--bg-secondary);
    color: var(--text-primary);
  }

  .save-section {
    padding: var(--space-4);
    border-bottom: 1px solid var(--border);
  }

  .save-card {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-3);
    background: var(--bg-secondary);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
  }

  .save-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    background: var(--accent-soft);
    border-radius: var(--radius-sm);
    color: var(--accent);
    flex-shrink: 0;
  }

  .save-content {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .save-title {
    font-size: 0.8125rem;
    font-weight: 500;
    color: var(--text-primary);
  }

  .collection-select {
    padding: var(--space-1) var(--space-2);
    background: var(--bg-tertiary);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    color: var(--text-secondary);
    font-family: inherit;
    font-size: 0.75rem;
    cursor: pointer;
  }

  .collection-select:focus {
    outline: none;
    border-color: var(--accent);
  }

  .btn-save {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    padding: 0;
    background: var(--accent);
    border: none;
    border-radius: var(--radius-sm);
    color: white;
    cursor: pointer;
    flex-shrink: 0;
    transition: all var(--duration-fast) var(--ease-out);
  }

  .btn-save:hover:not(:disabled) {
    filter: brightness(1.1);
  }

  .btn-save:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }

  .spinner {
    width: 16px;
    height: 16px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-top-color: white;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .collections-section {
    flex: 1;
    overflow-y: auto;
    padding: var(--space-2);
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
    font-family: inherit;
    font-size: 0.8125rem;
    text-align: left;
    cursor: pointer;
    transition: all var(--duration-fast) var(--ease-out);
  }

  .collection-header:hover {
    background: var(--bg-secondary);
    color: var(--text-primary);
  }

  .folder-icon {
    flex-shrink: 0;
  }

  .collection-name {
    flex: 1;
    font-weight: 500;
  }

  .collection-count {
    font-size: 0.6875rem;
    color: var(--text-tertiary);
  }

  .chevron {
    flex-shrink: 0;
    transition: transform var(--duration-fast) var(--ease-out);
  }

  .collection-header.expanded .chevron {
    transform: rotate(90deg);
  }

  .collection-links {
    padding-left: calc(var(--space-3) + 16px + var(--space-2));
  }

  .link-item {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    width: 100%;
    padding: var(--space-2);
    background: transparent;
    border: none;
    border-radius: var(--radius-sm);
    color: var(--text-secondary);
    font-family: inherit;
    font-size: 0.75rem;
    text-align: left;
    cursor: pointer;
    transition: all var(--duration-fast) var(--ease-out);
  }

  .link-item:hover {
    background: var(--bg-secondary);
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
    background: var(--bg-tertiary);
    border-radius: 2px;
    flex-shrink: 0;
  }

  .link-title {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .empty-collection {
    display: block;
    padding: var(--space-2);
    font-size: 0.75rem;
    color: var(--text-tertiary);
    font-style: italic;
  }

  .view-all {
    display: block;
    width: 100%;
    padding: var(--space-2);
    background: transparent;
    border: none;
    color: var(--accent);
    font-family: inherit;
    font-size: 0.6875rem;
    font-weight: 500;
    text-align: left;
    cursor: pointer;
  }

  .view-all:hover {
    text-decoration: underline;
  }

  .footer {
    padding: var(--space-3) var(--space-4);
    border-top: 1px solid var(--border);
  }

  .btn-dashboard {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-2);
    width: 100%;
    padding: var(--space-3);
    background: var(--bg-secondary);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    color: var(--text-secondary);
    font-family: inherit;
    font-size: 0.8125rem;
    font-weight: 500;
    cursor: pointer;
    transition: all var(--duration-fast) var(--ease-out);
  }

  .btn-dashboard:hover {
    background: var(--bg-tertiary);
    color: var(--text-primary);
    border-color: var(--border-hover);
  }
</style>
