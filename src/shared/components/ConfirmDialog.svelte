<script lang="ts">
  import { createEventDispatcher, onMount, onDestroy } from 'svelte';
  import { fade, scale } from 'svelte/transition';

  export let message: string = 'Are you sure?';
  export let confirmText: string = 'Remover';
  export let cancelText: string = 'Cancelar';

  const dispatch = createEventDispatcher<{
    confirm: void;
    cancel: void;
  }>();

  let dialogElement: HTMLDivElement;

  function handleConfirm() {
    dispatch('confirm');
  }

  function handleCancel() {
    dispatch('cancel');
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      handleCancel();
    } else if (event.key === 'Enter') {
      handleConfirm();
    }
  }

  function handleBackdropClick(event: MouseEvent) {
    if (event.target === event.currentTarget) {
      handleCancel();
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

<!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
<div
  class="backdrop"
  on:click={handleBackdropClick}
  on:keydown={handleKeydown}
  transition:fade={{ duration: 150 }}
  role="dialog"
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
      <button
        class="btn btn-cancel"
        on:click={handleCancel}
        type="button"
      >
        {cancelText}
      </button>
      <button
        class="btn btn-confirm"
        on:click={handleConfirm}
        type="button"
      >
        {confirmText}
      </button>
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
    background-color: rgba(0, 0, 0, 0.7);
    backdrop-filter: blur(8px) saturate(150%);
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
    box-shadow:
      var(--shadow-xl),
      0 0 40px rgba(0, 0, 0, 0.15);
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

  .btn {
    padding: var(--space-3) var(--space-5);
    border-radius: var(--radius-lg);
    font-family: var(--font-body);
    font-size: var(--text-sm);
    font-weight: 500;
    cursor: pointer;
    transition: all var(--duration-fast) var(--ease-out);
    border: 1px solid transparent;
    min-width: 100px;
  }

  .btn:focus {
    outline: none;
  }

  .btn:focus-visible {
    outline: 2px solid var(--accent-primary);
    outline-offset: 2px;
  }

  .btn-cancel {
    background: transparent;
    color: var(--text-secondary);
    border-color: var(--border-default);
  }

  .btn-cancel:hover {
    background: var(--surface-overlay);
    color: var(--text-primary);
    border-color: var(--border-strong);
  }

  .btn-confirm {
    background: var(--semantic-error);
    color: white;
    box-shadow: 0 2px 8px rgba(212, 114, 106, 0.3);
  }

  .btn-confirm:hover {
    background: #c45f58;
    transform: translateY(-1px);
    box-shadow: 0 4px 16px rgba(212, 114, 106, 0.35);
  }

  .btn-confirm:active {
    transform: translateY(0);
  }

  /* Reduced motion */
  @media (prefers-reduced-motion: reduce) {
    .btn-confirm:hover {
      transform: none;
    }
  }
</style>
