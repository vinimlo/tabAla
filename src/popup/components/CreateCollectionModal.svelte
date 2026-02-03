<script lang="ts">
  import { createEventDispatcher, onMount, onDestroy } from 'svelte';
  import { fade, scale } from 'svelte/transition';

  export let existingNames: string[] = [];

  const MAX_NAME_LENGTH = 100;

  const dispatch = createEventDispatcher<{
    create: string;
    cancel: void;
  }>();

  let name = '';
  let inputElement: HTMLInputElement;
  let isSubmitting = false;
  let validationError: string | null = null;

  $: trimmedName = name.trim();
  $: {
    if (trimmedName === '') {
      validationError = null;
    } else {
      validationError = validateName(trimmedName);
    }
  }
  $: canSubmit = trimmedName.length > 0 && validationError === null && !isSubmitting;

  function validateName(value: string): string | null {
    if (value.length === 0) {
      return 'Nome da coleção não pode estar vazio';
    }

    const nameLower = value.toLowerCase();
    const isDuplicate = existingNames.some(
      (existing) => existing.toLowerCase() === nameLower
    );

    if (isDuplicate) {
      return 'Já existe uma coleção com este nome';
    }

    return null;
  }

  function handleSubmit(): void {
    const error = validateName(trimmedName);
    if (error) {
      validationError = error;
      return;
    }

    if (!canSubmit) {
      return;
    }

    isSubmitting = true;
    dispatch('create', trimmedName);
  }

  function handleCancel(): void {
    dispatch('cancel');
  }

  function handleKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      handleCancel();
    } else if (event.key === 'Enter' && canSubmit) {
      handleSubmit();
    }
  }

  function handleBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      handleCancel();
    }
  }

  function handleInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    if (target.value.length > MAX_NAME_LENGTH) {
      target.value = target.value.slice(0, MAX_NAME_LENGTH);
      name = target.value;
    }
  }

  onMount(() => {
    document.addEventListener('keydown', handleKeydown);
    setTimeout(() => inputElement?.focus(), 50);
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
  aria-labelledby="modal-title"
>
  <div
    class="modal"
    transition:scale={{ duration: 200, start: 0.95, opacity: 0 }}
  >
    <h2 id="modal-title">Nova Coleção</h2>

    <form on:submit|preventDefault={handleSubmit}>
      <div class="input-wrapper" class:has-error={validationError !== null}>
        <input
          type="text"
          bind:this={inputElement}
          bind:value={name}
          on:input={handleInput}
          placeholder="Nome da coleção"
          maxlength={MAX_NAME_LENGTH}
          aria-describedby={validationError ? 'error-message' : undefined}
          aria-invalid={validationError !== null}
          disabled={isSubmitting}
        />
        <span class="char-count">{trimmedName.length}/{MAX_NAME_LENGTH}</span>
      </div>

      {#if validationError}
        <p id="error-message" class="error-message">{validationError}</p>
      {/if}

      <div class="actions">
        <button
          type="button"
          class="btn btn-cancel"
          on:click={handleCancel}
          disabled={isSubmitting}
        >
          Cancelar
        </button>
        <button
          type="submit"
          class="btn btn-confirm"
          disabled={!canSubmit}
        >
          {#if isSubmitting}
            <span class="spinner"></span>
            Criando...
          {:else}
            Criar
          {/if}
        </button>
      </div>
    </form>
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

  .modal {
    background: var(--bg-secondary);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: var(--space-5);
    max-width: 300px;
    width: 90%;
    box-shadow:
      0 8px 32px rgba(0, 0, 0, 0.4),
      0 0 0 1px rgba(255, 255, 255, 0.03);
  }

  h2 {
    margin: 0 0 var(--space-4);
    color: var(--text-primary);
    font-size: 1rem;
    font-weight: 600;
    text-align: center;
  }

  form {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  .input-wrapper {
    position: relative;
    display: flex;
    flex-direction: column;
  }

  input {
    width: 100%;
    padding: var(--space-3);
    padding-right: var(--space-5);
    background: var(--bg-tertiary);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    color: var(--text-primary);
    font-family: inherit;
    font-size: 0.875rem;
    transition: all var(--duration-fast) var(--ease-out);
  }

  input::placeholder {
    color: var(--text-tertiary);
  }

  input:focus {
    outline: none;
    border-color: var(--accent);
    box-shadow: 0 0 0 2px var(--accent-soft);
  }

  input:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .input-wrapper.has-error input {
    border-color: var(--error);
  }

  .input-wrapper.has-error input:focus {
    box-shadow: 0 0 0 2px rgba(248, 113, 113, 0.2);
  }

  .char-count {
    position: absolute;
    right: var(--space-2);
    top: 50%;
    transform: translateY(-50%);
    font-size: 0.6875rem;
    color: var(--text-tertiary);
    pointer-events: none;
  }

  .error-message {
    margin: 0;
    padding: 0 var(--space-1);
    color: var(--error);
    font-size: 0.75rem;
    line-height: 1.4;
  }

  .actions {
    display: flex;
    gap: var(--space-2);
    justify-content: flex-end;
    margin-top: var(--space-2);
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
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-2);
  }

  .btn:focus {
    outline: none;
  }

  .btn:focus-visible {
    outline: 1px solid var(--accent);
    outline-offset: 2px;
  }

  .btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .btn-cancel {
    background: var(--bg-tertiary);
    color: var(--text-secondary);
    border-color: var(--border);
  }

  .btn-cancel:hover:not(:disabled) {
    background: var(--bg-primary);
    color: var(--text-primary);
    border-color: var(--border-hover);
  }

  .btn-confirm {
    background: var(--accent);
    color: white;
  }

  .btn-confirm:hover:not(:disabled) {
    filter: brightness(1.1);
    box-shadow: 0 0 16px var(--accent-glow);
  }

  .spinner {
    width: 12px;
    height: 12px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-top-color: white;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
</style>
