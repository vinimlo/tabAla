/**
 * Recommendation engine: fronts, the strip's three slots and the queue.
 */
import { describe, it, expect } from 'vitest';
import { buildQueue } from '@/lib/recommend/engine';
import { dayKey } from '@/lib/recommend/dates';
import { EMPTY_ACTIVITY, type Activity, type Collection, type Link, type LinkActivity } from '@/lib/types';
import { createMockCollection, createMockLink } from '../../factories';

const DAY = 86_400_000;
const now = new Date(2026, 8, 24, 10).getTime();
const daysAgo = (days: number): number => now - days * DAY;

function col(id: string, order: number, extra: Partial<Collection> = {}): Collection {
  return createMockCollection({ id, name: id, order, workspaceId: 'ws', ...extra });
}

function link(id: string, collectionId: string, extra: Partial<Link> = {}): Link {
  return createMockLink({ id, title: id, url: `https://example.com/${id}`, collectionId, createdAt: daysAgo(1), ...extra });
}

function opened(days: number): LinkActivity {
  return { ...EMPTY_ACTIVITY, opens: 1, lastOpenedAt: daysAgo(days), openDays: [dayKey(daysAgo(days))] };
}

function slots(links: Link[], collections: Collection[], activity: Activity = {}): string[] {
  return buildQueue({ links, collections, activity, now }).slots.map((slot) => `${slot.role}:${slot.link.id}`);
}

