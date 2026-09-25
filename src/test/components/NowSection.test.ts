import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import NowSection from '@/newtab/components/NowSection.svelte';
import { buildQueue, recommendation, type Queue, type Recommendation } from '@/lib/recommend/engine';
import type { Link } from '@/lib/types';
import { createMockCollection, createMockLink } from '../factories';

const DAY = 86_400_000;
const now = Date.now();
const collections = [createMockCollection({ id: 'a', name: 'A', order: 1 })];
const pages = ['p1', 'p2', 'p3', 'p4'].map((id) =>
  createMockLink({ id, title: `Page ${id}`, url: `https://example.com/${id}`, collectionId: 'a', createdAt: now - DAY }));
const queueOf = (links: Link[]): Queue => buildQueue({ links, collections, activity: {}, now });
const props = (links: Link[], extra: Record<string, unknown> = {}): Record<string, unknown> =>
  ({ queue: queueOf(links), links, activity: {}, now, ...extra });

describe('NowSection', () => {
  it('shows one main recommendation and the next ones beside it', () => {
    render(NowSection, { props: props(pages) });

    expect(screen.getByRole('heading', { name: 'now_title' })).toBeInTheDocument();
    expect(screen.getAllByRole('article')).toHaveLength(1);
    expect(screen.getByRole('heading', { name: 'now_later' })).toBeInTheDocument();
  });

  it('shows the week in seven dots', () => {
    const done = createMockLink({ id: 'done', collectionId: 'a', completedAt: now });
    const { container } = render(NowSection, { props: props([...pages, done]) });

    expect(container.querySelectorAll('.dots i')).toHaveLength(7);
    expect(container.querySelectorAll('.dots i.done')).toHaveLength(1);
    expect(screen.getByText('focus_week_one')).toBeInTheDocument();
  });

  it('says when nothing is pending', () => {
    render(NowSection, { props: props([]) });
    expect(screen.getByText('now_empty_title')).toBeInTheDocument();
  });

  it('asks for the triage first when only idle links are left', async () => {
    const openTriage = vi.fn();
    const old = createMockLink({ id: 'old', collectionId: 'a', createdAt: now - 90 * DAY });
    render(NowSection, { props: props([old]), events: { openTriage } });

    expect(screen.getByText('now_only_triage')).toBeInTheDocument();
    await fireEvent.click(screen.getByRole('button', { name: 'now_triage_now' }));

    expect(openTriage).toHaveBeenCalledTimes(1);
  });

  it('collapses to one line and asks to toggle', async () => {
    const toggleCollapsed = vi.fn();
    render(NowSection, { props: props(pages, { collapsed: true }), events: { toggleCollapsed } });

    expect(screen.queryByRole('article')).toBeNull();
    expect(screen.getByText(/Page p1/)).toBeInTheDocument();
    await fireEvent.click(screen.getByRole('button', { name: 'now_toggle' }));

    expect(toggleCollapsed).toHaveBeenCalledTimes(1);
  });
  it('follows the session in progress', () => {
    const rec = (link: Link): Recommendation => recommendation(link, collections[0], 'advance', { type: 'nextInColumn' }, 10);
    const session = { current: rec(pages[1]), next: [rec(pages[2])], triageLeft: 0, done: 1, total: 3, position: 2, remainingMs: 600_000, elapsed: 0.5, timeUp: false, finished: false };
    render(NowSection, { props: props(pages, { session }) });

    expect(screen.getByText('now_session_position')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'now_later_session' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Page p2/ })).toBeInTheDocument();
  });
});
