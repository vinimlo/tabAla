<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { Workspace } from '@/lib/types';
  import { DEFAULT_WORKSPACE_ID } from '@/lib/types';

  export let workspace: Workspace;
  export let isActive = false;
  export let showTooltip = true;

  const dispatch = createEventDispatcher<{
    select: string;
    contextmenu: { workspace: Workspace; x: number; y: number };
  }>();

  let tooltipVisible = false;
  let tooltipTimeout: ReturnType<typeof setTimeout>;

  // Workspace default uses accent color styling
  $: isDefault = workspace.id === DEFAULT_WORKSPACE_ID || workspace.isDefault === true;

  function handleClick(): void {
    dispatch('select', workspace.id);
  }

  function handleContextMenu(event: MouseEvent): void {
    event.preventDefault();
    dispatch('contextmenu', {
      workspace,
      x: event.clientX,
      y: event.clientY,
    });
  }

  function handleMouseEnter(): void {
    if (!showTooltip) {
      return;
    }
    tooltipTimeout = setTimeout(() => {
      tooltipVisible = true;
    }, 400);
  }

  function handleMouseLeave(): void {
    clearTimeout(tooltipTimeout);
    tooltipVisible = false;
  }

  function handleKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleClick();
    }
  }
</script>

<div
  class="workspace-item"
  class:active={isActive}
  class:is-default={isDefault}
  role="button"
  tabindex="0"
  aria-label={workspace.name}
  aria-pressed={isActive}
  on:click={handleClick}
  on:contextmenu={handleContextMenu}
  on:mouseenter={handleMouseEnter}
  on:mouseleave={handleMouseLeave}
  on:keydown={handleKeydown}
  draggable="true"
  data-workspace-id={workspace.id}
