/**
 * Numbers of the Focus space: completions per week and the history.
 */
import type { Link, RecoStats } from '@/lib/types';
import { addDays, isoWeek, weekStart } from './dates';

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
