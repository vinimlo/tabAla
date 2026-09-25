<script lang="ts">
  import Icon from './Icon.svelte';
  import type { IconName } from './icons';

  export let icon: IconName;
  /** Accessible name and tooltip. */
  export let label: string;
  export let size: 'sm' | 'md' = 'md';
  export let pressed: boolean | undefined = undefined;
  export let expanded: boolean | undefined = undefined;
  export let tone: 'default' | 'success' | 'danger' = 'default';
</script>

<button
  type="button"
  class="icon-btn {size} {tone}"
  aria-label={label}
  title={label}
  aria-pressed={pressed}
  aria-expanded={expanded}
  on:click
  {...$$restProps}
>
  <Icon name={icon} size={size === 'sm' ? 15 : 17} />
</button>

<style>
  .icon-btn {
    display: inline-grid;
    place-items: center;
    width: var(--control-md);
    height: var(--control-md);
    padding: 0;
    border: 1px solid transparent;
    border-radius: var(--radius-md);
    background: transparent;
    color: var(--text-secondary);
    cursor: pointer;
    transition:
      background-color var(--duration-fast) var(--ease-out),
      color var(--duration-fast) var(--ease-out);
  }

  .sm {
    width: var(--control-sm);
    height: var(--control-sm);
    border-radius: var(--radius-sm);
  }

  .icon-btn:hover {
    background: var(--state-hover);
    color: var(--text-primary);
  }

  .icon-btn[aria-pressed='true'],
  .icon-btn[aria-expanded='true'] {
    color: var(--accent-primary);
  }

  .success:hover {
    color: var(--semantic-success);
  }

  .danger:hover {
    color: var(--semantic-error);
  }
</style>