describe('buildQueue', () => {
  it('recommends the first eligible link in the column order', () => {
    const links = [link('a1', 'a', { order: 1 }), link('a2', 'a', { order: 0 })];
    expect(slots(links, [col('a', 1)])).toEqual(['advance:a2']);
  });

  it('never recommends completed, reference, snoozed or triaged links, and counts what is left', () => {
    const links = [
      link('done', 'a', { completedAt: daysAgo(1), order: 0 }),
      link('ref', 'a', { reference: true, order: 1 }),
      link('later', 'a', { snoozedUntil: now + DAY, order: 2 }),
      link('old', 'a', { createdAt: daysAgo(90), order: 3 }),
      link('next', 'a', { order: 4 }),
    ];
    const queue = buildQueue({ links, collections: [col('a', 1)], activity: {}, now });

    expect(queue.slots.map((slot) => slot.link.id)).toEqual(['next']);
    expect(queue.triage.map((item) => item.link.id)).toEqual(['old']);
    expect(queue.size).toBe(2);
  });

  it('advances the front with more completions this week, then the one with most left to do', () => {
    const links = [
      ...['b1', 'b2', 'b3', 'b4', 'b5'].map((id) => link(id, 'big')),
      ...['s1', 's2'].map((id) => link(id, 'small')),
      ...['u1', 'u2', 'u3', 'u4'].map((id) => link(id, 'busy')),
      link('u-done1', 'busy', { completedAt: daysAgo(2) }),
      link('u-done2', 'busy', { completedAt: daysAgo(3) }),
    ];
    const queue = buildQueue({ links, collections: [col('big', 1), col('small', 2), col('busy', 3)], activity: {}, now });

    expect(queue.slots.map((slot) => [slot.collection.id, slot.reason])).toEqual([
      ['busy', { type: 'momentum', count: 2 }],
      ['big', { type: 'nextInColumn' }],
      ['small', { type: 'nearlyDone', remaining: 2 }],
    ]);
  });

  it('puts a pinned focus front first', () => {
    const links = [link('a1', 'a'), link('b1', 'b'), link('b2', 'b')];
    expect(slots(links, [col('a', 1), col('b', 2, { focus: true })])).toEqual(['continue:b1', 'advance:a1']);
  });

  it('continues the link opened most recently in the last 14 days', () => {
    const links = [link('a1', 'a'), link('a2', 'a'), link('b1', 'b'), link('c1', 'c')];
    const queue = buildQueue({
      links,
      collections: [col('a', 1), col('b', 2), col('c', 3)],
      activity: { a2: opened(2), b1: opened(5) },
      now,
    });

    expect(queue.slots[0]).toMatchObject({ role: 'continue', link: { id: 'a2' }, reason: { type: 'opened', days: 2 } });
    expect(queue.slots.map((slot) => slot.collection.id)).toEqual(['a', 'b', 'c']);
  });

  it('ignores opens older than 14 days', () => {
    expect(slots([link('a1', 'a')], [col('a', 1)], { a1: opened(20) })).toEqual(['advance:a1']);
  });

  it('revisits, as the last card, the front untouched for longest among those not already shown', () => {
    const many = (prefix: string, count: number, days: number): Link[] =>
      Array.from({ length: count }, (_, i) => link(`${prefix}${i}`, prefix, { createdAt: daysAgo(days) }));
    const links = [...many('a', 10, 24), ...many('b', 5, 1), ...many('c', 3, 1), ...many('d', 2, 20)];
    const queue = buildQueue({ links, collections: [col('a', 1), col('b', 2), col('c', 3), col('d', 4)], activity: {}, now });

    expect(queue.slots.map((slot) => `${slot.role}:${slot.collection.id}`)).toEqual(['advance:a', 'advance:b', 'revive:d']);
    expect(queue.slots[2].reason).toEqual({ type: 'stale', weeks: 2 });
  });

  it('gives the revive card to the next front when no front has been untouched for 14 days', () => {
    const links = [link('a1', 'a'), link('a2', 'a'), link('b1', 'b'), link('c1', 'c', { createdAt: daysAgo(5) })];
    const queue = buildQueue({ links, collections: [col('a', 1), col('b', 2), col('c', 3)], activity: {}, now });

    expect(queue.slots.map((slot) => `${slot.role}:${slot.collection.id}`)).toEqual(['advance:a', 'advance:b', 'advance:c']);
  });

  it('fills every slot from a different front', () => {
    const links = [link('a1', 'a'), link('a2', 'a'), link('b1', 'b'), link('c1', 'c'), link('d1', 'd')];
    const queue = buildQueue({ links, collections: [col('a', 1), col('b', 2), col('c', 3), col('d', 4)], activity: {}, now });

    expect(queue.slots).toHaveLength(3);
    expect(new Set(queue.slots.map((slot) => slot.collection.id)).size).toBe(3);
  });

  it('has no cards and an empty queue when nothing is pending', () => {
    const queue = buildQueue({ links: [link('a1', 'a', { completedAt: daysAgo(1) })], collections: [col('a', 1)], activity: {}, now });
    expect(queue).toMatchObject({ slots: [], triage: [], fronts: [], size: 0 });
  });

  it('treats Inbox, which has no workspace, as a front like any other', () => {
    const inbox = createMockCollection({ id: 'inbox', name: 'Inbox', order: 0, isDefault: true });
    expect(slots([link('i1', 'inbox')], [inbox])).toEqual(['advance:i1']);
  });

  it('shows the same cards all day, even after recording what it showed', () => {
    const links = [link('a1', 'a'), link('b1', 'b'), link('c1', 'c'), link('d1', 'd')];
    const collections = [col('a', 1), col('b', 2), col('c', 3), col('d', 4)];
    const before = slots(links, collections);
    const shownToday: Activity = Object.fromEntries(
      before.map((slot) => [slot.split(':')[1], { ...EMPTY_ACTIVITY, shownDays: [dayKey(now)] }])
    );

    expect(slots(links, collections, shownToday)).toEqual(before);
  });

  it('describes each card with the action and effort of its kind', () => {
    const video = link('v', 'a', { url: 'https://www.youtube.com/watch?v=x' });
    const [card] = buildQueue({ links: [video], collections: [col('a', 1)], activity: {}, now }).slots;
    expect(card).toMatchObject({ kind: 'video', action: 'watch', effort: 20 });
  });

  it('uses the effort learned from completed links of the same collection', () => {
    const done = ['d1', 'd2', 'd3'].map((id) => link(id, 'a', { completedAt: daysAgo(20) }));
    const activity: Activity = Object.fromEntries(done.map((l) => [l.id, { ...EMPTY_ACTIVITY, activeMs: 25 * 60_000 }]));
    const [card] = buildQueue({ links: [...done, link('next', 'a')], collections: [col('a', 1)], activity, now }).slots;
    expect(card).toMatchObject({ link: { id: 'next' }, effort: 25 });
  });
});
