<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import { fade, scale } from 'svelte/transition';
  import type { Workspace, CreateWorkspaceInput } from '@/lib/types';
  import { WORKSPACE_COLORS, DEFAULT_WORKSPACE_ID } from '@/lib/types';
  import {
    WORKSPACE_NAME_MAX_LENGTH,
    WORKSPACE_DESCRIPTION_MAX_LENGTH,
    validateWorkspaceName,
  } from '@/lib/validation';
  import { t, getWorkspaceDisplayName } from '@lib/i18n';

  export let workspace: Workspace | null = null;
  export let existingNames: string[] = [];

  const dispatch = createEventDispatcher<{
    save: CreateWorkspaceInput;
    cancel: void;
  }>();

  let name = workspace !== null ? getWorkspaceDisplayName(workspace) : '';
  let description = workspace?.description ?? '';
  let color = workspace?.color ?? WORKSPACE_COLORS[0];
  let inputElement: HTMLInputElement;
  let isSubmitting = false;
  let validationError: string | null = null;

  $: isEditing = workspace !== null;
  $: isDefault = workspace?.id === DEFAULT_WORKSPACE_ID || workspace?.isDefault === true;
  $: trimmedName = name.trim();
  $: trimmedDescription = description.trim();
  $: validationError = trimmedName === '' ? null : validateName(trimmedName);
  $: canSubmit = trimmedName.length > 0 && validationError === null && !isSubmitting;

  function validateName(value: string): string | null {
    // When editing, exclude the current workspace's name from duplicates
    const namesToCheck = workspace
      ? existingNames.filter((n) => n.toLowerCase() !== workspace!.name.toLowerCase())
      : existingNames;
    const result = validateWorkspaceName(value, namesToCheck);
    return result.valid ? null : (result.error ?? null);
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
    dispatch('save', {
      name: trimmedName,
      description: trimmedDescription !== '' ? trimmedDescription : undefined,
      color,
    });
  }

  function handleKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      dispatch('cancel');
    } else if (event.key === 'Enter' && canSubmit && event.target === inputElement) {
      handleSubmit();
    }
  }

  function handleBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      dispatch('cancel');
    }
  }

  function handleNameInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    if (target.value.length > WORKSPACE_NAME_MAX_LENGTH) {
      target.value = target.value.slice(0, WORKSPACE_NAME_MAX_LENGTH);
      name = target.value;
    }
  }

  function handleDescriptionInput(event: Event): void {
    const target = event.target as HTMLTextAreaElement;
    if (target.value.length > WORKSPACE_DESCRIPTION_MAX_LENGTH) {
      target.value = target.value.slice(0, WORKSPACE_DESCRIPTION_MAX_LENGTH);
      description = target.value;
    }
  }

  onMount(() => {
    name = workspace ? getWorkspaceDisplayName(workspace) : '';
    description = workspace?.description ?? '';
    color = workspace?.color ?? WORKSPACE_COLORS[0];
    isSubmitting = false;
    validationError = null;

    setTimeout(() => inputElement?.focus(), 50);
  });
</script>

