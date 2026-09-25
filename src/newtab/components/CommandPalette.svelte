<script lang="ts">
  import { createEventDispatcher, onMount, tick } from 'svelte';
  import { formatRelativeTime, getCollectionDisplayName, t } from '@/lib/i18n';
  import type { Activity, Collection, Link, Workspace } from '@/lib/types';
  import { LINK_KINDS, linkKind, type LinkKind } from '@/lib/link-kind';
  import { buildIndex, search, type SearchHit } from '@/lib/search/engine';
  import { displayNames, hitPath, KIND_LABEL_KEYS } from '@/lib/search/labels';
  import { highlight } from '@/lib/search/highlight';
  import { normalizeWords } from '@/lib/search/text';
  import { extractDomain } from '@/lib/tabs';
  import type { TranslateQuery } from '@/lib/ai/translator';
  import type { Queue } from '@/lib/recommend/engine';
  import { defaultEffort } from '@/lib/recommend/effort';
  import { shortDate, tomorrow } from '@/lib/recommend/dates';
  import { recentlyOpened } from '@/lib/recommend/recent';
  import { timeLeft } from '@/lib/recommend/time';
  import Icon from '@/shared/components/ui/Icon.svelte';
  import IconButton from '@/shared/components/ui/IconButton.svelte';
  import Kbd from '@/shared/components/ui/Kbd.svelte';
  import LinkTile from '@/shared/components/ui/LinkTile.svelte';
  import Menu from '@/shared/components/ui/Menu.svelte';
  import MenuItem from '@/shared/components/ui/MenuItem.svelte';
  import { trapFocus } from '@/shared/focus-trap';
  import { altLabel, modLabel } from '@/shared/platform';
  import { KIND_ICONS } from '../card-meta';
  import { isCommandQuery, matchCommands, type Command, type CommandAction } from '../commands';
  import { ACTION_KEYS, collectionPath, timeText } from '../next-up-labels';
  import { linkActions, type PaletteActionId } from '../palette-actions';
  import PalettePreview from './PalettePreview.svelte';

  export let links: Link[] = [];
  export let collections: Collection[] = [];
  export let workspaces: Workspace[] = [];
  /** Shown with "nothing found" when topic search is off but available. */
  export let topicSearchHint = false;
  /** Translates the query into English; null keeps the search in the typed language. */
  export let translate: TranslateQuery | null = null;
  /** For the suggestions before typing and each link's time. */
  export let queue: Queue | null = null;
  export let activity: Activity = {};
  export let commands: Command[] = [];
  /** Room for the details pane; without it, the actions open in a menu. */
  export let wide = true;

  const dispatch = createEventDispatcher<{
    open: Link;
    openInNewTab: Link;
    reveal: Link;
    complete: Link;
    restore: Link;
    discard: Link;
    snooze: { link: Link; until: number };
    move: { link: Link; collectionId: string };
    command: CommandAction;
    close: void;
  }>();

  type LinkEntry = { kind: 'link'; key: string; link: Link; meta: string[]; hit?: SearchHit };
  type CommandEntry = { kind: 'command'; key: string; command: Command };
  type CollectionEntry = { kind: 'collection'; key: string; collection: Collection; path: string };
  type Entry = LinkEntry | CommandEntry | CollectionEntry;
  interface Group {
    id: string;
    label: string | null;
    entries: Entry[];
  }

  let query = '';
  let translatedQuery: string | null = null;
  let selectedKinds: LinkKind[] = [];
  let activeIndex = 0;
  /** Where the arrows act: the list, or the actions of the selected link. */
  let zone: 'list' | 'actions' = 'list';
  let actionIndex = 0;
  /** The link being moved: the list shows collections meanwhile. */
  let moving: Link | null = null;
  let savedQuery = '';
  let narrowMenu = false;
  let menuAnchor: HTMLElement | undefined;
  let input: HTMLInputElement;

  async function requestTranslation(current: string, translator: TranslateQuery | null): Promise<void> {
    translatedQuery = null;
    if (translator === null || current.trim() === '' || isCommandQuery(current)) {
      return;
    }
    const translated = await translator(current);
    if (current === query) {
      translatedQuery = translated;
    }
  }

  $: void requestTranslation(moving === null ? query : '', translate);

  $: index = buildIndex(links, collections, workspaces, displayNames);
  $: commandMode = isCommandQuery(query);
  $: typed = query.trim() !== '' && !commandMode;
  $: queries = translatedQuery === null ? [query] : [query, translatedQuery];
  $: result = search(index, queries.length === 1 ? query : queries, { kinds: selectedKinds });
  $: showingPartial = result.results.length === 0 && result.partial.length > 0;
  $: hits = showingPartial ? result.partial : result.results;
  $: chipKinds = LINK_KINDS.filter((kind) => (result.kindCounts[kind] ?? 0) > 0 || selectedKinds.includes(kind));
  $: totalCount = Object.values(result.kindCounts).reduce((sum, count) => sum + (count ?? 0), 0);
  $: collectionById = new Map(collections.map((collection) => [collection.id, collection]));
  $: groups = moving !== null
    ? moveGroups(moving, query, collections, workspaces)
    : typed
      ? resultGroups(hits, query, commands)
      : emptyGroups(commandMode, query, queue, activity, links, commands, collectionById);
  $: flat = groups.flatMap((group) => group.entries);
  $: if (activeIndex > Math.max(flat.length - 1, 0)) {
    activeIndex = Math.max(flat.length - 1, 0);
  }
  $: active = flat[activeIndex];
  $: activeLink = active?.kind === 'link' ? active.link : undefined;
  $: actions = activeLink === undefined ? [] : linkActions(activeLink);
  $: activeKind = activeLink === undefined ? 'page' : linkKind(activeLink.url);
  $: activeCollection = activeLink === undefined ? undefined : collectionById.get(activeLink.collectionId);
  $: activePath = active?.kind === 'link' && active.hit !== undefined
    ? hitPath(active.hit)
    : activeCollection === undefined ? '' : collectionPath(activeCollection, workspaces);
  $: activeEffort = activeLink === undefined ? 0 : (queue?.effortOf(activeLink) ?? defaultEffort(activeKind));

  function linkEntry(key: string, link: Link, meta: string[], hit?: SearchHit): LinkEntry {
    return { kind: 'link', key, link, meta: meta.filter((part) => part !== ''), hit };
  }

  function commandEntries(available: Command[], text: string, limit = Infinity): CommandEntry[] {
    return matchCommands(available, text).slice(0, limit).map((command) => ({ kind: 'command', key: `command-${command.id}`, command }));
  }

  function emptyGroups(
    onlyCommands: boolean, text: string, current: Queue | null, acts: Activity, all: Link[], available: Command[], byId: Map<string, Collection>,
  ): Group[] {
    const actionsGroup: Group = { id: 'actions', label: t('palette_group_actions'), entries: commandEntries(available, text) };
    if (onlyCommands) {
      return [actionsGroup].filter((group) => group.entries.length > 0);
    }
    const slots = current?.slots ?? [];
    const now = slots.map((rec) => linkEntry(`now-${rec.link.id}`, rec.link, [
      `${t(ACTION_KEYS[rec.action])}, ${timeText(timeLeft(acts[rec.link.id]?.activeMs ?? 0, rec.effort))}`,
      getCollectionDisplayName(rec.collection),
    ]));
    const recent = recentlyOpened(all, acts, new Set(slots.map((rec) => rec.link.id))).map((link) => {
      const collection = byId.get(link.collectionId);
      return linkEntry(`recent-${link.id}`, link, [
        formatRelativeTime(acts[link.id]?.lastOpenedAt ?? 0),
        collection === undefined ? '' : getCollectionDisplayName(collection),
      ]);
    });
    return [
      { id: 'now', label: t('now_title'), entries: now },
      { id: 'recent', label: t('palette_group_recent'), entries: recent },
      actionsGroup,
    ].filter((group) => group.entries.length > 0);
  }

  function resultGroups(found: SearchHit[], text: string, available: Command[]): Group[] {
    const results = found.map((hit) => linkEntry(`hit-${hit.link.id}`, hit.link, [
      hitPath(hit),
      t(KIND_LABEL_KEYS[hit.kind]),
      extractDomain(hit.link.url).replace(/^www\./, ''),
    ], hit));
    return [
      { id: 'results', label: null, entries: results },
      { id: 'actions', label: t('palette_group_actions'), entries: commandEntries(available, text, 3) },
    ].filter((group) => group.entries.length > 0);
  }

  function moveGroups(link: Link, text: string, all: Collection[], spaces: Workspace[]): Group[] {
    const words = normalizeWords(text);
    const entries: CollectionEntry[] = all
      .filter((collection) => collection.id !== link.collectionId)
      .map((collection) => ({ kind: 'collection' as const, key: `move-${collection.id}`, collection, path: collectionPath(collection, spaces) }))
      .filter((entry) => {
        const path = normalizeWords(entry.path);
        return words.every((word) => path.some((part) => part.startsWith(word)));
      });
    return [{ id: 'move', label: null, entries }];
  }

  function toggleKind(kind: LinkKind): void {
    selectedKinds = selectedKinds.includes(kind) ? selectedKinds.filter((k) => k !== kind) : [...selectedKinds, kind];
    activeIndex = 0;
  }

  function startMove(link: Link): void {
    moving = link;
    savedQuery = query;
    query = '';
    activeIndex = 0;
    zone = 'list';
    void tick().then(() => input.focus());
  }

  function endMove(): void {
    moving = null;
    query = savedQuery;
    activeIndex = 0;
  }

  function run(id: PaletteActionId, link: Link): void {
    zone = 'list';
    narrowMenu = false;
    if (id === 'open') {
      dispatch('open', link);
    } else if (id === 'complete') {
      dispatch('complete', link);
    } else if (id === 'restore') {
      dispatch('restore', link);
    } else if (id === 'snooze') {
      dispatch('snooze', { link, until: tomorrow(Date.now()) });
    } else if (id === 'move') {
      startMove(link);
    } else if (id === 'reveal') {
      dispatch('reveal', link);
    } else {
      dispatch('discard', link);
    }
  }

  function choose(entry: Entry | undefined, keys: { metaKey: boolean; ctrlKey: boolean; shiftKey: boolean; altKey: boolean }): void {
    if (entry === undefined) {
      return;
    }
    if (entry.kind === 'command') {
      dispatch('command', entry.command.action);
    } else if (entry.kind === 'collection') {
      if (moving !== null) {
        dispatch('move', { link: moving, collectionId: entry.collection.id });
        endMove();
      }
    } else if (keys.altKey) {
      run(entry.link.completedAt === undefined ? 'complete' : 'restore', entry.link);
    } else if (keys.shiftKey) {
      dispatch('reveal', entry.link);
    } else if (keys.metaKey || keys.ctrlKey) {
      dispatch('openInNewTab', entry.link);
    } else {
      dispatch('open', entry.link);
    }
  }

  function caretAtEnd(): boolean {
    return input.selectionStart === input.value.length && input.selectionEnd === input.value.length;
  }

  function handleKeydown(event: KeyboardEvent): void {
    if (zone === 'actions') {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        actionIndex = Math.min(actionIndex + 1, actions.length - 1);
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        actionIndex = Math.max(actionIndex - 1, 0);
      } else if (event.key === 'Enter') {
        event.preventDefault();
        if (activeLink !== undefined && actions[actionIndex] !== undefined) {
          run(actions[actionIndex].id, activeLink);
        }
      } else if (event.key === 'ArrowLeft' || event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        zone = 'list';
      }
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      activeIndex = Math.min(activeIndex + 1, Math.max(flat.length - 1, 0));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      activeIndex = Math.max(activeIndex - 1, 0);
    } else if (event.key === 'ArrowRight' && activeLink !== undefined && moving === null && caretAtEnd()) {
      event.preventDefault();
      if (wide) {
        zone = 'actions';
        actionIndex = 0;
      } else {
        narrowMenu = true;
      }
    } else if (event.key === 'Enter') {
      event.preventDefault();
      choose(active, event);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      if (moving !== null) {
        endMove();
      } else {
        dispatch('close');
      }
    }
  }

  onMount(() => {
    input.focus();
  });
