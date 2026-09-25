<script lang="ts">
  import Button from '@/shared/components/ui/Button.svelte';
  import type { IconName } from '@/shared/components/ui/icons';

  export let label = 'Salvar';
  export let variant: 'primary' | 'secondary' | 'quiet' | 'danger' = 'secondary';
  export let disabled = false;
  export let icon: IconName | null = null;
</script>

<Button {variant} {disabled} {icon} on:click>{label}</Button>
