import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { revealLink, workspaceForLink, REVEAL_MS } from '@/newtab/reveal';
import { createMockCollection, createMockLink } from '../factories';

describe('workspaceForLink', () => {
  const collections = [
    createMockCollection({ id: 'inbox', name: 'Inbox', isDefault: true }),
    createMockCollection({ id: 'cp', name: 'ICPC', workspaceId: 'ws-study' }),
  ];

  it('switches to the workspace of the link collection', () => {
    expect(workspaceForLink(createMockLink({ collectionId: 'cp' }), collections, 'general')).toBe('ws-study');
  });

  it('keeps the current workspace for Inbox links, which show everywhere', () => {
    expect(workspaceForLink(createMockLink({ collectionId: 'inbox' }), collections, 'ws-other')).toBe('ws-other');
  });
});

describe('revealLink', () => {
  const scrollIntoView = vi.fn();

  beforeEach(() => {
    vi.useFakeTimers();
    scrollIntoView.mockClear();
    Element.prototype.scrollIntoView = scrollIntoView;
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('scrolls to the card and highlights it for a while', async () => {
    const root = document.createElement('div');
    root.innerHTML = '<div data-link-id="a" tabindex="0"></div><div data-link-id="b" tabindex="0"></div>';
    const card = root.querySelector<HTMLElement>('[data-link-id="b"]')!;

    const promise = revealLink('b', root);
    expect(await promise).toBe(true);
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
    expect(card.classList.contains('revealed')).toBe(true);

    vi.advanceTimersByTime(REVEAL_MS);
    expect(card.classList.contains('revealed')).toBe(false);
  });

  it('reports a card that is not on screen', async () => {
    const promise = revealLink('missing', document.createElement('div'));
    expect(await promise).toBe(false);
  });
});
