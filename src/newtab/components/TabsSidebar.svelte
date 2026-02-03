<script lang="ts">
  import { onMount, onDestroy, createEventDispatcher } from 'svelte';
  import type { OrganizedTabs, BrowserTab, TabGroup } from '@/lib/tabs';
  import { getOrganizedTabs, focusTab, closeTab } from '@/lib/tabs';
  import TabSection from './TabSection.svelte';
  import TabItem from './TabItem.svelte';

  export let expanded = false;

  const dispatch = createEventDispatcher<{
    saveTab: BrowserTab;
    createCollectionFromGroup: { group: TabGroup; tabs: BrowserTab[] };
  }>();

  let organizedTabs: OrganizedTabs = {
    pinned: [],
    groups: new Map(),
    ungrouped: [],
  };
  let loading = true;
  let totalTabs = 0;
  let cleanupListeners: (() => void) | null = null;

  $: totalTabs =
    organizedTabs.pinned.length +
    organizedTabs.ungrouped.length +
    Array.from(organizedTabs.groups.values()).reduce((sum, g) => sum + g.tabs.length, 0);

  onMount(async () => {
    await loadTabs();
    setupTabListeners();
  });

  onDestroy(() => {
    if (cleanupListeners) {
      cleanupListeners();
    }
  });

  async function loadTabs(): Promise<void> {
    loading = true;
    try {
      organizedTabs = await getOrganizedTabs();
    } catch (error) {
      console.error('Failed to load tabs:', error);
    } finally {
      loading = false;
    }
  }

  function setupTabListeners(): void {
    const handleTabChange = (): void => {
      void loadTabs();
    };

    chrome.tabs.onCreated.addListener(handleTabChange);
    chrome.tabs.onRemoved.addListener(handleTabChange);
    chrome.tabs.onUpdated.addListener(handleTabChange);
    chrome.tabs.onActivated.addListener(handleTabChange);

    // Tab groups events if available
    if (chrome.tabGroups !== undefined) {
      chrome.tabGroups.onUpdated.addListener(handleTabChange);
      chrome.tabGroups.onCreated.addListener(handleTabChange);
      chrome.tabGroups.onRemoved.addListener(handleTabChange);
    }

    cleanupListeners = () => {
      chrome.tabs.onCreated.removeListener(handleTabChange);
      chrome.tabs.onRemoved.removeListener(handleTabChange);
      chrome.tabs.onUpdated.removeListener(handleTabChange);
      chrome.tabs.onActivated.removeListener(handleTabChange);

      if (chrome.tabGroups !== undefined) {
        chrome.tabGroups.onUpdated.removeListener(handleTabChange);
        chrome.tabGroups.onCreated.removeListener(handleTabChange);
        chrome.tabGroups.onRemoved.removeListener(handleTabChange);
      }
    };
  }

  function toggleSidebar(): void {
    expanded = !expanded;
  }

  async function handleTabClick(tab: BrowserTab): Promise<void> {
    await focusTab(tab.id);
  }

  async function handleTabClose(tab: BrowserTab): Promise<void> {
    await closeTab(tab.id);
  }

  function handleTabDragStart(event: DragEvent, tab: BrowserTab): void {
    if (event.dataTransfer === null) {
      return;
    }

    event.dataTransfer.effectAllowed = 'copy';
    event.dataTransfer.setData('application/json', JSON.stringify({
      type: 'tab',
      data: {
        id: tab.id,
        url: tab.url,
        title: tab.title,
        favicon: tab.favicon,
      },
    }));
  }

  function handleCreateCollection(group: TabGroup, tabs: BrowserTab[]): void {
    dispatch('createCollectionFromGroup', { group, tabs });
  }
</script>

