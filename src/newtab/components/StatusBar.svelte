<script lang="ts">
  import type { Link, Collection } from '@/lib/types';

  export let links: Link[] = [];
  export let collections: Collection[] = [];

  $: totalLinks = links.length;
  $: totalCollections = collections.length;
  $: lastSavedAt = links[0]?.createdAt ?? null;

  function formatRelativeTime(timestamp: number): string {
    const now = Date.now();
    const diff = now - timestamp;

    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'agora';
    if (minutes < 60) return `ha ${minutes} min`;
    if (hours < 24) return `ha ${hours} hora${hours > 1 ? 's' : ''}`;
    return `ha ${days} dia${days > 1 ? 's' : ''}`;
  }
</script>

<footer class="status-bar">
  <div class="stats">
    <span class="stat">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
      </svg>
      {totalLinks} link{totalLinks !== 1 ? 's' : ''}
    </span>

    <span class="divider">•</span>

    <span class="stat">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
      </svg>
      {totalCollections} colecao{totalCollections !== 1 ? 'es' : ''}
    </span>

    {#if lastSavedAt}
      <span class="divider">•</span>
      <span class="stat last-saved">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <polyline points="12 6 12 12 16 14"/>
        </svg>
        Ultimo salvo: {formatRelativeTime(lastSavedAt)}
      </span>
    {/if}
  </div>

  <div class="brand">
    <span>tabala</span>
  </div>
</footer>

<style>
  .status-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-3) var(--space-5);
    background: var(--bg-secondary);
    border-top: 1px solid var(--border);
    color: var(--text-tertiary);
    font-size: 0.75rem;
  }

  .stats {
    display: flex;
    align-items: center;
    gap: var(--space-3);
  }

  .stat {
    display: inline-flex;
    align-items: center;
    gap: var(--space-1);
  }

  .stat svg {
    opacity: 0.6;
  }

  .divider {
    opacity: 0.4;
  }

  .last-saved {
    color: var(--text-tertiary);
    opacity: 0.8;
  }

  .brand {
    font-weight: 600;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    opacity: 0.4;
  }
</style>
