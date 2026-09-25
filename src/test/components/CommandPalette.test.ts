/**
 * The ⌘K palette (spec §8): search, suggestions before typing, commands,
 * and acting on a link without leaving it.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/svelte';
import { tick } from 'svelte';
import CommandPalette from '@/newtab/components/CommandPalette.svelte';
import { recommendation, type Queue } from '@/lib/recommend/engine';
import { buildCommands } from '@/newtab/commands';
import { EMPTY_ACTIVITY } from '@/lib/types';
import { createMockCollection, createMockLink, createMockWorkspace } from '../factories';

const workspaces = [createMockWorkspace({ id: 'ws-agents', name: 'Agentes' })];
const collections = [
  createMockCollection({ id: 'inbox', name: 'Inbox', order: 0, isDefault: true }),
  createMockCollection({ id: 'hermes', name: 'Hermes Agent', order: 1, workspaceId: 'ws-agents' }),
];
const links = [
  createMockLink({ id: 'video', title: 'Hermes harness talk', url: 'https://www.youtube.com/watch?v=a', collectionId: 'hermes', createdAt: 3 }),
  createMockLink({ id: 'repo', title: 'hermes-agent', url: 'https://github.com/nous/hermes-agent', collectionId: 'hermes', createdAt: 2, tags: ['agentes', 'harness'] }),
  createMockLink({ id: 'other', title: 'Other thing', url: 'https://example.com/x', collectionId: 'inbox', createdAt: 1 }),
];
const knapsack = createMockLink({ id: 'knapsack', title: 'Knapsack tutorial', url: 'https://cp.example/knapsack', collectionId: 'inbox', createdAt: 9 });

const EVENTS = ['open', 'openInNewTab', 'reveal', 'close', 'command', 'complete', 'restore', 'snooze', 'discard', 'move'] as const;
type Handlers = Record<(typeof EVENTS)[number], ReturnType<typeof vi.fn>>;

function setup(props: Record<string, unknown> = {}): { handlers: Handlers; input: HTMLElement } {
  const handlers = Object.fromEntries(EVENTS.map((name) => [name, vi.fn()])) as Handlers;
  render(CommandPalette, { props: { links, collections, workspaces, ...props }, events: handlers });
  return { handlers, input: screen.getByPlaceholderText('search_placeholder') };
}

async function type(input: HTMLElement, value: string): Promise<void> {
  await fireEvent.input(input, { target: { value } });
}

const optionTexts = (): string[] => screen.getAllByRole('option').map((option) => option.textContent ?? '');
const detailOf = (handler: ReturnType<typeof vi.fn>): unknown => (handler.mock.calls[0][0] as CustomEvent).detail;

describe('CommandPalette: search', () => {
  it('adds the translated query to the search when it arrives', async () => {
    const translate = vi.fn((query: string) => Promise.resolve(query.startsWith('problema da mochila') ? 'knapsack' : null));
    const { input } = setup({ links: [...links, knapsack], translate });

    await type(input, 'problema da mochila');

    await waitFor(() => expect(optionTexts()).toEqual([expect.stringContaining('Knapsack tutorial')]));
  });

  it('ignores a translation that arrives after the query changed', async () => {
    let release: (value: string) => void = () => {};
    const translate = vi.fn((query: string) =>
      (query === 'mochila' ? new Promise<string>((resolve) => { release = resolve; }) : Promise.resolve(null)));
    const { input } = setup({ links: [...links, knapsack], translate });

    await type(input, 'mochila');
    await type(input, 'hermes');
    release('knapsack');
    await tick();

    expect(optionTexts().some((text) => text.includes('Knapsack'))).toBe(false);
    expect(screen.getAllByRole('option')).toHaveLength(2);
  });

  it('lists matches from any workspace with their path, and marks the matched words', async () => {
    const { input } = setup();
    await type(input, 'hermes');

    expect(optionTexts()).toEqual([expect.stringContaining('Hermes harness talk'), expect.stringContaining('hermes-agent')]);
    expect(within(screen.getByRole('listbox')).getAllByText('Agentes › Hermes Agent')).toHaveLength(2);
    expect(screen.getAllByRole('option')[0].querySelector('mark')?.textContent).toBe('Hermes');
  });

  it('moves with the arrows and opens the highlighted result with Enter', async () => {
    const { input, handlers } = setup();
    await type(input, 'hermes');
    await fireEvent.keyDown(input, { key: 'ArrowDown' });
    await fireEvent.keyDown(input, { key: 'Enter' });

    expect((detailOf(handlers.open) as { id: string }).id).toBe('repo');
  });

  it('opens in a new tab with Cmd+Enter and shows in the board with Shift+Enter', async () => {
    const { input, handlers } = setup();
    await type(input, 'hermes');
    await fireEvent.keyDown(input, { key: 'Enter', metaKey: true });
    await fireEvent.keyDown(input, { key: 'Enter', shiftKey: true });

    expect((detailOf(handlers.openInNewTab) as { id: string }).id).toBe('video');
    expect((detailOf(handlers.reveal) as { id: string }).id).toBe('video');
    expect(handlers.open).not.toHaveBeenCalled();
  });

  it('keeps the typing focus in the field when filters and results are clicked', async () => {
    const { input } = setup();
    await type(input, 'hermes');
    const chip = screen.getByRole('button', { name: /kind_video/, pressed: false });
    const firstResult = screen.getAllByRole('option')[0].querySelector('button') as HTMLElement;

    expect(await fireEvent.mouseDown(chip)).toBe(false);
    expect(await fireEvent.mouseDown(firstResult)).toBe(false);
  });

  it('filters by kind, and "All" clears the filter', async () => {
    const { input } = setup();
    await type(input, 'hermes');
    await fireEvent.click(screen.getByRole('button', { name: /kind_video/, pressed: false }));
    expect(optionTexts()).toEqual([expect.stringContaining('Hermes harness talk')]);

    await fireEvent.click(screen.getByRole('button', { name: /palette_all/ }));
    expect(screen.getAllByRole('option')).toHaveLength(2);
  });

  it('shows the tags of a result, marking the ones that matched', async () => {
    const { input } = setup();
    await type(input, 'agentes');

    expect(screen.getByText('agentes')).toHaveClass('matched');
    expect(screen.getByText('harness')).not.toHaveClass('matched');
  });

  it('says when nothing matches, inviting topic search when asked to', async () => {
    const { input } = setup({ topicSearchHint: true });
    await type(input, 'zzzzzz');

    expect(screen.getByText('palette_empty')).toBeInTheDocument();
    expect(screen.getByText('search_enable_topic_hint')).toBeInTheDocument();
  });

  it('marks completed links', async () => {
    const done = createMockLink({ id: 'done', title: 'Hermes finished talk', url: 'https://example.com/done', collectionId: 'hermes', createdAt: 5, completedAt: 6 });
    const { input } = setup({ links: [...links, done] });
    await type(input, 'finished');

    expect(screen.getByText('palette_completed_on')).toBeInTheDocument();
  });

  it('shows the address of a link saved without a title', async () => {
    const bare = createMockLink({ id: 'bare', title: '', url: 'https://example.org/untitled/notes', collectionId: 'inbox', createdAt: 4 });
    const { input } = setup({ links: [...links, bare] });
    await type(input, 'untitled');

    expect(optionTexts()).toEqual([expect.stringContaining('https://example.org/untitled/notes')]);
  });

  it('closes with Escape', async () => {
    const { input, handlers } = setup();
    await fireEvent.keyDown(input, { key: 'Escape' });
    expect(handlers.close).toHaveBeenCalledTimes(1);
  });
});

describe('CommandPalette: before typing, and commands', () => {
  const now = Date.now();
  // A fixed queue: what the engine picks is tested elsewhere.
  const queue: Queue = {
    slots: [recommendation(links[0], collections[1], 'advance', { type: 'nextInColumn' }, 20)],
    triage: [],
    fronts: [],
    size: 1,
    effortOf: () => 20,
  };
  const commands = buildCommands({ triageCount: 0, sessionActive: false, view: 'board', workspaces: [], theme: 'dark', showNow: true });

  it('suggests what to do now, what was opened lately and the actions', async () => {
    const activity = { other: { ...EMPTY_ACTIVITY, opens: 1, lastOpenedAt: now - 60_000 } };
    const { input, handlers } = setup({ queue, activity, commands });

    for (const label of ['now_title', 'palette_group_recent', 'palette_group_actions']) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
    await fireEvent.keyDown(input, { key: 'Enter' });

    expect((detailOf(handlers.open) as { id: string }).id).toBe(queue.slots[0].link.id);
  });

  it('shows only commands after ">", and runs the chosen one', async () => {
    const { input, handlers } = setup({ queue, commands });
    await type(input, '> theme');

    expect(optionTexts()).toEqual([expect.stringContaining('command_theme_light')]);
    await fireEvent.keyDown(input, { key: 'Enter' });

    expect(detailOf(handlers.command)).toEqual({ type: 'theme', theme: 'light' });
  });

  it('adds the matching commands after the results', async () => {
    const { input } = setup({ commands });
    await type(input, 'open');

    const texts = optionTexts();
    expect(texts[texts.length - 1]).toContain('command_open_focus');
  });
});

describe('CommandPalette: acting on a link', () => {
  it('shows the details of the selected link beside the list', async () => {
    const { input } = setup();
    await type(input, 'hermes');

    const preview = screen.getByRole('complementary', { name: 'palette_preview_label' });
    expect(within(preview).getByText('Hermes harness talk')).toBeInTheDocument();
    expect(within(preview).getByText('palette_never')).toBeInTheDocument();
  });

  it('completes with Option+Enter, and restores a completed link the same way', async () => {
    const done = createMockLink({ id: 'done', title: 'Hermes finished talk', collectionId: 'hermes', completedAt: 6 });
    const { input, handlers } = setup({ links: [...links, done] });
    await type(input, 'hermes harness');
    await fireEvent.keyDown(input, { key: 'Enter', altKey: true });
    await type(input, 'finished');
    await fireEvent.keyDown(input, { key: 'Enter', altKey: true });

    expect((detailOf(handlers.complete) as { id: string }).id).toBe('video');
    expect((detailOf(handlers.restore) as { id: string }).id).toBe('done');
    expect(handlers.open).not.toHaveBeenCalled();
  });

  it('does nothing on Option+Enter without a result', async () => {
    const { input, handlers } = setup();
    await type(input, 'zzzzzz');
    await fireEvent.keyDown(input, { key: 'Enter', altKey: true });

    expect(handlers.complete).not.toHaveBeenCalled();
    expect(handlers.open).not.toHaveBeenCalled();
  });

  it('walks into the actions with the right arrow and runs one with Enter', async () => {
    const { input, handlers } = setup();
    await type(input, 'hermes');
    await fireEvent.keyDown(input, { key: 'ArrowRight' });
    await fireEvent.keyDown(input, { key: 'ArrowDown' });
    await fireEvent.keyDown(input, { key: 'ArrowDown' });
    await fireEvent.keyDown(input, { key: 'Enter' });

    expect(detailOf(handlers.snooze)).toMatchObject({ link: { id: 'video' } });
  });

  it('moves a link to another collection, filtered by what is typed, and comes back to the results', async () => {
    const extra = createMockCollection({ id: 'reading', name: 'Leituras', order: 2, workspaceId: 'ws-agents' });
    const { input, handlers } = setup({ collections: [...collections, extra] });
    await type(input, 'hermes harness');
    await fireEvent.click(screen.getByRole('button', { name: /palette_action_move/ }));

    expect(screen.getByPlaceholderText('palette_move_placeholder')).toBeInTheDocument();
    await type(input, 'leit');
    expect(optionTexts()).toEqual([expect.stringContaining('Agentes › Leituras')]);
    await fireEvent.keyDown(input, { key: 'Enter' });

    expect(detailOf(handlers.move)).toMatchObject({ link: { id: 'video' }, collectionId: 'reading' });
    expect((input as HTMLInputElement).value).toBe('hermes harness');
  });

  it('leaves "move" with Escape without closing', async () => {
    const { input, handlers } = setup();
    await type(input, 'hermes');
    await fireEvent.click(screen.getAllByRole('button', { name: /palette_action_move/ })[0]);
    await fireEvent.keyDown(input, { key: 'Escape' });

    expect(handlers.close).not.toHaveBeenCalled();
    expect(handlers.move).not.toHaveBeenCalled();
    expect(screen.getByPlaceholderText('search_placeholder')).toBeInTheDocument();
  });

  it('in a narrow window, drops the details and offers the actions in a menu', async () => {
    const { input, handlers } = setup({ wide: false });
    await type(input, 'hermes');

    expect(screen.queryByRole('complementary')).toBeNull();
    await fireEvent.keyDown(input, { key: 'ArrowRight' });
    await fireEvent.click(await screen.findByRole('menuitem', { name: 'progress_discard' }));

    expect((detailOf(handlers.discard) as { id: string }).id).toBe('video');
  });

  it('in a narrow window, gives the focus back to the field after the menu', async () => {
    const { input } = setup({ wide: false });
    await type(input, 'hermes');

    await fireEvent.keyDown(input, { key: 'ArrowRight' });
    await fireEvent.keyDown(await screen.findByRole('menu'), { key: 'Escape' });
    await tick();
    expect(document.activeElement).toBe(input);

    await fireEvent.keyDown(input, { key: 'ArrowRight' });
    await fireEvent.click(await screen.findByRole('menuitem', { name: 'progress_discard' }));
    await tick();
    expect(document.activeElement).toBe(input);
  });
});
