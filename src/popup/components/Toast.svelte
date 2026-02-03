<script lang="ts">
  import { onMount, onDestroy } from 'svelte';

  export let message: string;
  export let duration: number = 3000;
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
  <div class="toast" role="alert" aria-live="polite">
    <span class="toast-message">{message}</span>
    <button
      class="toast-close"
      on:click={dismiss}
      aria-label="Fechar notificação"
      type="button"
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <path
          d="M12 4L4 12M4 4L12 12"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    </button>
  </div>
{/if}

<style>
  .toast {
    position: fixed;
    bottom: 16px;
    left: 16px;
    right: 16px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 12px 16px;
    background-color: #dc2626;
    color: white;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    animation: slideIn 0.2s ease-out;
    z-index: 1000;
  }

  @keyframes slideIn {
    from {
      transform: translateY(100%);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }

  .toast-message {
    font-size: 14px;
    line-height: 1.4;
    flex: 1;
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
    border-radius: 4px;
    color: white;
    cursor: pointer;
    opacity: 0.8;
    transition: opacity 0.15s ease;
    flex-shrink: 0;
  }

  .toast-close:hover {
    opacity: 1;
  }

  .toast-close:focus {
    outline: 2px solid white;
    outline-offset: 2px;
  }
</style>
