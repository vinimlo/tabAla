/**
 * Progress actions: what the buttons do to the stores and to storage.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import * as storage from '@/lib/storage';
import { linksStore, linksByCollection } from '@/lib/stores/links';
import { activityStore } from '@/lib/stores/activity';
import {
  completeLink, discardLink, dismissAsk, keepLink, recordOpen, restoreLink, setCollectionFocus,
  setCollectionReference, setLinkReference, snoozeLink, undoDiscard,
} from '@/lib/stores/progress';
import type { Link } from '@/lib/types';
import { EMPTY_ACTIVITY } from '@/lib/types';
import { createMockCollection, createMockLink } from '../factories';
const { createStorageMock } = await vi.hoisted(() => import('../mocks/storage'));

vi.mock('@/lib/storage', () => createStorageMock());

const collection = createMockCollection({ id: 'c1' });
const link = createMockLink({ id: 'l1', collectionId: 'c1' });

function seed(links: Link[] = [link]): void {
  linksStore.set({
    links,
    collections: [collection],
    loading: false,
    error: null,
    isAdding: false,
    isRemoving: new Set(),
    pendingLocalUpdate: false,
  });
}

describe('progress actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    seed();
  });

  it('completing takes the link off the board and records the action', async () => {
    await completeLink(link, 1000);

    expect(storage.patchLinkState).toHaveBeenCalledWith('l1', { completedAt: 1000, snoozedUntil: null });
    expect(storage.recordAction).toHaveBeenCalledWith('l1', 'complete', 1000);
    expect(get(linksStore).links[0].completedAt).toBe(1000);
    expect(get(linksByCollection).get('c1')).toEqual([]);
  });

  it('undoing puts the link back in its column', async () => {
    seed([{ ...link, completedAt: 1000 }]);

    await restoreLink({ ...link, completedAt: 1000 });

    expect(storage.patchLinkState).toHaveBeenCalledWith('l1', { completedAt: null });
    expect(get(linksByCollection).get('c1')?.map((l) => l.id)).toEqual(['l1']);
  });

  it('snoozing saves the day it comes back and counts the snooze', async () => {
    await snoozeLink(link, 5000, 1000);

    expect(storage.patchLinkState).toHaveBeenCalledWith('l1', { snoozedUntil: 5000 });
    expect(storage.recordAction).toHaveBeenCalledWith('l1', 'snooze', 1000);
  });

  it('"still worth it" saves when it was answered', async () => {
    await keepLink(link, 1000);

    expect(storage.patchLinkState).toHaveBeenCalledWith('l1', { keptAt: 1000 });
    expect(storage.recordAction).toHaveBeenCalledWith('l1', 'keep', 1000);
  });

  it('marks and unmarks a link as reference', async () => {
    await setLinkReference(link, true, 1000);
    await setLinkReference(link, null, 1000);

    expect(vi.mocked(storage.patchLinkState).mock.calls.map((call) => call[1])).toEqual([{ reference: true }, { reference: null }]);
  });

  it('discarding deletes the link and records the discard', async () => {
    await discardLink(link, 1000);

    expect(storage.removeLink).toHaveBeenCalledWith('l1');
    expect(storage.recordAction).toHaveBeenCalledWith('l1', 'discard', 1000);
  });

  it('undoing a discard puts the same link back', async () => {
    const placed = { ...link, order: 3, keptAt: 7 };
    seed([placed]);
    await discardLink(placed, 1000);

    await undoDiscard(placed);

    expect(storage.insertLink).toHaveBeenCalledWith(placed);
    expect(get(linksStore).links).toEqual([placed]);
  });

  it('"not yet" dismisses the question about a link', async () => {
    await dismissAsk(link);
    expect(storage.dismissAsk).toHaveBeenCalledWith('l1');
  });

  it('opening records the open', async () => {
    await recordOpen(link, 1000);
    expect(storage.recordAction).toHaveBeenCalledWith('l1', 'open', 1000);
  });

  it('a failure to record an open never stops the link from opening', async () => {
    vi.mocked(storage.recordAction).mockRejectedValueOnce(new Error('quota'));
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});

    await expect(recordOpen(link, 1000)).resolves.toBeUndefined();

    expect(log).toHaveBeenCalled();
    log.mockRestore();
  });

  it('collection flags are present or absent, never false', async () => {
    await setCollectionFocus(collection, true);
    await setCollectionReference(collection, false);

    expect(vi.mocked(storage.patchCollectionState).mock.calls).toEqual([['c1', { focus: true }], ['c1', { reference: null }]]);
    expect(get(linksStore).collections[0].focus).toBe(true);
  });

  it('keeps the link as it was when saving fails', async () => {
    vi.mocked(storage.patchLinkState).mockResolvedValueOnce({ success: false, error: 'falhou' });

    await completeLink(link, 1000);

    expect(get(linksStore).links[0].completedAt).toBeUndefined();
    expect(get(linksStore).error).toBe('falhou');
  });
});

describe('activityStore', () => {
  beforeEach(() => vi.clearAllMocks());

  it('reads activity and numbers again after recording', async () => {
    vi.mocked(storage.getActivity).mockResolvedValue({ l1: { ...EMPTY_ACTIVITY, opens: 1 } });

    await activityStore.record('l1', 'open', 1000);

    expect(get(activityStore)).toMatchObject({ loading: false, activity: { l1: { opens: 1 } } });
  });

  it('clearing asks storage to remove usage data', async () => {
    await activityStore.clear();
    expect(storage.clearUsageData).toHaveBeenCalledTimes(1);
  });
});
