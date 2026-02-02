<script lang="ts">
  import type { Link } from '@/lib/types';

  let links: Link[] = [];
  let title = 'TabAla';

  function handleAddLink(): void {
    const newLink: Link = {
      id: crypto.randomUUID(),
      url: 'https://example.com',
      title: 'Example',
      collectionId: 'inbox',
      createdAt: Date.now()
    };
    links = [...links, newLink];
  }
</script>

<main>
  <h1>{title}</h1>
  <p>Links: {links.length}</p>
  <button on:click={handleAddLink}>Add Link</button>
</main>

<style>
  main {
    padding: 1rem;
  }
</style>
