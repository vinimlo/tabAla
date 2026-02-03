<script lang="ts">
  import { createEventDispatcher, onMount, onDestroy } from 'svelte';
  import { fade } from 'svelte/transition';

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
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }

  .dialog {
    background: white;
    border-radius: 8px;
    padding: 1.25rem;
    max-width: 280px;
    width: 90%;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }

  .dialog:focus {
    outline: none;
  }

  p {
    margin: 0 0 1rem;
    color: #333;
    font-size: 0.9375rem;
    text-align: center;
    line-height: 1.4;
  }

  .actions {
    display: flex;
    gap: 0.5rem;
    justify-content: flex-end;
  }

  .btn {
    padding: 0.5rem 1rem;
    border-radius: 6px;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: background-color 0.15s, border-color 0.15s;
    border: 1px solid transparent;
  }

  .btn:focus {
    outline: 2px solid #3b82f6;
    outline-offset: 2px;
  }

  .btn-cancel {
    background: #f3f4f6;
    color: #374151;
    border-color: #d1d5db;
  }

  .btn-cancel:hover {
    background: #e5e7eb;
  }

  .btn-confirm {
    background: #dc2626;
    color: white;
  }

  .btn-confirm:hover {
    background: #b91c1c;
  }
</style>
