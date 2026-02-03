<script lang="ts">
  import type { Link } from '@/lib/types';
  import { openLinkInNewTab } from '@/lib/tabs';
  import { createEventDispatcher } from 'svelte';

  export let link: Link;

  const dispatch = createEventDispatcher<{
    error: { message: string };
  }>();

  let isLoading = false;

  async function handleOpenLink() {
    if (isLoading) {
      return;
    }

    isLoading = true;

    try {
      const result = await openLinkInNewTab(link.url);

      if (!result.success && result.error) {
        dispatch('error', { message: result.error });
      }
    } finally {
      isLoading = false;
    }
  }
</script>

<li class="link-item">
  {#if link.favicon}
    <img
      src={link.favicon}
      alt=""
      class="link-favicon"
      width="16"
      height="16"
      aria-hidden="true"
    />
  {:else}
    <div class="link-favicon-placeholder" aria-hidden="true">
      <svg
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M8 1C4.13 1 1 4.13 1 8s3.13 7 7 7 7-3.13 7-7-3.13-7-7-7zm0 12.5c-3.03 0-5.5-2.47-5.5-5.5S4.97 2.5 8 2.5s5.5 2.47 5.5 5.5-2.47 5.5-5.5 5.5z"
          fill="currentColor"
        />
      </svg>
    </div>
  {/if}

  <div class="link-content">
    <span class="link-title" title={link.title}>{link.title}</span>
    <span class="link-url" title={link.url}>{link.url}</span>
  </div>

  <button
    class="open-button"
    on:click={handleOpenLink}
    disabled={isLoading}
    aria-label="Abrir link em nova aba"
    title="Abrir em nova aba"
    type="button"
  >
    {#if isLoading}
      <svg
        class="spinner"
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <circle
          cx="8"
          cy="8"
          r="6"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-dasharray="28"
          stroke-dashoffset="10"
        />
      </svg>
    {:else}
      <svg
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <path
          d="M6 3H3C2.44772 3 2 3.44772 2 4V13C2 13.5523 2.44772 14 3 14H12C12.5523 14 13 13.5523 13 13V10M9 2H14M14 2V7M14 2L6 10"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    {/if}
  </button>
</li>

<style>
  .link-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 12px;
    background-color: #f9fafb;
    border-radius: 8px;
    transition: background-color 0.15s ease;
  }

  .link-item:hover {
    background-color: #f3f4f6;
  }

  .link-favicon {
    flex-shrink: 0;
    border-radius: 2px;
  }

  .link-favicon-placeholder {
    flex-shrink: 0;
    width: 16px;
    height: 16px;
    color: #9ca3af;
  }

  .link-content {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .link-title {
    font-size: 14px;
    font-weight: 500;
    color: #111827;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .link-url {
    font-size: 12px;
    color: #6b7280;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .open-button {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    padding: 0;
    background-color: transparent;
    border: 1px solid #e5e7eb;
    border-radius: 6px;
    color: #6b7280;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .open-button:hover:not(:disabled) {
    background-color: #f3f4f6;
    border-color: #d1d5db;
    color: #374151;
  }

  .open-button:focus {
    outline: 2px solid #3b82f6;
    outline-offset: 2px;
  }

  .open-button:disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }

  .spinner {
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }
</style>
