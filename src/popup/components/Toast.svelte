<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { fly, fade } from 'svelte/transition';

  export let message: string;
  export let duration: number = 3000;
  export let type: 'error' | 'success' | 'info' = 'error';
  export let onClose: () => void = () => {};

  let visible = true;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  function dismiss() {
    visible = false;
    onClose();
  }

  onMount(() => {
    timeoutId = setTimeout(dismiss, duration);
  });

  onDestroy(() => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  });
</script>

{#if visible}
  <div
    class="toast-backdrop"
    transition:fade={{ duration: 150 }}
  >
    <div
      class="toast"
      class:error={type === 'error'}
      class:success={type === 'success'}
      role="alert"
      aria-live="polite"
      transition:fly={{ y: 20, duration: 200 }}
    >
      <span class="toast-message">{message}</span>
      <button
        class="toast-close"
        on:click={dismiss}
        aria-label="Fechar notificação"
        type="button"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
        >
          <path d="M18 6L6 18M6 6l12 12"/>
        </svg>
      </button>
    </div>
  </div>
{/if}

<style>
  .toast-backdrop {
    position: fixed;
    bottom: var(--space-4);
    left: var(--space-4);
    right: var(--space-4);
    z-index: 1000;
    display: flex;
    justify-content: center;
  }

  .toast {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-3);
    padding: var(--space-3) var(--space-4);
    background-color: var(--bg-tertiary);
    border: 1px solid var(--border);
    color: var(--text-primary);
    border-radius: var(--radius-full);
    box-shadow:
      0 4px 24px rgba(0, 0, 0, 0.3),
      0 0 0 1px rgba(255, 255, 255, 0.05);
    backdrop-filter: blur(12px);
    max-width: 340px;
    width: 100%;
  }

  .toast.error {
    border-color: rgba(248, 113, 113, 0.2);
  }

  .toast.error::before {
    content: '';
    position: absolute;
    left: var(--space-4);
    top: 50%;
    transform: translateY(-50%);
    width: 6px;
    height: 6px;
    border-radius: var(--radius-full);
    background-color: var(--error);
    box-shadow: 0 0 8px var(--error);
  }

  .toast.success {
    border-color: rgba(74, 222, 128, 0.2);
  }

  .toast.success::before {
    content: '';
    position: absolute;
    left: var(--space-4);
    top: 50%;
    transform: translateY(-50%);
    width: 6px;
    height: 6px;
    border-radius: var(--radius-full);
    background-color: var(--success);
    box-shadow: 0 0 8px var(--success);
  }

  .toast-message {
    font-size: 0.8125rem;
    line-height: 1.4;
    flex: 1;
    padding-left: var(--space-4);
  }

  .toast-close {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    padding: 0;
    background: transparent;
    border: none;
    border-radius: var(--radius-full);
    color: var(--text-tertiary);
    cursor: pointer;
    transition: all var(--duration-fast) var(--ease-out);
    flex-shrink: 0;
  }

  .toast-close:hover {
    color: var(--text-primary);
    background-color: var(--border);
  }

  .toast-close:focus {
    outline: none;
  }

  .toast-close:focus-visible {
    outline: 1px solid var(--accent);
  }
</style>
