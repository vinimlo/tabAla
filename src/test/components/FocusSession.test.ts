/**
 * The session planner of the Focus page.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import FocusSession from '@/newtab/components/FocusSession.svelte';
import { buildQueue, type Queue } from '@/lib/recommend/engine';
import type { Link } from '@/lib/types';
import { createMockCollection, createMockLink } from '../factories';

const DAY = 86_400_000;
const now = Date.now();
const collections = [createMockCollection({ id: 'a', name: 'A', order: 1 })];
const pages = ['p1', 'p2', 'p3', 'p4'].map((id) =>
  createMockLink({ id, title: `Page ${id}`, url: `https://example.com/${id}`, collectionId: 'a', createdAt: now - DAY }));
const queueOf = (links: Link[]): Queue => buildQueue({ links, collections, activity: {}, now });

async function pick(index: number): Promise<void> {
  await fireEvent.click(screen.getAllByRole('radio', { name: 'focus_session_minutes' })[index]);
}

describe('FocusSession', () => {
  it('lays out a session for the chosen time, with the minute each step starts', async () => {
    render(FocusSession, { props: { queue: queueOf(pages) } });
    await pick(1);

    expect(screen.getAllByRole('listitem')).toHaveLength(3);
    expect(screen.getAllByText('focus_session_at')).toHaveLength(3);
    expect(screen.getByText('focus_session_budget')).toBeInTheDocument();
  });

  it('opens the next link in a new tab', async () => {
    const open = vi.fn();
    render(FocusSession, { props: { queue: queueOf(pages) }, events: { open } });
    await pick(1);

    await fireEvent.click(screen.getByRole('button', { name: 'focus_session_next' }));

    expect(open.mock.calls[0][0].detail).toEqual({ link: pages[0], newTab: true });
  });

  it('completes a link from the list', async () => {
    const complete = vi.fn();
    render(FocusSession, { props: { queue: queueOf(pages) }, events: { complete } });
    await pick(0);

    await fireEvent.click(screen.getByRole('button', { name: 'progress_complete' }));

    expect(complete.mock.calls[0][0].detail.id).toBe('p1');
  });

  it('starts with the triage when there is any', async () => {
    const old = createMockLink({ id: 'old', collectionId: 'a', createdAt: now - 90 * DAY });
    const openTriage = vi.fn();
    render(FocusSession, { props: { queue: queueOf([...pages, old]) }, events: { openTriage } });
    await pick(0);

    await fireEvent.click(screen.getByRole('button', { name: /focus_session_triage_one/ }));

    expect(openTriage).toHaveBeenCalledTimes(1);
  });

  it('says when there is nothing to do', async () => {
    render(FocusSession, { props: { queue: queueOf([]) } });
    await pick(2);
    expect(screen.getByText('focus_session_empty')).toBeInTheDocument();
  });
});
