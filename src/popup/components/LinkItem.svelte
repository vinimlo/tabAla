<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { Link } from '@/lib/types';

  export let link: Link;

  const dispatch = createEventDispatcher<{
    open: Link;
    remove: string;
  }>();

  const DEFAULT_FAVICON = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23888"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>';

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

  function handleImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.src = DEFAULT_FAVICON;
  }

  function truncateUrl(url: string): string {
    try {
      const parsed = new URL(url);
      return parsed.hostname + (parsed.pathname !== '/' ? parsed.pathname : '');
    } catch {
      return url;
    }
  }
</script>

<div
  class="link-item"
  role="button"
  tabindex="0"
  on:click={handleClick}
  on:keydown={handleKeydown}
>
  <img
    class="favicon"
    src={link.favicon || DEFAULT_FAVICON}
    alt=""
    width="16"
    height="16"
    on:error={handleImageError}
  />

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
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
    </svg>
  </button>
</div>

<style>
  .link-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 12px;
    border-radius: 6px;
    cursor: pointer;
    transition: background-color 0.15s ease;
  }

  .link-item:hover {
    background-color: #f5f5f5;
  }

  .link-item:focus {
    outline: 2px solid #666;
    outline-offset: -2px;
  }

  .favicon {
    flex-shrink: 0;
    border-radius: 2px;
  }

  .content {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .title {
    font-size: 14px;
    font-weight: 500;
    color: #333;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .url {
    font-size: 12px;
    color: #888;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .remove-btn {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    padding: 0;
    border: none;
    border-radius: 4px;
    background: transparent;
    color: #999;
    cursor: pointer;
    opacity: 0;
    transition: opacity 0.15s ease, background-color 0.15s ease, color 0.15s ease;
  }

  .link-item:hover .remove-btn {
    opacity: 1;
  }

  .remove-btn:hover {
    background-color: #fee;
    color: #d00;
  }

  .remove-btn:focus {
    opacity: 1;
    outline: 2px solid #666;
    outline-offset: -2px;
  }
</style>
