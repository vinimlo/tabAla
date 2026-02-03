<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { Link } from '@/lib/types';

  export let link: Link;
  export let isDragging: boolean = false;

  const dispatch = createEventDispatcher<{
    open: Link;
    remove: { id: string; title: string };
  }>();

  function getDomain(url: string): string {
    try {
      const parsed = new URL(url);
      return parsed.hostname.replace('www.', '');
    } catch {
      return url;
    }
  }

  function handleOpen(): void {
    dispatch('open', link);
  }

  function handleRemove(event: MouseEvent): void {
    event.stopPropagation();
    dispatch('remove', { id: link.id, title: link.title });
  }

  function handleKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleOpen();
    }
  }

  $: domain = getDomain(link.url);
</script>

<div
  class="link-card"
  class:dragging={isDragging}
  on:click={handleOpen}
  on:keydown={handleKeydown}
  role="button"
  tabindex="0"
>
  <div class="link-favicon">
    {#if link.favicon}
      <img src={link.favicon} alt="" width="16" height="16" loading="lazy" />
    {:else}
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"/>
        <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
      </svg>
    {/if}
  </div>

  <div class="link-content">
    <span class="link-title" title={link.title}>{link.title}</span>
    <span class="link-domain">{domain}</span>
  </div>

  <div class="link-actions">
    <button
      type="button"
      class="btn-action btn-open"
      on:click|stopPropagation={handleOpen}
      aria-label="Abrir link"
      title="Abrir em nova aba"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
        <polyline points="15 3 21 3 21 9"/>
        <line x1="10" y1="14" x2="21" y2="3"/>
      </svg>
    </button>
    <button
      type="button"
      class="btn-action btn-remove"
      on:click={handleRemove}
      aria-label="Remover link"
      title="Remover"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
        <path d="M18 6L6 18M6 6l12 12"/>
      </svg>
    </button>
  </div>
</div>

<style>
  .link-card {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-3);
    background: var(--bg-tertiary);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    cursor: pointer;
    transition: all var(--duration-fast) var(--ease-out);
    user-select: none;
  }

  .link-card:hover {
    background: var(--bg-elevated);
    border-color: var(--border-hover);
    transform: translateY(-1px);
    box-shadow: var(--shadow-sm);
  }

  .link-card:focus {
    outline: none;
  }

  .link-card:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }

  .link-card.dragging {
    opacity: 0.6;
    transform: rotate(2deg);
    box-shadow: var(--shadow-lg);
  }

  .link-favicon {
    flex-shrink: 0;
    width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-tertiary);
  }

  .link-favicon img {
    width: 16px;
    height: 16px;
    border-radius: 2px;
    object-fit: contain;
  }

  .link-content {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .link-title {
    font-size: 0.8125rem;
    font-weight: 500;
    color: var(--text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    line-height: 1.3;
  }

  .link-domain {
    font-size: 0.6875rem;
    color: var(--text-tertiary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .link-actions {
    display: flex;
    align-items: center;
    gap: var(--space-1);
    opacity: 0;
    transition: opacity var(--duration-fast) var(--ease-out);
  }

  .link-card:hover .link-actions,
  .link-card:focus-within .link-actions {
    opacity: 1;
  }

  .btn-action {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    padding: 0;
    background: transparent;
    border: none;
    border-radius: var(--radius-sm);
    color: var(--text-tertiary);
    cursor: pointer;
    transition: all var(--duration-fast) var(--ease-out);
  }

  .btn-action:hover {
    background: var(--border);
    color: var(--text-primary);
  }

  .btn-action:focus {
    outline: none;
  }

  .btn-action:focus-visible {
    outline: 1px solid var(--accent);
  }

  .btn-remove:hover {
    background: rgba(248, 113, 113, 0.15);
    color: var(--error);
  }
</style>
