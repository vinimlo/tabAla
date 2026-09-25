/** Links opened lately, for the palette before typing (spec §8.1). */
import type { Activity, Link } from '@/lib/types';

export function recentlyOpened(links: Link[], activity: Activity, exclude: ReadonlySet<string>, limit = 5): Link[] {
  return links
    .filter((link) => link.completedAt === undefined && !exclude.has(link.id) && activity[link.id]?.lastOpenedAt !== undefined)
    .sort((a, b) => (activity[b.id]?.lastOpenedAt ?? 0) - (activity[a.id]?.lastOpenedAt ?? 0))
    .slice(0, limit);
}
