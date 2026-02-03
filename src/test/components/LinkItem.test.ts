/**
 * LinkItem component tests.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import LinkItem from '@/popup/components/LinkItem.svelte';
import type { Link } from '@/lib/types';

const mockLink: Link = {
  id: 'test-id-1',
  url: 'https://example.com/page',
  title: 'Example Page',
  favicon: 'https://example.com/favicon.ico',
  collectionId: 'inbox',
  createdAt: Date.now(),
};

describe('LinkItem Component', () => {
  it('should render link title', () => {
    render(LinkItem, { props: { link: mockLink } });
    expect(screen.getByText('Example Page')).toBeInTheDocument();
  });

  it('should render truncated URL', () => {
    render(LinkItem, { props: { link: mockLink } });
    expect(screen.getByText('example.com/page')).toBeInTheDocument();
  });

  it('should render favicon image', () => {
    const { container } = render(LinkItem, { props: { link: mockLink } });
    const img = container.querySelector('.favicon') as HTMLImageElement;
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', mockLink.favicon);
  });

  it('should render placeholder when favicon is missing', () => {
    const linkWithoutFavicon: Link = { ...mockLink, favicon: undefined };
    const { container } = render(LinkItem, { props: { link: linkWithoutFavicon } });
    const img = container.querySelector('.favicon') as HTMLImageElement;
    expect(img).toBeInTheDocument();
    expect(img.getAttribute('src')).toContain('data:image/svg+xml');
  });

  it('should render "Untitled" when title is empty', () => {
    const linkWithoutTitle: Link = { ...mockLink, title: '' };
    render(LinkItem, { props: { link: linkWithoutTitle } });
    expect(screen.getByText('Untitled')).toBeInTheDocument();
  });

  it('should render remove button with aria-label', () => {
    render(LinkItem, { props: { link: mockLink } });
    const removeBtn = screen.getByRole('button', { name: 'Remove link' });
    expect(removeBtn).toBeInTheDocument();
  });

  it('should dispatch open event when clicked', async () => {
    const { component } = render(LinkItem, { props: { link: mockLink } });
    const openHandler = vi.fn();
    component.$on('open', openHandler);

    const linkItem = screen.getByRole('button', { name: /Example Page/i });
    await fireEvent.click(linkItem);

    expect(openHandler).toHaveBeenCalledTimes(1);
    expect(openHandler.mock.calls[0][0].detail).toEqual(mockLink);
  });

  it('should dispatch remove event when remove button clicked', async () => {
    const { component } = render(LinkItem, { props: { link: mockLink } });
    const removeHandler = vi.fn();
    component.$on('remove', removeHandler);

    const removeBtn = screen.getByRole('button', { name: 'Remove link' });
    await fireEvent.click(removeBtn);

    expect(removeHandler).toHaveBeenCalledTimes(1);
    expect(removeHandler.mock.calls[0][0].detail).toBe(mockLink.id);
  });

  it('should dispatch open event on Enter key', async () => {
    const { component } = render(LinkItem, { props: { link: mockLink } });
    const openHandler = vi.fn();
    component.$on('open', openHandler);

    const linkItem = screen.getByRole('button', { name: /Example Page/i });
    await fireEvent.keyDown(linkItem, { key: 'Enter' });

    expect(openHandler).toHaveBeenCalledTimes(1);
  });

  it('should dispatch open event on Space key', async () => {
    const { component } = render(LinkItem, { props: { link: mockLink } });
    const openHandler = vi.fn();
    component.$on('open', openHandler);

    const linkItem = screen.getByRole('button', { name: /Example Page/i });
    await fireEvent.keyDown(linkItem, { key: ' ' });

    expect(openHandler).toHaveBeenCalledTimes(1);
  });

  it('should be accessible with proper roles', () => {
    render(LinkItem, { props: { link: mockLink } });

    const linkItem = screen.getByRole('button', { name: /Example Page/i });
    expect(linkItem).toHaveAttribute('tabindex', '0');
  });
});
