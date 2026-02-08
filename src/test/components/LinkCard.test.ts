/**
 * LinkCard component tests.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import LinkCard from '@/newtab/components/LinkCard.svelte';
import { createMockLink } from '../factories';

describe('LinkCard Component', () => {
  const defaultLink = createMockLink({
    id: 'link-1',
    url: 'https://www.example.com/page',
    title: 'Example Page',
    favicon: 'https://www.example.com/favicon.ico',
    collectionId: 'inbox',
  });

  it('should render title and domain', () => {
    render(LinkCard, { props: { link: defaultLink } });

    expect(screen.getByText('Example Page')).toBeInTheDocument();
    expect(screen.getByText('example.com')).toBeInTheDocument();
  });

  it('should render favicon when present', () => {
    const { container } = render(LinkCard, { props: { link: defaultLink } });

    const img = container.querySelector('.link-favicon img') as HTMLImageElement;
    expect(img).toBeInTheDocument();
    expect(img.src).toBe('https://www.example.com/favicon.ico');
  });

  it('should render fallback icon when no favicon', () => {
    const linkWithoutFavicon = createMockLink({
      id: 'link-2',
      url: 'https://example.com',
      title: 'No Favicon',
      favicon: undefined,
      collectionId: 'inbox',
    });

    const { container } = render(LinkCard, { props: { link: linkWithoutFavicon } });

    // No img tag should be present
    const img = container.querySelector('img');
    expect(img).toBeNull();

    // SVG fallback should be present
    const svg = container.querySelector('.link-favicon svg');
    expect(svg).toBeInTheDocument();
  });

  it('should dispatch remove event when remove button is clicked', async () => {
    const { component } = render(LinkCard, { props: { link: defaultLink } });

    const removeFn = vi.fn();
    component.$on('remove', removeFn);

    const removeButton = screen.getByRole('button', { name: /linkcard_remove/i });
    await fireEvent.click(removeButton);

    expect(removeFn).toHaveBeenCalledTimes(1);
    expect(removeFn.mock.calls[0][0].detail).toEqual({
      id: 'link-1',
      title: 'Example Page',
    });
  });

  it('should have accessibility attributes (role and tabindex)', () => {
    const { container } = render(LinkCard, { props: { link: defaultLink } });

    const card = container.querySelector('.link-card');
    expect(card).toHaveAttribute('role', 'button');
    expect(card).toHaveAttribute('tabindex', '0');
  });
});
