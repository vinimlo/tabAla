<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  export let loading = false;
  export let disabled = false;

  const dispatch = createEventDispatcher<{ click: void }>();

  function handleClick(): void {
    if (!loading && !disabled) {
      dispatch('click');
    }
  }
</script>

<button
  type="button"
  class="save-btn"
  class:loading
  disabled={disabled || loading}
  on:click={handleClick}
  aria-label="Salvar aba atual"
>
  {#if loading}
    <span class="spinner" />
  {:else}
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M10 4V16M4 10H16"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
      />
    </svg>
  {/if}
</button>

<style>
  .save-btn {
    position: fixed;
    bottom: calc(var(--space-6) + 8px);
    right: var(--space-4);
    width: 48px;
    height: 48px;
    border-radius: var(--radius-full);
    border: none;
    background: linear-gradient(135deg, #FF6B4A 0%, #FF8A6A 100%);
    color: white;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow:
      0 4px 12px rgba(255, 107, 74, 0.3),
      0 0 0 0 rgba(255, 107, 74, 0);
    transition: all var(--duration-fast) var(--ease-out);
    animation: idle-pulse 3s var(--ease-in-out) infinite;
    z-index: 100;
  }

  .save-btn:hover:not(:disabled) {
    transform: scale(1.08);
    box-shadow:
      0 6px 20px rgba(255, 107, 74, 0.4),
      0 0 20px rgba(255, 107, 74, 0.2);
    animation: none;
  }

  .save-btn:active:not(:disabled) {
    transform: scale(0.95);
    box-shadow:
      0 2px 8px rgba(255, 107, 74, 0.3),
      0 0 0 0 rgba(255, 107, 74, 0);
  }

  .save-btn:disabled {
    opacity: 0.7;
    cursor: not-allowed;
    animation: none;
  }

  .save-btn.loading {
    animation: none;
  }

  @keyframes idle-pulse {
    0%, 100% {
      box-shadow:
        0 4px 12px rgba(255, 107, 74, 0.3),
        0 0 0 0 rgba(255, 107, 74, 0.15);
    }
    50% {
      box-shadow:
        0 4px 12px rgba(255, 107, 74, 0.3),
        0 0 0 8px rgba(255, 107, 74, 0);
    }
  }

  .spinner {
    width: 18px;
    height: 18px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-top-color: white;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  svg {
    display: block;
  }
</style>
