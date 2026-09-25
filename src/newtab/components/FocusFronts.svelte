<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { plural, t } from '@/lib/i18n';
  import type { Collection, Workspace } from '@/lib/types';
  import { INBOX_COLLECTION_ID } from '@/lib/types';
  import { advanceReason, type Front } from '@/lib/recommend/engine';
  import IconButton from '@/shared/components/ui/IconButton.svelte';
  import Menu from '@/shared/components/ui/Menu.svelte';
  import MenuItem from '@/shared/components/ui/MenuItem.svelte';
  import { collectionPath, reasonText } from '../next-up-labels';

  export let fronts: Front[];
  export let workspaces: Workspace[] = [];

  const dispatch = createEventDispatcher<{
    collectionFocus: { collection: Collection; value: boolean };
    collectionReference: { collection: Collection; value: boolean };
  }>();

  let openMenu: string | null = null;
  const anchors: Record<string, HTMLElement> = {};

  function markReference(collection: Collection): void {
    openMenu = null;
    dispatch('collectionReference', { collection, value: true });
  }
</script>

<section id="focus-fronts" class="focus-section" aria-labelledby="focus-fronts-title">
  <div class="focus-section-head">
    <h2 id="focus-fronts-title">{t('focus_fronts_title')}</h2>
  </div>
  {#if fronts.length === 0}
    <p class="focus-empty">{t('now_empty_title')}</p>
  {:else}
    <ul class="fronts">
      {#each fronts as front (front.collection.id)}
        {@const pinned = front.collection.focus === true}
        <li class="front">
          <span class="dot" style:--dot={front.collection.color ?? 'var(--text-tertiary)'} aria-hidden="true"></span>
          <span class="name">
            <span class="path">{collectionPath(front.collection, workspaces)}</span>
            <small>{reasonText(advanceReason(front))}</small>
          </span>
          <span class="count" title={plural(front.eligible.length, 'focus_front_count_one', 'focus_front_count_many')}>{front.eligible.length}</span>
          <IconButton
            icon={pinned ? 'pin-filled' : 'pin'}
            size="sm"
            label={pinned ? t('column_unpin_focus') : t('column_pin_focus')}
            pressed={pinned}
            on:click={() => dispatch('collectionFocus', { collection: front.collection, value: !pinned })}
          />
          {#if front.collection.id !== INBOX_COLLECTION_ID}
            <span class="anchor" bind:this={anchors[front.collection.id]}>
              <IconButton
                icon="more"
                size="sm"
                label={t('column_menu')}
                expanded={openMenu === front.collection.id}
                on:click={() => (openMenu = openMenu === front.collection.id ? null : front.collection.id)}
              />
              {#if openMenu === front.collection.id}
                <Menu label={t('column_menu')} align="end" anchor={anchors[front.collection.id]} on:close={() => (openMenu = null)}>
                  <MenuItem icon="reference" on:select={() => markReference(front.collection)}>{t('column_mark_reference')}</MenuItem>
                </Menu>
              {/if}
            </span>
          {:else}
            <span></span>
          {/if}
        </li>
      {/each}
    </ul>
  {/if}
</section>

<style>
  .fronts {
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .front {
    display: grid;
    grid-template-columns: 8px minmax(0, 1fr) auto 28px 28px;
    align-items: center;
    gap: 10px;
    padding: 10px 0;
    border-top: 1px solid var(--border-subtle);
  }

  .front:first-child {
    padding-top: 0;
    border-top: 0;
  }

  .dot {
    width: 8px;
    height: 8px;
    border-radius: 3px;
    background: var(--dot);
  }

  .name {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  .path {
    font: 550 13.5px / 1.3 var(--font-body);
    color: var(--text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  small {
    margin-top: 2px;
    font-size: 11.5px;
    color: var(--text-tertiary);
  }

  .count {
    font-size: var(--text-sm);
    color: var(--text-secondary);
    font-variant-numeric: tabular-nums;
  }

  .anchor {
    position: relative;
  }
</style>
