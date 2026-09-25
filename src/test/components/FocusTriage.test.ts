/**
 * Triage in the Focus space: one decision at a time, by button or key.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import FocusTriage from '@/newtab/components/FocusTriage.svelte';
import { buildTriage } from '@/lib/recommend/triage';
import { createMockCollection, createMockLink } from '../factories';

const DAY = 86_400_000;
const now = Date.now();
const collection = createMockCollection({ id: 'c', name: 'Leituras' });
const old = createMockLink({ id: 'old', title: 'Old essay', collectionId: 'c', createdAt: now - 90 * DAY });
const older = createMockLink({ id: 'older', title: '', url: 'file:///notes/x.html', collectionId: 'c', createdAt: now - 120 * DAY });
const items = buildTriage([old, older], new Map([['c', collection]]), {}, now);

describe('FocusTriage', () => {
  it('shows one link at a time, with why it is here', () => {
    render(FocusTriage, { props: { items, workspaces: [] } });

    expect(screen.getByText('triage_reason_stale')).toBeInTheDocument();
    expect(screen.getByText('file:///notes/x.html')).toBeInTheDocument();
    expect(screen.getByText('triage_left_many')).toBeInTheDocument();
    expect(screen.queryByText('Old essay')).toBeNull();
  });

  it.each([['1', 'keep'], ['2', 'discard'], ['3', 'reference'], ['4', 'complete']])('key %s decides %s', async (key, event) => {
    const handler = vi.fn();
    render(FocusTriage, { props: { items, workspaces: [] }, events: { [event]: handler } });

    await fireEvent.keyDown(window, { key });

    expect(handler.mock.calls[0][0].detail.id).toBe('older');
  });

  it('decides with the buttons too', async () => {
    const keep = vi.fn();
    render(FocusTriage, { props: { items, workspaces: [] }, events: { keep } });

    await fireEvent.click(screen.getByRole('button', { name: /triage_keep/ }));

    expect(keep).toHaveBeenCalledTimes(1);
  });

  it('ignores the keys while typing in a field', async () => {
    const keep = vi.fn();
    render(FocusTriage, { props: { items, workspaces: [] }, events: { keep } });
    const input = document.createElement('input');
    document.body.appendChild(input);

    await fireEvent.keyDown(input, { key: '1' });

    input.remove();
    expect(keep).not.toHaveBeenCalled();
  });

  it('ignores the keys while a dialog is open', async () => {
    const keep = vi.fn();
    render(FocusTriage, { props: { items, workspaces: [], keyboard: false }, events: { keep } });

    await fireEvent.keyDown(window, { key: '1' });

    expect(keep).not.toHaveBeenCalled();
  });

  it('keeps the opened link on screen, so the next decision is about it', async () => {
    const open = vi.fn();
    const discard = vi.fn();
    const { rerender } = render(FocusTriage, {
      props: { items, workspaces: [], links: [old, older] },
      events: { open, discard },
    });

    await fireEvent.click(screen.getByRole('button', { name: 'file:///notes/x.html' }));
    // Opening renews the link, so it leaves the triage list.
    await rerender({ items: items.filter((item) => item.link.id !== 'older'), workspaces: [], links: [old, older] });
    await fireEvent.keyDown(window, { key: '2' });

    expect(open).toHaveBeenCalledTimes(1);
    expect(discard.mock.calls[0][0].detail.id).toBe('older');
  });

  it('a held key decides only once', async () => {
    const discard = vi.fn();
    render(FocusTriage, { props: { items, workspaces: [] }, events: { discard } });

    await fireEvent.keyDown(window, { key: '2' });
    await fireEvent.keyDown(window, { key: '2', repeat: true });

    expect(discard).toHaveBeenCalledTimes(1);
  });

  it('ignores the keys while any dialog or menu is open', async () => {
    const keep = vi.fn();
    render(FocusTriage, { props: { items, workspaces: [] }, events: { keep } });
    const dialog = document.createElement('div');
    dialog.setAttribute('role', 'dialog');
    document.body.appendChild(dialog);

    await fireEvent.keyDown(window, { key: '1' });

    dialog.remove();
    expect(keep).not.toHaveBeenCalled();
  });

  it('says when there is nothing to triage', () => {
    render(FocusTriage, { props: { items: [], workspaces: [] } });
    expect(screen.getByText('triage_empty')).toBeInTheDocument();
  });
});
