/**
 * What to do with a link of each kind, and a default effort in minutes
 * (phase 2 replaces it with the user's own median).
 */
import type { LinkKind } from '@/lib/link-kind';

export type LinkAction = 'watch' | 'read' | 'explore' | 'solve' | 'review' | 'resume' | 'searchAgain' | 'open';

const BY_KIND: Record<LinkKind, { action: LinkAction; minutes: number }> = {
  video: { action: 'watch', minutes: 20 },
  paper: { action: 'read', minutes: 40 },
  page: { action: 'read', minutes: 10 },
  docs: { action: 'read', minutes: 15 },
  repo: { action: 'explore', minutes: 15 },
  exercise: { action: 'solve', minutes: 30 },
  'code-change': { action: 'review', minutes: 15 },
  chat: { action: 'resume', minutes: 10 },
  social: { action: 'read', minutes: 3 },
  search: { action: 'searchAgain', minutes: 3 },
  file: { action: 'open', minutes: 10 },
};

export function linkAction(kind: LinkKind): LinkAction {
  return BY_KIND[kind].action;
}

export function defaultEffort(kind: LinkKind): number {
  return BY_KIND[kind].minutes;
}
