<script lang="ts">
  export let message: string = 'Sua sala de espera está vazia';
  export let hint: string = 'Salve sua primeira aba para começar';
</script>

<div class="empty-state">
  <!-- Floating rectangles illustration -->
  <div class="illustration">
    <div class="rect rect-1"></div>
    <div class="rect rect-2"></div>
    <div class="rect rect-3"></div>
  </div>

  <p class="message">{message}</p>
  <p class="hint">{hint}</p>

  <!-- Animated arrow pointing to FAB -->
  <div class="arrow-hint">
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M10 30C14 26 20 20 28 14"
        stroke="currentColor"
        stroke-width="1.5"
        stroke-linecap="round"
        stroke-dasharray="3 5"
        class="arrow-path"
      />
      <path
        d="M24 10L29 14L25 19"
        stroke="currentColor"
        stroke-width="1.5"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
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
    position: relative;
  }

  /* Floating rectangles illustration */
  .illustration {
    position: relative;
    width: 80px;
    height: 64px;
    margin-bottom: var(--space-5);
  }

  .rect {
    position: absolute;
    border-radius: var(--radius-md);
    border: 1.5px solid var(--border-strong);
    background: var(--surface-elevated);
    transition: all var(--duration-slow) var(--ease-smooth);
  }

  .rect-1 {
    width: 48px;
    height: 32px;
    top: 0;
    left: 50%;
    transform: translateX(-50%);
    animation: float-1 4s var(--ease-smooth) infinite;
  }

  .rect-2 {
    width: 40px;
    height: 28px;
    top: 18px;
    left: 4px;
    opacity: 0.7;
    animation: float-2 4s var(--ease-smooth) infinite;
    animation-delay: -1.3s;
  }

  .rect-3 {
    width: 36px;
    height: 24px;
    top: 28px;
    right: 4px;
    opacity: 0.5;
    animation: float-3 4s var(--ease-smooth) infinite;
    animation-delay: -2.6s;
  }

  @keyframes float-1 {
    0%, 100% {
      transform: translateX(-50%) translateY(0) rotate(0deg);
    }
    25% {
      transform: translateX(-50%) translateY(-4px) rotate(1deg);
    }
    50% {
      transform: translateX(-50%) translateY(-2px) rotate(-0.5deg);
    }
    75% {
      transform: translateX(-50%) translateY(-6px) rotate(0.5deg);
    }
  }

  @keyframes float-2 {
    0%, 100% {
      transform: translateY(0) rotate(0deg);
    }
    33% {
      transform: translateY(-5px) rotate(-1deg);
    }
    66% {
      transform: translateY(-2px) rotate(0.5deg);
    }
  }

  @keyframes float-3 {
    0%, 100% {
      transform: translateY(0) rotate(0deg);
    }
    40% {
      transform: translateY(-3px) rotate(1deg);
    }
    80% {
      transform: translateY(-5px) rotate(-0.5deg);
    }
  }

  .message {
    font-family: var(--font-body);
    font-size: var(--text-sm);
    font-weight: 500;
    color: var(--text-secondary);
    margin: 0 0 var(--space-2) 0;
    letter-spacing: 0.01em;
  }

  .hint {
    font-family: var(--font-body);
    font-size: var(--text-xs);
    color: var(--text-tertiary);
    margin: 0;
    letter-spacing: 0.02em;
  }

  .arrow-hint {
    position: absolute;
    bottom: calc(var(--space-6) + 72px);
    right: calc(var(--space-4) + 64px);
    color: var(--accent-primary);
    opacity: 0.5;
    animation: arrow-float 2.5s var(--ease-smooth) infinite;
  }

  .arrow-path {
    stroke-dashoffset: 0;
    animation: dash 2.5s linear infinite;
  }

  @keyframes arrow-float {
    0%, 100% {
      transform: translate(0, 0);
      opacity: 0.5;
    }
    50% {
      transform: translate(6px, -6px);
      opacity: 0.8;
    }
  }

  @keyframes dash {
    to {
      stroke-dashoffset: -20;
    }
  }

  /* Reduced motion support */
  @media (prefers-reduced-motion: reduce) {
    .rect-1, .rect-2, .rect-3,
    .arrow-hint, .arrow-path {
      animation: none;
    }
  }
</style>
