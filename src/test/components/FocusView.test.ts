/**
 * The Focus space as a whole.
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import FocusView from '@/newtab/components/FocusView.svelte';
import { buildQueue } from '@/lib/recommend/engine';

const now = Date.now();

describe('FocusView', () => {
  it('shows its progress even with nothing saved', () => {
    render(FocusView, { props: { queue: buildQueue({ links: [], collections: [], activity: {}, now }), links: [], stats: {}, now, workspaces: [] } });

    expect(screen.getByText(/focus_week_many/)).toBeInTheDocument();
    expect(screen.getByText(/focus_queue/)).toBeInTheDocument();
  });

  it('has the triage, fronts and completed sections', () => {
    render(FocusView, { props: { queue: buildQueue({ links: [], collections: [], activity: {}, now }), links: [], stats: {}, now, workspaces: [] } });

    for (const title of ['focus_triage_title', 'focus_fronts_title', 'focus_completed_title']) {
      expect(screen.getByRole('heading', { name: title })).toBeInTheDocument();
    }
  });
});
