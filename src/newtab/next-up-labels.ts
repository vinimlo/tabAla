/** Texts of the next up strip and the Focus space. */
import { getCollectionDisplayName, getWorkspaceDisplayName, plural, t } from '@/lib/i18n';
import type { Collection, Workspace } from '@/lib/types';
import type { Reason, SlotRole } from '@/lib/recommend/engine';
import type { LinkAction } from '@/lib/recommend/effort';
import type { TriageReason } from '@/lib/recommend/triage';

export const ROLE_KEYS: Record<SlotRole, string> = {
  continue: 'nextup_role_continue',
  advance: 'nextup_role_advance',
  revive: 'nextup_role_revive',
};

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

export function effortText(minutes: number): string {
  return t('nextup_effort', minutes);
}

/** "Workspace › Collection"; Inbox, which belongs to no workspace, shows only its name. */
export function collectionPath(collection: Collection, workspaces: Workspace[]): string {
  const name = getCollectionDisplayName(collection);
  const workspace = workspaces.find((w) => w.id === collection.workspaceId);
  return workspace === undefined ? name : `${getWorkspaceDisplayName(workspace)} › ${name}`;
}
