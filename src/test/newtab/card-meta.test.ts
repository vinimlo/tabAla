import { describe, it, expect } from 'vitest';
import { cardMeta, metaView, type CardMetaInput } from '@/newtab/card-meta';
import { EMPTY_ACTIVITY } from '@/lib/types';
import { createMockLink } from '../factories';

const DAY = 86_400_000;
const now = new Date(2026, 8, 25, 10).getTime();
const base: CardMetaInput = {
  link: createMockLink({ id: 'l', createdAt: now - 10 * DAY }),
  reference: false,
  snoozed: false,
  triage: undefined,
  activity: EMPTY_ACTIVITY,
  kind: 'video',
  effort: 20,
  now,
};

describe('cardMeta', () => {
  it('follows the first rule that applies: reference, snoozed, triage, progress, kind', () => {
    const everything: CardMetaInput = {
      ...base,
      reference: true,
      snoozed: true,
      link: { ...base.link, snoozedUntil: now + DAY },
      triage: 'stale',
      activity: { ...EMPTY_ACTIVITY, activeMs: 5 * 60_000 },
    };

    expect(cardMeta(everything)).toEqual({ type: 'reference' });
    expect(cardMeta({ ...everything, reference: false })).toEqual({ type: 'snoozed', until: now + DAY });
    expect(cardMeta({ ...everything, reference: false, snoozed: false })).toMatchObject({ type: 'triage', reason: 'stale' });
    expect(cardMeta({ ...everything, reference: false, snoozed: false, triage: undefined }))
      .toEqual({ type: 'progress', spent: 5, effort: 20 });
    expect(cardMeta(base)).toEqual({ type: 'kind', kind: 'video', effort: 20 });
  });

  it('counts the days since the last touch and the snoozes for triage', () => {
    const meta = cardMeta({ ...base, triage: 'stale', activity: { ...EMPTY_ACTIVITY, snoozes: 3 } });
    expect(meta).toEqual({ type: 'triage', reason: 'stale', days: 10, snoozes: 3 });
  });

  it('ignores less than a minute of reading', () => {
    expect(cardMeta({ ...base, activity: { ...EMPTY_ACTIVITY, activeMs: 59_000 } }).type).toBe('kind');
  });
});

describe('metaView', () => {
  it('turns each meta into an icon, a text and a tone', () => {
    expect(metaView({ type: 'reference' })).toEqual({ icon: 'reference', text: 'linkcard_reference_badge', tone: 'plain' });
    expect(metaView({ type: 'snoozed', until: now })).toEqual({ icon: 'clock', text: 'linkcard_snoozed_until', tone: 'plain' });
    expect(metaView({ type: 'triage', reason: 'stale', days: 75, snoozes: 0 })).toEqual({ icon: 'alert', text: 'card_triage_stale', tone: 'warning' });
    expect(metaView({ type: 'triage', reason: 'skipped', days: 1, snoozes: 0 }).text).toBe('card_triage_skipped');
    expect(metaView({ type: 'triage', reason: 'snoozedOften', days: 1, snoozes: 3 }).text).toBe('card_triage_snoozed');
    expect(metaView({ type: 'triage', reason: 'revisited', days: 1, snoozes: 0 }).text).toBe('card_triage_revisited');
    expect(metaView({ type: 'progress', spent: 12, effort: 40 })).toEqual({ icon: 'clock', text: 'card_progress', tone: 'progress' });
    expect(metaView({ type: 'kind', kind: 'repo', effort: 15 })).toEqual({ icon: 'repo', text: 'card_kind_effort', tone: 'plain' });
  });
});
