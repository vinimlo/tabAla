/** What can be done to a link from the palette (spec §8.4). */
import { t } from '@/lib/i18n';
import type { Link } from '@/lib/types';
import type { IconName } from '@/shared/components/ui/icons';
import { altLabel } from '@/shared/platform';

export type PaletteActionId = 'open' | 'complete' | 'restore' | 'snooze' | 'move' | 'reveal' | 'discard';

export interface PaletteAction {
  id: PaletteActionId;
  icon: IconName;
  label: string;
  /** Keys of the shortcut, empty when there is none. */
  keys: string[];
  danger?: boolean;
}

export function linkActions(link: Link): PaletteAction[] {
  const pending = link.completedAt === undefined;
  const actions: PaletteAction[] = [
    { id: 'open', icon: 'external', label: t('palette_action_open'), keys: ['↵'] },
    pending
      ? { id: 'complete', icon: 'check', label: t('progress_complete'), keys: [altLabel(), '↵'] }
      : { id: 'restore', icon: 'undo', label: t('palette_action_restore'), keys: [altLabel(), '↵'] },
  ];
  if (pending) {
    actions.push({ id: 'snooze', icon: 'clock', label: t('progress_snooze_tomorrow'), keys: [] });
  }
  actions.push(
    { id: 'move', icon: 'move', label: t('palette_action_move'), keys: [] },
    { id: 'reveal', icon: 'eye', label: t('progress_reveal'), keys: ['⇧', '↵'] },
    { id: 'discard', icon: 'trash', label: t('progress_discard'), keys: [], danger: true },
  );
  return actions;
}
