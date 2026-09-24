import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import { tick } from 'svelte';
import SearchPanel from '@/newtab/components/SearchPanel.svelte';
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

type Handlers = Record<'open' | 'openInNewTab' | 'reveal' | 'close', ReturnType<typeof vi.fn>>;

function setup(props: Record<string, unknown> = {}): { handlers: Handlers; input: HTMLElement } {
  const handlers: Handlers = { open: vi.fn(), openInNewTab: vi.fn(), reveal: vi.fn(), close: vi.fn() };
  render(SearchPanel, { props: { links, collections, workspaces, ...props }, events: handlers });
  return { handlers, input: screen.getByPlaceholderText('search_placeholder') };
}

async function type(input: HTMLElement, value: string): Promise<void> {
  await fireEvent.input(input, { target: { value } });
}

describe('SearchPanel', () => {
  const knapsack = createMockLink({
    id: 'knapsack', title: 'Knapsack tutorial', url: 'https://cp.example/knapsack', collectionId: 'inbox', createdAt: 9,
  });

  it('adds the translated query to the search when it arrives', async () => {
    const translate = vi.fn((query: string) =>
      Promise.resolve(query.startsWith('problema da mochila') ? 'knapsack' : null));
    const { input } = setup({ links: [...links, knapsack], translate });

    await type(input, 'problema da mochila');

    expect(await screen.findByText('Knapsack tutorial')).toBeInTheDocument();
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

    expect(screen.queryByText('Knapsack tutorial')).toBeNull();
    expect(screen.getAllByRole('option')).toHaveLength(2);
  });

  it('lists matches from any workspace with their path', async () => {
    const { input } = setup();
    await type(input, 'hermes');

    const options = screen.getAllByRole('option');
    expect(options.map((o) => o.textContent)).toEqual([
      expect.stringContaining('Hermes harness talk'),
      expect.stringContaining('hermes-agent'),
    ]);
    expect(screen.getAllByText('Agentes › Hermes Agent')).toHaveLength(2);
  });

  it('moves with the arrows and opens the highlighted result with Enter', async () => {
    const { input, handlers } = setup();
    await type(input, 'hermes');
    await fireEvent.keyDown(input, { key: 'ArrowDown' });
    await fireEvent.keyDown(input, { key: 'Enter' });

    expect(handlers.open).toHaveBeenCalledTimes(1);
    expect(handlers.open.mock.calls[0][0].detail.id).toBe('repo');
  });

  it('opens in a new tab with Cmd+Enter and shows in the board with Shift+Enter', async () => {
    const { input, handlers } = setup();
    await type(input, 'hermes');
    await fireEvent.keyDown(input, { key: 'Enter', metaKey: true });
    await fireEvent.keyDown(input, { key: 'Enter', shiftKey: true });

    expect(handlers.openInNewTab.mock.calls[0][0].detail.id).toBe('video');
    expect(handlers.reveal.mock.calls[0][0].detail.id).toBe('video');
    expect(handlers.open).not.toHaveBeenCalled();
  });

  it('closes with Escape', async () => {
    const { input, handlers } = setup();
    await fireEvent.keyDown(input, { key: 'Escape' });
    expect(handlers.close).toHaveBeenCalledTimes(1);
  });

  it('filters by a kind chip', async () => {
    const { input } = setup();
    await type(input, 'hermes');
    await fireEvent.click(screen.getByRole('button', { name: /kind_video/, pressed: false }));

    expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual([
      expect.stringContaining('Hermes harness talk'),
    ]);
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

    expect(screen.getByText('search_empty')).toBeInTheDocument();
    expect(screen.getByText('search_enable_topic_hint')).toBeInTheDocument();
  });
});
