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
  <span class="btn-ring"></span>
  <span class="btn-inner">
    {#if loading}
      <span class="spinner" />
    {:else}
      <svg
        width="22"
        height="22"
        viewBox="0 0 22 22"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M11 5V17M5 11H17"
          stroke="currentColor"
          stroke-width="2.5"
          stroke-linecap="round"
        />
      </svg>
    {/if}
  </span>
</button>

<style>
  .save-btn {
    position: fixed;
    bottom: calc(var(--space-6) + 12px);
    right: var(--space-4);
    width: 56px;
    height: 56px;
    border-radius: var(--radius-full);
    border: none;
    background: transparent;
    color: white;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100;
    padding: 0;
  }

  .btn-ring {
    position: absolute;
    inset: 0;
    border-radius: var(--radius-full);
    border: 2px solid var(--accent-primary);
    opacity: 0.3;
    animation: ring-pulse 3s var(--ease-smooth) infinite;
  }

  .btn-inner {
    position: relative;
    width: 48px;
    height: 48px;
    border-radius: var(--radius-full);
    background: linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-secondary) 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow:
      0 4px 16px rgba(232, 93, 66, 0.35),
      inset 0 1px 0 rgba(255, 255, 255, 0.15);
    transition: all var(--duration-fast) var(--ease-out);
    animation: breathe 3s var(--ease-smooth) infinite;
  }

  .save-btn:hover:not(:disabled) .btn-inner {
    transform: scale(1.08);
    box-shadow:
      0 6px 24px rgba(232, 93, 66, 0.45),
      0 0 32px rgba(232, 93, 66, 0.2),
      inset 0 1px 0 rgba(255, 255, 255, 0.2);
    animation: none;
  }

  .save-btn:hover:not(:disabled) .btn-ring {
    opacity: 0.6;
    transform: scale(1.1);
    animation: none;
  }

  .save-btn:active:not(:disabled) .btn-inner {
    transform: scale(0.95);
    box-shadow:
      0 2px 8px rgba(232, 93, 66, 0.3),
      inset 0 1px 0 rgba(255, 255, 255, 0.1);
  }

  .save-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .save-btn:disabled .btn-inner,
  .save-btn:disabled .btn-ring {
    animation: none;
  }

  .save-btn.loading .btn-inner,
  .save-btn.loading .btn-ring {
    animation: none;
  }

  .save-btn:focus {
    outline: none;
  }

  .save-btn:focus-visible .btn-ring {
    opacity: 1;
    border-width: 2px;
    animation: none;
  }

  @keyframes breathe {
    0%, 100% {
      transform: scale(1);
    }
    50% {
      transform: scale(1.02);
    }
  }

  @keyframes ring-pulse {
    0%, 100% {
      transform: scale(1);
      opacity: 0.3;
    }
    50% {
      transform: scale(1.08);
      opacity: 0;
    }
  }

  .spinner {
    width: 20px;
    height: 20px;
    border: 2.5px solid rgba(255, 255, 255, 0.25);
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
    filter: drop-shadow(0 1px 1px rgba(0, 0, 0, 0.15));
  }

  /* Reduced motion support */
  @media (prefers-reduced-motion: reduce) {
    .btn-inner,
    .btn-ring,
    .spinner {
      animation: none;
    }
  }
</style>
