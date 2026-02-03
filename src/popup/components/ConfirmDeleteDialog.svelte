<script lang="ts">
  import { createEventDispatcher, onMount, onDestroy } from 'svelte';
  import { fade, scale } from 'svelte/transition';

  export let collectionName: string;
  export let linkCount: number;

  const dispatch = createEventDispatcher<{
    confirm: void;
    cancel: void;
  }>();

  let dialogElement: HTMLDivElement;

  $: message =
    linkCount === 0
      ? `Excluir ${collectionName}?`
      : linkCount === 1
        ? `Excluir ${collectionName}? O link será movido para Inbox`
        : `Excluir ${collectionName}? Os ${linkCount} links serão movidos para Inbox`;

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
        Cancelar
      </button>
      <button
        class="btn btn-confirm"
        on:click={handleConfirm}
        type="button"
      >
        Excluir
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
    background-color: rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }

  .dialog {
    background: var(--bg-secondary);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: var(--space-5);
    max-width: 280px;
    width: 90%;
    box-shadow:
      0 8px 32px rgba(0, 0, 0, 0.4),
      0 0 0 1px rgba(255, 255, 255, 0.03);
  }

  .dialog:focus {
    outline: none;
  }

  p {
    margin: 0 0 var(--space-5);
    color: var(--text-primary);
    font-size: 0.9375rem;
    text-align: center;
    line-height: 1.4;
    font-weight: 500;
  }

  .actions {
    display: flex;
    gap: var(--space-2);
    justify-content: center;
  }

  .btn {
    padding: var(--space-2) var(--space-4);
    border-radius: var(--radius-sm);
    font-family: inherit;
    font-size: 0.8125rem;
    font-weight: 500;
    cursor: pointer;
    transition: all var(--duration-fast) var(--ease-out);
    border: 1px solid transparent;
    min-width: 80px;
  }

  .btn:focus {
    outline: none;
  }

  .btn:focus-visible {
    outline: 1px solid var(--accent);
    outline-offset: 2px;
  }

  .btn-cancel {
    background: var(--bg-tertiary);
    color: var(--text-secondary);
    border-color: var(--border);
  }

  .btn-cancel:hover {
    background: var(--bg-primary);
    color: var(--text-primary);
    border-color: var(--border-hover);
  }

  .btn-confirm {
    background: var(--error);
    color: white;
  }

  .btn-confirm:hover {
    background: #dc2626;
    box-shadow: 0 0 16px rgba(248, 113, 113, 0.3);
  }
</style>
