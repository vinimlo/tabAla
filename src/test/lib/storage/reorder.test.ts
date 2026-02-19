/**
 * Tests for collection/workspace reorder and orphaned links recovery.
 * Verifies that reordering a subset preserves items not in the reordered set,
 * and that orphaned links are reassigned to Inbox.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { updateCollectionOrder } from '@/lib/storage/collections';
import { updateWorkspaceOrder } from '@/lib/storage/workspaces';
import { recoverOrphanedLinks } from '@/lib/storage/links';
import * as dataAccess from '@/lib/storage/data-access';
import { createMockCollection, createMockWorkspace, createMockLink } from '../../factories';
import { INBOX_COLLECTION_ID, DEFAULT_WORKSPACE_ID } from '@/lib/types';

vi.mock('@/lib/storage/data-access');

beforeEach(() => {
  vi.clearAllMocks();
});

describe('updateCollectionOrder', () => {
  const wsA = 'workspace-a';
  const wsB = 'workspace-b';

  const inbox = createMockCollection({
    id: INBOX_COLLECTION_ID,
    name: 'Inbox',
    order: 0,
    workspaceId: undefined,
  });
  const colA1 = createMockCollection({ id: 'col-a1', name: 'A1', order: 1, workspaceId: wsA });
  const colA2 = createMockCollection({ id: 'col-a2', name: 'A2', order: 2, workspaceId: wsA });
  const colB1 = createMockCollection({ id: 'col-b1', name: 'B1', order: 3, workspaceId: wsB });
  const colB2 = createMockCollection({ id: 'col-b2', name: 'B2', order: 4, workspaceId: wsB });

  beforeEach(() => {
    vi.mocked(dataAccess.getCollections).mockResolvedValue([inbox, colA1, colA2, colB1, colB2]);
    vi.mocked(dataAccess.saveCollections).mockResolvedValue();
  });

  it('should preserve collections from other workspaces when reordering a subset', async () => {
    // Reorder only workspace A collections (reversed)
    const reordered = [colA2, colA1];

    const result = await updateCollectionOrder(reordered);

    expect(result.success).toBe(true);

    const savedCollections = vi.mocked(dataAccess.saveCollections).mock.calls[0][0];

    // All 5 collections must be saved
    expect(savedCollections).toHaveLength(5);

    // Workspace B collections must still exist
    const savedB1 = savedCollections.find((c) => c.id === 'col-b1');
    const savedB2 = savedCollections.find((c) => c.id === 'col-b2');
    expect(savedB1).toBeDefined();
    expect(savedB2).toBeDefined();

    // Workspace B collections keep their original order
    expect(savedB1!.order).toBe(3);
    expect(savedB2!.order).toBe(4);

    // Workspace A collections have new order
    const savedA1 = savedCollections.find((c) => c.id === 'col-a1');
    const savedA2 = savedCollections.find((c) => c.id === 'col-a2');
    expect(savedA2!.order).toBe(0); // was first in reordered array
    expect(savedA1!.order).toBe(1); // was second in reordered array
  });

  it('should preserve inbox when reordering', async () => {
    const reordered = [colA1];

    await updateCollectionOrder(reordered);

    const savedCollections = vi.mocked(dataAccess.saveCollections).mock.calls[0][0];
    const savedInbox = savedCollections.find((c) => c.id === INBOX_COLLECTION_ID);
    expect(savedInbox).toBeDefined();
  });

  it('should not lose any collections when reordering an empty array', async () => {
    await updateCollectionOrder([]);

    const savedCollections = vi.mocked(dataAccess.saveCollections).mock.calls[0][0];
    expect(savedCollections).toHaveLength(5);
  });
});

describe('updateWorkspaceOrder', () => {
  const wsDefault = createMockWorkspace({
    id: DEFAULT_WORKSPACE_ID,
    name: 'Default',
    order: 0,
    isDefault: true,
  });
  const ws1 = createMockWorkspace({ id: 'ws-1', name: 'Workspace 1', order: 1 });
  const ws2 = createMockWorkspace({ id: 'ws-2', name: 'Workspace 2', order: 2 });
  const ws3 = createMockWorkspace({ id: 'ws-3', name: 'Workspace 3', order: 3 });

  beforeEach(() => {
    vi.mocked(dataAccess.getWorkspaces).mockResolvedValue([wsDefault, ws1, ws2, ws3]);
    vi.mocked(dataAccess.saveWorkspaces).mockResolvedValue();
  });

  it('should preserve workspaces not in the reordered subset', async () => {
    // Reorder only ws1 and ws2 (reversed)
    const reordered = [ws2, ws1];

    const result = await updateWorkspaceOrder(reordered);

    expect(result.success).toBe(true);

    const savedWorkspaces = vi.mocked(dataAccess.saveWorkspaces).mock.calls[0][0];

    // All 4 workspaces must be saved
    expect(savedWorkspaces).toHaveLength(4);

    // Default and ws3 must still exist with original order
    const savedDefault = savedWorkspaces.find((w) => w.id === DEFAULT_WORKSPACE_ID);
    const savedWs3 = savedWorkspaces.find((w) => w.id === 'ws-3');
    expect(savedDefault).toBeDefined();
    expect(savedDefault!.order).toBe(0);
    expect(savedWs3).toBeDefined();
    expect(savedWs3!.order).toBe(3);

    // Reordered workspaces have new order
    const savedWs1 = savedWorkspaces.find((w) => w.id === 'ws-1');
    const savedWs2 = savedWorkspaces.find((w) => w.id === 'ws-2');
    expect(savedWs2!.order).toBe(0); // was first in reordered array
    expect(savedWs1!.order).toBe(1); // was second in reordered array
  });

  it('should not lose any workspaces when reordering an empty array', async () => {
    await updateWorkspaceOrder([]);

    const savedWorkspaces = vi.mocked(dataAccess.saveWorkspaces).mock.calls[0][0];
    expect(savedWorkspaces).toHaveLength(4);
  });
});

describe('recoverOrphanedLinks', () => {
  const inbox = createMockCollection({ id: INBOX_COLLECTION_ID, name: 'Inbox', order: 0 });
  const col1 = createMockCollection({ id: 'col-1', name: 'Work', order: 1 });

  beforeEach(() => {
    vi.mocked(dataAccess.saveLinks).mockResolvedValue();
  });

  it('should reassign orphaned links to Inbox', async () => {
    const orphanedLink = createMockLink({ id: 'link-1', collectionId: 'deleted-collection' });
    const normalLink = createMockLink({ id: 'link-2', collectionId: 'col-1' });

    vi.mocked(dataAccess.getLinks).mockResolvedValue([orphanedLink, normalLink]);
    vi.mocked(dataAccess.getCollections).mockResolvedValue([inbox, col1]);

    const count = await recoverOrphanedLinks();

    expect(count).toBe(1);
    const savedLinks = vi.mocked(dataAccess.saveLinks).mock.calls[0][0];
    expect(savedLinks[0].collectionId).toBe(INBOX_COLLECTION_ID);
    expect(savedLinks[1].collectionId).toBe('col-1');
  });

  it('should not write to storage when there are no orphans', async () => {
    const normalLink = createMockLink({ id: 'link-1', collectionId: 'col-1' });

    vi.mocked(dataAccess.getLinks).mockResolvedValue([normalLink]);
    vi.mocked(dataAccess.getCollections).mockResolvedValue([inbox, col1]);

    const count = await recoverOrphanedLinks();

    expect(count).toBe(0);
    expect(dataAccess.saveLinks).not.toHaveBeenCalled();
  });
});
