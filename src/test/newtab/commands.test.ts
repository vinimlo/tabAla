import { describe, it, expect } from 'vitest';
import { buildCommands, isCommandQuery, matchCommands, type CommandContext } from '@/newtab/commands';

const context: CommandContext = {
  triageCount: 2,
  sessionActive: false,
  view: 'board',
  workspaces: [{ id: 'w2', name: 'Trabalho' }],
  theme: 'dark',
  showNow: true,
};

describe('buildCommands', () => {
  it('lists what can be done now, in a fixed order', () => {
    expect(buildCommands(context).map((command) => command.id)).toEqual([
      'triage', 'session-15', 'session-30', 'session-60', 'view', 'new-collection', 'workspace-w2', 'theme', 'toggle-now', 'settings',
    ]);
  });

  it('says what each command does', () => {
    const byId = new Map(buildCommands(context).map((command) => [command.id, command]));

    expect(byId.get('triage')?.action).toEqual({ type: 'triage' });
    expect(byId.get('session-30')?.action).toEqual({ type: 'startSession', minutes: 30 });
    expect(byId.get('view')?.action).toEqual({ type: 'view', view: 'focus' });
    expect(byId.get('workspace-w2')?.action).toEqual({ type: 'workspace', id: 'w2' });
    expect(byId.get('theme')?.action).toEqual({ type: 'theme', theme: 'light' });
    expect(byId.get('toggle-now')?.action).toEqual({ type: 'toggleNow', show: false });
    expect(byId.get('view')?.hint).toBe('F');
    expect(byId.get('new-collection')?.hint).toBe('N');
  });

  it('adapts to the moment: no triage, a session running, Focus on screen, light theme, Now hidden', () => {
    const ids = buildCommands({ ...context, triageCount: 0, sessionActive: true, view: 'focus', theme: 'light', showNow: false });
    const byId = new Map(ids.map((command) => [command.id, command]));

    expect(byId.has('triage')).toBe(false);
    expect(byId.has('session-15')).toBe(false);
    expect(byId.get('end-session')?.action).toEqual({ type: 'endSession' });
    expect(byId.get('view')?.action).toEqual({ type: 'view', view: 'board' });
    expect(byId.get('theme')?.action).toEqual({ type: 'theme', theme: 'dark' });
    expect(byId.get('toggle-now')?.action).toEqual({ type: 'toggleNow', show: true });
  });
});

describe('matchCommands', () => {
  const commands = buildCommands(context);

  it('keeps the commands whose words start with every typed word', () => {
    expect(matchCommands(commands, 'theme').map((command) => command.id)).toEqual(['theme']);
    expect(matchCommands(commands, '> start sess').map((command) => command.id)).toEqual(['session-15', 'session-30', 'session-60']);
    expect(matchCommands(commands, 'zzz')).toEqual([]);
  });

  it('keeps every command for an empty query', () => {
    expect(matchCommands(commands, '>')).toHaveLength(commands.length);
  });
});

describe('isCommandQuery', () => {
  it('is a query that starts with >', () => {
    expect(isCommandQuery(' > tema')).toBe(true);
    expect(isCommandQuery('tema')).toBe(false);
  });
});
