/**
 * CollectionSelector component tests.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import CollectionSelector from '@/popup/components/CollectionSelector.svelte';
import type { Collection } from '@/lib/types';
import { ALL_COLLECTIONS_FILTER } from '@/lib/filters';

const mockCollections: Collection[] = [
  { id: 'inbox', name: 'Inbox', order: 0, isDefault: true },
  { id: 'work', name: 'Work', order: 1 },
  { id: 'projects', name: 'Projects', order: 2 },
];

const mockLinkCounts = new Map<string, number>([
  ['inbox', 5],
  ['work', 3],
  ['projects', 2],
]);

describe('CollectionSelector Component', () => {
  it('should render "Todas" tab', () => {
    render(CollectionSelector, {
      props: {
        collections: mockCollections,
        selectedId: ALL_COLLECTIONS_FILTER,
        linkCounts: mockLinkCounts,
        totalLinks: 10,
      },
    });

    expect(screen.getByText('Todas')).toBeInTheDocument();
  });

  it('should render all collections', () => {
    render(CollectionSelector, {
      props: {
        collections: mockCollections,
        selectedId: ALL_COLLECTIONS_FILTER,
        linkCounts: mockLinkCounts,
        totalLinks: 10,
      },
    });

    expect(screen.getByText('Inbox')).toBeInTheDocument();
    expect(screen.getByText('Work')).toBeInTheDocument();
    expect(screen.getByText('Projects')).toBeInTheDocument();
  });

  it('should show total links count on "Todas" tab', () => {
    render(CollectionSelector, {
      props: {
        collections: mockCollections,
        selectedId: ALL_COLLECTIONS_FILTER,
        linkCounts: mockLinkCounts,
        totalLinks: 10,
      },
    });

    const todasTab = screen.getByRole('tab', { name: /Todas/i });
    expect(todasTab).toHaveTextContent('10');
  });

  it('should show link counts for each collection', () => {
    render(CollectionSelector, {
      props: {
        collections: mockCollections,
        selectedId: ALL_COLLECTIONS_FILTER,
        linkCounts: mockLinkCounts,
        totalLinks: 10,
      },
    });

    const inboxTab = screen.getByRole('tab', { name: /Inbox/i });
    expect(inboxTab).toHaveTextContent('5');

    const workTab = screen.getByRole('tab', { name: /Work/i });
    expect(workTab).toHaveTextContent('3');
  });

  it('should highlight "Todas" when ALL_COLLECTIONS_FILTER is selected', () => {
    render(CollectionSelector, {
      props: {
        collections: mockCollections,
        selectedId: ALL_COLLECTIONS_FILTER,
        linkCounts: mockLinkCounts,
        totalLinks: 10,
      },
    });

    const todasTab = screen.getByRole('tab', { name: /Todas/i });
    expect(todasTab).toHaveAttribute('aria-selected', 'true');
  });

  it('should highlight selected collection', () => {
    render(CollectionSelector, {
      props: {
        collections: mockCollections,
        selectedId: 'work',
        linkCounts: mockLinkCounts,
        totalLinks: 10,
      },
    });

    const workTab = screen.getByRole('tab', { name: /Work/i });
    expect(workTab).toHaveAttribute('aria-selected', 'true');

    const todasTab = screen.getByRole('tab', { name: /Todas/i });
    expect(todasTab).toHaveAttribute('aria-selected', 'false');
  });

  it('should dispatch select event when tab is clicked', async () => {
    const { component } = render(CollectionSelector, {
      props: {
        collections: mockCollections,
        selectedId: ALL_COLLECTIONS_FILTER,
        linkCounts: mockLinkCounts,
        totalLinks: 10,
      },
    });

    const selectHandler = vi.fn();
    component.$on('select', selectHandler);

    const workTab = screen.getByRole('tab', { name: /Work/i });
    await fireEvent.click(workTab);

    expect(selectHandler).toHaveBeenCalledTimes(1);
    expect(selectHandler.mock.calls[0][0].detail).toBe('work');
  });

  it('should dispatch select event on Enter key', async () => {
    const { component } = render(CollectionSelector, {
      props: {
        collections: mockCollections,
        selectedId: ALL_COLLECTIONS_FILTER,
        linkCounts: mockLinkCounts,
        totalLinks: 10,
      },
    });

    const selectHandler = vi.fn();
    component.$on('select', selectHandler);

    const inboxTab = screen.getByRole('tab', { name: /Inbox/i });
    await fireEvent.keyDown(inboxTab, { key: 'Enter' });

    expect(selectHandler).toHaveBeenCalledTimes(1);
    expect(selectHandler.mock.calls[0][0].detail).toBe('inbox');
  });

  it('should dispatch ALL_COLLECTIONS_FILTER when "Todas" is clicked', async () => {
    const { component } = render(CollectionSelector, {
      props: {
        collections: mockCollections,
        selectedId: 'work',
        linkCounts: mockLinkCounts,
        totalLinks: 10,
      },
    });

    const selectHandler = vi.fn();
    component.$on('select', selectHandler);

    const todasTab = screen.getByRole('tab', { name: /Todas/i });
    await fireEvent.click(todasTab);

    expect(selectHandler.mock.calls[0][0].detail).toBe(ALL_COLLECTIONS_FILTER);
  });

  it('should have proper ARIA attributes', () => {
    render(CollectionSelector, {
      props: {
        collections: mockCollections,
        selectedId: ALL_COLLECTIONS_FILTER,
        linkCounts: mockLinkCounts,
        totalLinks: 10,
      },
    });

    const tablist = screen.getByRole('tablist');
    expect(tablist).toHaveAttribute('aria-label', 'Filtrar por coleção');
  });

  it('should show 0 count for collections with no links', () => {
    const emptyLinkCounts = new Map<string, number>([
      ['inbox', 0],
      ['work', 0],
    ]);

    render(CollectionSelector, {
      props: {
        collections: mockCollections,
        selectedId: ALL_COLLECTIONS_FILTER,
        linkCounts: emptyLinkCounts,
        totalLinks: 0,
      },
    });

    const inboxTab = screen.getByRole('tab', { name: /Inbox/i });
    expect(inboxTab).toHaveTextContent('0');
  });

  it('should sort collections with Inbox first', () => {
    const unsortedCollections: Collection[] = [
      { id: 'work', name: 'Work', order: 1 },
      { id: 'inbox', name: 'Inbox', order: 0, isDefault: true },
      { id: 'projects', name: 'Projects', order: 2 },
    ];

    render(CollectionSelector, {
      props: {
        collections: unsortedCollections,
        selectedId: ALL_COLLECTIONS_FILTER,
        linkCounts: mockLinkCounts,
        totalLinks: 10,
      },
    });

    const tabs = screen.getAllByRole('tab');
    expect(tabs[0]).toHaveTextContent('Todas');
    expect(tabs[1]).toHaveTextContent('Inbox');
    expect(tabs[2]).toHaveTextContent('Work');
  });
});
