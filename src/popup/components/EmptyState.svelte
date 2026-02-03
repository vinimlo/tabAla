<script lang="ts">
  export let message: string = 'Sua sala de espera';
  export let hint: string = 'Clique no botão + para salvar a aba atual';
</script>

<div class="empty-state">
  <div class="orb">
    <div class="orb-inner"></div>
    <div class="orb-glow"></div>
  </div>
  <p class="message">{message}</p>
  <p class="hint">{hint}</p>
  <div class="arrow-hint">
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M7 17L17 7M17 7H9M17 7V15" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  </div>
</div>

<style>
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: var(--space-6) var(--space-5);
    text-align: center;
    flex: 1;
  }

  .orb {
    position: relative;
    width: 48px;
    height: 48px;
    margin-bottom: var(--space-5);
  }

  .orb-inner {
    position: absolute;
    inset: 0;
    border-radius: var(--radius-full);
    border: 1.5px solid var(--border-hover);
    animation: breathe 4s var(--ease-in-out) infinite;
  }

  .orb-glow {
    position: absolute;
    inset: 8px;
    border-radius: var(--radius-full);
    background: var(--accent);
    opacity: 0.15;
    filter: blur(8px);
    animation: pulse 4s var(--ease-in-out) infinite;
  }

  @keyframes breathe {
    0%, 100% {
      transform: scale(1);
      opacity: 0.5;
    }
    50% {
      transform: scale(1.05);
      opacity: 0.8;
    }
  }

  @keyframes pulse {
    0%, 100% {
      opacity: 0.1;
      transform: scale(0.9);
    }
    50% {
      opacity: 0.25;
      transform: scale(1.1);
    }
  }

  .message {
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--text-secondary);
    margin: 0 0 var(--space-2) 0;
    letter-spacing: 0.01em;
  }

  .hint {
    font-size: 0.75rem;
    color: var(--text-tertiary);
    margin: 0;
    letter-spacing: 0.02em;
  }

  .arrow-hint {
    position: absolute;
    bottom: calc(var(--space-6) + 60px);
    right: calc(var(--space-4) + 56px);
    color: var(--accent);
    opacity: 0.5;
    animation: float 2s var(--ease-in-out) infinite;
  }

  @keyframes float {
    0%, 100% {
      transform: translate(0, 0);
      opacity: 0.5;
    }
    50% {
      transform: translate(4px, -4px);
      opacity: 0.8;
    }
  }
</style>
