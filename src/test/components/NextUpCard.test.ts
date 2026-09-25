/**
 * One recommendation card of the next up strip.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import NextUpCard from '@/newtab/components/NextUpCard.svelte';
import type { Recommendation } from '@/lib/recommend/engine';
import { createMockCollection, createMockLink } from '../factories';

const rec: Recommendation = {
  link: createMockLink({ id: 'l1', title: 'Machines of Loving Grace', url: 'https://example.com/essay' }),
  collection: createMockCollection({ id: 'c1', name: 'IA' }),
  role: 'revive',
  reason: { type: 'stale', weeks: 3 },
  kind: 'page',
  action: 'read',
  effort: 10,
};

describe('NextUpCard', () => {
  it('shows role, path, reason, action, title and effort', () => {
    render(NextUpCard, { props: { rec, path: 'Leituras › IA' } });

    for (const text of ['nextup_role_revive', 'Leituras › IA', 'reason_stale_weeks', 'action_read', 'Machines of Loving Grace', 'nextup_effort']) {
      expect(screen.getByText(text)).toBeInTheDocument();
    }
  });

  it('shows the URL when the title is empty', () => {
    render(NextUpCard, { props: { rec: { ...rec, link: { ...rec.link, title: '' } }, path: 'x' } });
    expect(screen.getByText('https://example.com/essay')).toBeInTheDocument();
  });

  it('opens in this tab, or in a new one with Cmd or Ctrl', async () => {
    const open = vi.fn();
    render(NextUpCard, { props: { rec, path: 'x' }, events: { open } });
    const main = screen.getByRole('button', { name: /Machines of Loving Grace/ });

    await fireEvent.click(main);
    await fireEvent.click(main, { metaKey: true });

    expect(open.mock.calls.map((call) => (call[0] as CustomEvent<{ newTab: boolean }>).detail.newTab)).toEqual([false, true]);
  });

  it('completes, snoozes, marks reference, reveals and discards', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 8, 24, 10));
    const handlers = { complete: vi.fn(), snooze: vi.fn(), reference: vi.fn(), reveal: vi.fn(), discard: vi.fn() };
    render(NextUpCard, { props: { rec, path: 'x' }, events: handlers });

    await fireEvent.click(screen.getByRole('button', { name: /progress_complete/ }));
    await fireEvent.click(screen.getByRole('button', { name: 'progress_snooze' }));
    await fireEvent.click(screen.getByRole('menuitem', { name: 'progress_snooze_tomorrow' }));
    for (const [item, handler] of [
      ['progress_mark_reference', handlers.reference],
      ['progress_reveal', handlers.reveal],
      ['progress_discard', handlers.discard],
    ] as const) {
      await fireEvent.click(screen.getByRole('button', { name: 'progress_more' }));
      await fireEvent.click(screen.getByRole('menuitem', { name: item }));
      expect(handler.mock.calls[0][0].detail).toEqual(rec.link);
    }
    vi.useRealTimers();

    expect(handlers.complete.mock.calls[0][0].detail).toEqual(rec.link);
    expect(handlers.snooze.mock.calls[0][0].detail).toEqual({ link: rec.link, until: new Date(2026, 8, 25).getTime() });
  });
});
