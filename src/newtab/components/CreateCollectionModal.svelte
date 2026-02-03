<script lang="ts">
  import { createEventDispatcher, onMount, onDestroy } from 'svelte';
  import { fade, scale } from 'svelte/transition';

  export let existingNames: string[] = [];
  export let initialName = '';

  const MAX_NAME_LENGTH = 100;

  const dispatch = createEventDispatcher<{
    create: string;
    cancel: void;
  }>();

  let name = initialName;
  let inputElement: HTMLInputElement;
  let isSubmitting = false;
  let validationError: string | null = null;

  export function resetSubmission(): void {
    isSubmitting = false;
  }

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
      return 'Nome da colecao nao pode estar vazio';
    }

    const nameLower = value.toLowerCase();
    const isDuplicate = existingNames.some(
      (existing) => existing.toLowerCase() === nameLower
    );

    if (isDuplicate) {
      return 'Ja existe uma colecao com este nome';
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
    // Reset state when modal opens to prevent stale state from previous usage
    name = initialName;
    isSubmitting = false;
    validationError = null;

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
    <h2 id="modal-title">Nova Colecao</h2>

    <form on:submit|preventDefault={handleSubmit}>
      <div class="input-wrapper" class:has-error={validationError !== null}>
        <input
          type="text"
          bind:this={inputElement}
          bind:value={name}
          on:input={handleInput}
          placeholder="Nome da colecao"
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
    background-color: rgba(0, 0, 0, 0.7);
    backdrop-filter: blur(8px) saturate(150%);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }

  .modal {
    background: var(--surface-elevated);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-xl);
    padding: var(--space-6);
    max-width: 400px;
    width: 90%;
    box-shadow:
      var(--shadow-xl),
      0 0 40px rgba(232, 93, 66, 0.08);
    transform-origin: center center;
  }

  h2 {
    margin: 0 0 var(--space-5);
    color: var(--text-primary);
    font-family: var(--font-body);
    font-size: var(--text-lg);
    font-weight: 600;
    text-align: center;
  }

  form {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }

  .input-wrapper {
    position: relative;
    display: flex;
    flex-direction: column;
  }

  input {
    width: 100%;
    padding: var(--space-3) var(--space-4);
    padding-right: calc(var(--space-4) + 48px);
    background: var(--surface-overlay);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-lg);
    color: var(--text-primary);
    font-family: var(--font-body);
    font-size: var(--text-base);
    transition: all var(--duration-fast) var(--ease-out);
  }

  input::placeholder {
    color: var(--text-tertiary);
  }

  input:focus {
    outline: none;
    border-color: var(--accent-primary);
    box-shadow: 0 0 0 3px var(--accent-soft);
  }

  input:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .input-wrapper.has-error input {
    border-color: var(--semantic-error);
  }

  .input-wrapper.has-error input:focus {
    box-shadow: 0 0 0 3px rgba(212, 114, 106, 0.2);
  }

  .char-count {
    position: absolute;
    right: var(--space-4);
    top: 50%;
    transform: translateY(-50%);
    font-family: var(--font-mono);
    font-size: var(--text-xs);
    color: var(--text-tertiary);
    pointer-events: none;
  }

  .error-message {
    margin: 0;
    padding: 0 var(--space-2);
    color: var(--semantic-error);
    font-family: var(--font-body);
    font-size: var(--text-sm);
    line-height: 1.4;
  }

  .actions {
    display: flex;
    gap: var(--space-3);
    justify-content: flex-end;
    margin-top: var(--space-2);
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
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-2);
  }

  .btn:focus {
    outline: none;
  }

  .btn:focus-visible {
    outline: 2px solid var(--accent-primary);
    outline-offset: 2px;
  }

  .btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .btn-cancel {
    background: transparent;
    color: var(--text-secondary);
    border-color: var(--border-default);
  }

  .btn-cancel:hover:not(:disabled) {
    background: var(--surface-overlay);
    color: var(--text-primary);
    border-color: var(--border-strong);
  }

  .btn-confirm {
    background: linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-secondary) 100%);
    color: white;
    box-shadow: 0 2px 8px var(--accent-glow);
  }

  .btn-confirm:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow:
      0 4px 16px var(--accent-glow),
      0 0 24px rgba(232, 93, 66, 0.15);
  }

  .btn-confirm:active:not(:disabled) {
    transform: translateY(0);
  }

  .spinner {
    width: 14px;
    height: 14px;
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

  /* Reduced motion */
  @media (prefers-reduced-motion: reduce) {
    .spinner {
      animation: none;
    }
    .btn-confirm:hover:not(:disabled) {
      transform: none;
    }
  }
</style>
