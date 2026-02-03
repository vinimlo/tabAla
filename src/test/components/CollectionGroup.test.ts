/**
 * CollectionGroup component tests.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import CollectionGroup from '@/popup/components/CollectionGroup.svelte';
import type { Link, Collection } from '@/lib/types';

const mockCollection: Collection = {
  id: 'inbox',
  name: 'Inbox',
  order: 0,
};

const mockLinks: Link[] = [
  {
    id: 'link-1',
    url: 'https://example1.com',
    title: 'Example 1',
    collectionId: 'inbox',
    createdAt: Date.now(),
  },
  {
    id: 'link-2',
    url: 'https://example2.com',
    title: 'Example 2',
    collectionId: 'inbox',
    createdAt: Date.now() - 1000,
  },
];

describe('CollectionGroup Component', () => {
  it('should render collection name', () => {
    render(CollectionGroup, {
      props: { collection: mockCollection, links: mockLinks, expanded: true },
    });
    expect(screen.getByText('Inbox')).toBeInTheDocument();
  });

  it('should render link count', () => {
    render(CollectionGroup, {
      props: { collection: mockCollection, links: mockLinks, expanded: true },
    });
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('should render links when expanded', () => {
    render(CollectionGroup, {
      props: { collection: mockCollection, links: mockLinks, expanded: true },
    });
    expect(screen.getByText('Example 1')).toBeInTheDocument();
    expect(screen.getByText('Example 2')).toBeInTheDocument();
  });

  it('should not render links when collapsed', () => {
    render(CollectionGroup, {
      props: { collection: mockCollection, links: mockLinks, expanded: false },
    });
    expect(screen.queryByText('Example 1')).not.toBeInTheDocument();
    expect(screen.queryByText('Example 2')).not.toBeInTheDocument();
  });

  it('should dispatch toggle event when header clicked', async () => {
    const { component, container } = render(CollectionGroup, {
      props: { collection: mockCollection, links: mockLinks, expanded: true },
    });
    const toggleHandler = vi.fn();
    component.$on('toggle', toggleHandler);

    const header = container.querySelector('header.header');
    expect(header).not.toBeNull();
    await fireEvent.click(header!);

    expect(toggleHandler).toHaveBeenCalledTimes(1);
    expect(toggleHandler.mock.calls[0][0].detail).toBe('inbox');
  });

  it('should dispatch toggle event on Enter key', async () => {
    const { component, container } = render(CollectionGroup, {
      props: { collection: mockCollection, links: mockLinks, expanded: true },
    });
    const toggleHandler = vi.fn();
    component.$on('toggle', toggleHandler);

    const header = container.querySelector('header.header');
    expect(header).not.toBeNull();
    await fireEvent.keyDown(header!, { key: 'Enter' });

    expect(toggleHandler).toHaveBeenCalledTimes(1);
  });

  it('should propagate open event from LinkItem', async () => {
    const { component } = render(CollectionGroup, {
      props: { collection: mockCollection, links: mockLinks, expanded: true },
    });
    const openHandler = vi.fn();
    component.$on('open', openHandler);

    const linkItem = screen.getByRole('button', { name: /Example 1/i });
    await fireEvent.click(linkItem);

    expect(openHandler).toHaveBeenCalledTimes(1);
    expect(openHandler.mock.calls[0][0].detail.id).toBe('link-1');
  });

  it('should propagate remove event from LinkItem', async () => {
    const { component } = render(CollectionGroup, {
      props: { collection: mockCollection, links: mockLinks, expanded: true },
    });
    const removeHandler = vi.fn();
    component.$on('remove', removeHandler);

    const removeButtons = screen.getAllByRole('button', { name: 'Remove link' });
    await fireEvent.click(removeButtons[0]);

    expect(removeHandler).toHaveBeenCalledTimes(1);
    expect(removeHandler.mock.calls[0][0].detail).toBe('link-1');
  });

  it('should have aria-expanded attribute on header', () => {
    const { container } = render(CollectionGroup, {
      props: { collection: mockCollection, links: mockLinks, expanded: true },
    });
    const header = container.querySelector('header.header');
    expect(header).not.toBeNull();
    expect(header).toHaveAttribute('aria-expanded', 'true');
  });

  it('should render empty collection with count zero', () => {
    render(CollectionGroup, {
      props: { collection: mockCollection, links: [], expanded: true },
    });
    expect(screen.getByText('0')).toBeInTheDocument();
  });
});
