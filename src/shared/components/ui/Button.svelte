<script lang="ts">
  import Icon from './Icon.svelte';
  import type { IconName } from './icons';

  export let variant: 'primary' | 'secondary' | 'quiet' | 'danger' = 'secondary';
  export let size: 'sm' | 'md' = 'md';
  export let icon: IconName | null = null;
  export let type: 'button' | 'submit' = 'button';
  export let disabled = false;
</script>

<button {type} class="btn {variant} {size}" {disabled} on:click on:mousedown {...$$restProps}>
  {#if icon !== null}
    <Icon name={icon} size={size === 'sm' ? 14 : 15} />
  {/if}
  <slot />
</button>

<style>
  .btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    height: var(--control-md);
    padding: 0 13px;
    border: 1px solid var(--border-default);
    border-radius: var(--radius-md);
    background: transparent;
    color: var(--text-primary);
    font: 500 var(--text-sm) / 1 var(--font-body);
    white-space: nowrap;
    cursor: pointer;
    transition:
      background-color var(--duration-fast) var(--ease-out),
      border-color var(--duration-fast) var(--ease-out),
      color var(--duration-fast) var(--ease-out);
  }

  .btn:hover:not(:disabled) {
    background: var(--state-hover);
    border-color: var(--border-strong);
  }

  .btn:active:not(:disabled) {
    background: var(--state-pressed);
  }

  .btn:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }

  .sm {
    gap: 6px;
    height: var(--control-sm);
    padding: 0 10px;
    border-radius: var(--radius-sm);
    font-size: var(--text-xs);
  }

  .primary {
    border-color: transparent;
    background: var(--accent-primary);
    color: var(--text-on-accent);
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.18), 0 6px 16px -6px var(--accent-glow);
  }

  .primary:hover:not(:disabled) {
    border-color: transparent;
    background: var(--accent-secondary);
  }

  .quiet {
    border-color: transparent;
    color: var(--text-secondary);
  }

  .quiet:hover:not(:disabled) {
    border-color: transparent;
    color: var(--text-primary);
  }

  .danger {
    border-color: transparent;
    background: var(--semantic-error);
    color: var(--text-on-accent);
  }

  .danger:hover:not(:disabled) {
    border-color: transparent;
    background: var(--semantic-error);
    filter: brightness(0.92);
  }
</style>
