/**
 * Recommendation storage: link and collection state, activity and numbers.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { clearMockStorage } from '../../setup';
import { getCollections, getLinks, initializeInbox, removeCollection, saveCollections, saveLinks } from '@/lib/storage';
import { patchCollectionState, patchLinkState } from '@/lib/storage/progress';
import { createMockCollection, createMockLink } from '../../factories';

describe('patchLinkState', () => {
  beforeEach(() => clearMockStorage());

  it('sets the fields it is given and removes the ones set to null', async () => {
    await saveLinks([createMockLink({ id: 'l1', snoozedUntil: 5 }), createMockLink({ id: 'l2' })]);

    expect(await patchLinkState('l1', { completedAt: 100, snoozedUntil: null })).toEqual({ success: true });

    const [first, second] = await getLinks();
    expect(first.completedAt).toBe(100);
    expect('snoozedUntil' in first).toBe(false);
    expect(second.completedAt).toBeUndefined();
  });

  it('reports a link that no longer exists', async () => {
    await saveLinks([]);
    expect(await patchLinkState('gone', { completedAt: 1 })).toEqual({ success: false, error: 'storage_link_not_found' });
  });
});

describe('patchCollectionState', () => {
  beforeEach(() => clearMockStorage());

  it('pins and unpins a collection as focus', async () => {
    await saveCollections([createMockCollection({ id: 'c1' })]);

    await patchCollectionState('c1', { focus: true });
    expect((await getCollections())[0].focus).toBe(true);

    await patchCollectionState('c1', { focus: null });
    expect('focus' in (await getCollections())[0]).toBe(false);
  });

  it('reports a collection that no longer exists', async () => {
    await saveCollections([]);
    expect(await patchCollectionState('gone', { reference: true })).toEqual({ success: false, error: 'storage_collection_not_found' });
  });
});

describe('completed links and deleted collections', () => {
  beforeEach(() => clearMockStorage());

  // Regression pin (spec §4): already true before this task, must stay true.
  it('a completed link of a deleted collection goes to Inbox and stays completed', async () => {
    await initializeInbox();
    await saveCollections([...(await getCollections()), createMockCollection({ id: 'c1', order: 1 })]);
    await saveLinks([createMockLink({ id: 'l1', collectionId: 'c1', completedAt: 5 })]);

    await removeCollection('c1');

    expect((await getLinks())[0]).toMatchObject({ collectionId: 'inbox', completedAt: 5 });
  });
});
