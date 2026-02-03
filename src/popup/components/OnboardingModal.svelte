<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { fade, scale } from 'svelte/transition';

  const dispatch = createEventDispatcher<{
    accept: void;
    decline: void;
  }>();

  function handleAccept(): void {
    dispatch('accept');
  }

  function handleDecline(): void {
    dispatch('decline');
  }

  function handleKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      handleDecline();
    }
  }
</script>

<svelte:window on:keydown={handleKeydown} />

<div
  class="backdrop"
  transition:fade={{ duration: 150 }}
  role="dialog"
  aria-modal="true"
  aria-labelledby="onboarding-title"
>
  <div
    class="modal"
    transition:scale={{ duration: 250, start: 0.9, opacity: 0 }}
  >
    <div class="icon-container">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
        <line x1="3" y1="9" x2="21" y2="9"/>
        <line x1="9" y1="21" x2="9" y2="9"/>
      </svg>
    </div>

    <h2 id="onboarding-title">Bem-vindo ao TabAla!</h2>

    <p class="description">
      Gostaria de usar o TabAla como sua nova aba? Voce vera um dashboard visual
      para organizar seus links salvos.
    </p>

    <div class="features">
      <div class="feature">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
        <span>Dashboard visual estilo Kanban</span>
      </div>
      <div class="feature">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
        <span>Arraste e solte para organizar</span>
      </div>
      <div class="feature">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
        <span>Busca rapida por links</span>
      </div>
    </div>

    <div class="actions">
      <button
        type="button"
        class="btn btn-secondary"
        on:click={handleDecline}
      >
        Nao, so o popup
      </button>
      <button
        type="button"
        class="btn btn-primary"
        on:click={handleAccept}
      >
        Sim, substituir
      </button>
    </div>

    <p class="note">
      Voce pode alterar isso depois em Configuracoes
    </p>
  </div>
</div>

<style>
  .backdrop {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.7);
    backdrop-filter: blur(8px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }

  .modal {
    background: var(--bg-secondary);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: var(--space-6);
    max-width: 340px;
    width: 90%;
    text-align: center;
    box-shadow:
      0 8px 32px rgba(0, 0, 0, 0.5),
      0 0 0 1px rgba(255, 255, 255, 0.03);
  }

  .icon-container {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 72px;
    height: 72px;
    margin: 0 auto var(--space-4);
    background: var(--accent-soft);
    border-radius: var(--radius-lg);
    color: var(--accent);
  }

  h2 {
    margin: 0 0 var(--space-3);
    font-size: 1.125rem;
    font-weight: 600;
    color: var(--text-primary);
  }

  .description {
    margin: 0 0 var(--space-4);
    font-size: 0.875rem;
    color: var(--text-secondary);
    line-height: 1.5;
  }

  .features {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    margin-bottom: var(--space-5);
    text-align: left;
  }

  .feature {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    font-size: 0.8125rem;
    color: var(--text-secondary);
  }

  .feature svg {
    color: var(--success);
    flex-shrink: 0;
  }

  .actions {
    display: flex;
    gap: var(--space-2);
  }

  .btn {
    flex: 1;
    padding: var(--space-3);
    border-radius: var(--radius-md);
    font-family: inherit;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: all var(--duration-fast) var(--ease-out);
    border: 1px solid transparent;
  }

  .btn:focus {
    outline: none;
  }

  .btn:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }

  .btn-secondary {
    background: var(--bg-tertiary);
    color: var(--text-secondary);
    border-color: var(--border);
  }

  .btn-secondary:hover {
    background: var(--bg-primary);
    color: var(--text-primary);
    border-color: var(--border-hover);
  }

  .btn-primary {
    background: var(--accent);
    color: white;
  }

  .btn-primary:hover {
    filter: brightness(1.1);
    box-shadow: 0 0 16px var(--accent-glow);
  }

  .note {
    margin: var(--space-4) 0 0;
    font-size: 0.6875rem;
    color: var(--text-tertiary);
  }
</style>
