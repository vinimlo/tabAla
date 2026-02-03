<script lang="ts">
  import { onMount } from 'svelte';
  import type { Link } from '@/lib/types';
  import { linksStore, linksByCollection } from '@stores/links';
  import CollectionGroup from '@components/CollectionGroup.svelte';
  import EmptyState from '@components/EmptyState.svelte';

  const BATCH_SIZE = 50;

  let expandedCollections: Set<string> = new Set(['inbox']);
  let visibleCount = BATCH_SIZE;
  let scrollContainer: HTMLElement;

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
  }).filter((group) => group.links.length > 0 || group.collection.id === 'inbox');

  $: hasMoreToLoad = visibleCount < totalLinks;

  onMount(() => {
    linksStore.load();
    expandedCollections = new Set(['inbox']);
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
    try {
      await chrome.tabs.create({ url: link.url });
    } catch (err) {
      console.error('Failed to open link:', err);
    }
  }

  async function handleRemoveLink(event: CustomEvent<string>): Promise<void> {
    const linkId = event.detail;
    try {
      await linksStore.removeLink(linkId);
    } catch (err) {
      console.error('Failed to remove link:', err);
    }
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
</script>

<main class="app">
  <header class="app-header">
    <h1 class="app-title">TabAla</h1>
  </header>

  {#if loading}
    <div class="loading">
      <div class="spinner"></div>
      <span>Carregando...</span>
    </div>
  {:else if error}
    <div class="error">
      <p>Erro ao carregar dados</p>
      <button type="button" on:click={() => linksStore.load()}>Tentar novamente</button>
    </div>
  {:else if isEmpty}
    <EmptyState />
  {:else}
    <div
      class="scroll-container"
      bind:this={scrollContainer}
      on:scroll={handleScroll}
    >
      {#each visibleCollections as { collection, links } (collection.id)}
        <CollectionGroup
          {collection}
          {links}
          expanded={expandedCollections.has(collection.id)}
          on:toggle={handleToggle}
          on:open={handleOpenLink}
          on:remove={handleRemoveLink}
        />
      {/each}
    </div>
  {/if}
</main>

<style>
  :global(*) {
    box-sizing: border-box;
  }

  :global(body) {
    margin: 0;
    padding: 0;
    font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 14px;
    line-height: 1.5;
    color: #333;
    background-color: #fff;
  }

  .app {
    display: flex;
    flex-direction: column;
    height: 100vh;
    max-height: 600px;
    min-width: 300px;
    max-width: 400px;
  }

  .app-header {
    flex-shrink: 0;
    padding: 12px 16px;
    border-bottom: 1px solid #eee;
  }

  .app-title {
    font-size: 18px;
    font-weight: 600;
    color: #333;
    margin: 0;
  }

  .loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    flex: 1;
    color: #888;
  }

  .spinner {
    width: 24px;
    height: 24px;
    border: 2px solid #eee;
    border-top-color: #666;
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
    gap: 12px;
    flex: 1;
    padding: 24px;
    text-align: center;
  }

  .error p {
    color: #d00;
    margin: 0;
  }

  .error button {
    padding: 8px 16px;
    border: 1px solid #ddd;
    border-radius: 6px;
    background: #fff;
    color: #333;
    font-size: 14px;
    cursor: pointer;
    transition: background-color 0.15s ease;
  }

  .error button:hover {
    background-color: #f5f5f5;
  }

  .scroll-container {
    flex: 1;
    overflow-y: auto;
    padding: 8px;
  }

  .scroll-container::-webkit-scrollbar {
    width: 6px;
  }

  .scroll-container::-webkit-scrollbar-track {
    background: transparent;
  }

  .scroll-container::-webkit-scrollbar-thumb {
    background-color: #ddd;
    border-radius: 3px;
  }

  .scroll-container::-webkit-scrollbar-thumb:hover {
    background-color: #ccc;
  }
</style>
