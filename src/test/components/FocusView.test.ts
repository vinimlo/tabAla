/**
 * The Focus page as a whole (spec §10).
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import FocusView from '@/newtab/components/FocusView.svelte';
import { buildQueue } from '@/lib/recommend/engine';
import { isoWeek } from '@/lib/recommend/dates';
import { EMPTY_WEEK } from '@/lib/types';
import { createMockCollection, createMockLink } from '../factories';

const now = Date.now();
const empty = buildQueue({ links: [], collections: [], activity: {}, now });

describe('FocusView', () => {
  it('opens with the week in one sentence', () => {
    render(FocusView, { props: { queue: empty, links: [], stats: {}, now, workspaces: [] } });

    expect(screen.getByRole('heading', { name: 'focus_title' })).toBeInTheDocument();
    expect(screen.getByText(/focus_week_many/)).toBeInTheDocument();
  });

  it('says whether the queue fell or rose since last week', () => {
    const lastWeek = isoWeek(now - 7 * 86_400_000);
    render(FocusView, { props: { queue: empty, links: [], stats: { [lastWeek]: { ...EMPTY_WEEK, queue: 16 } }, now, workspaces: [] } });

    expect(screen.getByText(/focus_queue_fell/)).toBeInTheDocument();
  });

  it('has the session, triage, week, fronts and completed sections', () => {
    render(FocusView, { props: { queue: empty, links: [], stats: {}, now, workspaces: [] } });

    for (const title of ['focus_session_title', 'focus_triage_title', 'focus_progress_title', 'focus_fronts_title', 'focus_completed_title']) {
      expect(screen.getByRole('heading', { name: title })).toBeInTheDocument();
    }
    expect(screen.getByText('focus_forecast_zero')).toBeInTheDocument();
  });

  it('asks for the triage layer', async () => {
    const openTriage = vi.fn();
    const collection = createMockCollection({ id: 'c', name: 'C' });
    const old = createMockLink({ id: 'old', collectionId: 'c', createdAt: now - 90 * 86_400_000 });
    const queue = buildQueue({ links: [old], collections: [collection], activity: {}, now });
    render(FocusView, { props: { queue, links: [old], stats: {}, now, workspaces: [] }, events: { openTriage } });

    await fireEvent.click(screen.getByRole('button', { name: 'now_triage_now' }));

    expect(openTriage).toHaveBeenCalledTimes(1);
  });
});
