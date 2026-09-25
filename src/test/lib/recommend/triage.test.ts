/**
 * Triage: pending links that need a decision before being recommended.
 */
import { describe, it, expect } from 'vitest';
import { buildTriage, triageReason } from '@/lib/recommend/triage';
import { EMPTY_ACTIVITY, type Activity, type LinkActivity } from '@/lib/types';
import { createMockCollection, createMockLink } from '../../factories';

const now = new Date(2026, 8, 24, 10).getTime();
const on = (month: number, day: number): number => new Date(2026, month - 1, day, 12).getTime();
const act = (overrides: Partial<LinkActivity>): LinkActivity => ({ ...EMPTY_ACTIVITY, ...overrides });
const fresh = createMockLink({ id: 'l', createdAt: on(9, 20) });

describe('triageReason', () => {
  it('a link shown on 3 earlier days without any action was skipped', () => {
    expect(triageReason(fresh, act({ shownDays: ['2026-09-21', '2026-09-22', '2026-09-23'] }), now)).toBe('skipped');
  });

  it('today does not count yet, so the strip stays the same all day', () => {
    expect(triageReason(fresh, act({ shownDays: ['2026-09-22', '2026-09-23', '2026-09-24'] }), now)).toBeNull();
  });

  it('a link snoozed 3 times needs a decision', () => {
    expect(triageReason(fresh, act({ snoozes: 3 }), now)).toBe('snoozedOften');
  });

  it('a link opened on 3 days in the last 30 without being completed was revisited', () => {
    expect(triageReason(fresh, act({ openDays: ['2026-09-10', '2026-09-15', '2026-09-20'] }), now)).toBe('revisited');
  });

  it('visits up to a "still worth it" answer no longer count', () => {
    const kept = { ...fresh, keptAt: on(9, 15) };
    expect(triageReason(kept, act({ openDays: ['2026-09-10', '2026-09-15', '2026-09-20'] }), now)).toBeNull();
  });

  it('visits older than 30 days do not count', () => {
    expect(triageReason(fresh, act({ openDays: ['2026-08-01', '2026-08-10', '2026-08-20'] }), now)).toBeNull();
  });

  it('a link untouched for more than 60 days is stale until kept or opened', () => {
    const old = createMockLink({ id: 'old', createdAt: on(2, 4) });
    expect(triageReason(old, EMPTY_ACTIVITY, now)).toBe('stale');
    expect(triageReason({ ...old, keptAt: on(9, 1) }, EMPTY_ACTIVITY, now)).toBeNull();
    expect(triageReason(old, act({ lastOpenedAt: on(9, 1) }), now)).toBeNull();
  });
});

describe('buildTriage', () => {
  const collection = createMockCollection({ id: 'c' });
  const referenceCollection = createMockCollection({ id: 'r', reference: true });
  const collections = new Map([[collection.id, collection], [referenceCollection.id, referenceCollection]]);

  it('only triages pending links', () => {
    const links = [
      createMockLink({ id: 'done', collectionId: 'c', createdAt: on(2, 1), completedAt: on(9, 1) }),
      createMockLink({ id: 'ref', collectionId: 'r', createdAt: on(2, 1) }),
      createMockLink({ id: 'later', collectionId: 'c', createdAt: on(2, 1), snoozedUntil: on(9, 30) }),
      createMockLink({ id: 'old', collectionId: 'c', createdAt: on(2, 1) }),
    ];
    expect(buildTriage(links, collections, {}, now).map((item) => item.link.id)).toEqual(['old']);
  });

  it('puts skipped links first and stale ones last, oldest first', () => {
    const links = [
      createMockLink({ id: 'stale-newer', collectionId: 'c', createdAt: on(3, 1) }),
      createMockLink({ id: 'stale-older', collectionId: 'c', createdAt: on(2, 1) }),
      createMockLink({ id: 'skipped', collectionId: 'c', createdAt: on(9, 20) }),
    ];
    const activity: Activity = { skipped: act({ shownDays: ['2026-09-20', '2026-09-21', '2026-09-22'] }) };

    expect(buildTriage(links, collections, activity, now).map((item) => [item.link.id, item.reason])).toEqual([
      ['skipped', 'skipped'],
      ['stale-older', 'stale'],
      ['stale-newer', 'stale'],
    ]);
  });
});
