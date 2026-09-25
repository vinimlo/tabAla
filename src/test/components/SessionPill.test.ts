import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import SessionPill from '@/newtab/components/SessionPill.svelte';
import type { SessionView } from '@/lib/recommend/session';

const running: SessionView = { next: [], triageLeft: 0, done: 1, total: 3, position: 2, remainingMs: 12 * 60_000, elapsed: 0.6, timeUp: false, finished: false };

describe('SessionPill', () => {
  it('shows the time left and opens Focus', async () => {
    const open = vi.fn();
    render(SessionPill, { props: { view: running }, events: { open } });

    expect(screen.getByText('session_left')).toBeInTheDocument();
    await fireEvent.click(screen.getByRole('button', { name: /session_title/ }));

    expect(open).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('button', { name: 'session_dismiss' })).toBeNull();
  });

  it('sums up a finished session until it is closed', async () => {
    const dismiss = vi.fn();
    render(SessionPill, { props: { view: { ...running, finished: true, timeUp: true } }, events: { dismiss } });

    expect(screen.getByText('session_ended')).toBeInTheDocument();
    await fireEvent.click(screen.getByRole('button', { name: 'session_dismiss' }));

    expect(dismiss).toHaveBeenCalledTimes(1);
  });
});
