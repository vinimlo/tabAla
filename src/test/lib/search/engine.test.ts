/**
 * Ranked local search across every workspace.
 */
import { describe, it, expect } from 'vitest';
import { buildIndex, search, withinOneEdit } from '@/lib/search/engine';
import { createMockLink, createMockCollection, createMockWorkspace } from '../../factories';

const workspaces = [
  createMockWorkspace({ id: 'general', name: 'Geral', isDefault: true }),
  createMockWorkspace({ id: 'ws-agents', name: 'Agentes & Coding', order: 1 }),
  createMockWorkspace({ id: 'ws-ml', name: 'IA & ML', order: 2 }),
];
const collections = [
  createMockCollection({ id: 'inbox', name: 'Inbox', order: 0, isDefault: true }),
  createMockCollection({ id: 'hermes', name: 'Hermes Agent', order: 1, workspaceId: 'ws-agents' }),
  createMockCollection({ id: 'classics', name: 'Clássicos & história', order: 2, workspaceId: 'ws-ml' }),
  createMockCollection({ id: 'tools', name: 'Ferramentas', order: 3, workspaceId: 'general' }),
];
const links = [
  createMockLink({ id: 'hermes-video', title: 'Hermes: building a harness', url: 'https://www.youtube.com/watch?v=aaa', collectionId: 'hermes', createdAt: 5 }),
  createMockLink({ id: 'hermes-repo', title: 'NousResearch/hermes-agent', url: 'https://github.com/NousResearch/hermes-agent', collectionId: 'hermes', createdAt: 4 }),
  createMockLink({ id: 'bitter', title: 'The Bitter Lesson', url: 'http://www.incompleteideas.net/IncIdeas/BitterLesson.html', collectionId: 'classics', createdAt: 3, tags: ['história da ia', 'escala', 'ai history'] }),
  createMockLink({ id: 'hybrid', title: 'Query-Adaptive Hybrid Search (PDF)', url: 'https://arxiv.org/pdf/2401.00001', collectionId: 'classics', createdAt: 2 }),
  createMockLink({ id: 'mckinsey', title: 'McKinsey Academy', url: 'https://www.mckinsey.com/academy', collectionId: 'inbox', createdAt: 1 }),
  createMockLink({ id: 'untitled', title: '', url: 'file:///Users/me/tools/index.html', collectionId: 'tools', createdAt: 0 }),
];
const index = buildIndex(links, collections, workspaces);
const ids = (hits: { link: { id: string } }[]): string[] => hits.map((hit) => hit.link.id);

describe('search', () => {
  it('finds links by a title word in any workspace, newest first on a tie', () => {
    expect(ids(search(index, 'hermes').results)).toEqual(['hermes-video', 'hermes-repo']);
  });

  it('tolerates one typo in longer words', () => {
    expect(ids(search(index, 'mckinsy').results)).toEqual(['mckinsey']);
  });

  it('ranks a tag match above a collection match, ignoring accents', () => {
    expect(ids(search(index, 'historia ').results)).toEqual(['bitter', 'hybrid']);
  });

  it('finds a link by its tags and reports which tags matched', () => {
    const [hit] = search(index, 'ai history ').results;
    expect(hit.link.id).toBe('bitter');
    expect(hit.matchedTags).toEqual(['ai history']);
  });

  it('turns kind words into a filter', () => {
    const result = search(index, 'video hermes ');
    expect(ids(result.results)).toEqual(['hermes-video']);
    expect(result.kinds).toEqual(['video']);
  });

  it('lists every link of a kind when the query is only a kind word', () => {
    expect(ids(search(index, 'paper').results)).toEqual(['hybrid']);
    expect(ids(search(index, 'repo').results)).toEqual(['hermes-repo']);
  });

  it('requires every term, falling back to partial matches', () => {
    const result = search(index, 'hermes lesson ');
    expect(result.results).toEqual([]);
    expect(ids(result.partial)).toEqual(['hermes-video', 'hermes-repo', 'bitter']);
  });

  it('matches the site and the collection, even for a link without title', () => {
    expect(ids(search(index, 'arxiv').results)).toEqual(['hybrid']);
    expect(ids(search(index, 'ferramentas').results)).toEqual(['untitled']);
  });

  it('combines kind chips from the options with the query', () => {
    expect(ids(search(index, 'hermes', { kinds: ['repo'] }).results)).toEqual(['hermes-repo']);
  });

  it('counts text matches per kind before the kind filter', () => {
    expect(search(index, 'hermes ', { kinds: ['repo'] }).kindCounts).toEqual({ video: 1, repo: 1 });
  });

  it('returns nothing for an empty or punctuation-only query', () => {
    expect(search(index, '').results).toEqual([]);
    expect(search(index, '!!!').results).toEqual([]);
    expect(search(index, '!!!').partial).toEqual([]);
  });

  it('reports the path of each hit, with no workspace for Inbox links', () => {
    const [inboxHit] = search(index, 'mckinsey ').results;
    expect(inboxHit.workspaceId).toBeUndefined();
    expect(inboxHit.collectionName).toBe('Inbox');
    const [paperHit] = search(index, 'arxiv ').results;
    expect(paperHit.workspaceId).toBe('ws-ml');
    expect(paperHit.workspaceName).toBe('IA & ML');
    expect(paperHit.collectionName).toBe('Clássicos & história');
  });

  it('uses the display names it is given', () => {
    const translated = buildIndex(links, collections, workspaces, {
      collection: (c) => (c.id === 'inbox' ? 'Caixa de entrada' : c.name),
      workspace: (w) => w.name,
    });
    expect(ids(search(translated, 'caixa').results)).toEqual(['mckinsey']);
  });

  it('limits the number of results', () => {
    expect(search(index, 'hermes', { limit: 1 }).results).toHaveLength(1);
  });
});

describe('withinOneEdit', () => {
  it.each([
    ['mckinsy', 'mckinsey', true],
    ['kitten', 'sitten', true],
    ['same', 'same', true],
    ['agent', 'agnet', false],
    ['abc', 'abcde', false],
  ])('%s ~ %s is %s', (a, b, expected) => {
    expect(withinOneEdit(a, b)).toBe(expected);
  });
});
