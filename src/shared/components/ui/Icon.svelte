<script lang="ts">
  import { ICONS, type IconName } from './icons';

  export let name: IconName;
  export let size = 16;
  /** Stroke width on the 24-unit grid. */
  export let stroke = 2;
</script>

<svg class="icon" width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
  {#each ICONS[name] as shape (shape.d)}
    <path
      d={shape.d}
      fill={shape.fill === true ? 'currentColor' : 'none'}
      stroke={shape.fill === true ? 'none' : 'currentColor'}
      stroke-width={stroke}
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  {/each}
</svg>

<style>
  .icon {
    display: block;
    flex-shrink: 0;
  }
</style>
