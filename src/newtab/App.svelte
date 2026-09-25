<script lang="ts">
  import { onDestroy, onMount, tick } from 'svelte';
  import { t, getCollectionDisplayName, getWorkspaceDisplayName } from '@lib/i18n';
  import './app.css';
  import { linksStore, linksByCollection } from '@/lib/stores/links';
  import { settingsStore } from '@/lib/stores/settings';
  import { workspacesStore, collectionsByActiveWorkspace, activeWorkspace } from '@/lib/stores/workspaces';
  import type { BrowserTab, TabGroup } from '@/lib/tabs';
  import KanbanBoard from './components/KanbanBoard.svelte';
  import TabsSidebar from './components/TabsSidebar.svelte';
  import WorkspaceRail from './components/WorkspaceRail.svelte';
  import Toast from '@/shared/components/Toast.svelte';
  import ConfirmDialog from '@/shared/components/ConfirmDialog.svelte';
  import SettingsModal from './components/SettingsModal.svelte';
  import CreateCollectionModal from '@/shared/components/CreateCollectionModal.svelte';
  import OnboardingWizard from './components/OnboardingWizard.svelte';
  import type { Collection, Link } from '@/lib/types';
  import { openLinkInCurrentTab, openLinkInNewTab } from '@/lib/tabs';
  import CommandPalette from './components/CommandPalette.svelte';
  import { buildCommands, type CommandAction } from './commands';
  import AppHeader from './components/AppHeader.svelte';
  import { pendingSummary } from './header';
  import { cardMeta, type CardMeta } from './card-meta';
  import { activityOf } from '@/lib/recommend/triage';
  import { isReference, isSnoozed } from '@/lib/recommend/state';
  import { linkKind } from '@/lib/link-kind';
  import { dashboardShortcut } from './shortcuts';
  import { revealLink, workspaceForLink } from './reveal';
  import { createQueryTranslator, getTranslationAvailability } from '@/lib/ai/translator';
  import NowSection from './components/NowSection.svelte';
  import TriageOverlay from './components/TriageOverlay.svelte';
  import SessionPill from './components/SessionPill.svelte';
  import { sessionStore } from '@/lib/stores/session';
  import { sessionView, startSession, type SessionMinutes } from '@/lib/recommend/session';
  import FocusView from './components/FocusView.svelte';
  import { activityStore } from '@/lib/stores/activity';
  import * as progress from '@/lib/stores/progress';
  import { buildQueue, type Queue } from '@/lib/recommend/engine';
  import { sameDayNow, shownReport, stripOnScreen } from './next-up-report';

  let onboardingDismissed = false;
  let errorMessage: string | null = null;
  let successMessage: string | null = null;
  let showSettings = false;
  let showCreateCollection = false;
  let linkToRemove: { id: string; title: string } | null = null;
  let tabsOpen = false;
  /** Open tabs in this window, counted by the tabs panel for the rail badge. */
  let openTabs = 0;
  let collectionFromGroup: { name: string; tabs: BrowserTab[] } | null = null;
  let showSearch = false;
  let showTriage = false;
  let innerWidth = 1440;
  const translateQuery = createQueryTranslator();
  let translationAvailable = false;
  /** Moves to the new day when the page is shown again or the clock passes midnight. */
  let now = Date.now();
  /** A background dashboard tab never records what its strip "showed". */
  let visible = true;
  let dayTimer: ReturnType<typeof setInterval> | undefined;
  let lastShownReport = '';
  let view: 'board' | 'focus' = 'board';

  async function openFocus(section: 'triage' | 'completed' | null): Promise<void> {
    view = 'focus';
    if (section !== null) {
      await tick();
      document.getElementById(`focus-${section}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  $: showOnboarding = !onboardingDismissed && !$settingsStore.loading && !$settingsStore.settings.onboardingCompleted;
  $: loading = $linksStore.loading || $workspacesStore.loading;
  $: error = $linksStore.error ?? $workspacesStore.error;
  $: collections = $collectionsByActiveWorkspace;
  $: summary = pendingSummary($linksStore.links, collections);
  $: currentWorkspace = $activeWorkspace;

  $: queue = buildQueue({
    links: $linksStore.links,
    collections: $linksStore.collections,
    activity: $activityStore.activity,
    now,
  });

  /** Ticks every 30 s while a session runs, for the time left. */
  let clock = Date.now();
  let clockTimer: ReturnType<typeof setInterval> | undefined;

  $: session = $sessionStore.session;
  $: currentSession = session === null ? null : sessionView(session, $linksStore.links, queue, $linksStore.collections, clock);

  async function beginSession(minutes: SessionMinutes): Promise<void> {
    clock = Date.now();
    await sessionStore.start(startSession(queue, minutes, clock));
    view = 'board';
  }

  async function endSession(): Promise<void> {
    await sessionStore.end();
  }
  $: triageReasons = new Map(queue.triage.map((item) => [item.link.id, item.reason]));
  $: collectionById = new Map($linksStore.collections.map((collection) => [collection.id, collection]));
  $: cardMetas = new Map($linksStore.links.map((link): [string, CardMeta] => [link.id, cardMeta({
    link,
    reference: isReference(link, collectionById.get(link.collectionId)),
    snoozed: isSnoozed(link, now),
    triage: triageReasons.get(link.id),
    activity: activityOf($activityStore.activity, link.id),
    kind: linkKind(link.url),
    effort: queue.effortOf(link),
    now,
  })]));

  /** The theme on screen ("system" resolved). */
  function currentTheme(): 'light' | 'dark' {
    return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
  }

  $: commands = showSearch
    ? buildCommands({
      triageCount: queue.triage.length,
      sessionActive: session !== null,
      view,
      workspaces: $workspacesStore.workspaces
        .filter((workspace) => workspace.id !== $workspacesStore.activeWorkspaceId)
        .map((workspace) => ({ id: workspace.id, name: getWorkspaceDisplayName(workspace) })),
      theme: currentTheme(),
      showNow: $settingsStore.settings.showNextUp,
    })
    : [];

  async function handleCommand(event: CustomEvent<CommandAction>): Promise<void> {
    showSearch = false;
    const action = event.detail;
    if (action.type === 'triage') {
      showTriage = true;
    } else if (action.type === 'startSession') {
      await beginSession(action.minutes);
    } else if (action.type === 'endSession') {
      await endSession();
    } else if (action.type === 'view') {
      if (action.view === 'focus') {
        await openFocus(null);
      } else {
        view = 'board';
      }
    } else if (action.type === 'newCollection') {
      showCreateCollection = true;
    } else if (action.type === 'workspace') {
      workspacesStore.setActiveWorkspace(action.id);
      view = 'board';
    } else if (action.type === 'theme') {
      await settingsStore.setTheme(action.theme);
    } else if (action.type === 'toggleNow') {
      await settingsStore.setShowNextUp(action.show);
    } else {
      showSettings = true;
    }
  }

  async function handleMove(event: CustomEvent<{ link: Link; collectionId: string }>): Promise<void> {
    const { link, collectionId } = event.detail;
    await linksStore.moveLink(link.id, collectionId);
    const target = $linksStore.collections.find((collection) => collection.id === collectionId);
    successMessage = t('success_link_moved', target === undefined ? '' : getCollectionDisplayName(target));
  }
  $: nextUpOnScreen = stripOnScreen({
    loading: loading || $settingsStore.loading || $activityStore.loading,
    visible,
    view,
    showNextUp: $settingsStore.settings.showNextUp,
    collapsed: $settingsStore.settings.nextUpCollapsed,
  });
  $: if (nextUpOnScreen) {
    reportShown(queue);
  }

  /** Records what the strip shows, once per distinct set of cards per day. */
  function reportShown(current: Queue): void {
    const report = shownReport(current, now);
    if (report.key === lastShownReport) {
      return;
    }
    lastShownReport = report.key;
    void activityStore.recordShown(report.shown, report.skipped, current.size, now);
  }

  function refreshDay(): void {
    visible = document.visibilityState === 'visible';
    now = sameDayNow(now, Date.now());
  }

  onMount(async () => {
    await Promise.all([
      workspacesStore.load(),
      linksStore.load(),
      settingsStore.load(),
      activityStore.load(),
      sessionStore.load(),
    ]);
    refreshDay();
    document.addEventListener('visibilitychange', refreshDay);
    dayTimer = setInterval(refreshDay, 60_000);
    clockTimer = setInterval(() => {
      if (session !== null) {
        clock = Date.now();
      }
    }, 30_000);
    translationAvailable = (await getTranslationAvailability()) !== 'unavailable';
  });

  onDestroy(() => {
    clearInterval(clockTimer);
    clearTimeout(justCompletedTimer);
    document.removeEventListener('visibilitychange', refreshDay);
    clearInterval(dayTimer);
  });

  async function handleCreateCollection(event: CustomEvent<string>): Promise<void> {
    const name = event.detail;
    try {
      const newCollection = await linksStore.addCollection(name, $workspacesStore.activeWorkspaceId);

      // If creating from a tab group, save all tabs as links
      if (collectionFromGroup !== null) {
        for (const tab of collectionFromGroup.tabs) {
          await linksStore.addLink({
            url: tab.url,
            title: tab.title,
            favicon: tab.favicon,
            collectionId: newCollection.id,
          });
        }
        collectionFromGroup = null;
      }

      successMessage = t('success_collection_created', name);
      showCreateCollection = false;
    } catch (err) {
      errorMessage = err instanceof Error ? err.message : t('error_create_collection_failed');
      collectionFromGroup = null;
    }
  }

  function handleCreateCollectionFromGroup(event: CustomEvent<{ group: TabGroup; tabs: BrowserTab[] }>): void {
    const { group, tabs } = event.detail;
    collectionFromGroup = {
      name: group.title || t('tabs_sidebar_unnamed_group'),
      tabs,
    };
    showCreateCollection = true;
  }

  function handleRemoveLink(event: CustomEvent<{ id: string; title: string }>): void {
    linkToRemove = event.detail;
  }

  async function confirmRemoveLink(): Promise<void> {
    if (linkToRemove === null) {
      return;
    }

    try {
      await linksStore.removeLink(linkToRemove.id);
      successMessage = t('success_link_removed');
    } catch (_err) {
      errorMessage = t('error_remove_link_failed');
    }
    linkToRemove = null;
  }

  function cancelRemoveLink(): void {
    linkToRemove = null;
  }

  function handleError(event: CustomEvent<string>): void {
    errorMessage = event.detail;
  }

  function handleSuccess(event: CustomEvent<string>): void {
    successMessage = event.detail;
  }

  async function handleTabDrop(event: CustomEvent<{ url: string; title: string; favicon?: string; collectionId: string }>): Promise<void> {
    const detail = event.detail;

    try {
      await linksStore.addLink(detail);

      const col = collections.find(c => c.id === detail.collectionId);
      const collectionName = col ? getCollectionDisplayName(col) : 'collection';
      successMessage = t('success_link_saved_to', collectionName);
    } catch (_err) {
      errorMessage = t('error_save_link_failed');
    }
  }

  /** Every open from the dashboard is recorded first: opening in this tab leaves the page. */
  async function openLink(link: Link, newTab: boolean): Promise<void> {
    await progress.recordOpen(link);
    const result = newTab ? await openLinkInNewTab(link.url) : await openLinkInCurrentTab(link.url);
    if (!result.success) {
      errorMessage = result.error ?? t('error_open_link_failed');
    }
  }

  async function revealOnBoard(link: Link): Promise<void> {
    view = 'board';
    workspacesStore.setActiveWorkspace(
      workspaceForLink(link, $linksStore.collections, $workspacesStore.activeWorkspaceId)
    );
    await revealLink(link.id);
  }

  async function handleSearchOpen(event: CustomEvent<Link>): Promise<void> {
    showSearch = false;
    await openLink(event.detail, false);
  }

  async function handleSearchOpenInNewTab(event: CustomEvent<Link>): Promise<void> {
    await openLink(event.detail, true);
  }

  async function handleSearchReveal(event: CustomEvent<Link>): Promise<void> {
    showSearch = false;
    const link = event.detail;
    if (link.completedAt !== undefined) {
      view = 'focus';
      await revealLink(link.id);
      return;
    }
    await revealOnBoard(link);
  }

  function handleOpen(event: CustomEvent<{ link: Link; newTab: boolean }>): void {
    void openLink(event.detail.link, event.detail.newTab);
  }

  async function handleComplete(event: CustomEvent<Link>): Promise<void> {
    await progress.completeLink(event.detail);
    successMessage = t('success_link_completed');
    if (session !== null) {
      await sessionStore.markCompleted(event.detail.id, true);
    }
  }

  async function handleSnooze(event: CustomEvent<{ link: Link; until: number }>): Promise<void> {
    await progress.snoozeLink(event.detail.link, event.detail.until);
    successMessage = t('success_link_snoozed');
  }

  async function handleMarkReference(event: CustomEvent<Link>): Promise<void> {
    await progress.setLinkReference(event.detail, true);
    successMessage = t('success_link_reference');
  }

  /** The last discarded link, while its toast offers Undo. */
  let lastDiscarded: Link | null = null;

  /** The link just completed from Now, while its Undo row shows. */
  let justCompleted: Link | null = null;
  let justCompletedTimer: ReturnType<typeof setTimeout> | undefined;

  async function handleNowComplete(event: CustomEvent<Link>): Promise<void> {
    await progress.completeLink(event.detail);
    justCompleted = event.detail;
    clearTimeout(justCompletedTimer);
    justCompletedTimer = setTimeout(() => (justCompleted = null), 10_000);
    if (session !== null) {
      await sessionStore.markCompleted(event.detail.id, true);
    }
  }

  async function handleUndoComplete(event: CustomEvent<Link>): Promise<void> {
    clearTimeout(justCompletedTimer);
    justCompleted = null;
    await progress.restoreLink(event.detail);
    if (session !== null) {
      await sessionStore.markCompleted(event.detail.id, false);
    }
  }

  async function handleDiscard(event: CustomEvent<Link>): Promise<void> {
    await progress.discardLink(event.detail);
    lastDiscarded = event.detail;
    successMessage = t('success_link_removed');
  }

  function closeSuccessToast(): void {
    successMessage = null;
    lastDiscarded = null;
  }

  function undoDiscard(): void {
    if (lastDiscarded !== null) {
      void progress.undoDiscard(lastDiscarded);
    }
  }

  async function handleReveal(event: CustomEvent<Link>): Promise<void> {
    await revealOnBoard(event.detail);
  }

  async function handleDismissAsk(event: CustomEvent<Link>): Promise<void> {
    await progress.dismissAsk(event.detail);
  }

  async function handleKeep(event: CustomEvent<Link>): Promise<void> {
    await progress.keepLink(event.detail);
  }

  async function handleRestore(event: CustomEvent<Link>): Promise<void> {
    await progress.restoreLink(event.detail);
    successMessage = t('success_link_restored');
    if (session !== null) {
      await sessionStore.markCompleted(event.detail.id, false);
    }
  }

  async function handleCollectionFocus(event: CustomEvent<{ collection: Collection; value: boolean }>): Promise<void> {
    await progress.setCollectionFocus(event.detail.collection, event.detail.value);
  }

  async function handleCollectionReference(event: CustomEvent<{ collection: Collection; value: boolean }>): Promise<void> {
    await progress.setCollectionReference(event.detail.collection, event.detail.value);
  }

  function handleKeydown(event: KeyboardEvent): void {
    if (showOnboarding) { return; }

    const action = dashboardShortcut(event, showSearch || showTriage);
    if (action === 'closeAll') {
      showSettings = false;
      showCreateCollection = false;
      linkToRemove = null;
      collectionFromGroup = null;
      return;
    }
    if (action !== null) {
      event.preventDefault();
    }
    if (action === 'openSearch') {
      showSearch = true;
    } else if (action === 'closeLayer') {
      showSearch = false;
      showTriage = false;
    } else if (action === 'newCollection') {
      showCreateCollection = true;
    } else if (action === 'toggleSidebar') {
      tabsOpen = !tabsOpen;
    } else if (action === 'toggleFocus') {
      if (view === 'focus') {
        view = 'board';
      } else {
        void openFocus(null);
      }
    }
  }
</script>

<svelte:window on:keydown={handleKeydown} bind:innerWidth />

<main class="dashboard">
  <WorkspaceRail
    {view}
    {tabsOpen}
    tabCount={openTabs}
    on:focus={() => openFocus(null)}
    on:board={() => (view = 'board')}
    on:toggleTabs={() => (tabsOpen = !tabsOpen)}
    on:openSettings={() => (showSettings = true)}
    on:error={(e) => errorMessage = e.detail}
    on:success={(e) => successMessage = e.detail}
  />

  <TabsSidebar
    bind:expanded={tabsOpen}
    bind:count={openTabs}
    on:createCollectionFromGroup={handleCreateCollectionFromGroup}
  />

  <div class="main-content">
    {#if loading}
      <div class="loading">
        <div class="spinner"></div>
        <span>{t('common_loading')}</span>
      </div>
    {:else if error}
      <div class="error-state">
        <p>{t('newtab_error_loading')}</p>
        <button type="button" on:click={() => linksStore.load()}>{t('common_try_again')}</button>
      </div>
    {:else}
      <AppHeader
        title={view === 'board' ? (currentWorkspace !== undefined ? getWorkspaceDisplayName(currentWorkspace) : '') : null}
        summary={view === 'board' ? summary : null}
        on:openSearch={() => (showSearch = true)}
        on:newCollection={() => (showCreateCollection = true)}
      >
        <svelte:fragment slot="session">
          {#if currentSession !== null}
            <SessionPill view={currentSession} on:open={() => openFocus(null)} on:dismiss={endSession} />
          {/if}
        </svelte:fragment>
      </AppHeader>

      {#if view === 'focus'}
        <FocusView
          {queue}
          links={$linksStore.links}
          stats={$activityStore.stats}
          {now}
          workspaces={$workspacesStore.workspaces}
          on:open={handleOpen}
          on:complete={handleComplete}
          on:keep={handleKeep}
          on:discard={handleDiscard}
          on:reference={handleMarkReference}
          on:restore={handleRestore}
          on:collectionFocus={handleCollectionFocus}
          on:collectionReference={handleCollectionReference}
          session={currentSession}
          on:start={(e) => beginSession(e.detail)}
          on:end={endSession}
          on:openTriage={() => (showTriage = true)}
        />
      {:else}
        {#if $settingsStore.settings.showNextUp}
          <NowSection
            {queue}
            links={$linksStore.links}
            activity={$activityStore.activity}
            {now}
            collapsed={$settingsStore.settings.nextUpCollapsed}
            {justCompleted}
            session={currentSession}
            on:open={handleOpen}
            on:complete={handleNowComplete}
            on:snooze={handleSnooze}
            on:reference={handleMarkReference}
            on:discard={handleDiscard}
            on:reveal={handleReveal}
            on:dismissAsk={handleDismissAsk}
            on:undo={handleUndoComplete}
            on:endSession={endSession}
            on:toggleCollapsed={() => settingsStore.setNextUpCollapsed(!$settingsStore.settings.nextUpCollapsed)}
            on:openTriage={() => (showTriage = true)}
            on:openFocus={() => openFocus(null)}
          />
        {/if}

        <KanbanBoard
          metaOf={(link) => cardMetas.get(link.id) ?? null}
          {collections}
          linksByCollection={$linksByCollection}
          workspaces={$workspacesStore.workspaces}
          currentWorkspaceId={$workspacesStore.activeWorkspaceId}
          on:removeLink={handleRemoveLink}
          on:error={handleError}
          on:success={handleSuccess}
          on:tabDrop={handleTabDrop}
        />

      {/if}
    {/if}
  </div>
</main>

{#if successMessage}
  <Toast
    message={successMessage}
    type="success"
    duration={lastDiscarded === null ? 3000 : 6000}
    actionLabel={lastDiscarded !== null && successMessage === t('success_link_removed') ? t('progress_undo') : null}
    onAction={undoDiscard}
    onClose={closeSuccessToast}
  />
{/if}

{#if errorMessage}
  <Toast message={errorMessage} onClose={() => errorMessage = null} />
{/if}

{#if linkToRemove}
  <ConfirmDialog
    message={t('newtab_confirm_remove_link')}
    confirmText={t('common_remove')}
    cancelText={t('common_cancel')}
    on:confirm={confirmRemoveLink}
    on:cancel={cancelRemoveLink}
  />
{/if}

{#if showSettings}
  <SettingsModal on:close={() => showSettings = false} />
{/if}

{#if showCreateCollection}
  <CreateCollectionModal
    existingNames={linksStore.getCollectionNames()}
    initialName={collectionFromGroup?.name ?? ''}
    on:create={handleCreateCollection}
    on:cancel={() => showCreateCollection = false}
  />
{/if}

{#if showOnboarding}
  <OnboardingWizard on:close={() => onboardingDismissed = true} />
{/if}

{#if showSearch}
  <CommandPalette
    links={$linksStore.links}
    collections={$linksStore.collections}
    workspaces={$workspacesStore.workspaces}
    translate={$settingsStore.settings.topicSearch ? translateQuery : null}
    topicSearchHint={translationAvailable && !$settingsStore.settings.topicSearch}
    {queue}
    activity={$activityStore.activity}
    {commands}
    wide={innerWidth >= 900}
    on:open={handleSearchOpen}
    on:openInNewTab={handleSearchOpenInNewTab}
    on:reveal={handleSearchReveal}
    on:complete={handleComplete}
    on:restore={handleRestore}
    on:snooze={handleSnooze}
    on:discard={handleDiscard}
    on:move={handleMove}
    on:command={handleCommand}
    on:close={() => (showSearch = false)}
  />
{/if}

{#if showTriage}
  <TriageOverlay
    items={queue.triage}
    workspaces={$workspacesStore.workspaces}
    links={$linksStore.links}
    on:keep={handleKeep}
    on:discard={handleDiscard}
    on:reference={handleMarkReference}
    on:complete={handleComplete}
    on:open={handleOpen}
    on:close={() => (showTriage = false)}
  />
{/if}

<style>
  .dashboard {
    display: flex;
    flex-direction: row;
    height: 100vh;
    width: 100vw;
    background: var(--surface-base);
  }

  .main-content {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-width: 0;
    height: 100%;
  }

  .loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--space-4);
    flex: 1;
    color: var(--text-secondary);
    font-family: var(--font-body);
    font-size: var(--text-sm);
    letter-spacing: 0.05em;
    text-transform: lowercase;
  }

  .spinner {
    width: 40px;
    height: 40px;
    border: 3px solid var(--border-subtle);
    border-top-color: var(--accent-primary);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
    box-shadow: 0 0 20px var(--accent-soft);
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .error-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--space-5);
    flex: 1;
    text-align: center;
    padding: var(--space-6);
  }

  .error-state p {
    color: var(--semantic-error);
    margin: 0;
    font-family: var(--font-body);
    font-size: var(--text-md);
    font-weight: 500;
  }

  .error-state button {
    padding: var(--space-3) var(--space-5);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-lg);
    background: var(--surface-elevated);
    color: var(--text-primary);
    font-family: var(--font-body);
    font-size: var(--text-sm);
    font-weight: 500;
    cursor: pointer;
    transition: all var(--duration-fast) var(--ease-out);
  }

  .error-state button:hover {
    background-color: var(--surface-overlay);
    border-color: var(--border-strong);
    transform: translateY(-1px);
  }

  .error-state button:active {
    transform: translateY(0);
  }

  .error-state button:focus-visible {
    outline: 2px solid var(--accent-primary);
    outline-offset: 2px;
  }

  /* Reduced motion */
  @media (prefers-reduced-motion: reduce) {
    .spinner {
      animation: none;
    }
    .error-state button:hover {
      transform: none;
    }
  }
</style>
