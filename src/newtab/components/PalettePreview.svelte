<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { formatRelativeTime, t } from '@/lib/i18n';
  import type { Link } from '@/lib/types';
  import type { LinkKind } from '@/lib/link-kind';
  import { shortDate } from '@/lib/recommend/dates';
  import { KIND_LABEL_KEYS } from '@/lib/search/labels';
  import Icon from '@/shared/components/ui/Icon.svelte';
  import Kbd from '@/shared/components/ui/Kbd.svelte';
  import LinkTile from '@/shared/components/ui/LinkTile.svelte';
  import type { PaletteAction, PaletteActionId } from '../palette-actions';

  export let link: Link;
  export let path: string;
  export let kind: LinkKind;
  /** Minutes. */
  export let effort: number;
  export let openedAt: number | undefined = undefined;
  export let tint: string | undefined = undefined;
  export let actions: PaletteAction[];
  /** The action the keyboard is on, or null while the list has the keyboard. */
  export let activeAction: number | null = null;

  const dispatch = createEventDispatcher<{ run: PaletteActionId }>();

  $: address = link.url.replace(/^[a-z]+:\/\//, '');
</script>

<aside class="preview" aria-label={t('palette_preview_label')}>
  <LinkTile {link} size={56} {tint} />
  <h4>{link.title || link.url}</h4>
  <p class="url">{address}</p>
  <dl class="facts">
    <dt>{t('palette_fact_collection')}</dt>
    <dd>{path}</dd>
    <dt>{t('palette_fact_kind')}</dt>
    <dd>{t('palette_kind_effort', t(KIND_LABEL_KEYS[kind]), effort)}</dd>
    <dt>{t('palette_fact_saved')}</dt>
    <dd>{shortDate(link.createdAt)}</dd>
    <dt>{t('palette_fact_opened')}</dt>
    <dd>{openedAt === undefined ? t('palette_never') : formatRelativeTime(openedAt)}</dd>
  </dl>
  <div class="actions">
    {#each actions as action, index (action.id)}
      <button
        type="button"
        class="action"
        class:current={activeAction === index}
        class:danger={action.danger === true}
        tabindex="-1"
        on:mousedown|preventDefault
        on:click={() => dispatch('run', action.id)}
      >
        <Icon name={action.icon} size={15} />
        <span class="label">{action.label}</span>
        {#if action.keys.length > 0}
          <span class="keys">{#each action.keys as key (key)}<Kbd>{key}</Kbd>{/each}</span>
        {/if}
      </button>
    {/each}
  </div>
</aside>

<style>
  .preview {
    display: flex;
    flex-direction: column;
    min-width: 0;
    padding: 22px 20px;
    border-left: 1px solid var(--border-subtle);
    background: color-mix(in srgb, var(--surface-base) 35%, var(--surface-elevated));
  }

  h4 {
    margin: var(--space-4) 0 4px;
    font: 600 17px / 1.3 var(--font-body);
    letter-spacing: -0.01em;
    color: var(--text-primary);
    overflow-wrap: anywhere;
  }

  .url {
    margin: 0;
    font-size: var(--text-xs);
    color: var(--text-tertiary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .facts {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: var(--space-2) 14px;
    margin: var(--space-4) 0;
    font-size: 12.5px;
  }

  dt {
    color: var(--text-tertiary);
  }

  dd {
    margin: 0;
    color: var(--text-primary);
    overflow-wrap: anywhere;
  }

  .actions {
    display: flex;
    flex-direction: column;
    gap: 2px;
    margin-top: auto;
  }

  .action {
    display: flex;
    align-items: center;
    gap: 10px;
    height: var(--control-md);
    padding: 0 10px;
    border: none;
    border-radius: 9px;
    background: transparent;
    color: var(--text-primary);
    font: 500 var(--text-sm) / 1 var(--font-body);
    text-align: left;
    cursor: pointer;
  }

  .action :global(svg) {
    color: var(--text-secondary);
  }

  .action:hover,
  .action.current {
    background: var(--surface-overlay);
    box-shadow: inset 0 0 0 1px var(--border-default);
  }

  .action.danger,
  .action.danger :global(svg) {
    color: var(--semantic-error);
  }

  .label {
    flex: 1;
  }

  .keys {
    display: flex;
    gap: 3px;
  }
</style>
