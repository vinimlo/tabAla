/** The line under a board card's title (spec §7). */
import { t } from '@/lib/i18n';
import type { Link, LinkActivity } from '@/lib/types';
import type { LinkKind } from '@/lib/link-kind';
import { daysBetween, shortDate } from '@/lib/recommend/dates';
import { lastTouch, type TriageReason } from '@/lib/recommend/triage';
import { KIND_LABEL_KEYS } from '@/lib/search/labels';
import type { IconName } from '@/shared/components/ui/icons';

export type CardMeta =
  | { type: 'reference' }
  | { type: 'snoozed'; until: number }
  | { type: 'triage'; reason: TriageReason; days: number; snoozes: number }
  | { type: 'progress'; spent: number; effort: number }
  | { type: 'kind'; kind: LinkKind; effort: number };

export interface CardMetaInput {
  link: Link;
  reference: boolean;
  snoozed: boolean;
  triage: TriageReason | undefined;
  activity: LinkActivity;
  kind: LinkKind;
  /** Minutes. */
  effort: number;
  now: number;
}

export const KIND_ICONS: Record<LinkKind, IconName> = {
  video: 'play',
  paper: 'paper',
  repo: 'repo',
  'code-change': 'code',
  docs: 'docs',
  exercise: 'code',
  chat: 'chat',
  social: 'chat',
  search: 'search',
  file: 'paper',
  page: 'page',
};

/** The first rule that applies: reference, snoozed, triage, in progress, kind and effort. */
export function cardMeta(input: CardMetaInput): CardMeta {
  if (input.reference) {
    return { type: 'reference' };
  }
  if (input.snoozed && input.link.snoozedUntil !== undefined) {
    return { type: 'snoozed', until: input.link.snoozedUntil };
  }
  if (input.triage !== undefined) {
    return {
      type: 'triage',
      reason: input.triage,
      days: daysBetween(lastTouch(input.link, input.activity), input.now),
      snoozes: input.activity.snoozes,
    };
  }
  const spent = Math.floor(input.activity.activeMs / 60_000);
  if (spent >= 1) {
    return { type: 'progress', spent, effort: input.effort };
  }
  return { type: 'kind', kind: input.kind, effort: input.effort };
}

export function metaView(meta: CardMeta): { icon: IconName; text: string; tone: 'plain' | 'warning' | 'progress' } {
  switch (meta.type) {
    case 'reference':
      return { icon: 'reference', text: t('linkcard_reference_badge'), tone: 'plain' };
    case 'snoozed':
      return { icon: 'clock', text: t('linkcard_snoozed_until', shortDate(meta.until)), tone: 'plain' };
    case 'triage': {
      const text = meta.reason === 'stale'
        ? t('card_triage_stale', meta.days)
        : meta.reason === 'snoozedOften'
          ? t('card_triage_snoozed', meta.snoozes)
          : meta.reason === 'revisited'
            ? t('card_triage_revisited')
            : t('card_triage_skipped');
      return { icon: 'alert', text, tone: 'warning' };
    }
    case 'progress':
      return { icon: 'clock', text: t('card_progress', meta.spent, meta.effort), tone: 'progress' };
    case 'kind':
      return { icon: KIND_ICONS[meta.kind], text: t('card_kind_effort', t(KIND_LABEL_KEYS[meta.kind]), meta.effort), tone: 'plain' };
  }
}
