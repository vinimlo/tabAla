/**
 * Session: a sequence that fits the time the user has.
 */
import { describe, it, expect } from 'vitest';
import { buildQueue } from '@/lib/recommend/engine';
import { buildSession, type SessionItem, type SessionMinutes } from '@/lib/recommend/session';
import { EMPTY_ACTIVITY, type Activity, type Collection, type Link } from '@/lib/types';
import { createMockCollection, createMockLink } from '../../factories';

const DAY = 86_400_000;
const now = new Date(2026, 8, 24, 10).getTime();

const col = (id: string, order: number): Collection => createMockCollection({ id, name: id, order, workspaceId: 'ws' });
const page = (id: string, collectionId: string, extra: Partial<Link> = {}): Link =>
  createMockLink({ id, url: `https://example.com/${id}`, collectionId, createdAt: now - DAY, ...extra });
const paper = (id: string, collectionId: string): Link => page(id, collectionId, { url: `https://arxiv.org/abs/${id}` });

function label(item: SessionItem): string {
  return item.type === 'triage' ? `triage:${item.count}` : `${item.rec.link.id}${item.overBudget ? '!' : ''}`;
}

function session(links: Link[], collections: Collection[], minutes: SessionMinutes, activity: Activity = {}): string[] {
  return buildSession(buildQueue({ links, collections, activity, now }), minutes).map(label);
}

describe('buildSession', () => {
  it('starts with a batch of at most 5 triage decisions', () => {
    const old = ['o1', 'o2', 'o3', 'o4', 'o5', 'o6', 'o7'].map((id) => page(id, 'a', { createdAt: now - 90 * DAY }));
    expect(session([...old, page('p1', 'a')], [col('a', 1)], 15)).toEqual(['triage:5', 'p1']);
  });

  it('fills the time with the next links of the best front, then the second', () => {
    const links = [page('a1', 'a'), page('a2', 'a'), page('b1', 'b'), page('b2', 'b'), page('b3', 'b')];
    expect(session(links, [col('a', 1), col('b', 2)], 30)).toEqual(['b1', 'b2', 'b3']);
    expect(session(links, [col('a', 1), col('b', 2)], 60)).toEqual(['b1', 'b2', 'b3', 'a1', 'a2']);
  });

  it('uses at most two fronts', () => {
    const links = [page('a1', 'a'), page('b1', 'b'), page('c1', 'c')];
    expect(session(links, [col('a', 1), col('b', 2), col('c', 3)], 60)).toEqual(['a1', 'b1']);
  });

  it('skips a link that does not fit and tries the next one', () => {
    expect(session([paper('p1', 'a'), page('a2', 'a')], [col('a', 1)], 15)).toEqual(['a2']);
  });

  it('starts with the link the user already opened', () => {
    const links = [page('a1', 'a'), page('a2', 'a'), page('b1', 'b')];
    const activity: Activity = { a2: { ...EMPTY_ACTIVITY, opens: 1, lastOpenedAt: now - DAY } };
    expect(session(links, [col('a', 1), col('b', 2)], 30, activity)[0]).toBe('a2');
  });

  it('offers the next link, marked as longer than the session, when nothing fits', () => {
    expect(session([paper('p1', 'a')], [col('a', 1)], 15)).toEqual(['p1!']);
  });

  it('is empty when there is nothing to do', () => {
    expect(session([], [col('a', 1)], 30)).toEqual([]);
  });

  it('fits the session with the learned effort', () => {
    const done = ['d1', 'd2', 'd3'].map((id) => page(id, 'a', { completedAt: now - 20 * DAY }));
    const activity: Activity = Object.fromEntries(done.map((l) => [l.id, { ...EMPTY_ACTIVITY, activeMs: 20 * 60_000 }]));
    expect(session([...done, page('p1', 'a'), page('p2', 'a')], [col('a', 1)], 30, activity)).toEqual(['p1']);
  });
});
