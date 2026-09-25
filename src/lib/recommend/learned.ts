/**
 * Learned effort (spec §6.3): the median active time of completed links of
 * the same collection and kind, then of the same kind; the default of the
 * kind until there are 3 samples.
 */
import type { Activity, Link } from '@/lib/types';
import { linkKind, type LinkKind } from '@/lib/link-kind';
import { defaultEffort } from './effort';

export const MIN_SAMPLES = 3;
const MINUTE = 60_000;

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function toMinutes(ms: number): number {
  return Math.max(5, Math.round(ms / MINUTE / 5) * 5);
}

function add<K>(map: Map<K, number[]>, key: K, value: number): void {
  const list = map.get(key);
  if (list === undefined) {
    map.set(key, [value]);
  } else {
    list.push(value);
  }
}

export function effortEstimator(links: Link[], activity: Activity): (link: Link) => number {
  const byCollection = new Map<string, number[]>();
  const byKind = new Map<LinkKind, number[]>();
  for (const link of links) {
    const ms = activity[link.id]?.activeMs ?? 0;
    if (link.completedAt === undefined || ms <= 0) {
      continue;
    }
    const kind = linkKind(link.url);
    add(byCollection, `${link.collectionId}|${kind}`, ms);
    add(byKind, kind, ms);
  }
  const enough = (list: number[] | undefined): number[] | undefined =>
    (list !== undefined && list.length >= MIN_SAMPLES ? list : undefined);

  return (link) => {
    const kind = linkKind(link.url);
    const samples = enough(byCollection.get(`${link.collectionId}|${kind}`)) ?? enough(byKind.get(kind));
    return samples === undefined ? defaultEffort(kind) : toMinutes(median(samples));
  };
}
