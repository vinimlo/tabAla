/**
 * The main card of Now (spec §6.1).
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import NowHero from '@/newtab/components/NowHero.svelte';
import type { Recommendation } from '@/lib/recommend/engine';
import { createMockCollection, createMockLink } from '../factories';

const rec: Recommendation = {
  link: createMockLink({ id: 'l1', title: 'Machines of Loving Grace', url: 'https://example.com/essay' }),
  collection: createMockCollection({ id: 'c1', name: 'IA', color: '#6B8AAF' }),
  role: 'revive',
  reason: { type: 'stale', weeks: 3 },
  kind: 'page',
  action: 'read',
  effort: 10,
};

describe('NowHero', () => {
  it('says where it comes from, why, what to do and how long it takes', () => {
    render(NowHero, { props: { rec } });

    for (const text of ['now_context_revive', 'reason_stale_weeks', 'action_read', 'nextup_effort']) {
      expect(screen.getAllByText(text).length).toBeGreaterThan(0);
    }
    expect(screen.getByRole('button', { name: /Machines of Loving Grace/ })).toBeInTheDocument();
  });

  it('shows what is left once reading started', () => {
    render(NowHero, { props: { rec: { ...rec, role: 'continue', reason: { type: 'opened', days: 1 } }, activeMs: 4 * 60_000 } });

    expect(screen.getByText('now_time_left')).toBeInTheDocument();
    expect(screen.getByText('now_ring_spent')).toBeInTheDocument();
  });

  it('shows the URL when the title is empty', () => {
    render(NowHero, { props: { rec: { ...rec, link: { ...rec.link, title: '' } } } });
    expect(screen.getByRole('button', { name: /https:\/\/example.com\/essay/ })).toBeInTheDocument();
  });

  it('opens from the title in this tab, or in a new one with Cmd or Ctrl', async () => {
    const open = vi.fn();
    render(NowHero, { props: { rec }, events: { open } });
    const title = screen.getByRole('button', { name: /Machines of Loving Grace/ });

    await fireEvent.click(title);
    await fireEvent.click(title, { metaKey: true });

    expect(open.mock.calls.map((call) => (call[0] as CustomEvent<{ newTab: boolean }>).detail.newTab)).toEqual([false, true]);
  });

  it('offers to do it now, or to keep going when it was started', async () => {
    const open = vi.fn();
    const { rerender } = render(NowHero, { props: { rec }, events: { open } });
    await fireEvent.click(screen.getByRole('button', { name: 'now_do_read' }));

    await rerender({ rec: { ...rec, role: 'continue', reason: { type: 'opened', days: 1 } } });
    await fireEvent.click(screen.getByRole('button', { name: 'now_continue_read' }));

    expect(open).toHaveBeenCalledTimes(2);
  });

  it('asks "done with it?" with yes and not yet', async () => {
    const complete = vi.fn();
    const dismissAsk = vi.fn();
    render(NowHero, {
      props: { rec: { ...rec, role: 'continue', reason: { type: 'ask', minutes: 25 } } },
      events: { complete, dismissAsk },
    });

    expect(screen.getByText('now_ask_question')).toBeInTheDocument();
    await fireEvent.click(screen.getByRole('button', { name: 'nextup_ask_yes' }));
    await fireEvent.click(screen.getByRole('button', { name: 'nextup_ask_no' }));

    expect(complete.mock.calls[0][0].detail).toEqual(rec.link);
    expect(dismissAsk.mock.calls[0][0].detail).toEqual(rec.link);
  });

  it('completes, snoozes, marks reference, reveals and discards', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 8, 24, 10));
    const handlers = { complete: vi.fn(), snooze: vi.fn(), reference: vi.fn(), reveal: vi.fn(), discard: vi.fn() };
    render(NowHero, { props: { rec }, events: handlers });

    await fireEvent.click(screen.getByRole('button', { name: 'progress_complete' }));
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
