/**
 * App component test.
 *
 * Note: Async tests for loading links are challenging with Svelte + Vitest
 * due to module mocking limitations. The core functionality is tested in
 * storage.test.ts and component tests (LinkItem, ConfirmDialog).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor, act } from '@testing-library/svelte';
import App from '@/popup/App.svelte';
import { linksStore } from '@/lib/stores/links';
import { workspacesStore } from '@/lib/stores/workspaces';
import type { Link } from '@/lib/types';
import { DEFAULT_WORKSPACE_ID } from '@/lib/types';
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
});
