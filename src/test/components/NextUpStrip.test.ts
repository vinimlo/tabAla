/**
 * The next up strip above the board.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import NextUpStrip from '@/newtab/components/NextUpStrip.svelte';
import { buildQueue, type Queue } from '@/lib/recommend/engine';
import type { Link } from '@/lib/types';
import { createMockCollection, createMockLink } from '../factories';

const DAY = 86_400_000;
const now = Date.now();
const collections = ['a', 'b', 'c', 'd'].map((id, i) => createMockCollection({ id, name: `Col ${id}`, order: i + 1 }));
const links = ['a', 'b', 'c', 'd'].map((id) =>
  createMockLink({ id: `${id}1`, title: `Link ${id}`, url: `https://example.com/${id}`, collectionId: id, createdAt: now - DAY }));

function queueOf(list: Link[]): Queue {
  return buildQueue({ links: list, collections, activity: {}, now });
}

describe('NextUpStrip', () => {
  it('shows up to three cards', () => {
    render(NextUpStrip, { props: { queue: queueOf(links), workspaces: [], collapsed: false } });
    expect(screen.getAllByRole('article')).toHaveLength(3);
  });

  it('says when nothing is pending', () => {
    render(NextUpStrip, { props: { queue: queueOf([]), workspaces: [], collapsed: false } });
    expect(screen.getByText('nextup_empty')).toBeInTheDocument();
  });

  it('offers the triage with its count', async () => {
    const old = createMockLink({ id: 'old', collectionId: 'a', createdAt: now - 90 * DAY });
    const openTriage = vi.fn();
    render(NextUpStrip, { props: { queue: queueOf([...links, old]), workspaces: [], collapsed: false }, events: { openTriage } });

    await fireEvent.click(screen.getByRole('button', { name: 'nextup_triage_one' }));

    expect(openTriage).toHaveBeenCalledTimes(1);
  });

  it('hides the cards when collapsed and asks to toggle', async () => {
    const toggleCollapsed = vi.fn();
    render(NextUpStrip, { props: { queue: queueOf(links), workspaces: [], collapsed: true }, events: { toggleCollapsed } });

    expect(screen.queryAllByRole('article')).toHaveLength(0);
    await fireEvent.click(screen.getByRole('button', { name: 'nextup_title' }));
    expect(toggleCollapsed).toHaveBeenCalledTimes(1);
  });

  it('passes on what is done with a card', async () => {
    const complete = vi.fn();
    const openFocus = vi.fn();
    render(NextUpStrip, { props: { queue: queueOf(links), workspaces: [], collapsed: false }, events: { complete, openFocus } });

    await fireEvent.click(screen.getAllByRole('button', { name: /progress_complete/ })[0]);
    await fireEvent.click(screen.getByRole('button', { name: 'focus_title' }));

    expect(complete).toHaveBeenCalledTimes(1);
    expect(openFocus).toHaveBeenCalledTimes(1);
  });
});
