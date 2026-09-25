<script lang="ts">
  /** Share done, 0–1 (clamped). */
  export let value: number;
  export let size = 104;
  export let stroke = 3;

  $: radius = (size - stroke) / 2;
  $: circumference = 2 * Math.PI * radius;
  $: done = Math.min(1, Math.max(0, value));
</script>

<svg class="ring" width={size} height={size} viewBox="0 0 {size} {size}" aria-hidden="true">
  <circle class="track" cx={size / 2} cy={size / 2} r={radius} fill="none" stroke-width={stroke} />
  {#if done > 0}
    <circle
      class="value"
      cx={size / 2}
      cy={size / 2}
      r={radius}
      fill="none"
      stroke-width={stroke}
      stroke-linecap="round"
      stroke-dasharray={circumference}
      stroke-dashoffset={circumference * (1 - done)}
    />
  {/if}
</svg>

<style>
  .ring {
    display: block;
    transform: rotate(-90deg);
  }

  .track {
    stroke: var(--border-default);
  }

  .value {
    stroke: var(--accent-primary);
    transition: stroke-dashoffset var(--duration-normal) var(--ease-out);
  }
</style>
