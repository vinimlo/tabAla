/**
 * Session: a sequence that fits the time the user has.
 */
import { describe, it, expect } from 'vitest';
import { buildQueue, type Queue } from '@/lib/recommend/engine';
import {
  buildSession, parseFocusSession, sessionView, startSession, SESSION_TTL_MS, type FocusSession, type SessionItem, type SessionMinutes,
} from '@/lib/recommend/session';
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
describe('stored session', () => {
  const now = new Date(2026, 8, 25, 10).getTime();
  const collections = [createMockCollection({ id: 'a', name: 'A', order: 1 })];
  const pages = ['p1', 'p2', 'p3'].map((id) =>
    createMockLink({ id, title: `Page ${id}`, url: `https://example.com/${id}`, collectionId: 'a', createdAt: now - DAY }));
  const queueOf = (links: Link[]): Queue => buildQueue({ links, collections, activity: {}, now });

  it('keeps only ids of the plan when it starts', () => {
    const started = startSession(queueOf(pages), 30, now);

    expect(started).toEqual({
      minutes: 30,
      startedAt: now,
      completedIds: [],
      items: [{ type: 'link', linkId: 'p1' }, { type: 'link', linkId: 'p2' }, { type: 'link', linkId: 'p3' }],
    });
  });

  it('treats anything malformed as no session', () => {
    const good: FocusSession = { minutes: 15, startedAt: now, completedIds: [], items: [{ type: 'triage', count: 2 }] };

    expect(parseFocusSession(good)).toEqual(good);
    for (const bad of [null, 'x', { ...good, minutes: 20 }, { ...good, startedAt: '1' }, { ...good, items: [{ type: 'link' }] }, { ...good, completedIds: [3] }]) {
      expect(parseFocusSession(bad)).toBeNull();
    }
  });

  it('follows the plan: the first link not completed is the current one', () => {
    const session: FocusSession = { minutes: 30, startedAt: now - 10 * 60_000, completedIds: ['p1'], items: pages.map((p) => ({ type: 'link', linkId: p.id })) };
    const links = pages.map((p) => (p.id === 'p1' ? { ...p, completedAt: now - 60_000 } : p));

    const view = sessionView(session, links, queueOf(links), collections, now);

    expect(view.current?.link.id).toBe('p2');
    expect(view.next.map((rec) => rec.link.id)).toEqual(['p3']);
    expect([view.done, view.total, view.position]).toEqual([1, 3, 2]);
    expect(view.remainingMs).toBe(20 * 60_000);
    expect(view.elapsed).toBeCloseTo(1 / 3, 5);
    expect([view.timeUp, view.finished]).toEqual([false, false]);
  });

  it('drops links deleted, turned into reference or completed outside the session', () => {
    const session: FocusSession = { minutes: 30, startedAt: now, completedIds: [], items: [...pages.map((p) => ({ type: 'link' as const, linkId: p.id })), { type: 'link', linkId: 'gone' }] };
    const links = [{ ...pages[0], completedAt: now }, { ...pages[1], reference: true }, pages[2]];

    const view = sessionView(session, links, queueOf(links), collections, now);

    expect(view.current?.link.id).toBe('p3');
    expect([view.done, view.total]).toEqual([0, 1]);
  });

  it('is finished when the time is up or nothing is left', () => {
    const session: FocusSession = { minutes: 15, startedAt: now - 16 * 60_000, completedIds: [], items: [{ type: 'link', linkId: 'p1' }] };
    expect(sessionView(session, pages, queueOf(pages), collections, now)).toMatchObject({ timeUp: true, finished: true, remainingMs: 0 });

    const done = { ...session, startedAt: now, completedIds: ['p1'] };
    const links = [{ ...pages[0], completedAt: now }, pages[1], pages[2]];
    expect(sessionView(done, links, queueOf(links), collections, now)).toMatchObject({ current: undefined, done: 1, total: 1, finished: true });
  });

  it('keeps a triage step while there is triage to do', () => {
    const old = createMockLink({ id: 'old', collectionId: 'a', createdAt: now - 90 * DAY });
    const session: FocusSession = { minutes: 15, startedAt: now, completedIds: [], items: [{ type: 'triage', count: 5 }] };

    expect(sessionView(session, [old], queueOf([old]), collections, now)).toMatchObject({ triageLeft: 1, finished: false });
    expect(sessionView(session, [], queueOf([]), collections, now)).toMatchObject({ triageLeft: 0, finished: true });
  });

  it('expires after twelve hours', () => {
    expect(SESSION_TTL_MS).toBe(12 * 60 * 60_000);
  });
});
