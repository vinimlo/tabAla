/**
 * Column component tests.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import Column from '@/newtab/components/Column.svelte';
import { createMockLink, createMockCollection } from '../factories';
import { INBOX_COLLECTION_ID } from '@/lib/types';

vi.mock('svelte-dnd-action', () => ({
  dndzone: () => ({ destroy: () => {} }),
  SOURCES: { POINTER: 'pointer' },
  TRIGGERS: { DROPPED_INTO_ZONE: 'droppedIntoZone' },
}));

describe('Column Component', () => {
  const inboxCollection = createMockCollection({
    id: INBOX_COLLECTION_ID,
    name: 'Inbox',
    order: 0,
    isDefault: true,
  });

  const workCollection = createMockCollection({
    id: 'work',
    name: 'Work',
    order: 1,
  });

  const mockLinks = [
    createMockLink({ id: 'link-1', url: 'https://example.com', title: 'Link 1', collectionId: 'work' }),
    createMockLink({ id: 'link-2', url: 'https://test.com', title: 'Link 2', collectionId: 'work' }),
  ];

  it('should render collection name and link count', () => {
    render(Column, {
      props: { collection: workCollection, links: mockLinks },
    });

    expect(screen.getByText('Work')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('should not show 3-dot menu for Inbox', () => {
    render(Column, {
      props: { collection: inboxCollection, links: [] },
    });

    // The 3-dot menu button has aria-label 'column_menu' (returned by i18n mock)
    const menuButton = screen.queryByRole('button', { name: /column_menu/i });
    expect(menuButton).not.toBeInTheDocument();
  });

  it('should render links inside the column', () => {
    render(Column, {
      props: { collection: workCollection, links: mockLinks },
    });

    expect(screen.getByText('Link 1')).toBeInTheDocument();
    expect(screen.getByText('Link 2')).toBeInTheDocument();
  });

  it('should show empty state when there are no links', () => {
    render(Column, {
      props: { collection: workCollection, links: [] },
    });

    // The empty state shows translation key 'newtab_drag_links_here'
    expect(screen.getByText('newtab_drag_links_here')).toBeInTheDocument();
  });
});
