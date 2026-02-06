/**
 * App component test.
 *
 * Note: Async tests for loading links are challenging with Svelte + Vitest
 * due to module mocking limitations. The core functionality is tested in
 * storage.test.ts and component tests (LinkItem, ConfirmDialog).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/svelte';
import App from '@/popup/App.svelte';
import { linksStore } from '@/popup/stores/links';
import { workspacesStore } from '@/lib/stores/workspaces';
import type { Link } from '@/lib/types';
import { DEFAULT_WORKSPACE_ID, WORKSPACE_COLORS } from '@/lib/types';

vi.mock('@/lib/storage', () => ({
  getLinks: vi.fn(() => Promise.resolve([])),
  saveLinks: vi.fn(() => Promise.resolve()),
  getCollections: vi.fn(() => Promise.resolve([])),
  saveCollections: vi.fn(() => Promise.resolve()),
  initializeInbox: vi.fn(() => Promise.resolve()),
  removeCollection: vi.fn(() => Promise.resolve()),
  createCollection: vi.fn(() => Promise.resolve({ id: 'new-collection', name: 'New', order: 1 })),
  renameCollection: vi.fn(() => Promise.resolve({ success: true })),
  moveLink: vi.fn(() => Promise.resolve({ success: true })),
  updateCollectionOrder: vi.fn(() => Promise.resolve({ success: true })),
  getWorkspaces: vi.fn(() => Promise.resolve([])),
  saveWorkspaces: vi.fn(() => Promise.resolve()),
  migrateToWorkspaces: vi.fn(() => Promise.resolve()),
  initializeDefaultWorkspace: vi.fn(() => Promise.resolve()),
  storage: {
    watch: vi.fn(() => () => {}),
  },
}));

const defaultWorkspace = {
  id: DEFAULT_WORKSPACE_ID,
  name: 'Geral',
  color: WORKSPACE_COLORS[0],
  order: 0,
  createdAt: Date.now(),
  isDefault: true,
};

function setStoreState(linksState: {
  links?: Link[];
  collections?: { id: string; name: string; order: number }[];
  loading?: boolean;
  error?: string | null;
}): void {
  linksStore.set({
    links: linksState.links ?? [],
    collections: linksState.collections ?? [{ id: 'inbox', name: 'Inbox', order: 0 }],
    loading: linksState.loading ?? false,
    error: linksState.error ?? null,
    isAdding: false,
    isRemoving: new Set(),
    pendingLocalUpdate: false,
  });

  workspacesStore.set({
    workspaces: [defaultWorkspace],
    activeWorkspaceId: DEFAULT_WORKSPACE_ID,
    loading: false,
    error: null,
    pendingLocalUpdate: false,
  });
}

describe('App Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('should render TabAla watermark', () => {
    setStoreState({});

    render(App);
    expect(screen.getByText('TabAla')).toBeInTheDocument();
  });

  it('should have main element', () => {
    setStoreState({});

    const { container } = render(App);
    const main = container.querySelector('main');
    expect(main).not.toBeNull();
  });

  it('should show collections when no links are saved', () => {
    setStoreState({});

    render(App);
    // When there are no links, the app still shows the collections list
    // Inbox appears in both the dropdown and collection header
    const inboxElements = screen.getAllByText('Inbox');
    expect(inboxElements.length).toBeGreaterThanOrEqual(1);
  });

  it('should show loading state when loading', () => {
    linksStore.set({
      links: [],
      collections: [{ id: 'inbox', name: 'Inbox', order: 0 }],
      loading: true,
      error: null,
      isAdding: false,
      isRemoving: new Set(),
      pendingLocalUpdate: false,
    });
    // Keep workspaces loading too
    workspacesStore.set({
      workspaces: [],
      activeWorkspaceId: DEFAULT_WORKSPACE_ID,
      loading: true,
      error: null,
      pendingLocalUpdate: false,
    });

    render(App);
    expect(screen.getByText('carregando...')).toBeInTheDocument();
  });

  it('should render save button even when error is set in store', () => {
    // Note: The popup App component doesn't display store.error directly,
    // it uses Toast for showing error messages from user actions
    setStoreState({ error: 'Test error' });

    render(App);
    // The component still renders normally - errors are handled via Toast
    expect(screen.getByText('Salvar')).toBeInTheDocument();
  });

  it('should display links grouped by collection', () => {
    const mockLinks: Link[] = [
      {
        id: 'link-1',
        url: 'https://example.com',
        title: 'Example',
        collectionId: 'inbox',
        createdAt: Date.now(),
      },
    ];

    setStoreState({ links: mockLinks });

    render(App);
    const inboxElements = screen.getAllByText('Inbox');
    expect(inboxElements.length).toBeGreaterThanOrEqual(1);
    // Note: Links are hidden by default (collapsed collections)
    // The count badges show "1" indicating the link is there
    const countElements = screen.getAllByText('1');
    expect(countElements.length).toBeGreaterThanOrEqual(1);
  });
});
