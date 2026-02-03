/**
 * App component test.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/svelte';
import App from '@/popup/App.svelte';
import { linksStore } from '@/popup/stores/links';
import type { Link } from '@/lib/types';

vi.mock('@/lib/storage', () => ({
  getLinks: vi.fn(() => Promise.resolve([])),
  saveLinks: vi.fn(() => Promise.resolve()),
  getCollections: vi.fn(() => Promise.resolve([])),
  saveCollections: vi.fn(() => Promise.resolve()),
}));

describe('App Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('should render TabAla title in heading', async () => {
    linksStore.set({
      links: [],
      collections: [{ id: 'inbox', name: 'Inbox', order: 0 }],
      loading: false,
      error: null,
    });

    render(App);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('TabAla');
  });

  it('should have main element', () => {
    linksStore.set({
      links: [],
      collections: [{ id: 'inbox', name: 'Inbox', order: 0 }],
      loading: false,
      error: null,
    });

    const { container } = render(App);
    const main = container.querySelector('main');
    expect(main).not.toBeNull();
  });

  it('should show empty state when no links are saved', async () => {
    linksStore.set({
      links: [],
      collections: [{ id: 'inbox', name: 'Inbox', order: 0 }],
      loading: false,
      error: null,
    });

    render(App);
    expect(screen.getByText('Nenhum link salvo ainda')).toBeInTheDocument();
  });

  it('should show loading state when loading', () => {
    linksStore.set({
      links: [],
      collections: [{ id: 'inbox', name: 'Inbox', order: 0 }],
      loading: true,
      error: null,
    });

    render(App);
    expect(screen.getByText('Carregando...')).toBeInTheDocument();
  });

  it('should show error state when error occurs', () => {
    linksStore.set({
      links: [],
      collections: [{ id: 'inbox', name: 'Inbox', order: 0 }],
      loading: false,
      error: 'Test error',
    });

    render(App);
    expect(screen.getByText('Erro ao carregar dados')).toBeInTheDocument();
    expect(screen.getByText('Tentar novamente')).toBeInTheDocument();
  });

  it('should display links grouped by collection', async () => {
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
    });

    render(App);
    expect(screen.getByText('Inbox')).toBeInTheDocument();
    expect(screen.getByText('Example')).toBeInTheDocument();
  });
});
