<script lang="ts">
  import Button from '@/shared/components/ui/Button.svelte';
  import { createEventDispatcher, onMount, onDestroy } from 'svelte';
  import { fade, scale } from 'svelte/transition';
  import { t } from '@lib/i18n';

  export let message: string = t('confirm_default_message');
  export let confirmText: string = t('common_remove');
  export let cancelText: string = t('common_cancel');

  const dispatch = createEventDispatcher<{
    confirm: void;
    cancel: void;
  }>();

  let dialogElement: HTMLDivElement;

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      dispatch('cancel');
    } else if (event.key === 'Enter') {
      dispatch('confirm');
    }
  }

  function handleBackdropClick(event: MouseEvent) {
    if (event.target === event.currentTarget) {
      dispatch('cancel');
    }
  }

  onMount(() => {
    document.addEventListener('keydown', handleKeydown);
    dialogElement?.focus();
  });

  onDestroy(() => {
    document.removeEventListener('keydown', handleKeydown);
  });
</script>

<div
  class="backdrop"
  on:click={handleBackdropClick}
  on:keydown={handleKeydown}
  transition:fade={{ duration: 150 }}
  role="dialog"
  tabindex="-1"
  aria-modal="true"
  aria-labelledby="dialog-message"
>
  <div
    class="dialog"
    bind:this={dialogElement}
    tabindex="-1"
    transition:scale={{ duration: 200, start: 0.95, opacity: 0 }}
  >
    <p id="dialog-message">{message}</p>
    <div class="actions">
      <Button on:click={() => dispatch('cancel')}>{cancelText}</Button>
      <Button variant="danger" on:click={() => dispatch('confirm')}>{confirmText}</Button>
    </div>
  </div>
</div>

<style>
  .backdrop {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: var(--scrim);
    backdrop-filter: blur(6px) saturate(0.9);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }

  .dialog {
    background: var(--surface-elevated);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-xl);
    padding: var(--space-6);
    max-width: 340px;
    width: 90%;
    box-shadow: var(--shadow-float);
    transform-origin: center center;
  }

  .dialog:focus {
    outline: none;
  }

  p {
    margin: 0 0 var(--space-5);
    color: var(--text-primary);
    font-family: var(--font-body);
    font-size: var(--text-base);
    text-align: center;
    line-height: 1.5;
    font-weight: 500;
  }

  .actions {
    display: flex;
    gap: var(--space-3);
    justify-content: center;
  }

</style>
