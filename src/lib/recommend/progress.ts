/**
 * Numbers of the Focus space: completions per week and the history.
 */
import type { Link, RecoStats } from '@/lib/types';
import { addDays, dayKey, isoWeek, weekStart } from './dates';

export interface WeekBar {
  week: string;
  completed: number;
}

export const PROGRESS_WEEKS = 8;

/** Completions in each of the last `weeks` ISO weeks, oldest first. */
export function completedByWeek(links: Link[], now: number, weeks = PROGRESS_WEEKS): WeekBar[] {
  const keys = Array.from({ length: weeks }, (_, i) => isoWeek(addDays(now, -7 * (weeks - 1 - i))));
  const counts = new Map(keys.map((key) => [key, 0]));
  for (const link of links) {
    if (link.completedAt === undefined) {
      continue;
    }
    const key = isoWeek(link.completedAt);
    const count = counts.get(key);
    if (count !== undefined) {
      counts.set(key, count + 1);
    }
  }
  return keys.map((week) => ({ week, completed: counts.get(week) ?? 0 }));
}

/** Queue size recorded in the previous week, if the strip was seen then. */
export function previousQueue(stats: RecoStats, now: number): number | undefined {
  return stats[isoWeek(addDays(now, -7))]?.queue;
}

export interface CompletedWeek {
  week: string;
  /** Start of the Monday of that week. */
  start: number;
  links: Link[];
}

/** Completed links grouped by ISO week, newest first. */
export function completedHistory(links: Link[]): CompletedWeek[] {
  const done = links
    .filter((link) => link.completedAt !== undefined)
    .sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0));
  const groups: CompletedWeek[] = [];
  for (const link of done) {
    const at = link.completedAt ?? 0;
    const week = isoWeek(at);
    const last = groups[groups.length - 1];
    if (last !== undefined && last.week === week) {
      last.links.push(link);
    } else {
      groups.push({ week, start: weekStart(at), links: [link] });
    }
  }
  return groups;
}

export interface WeekDot {
  /** Local day, AAAA-MM-DD. */
  day: string;
  done: boolean;
  today: boolean;
}

/** Monday to Sunday of this week, marking the days with at least one completion. */
export function weekDots(links: Link[], now: number): WeekDot[] {
  const start = weekStart(now);
  const today = dayKey(now);
  const doneDays = new Set(links.flatMap((link) => (link.completedAt === undefined ? [] : [dayKey(link.completedAt)])));
  return Array.from({ length: 7 }, (_, i) => {
    const day = dayKey(addDays(start, i));
    return { day, done: doneDays.has(day), today: day === today };
  });
}

/** Links completed since this week's Monday. */
export function completedThisWeek(links: Link[], now: number): number {
  const start = weekStart(now);
  return links.filter((link) => link.completedAt !== undefined && link.completedAt >= start).length;
}

export interface Forecast {
  /** Completions per week in the four full weeks before this one. */
  perWeek: number;
  /** Weeks until the queue is done at that pace; null beyond a year. */
  weeks: number | null;
}

/** How long the queue lasts at the recent pace (spec §10.1); null without a pace. */
export function queueForecast(bars: WeekBar[], queueSize: number): Forecast | null {
  if (queueSize === 0) {
    return { perWeek: 0, weeks: 0 };
  }
  const recent = bars.slice(-5, -1);
  const total = recent.reduce((sum, bar) => sum + bar.completed, 0);
  if (recent.length === 0 || total === 0) {
    return null;
  }
  const perWeek = total / recent.length;
  const weeks = Math.ceil(queueSize / perWeek);
  return { perWeek, weeks: weeks > 52 ? null : weeks };
}
