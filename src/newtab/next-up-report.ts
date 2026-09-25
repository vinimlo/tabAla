/**
 * When the dashboard records what the next up strip showed: only while the
 * strip is really on screen, and always with today's date.
 */
import { dayKey } from '@/lib/recommend/dates';
import type { Queue } from '@/lib/recommend/engine';

export interface StripState {
  /** Links, settings or activity still loading. */
  loading: boolean;
  /** The page is visible (not a background tab). */
  visible: boolean;
  view: 'board' | 'focus';
  showNextUp: boolean;
  collapsed: boolean;
}

export function stripOnScreen(state: StripState): boolean {
  return !state.loading && state.visible && state.view === 'board' && state.showNextUp && !state.collapsed;
}

/** Keeps `now` within the day, so the strip stays stable; moves to the clock on a new day. */
export function sameDayNow(now: number, clock: number): number {
  return dayKey(clock) === dayKey(now) ? now : clock;
}

export interface ShownReport {
  /** Changes only when the day, the queue size, the cards or the skipped links change. */
  key: string;
  shown: string[];
  skipped: string[];
}

export function shownReport(queue: Queue, now: number): ShownReport {
  const shown = queue.slots.map((slot) => slot.link.id);
  const skipped = queue.triage.filter((item) => item.reason === 'skipped').map((item) => item.link.id);
  return { key: [dayKey(now), queue.size, ...shown, '|', ...skipped].join(','), shown, skipped };
}
