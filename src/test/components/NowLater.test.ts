import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import NowLater from '@/newtab/components/NowLater.svelte';
import type { Recommendation } from '@/lib/recommend/engine';
import { createMockCollection, createMockLink } from '../factories';

const collection = createMockCollection({ id: 'c', name: 'Talks' });
const recs: Recommendation[] = ['a', 'b'].map((id) => ({
  link: createMockLink({ id, title: `Talk ${id}`, url: `https://example.com/${id}` }),
  collection,
  role: 'advance',
  reason: { type: 'nextInColumn' },
  kind: 'video',
  action: 'watch',
  effort: 20,
}));

describe('NowLater', () => {
  it('lists the next recommendations and opens or completes them', async () => {
    const open = vi.fn();
    const complete = vi.fn();
    render(NowLater, { props: { recs }, events: { open, complete } });

    await fireEvent.click(screen.getByRole('button', { name: /Talk a/ }));
    await fireEvent.click(screen.getAllByRole('button', { name: 'progress_complete' })[1]);

    expect(open.mock.calls[0][0].detail).toEqual({ link: recs[0].link, newTab: false });
    expect(complete.mock.calls[0][0].detail).toEqual(recs[1].link);
  });

  it('offers the triage only when there is any, and planning a session', async () => {
    const openTriage = vi.fn();
    const openFocus = vi.fn();
    const { rerender } = render(NowLater, { props: { recs, triageCount: 0 }, events: { openTriage, openFocus } });
    expect(screen.queryByRole('button', { name: /now_triage/ })).toBeNull();

    await rerender({ recs, triageCount: 2 });
    await fireEvent.click(screen.getByRole('button', { name: /now_triage_many/ }));
    await fireEvent.click(screen.getByRole('button', { name: /now_plan_session/ }));

    expect(openTriage).toHaveBeenCalledTimes(1);
    expect(openFocus).toHaveBeenCalledTimes(1);
  });

  it('undoes what was just completed', async () => {
    const undo = vi.fn();
    render(NowLater, { props: { recs, justCompleted: recs[0].link }, events: { undo } });

    expect(screen.getByText('now_just_completed')).toBeInTheDocument();
    await fireEvent.click(screen.getByRole('button', { name: 'progress_undo' }));

    expect(undo.mock.calls[0][0].detail).toEqual(recs[0].link);
  });
});
