<script lang="ts">
  import Icon from './Icon.svelte';

  export let link: { favicon?: string };
  export let size: 32 | 36 | 56 = 36;
  /** Collection color that tints the tile. */
  export let tint: string | undefined = undefined;

  /** A favicon that failed to load; a new one is tried again. */
  let failed: string | undefined;

  $: src = link.favicon !== undefined && link.favicon !== failed ? link.favicon : undefined;
  $: glyph = size === 56 ? 26 : size === 36 ? 18 : 17;
</script>

<span class="tile" class:tinted={tint !== undefined} style:--tile-size="{size}px" style:--tint={tint}>
  {#if src !== undefined}
    <img {src} alt="" width={glyph} height={glyph} loading="lazy" on:error={() => (failed = src)} />
  {:else}
    <Icon name="globe" size={glyph} />
  {/if}
</span>

<style>
  .tile {
    display: grid;
    place-items: center;
    flex-shrink: 0;
    width: var(--tile-size);
    height: var(--tile-size);
    border-radius: calc(var(--tile-size) * 0.28);
    background: var(--surface-tile);
    color: var(--text-tertiary);
  }

  .tinted {
    background: color-mix(in srgb, var(--tint) 20%, var(--surface-tile));
  }

  img {
    border-radius: 4px;
    object-fit: contain;
  }
</style>
