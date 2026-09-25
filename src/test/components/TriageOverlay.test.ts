/**
 * The triage layer: one decision at a time, by button or key (spec §9).
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import { tick } from 'svelte';
import TriageOverlay from '@/newtab/components/TriageOverlay.svelte';
import { buildTriage } from '@/lib/recommend/triage';
import { createMockCollection, createMockLink } from '../factories';

const DAY = 86_400_000;
const now = Date.now();
const collection = createMockCollection({ id: 'c', name: 'Leituras' });
const old = createMockLink({ id: 'old', title: 'Old essay', collectionId: 'c', createdAt: now - 90 * DAY });
const older = createMockLink({ id: 'older', title: '', url: 'file:///notes/x.html', collectionId: 'c', createdAt: now - 120 * DAY });
const items = buildTriage([old, older], new Map([['c', collection]]), {}, now);

describe('TriageOverlay', () => {
  it('shows one link at a time, why it is here and how far along the triage is', () => {
    render(TriageOverlay, { props: { items } });

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('triage_reason_stale')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'file:///notes/x.html' })).toBeInTheDocument();
    expect(screen.getByText('triage_progress')).toBeInTheDocument();
    expect(screen.queryByText('Old essay')).toBeNull();
  });

  it.each([['1', 'keep'], ['2', 'discard'], ['3', 'reference'], ['4', 'complete']])('key %s decides %s', async (key, event) => {
    const handler = vi.fn();
    render(TriageOverlay, { props: { items }, events: { [event]: handler } });

    await fireEvent.keyDown(window, { key });

    expect(handler.mock.calls[0][0].detail.id).toBe('older');
  });

  it('decides with the buttons too', async () => {
    const keep = vi.fn();
    render(TriageOverlay, { props: { items }, events: { keep } });

    await fireEvent.click(screen.getByRole('button', { name: /triage_keep/ }));

    expect(keep).toHaveBeenCalledTimes(1);
  });

  it('never decides the same link twice while the list catches up', async () => {
    const keep = vi.fn();
    const discard = vi.fn();
    render(TriageOverlay, { props: { items }, events: { keep, discard } });

    await fireEvent.keyDown(window, { key: '1' });
    await fireEvent.keyDown(window, { key: '2' });

    expect(keep.mock.calls[0][0].detail.id).toBe('older');
    expect(discard.mock.calls[0][0].detail.id).toBe('old');
  });

  it('ignores the keys while typing in a field', async () => {
    const keep = vi.fn();
    render(TriageOverlay, { props: { items }, events: { keep } });
    const input = document.createElement('input');
    document.body.appendChild(input);

    await fireEvent.keyDown(input, { key: '1' });

    input.remove();
    expect(keep).not.toHaveBeenCalled();
  });

  it('ignores the keys while another dialog or a menu is open', async () => {
    const keep = vi.fn();
    render(TriageOverlay, { props: { items }, events: { keep } });
    const menu = document.createElement('div');
    menu.setAttribute('role', 'menu');
    document.body.appendChild(menu);

    await fireEvent.keyDown(window, { key: '1' });

    menu.remove();
    expect(keep).not.toHaveBeenCalled();
  });

  it('a held key decides only once', async () => {
    const discard = vi.fn();
    render(TriageOverlay, { props: { items }, events: { discard } });

    await fireEvent.keyDown(window, { key: '2' });
    await fireEvent.keyDown(window, { key: '2', repeat: true });

    expect(discard).toHaveBeenCalledTimes(1);
  });

  it('keeps the opened link on screen, so the next decision is about it', async () => {
    const open = vi.fn();
    const discard = vi.fn();
    const { rerender } = render(TriageOverlay, { props: { items, links: [old, older] }, events: { open, discard } });

    await fireEvent.click(screen.getByRole('button', { name: 'file:///notes/x.html' }));
    // Opening renews the link, so it leaves the triage list.
    await rerender({ items: items.filter((item) => item.link.id !== 'older'), links: [old, older] });
    await fireEvent.keyDown(window, { key: '2' });

    expect(open.mock.calls[0][0].detail).toEqual({ link: older, newTab: true });
    expect(discard.mock.calls[0][0].detail.id).toBe('older');
  });

  it('moves the focus to Close when the last link is decided, so Enter ends it', async () => {
    render(TriageOverlay, { props: { items } });

    await fireEvent.keyDown(window, { key: '1' });
    await fireEvent.keyDown(window, { key: '1' });
    await tick();

    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'common_close' }));
  });

  it('sums up the decisions at the end', async () => {
    const { rerender } = render(TriageOverlay, { props: { items } });

    await fireEvent.keyDown(window, { key: '1' });
    await fireEvent.keyDown(window, { key: '4' });
    await rerender({ items: [] });

    expect(screen.getByText('triage_done_title')).toBeInTheDocument();
    expect(screen.getByText('triage_count_kept_one, triage_count_completed_one')).toBeInTheDocument();
  });

  it('closes with Escape and from its button', async () => {
    const close = vi.fn();
    render(TriageOverlay, { props: { items: [] }, events: { close } });

    expect(screen.getByText('triage_empty')).toBeInTheDocument();
    await fireEvent.keyDown(window, { key: 'Escape' });
    await fireEvent.click(screen.getByRole('button', { name: 'common_close' }));

    expect(close).toHaveBeenCalledTimes(2);
  });
});
