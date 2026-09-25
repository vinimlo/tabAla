/**
 * Recommendation storage: link and collection state, activity and numbers.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { chromeMock, clearMockStorage } from '../../setup';
import {
  exportData, getCollections, getLinks, initializeInbox, removeCollection, saveCollections, saveLinks,
} from '@/lib/storage';
import {
  clearAsks, clearUsageData, dismissAsk, getActivity, getRecoStats, patchCollectionState, patchLinkState,
  recordAction, recordBrowsingOpen, recordShown, recordVisit,
} from '@/lib/storage/progress';
import { isoWeek } from '@/lib/recommend/dates';
import { createMockCollection, createMockLink } from '../../factories';

const DAY = 86_400_000;
const now = new Date(2026, 8, 24, 10).getTime();
const week = isoWeek(now);

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

describe('recordAction', () => {
  beforeEach(() => clearMockStorage());

  it('counts opens and remembers each day once', async () => {
    await recordAction('l1', 'open', now);
    await recordAction('l1', 'open', now + 60_000);

    expect((await getActivity()).l1).toMatchObject({ opens: 2, lastOpenedAt: now + 60_000, openDays: ['2026-09-24'] });
  });

  it('counts acting on a link the strip showed once, and clears what it showed', async () => {
    await recordShown(['l1'], [], 5, now);
    await recordAction('l1', 'open', now);
    await recordAction('l1', 'complete', now);

    expect((await getRecoStats())[week]).toMatchObject({ shown: 1, acted: 1 });
    expect((await getActivity()).l1.shownDays).toEqual([]);
  });

  it('counts snoozes, and "still worth it" starts over', async () => {
    await recordAction('l1', 'snooze', now);
    await recordAction('l1', 'snooze', now);
    expect((await getActivity()).l1.snoozes).toBe(2);
    expect((await getRecoStats())[week].snoozed).toBe(2);

    await recordAction('l1', 'keep', now);
    expect((await getActivity()).l1.snoozes).toBe(0);
  });

  it('forgets a discarded link and counts the discard', async () => {
    await recordAction('l1', 'open', now);
    await recordAction('l1', 'discard', now);

    expect((await getActivity()).l1).toBeUndefined();
    expect((await getRecoStats())[week].discarded).toBe(1);
  });
});

describe('recordShown', () => {
  beforeEach(() => clearMockStorage());

  it('records each link once per day and the queue size of the week', async () => {
    await recordShown(['l1', 'l2'], [], 7, now);
    await recordShown(['l1', 'l2'], [], 7, now + 3_600_000);

    expect((await getActivity()).l1.shownDays).toEqual(['2026-09-24']);
    expect((await getRecoStats())[week]).toMatchObject({ shown: 2, queue: 7 });
  });

  it('counts a link as shown once per day, even after acting on it and seeing it again', async () => {
    await recordShown(['l1'], [], 7, now);
    await recordAction('l1', 'open', now);
    await recordShown(['l1'], [], 7, now + 60_000);

    expect((await getRecoStats())[week]).toMatchObject({ shown: 1, acted: 1 });
  });

  it('writes nothing when nothing changed', async () => {
    await recordShown(['l1'], [], 7, now);
    const writes = chromeMock.storage.local.set.mock.calls.length;

    await recordShown(['l1'], [], 7, now);

    expect(chromeMock.storage.local.set.mock.calls.length).toBe(writes);
  });

  it('counts a link leaving the strip only once', async () => {
    await recordShown([], ['l1'], 7, now);
    await recordShown([], ['l1'], 7, now + DAY);

    const skipped = Object.values(await getRecoStats()).reduce((total, w) => total + w.skipped, 0);
    expect(skipped).toBe(1);
  });

  it('keeps the numbers of the last 12 weeks', async () => {
    for (let i = 0; i < 14; i += 1) {
      await recordShown([`l${i}`], [], i, now + i * 7 * DAY);
    }
    expect(Object.keys(await getRecoStats())).toHaveLength(12);
  });
});

describe('clearUsageData', () => {
  beforeEach(() => clearMockStorage());

  it('removes activity and numbers, never links', async () => {
    await saveLinks([createMockLink({ id: 'l1' })]);
    await recordAction('l1', 'open', now);

    await clearUsageData();

    expect(await getActivity()).toEqual({});
    expect(await getRecoStats()).toEqual({});
    expect(await getLinks()).toHaveLength(1);
  });

  it('usage data never goes into an export', async () => {
    await recordAction('l1', 'open', now);
    expect(Object.keys(await exportData())).not.toContain('activity');
  });
});

describe('browsing signals', () => {
  beforeEach(() => clearMockStorage());
  const MIN = 60_000;

  it('records an open seen in the browser, once per minute', async () => {
    await recordBrowsingOpen(['l1', 'l2'], now);
    await recordBrowsingOpen(['l1'], now + 30_000);

    const activity = await getActivity();
    expect(activity.l1.opens).toBe(1);
    expect(activity.l2.opens).toBe(1);
  });

  it('does not count again an open TabAla recorded a moment ago', async () => {
    await recordAction('l1', 'open', now);
    await recordBrowsingOpen(['l1'], now + 5_000);

    expect((await getActivity()).l1.opens).toBe(1);
  });

  it('counts opening a link the strip showed as acting on it', async () => {
    await recordShown(['l1'], [], 3, now);
    await recordBrowsingOpen(['l1'], now);

    expect((await getRecoStats())[week].acted).toBe(1);
  });

  it('adds the time of a visit, at most 30 minutes', async () => {
    await recordVisit(['l1'], 10 * MIN, null, now);
    await recordVisit(['l1'], 8 * 60 * MIN, null, now);

    expect((await getActivity()).l1.activeMs).toBe(40 * MIN);
  });

  it('asks "completed?" when a visit that ended reaches the threshold', async () => {
    await recordVisit(['l1', 'l2'], 6 * MIN, { l1: 5 * MIN, l2: 20 * MIN }, now);

    const activity = await getActivity();
    expect(activity.l1.askCompleteAt).toBe(now);
    expect(activity.l2.askCompleteAt).toBeUndefined();
  });

  it('"not yet" holds until new time, beyond the answer, reaches the threshold again', async () => {
    await recordVisit(['l1'], 6 * MIN, { l1: 5 * MIN }, now);
    await dismissAsk('l1');

    await recordVisit(['l1'], MIN, { l1: 5 * MIN }, now + 1);
    expect((await getActivity()).l1.askCompleteAt).toBeUndefined();

    await recordVisit(['l1'], 5 * MIN, { l1: 5 * MIN }, now + 2);
    expect((await getActivity()).l1.askCompleteAt).toBe(now + 2);
  });

  it('"not yet" clears one question; turning learning off clears them all', async () => {
    await recordVisit(['l1', 'l2'], 6 * MIN, { l1: MIN, l2: MIN }, now);

    await dismissAsk('l1');
    expect((await getActivity()).l1.askCompleteAt).toBeUndefined();

    await clearAsks();
    expect((await getActivity()).l2.askCompleteAt).toBeUndefined();
    expect((await getActivity()).l2.activeMs).toBe(6 * MIN);
  });
});
