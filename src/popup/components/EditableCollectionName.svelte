<script lang="ts">
  import { createEventDispatcher, tick } from 'svelte';

  export let name: string;
  export let error: string | null = null;
  export let saving: boolean = false;

  const dispatch = createEventDispatcher<{
    save: string;
    cancel: void;
  }>();

  let editing = false;
  let inputValue = name;
  let inputElement: HTMLInputElement;

  async function startEditing(): Promise<void> {
    editing = true;
    inputValue = name;
    error = null;
    await tick();
    inputElement?.focus();
    inputElement?.select();
  }

  function handleSave(): void {
    if (saving) {
      return;
    }
    dispatch('save', inputValue);
  }

  function handleCancel(): void {
    editing = false;
    inputValue = name;
    error = null;
    dispatch('cancel');
  }

  function handleKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleSave();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      handleCancel();
    }
  }

  function handleBlur(): void {
    if (!editing) {
      return;
    }
    handleSave();
  }

  function handleNameClick(event: MouseEvent): void {
    event.stopPropagation();
    void startEditing();
  }

  function handleNameKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      event.stopPropagation();
      void startEditing();
    }
  }

  export function exitEditMode(): void {
    editing = false;
  }

  export function isEditing(): boolean {
    return editing;
  }

  $: if (!editing) {
    inputValue = name;
  }
</script>

{#if editing}
  <div class="edit-container" class:has-error={error !== null}>
    <input
      bind:this={inputElement}
      bind:value={inputValue}
      class="edit-input"
      class:error={error !== null}
      type="text"
      disabled={saving}
      on:keydown={handleKeydown}
      on:blur={handleBlur}
      on:click|stopPropagation
    />
    {#if saving}
      <div class="saving-indicator">
        <div class="mini-spinner"></div>
      </div>
    {/if}
    {#if error}
      <span class="error-message">{error}</span>
    {/if}
  </div>
{:else}
  <span
    class="name"
    role="button"
    tabindex="0"
    title="Clique para editar"
    on:click={handleNameClick}
    on:keydown={handleNameKeydown}
  >
    {name}
  </span>
{/if}

<style>
  .name {
    flex: 1;
    font-family: var(--font-body);
    font-size: var(--text-sm);
    font-weight: 500;
    color: var(--text-secondary);
    text-transform: lowercase;
    letter-spacing: 0.02em;
    transition: all var(--duration-fast) var(--ease-out);
    cursor: pointer;
    border-radius: var(--radius-sm);
    padding: 4px 8px;
    margin: -4px -8px;
  }

  .name:hover {
    color: var(--text-primary);
    background-color: var(--surface-overlay);
  }

  .name:focus {
    outline: none;
    color: var(--text-primary);
    background-color: var(--surface-overlay);
  }

  .name:focus-visible {
    outline: 2px solid var(--accent-primary);
    outline-offset: 2px;
  }

  .edit-container {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    position: relative;
  }

  .edit-input {
    width: 100%;
    font-family: var(--font-body);
    font-size: var(--text-sm);
    font-weight: 500;
    color: var(--text-primary);
    text-transform: lowercase;
    letter-spacing: 0.02em;
    background-color: var(--surface-overlay);
    border: 1px solid var(--accent-primary);
    border-radius: var(--radius-md);
    padding: 4px 8px;
    outline: none;
    transition: border-color var(--duration-fast) var(--ease-out),
                box-shadow var(--duration-fast) var(--ease-out);
    box-shadow: 0 0 0 2px var(--accent-soft);
  }

  .edit-input:focus {
    border-color: var(--accent-primary);
    box-shadow: 0 0 0 3px var(--accent-glow);
  }

  .edit-input.error {
    border-color: var(--semantic-error);
    box-shadow: 0 0 0 2px rgba(212, 114, 106, 0.2);
  }

  .edit-input:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .error-message {
    font-family: var(--font-body);
    font-size: 0.625rem;
    color: var(--semantic-error);
    line-height: 1.2;
  }

  .saving-indicator {
    position: absolute;
    right: 8px;
    top: 50%;
    transform: translateY(-50%);
  }

  .has-error .saving-indicator {
    top: 12px;
  }

  .mini-spinner {
    width: 12px;
    height: 12px;
    border: 2px solid var(--border-subtle);
    border-top-color: var(--accent-primary);
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
    .mini-spinner {
      animation: none;
    }
  }
</style>
