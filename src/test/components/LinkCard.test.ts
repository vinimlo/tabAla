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

    const img = container.querySelector('.tile img') as HTMLImageElement;
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
    const svg = container.querySelector('.tile svg');
    expect(svg).toBeInTheDocument();
  });

  it('removes from its menu', async () => {
    const remove = vi.fn();
    render(LinkCard, { props: { link: defaultLink }, events: { remove } });

    await fireEvent.click(screen.getByRole('button', { name: 'progress_more' }));
    await fireEvent.click(screen.getByRole('menuitem', { name: 'linkcard_remove' }));

    expect(remove.mock.calls[0][0].detail).toEqual({ id: defaultLink.id, title: defaultLink.title });
  });

  it('should have accessibility attributes (role and tabindex)', () => {
    const { container } = render(LinkCard, { props: { link: defaultLink } });

    const card = container.querySelector('.link-card');
    expect(card).toHaveAttribute('role', 'button');
    expect(card).toHaveAttribute('tabindex', '0');
  });

  describe('progress', () => {
    const link = createMockLink({ id: 'l1', title: 'Paper', url: 'https://example.com/p', collectionId: 'c1' });

    it('completes without opening the link', async () => {
      const complete = vi.fn();
      const open = vi.fn();
      render(LinkCard, { props: { link }, events: { complete, open } });

      await fireEvent.click(screen.getByRole('button', { name: 'progress_complete' }));

      expect(complete.mock.calls[0][0].detail).toEqual(link);
      expect(open).not.toHaveBeenCalled();
    });

    it('Enter on an action button does not open the link', async () => {
      const open = vi.fn();
      render(LinkCard, { props: { link }, events: { open } });

      await fireEvent.keyDown(screen.getByRole('button', { name: 'progress_complete' }), { key: 'Enter' });

      expect(open).not.toHaveBeenCalled();
    });

    it('snoozes until next week from the menu', async () => {
      vi.useFakeTimers({ toFake: ['Date'] });
      vi.setSystemTime(new Date(2026, 8, 24, 10));
      const snooze = vi.fn();
      render(LinkCard, { props: { link }, events: { snooze } });

      await fireEvent.click(screen.getByRole('button', { name: 'progress_more' }));
      await fireEvent.click(screen.getByRole('menuitem', { name: 'progress_snooze_next_week' }));
      vi.useRealTimers();

      expect(snooze.mock.calls[0][0].detail).toEqual({ link, until: new Date(2026, 8, 28).getTime() });
    });

    it('marks a link as reference', async () => {
      const reference = vi.fn();
      render(LinkCard, { props: { link }, events: { reference } });

      await fireEvent.click(screen.getByRole('button', { name: 'progress_more' }));
      await fireEvent.click(screen.getByRole('menuitem', { name: 'progress_mark_reference' }));

      expect(reference.mock.calls[0][0].detail).toEqual({ link, value: true });
    });

    it('unmarking inside a reference collection keeps it pending there', async () => {
      const reference = vi.fn();
      render(LinkCard, { props: { link, reference: true, collectionReference: true }, events: { reference } });

      await fireEvent.click(screen.getByRole('button', { name: 'progress_more' }));
      await fireEvent.click(screen.getByRole('menuitem', { name: 'progress_unmark_reference' }));

      expect(reference.mock.calls[0][0].detail).toEqual({ link, value: false });
    });

    it('shows the line its meta asks for, and dims a snoozed card', async () => {
      const until = new Date(2026, 8, 28).getTime();
      const { container, rerender } = render(LinkCard, { props: { link, meta: { type: 'kind', kind: 'video', effort: 20 } } });
      expect(screen.getByText('card_kind_effort')).toBeInTheDocument();

      await rerender({ link, meta: { type: 'snoozed', until } });

      expect(screen.getByText('linkcard_snoozed_until')).toBeInTheDocument();
      expect(container.querySelector('.link-card')).toHaveClass('dim');
    });

    it('shows the title even without meta, and the URL when the title is empty', () => {
      render(LinkCard, { props: { link: { ...link, title: '' } } });
      expect(screen.getByText(link.url)).toBeInTheDocument();
    });

    it('still shows reference and snooze without meta', () => {
      const snoozed = { ...link, snoozedUntil: Date.now() + 2 * 86_400_000 };
      render(LinkCard, { props: { link: snoozed, reference: true } });
      expect(screen.getByText('linkcard_reference_badge')).toBeInTheDocument();
    });
  });
});
