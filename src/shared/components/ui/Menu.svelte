<script lang="ts">
  import { createEventDispatcher, onMount, tick } from 'svelte';

  export let label: string;
  export let align: 'start' | 'end' = 'start';
  /** The element that opened the menu: clicks on it do not count as outside. */
  export let anchor: HTMLElement | undefined = undefined;

  const dispatch = createEventDispatcher<{ close: void }>();
  let root: HTMLDivElement;

  function items(): HTMLElement[] {
    return [...root.querySelectorAll<HTMLElement>('[role="menuitem"]:not([disabled])')];
  }

  function focusAt(offset: number): void {
    const list = items();
    if (list.length === 0) {
      return;
    }
    const index = list.indexOf(document.activeElement as HTMLElement);
    list[(index + offset + list.length) % list.length].focus();
  }

  function close(returnFocus: boolean): void {
    dispatch('close');
    if (returnFocus) {
      anchor?.querySelector<HTMLElement>('button')?.focus();
    }
  }

  function handleKeydown(event: KeyboardEvent): void {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      focusAt(1);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      focusAt(-1);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      close(true);
    } else if (event.key === 'Tab') {
      close(false);
    }
  }

  function handleWindowMousedown(event: MouseEvent): void {
    const target = event.target as Node;
    if (!root.contains(target) && anchor?.contains(target) !== true) {
      close(false);
    }
  }

  onMount(async () => {
    await tick();
    items()[0]?.focus();
  });
</script>

<svelte:window on:mousedown={handleWindowMousedown} />

<div class="menu {align}" role="menu" aria-label={label} tabindex="-1" bind:this={root} on:keydown={handleKeydown}>
  <slot />
</div>

<style>
  .menu {
    position: absolute;
    top: calc(100% + 6px);
    z-index: 30;
    display: flex;
    flex-direction: column;
    min-width: 220px;
    padding: 4px;
    background: var(--surface-elevated);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-float);
  }

  .start {
    left: 0;
  }

  .end {
    right: 0;
  }

  .menu:focus {
    outline: none;
  }
</style>
