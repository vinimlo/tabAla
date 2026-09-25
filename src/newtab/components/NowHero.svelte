<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { getCollectionDisplayName, t } from '@/lib/i18n';
  import type { Link } from '@/lib/types';
  import type { Recommendation } from '@/lib/recommend/engine';
  import { nextMonday, tomorrow } from '@/lib/recommend/dates';
  import { timeLeft } from '@/lib/recommend/time';
  import Button from '@/shared/components/ui/Button.svelte';
  import Icon from '@/shared/components/ui/Icon.svelte';
  import IconButton from '@/shared/components/ui/IconButton.svelte';
  import Menu from '@/shared/components/ui/Menu.svelte';
  import MenuItem from '@/shared/components/ui/MenuItem.svelte';
  import ProgressRing from '@/shared/components/ui/ProgressRing.svelte';
  import { ACTION_KEYS, CONTEXT_KEYS, CONTINUE_KEYS, DO_NOW_KEYS, reasonText, ringCaption, timeText } from '../next-up-labels';

  export let rec: Recommendation;
  /** Active time already spent on the link, in ms. */
  export let activeMs = 0;

  const dispatch = createEventDispatcher<{
    open: { link: Link; newTab: boolean };
    complete: Link;
    snooze: { link: Link; until: number };
    reference: Link;
    discard: Link;
    reveal: Link;
    dismissAsk: Link;
  }>();

  let menu: 'snooze' | 'more' | null = null;
  let snoozeAnchor: HTMLDivElement;
  let moreAnchor: HTMLDivElement;
  let failedIcon = false;

  $: asking = rec.reason.type === 'ask';
  $: askMinutes = rec.reason.type === 'ask' ? rec.reason.minutes : 0;
  $: time = timeLeft(activeMs, rec.effort);
  $: title = rec.link.title || rec.link.url;
  $: primaryLabel = rec.role === 'continue' ? t(CONTINUE_KEYS[rec.action]) : t(DO_NOW_KEYS[rec.action]);

  function open(event: MouseEvent): void {
    dispatch('open', { link: rec.link, newTab: event.metaKey || event.ctrlKey });
  }

  function toggle(name: 'snooze' | 'more'): void {
    menu = menu === name ? null : name;
  }

  function snooze(until: number): void {
    menu = null;
    dispatch('snooze', { link: rec.link, until });
  }

  function pick(event: 'reference' | 'reveal' | 'discard'): void {
    menu = null;
    dispatch(event, rec.link);
  }
</script>

