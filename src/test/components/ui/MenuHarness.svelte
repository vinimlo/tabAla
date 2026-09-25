<script lang="ts">
  import Menu from '@/shared/components/ui/Menu.svelte';
  import MenuItem from '@/shared/components/ui/MenuItem.svelte';

  let open = false;
  let anchor: HTMLDivElement;
</script>

<div class="anchor" bind:this={anchor}>
  <button type="button" on:click={() => (open = !open)}>Abrir menu</button>
  {#if open}
    <Menu label="Ações" {anchor} on:close={() => (open = false)}>
      <MenuItem icon="clock" on:select>Amanhã</MenuItem>
      <MenuItem danger on:select>Descartar</MenuItem>
    </Menu>
  {/if}
</div>
<button type="button">Fora</button>
