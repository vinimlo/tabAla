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
      <img src={link.favicon} alt="" width="22" height="22" loading="lazy" />
    {:else}
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
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
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
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
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
        <path d="M18 6L6 18M6 6l12 12"/>
      </svg>
    </button>
  </div>
</div>

<style>
  .link-card {
    display: flex;
    align-items: flex-start;
    gap: var(--space-3);
    padding: var(--space-3) var(--space-4);
    background: var(--surface-elevated);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-lg);
    cursor: pointer;
    transition: all var(--duration-fast) var(--ease-out);
    user-select: none;
    min-height: 72px;
  }

  .link-card:hover {
    background: var(--surface-overlay);
    border-color: var(--border-default);
    transform: translateY(-2px);
    box-shadow:
      0 6px 16px rgba(0, 0, 0, 0.25),
      0 0 0 1px var(--accent-soft);
  }

  .link-card:focus {
    outline: none;
  }

  .link-card:focus-visible {
    outline: 2px solid var(--accent-primary);
    outline-offset: 2px;
  }

  .link-card.dragging {
    opacity: 0.7;
    transform: rotate(2deg) scale(1.02);
    box-shadow:
      var(--shadow-lg),
      0 0 24px var(--accent-glow);
    border-color: var(--accent-primary);
  }

  .link-favicon {
    flex-shrink: 0;
    width: 38px;
    height: 38px;
    margin-top: 2px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--surface-base);
    border-radius: var(--radius-md);
    border: 1px solid var(--border-subtle);
    color: var(--text-tertiary);
  }

  .link-favicon img {
    width: 22px;
    height: 22px;
    border-radius: 4px;
    object-fit: contain;
  }

  .link-favicon svg {
    width: 18px;
    height: 18px;
  }

  .link-content {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .link-title {
    font-family: var(--font-body);
    font-size: var(--text-sm);
    font-weight: 500;
    color: var(--text-primary);
    line-height: 1.4;
    letter-spacing: -0.01em;

    /* Multi-linha com line-clamp */
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;

    /* Transição suave de altura */
    max-height: 60px;
    transition: max-height var(--duration-fast) var(--ease-out);
  }

  /* Colapsar para 1 linha no hover */
  .link-card:hover .link-title,
  .link-card:focus-within .link-title {
    -webkit-line-clamp: 1;
    max-height: 20px;
  }

  .link-domain {
    font-family: var(--font-mono);
    font-size: var(--text-xs);
    color: var(--text-tertiary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    letter-spacing: -0.02em;
    margin-top: 2px;
  }

  .link-actions {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    opacity: 0;
    transform: translateX(4px);
    transition: all var(--duration-fast) var(--ease-out);
    margin-top: 2px;
    align-self: flex-start;
  }

  .link-card:hover .link-actions,
  .link-card:focus-within .link-actions {
    opacity: 1;
    transform: translateX(0);
  }

  .btn-action {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    padding: 0;
    background: transparent;
    border: none;
    border-radius: var(--radius-md);
    color: var(--text-tertiary);
    cursor: pointer;
    transition: all var(--duration-fast) var(--ease-out);
  }

  .btn-action svg {
    width: 16px;
    height: 16px;
  }

  .btn-action:hover {
    background: var(--border-default);
    color: var(--text-primary);
  }

  .btn-action:focus {
    outline: none;
  }

  .btn-action:focus-visible {
    outline: 2px solid var(--accent-primary);
    outline-offset: 2px;
  }

  .btn-remove:hover {
    background: rgba(212, 114, 106, 0.15);
    color: var(--semantic-error);
  }
</style>
