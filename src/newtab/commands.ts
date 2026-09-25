/** The commands of the palette (spec §8.2): a pure list, filtered by what is typed. */
import { plural, t } from '@/lib/i18n';
import { SESSION_OPTIONS, type SessionMinutes } from '@/lib/recommend/session';
import { normalizeWords } from '@/lib/search/text';
import type { IconName } from '@/shared/components/ui/icons';

export type CommandAction =
  | { type: 'triage' }
  | { type: 'startSession'; minutes: SessionMinutes }
  | { type: 'endSession' }
  | { type: 'view'; view: 'board' | 'focus' }
  | { type: 'newCollection' }
  | { type: 'workspace'; id: string }
  | { type: 'theme'; theme: 'light' | 'dark' }
  | { type: 'toggleNow'; show: boolean }
  | { type: 'settings' };

export interface Command {
  id: string;
  label: string;
  icon: IconName;
  action: CommandAction;
  tone?: 'warning' | 'accent';
  /** Key of the page shortcut that does the same. */
  hint?: string;
}

export interface CommandContext {
  triageCount: number;
  sessionActive: boolean;
  view: 'board' | 'focus';
  /** Workspaces other than the active one, with their display names. */
  workspaces: { id: string; name: string }[];
  /** The theme on screen. */
  theme: 'light' | 'dark';
  showNow: boolean;
}

export function buildCommands(context: CommandContext): Command[] {
  const commands: Command[] = [];
  if (context.triageCount > 0) {
    commands.push({
      id: 'triage',
      label: plural(context.triageCount, 'now_triage_one', 'now_triage_many'),
      icon: 'alert',
      tone: 'warning',
      action: { type: 'triage' },
    });
  }
  if (context.sessionActive) {
    commands.push({ id: 'end-session', label: t('now_end_session'), icon: 'target', tone: 'accent', action: { type: 'endSession' } });
  } else {
    for (const minutes of SESSION_OPTIONS) {
      commands.push({
        id: `session-${minutes}`,
        label: t('command_start_session', minutes),
        icon: 'target',
        tone: 'accent',
        action: { type: 'startSession', minutes },
      });
    }
  }
  commands.push(
    context.view === 'board'
      ? { id: 'view', label: t('command_open_focus'), icon: 'target', hint: 'F', action: { type: 'view', view: 'focus' } }
      : { id: 'view', label: t('command_back_to_board'), icon: 'board', hint: 'F', action: { type: 'view', view: 'board' } },
    { id: 'new-collection', label: t('newtab_new_collection'), icon: 'folder', hint: 'N', action: { type: 'newCollection' } },
  );
  for (const workspace of context.workspaces) {
    commands.push({
      id: `workspace-${workspace.id}`,
      label: t('command_go_to_workspace', workspace.name),
      icon: 'board',
      action: { type: 'workspace', id: workspace.id },
    });
  }
  commands.push(
    context.theme === 'dark'
      ? { id: 'theme', label: t('command_theme_light'), icon: 'sun', action: { type: 'theme', theme: 'light' } }
      : { id: 'theme', label: t('command_theme_dark'), icon: 'moon', action: { type: 'theme', theme: 'dark' } },
    context.showNow
      ? { id: 'toggle-now', label: t('command_hide_now'), icon: 'eye', action: { type: 'toggleNow', show: false } }
      : { id: 'toggle-now', label: t('command_show_now'), icon: 'eye', action: { type: 'toggleNow', show: true } },
    { id: 'settings', label: t('command_settings'), icon: 'gear', action: { type: 'settings' } },
  );
  return commands;
}

export function isCommandQuery(query: string): boolean {
  return /^\s*>/.test(query);
}

/** Commands whose words start with every typed word; a leading ">" is ignored. */
export function matchCommands(commands: Command[], query: string): Command[] {
  const words = normalizeWords(query.replace(/^\s*>/, ''));
  if (words.length === 0) {
    return commands;
  }
  return commands.filter((command) => {
    const label = normalizeWords(command.label);
    return words.every((word) => label.some((part) => part.startsWith(word)));
  });
}
