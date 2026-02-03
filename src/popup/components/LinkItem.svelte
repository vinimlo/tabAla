<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { Link } from '@/lib/types';

  export let link: Link;

  const dispatch = createEventDispatcher<{
    open: Link;
    remove: string;
  }>();

  const DEFAULT_FAVICON = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%238A8A8E"><circle cx="12" cy="12" r="10" fill="none" stroke="%238A8A8E" stroke-width="1.5"/><circle cx="12" cy="12" r="3" fill="%238A8A8E"/></svg>';

  let isPressed = false;

  function handleClick(): void {
    dispatch('open', link);
  }

  function handleRemove(event: MouseEvent): void {
    event.stopPropagation();
    dispatch('remove', link.id);
  }

  function handleKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      dispatch('open', link);
    }
  }

  function handleMouseDown(): void {
    isPressed = true;
  }

  function handleMouseUp(): void {
    isPressed = false;
  }

  function handleMouseLeave(): void {
    isPressed = false;
  }

  function handleImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.src = DEFAULT_FAVICON;
  }

  function truncateUrl(url: string): string {
    try {
      const parsed = new URL(url);
      const path = parsed.pathname !== '/' ? parsed.pathname : '';
      const full = parsed.hostname + path;
      return full.length > 35 ? `${full.slice(0, 35)}...` : full;
    } catch {
      return url;
    }
  }
</script>

<div
  class="link-item"
  class:pressed={isPressed}
  role="button"
  tabindex="0"
  on:click={handleClick}
  on:keydown={handleKeydown}
  on:mousedown={handleMouseDown}
  on:mouseup={handleMouseUp}
  on:mouseleave={handleMouseLeave}
>
  <div class="favicon-wrapper">
    <img
      class="favicon"
      src={link.favicon || DEFAULT_FAVICON}
      alt=""
      width="20"
      height="20"
      on:error={handleImageError}
    />
  </div>

  <div class="content">
    <span class="title">{link.title || 'Untitled'}</span>
    <span class="url">{truncateUrl(link.url)}</span>
  </div>

  <button
    class="remove-btn"
    type="button"
    aria-label="Remove link"
    on:click={handleRemove}
  >
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
      <path d="M18 6L6 18M6 6l12 12"/>
    </svg>
  </button>
</div>

<style>
  .link-item {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-3);
    margin-bottom: var(--space-1);
    border-radius: var(--radius-md);
    border: 1px solid var(--border);
    background: var(--bg-secondary);
    cursor: pointer;
    transition: all var(--duration-fast) var(--ease-out);
    position: relative;
  }

  .link-item:hover {
    background: var(--bg-tertiary);
    border-color: var(--border-hover);
    transform: translateX(2px);
    box-shadow: 0 0 20px var(--accent-soft);
  }

  .link-item.pressed {
    transform: scale(0.98);
  }

  .link-item:focus {
    outline: none;
    border-color: var(--accent);
    box-shadow: 0 0 0 1px var(--accent-soft);
  }

  .favicon-wrapper {
    flex-shrink: 0;
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--bg-primary);
    border-radius: var(--radius-sm);
  }

  .favicon {
    border-radius: 4px;
    object-fit: contain;
  }

  .content {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .title {
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    line-height: 1.3;
  }

  .url {
    font-size: 0.6875rem;
    color: var(--text-tertiary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    letter-spacing: 0.01em;
  }

  .remove-btn {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    padding: 0;
    border: none;
    border-radius: var(--radius-sm);
    background: transparent;
    color: var(--text-tertiary);
    cursor: pointer;
    opacity: 0;
    transition: all var(--duration-fast) var(--ease-out);
  }

  .link-item:hover .remove-btn {
    opacity: 1;
  }

  .remove-btn:hover {
    background-color: var(--accent-soft);
    color: var(--error);
  }

  .remove-btn:focus {
    opacity: 1;
    outline: none;
    background-color: var(--accent-soft);
  }

  .remove-btn:focus-visible {
    outline: 1px solid var(--accent);
  }
</style>