<article class="hero" style:--collection={rec.collection.color ?? 'var(--text-tertiary)'}>
  <div class="orb" aria-hidden="true">
    <ProgressRing value={time.progress} size={104} />
    <span class="disc">
      {#if rec.link.favicon !== undefined && !failedIcon}
        <img src={rec.link.favicon} alt="" width="38" height="38" on:error={() => (failedIcon = true)} />
      {:else}
        <Icon name="globe" size={30} />
      {/if}
    </span>
    <span class="caption">{ringCaption(time, rec.effort)}</span>
  </div>

  <div class="body">
    <p class="context">
      <span class="dot"></span>
      <span>{t(CONTEXT_KEYS[rec.role], getCollectionDisplayName(rec.collection))}</span>
      {#if !asking}
        <span class="why">{reasonText(rec.reason)}</span>
      {/if}
    </p>
    <p class="instruction">
      <span class="verb">{t(ACTION_KEYS[rec.action])}</span>
      <span class="time">{timeText(time)}</span>
    </p>
    <button type="button" class="title" on:click={open}>
      <span>{title}</span>
      <Icon name="external" size={15} />
    </button>

    <div class="actions">
      {#if asking}
        <p class="question"><strong>{t('now_ask_question')}</strong> {t('now_ask_detail', askMinutes)}</p>
        <Button variant="primary" icon="check" on:click={() => dispatch('complete', rec.link)}>{t('nextup_ask_yes')}</Button>
        <Button on:click={() => dispatch('dismissAsk', rec.link)}>{t('nextup_ask_no')}</Button>
      {:else}
        <Button variant="primary" on:click={open}>{primaryLabel}</Button>
        <Button icon="check" on:click={() => dispatch('complete', rec.link)}>{t('progress_complete')}</Button>
      {/if}
      <span class="spacer"></span>
      <div class="anchor" bind:this={snoozeAnchor}>
        <IconButton icon="clock" label={t('progress_snooze')} expanded={menu === 'snooze'} on:click={() => toggle('snooze')} />
        {#if menu === 'snooze'}
          <Menu label={t('progress_snooze')} align="end" anchor={snoozeAnchor} on:close={() => (menu = null)}>
            <MenuItem on:select={() => snooze(tomorrow(Date.now()))}>{t('progress_snooze_tomorrow')}</MenuItem>
            <MenuItem on:select={() => snooze(nextMonday(Date.now()))}>{t('progress_snooze_next_week')}</MenuItem>
          </Menu>
        {/if}
      </div>
      <div class="anchor" bind:this={moreAnchor}>
        <IconButton icon="more" label={t('progress_more')} expanded={menu === 'more'} on:click={() => toggle('more')} />
        {#if menu === 'more'}
          <Menu label={t('progress_more')} align="end" anchor={moreAnchor} on:close={() => (menu = null)}>
            <MenuItem icon="reference" on:select={() => pick('reference')}>{t('progress_mark_reference')}</MenuItem>
            <MenuItem icon="eye" on:select={() => pick('reveal')}>{t('progress_reveal')}</MenuItem>
            <MenuItem icon="trash" danger on:select={() => pick('discard')}>{t('progress_discard')}</MenuItem>
          </Menu>
        {/if}
      </div>
    </div>
  </div>
</article>

<style>
  .hero {
    position: relative;
    display: grid;
    grid-template-columns: 104px minmax(0, 1fr);
    gap: var(--space-5);
    height: 100%;
    padding: var(--space-5) var(--space-5) 20px;
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-xl);
    background:
      radial-gradient(600px 220px at 0% 0%, color-mix(in srgb, var(--collection) 16%, transparent), transparent 70%),
      var(--surface-elevated);
    box-shadow: var(--shadow-lift);
  }

  .orb {
    position: relative;
    width: 104px;
    height: 104px;
  }

  .disc {
    position: absolute;
    inset: 9px;
    display: grid;
    place-items: center;
    border-radius: 50%;
    background: color-mix(in srgb, var(--collection) 18%, var(--surface-tile));
    color: var(--text-tertiary);
  }

  .disc img {
    border-radius: 9px;
    object-fit: contain;
  }

  .caption {
    position: absolute;
    top: calc(100% + 8px);
    left: -8px;
    right: -8px;
    text-align: center;
    font-size: var(--text-xs);
    color: var(--text-tertiary);
    font-variant-numeric: tabular-nums;
  }

  .body {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  .context {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    margin: 0;
    font-size: var(--text-xs);
    color: var(--text-secondary);
  }

  .dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: var(--collection);
  }

  .why {
    margin-left: auto;
    color: var(--text-tertiary);
    white-space: nowrap;
  }

  .instruction {
    display: flex;
    align-items: baseline;
    gap: 14px;
    margin: 12px 0 0;
  }

  .verb {
    font: 600 var(--text-display) / 0.9 var(--font-display);
    letter-spacing: -0.025em;
    color: var(--text-primary);
  }

  .time {
    font-size: 17px;
    color: var(--text-secondary);
  }

  .title {
    display: inline-flex;
    align-items: baseline;
    gap: 6px;
    max-width: 640px;
    margin-top: 10px;
    padding: 0;
    border: none;
    background: transparent;
    color: var(--text-primary);
    font: 500 19px / 1.35 var(--font-body);
    letter-spacing: -0.01em;
    text-align: left;
    cursor: pointer;
  }

  .title span {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    overflow-wrap: anywhere;
  }

  .title :global(svg) {
    color: var(--text-tertiary);
  }

  .title:hover span {
    text-decoration: underline;
    text-decoration-color: var(--border-strong);
    text-underline-offset: 3px;
  }

  .actions {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: var(--space-2);
    margin-top: auto;
    padding-top: 18px;
  }

  .question {
    margin: 0 var(--space-2) 0 0;
    font-size: 13.5px;
    color: var(--text-secondary);
  }

  .question strong {
    color: var(--text-primary);
    font-weight: 600;
  }

  .spacer {
    flex: 1;
  }

  .anchor {
    position: relative;
  }
</style>
