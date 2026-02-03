<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { fade } from 'svelte/transition';
  import type { Link } from '@/lib/types';

  export let link: Link;

  const dispatch = createEventDispatcher<{
    remove: { linkId: string };
    open: { url: string };
  }>();

  let isHovering = false;

  function handleRemoveClick(event: MouseEvent) {
    event.stopPropagation();
    dispatch('remove', { linkId: link.id });
  }

  function handleOpenClick() {
    dispatch('open', { url: link.url });
  }

  function getFaviconUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      return `https://www.google.com/s2/favicons?domain=${urlObj.hostname}&sz=32`;
    } catch {
      return '';
    }
  }

  function truncateUrl(url: string, maxLength: number = 40): string {
    try {
      const urlObj = new URL(url);
      const display = `${urlObj.hostname}${urlObj.pathname}`;
      return display.length > maxLength ? `${display.substring(0, maxLength)}...` : display;
    } catch {
      return url.length > maxLength ? `${url.substring(0, maxLength)}...` : url;
    }
  }
</script>

<div
  class="link-item"
  on:mouseenter={() => (isHovering = true)}
  on:mouseleave={() => (isHovering = false)}
  role="listitem"
  transition:fade={{ duration: 250 }}
>
  <button
    class="link-content"
    on:click={handleOpenClick}
    type="button"
    aria-label="Open {link.title}"
  >
    <div class="favicon-wrapper">
      {#if link.favicon || link.url}
        <img
          src={link.favicon || getFaviconUrl(link.url)}
          alt=""
          class="favicon"
          on:error={(e) => {
            const target = e.currentTarget;
            target.style.display = 'none';
          }}
        />
      {/if}
      <svg
        class="favicon-placeholder"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        aria-hidden="true"
      >
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
      </svg>
    </div>
    <div class="link-info">
      <span class="link-title">{link.title || 'Untitled'}</span>
      <span class="link-url">{truncateUrl(link.url)}</span>
    </div>
  </button>

  {#if isHovering}
    <button
      class="remove-btn"
      on:click={handleRemoveClick}
      type="button"
      aria-label="Remove link"
      transition:fade={{ duration: 100 }}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        aria-hidden="true"
      >
        <path d="M3 6h18" />
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
        <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        <line x1="10" y1="11" x2="10" y2="17" />
        <line x1="14" y1="11" x2="14" y2="17" />
      </svg>
    </button>
  {/if}
</div>

<style>
  .link-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem;
    border-radius: 6px;
    transition: background-color 0.15s;
  }

  .link-item:hover {
    background-color: #f3f4f6;
  }

  .link-content {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex: 1;
    min-width: 0;
    background: none;
    border: none;
    padding: 0;
    cursor: pointer;
    text-align: left;
  }

  .link-content:focus {
    outline: 2px solid #3b82f6;
    outline-offset: 2px;
    border-radius: 4px;
  }

  .favicon-wrapper {
    position: relative;
    width: 24px;
    height: 24px;
    flex-shrink: 0;
  }

  .favicon {
    width: 24px;
    height: 24px;
    border-radius: 4px;
    object-fit: contain;
  }

  .favicon-placeholder {
    position: absolute;
    top: 0;
    left: 0;
    width: 24px;
    height: 24px;
    color: #9ca3af;
  }

  .favicon + .favicon-placeholder {
    display: none;
  }

  .link-info {
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
    min-width: 0;
  }

  .link-title {
    font-size: 0.875rem;
    font-weight: 500;
    color: #1f2937;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .link-url {
    font-size: 0.75rem;
    color: #6b7280;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .remove-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    padding: 0;
    background: none;
    border: 1px solid transparent;
    border-radius: 4px;
    cursor: pointer;
    color: #9ca3af;
    flex-shrink: 0;
    transition: color 0.15s, background-color 0.15s, border-color 0.15s;
  }

  .remove-btn:hover {
    color: #dc2626;
    background-color: #fef2f2;
    border-color: #fecaca;
  }

  .remove-btn:focus {
    outline: 2px solid #dc2626;
    outline-offset: 2px;
  }

  .remove-btn svg {
    width: 16px;
    height: 16px;
  }
</style>
