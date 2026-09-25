/** Texts of the next up strip and the Focus space. */
import { getCollectionDisplayName, getWorkspaceDisplayName, plural, t } from '@/lib/i18n';
import type { Collection, Workspace } from '@/lib/types';
import type { Reason, SlotRole } from '@/lib/recommend/engine';
import type { LinkAction } from '@/lib/recommend/effort';
import type { TriageReason } from '@/lib/recommend/triage';
import type { TimeLeft } from '@/lib/recommend/time';

export const ACTION_KEYS: Record<LinkAction, string> = {
  watch: 'action_watch',
  read: 'action_read',
  explore: 'action_explore',
  solve: 'action_solve',
  review: 'action_review',
  resume: 'action_resume',
  searchAgain: 'action_search_again',
  open: 'action_open',
};

export const TRIAGE_KEYS: Record<TriageReason, string> = {
  skipped: 'triage_reason_skipped',
  snoozedOften: 'triage_reason_snoozed',
  revisited: 'triage_reason_revisited',
  stale: 'triage_reason_stale',
};

export function reasonText(reason: Reason): string {
  switch (reason.type) {
    case 'opened':
      if (reason.days === 0) { return t('reason_opened_today'); }
      return reason.days === 1 ? t('reason_opened_day') : t('reason_opened_days', reason.days);
    case 'focus':
      return t('reason_focus');
    case 'momentum':
      return plural(reason.count, 'reason_momentum_one', 'reason_momentum_many');
    case 'nearlyDone':
      return plural(reason.remaining, 'reason_nearly_done_one', 'reason_nearly_done_many');
    case 'nextInColumn':
      return t('reason_next_in_column');
    case 'stale':
      return plural(reason.weeks, 'reason_stale_week', 'reason_stale_weeks');
    case 'ask':
      return t('nextup_ask', reason.minutes);
    case 'spent':
      return t('reason_spent', reason.minutes);
  }
}

export const CONTEXT_KEYS: Record<SlotRole, string> = {
  continue: 'now_context_continue',
  advance: 'now_context_advance',
  revive: 'now_context_revive',
};

/** The main button of a link already started. */
export const CONTINUE_KEYS: Record<LinkAction, string> = {
  watch: 'now_continue_watch',
  read: 'now_continue_read',
  explore: 'now_continue_explore',
  solve: 'now_continue_solve',
  review: 'now_continue_review',
  resume: 'now_continue_resume',
  searchAgain: 'now_continue_search_again',
  open: 'now_continue_open',
};

/** The main button of a link not started yet. */
export const DO_NOW_KEYS: Record<LinkAction, string> = {
  watch: 'now_do_watch',
  read: 'now_do_read',
  explore: 'now_do_explore',
  solve: 'now_do_solve',
  review: 'now_do_review',
  resume: 'now_do_resume',
  searchAgain: 'now_do_search_again',
  open: 'now_do_open',
};

/** "~20 min", "faltam uns 2 min" or "31 min até agora". */
export function timeText(time: TimeLeft): string {
  if (time.kind === 'left') {
    return t('now_time_left', time.minutes);
  }
  return time.kind === 'over' ? t('now_time_over', time.minutes) : t('nextup_effort', time.minutes);
}

/** Under the ring: "18 de ~20 min", or the estimate when nothing was spent. */
export function ringCaption(time: TimeLeft, effort: number): string {
  return time.spent > 0 ? t('now_ring_spent', time.spent, effort) : t('nextup_effort', effort);
}

export function effortText(minutes: number): string {
  return t('nextup_effort', minutes);
}

/** "Workspace › Collection"; Inbox, which belongs to no workspace, shows only its name. */
export function collectionPath(collection: Collection, workspaces: Workspace[]): string {
  const name = getCollectionDisplayName(collection);
  const workspace = workspaces.find((w) => w.id === collection.workspaceId);
  return workspace === undefined ? name : `${getWorkspaceDisplayName(workspace)} › ${name}`;
}
