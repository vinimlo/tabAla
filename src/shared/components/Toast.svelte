<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { fly, fade } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import { t } from '@lib/i18n';

  export let message: string;
  export let duration: number = 3000;
  export let type: 'error' | 'success' | 'info' = 'error';
  export let onClose: () => void = () => {};

  let visible = true;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let isPaused = false;
  let remainingTime = duration;
  let startTime: number;

  function dismiss() {
    visible = false;
    onClose();
  }

  function startTimer() {
    startTime = Date.now();
    timeoutId = setTimeout(dismiss, remainingTime);
  }

  function pauseTimer() {
    if (timeoutId) {
      clearTimeout(timeoutId);
      remainingTime -= Date.now() - startTime;
    }
  }

  function handleMouseEnter() {
    isPaused = true;
    pauseTimer();
  }

  function handleMouseLeave() {
    isPaused = false;
    startTimer();
  }

  onMount(startTimer);

  onDestroy(() => {
    if (timeoutId) clearTimeout(timeoutId);
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
      class:paused={isPaused}
      role="status"
      aria-live="polite"
      on:mouseenter={handleMouseEnter}
      on:mouseleave={handleMouseLeave}
      transition:fly={{ y: 16, duration: 300, easing: cubicOut }}
    >
      <span class="toast-indicator"></span>
      <span class="toast-message">{message}</span>
      <button
        class="toast-close"
        on:click={dismiss}
        aria-label={t('toast_close')}
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
    pointer-events: none;
  }

  .toast {
    position: relative;
    display: flex;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-3) var(--space-4);
    background-color: var(--surface-elevated);
    border: 1px solid var(--border-default);
    color: var(--text-primary);
    border-radius: var(--radius-full);
    box-shadow:
      var(--shadow-lg),
      0 0 0 1px var(--border-subtle);
    backdrop-filter: blur(12px);
    max-width: 400px;
    width: auto;
    pointer-events: auto;
    transition: transform var(--duration-fast) var(--ease-out);
  }

  .toast:hover {
    transform: scale(1.02);
  }

  .toast.paused {
    transform: scale(1.02);
  }

  .toast-indicator {
    flex-shrink: 0;
    width: 8px;
    height: 8px;
    border-radius: var(--radius-full);
    background-color: var(--text-tertiary);
    transition: all var(--duration-fast) var(--ease-out);
  }

  .toast.error {
    border-color: var(--semantic-error-soft);
  }

  .toast.error .toast-indicator {
    background-color: var(--semantic-error);
    box-shadow: 0 0 12px var(--semantic-error-glow);
  }

  .toast.success {
    border-color: var(--semantic-success);
  }

  .toast.success .toast-indicator {
    background-color: var(--semantic-success);
    box-shadow: 0 0 12px var(--accent-glow);
  }

  .toast-message {
    font-family: var(--font-body);
    font-size: var(--text-sm);
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
    border-radius: var(--radius-full);
    color: var(--text-tertiary);
    cursor: pointer;
    transition: all var(--duration-fast) var(--ease-out);
    flex-shrink: 0;
    margin-left: var(--space-1);
  }

  .toast-close:hover {
    color: var(--text-primary);
    background-color: var(--border-default);
  }

  .toast-close:focus {
    outline: none;
  }

  .toast-close:focus-visible {
    outline: 2px solid var(--accent-primary);
    outline-offset: 2px;
  }

  /* Reduced motion */
  @media (prefers-reduced-motion: reduce) {
    .toast:hover,
    .toast.paused {
      transform: none;
    }
  }
</style>