>
  <!-- Selection indicator - INSIDE container (left edge) -->
  <div class="selection-indicator" aria-hidden="true"></div>

  <!-- Main workspace circle (transforms to squircle when active) -->
  <div
    class="workspace-circle"
    style="--workspace-color: {workspace.color}"
  >
    <span class="workspace-initial">{workspace.name.charAt(0).toUpperCase()}</span>
  </div>

  {#if tooltipVisible}
    <div class="tooltip" role="tooltip">
      <span class="tooltip-name">{workspace.name}</span>
      {#if workspace.description}
        <span class="tooltip-description">{workspace.description}</span>
      {/if}
    </div>
  {/if}
</div>

<style>
  /* Container - padding gives space for indicator */
  .workspace-item {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 4px 8px 4px 8px;
    cursor: pointer;
  }

  .workspace-item:focus {
    outline: none;
  }

  .workspace-item:focus-visible .workspace-circle {
    box-shadow:
      0 0 0 2px var(--surface-elevated),
      0 0 0 4px var(--accent-primary);
  }

  /* Selection indicator - positioned at left edge INSIDE container */
  .selection-indicator {
    position: absolute;
    left: 0;
    top: 50%;
    transform: translateY(-50%);
    width: 3px;
    height: 0;
    background: var(--accent-primary);
    border-radius: 0 4px 4px 0;
    transition: height 200ms cubic-bezier(0.34, 1.56, 0.64, 1);
    opacity: 0;
  }

  /* Hover: show small indicator */
  .workspace-item:hover .selection-indicator {
    height: 16px;
    opacity: 0.7;
  }

  /* Active: show full indicator */
  .workspace-item.active .selection-indicator {
    height: 28px;
    opacity: 1;
  }

  /* Main circle - "Floating Gem" design */
  .workspace-circle {
    position: relative;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background-color: var(--workspace-color);
    border: 2px solid rgba(255, 255, 255, 0.1);
    display: flex;
    align-items: center;
    justify-content: center;
    transition:
      transform 200ms ease-out,
      border-radius 200ms ease-out,
      border-color 200ms ease-out,
      box-shadow 200ms ease-out;
    box-shadow:
      0 2px 4px rgba(0, 0, 0, 0.2),
      inset 0 1px 2px rgba(255, 255, 255, 0.1);
    z-index: 1;
  }

  /* Hover state: glow internal + lift */
  .workspace-item:hover .workspace-circle {
    transform: scale(1.05);
    border-color: rgba(255, 255, 255, 0.2);
    box-shadow:
      0 4px 12px rgba(0, 0, 0, 0.3),
      inset 0 0 12px rgba(255, 255, 255, 0.05);
  }

  /* Active state: SQUIRCLE + single border following workspace color */
  .workspace-item.active .workspace-circle {
    border-radius: 14px;
    border-color: var(--workspace-color);
    box-shadow:
      0 4px 16px color-mix(in srgb, var(--workspace-color) 35%, transparent),
      inset 0 1px 2px rgba(255, 255, 255, 0.15);
  }

  /* Combined hover + active: enhanced effect */
  .workspace-item.active:hover .workspace-circle {
    transform: scale(1.08);
    box-shadow:
      0 6px 20px color-mix(in srgb, var(--workspace-color) 45%, transparent),
      inset 0 1px 2px rgba(255, 255, 255, 0.2);
  }

  /* Default workspace - coral gradient accent */
  .workspace-item.is-default .workspace-circle {
    background: linear-gradient(135deg, var(--accent-primary), var(--accent-secondary, #d4563f));
    border-color: rgba(255, 255, 255, 0.15);
    box-shadow:
      0 2px 8px rgba(232, 93, 66, 0.3),
      inset 0 1px 2px rgba(255, 255, 255, 0.15);
  }

  .workspace-item.is-default:hover .workspace-circle {
    border-color: rgba(255, 255, 255, 0.25);
    box-shadow:
      0 6px 20px rgba(232, 93, 66, 0.4),
      inset 0 0 12px rgba(255, 255, 255, 0.1);
  }

  .workspace-item.is-default.active .workspace-circle {
    border-color: rgba(255, 255, 255, 0.3);
    box-shadow:
      0 8px 24px rgba(232, 93, 66, 0.4),
      inset 0 1px 2px rgba(255, 255, 255, 0.2);
  }

  .workspace-initial {
    color: white;
    font-family: var(--font-body);
    font-size: var(--text-sm);
    font-weight: 600;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
    user-select: none;
    transition: transform 150ms ease-out;
  }

  /* Subtle letter animation on hover */
  .workspace-item:hover .workspace-initial {
    transform: scale(1.05);
  }

  .tooltip {
    position: absolute;
    left: calc(100% + 12px);
    top: 50%;
    transform: translateY(-50%);
    background: var(--surface-elevated);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-md);
    padding: var(--space-2) var(--space-3);
    box-shadow: var(--shadow-lg);
    z-index: 100;
    white-space: nowrap;
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    pointer-events: none;
    animation: tooltipFadeIn 150ms ease-out;
  }

  @keyframes tooltipFadeIn {
    from {
      opacity: 0;
      transform: translateY(-50%) translateX(-8px);
    }
    to {
      opacity: 1;
      transform: translateY(-50%) translateX(0);
    }
  }

  .tooltip-name {
    color: var(--text-primary);
    font-family: var(--font-body);
    font-size: var(--text-sm);
    font-weight: 500;
  }

  .tooltip-description {
    color: var(--text-tertiary);
    font-family: var(--font-body);
    font-size: var(--text-xs);
    max-width: 200px;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  /* Reduced motion */
  @media (prefers-reduced-motion: reduce) {
    .selection-indicator,
    .workspace-circle,
    .workspace-initial {
      transition: none;
    }

    .workspace-item:hover .workspace-circle,
    .workspace-item.active .workspace-circle,
    .workspace-item.active:hover .workspace-circle {
      transform: none;
    }

    .workspace-item:hover .workspace-initial {
      transform: none;
    }

    .tooltip {
      animation: none;
    }
  }
</style>
