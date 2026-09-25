/**
 * KanbanBoard: progress actions from the cards reach the stores.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import KanbanBoard from '@/newtab/components/KanbanBoard.svelte';
import * as progress from '@/lib/stores/progress';
import { createMockCollection, createMockLink } from '../factories';
const { createStorageMock } = await vi.hoisted(() => import('../mocks/storage'));

vi.mock('@/lib/storage', () => createStorageMock());
vi.mock('svelte-dnd-action', () => ({
  dndzone: () => ({ destroy: () => {} }),
  SOURCES: { POINTER: 'pointer' },
  TRIGGERS: { DROPPED_INTO_ZONE: 'droppedIntoZone' },
}));
vi.mock('@/lib/stores/progress', () => ({
  completeLink: vi.fn(() => Promise.resolve()),
  snoozeLink: vi.fn(() => Promise.resolve()),
  setLinkReference: vi.fn(() => Promise.resolve()),
  recordOpen: vi.fn(() => Promise.resolve()),
  setCollectionFocus: vi.fn(() => Promise.resolve()),
  setCollectionReference: vi.fn(() => Promise.resolve()),
}));

const work = createMockCollection({ id: 'work', name: 'Work', order: 1 });
const link = createMockLink({ id: 'l1', title: 'Paper', url: 'https://example.com/p', collectionId: 'work' });

function renderBoard(events: Record<string, ReturnType<typeof vi.fn>> = {}): void {
  render(KanbanBoard, { props: { collections: [work], linksByCollection: new Map([['work', [link]]]) }, events });
}

describe('KanbanBoard', () => {
  beforeEach(() => vi.clearAllMocks());

  it('completes a link and says so', async () => {
    const success = vi.fn();
    renderBoard({ success });

    await fireEvent.click(screen.getByRole('button', { name: 'progress_complete' }));

    await waitFor(() => expect(success).toHaveBeenCalledTimes(1));
    expect(progress.completeLink).toHaveBeenCalledWith(link);
    expect(success.mock.calls[0][0].detail).toBe('success_link_completed');
  });

  it('records the open when a card is opened', async () => {
    renderBoard();

    await fireEvent.click(screen.getByText('Paper'));

    await waitFor(() => expect(progress.recordOpen).toHaveBeenCalledWith(link));
  });
});