</script>

<div class="layer">
  <button type="button" class="scrim" tabindex="-1" aria-hidden="true" aria-label={t('common_close')} on:click={() => dispatch('close')}></button>

  <div class="palette" class:split={wide && moving === null && activeLink !== undefined} role="dialog" aria-modal="true" aria-label={t('search_dialog_label')} use:trapFocus>
    <div class="field">
      <Icon name={moving === null ? 'search' : 'move'} size={20} />
      <input
        bind:this={input}
        bind:value={query}
        on:input={() => { activeIndex = 0; zone = 'list'; }}
        on:keydown={handleKeydown}
        type="text"
        placeholder={moving === null ? t('search_placeholder') : t('palette_move_placeholder', moving.title || moving.url)}
        role="combobox"
        aria-expanded="true"
        aria-controls="palette-list"
        aria-autocomplete="list"
        aria-activedescendant={flat.length > 0 ? `palette-option-${activeIndex}` : undefined}
      />
      <span class="scope">{t('search_scope_all')}</span>
    </div>

    {#if typed && moving === null && chipKinds.length > 0}
      <div class="filters">
        <button type="button" class="filter" aria-pressed={selectedKinds.length === 0} on:mousedown|preventDefault on:click={() => { selectedKinds = []; activeIndex = 0; }}>
          {t('palette_all')} <span class="count">{totalCount}</span>
        </button>
        {#each chipKinds as kind (kind)}
          <button type="button" class="filter" aria-pressed={selectedKinds.includes(kind)} on:mousedown|preventDefault on:click={() => toggleKind(kind)}>
            <Icon name={KIND_ICONS[kind]} size={14} />
            {t(KIND_LABEL_KEYS[kind])}
            <span class="count">{result.kindCounts[kind] ?? 0}</span>
          </button>
        {/each}
      </div>
    {/if}

    <div class="body">
      <div class="list-area">
        {#if typed && showingPartial && moving === null}
          <p class="note">{t('search_partial')}</p>
        {/if}

        <ul id="palette-list" class="list" role="listbox" aria-label={t('search_dialog_label')}>
          {#each groups as group (group.id)}
            <li role="presentation">
              {#if group.label !== null}
                <div class="group-label" id="palette-group-{group.id}">{group.label}</div>
              {/if}
              <ul role="group" aria-labelledby={group.label === null ? undefined : `palette-group-${group.id}`}>
                {#each group.entries as entry (entry.key)}
                  {@const position = flat.indexOf(entry)}
                  <li id="palette-option-{position}" role="option" aria-selected={position === activeIndex} class:active={position === activeIndex}>
                    <button
                      type="button"
                      class="hit"
                      tabindex="-1"
                      on:mousedown|preventDefault
                      on:click={(event) => choose(entry, event)}
                      on:mousemove={() => { activeIndex = position; }}
                    >
                      {#if entry.kind === 'link'}
                        <LinkTile link={entry.link} size={36} />
                        <span class="hit-body">
                          <span class="hit-title">
                            {#each highlight(entry.link.title || entry.link.url, typed ? queries : []) as segment, i (i)}{#if segment.match}<mark>{segment.text}</mark>{:else}{segment.text}{/if}{/each}
                          </span>
                          <span class="hit-meta">
                            {#if entry.link.completedAt !== undefined}
                              <span class="done"><Icon name="check" size={11} />{t('palette_completed_on', shortDate(entry.link.completedAt))}</span>
                            {/if}
                            {#each entry.meta as part, i (i)}<span>{part}</span>{/each}
                          </span>
                          {#if entry.hit !== undefined && entry.hit.tags.length > 0}
                            <span class="hit-tags">
                              {#each entry.hit.tags as tag (tag)}
                                <span class="hit-tag" class:matched={entry.hit.matchedTags.includes(tag)}>{tag}</span>
                              {/each}
                            </span>
                          {/if}
                        </span>
                      {:else if entry.kind === 'command'}
                        <span class="command-icon {entry.command.tone ?? ''}"><Icon name={entry.command.icon} size={17} /></span>
                        <span class="hit-body"><span class="hit-title">{entry.command.label}</span></span>
                        {#if entry.command.hint !== undefined}
                          <Kbd>{entry.command.hint}</Kbd>
                        {/if}
                      {:else}
                        <span class="command-icon"><Icon name="folder" size={17} /></span>
                        <span class="hit-body"><span class="hit-title">{entry.path}</span></span>
                      {/if}
                    </button>
                    {#if !wide && entry.kind === 'link' && position === activeIndex}
                      <span class="row-more" bind:this={menuAnchor}>
                        <IconButton icon="more" size="sm" label={t('progress_more')} expanded={narrowMenu} on:click={() => (narrowMenu = !narrowMenu)} />
                        {#if narrowMenu}
                          <Menu label={t('progress_more')} align="end" anchor={menuAnchor} on:close={() => (narrowMenu = false)}>
                            {#each actions as action (action.id)}
                              <MenuItem icon={action.icon} danger={action.danger === true} on:select={() => run(action.id, entry.link)}>{action.label}</MenuItem>
                            {/each}
                          </Menu>
                        {/if}
                      </span>
                    {/if}
                  </li>
                {/each}
              </ul>
            </li>
          {/each}
        </ul>

        {#if moving !== null && flat.length === 0}
          <p class="note">{t('palette_move_empty')}</p>
        {:else if typed && hits.length === 0 && moving === null}
          <p class="empty">{t('palette_empty', query.trim())}</p>
          {#if topicSearchHint}
            <p class="note">{t('search_enable_topic_hint')}</p>
          {/if}
        {/if}
      </div>

      {#if wide && moving === null && activeLink !== undefined}
        <PalettePreview
          link={activeLink}
          path={activePath}
          kind={activeKind}
          effort={activeEffort}
          openedAt={activity[activeLink.id]?.lastOpenedAt}
          tint={activeCollection?.color}
          {actions}
          activeAction={zone === 'actions' ? actionIndex : null}
          on:run={(event) => activeLink !== undefined && run(event.detail, activeLink)}
        />
      {/if}
    </div>

    <footer class="keys">
      <span><Kbd>↑</Kbd><Kbd>↓</Kbd> {t('palette_key_navigate')}</span>
      <span><Kbd>↵</Kbd> {t('palette_key_open')}</span>
      <span><Kbd>{modLabel()}</Kbd><Kbd>↵</Kbd> {t('palette_key_new_tab')}</span>
      <span><Kbd>{altLabel()}</Kbd><Kbd>↵</Kbd> {t('palette_key_complete')}</span>
      <span><Kbd>→</Kbd> {t('palette_key_actions')}</span>
      <span class="right"><Kbd>esc</Kbd> {t('palette_key_close')}</span>
    </footer>
  </div>
</div>

<style>
  .layer {
    position: fixed;
    inset: 0;
    z-index: 100;
    display: flex;
    justify-content: center;
    align-items: flex-start;
    padding: 84px var(--space-4) var(--space-4);
  }

  .scrim {
    position: absolute;
    inset: 0;
    border: none;
    background: var(--scrim);
    backdrop-filter: blur(6px) saturate(0.9);
    cursor: default;
  }

  .palette {
    position: relative;
    display: flex;
    flex-direction: column;
    width: min(680px, 100%);
    max-height: calc(100vh - 120px);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-xl);
    background: var(--surface-elevated);
    box-shadow: var(--shadow-float);
    overflow: hidden;
  }

  .palette.split {
    width: min(820px, 100%);
  }

  .field {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    height: 62px;
    padding: 0 18px 0 20px;
    border-bottom: 1px solid var(--border-subtle);
    color: var(--text-tertiary);
  }

  input {
    flex: 1;
    min-width: 0;
    border: none;
    background: transparent;
    color: var(--text-primary);
    font: 400 19px / 1 var(--font-body);
    letter-spacing: -0.01em;
    caret-color: var(--accent-primary);
  }

  input:focus {
    outline: none;
  }

  input::placeholder {
    color: var(--text-tertiary);
  }

  .scope {
    height: 26px;
    padding: 0 10px;
    border: 1px solid var(--border-default);
    border-radius: 13px;
    background: var(--surface-overlay);
    color: var(--text-secondary);
    font-size: var(--text-xs);
    line-height: 24px;
    white-space: nowrap;
  }

  .filters {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    padding: 10px 14px 2px;
  }

  .filter {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: var(--control-sm);
    padding: 0 10px;
    border: none;
    border-radius: var(--radius-sm);
    background: transparent;
    color: var(--text-secondary);
    font: 400 12.5px / 1 var(--font-body);
    cursor: pointer;
  }

  .filter:hover {
    color: var(--text-primary);
  }

  .filter[aria-pressed='true'] {
    background: var(--surface-overlay);
    color: var(--text-primary);
    box-shadow: inset 0 0 0 1px var(--border-default);
  }

  .count {
    color: var(--text-tertiary);
    font-variant-numeric: tabular-nums;
  }

  .body {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    min-height: 0;
    overflow: hidden;
  }

  .split .body {
    grid-template-columns: minmax(0, 1fr) 300px;
  }

  .list-area {
    min-height: 0;
    overflow-y: auto;
    padding: 6px var(--space-2) 10px;
  }

  .list,
  .list ul {
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .group-label {
    padding: 12px 12px 6px;
    font: 600 var(--text-xs) / 1 var(--font-body);
    color: var(--text-tertiary);
  }

  li[role='option'] {
    position: relative;
    border-radius: 12px;
  }

  li[role='option'].active {
    background: var(--surface-overlay);
    box-shadow: inset 0 0 0 1px var(--border-default);
  }

  .hit {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    width: 100%;
    padding: 8px 12px;
    border: none;
    background: transparent;
    color: inherit;
    font: inherit;
    text-align: left;
    cursor: pointer;
  }

  .hit-body {
    display: flex;
    flex: 1;
    flex-direction: column;
    min-width: 0;
  }

  .hit-title {
    font: 500 var(--text-base) / 1.35 var(--font-body);
    color: var(--text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  mark {
    padding: 0 1px;
    border-radius: 3px;
    background: color-mix(in srgb, var(--accent-primary) 22%, transparent);
    color: var(--text-primary);
  }

  .hit-meta,
  .hit-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    margin-top: 2px;
    font-size: var(--text-xs);
    color: var(--text-tertiary);
  }

  .done {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    color: var(--semantic-success);
  }

  .hit-tag {
    padding: 0 6px;
    border-radius: var(--radius-full);
    background: var(--surface-overlay);
  }

  .hit-tag.matched {
    background: var(--accent-soft);
    color: var(--text-primary);
  }

  .command-icon {
    display: grid;
    place-items: center;
    flex-shrink: 0;
    width: 36px;
    height: 36px;
    border-radius: 10px;
    background: var(--surface-tile);
    color: var(--text-secondary);
  }

  .command-icon.warning {
    color: var(--semantic-warning);
  }

  .command-icon.accent {
    color: var(--accent-primary);
  }

  .row-more {
    position: absolute;
    top: 50%;
    right: 8px;
    transform: translateY(-50%);
  }

  .note,
  .empty {
    margin: var(--space-3) 12px 0;
    font-size: var(--text-xs);
    color: var(--text-tertiary);
  }

  .empty {
    font-size: var(--text-sm);
    color: var(--text-secondary);
  }

  .keys {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 18px;
    min-height: 42px;
    padding: 0 20px;
    border-top: 1px solid var(--border-subtle);
    font-size: var(--text-xs);
    color: var(--text-tertiary);
  }

  .keys span {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }

  .keys .right {
    margin-left: auto;
  }
</style>
