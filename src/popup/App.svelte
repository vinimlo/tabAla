<script lang="ts">
  import { onMount } from 'svelte';
  import { flip } from 'svelte/animate';
  import type { Link } from '@/lib/types';
  import { getLinks, removeLink } from '@/lib/storage';
  import LinkItem from './components/LinkItem.svelte';
  import ConfirmDialog from './components/ConfirmDialog.svelte';

  let links: Link[] = [];
  let isLoading = true;
  let linkToRemove: Link | null = null;

  onMount(async () => {
    try {
      links = await getLinks();
    } catch (error) {
      console.error('Failed to load links:', error);
    } finally {
      isLoading = false;
    }
  });

  function handleRemoveRequest(event: CustomEvent<{ linkId: string }>) {
    const link = links.find((l) => l.id === event.detail.linkId);
    if (link) {
      linkToRemove = link;
    }
  }

  async function handleConfirmRemove() {
    if (!linkToRemove) {
      return;
    }

    const linkId = linkToRemove.id;
    linkToRemove = null;

    const result = await removeLink(linkId);
    if (result.success) {
      links = links.filter((l) => l.id !== linkId);
    } else {
      console.error('Failed to remove link:', result.error);
    }
  }

  function handleCancelRemove() {
    linkToRemove = null;
  }

  function handleOpenLink(event: CustomEvent<{ url: string }>) {
    void chrome.tabs.create({ url: event.detail.url, active: true });
  }
</script>

<main>
  <header>
    <h1>TabAla</h1>
  </header>

  {#if isLoading}
    <div class="loading">
      <span class="spinner"></span>
    </div>
  {:else if links.length === 0}
    <div class="empty-state">
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.5"
        aria-hidden="true"
      >
        <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
        <polyline points="13 2 13 9 20 9" />
      </svg>
      <p>Nenhum link salvo</p>
    </div>
  {:else}
    <div class="link-list" role="list">
      {#each links as link (link.id)}
        <div animate:flip={{ duration: 200 }}>
          <LinkItem
            {link}
            on:remove={handleRemoveRequest}
            on:open={handleOpenLink}
          />
        </div>
      {/each}
    </div>
  {/if}
</main>

{#if linkToRemove}
  <ConfirmDialog
    message="Remover este link?"
    confirmText="Remover"
    cancelText="Cancelar"
    on:confirm={handleConfirmRemove}
    on:cancel={handleCancelRemove}
  />
{/if}

<style>
  main {
    padding: 1rem;
    font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    min-height: 100%;
    box-sizing: border-box;
  }

  header {
    margin-bottom: 1rem;
    padding-bottom: 0.75rem;
    border-bottom: 1px solid #e5e7eb;
  }

  h1 {
    color: #1f2937;
    margin: 0;
    font-size: 1.25rem;
    font-weight: 600;
  }

  .loading {
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 3rem 0;
  }

  .spinner {
    width: 24px;
    height: 24px;
    border: 2px solid #e5e7eb;
    border-top-color: #3b82f6;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 3rem 1rem;
    color: #9ca3af;
  }

  .empty-state svg {
    width: 48px;
    height: 48px;
    margin-bottom: 0.75rem;
  }

  .empty-state p {
    margin: 0;
    font-size: 0.875rem;
  }

  .link-list {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }
</style>
