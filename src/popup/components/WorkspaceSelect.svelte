<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { Workspace } from '@/lib/types';
  import { WORKSPACE_COLORS } from '@/lib/types';

  export let workspaces: Workspace[] = [];
  export let selectedId: string;
  export let disabled = false;

  const dispatch = createEventDispatcher<{
    change: string;
  }>();

  $: selectedWorkspace = workspaces.find((w) => w.id === selectedId);

  function handleChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    dispatch('change', target.value);
  }
</script>

<div class="workspace-select-wrapper">
  <span class="label">Workspace</span>
  <div class="select-container">
    <span
      class="color-indicator"
      style="--workspace-color: {selectedWorkspace?.color ?? WORKSPACE_COLORS[0]}"
    ></span>
    <select
      class="workspace-select"
      bind:value={selectedId}
      on:change={handleChange}
      {disabled}
    >
      {#each workspaces as workspace}
        <option value={workspace.id}>{workspace.name}</option>
      {/each}
    </select>
  </div>
</div>

<style>
  .workspace-select-wrapper {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .label {
    font-size: var(--text-xs);
    color: var(--text-tertiary);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .select-container {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }

  .color-indicator {
    width: 10px;
    height: 10px;
    border-radius: var(--radius-full);
    background-color: var(--workspace-color);
    flex-shrink: 0;
  }

  .workspace-select {
    flex: 1;
    padding: var(--space-1) var(--space-2);
    background: transparent;
    border: none;
    color: var(--text-primary);
    font-family: var(--font-body);
    font-size: var(--text-sm);
    font-weight: 500;
    cursor: pointer;
    margin-left: calc(-1 * var(--space-1));
  }

  .workspace-select:focus {
    outline: none;
  }

  .workspace-select:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .workspace-select option {
    background: var(--surface-elevated);
    color: var(--text-primary);
  }
</style>
