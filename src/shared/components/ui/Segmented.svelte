<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  export let label: string;
  export let options: { value: string | number; label: string }[];
  export let value: string | number | null = null;

  const dispatch = createEventDispatcher<{ change: string | number }>();

  function handleKeydown(event: KeyboardEvent, index: number): void {
    const step = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
    if (step === 0) {
      return;
    }
    event.preventDefault();
    dispatch('change', options[(index + step + options.length) % options.length].value);
  }
</script>

<div class="segmented" role="radiogroup" aria-label={label}>
  {#each options as option, index (option.value)}
    <button
      type="button"
      role="radio"
      aria-checked={option.value === value}
      tabindex={option.value === value || (value === null && index === 0) ? 0 : -1}
      on:click={() => dispatch('change', option.value)}
      on:keydown={(event) => handleKeydown(event, index)}
    >{option.label}</button>
  {/each}
</div>

<style>
  .segmented {
    display: inline-flex;
    gap: 2px;
    padding: 3px;
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-md);
    background: var(--surface-well);
  }

  button {
    height: 30px;
    padding: 0 16px;
    border: none;
    border-radius: var(--radius-sm);
    background: transparent;
    color: var(--text-secondary);
    font: 550 var(--text-sm) / 1 var(--font-body);
    cursor: pointer;
  }

  button:hover {
    color: var(--text-primary);
  }

  button[aria-checked='true'] {
    background: var(--surface-overlay);
    color: var(--text-primary);
    box-shadow: var(--shadow-lift);
  }
</style>
