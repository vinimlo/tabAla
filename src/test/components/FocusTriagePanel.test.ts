import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import FocusTriagePanel from '@/newtab/components/FocusTriagePanel.svelte';
import { buildTriage } from '@/lib/recommend/triage';
import { createMockCollection, createMockLink } from '../factories';

const now = Date.now();
const collection = createMockCollection({ id: 'c', name: 'Leituras' });
const old = createMockLink({ id: 'old', title: 'Old essay', collectionId: 'c', createdAt: now - 90 * 86_400_000 });

describe('FocusTriagePanel', () => {
  it('previews the first link and opens the triage', async () => {
    const openTriage = vi.fn();
    render(FocusTriagePanel, { props: { items: buildTriage([old], new Map([['c', collection]]), {}, now) }, events: { openTriage } });

    expect(screen.getByText('Old essay')).toBeInTheDocument();
    expect(screen.getByText('focus_triage_waiting_one')).toBeInTheDocument();
    await fireEvent.click(screen.getByRole('button', { name: 'now_triage_now' }));

    expect(openTriage).toHaveBeenCalledTimes(1);
  });

  it('says when there is nothing to triage', () => {
    render(FocusTriagePanel, { props: { items: [] } });
    expect(screen.getByText('triage_empty')).toBeInTheDocument();
  });
});
