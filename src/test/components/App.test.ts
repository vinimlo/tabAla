/**
 * App component test.
 *
 * Note: Async tests for loading links are challenging with Svelte + Vitest
 * due to module mocking limitations. The core functionality is tested in
 * storage.test.ts and component tests (LinkItem, ConfirmDialog).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor, act, fireEvent } from '@testing-library/svelte';
import App from '@/popup/App.svelte';
import { linksStore } from '@/lib/stores/links';
import { workspacesStore } from '@/lib/stores/workspaces';
import { settingsStore } from '@/lib/stores/settings';
import { chromeMock } from '../setup';
import * as storage from '@/lib/storage';
import type { Link } from '@/lib/types';
import { DEFAULT_WORKSPACE_ID, DEFAULT_SETTINGS } from '@/lib/types';
import { createMockLink, createMockWorkspace } from '../factories';
const { createStorageMock } = await vi.hoisted(() => import('../mocks/storage'));

vi.mock('@/lib/storage', () => createStorageMock());

const defaultWorkspace = createMockWorkspace({
  id: DEFAULT_WORKSPACE_ID,
  name: 'Geral',
  isDefault: true,
});

const DEFAULT_LINKS_STATE = {
  links: [] as Link[],
  collections: [{ id: 'inbox', name: 'Inbox', order: 0 }],
  loading: false,
  error: null,
  isAdding: false,
  isRemoving: new Set<string>(),
  pendingLocalUpdate: false,
};

const DEFAULT_WORKSPACES_STATE = {
  workspaces: [defaultWorkspace],
  activeWorkspaceId: DEFAULT_WORKSPACE_ID,
  loading: false,
  error: null,
  pendingLocalUpdate: false,
};

function setStoreState(overrides: {
  links?: Link[];
  collections?: { id: string; name: string; order: number }[];
  loading?: boolean;
  error?: string | null;
} = {}): void {
  linksStore.set({
    ...DEFAULT_LINKS_STATE,
    ...overrides,
  });
  workspacesStore.set(DEFAULT_WORKSPACES_STATE);
}

describe('App Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('should render TabAla watermark', async () => {
    setStoreState({});

    render(App);
    await waitFor(() => {
      expect(screen.getByText('TabAla')).toBeInTheDocument();
    });
  });

  it('opens the dashboard page itself, which works even when it is not the new tab', async () => {
    setStoreState({});

    render(App);
    const button = await screen.findByTitle('popup_open_dashboard');
    await act(() => button.click());

    expect(chrome.tabs.create).toHaveBeenCalledWith({
      url: 'chrome-extension://test-extension-id/src/newtab/index.html?dashboard',
    });
  });

  it('searches every workspace and opens the first result with Enter', async () => {
    setStoreState({});
    render(App);
    await waitFor(() => {
      expect(screen.getByText('TabAla')).toBeInTheDocument();
    });

    const study = createMockWorkspace({ id: 'ws-study', name: 'Estudos', order: 1 });
    linksStore.set({
      ...DEFAULT_LINKS_STATE,
      collections: [
        { id: 'inbox', name: 'Inbox', order: 0 },
        { id: 'icpc', name: 'ICPC', order: 1, workspaceId: 'ws-study' },
      ],
      links: [createMockLink({ id: 'dij', title: 'Dijkstra notes', url: 'https://cp.example/dijkstra', collectionId: 'icpc' })],
    });
    workspacesStore.set({ ...DEFAULT_WORKSPACES_STATE, workspaces: [defaultWorkspace, study] });

    const input = screen.getByPlaceholderText('popup_search_placeholder');
    await fireEvent.input(input, { target: { value: 'dijkstra' } });

    expect(await screen.findByText('Dijkstra notes')).toBeInTheDocument();
    expect(screen.getByText('Estudos › ICPC')).toBeInTheDocument();

    await fireEvent.keyDown(input, { key: 'Enter' });
    // The open is recorded first (the popup closes once the new tab takes focus).
    await waitFor(() => expect(chrome.tabs.create).toHaveBeenCalledWith({ url: 'https://cp.example/dijkstra', active: true }));
  });

  it('also searches the English translation when topic search is on', async () => {
    chromeMock.i18n.getUILanguage.mockReturnValue('pt-BR');
    (globalThis as Record<string, unknown>).Translator = {
      availability: vi.fn(() => Promise.resolve('available')),
      create: vi.fn(() => Promise.resolve({ translate: vi.fn(() => Promise.resolve('knapsack')), destroy: vi.fn() })),
    };
    setStoreState({});
    render(App);
    await waitFor(() => {
      expect(screen.getByText('TabAla')).toBeInTheDocument();
    });
    linksStore.set({
      ...DEFAULT_LINKS_STATE,
      links: [createMockLink({ id: 'k', title: 'Knapsack tutorial', url: 'https://cp.example/k', collectionId: 'inbox' })],
    });
    settingsStore.set({ settings: { ...DEFAULT_SETTINGS, topicSearch: true }, loading: false, error: null, pendingLocalUpdate: false });

    await fireEvent.input(screen.getByPlaceholderText('popup_search_placeholder'), { target: { value: 'mochila' } });

    expect(await screen.findByText('Knapsack tutorial')).toBeInTheDocument();
    delete (globalThis as Record<string, unknown>).Translator;
    chromeMock.i18n.getUILanguage.mockReturnValue('en');
  });

  it('should have main element', () => {
    setStoreState({});

    const { container } = render(App);
    const main = container.querySelector('main');
    expect(main).not.toBeNull();
  });

  it('should show collections when no links are saved', async () => {
    setStoreState({});

    render(App);
    // Wait for onMount load() to finish, then re-set store state
    await waitFor(() => {
      expect(screen.getByText('TabAla')).toBeInTheDocument();
    });
    // Re-set store state after load() overwrites it with mock data
    await act(() => setStoreState({}));

    // When there are no links, the app still shows the collections list
    // Inbox appears in both the dropdown and collection header
    const inboxElements = screen.getAllByText('common_inbox');
    expect(inboxElements.length).toBeGreaterThanOrEqual(1);
  });

  it('should show loading state when loading', () => {
    linksStore.set({ ...DEFAULT_LINKS_STATE, loading: true });
    workspacesStore.set({ ...DEFAULT_WORKSPACES_STATE, workspaces: [], loading: true });

    render(App);
    expect(screen.getByText('common_loading')).toBeInTheDocument();
  });

  it('should render save button even when error is set in store', async () => {
    // Note: The popup App component doesn't display store.error directly,
    // it uses Toast for showing error messages from user actions
    setStoreState({ error: 'Test error' });

    render(App);
    // The component still renders normally - errors are handled via Toast
    await waitFor(() => {
      expect(screen.getByText('common_save')).toBeInTheDocument();
    });
  });

  it('should display links grouped by collection', async () => {
    setStoreState({
      links: [createMockLink({ title: 'Example', collectionId: 'inbox' })],
    });

    render(App);
    // Wait for onMount load() to finish
    await waitFor(() => {
      expect(screen.getByText('TabAla')).toBeInTheDocument();
    });
    // Re-set store state after load() overwrites it with mock data
    await act(() => setStoreState({
      links: [createMockLink({ title: 'Example', collectionId: 'inbox' })],
    }));

    const inboxElements = screen.getAllByText('common_inbox');
    expect(inboxElements.length).toBeGreaterThanOrEqual(1);
    // Note: Links are hidden by default (collapsed collections)
    // The count badges show "1" indicating the link is there
    const countElements = screen.getAllByText('1');
    expect(countElements.length).toBeGreaterThanOrEqual(1);
  });

  describe('when the current tab is a saved link', () => {
    const saved = createMockLink({ id: 'saved', url: 'https://saved.example/post', title: 'Saved post', collectionId: 'inbox' });

    async function renderOn(links: Link[]): Promise<void> {
      // The shared mock is typed from its default `[]` (never[]).
      chromeMock.tabs.query.mockResolvedValue([{ url: 'https://saved.example/post', title: 'Saved post' }] as never[]);
      setStoreState({});
      render(App);
      await waitFor(() => expect(chromeMock.tabs.query).toHaveBeenCalled());
      await act(() => setStoreState({ links }));
    }

    afterEach(() => {
      chromeMock.tabs.query.mockImplementation(() => Promise.resolve([]));
    });

    it('offers to complete it', async () => {
      await renderOn([saved]);

      expect(await screen.findByText('popup_saved_in')).toBeInTheDocument();
      await fireEvent.click(screen.getByRole('button', { name: /progress_complete/ }));

      expect(storage.patchLinkState).toHaveBeenCalledWith('saved', { completedAt: expect.any(Number), snoozedUntil: null });
    });

    it('offers to undo when it is already completed', async () => {
      await renderOn([{ ...saved, completedAt: 1 }]);

      expect(await screen.findByText('popup_completed_on')).toBeInTheDocument();
      await fireEvent.click(screen.getByRole('button', { name: 'progress_undo' }));

      expect(storage.patchLinkState).toHaveBeenCalledWith('saved', { completedAt: null });
    });

    it('acts on the pending copy when the page was saved twice', async () => {
      await renderOn([{ ...saved, id: 'old-copy', completedAt: 1 }, saved]);

      await fireEvent.click(await screen.findByRole('button', { name: /progress_complete/ }));

      expect(vi.mocked(storage.patchLinkState).mock.calls[0][0]).toBe('saved');
    });

    it('recognizes the page through tracking parameters and fragments', async () => {
      chromeMock.tabs.query.mockResolvedValue([{ url: 'https://saved.example/post?utm_source=news#top', title: 'Saved post' }] as never[]);
      setStoreState({});
      render(App);
      await waitFor(() => expect(chromeMock.tabs.query).toHaveBeenCalled());
      await act(() => setStoreState({ links: [saved] }));

      expect(await screen.findByText('popup_saved_in')).toBeInTheDocument();
    });

    it('undo brings back the copy that was just completed', async () => {
      await renderOn([{ ...saved, id: 'old-copy', completedAt: 1 }, saved]);

      await fireEvent.click(await screen.findByRole('button', { name: /progress_complete/ }));
      await fireEvent.click(await screen.findByRole('button', { name: 'progress_undo' }));

      expect(vi.mocked(storage.patchLinkState).mock.calls[1]).toEqual(['saved', { completedAt: null }]);
    });
  });
});
