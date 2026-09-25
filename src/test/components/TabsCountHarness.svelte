<script lang="ts">
  import TabsSidebar from '@/newtab/components/TabsSidebar.svelte';

  export let expanded = false;
  let count = 0;
</script>

<TabsSidebar bind:expanded bind:count />
<output>{count}</output>
