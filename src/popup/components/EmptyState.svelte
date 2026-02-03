<script lang="ts">
  export let message: string = 'Nenhum link salvo ainda';
  export let hint: string = 'Salve sua primeira aba';
</script>

<div class="empty-state">
  <svg class="icon" width="48" height="48" viewBox="0 0 24 24" fill="currentColor">
    <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zm-7-2h2v-4h4v-2h-4V7h-2v4H8v2h4z" opacity="0.4"/>
  </svg>
  <p class="message">{message}</p>
  <p class="hint">{hint}</p>
</div>

<style>
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 48px 24px;
    text-align: center;
  }

  .icon {
    color: #ccc;
    margin-bottom: 16px;
  }

  .message {
    font-size: 16px;
    font-weight: 500;
    color: #666;
    margin: 0 0 8px 0;
  }

  .hint {
    font-size: 14px;
    color: #999;
    margin: 0;
  }
</style>
