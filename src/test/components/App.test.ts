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
import type { Link } from '@/lib/types';

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
  storage: {
    watch: vi.fn(() => () => {}),
  },
}));

describe('App Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('should render TabAla watermark', () => {
    linksStore.set({
      links: [],
      collections: [{ id: 'inbox', name: 'Inbox', order: 0 }],
      loading: false,
      error: null,
      isAdding: false,
      isRemoving: new Set(),
    });

    render(App);
    expect(screen.getByText('TabAla')).toBeInTheDocument();
  });

  it('should have main element', () => {
    linksStore.set({
      links: [],
      collections: [{ id: 'inbox', name: 'Inbox', order: 0 }],
      loading: false,
      error: null,
      isAdding: false,
      isRemoving: new Set(),
    });

    const { container } = render(App);
    const main = container.querySelector('main');
    expect(main).not.toBeNull();
  });

  it('should show collections when no links are saved', () => {
    linksStore.set({
      links: [],
      collections: [{ id: 'inbox', name: 'Inbox', order: 0 }],
      loading: false,
      error: null,
      isAdding: false,
      isRemoving: new Set(),
    });

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
    });

    render(App);
    expect(screen.getByText('carregando...')).toBeInTheDocument();
  });

  it('should render save button even when error is set in store', () => {
    // Note: The popup App component doesn't display store.error directly,
    // it uses Toast for showing error messages from user actions
    linksStore.set({
      links: [],
      collections: [{ id: 'inbox', name: 'Inbox', order: 0 }],
      loading: false,
      error: 'Test error',
      isAdding: false,
      isRemoving: new Set(),
    });

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

    linksStore.set({
      links: mockLinks,
      collections: [{ id: 'inbox', name: 'Inbox', order: 0 }],
      loading: false,
      error: null,
      isAdding: false,
      isRemoving: new Set(),
    });

    render(App);
    const inboxElements = screen.getAllByText('Inbox');
    expect(inboxElements.length).toBeGreaterThanOrEqual(1);
    // Note: Links are hidden by default (collapsed collections)
    // The count badges show "1" indicating the link is there
    const countElements = screen.getAllByText('1');
    expect(countElements.length).toBeGreaterThanOrEqual(1);
  });
});
