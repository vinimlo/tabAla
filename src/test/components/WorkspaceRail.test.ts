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


  it('opens Focus from its entry', async () => {
    const focus = vi.fn();
    render(WorkspaceRail, { props: { view: 'board' }, events: { focus } });

    await fireEvent.click(screen.getByRole('button', { name: 'focus_open' }));

    expect(focus).toHaveBeenCalledTimes(1);
  });

  it('marks the view on screen, and no workspace while Focus is open', () => {
    render(WorkspaceRail, { props: { view: 'focus' } });

    expect(screen.getByRole('button', { name: 'focus_open' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'nav_board' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: 'Trabalho' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('goes back to the board from its entry and from a workspace', async () => {
    const board = vi.fn();
    render(WorkspaceRail, { props: { view: 'focus' }, events: { board } });

    await fireEvent.click(screen.getByRole('button', { name: 'nav_board' }));
    await fireEvent.click(screen.getByRole('button', { name: 'Trabalho' }));

    expect(board).toHaveBeenCalledTimes(2);
  });

  it('opens the tabs panel with the count of open tabs, and the settings', async () => {
    const toggleTabs = vi.fn();
    const openSettings = vi.fn();
    render(WorkspaceRail, { props: { view: 'board', tabsOpen: false, tabCount: 7 }, events: { toggleTabs, openSettings } });
    const tabs = screen.getByRole('button', { name: 'tabs_sidebar_title' });

    expect(tabs).toHaveAttribute('aria-expanded', 'false');
    expect(tabs).toHaveTextContent('7');
    await fireEvent.click(tabs);
    await fireEvent.click(screen.getByRole('button', { name: 'popup_settings' }));

    expect(toggleTabs).toHaveBeenCalledTimes(1);
    expect(openSettings).toHaveBeenCalledTimes(1);
  });
});
