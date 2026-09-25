<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import Icon from './Icon.svelte';
  import type { IconName } from './icons';

  export let icon: IconName | null = null;
  export let danger = false;
  export let disabled = false;

  const dispatch = createEventDispatcher<{ select: void }>();
</script>

<button
  type="button"
  role="menuitem"
  class="item"
  class:danger
  {disabled}
  tabindex="-1"
  on:click|stopPropagation={() => dispatch('select')}
>
  {#if icon !== null}
    <Icon name={icon} size={15} />
  {/if}
  <span class="label"><slot /></span>
  {#if $$slots.hint}
    <span class="hint"><slot name="hint" /></span>
  {/if}
</button>

<style>
  .item {
    display: flex;
    align-items: center;
    gap: 10px;
    height: var(--control-md);
    padding: 0 10px;
    border: none;
    border-radius: var(--radius-sm);
    background: transparent;
    color: var(--text-primary);
    font: 500 var(--text-sm) / 1 var(--font-body);
    text-align: left;
    cursor: pointer;
  }

  .item :global(svg) {
    color: var(--text-secondary);
  }

  .item:hover,
  .item:focus-visible {
    background: var(--state-hover);
    outline: none;
  }

  .item:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }

  .danger,
  .danger :global(svg) {
    color: var(--semantic-error);
  }

  .label {
    flex: 1;
  }

  .hint {
    display: inline-flex;
    gap: 3px;
    color: var(--text-tertiary);
  }
</style>
