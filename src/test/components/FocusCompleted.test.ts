/**
 * Completed links, grouped by week, with undo.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import FocusCompleted from '@/newtab/components/FocusCompleted.svelte';
import { createMockLink } from '../factories';

const done = createMockLink({ id: 'a', title: 'Finished talk', completedAt: new Date(2026, 8, 23).getTime() });
const pending = createMockLink({ id: 'b', title: 'Still open' });

describe('FocusCompleted', () => {
  it('lists completed links by week and undoes a completion', async () => {
    const restore = vi.fn();
    const { container } = render(FocusCompleted, { props: { links: [done, pending] }, events: { restore } });

    expect(screen.getByText('Finished talk')).toBeInTheDocument();
    expect(screen.queryByText('Still open')).toBeNull();
    expect(screen.getByText('focus_week_of')).toBeInTheDocument();
    expect(container.querySelector('[data-link-id="a"]')).not.toBeNull();

    await fireEvent.click(screen.getByRole('button', { name: 'progress_undo' }));

    expect(restore.mock.calls[0][0].detail).toEqual(done);
  });

  it('says when nothing was completed yet', () => {
    render(FocusCompleted, { props: { links: [pending] } });
    expect(screen.getByText('focus_completed_empty')).toBeInTheDocument();
  });
});
