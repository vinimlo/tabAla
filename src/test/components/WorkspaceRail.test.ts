/**
 * The workspace rail and its Focus entry.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import WorkspaceRail from '@/newtab/components/WorkspaceRail.svelte';
import { workspacesStore } from '@/lib/stores/workspaces';
import { createMockWorkspace } from '../factories';
const { createStorageMock } = await vi.hoisted(() => import('../mocks/storage'));

vi.mock('@/lib/storage', () => createStorageMock());

const work = createMockWorkspace({ id: 'ws-work', name: 'Trabalho' });

describe('WorkspaceRail', () => {
  beforeEach(() => {
    workspacesStore.set({ workspaces: [work], activeWorkspaceId: 'ws-work', loading: false, error: null, pendingLocalUpdate: false });
  });

  it('opens Focus from its entry at the top', async () => {
    const focus = vi.fn();
    render(WorkspaceRail, { props: { focusActive: false }, events: { focus } });

    await fireEvent.click(screen.getByRole('button', { name: 'focus_open' }));

    expect(focus).toHaveBeenCalledTimes(1);
  });

  it('while Focus is open, no workspace looks selected', () => {
    render(WorkspaceRail, { props: { focusActive: true } });

    expect(screen.getByRole('button', { name: 'focus_open' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Trabalho' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('choosing a workspace goes back to the board', async () => {
    const board = vi.fn();
    render(WorkspaceRail, { props: { focusActive: true }, events: { board } });

    await fireEvent.click(screen.getByRole('button', { name: 'Trabalho' }));

    expect(board).toHaveBeenCalledTimes(1);
  });
});
