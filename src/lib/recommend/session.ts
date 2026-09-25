/**
 * Focus session (spec §6.5): a triage batch, the link already started,
 * then the next links of the two best fronts that fit the time. Never
 * stored: the engine is deterministic, so a reload rebuilds the same
 * sequence without what was completed.
 */
import { advanceReason, recommendation, type Queue, type Recommendation } from './engine';

export type SessionMinutes = 15 | 30 | 60;

export const SESSION_OPTIONS: readonly SessionMinutes[] = [15, 30, 60];
export const TRIAGE_BATCH = 5;
export const SESSION_FRONTS = 2;
/** Stop filling when fewer minutes than this are left. */
export const MIN_LEFT = 5;

export type SessionItem =
  | { type: 'triage'; count: number }
  | { type: 'link'; rec: Recommendation; overBudget: boolean };

export function buildSession(queue: Queue, minutes: SessionMinutes): SessionItem[] {
  const items: SessionItem[] = [];
  const taken = new Set<string>();
  let left: number = minutes;

  if (queue.triage.length > 0) {
    items.push({ type: 'triage', count: Math.min(TRIAGE_BATCH, queue.triage.length) });
    left -= 1;
  }

  const continued = queue.slots.find((slot) => slot.role === 'continue');
  if (continued !== undefined) {
    items.push({ type: 'link', rec: continued, overBudget: continued.effort > left });
    taken.add(continued.link.id);
    left -= continued.effort;
  }

  for (const front of queue.fronts.slice(0, SESSION_FRONTS)) {
    for (const link of front.eligible) {
      if (left < MIN_LEFT) {
        break;
      }
      if (taken.has(link.id)) {
        continue;
      }
      const rec = recommendation(link, front.collection, 'advance', advanceReason(front));
      if (rec.effort <= left) {
        items.push({ type: 'link', rec, overBudget: false });
        taken.add(link.id);
        left -= rec.effort;
      }
    }
  }

  if (!items.some((item) => item.type === 'link') && queue.fronts.length > 0) {
    const front = queue.fronts[0];
    items.push({
      type: 'link',
      rec: recommendation(front.eligible[0], front.collection, 'advance', advanceReason(front)),
      overBudget: true,
    });
  }
  return items;
}
