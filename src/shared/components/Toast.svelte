<script lang="ts">
  import Button from '@/shared/components/ui/Button.svelte';
  import IconButton from '@/shared/components/ui/IconButton.svelte';
  import { onMount, onDestroy } from 'svelte';
  import { fly, fade } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import { t } from '@lib/i18n';

  export let message: string;
  export let duration: number = 3000;
  export let type: 'error' | 'success' | 'info' = 'error';
  export let onClose: () => void = () => {};
  /** Optional action shown in the toast, such as "Undo". */
  export let actionLabel: string | null = null;
  export let onAction: () => void = () => {};

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
    if (timeoutId) { clearTimeout(timeoutId); }
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
      {#if actionLabel !== null}
        <Button variant="quiet" size="sm" on:click={() => { onAction(); dismiss(); }}>{actionLabel}</Button>
      {/if}
      <IconButton icon="close" size="sm" label={t('toast_close')} on:click={dismiss} />
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

  /* Reduced motion */
  @media (prefers-reduced-motion: reduce) {
    .toast:hover,
    .toast.paused {
      transform: none;
    }
  }
</style>
