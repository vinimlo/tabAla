<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { slide } from 'svelte/transition';

  export let title: string;
  export let count: number;
  export let icon: 'pin' | 'group' | 'tabs' = 'tabs';
  export let color: string | undefined = undefined;
  export let showCreateCollection = false;
  export let defaultExpanded = false;

  const dispatch = createEventDispatcher<{
    createCollection: void;
  }>();

  let expanded = defaultExpanded;

  // Chrome tab group colors to hex
  const groupColors: Record<string, string> = {
    grey: '#5F6368',
    blue: '#1A73E8',
    red: '#D93025',
    yellow: '#F9AB00',
    green: '#188038',
    pink: '#D01884',
    purple: '#9334E6',
    cyan: '#007B83',
    orange: '#E8710A',
  };

  $: colorHex = color ? groupColors[color] || color : undefined;

  function toggleExpanded(): void {
    expanded = !expanded;
  }

  function handleCreateCollection(): void {
    dispatch('createCollection');
  }
</script>

<div class="section" class:expanded>
  <button
    type="button"
    class="section-header"
    on:click={toggleExpanded}
    aria-expanded={expanded}
  >
    <svg
      class="chevron"
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <path d="M9 18l6-6-6-6"/>
    </svg>

    <span class="section-icon" style:--icon-color={colorHex}>
      {#if icon === 'pin'}
        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="none">
          <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z"/>
        </svg>
      {:else if icon === 'group'}
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="3" width="7" height="7" rx="1"/>
          <rect x="14" y="3" width="7" height="7" rx="1"/>
          <rect x="3" y="14" width="7" height="7" rx="1"/>
          <rect x="14" y="14" width="7" height="7" rx="1"/>
        </svg>
      {:else}
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="3" width="18" height="18" rx="2"/>
          <path d="M9 3v18"/>
        </svg>
      {/if}
    </span>

    <span class="section-title">{title}</span>
    <span class="section-count">{count}</span>
  </button>

  {#if expanded}
    <div class="section-content" transition:slide={{ duration: 150 }}>
      <slot />

      {#if showCreateCollection}
        <button
          type="button"
          class="btn-create-collection"
          on:click|stopPropagation={handleCreateCollection}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 5v14M5 12h14"/>
          </svg>
          Criar colecao
        </button>
      {/if}
    </div>
  {/if}
</div>

<style>
  .section {
    margin-bottom: var(--space-2);
  }

  .section-header {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    width: 100%;
    padding: var(--space-2);
    background: transparent;
    border: none;
    border-radius: var(--radius-sm);
    color: var(--text-secondary);
    font-family: inherit;
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    cursor: pointer;
    transition: all var(--duration-fast) var(--ease-out);
  }

  .section-header:hover {
    background: var(--bg-tertiary);
    color: var(--text-primary);
  }

  .chevron {
    transition: transform var(--duration-fast) var(--ease-out);
    flex-shrink: 0;
  }

  .expanded .chevron {
    transform: rotate(90deg);
  }

  .section-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--icon-color, var(--text-tertiary));
    flex-shrink: 0;
  }

  .section-title {
    flex: 1;
    text-align: left;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .section-count {
    font-size: 0.625rem;
    font-weight: 500;
    color: var(--text-tertiary);
    background: var(--bg-tertiary);
    padding: 1px 5px;
    border-radius: var(--radius-full);
    flex-shrink: 0;
  }

  .section-content {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    padding-left: var(--space-3);
    margin-top: var(--space-1);
  }

  .btn-create-collection {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-2);
    margin-top: var(--space-1);
    background: transparent;
    border: 1px dashed var(--border);
    border-radius: var(--radius-sm);
    color: var(--text-tertiary);
    font-family: inherit;
    font-size: 0.75rem;
    cursor: pointer;
    transition: all var(--duration-fast) var(--ease-out);
  }

  .btn-create-collection:hover {
    background: var(--accent-soft);
    border-color: var(--accent);
    color: var(--accent);
  }
</style>
