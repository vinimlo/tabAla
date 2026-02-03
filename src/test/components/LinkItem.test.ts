/**
 * Unit tests for LinkItem component.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent, screen } from '@testing-library/svelte';
import LinkItem from '@/popup/components/LinkItem.svelte';
import type { Link } from '@/lib/types';

const createMockLink = (overrides: Partial<Link> = {}): Link => ({
  id: 'test-link-1',
  url: 'https://example.com/page',
  title: 'Example Page',
  collectionId: 'inbox',
  createdAt: Date.now(),
  ...overrides,
});

describe('LinkItem', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render link title and URL', () => {
    const link = createMockLink({ title: 'Test Title', url: 'https://test.com/path' });
    render(LinkItem, { props: { link } });

    expect(screen.getByText('Test Title')).toBeInTheDocument();
    expect(screen.getByText('test.com/path')).toBeInTheDocument();
  });

  it('should show "Untitled" for links without title', () => {
    const link = createMockLink({ title: '' });
    render(LinkItem, { props: { link } });

    expect(screen.getByText('Untitled')).toBeInTheDocument();
  });

  it('should have accessible open button', () => {
    const link = createMockLink({ title: 'My Link' });
    render(LinkItem, { props: { link } });

    const openButton = screen.getByRole('button', { name: /open my link/i });
    expect(openButton).toBeInTheDocument();
  });

  it('should dispatch open event when link content is clicked', async () => {
    const link = createMockLink({ url: 'https://test.com' });
    const { component } = render(LinkItem, { props: { link } });

    const handleOpen = vi.fn();
    component.$on('open', handleOpen);

    const openButton = screen.getByRole('button', { name: /open/i });
    await fireEvent.click(openButton);

    expect(handleOpen).toHaveBeenCalledTimes(1);
    expect(handleOpen).toHaveBeenCalledWith(
      expect.objectContaining({
        detail: { url: 'https://test.com' },
      })
    );
  });

  it('should dispatch remove event when remove button is clicked', async () => {
    const link = createMockLink({ id: 'link-to-remove' });
    const { component } = render(LinkItem, { props: { link } });

    const handleRemove = vi.fn();
    component.$on('remove', handleRemove);

    const container = screen.getByRole('listitem');
    await fireEvent.mouseEnter(container);

    const removeButton = screen.getByRole('button', { name: /remove link/i });
    await fireEvent.click(removeButton);

    expect(handleRemove).toHaveBeenCalledTimes(1);
    expect(handleRemove).toHaveBeenCalledWith(
      expect.objectContaining({
        detail: { linkId: 'link-to-remove' },
      })
    );
  });

  it('should show remove button on hover', async () => {
    const link = createMockLink();
    render(LinkItem, { props: { link } });

    expect(screen.queryByRole('button', { name: /remove link/i })).not.toBeInTheDocument();

    const container = screen.getByRole('listitem');
    await fireEvent.mouseEnter(container);

    expect(screen.getByRole('button', { name: /remove link/i })).toBeInTheDocument();
  });

  it('should truncate long URLs', () => {
    const longUrl = 'https://example.com/very/long/path/that/should/be/truncated/to/fit';
    const link = createMockLink({ url: longUrl });
    render(LinkItem, { props: { link } });

    const urlElement = screen.getByText(/example\.com\/very\/long/);
    expect(urlElement).toBeInTheDocument();
  });

  it('should render with proper role for accessibility', () => {
    const link = createMockLink();
    render(LinkItem, { props: { link } });

    expect(screen.getByRole('listitem')).toBeInTheDocument();
  });
});
