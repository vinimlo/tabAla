/**
 * When the dashboard records what the next up strip showed.
 */
import { describe, it, expect } from 'vitest';
import { sameDayNow, shownReport, stripOnScreen, type StripState } from '@/newtab/next-up-report';
import { buildQueue } from '@/lib/recommend/engine';
import { createMockCollection, createMockLink } from '../factories';

const onScreen: StripState = { loading: false, visible: true, view: 'board', showNextUp: true, collapsed: false };

describe('stripOnScreen', () => {
  it('is true only when the strip is really on screen', () => {
    expect(stripOnScreen(onScreen)).toBe(true);
    expect(stripOnScreen({ ...onScreen, visible: false })).toBe(false);
    expect(stripOnScreen({ ...onScreen, view: 'focus' })).toBe(false);
    expect(stripOnScreen({ ...onScreen, showNextUp: false })).toBe(false);
    expect(stripOnScreen({ ...onScreen, collapsed: true })).toBe(false);
  });

  it('waits until settings and activity are loaded, so a strip turned off never records', () => {
    expect(stripOnScreen({ ...onScreen, loading: true })).toBe(false);
  });
});

describe('sameDayNow', () => {
  const evening = new Date(2026, 8, 24, 23, 50).getTime();

  it('keeps the same moment within the day', () => {
    expect(sameDayNow(evening, new Date(2026, 8, 24, 23, 59).getTime())).toBe(evening);
  });

  it('moves to the clock once the day changes', () => {
    const nextDay = new Date(2026, 8, 25, 0, 1).getTime();
    expect(sameDayNow(evening, nextDay)).toBe(nextDay);
  });
});

describe('shownReport', () => {
  it('lists the cards and the skipped links, keyed by day and queue size', () => {
    const now = new Date(2026, 8, 24, 10).getTime();
    const collection = createMockCollection({ id: 'c', order: 1 });
    const link = createMockLink({ id: 'l1', collectionId: 'c', createdAt: now - 86_400_000 });
    const report = shownReport(buildQueue({ links: [link], collections: [collection], activity: {}, now }), now);

    expect(report).toEqual({ key: '2026-09-24,1,l1,|', shown: ['l1'], skipped: [] });
  });
});
