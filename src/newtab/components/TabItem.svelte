<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { BrowserTab } from '@/lib/tabs';
  import { extractDomain } from '@/lib/tabs';

  export let tab: BrowserTab;
  export let isActive = false;
  export let isPinned = false;
  export let groupColor: string | undefined = undefined;

  const dispatch = createEventDispatcher<{
    click: void;
    close: void;
    dragstart: DragEvent;
  }>();

  $: domain = extractDomain(tab.url);

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

  $: colorHex = groupColor ? groupColors[groupColor] || groupColor : undefined;

  function handleClick(): void {
    dispatch('click');
  }

  function handleClose(event: MouseEvent): void {
    event.stopPropagation();
    dispatch('close');
  }

  function handleDragStart(event: DragEvent): void {
    dispatch('dragstart', event);
  }

  function handleKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      dispatch('click');
    }
  }
</script>

<div
  class="tab-item"
  class:active={isActive}
  class:pinned={isPinned}
  class:has-group-color={colorHex !== undefined}
  role="button"
  tabindex="0"
  draggable="true"
  on:click={handleClick}
  on:keydown={handleKeydown}
  on:dragstart={handleDragStart}
  style:--group-color={colorHex}
>
  <div class="tab-icon">
    {#if isPinned}
      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none">
        <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z"/>
      </svg>
    {:else if tab.favicon}
      <img src={tab.favicon} alt="" width="16" height="16" />
    {:else}
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <line x1="2" y1="12" x2="22" y2="12"/>
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
      </svg>
    {/if}
  </div>

  <div class="tab-content">
    <span class="tab-title" title={tab.title}>{tab.title}</span>
    <span class="tab-domain">{domain}</span>
  </div>

  <button
    type="button"
    class="btn-close"
    on:click={handleClose}
    aria-label="Fechar aba"
  >
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M18 6L6 18M6 6l12 12"/>
    </svg>
  </button>
</div>

<style>
  .tab-item {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-2) var(--space-3) var(--space-2) var(--space-3);
    background: var(--bg-secondary);
    border: 1px solid transparent;
    border-radius: var(--radius-sm);
    cursor: pointer;
    transition: all var(--duration-fast) var(--ease-out);
    position: relative;
  }

  .tab-item:hover {
    background: var(--bg-tertiary);
  }

  .tab-item:hover .btn-close {
    opacity: 1;
  }

  .tab-item.active {
    background: var(--bg-tertiary);
    border-left: 2px solid var(--accent);
    padding-left: calc(var(--space-3) - 2px);
  }

  .tab-item.pinned {
    background: var(--accent-soft);
  }

  .tab-item.pinned:hover {
    background: var(--accent-glow);
  }

  .tab-item.has-group-color::before {
    content: '';
    position: absolute;
    left: 0;
    top: 50%;
    transform: translateY(-50%);
    width: 3px;
    height: 60%;
    background: var(--group-color);
    border-radius: 0 2px 2px 0;
  }

  .tab-item:active {
    transform: scale(0.98);
  }

  /* Drag state */
  .tab-item:global(.dragging) {
    opacity: 0.5;
    box-shadow: var(--shadow-lg);
  }

  .tab-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    flex-shrink: 0;
    color: var(--text-tertiary);
  }

  .tab-icon img {
    width: 20px;
    height: 20px;
    object-fit: contain;
    border-radius: 2px;
  }

  .pinned .tab-icon {
    color: var(--accent);
  }

  .tab-content {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .tab-title {
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .tab-domain {
    font-size: 0.75rem;
    color: var(--text-tertiary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .btn-close {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    padding: 0;
    background: transparent;
    border: none;
    border-radius: var(--radius-sm);
    color: var(--text-tertiary);
    cursor: pointer;
    opacity: 0;
    transition: all var(--duration-fast) var(--ease-out);
    flex-shrink: 0;
  }

  .btn-close:hover {
    background: rgba(248, 113, 113, 0.2);
    color: var(--error);
  }

  .btn-close:focus-visible {
    opacity: 1;
  }
</style>