<svelte:window on:keydown={handleKeydown} />

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
    <div class="modal-header">
      <h2 id="modal-title">{isEditing ? t('workspace_modal_edit_title') : t('workspace_modal_new_title')}</h2>
      <button
        type="button"
        class="close-btn"
        on:click={() => dispatch('cancel')}
        aria-label={t('common_close')}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <path d="M18 6L6 18M6 6l12 12"/>
        </svg>
      </button>
    </div>

    <form on:submit|preventDefault={handleSubmit}>
      <div class="field">
        <label for="workspace-name">
          {t('common_name')} <span class="required">{t('workspace_modal_name_required')}</span>
        </label>
        <div class="input-wrapper" class:has-error={validationError !== null}>
          <input
            id="workspace-name"
            type="text"
            bind:this={inputElement}
            bind:value={name}
            on:input={handleNameInput}
            placeholder={t('workspace_modal_example')}
            maxlength={WORKSPACE_NAME_MAX_LENGTH}
            aria-describedby={validationError ? 'error-message' : undefined}
            aria-invalid={validationError !== null}
            disabled={isSubmitting || isDefault}
          />
          <span class="char-count">{trimmedName.length}/{WORKSPACE_NAME_MAX_LENGTH}</span>
        </div>
        {#if isDefault}
          <p class="hint">{t('workspace_modal_default_hint')}</p>
        {/if}
        {#if validationError}
          <p id="error-message" class="error-message">{validationError}</p>
        {/if}
      </div>

      <div class="field">
        <label for="workspace-description">{t('common_description')}</label>
        <div class="textarea-wrapper">
          <textarea
            id="workspace-description"
            bind:value={description}
            on:input={handleDescriptionInput}
            placeholder={t('workspace_modal_description_placeholder')}
            maxlength={WORKSPACE_DESCRIPTION_MAX_LENGTH}
            rows="2"
            disabled={isSubmitting}
          ></textarea>
          <span class="char-count">{trimmedDescription.length}/{WORKSPACE_DESCRIPTION_MAX_LENGTH}</span>
        </div>
      </div>

      <div class="field">
        <span class="label-text" id="color-label">{t('common_color')}</span>
        <div class="color-picker" role="radiogroup" aria-labelledby="color-label">
          {#each WORKSPACE_COLORS as c}
            <button
              type="button"
              class="color-option"
              class:selected={color === c}
              style="--color: {c}"
              on:click={() => color = c}
              aria-label={t('workspace_select_color', c)}
              disabled={isSubmitting}
            >
              {#if color === c}
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              {/if}
            </button>
          {/each}
        </div>
      </div>

      <div class="actions">
        <button
          type="button"
          class="btn btn-cancel"
          on:click={() => dispatch('cancel')}
          disabled={isSubmitting}
        >
          {t('common_cancel')}
        </button>
        <button
          type="submit"
          class="btn btn-confirm"
          disabled={!canSubmit}
        >
          {#if isSubmitting}
            <span class="spinner"></span>
            {isEditing ? t('common_saving') : t('common_creating')}
          {:else}
            {isEditing ? t('common_save') : t('common_create')}
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
    max-width: 420px;
    width: 90%;
    box-shadow:
      var(--shadow-xl),
      0 0 40px var(--accent-glow);
    transform-origin: center center;
  }

  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: var(--space-5);
  }

  h2 {
    margin: 0;
    color: var(--text-primary);
    font-family: var(--font-body);
    font-size: var(--text-lg);
    font-weight: 600;
  }

  .close-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    padding: 0;
    background: transparent;
    border: none;
    border-radius: var(--radius-sm);
    color: var(--text-tertiary);
    cursor: pointer;
    transition: all var(--duration-fast) var(--ease-out);
  }

  .close-btn:hover {
    background: var(--surface-overlay);
    color: var(--text-primary);
  }

  form {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  label {
    color: var(--text-secondary);
    font-family: var(--font-body);
    font-size: var(--text-sm);
    font-weight: 500;
  }

  .required {
    color: var(--accent-primary);
  }

  .label-text {
    color: var(--text-secondary);
    font-family: var(--font-body);
    font-size: var(--text-sm);
    font-weight: 500;
  }

  .input-wrapper,
  .textarea-wrapper {
    position: relative;
    display: flex;
    flex-direction: column;
  }

  input,
  textarea {
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
    resize: none;
  }

  input::placeholder,
  textarea::placeholder {
    color: var(--text-tertiary);
  }

  input:focus,
  textarea:focus {
    outline: none;
    border-color: var(--accent-primary);
    box-shadow: 0 0 0 3px var(--accent-soft);
  }

  input:disabled,
  textarea:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .input-wrapper.has-error input {
    border-color: var(--semantic-error);
  }

  .input-wrapper.has-error input:focus {
    box-shadow: 0 0 0 3px var(--semantic-error-glow);
  }

  .char-count {
    position: absolute;
    right: var(--space-3);
    top: var(--space-3);
    font-family: var(--font-mono);
    font-size: var(--text-xs);
    color: var(--text-tertiary);
    pointer-events: none;
  }

  .hint {
    margin: 0;
    color: var(--text-tertiary);
    font-family: var(--font-body);
    font-size: var(--text-xs);
    font-style: italic;
  }

  .error-message {
    margin: 0;
    color: var(--semantic-error);
    font-family: var(--font-body);
    font-size: var(--text-sm);
    line-height: 1.4;
  }

  .color-picker {
    display: flex;
    gap: var(--space-2);
    flex-wrap: wrap;
  }

  .color-option {
    width: 32px;
    height: 32px;
    border-radius: var(--radius-full);
    background-color: var(--color);
    border: 2px solid transparent;
    cursor: pointer;
    transition: all var(--duration-fast) var(--ease-out);
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    padding: 0;
  }

  .color-option:hover:not(:disabled) {
    transform: scale(1.1);
  }

  .color-option.selected {
    border-color: var(--text-primary);
    box-shadow: 0 0 0 2px var(--color), var(--shadow-sm);
  }

  .color-option:disabled {
    opacity: 0.5;
    cursor: not-allowed;
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
    box-shadow: var(--shadow-lg);
    filter: brightness(1.1);
  }

  .btn-confirm:active:not(:disabled) {
    transform: translateY(0);
  }

  .spinner {
    width: 14px;
    height: 14px;
    border: 2px solid var(--border-subtle);
    border-top-color: var(--text-primary);
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
    .color-option:hover:not(:disabled) {
      transform: none;
    }
  }
</style>
