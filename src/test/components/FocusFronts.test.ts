/**
 * The fronts of the Focus page.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import FocusFronts from '@/newtab/components/FocusFronts.svelte';
import { buildQueue } from '@/lib/recommend/engine';
import { createMockCollection, createMockLink, createMockWorkspace } from '../factories';

const now = Date.now();
const inbox = createMockCollection({ id: 'inbox', name: 'Inbox', order: 0, isDefault: true });
const hermes = createMockCollection({ id: 'h', name: 'Hermes', order: 1, workspaceId: 'ws-a' });
const workspaces = [createMockWorkspace({ id: 'ws-a', name: 'Agentes' })];
const links = [
  createMockLink({ id: 'i1', collectionId: 'inbox', createdAt: now - 86_400_000 }),
  createMockLink({ id: 'h1', collectionId: 'h', createdAt: now - 86_400_000 }),
  createMockLink({ id: 'h2', collectionId: 'h', createdAt: now - 86_400_000 }),
];
// Hermes (2 left) comes before Inbox (1 left).
const { fronts } = buildQueue({ links, collections: [inbox, hermes], activity: {}, now });

describe('FocusFronts', () => {
  it('lists each front with its path, reason and how many are left', () => {
    render(FocusFronts, { props: { fronts, workspaces } });

    expect(screen.getByText('Agentes › Hermes')).toBeInTheDocument();
    expect(screen.getByTitle('focus_front_count_many')).toHaveTextContent('2');
    expect(screen.getAllByText('reason_nearly_done_one')).toHaveLength(1);
  });

  it('pins a front as focus and marks it as reference from its menu', async () => {
    const collectionFocus = vi.fn();
    const collectionReference = vi.fn();
    render(FocusFronts, { props: { fronts, workspaces }, events: { collectionFocus, collectionReference } });

    await fireEvent.click(screen.getAllByRole('button', { name: 'column_pin_focus' })[0]);
    await fireEvent.click(screen.getByRole('button', { name: 'column_menu' }));
    await fireEvent.click(screen.getByRole('menuitem', { name: 'column_mark_reference' }));

    expect(collectionFocus.mock.calls[0][0].detail).toEqual({ collection: hermes, value: true });
    expect(collectionReference.mock.calls[0][0].detail).toEqual({ collection: hermes, value: true });
  });

  it('never offers to turn Inbox into a reference collection', () => {
    render(FocusFronts, { props: { fronts, workspaces } });
    expect(screen.getAllByRole('button', { name: 'column_menu' })).toHaveLength(1);
  });

  it('says when nothing is pending', () => {
    render(FocusFronts, { props: { fronts: [], workspaces } });
    expect(screen.getByText('now_empty_title')).toBeInTheDocument();
  });
});
