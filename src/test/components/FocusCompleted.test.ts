/**
 * Completed links, by week, with undo.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import FocusCompleted from '@/newtab/components/FocusCompleted.svelte';
import { createMockLink } from '../factories';

const at = (day: number): number => new Date(2026, 8, day, 10).getTime();
const done = createMockLink({ id: 'a', title: 'Finished talk', completedAt: at(23) });
const pending = createMockLink({ id: 'b', title: 'Still open' });

describe('FocusCompleted', () => {
  it('lists completed links by week and undoes a completion', async () => {
    const restore = vi.fn();
    const { container } = render(FocusCompleted, { props: { links: [done, pending], now: at(30) }, events: { restore } });

    expect(screen.getByText('Finished talk')).toBeInTheDocument();
    expect(screen.queryByText('Still open')).toBeNull();
    expect(screen.getByText('focus_week_of')).toBeInTheDocument();
    expect(container.querySelector('[data-link-id="a"]')).not.toBeNull();

    await fireEvent.click(screen.getByRole('button', { name: 'progress_undo' }));

    expect(restore.mock.calls[0][0].detail).toEqual(done);
  });

  it('names the current week', () => {
    render(FocusCompleted, { props: { links: [done], now: at(24) } });
    expect(screen.getByText('focus_completed_this_week')).toBeInTheDocument();
  });

  it('shows two weeks, and all of them on request', async () => {
    const older = [9, 14].map((day) => createMockLink({ id: `d${day}`, title: `Done ${day}`, completedAt: at(day) }));
    render(FocusCompleted, { props: { links: [done, ...older], now: at(24) } });

    expect(screen.queryByText('Done 9')).toBeNull();
    await fireEvent.click(screen.getByRole('button', { name: 'focus_completed_all' }));

    expect(screen.getByText('Done 9')).toBeInTheDocument();
  });

  it('says when nothing was completed yet', () => {
    render(FocusCompleted, { props: { links: [pending], now: at(24) } });
    expect(screen.getByText('focus_completed_empty')).toBeInTheDocument();
  });
});
