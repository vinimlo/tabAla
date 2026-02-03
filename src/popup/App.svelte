<script lang="ts">
  import { onMount } from 'svelte';
  import type { Link } from '@/lib/types';
  import { getLinks } from '@/lib/storage';
  import LinkItem from './components/LinkItem.svelte';
  import Toast from './components/Toast.svelte';

  let links: Link[] = [];
  let isLoading = true;
  let errorMessage: string | null = null;

  onMount(async () => {
    try {
      links = await getLinks();
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : 'Erro ao carregar links';
    } finally {
      isLoading = false;
    }
  });

  function handleLinkError(event: CustomEvent<{ message: string }>) {
    errorMessage = event.detail.message;
  }

  function clearError() {
    errorMessage = null;
  }
</script>

<main>
  <header class="header">
    <h1>TabAla</h1>
  </header>

  <div class="content">
    {#if isLoading}
      <p class="empty-state">Carregando...</p>
    {:else if links.length === 0}
      <p class="empty-state">Nenhum link salvo ainda.</p>
    {:else}
      <ul class="links-list" role="list">
        {#each links as link (link.id)}
          <LinkItem {link} on:error={handleLinkError} />
        {/each}
      </ul>
    {/if}
  </div>

  {#if errorMessage}
    <Toast message={errorMessage} onClose={clearError} />
  {/if}
</main>

<style>
  main {
    display: flex;
    flex-direction: column;
    height: 100%;
    font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }

  .header {
    padding: 16px;
    border-bottom: 1px solid #e5e7eb;
  }

  h1 {
    margin: 0;
    font-size: 18px;
    font-weight: 600;
    color: #111827;
  }

  .content {
    flex: 1;
    overflow-y: auto;
    padding: 16px;
  }

  .empty-state {
    text-align: center;
    color: #6b7280;
    font-size: 14px;
    padding: 32px 16px;
    margin: 0;
  }

  .links-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin: 0;
    padding: 0;
    list-style: none;
  }
</style>