<aside class="sidebar" class:expanded>
  {#if expanded}
    <header class="sidebar-header">
      <h2 class="sidebar-title">
        Abas Abertas
        <span class="tab-count">{totalTabs}</span>
      </h2>
      <button
        type="button"
        class="btn-toggle"
        on:click={toggleSidebar}
        aria-label="Fechar sidebar"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M15 18l-6-6 6-6"/>
        </svg>
      </button>
    </header>

    <div class="sidebar-content">
      {#if loading}
        <div class="loading-state">
          <span>Carregando...</span>
        </div>
      {:else}
        {#if organizedTabs.pinned.length > 0}
          <TabSection title="Pinadas" count={organizedTabs.pinned.length} icon="pin" defaultExpanded>
            {#each organizedTabs.pinned as tab (tab.id)}
              <TabItem
                {tab}
                isActive={tab.id === organizedTabs.activeTabId}
                isPinned
                on:click={() => handleTabClick(tab)}
                on:close={() => handleTabClose(tab)}
                on:dragstart={(e) => handleTabDragStart(e.detail, tab)}
              />
            {/each}
          </TabSection>
        {/if}

        {#each Array.from(organizedTabs.groups.entries()) as [groupId, { group, tabs }] (groupId)}
          {#if tabs.length > 0}
            <TabSection
              title={group.title || 'Grupo sem nome'}
              count={tabs.length}
              icon="group"
              color={group.color}
              showCreateCollection
              on:createCollection={() => handleCreateCollection(group, tabs)}
            >
              {#each tabs as tab (tab.id)}
                <TabItem
                  {tab}
                  isActive={tab.id === organizedTabs.activeTabId}
                  groupColor={group.color}
                  on:click={() => handleTabClick(tab)}
                  on:close={() => handleTabClose(tab)}
                  on:dragstart={(e) => handleTabDragStart(e.detail, tab)}
                />
              {/each}
            </TabSection>
          {/if}
        {/each}

        {#if organizedTabs.ungrouped.length > 0}
          <TabSection title="Outras abas" count={organizedTabs.ungrouped.length} icon="tabs" defaultExpanded>
            {#each organizedTabs.ungrouped as tab (tab.id)}
              <TabItem
                {tab}
                isActive={tab.id === organizedTabs.activeTabId}
                on:click={() => handleTabClick(tab)}
                on:close={() => handleTabClose(tab)}
                on:dragstart={(e) => handleTabDragStart(e.detail, tab)}
              />
            {/each}
          </TabSection>
        {/if}

        {#if totalTabs === 0}
          <div class="empty-state">
            <span>Nenhuma aba aberta</span>
          </div>
        {/if}
      {/if}
    </div>
  {:else}
    <button
      type="button"
      class="sidebar-collapsed"
      on:click={toggleSidebar}
      aria-label="Abrir sidebar de abas"
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2"/>
        <path d="M9 3v18"/>
      </svg>
      {#if totalTabs > 0}
        <span class="badge">{totalTabs}</span>
      {/if}
    </button>
  {/if}
</aside>

<style>
  .sidebar {
    display: flex;
    flex-direction: column;
    width: var(--sidebar-collapsed-width);
    height: 100%;
    background: var(--bg-secondary);
    border-right: 1px solid var(--border);
    transition: width var(--sidebar-transition);
    flex-shrink: 0;
    overflow: hidden;
  }

  .sidebar.expanded {
    width: var(--sidebar-width);
  }

  .sidebar-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-3) var(--space-4);
    border-bottom: 1px solid var(--border);
    min-height: 52px;
  }

  .sidebar-title {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    margin: 0;
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--text-primary);
  }

  .tab-count {
    font-size: 0.6875rem;
    font-weight: 500;
    color: var(--text-tertiary);
    background: var(--bg-tertiary);
    padding: 2px 6px;
    border-radius: var(--radius-full);
  }

  .btn-toggle {
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

  .btn-toggle:hover {
    background: var(--bg-tertiary);
    color: var(--text-primary);
  }

  .sidebar-content {
    flex: 1;
    overflow-y: auto;
    padding: var(--space-2);
  }

  .sidebar-content::-webkit-scrollbar {
    width: 4px;
  }

  .sidebar-content::-webkit-scrollbar-thumb {
    background-color: var(--border);
    border-radius: var(--radius-full);
  }

  .sidebar-collapsed {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-start;
    gap: var(--space-2);
    width: 100%;
    height: 100%;
    padding: var(--space-3) 0;
    background: transparent;
    border: none;
    color: var(--text-secondary);
    cursor: pointer;
    transition: all var(--duration-fast) var(--ease-out);
  }

  .sidebar-collapsed:hover {
    background: var(--bg-tertiary);
    color: var(--text-primary);
  }

  .badge {
    font-size: 0.6875rem;
    font-weight: 600;
    color: var(--text-primary);
    background: var(--accent);
    padding: 2px 6px;
    border-radius: var(--radius-full);
    min-width: 20px;
    text-align: center;
  }

  .loading-state,
  .empty-state {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--space-6);
    color: var(--text-tertiary);
    font-size: 0.8125rem;
  }
</style>
