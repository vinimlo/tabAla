<script lang="ts">
  import type { Link, Collection, Workspace } from '@/lib/types';

  export let links: Link[] = [];
  export let collections: Collection[] = [];
  export let workspace: Workspace | undefined = undefined;

  $: totalLinks = links.length;
  $: totalCollections = collections.length;
  $: lastSavedAt = links[0]?.createdAt ?? null;

  function formatRelativeTime(timestamp: number): string {
    const now = Date.now();
    const diff = now - timestamp;

    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) { return 'agora'; }
    if (minutes < 60) { return `ha ${minutes} min`; }
    if (hours < 24) { return `ha ${hours} hora${hours > 1 ? 's' : ''}`; }
    return `ha ${days} dia${days > 1 ? 's' : ''}`;
  }
</script>

<footer class="status-bar">
  <div class="stats">
    {#if workspace}
      <span class="stat workspace">
        <span class="workspace-dot" style="--color: {workspace.color}"></span>
        {workspace.name}
      </span>
      <span class="divider">•</span>
    {/if}
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
    height: 44px;
    padding: 0 var(--space-5);
    background: var(--surface-elevated);
    border-top: 1px solid var(--border-subtle);
    color: var(--text-tertiary);
    font-family: var(--font-body);
    font-size: var(--text-xs);
  }

  .stats {
    display: flex;
    align-items: center;
    gap: var(--space-4);
  }

  .stat {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    transition: color var(--duration-fast) var(--ease-out);
  }

  .stat:hover {
    color: var(--text-secondary);
  }

  .stat svg {
    opacity: 0.6;
    transition: opacity var(--duration-fast) var(--ease-out);
  }

  .stat:hover svg {
    opacity: 0.8;
  }

  .divider {
    opacity: 0.3;
    font-size: 0.5rem;
  }

  .last-saved {
    color: var(--text-tertiary);
    opacity: 0.8;
  }

  .workspace {
    font-weight: 500;
    color: var(--text-secondary);
  }

  .workspace-dot {
    width: 8px;
    height: 8px;
    border-radius: var(--radius-full);
    background-color: var(--color);
  }

  .brand {
    font-family: var(--font-body);
    font-weight: 500;
    font-size: var(--text-xs);
    letter-spacing: 0.2em;
    text-transform: uppercase;
    font-variant: small-caps;
    color: var(--text-tertiary);
    opacity: 0.4;
    transition: opacity var(--duration-fast) var(--ease-out);
    cursor: default;
  }

  .brand:hover {
    opacity: 0.6;
  }
</style>
