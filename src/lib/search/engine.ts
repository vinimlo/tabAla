/**
 * Local ranked search over every workspace. Pure (no chrome APIs), so the
 * dashboard, the popup and the offline evaluation share it.
 */
import type { Collection, Link, Workspace } from '@/lib/types';
import { linkKind, type LinkKind } from '@/lib/link-kind';
import { parseQuery, tokenize, type Token } from './text';

type Field = 'title' | 'tags' | 'domain' | 'collection' | 'workspace' | 'path';

const FIELD_WEIGHTS: Record<Field, number> = {
  title: 3,
  tags: 2.5,
  domain: 2,
  collection: 1.5,
  workspace: 1,
  path: 1,
};
const FIELDS = Object.keys(FIELD_WEIGHTS) as Field[];

export interface IndexNames {
  collection: (collection: Collection) => string;
  workspace: (workspace: Workspace) => string;
}

const STORED_NAMES: IndexNames = {
  collection: (collection) => collection.name,
  workspace: (workspace) => workspace.name,
};

interface Entry {
  link: Link;
  kind: LinkKind;
  collectionName: string;
  workspaceId?: string;
  workspaceName?: string;
  tags: { tag: string; tokens: Token[] }[];
  fields: Record<Field, Token[]>;
}

export interface SearchIndex {
  entries: Entry[];
}

export interface SearchHit {
  link: Link;
  kind: LinkKind;
  score: number;
  collectionName: string;
  /** Undefined for Inbox links, which show in every workspace. */
  workspaceId?: string;
  workspaceName?: string;
  matchedTags: string[];
}

export interface SearchResult {
  /** Links matching every term, best first. */
  results: SearchHit[];
  /** Filled only when `results` is empty: links matching some of the terms. */
  partial: SearchHit[];
  /** Kind filters in effect (query words plus options). */
  kinds: LinkKind[];
  /** Text matches per kind, before kind filters (all links when there are no terms). */
  kindCounts: Partial<Record<LinkKind, number>>;
}

export interface SearchOptions {
  kinds?: LinkKind[];
  limit?: number;
}

interface Scored {
  entry: Entry;
  score: number;
  matched: number;
  matchedTags: string[];
}

/** Domain without "www" and without the top-level label; path words. */
function urlTokens(url: string): { domain: Token[]; path: Token[] } {
  try {
    const parsed = new URL(url);
    const labels = parsed.hostname.replace(/^www\./, '').split('.');
    const withoutTld = labels.length > 1 ? labels.slice(0, -1) : labels;
    return { domain: tokenize(withoutTld.join(' ')), path: tokenize(parsed.pathname) };
  } catch {
    return { domain: [], path: tokenize(url) };
  }
}

export function buildIndex(
  links: Link[],
  collections: Collection[],
  workspaces: Workspace[],
  names: IndexNames = STORED_NAMES
): SearchIndex {
  const collectionById = new Map(collections.map((c) => [c.id, c]));
  const workspaceById = new Map(workspaces.map((w) => [w.id, w]));

  const entries = links.map((link): Entry => {
    const collection = collectionById.get(link.collectionId);
    const workspace = collection?.workspaceId !== undefined
      ? workspaceById.get(collection.workspaceId)
      : undefined;
    const collectionName = collection !== undefined ? names.collection(collection) : '';
    const workspaceName = workspace !== undefined ? names.workspace(workspace) : undefined;
    const tags = (link.tags ?? []).map((tag) => ({ tag, tokens: tokenize(tag) }));
    const { domain, path } = urlTokens(link.url);

    return {
      link,
      kind: linkKind(link.url),
      collectionName,
      workspaceId: workspace?.id,
      workspaceName,
      tags,
      fields: {
        title: tokenize(link.title),
        tags: tags.flatMap((t) => t.tokens),
        domain,
        collection: tokenize(collectionName),
        workspace: tokenize(workspaceName ?? ''),
        path,
      },
    };
  });

  return { entries };
}

/** True when a and b differ by at most one insertion, deletion or substitution. */
export function withinOneEdit(a: string, b: string): boolean {
  if (Math.abs(a.length - b.length) > 1) {
    return false;
  }
  let i = 0;
  let j = 0;
  let edits = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      i += 1;
      j += 1;
      continue;
    }
    edits += 1;
    if (edits > 1) {
      return false;
    }
    if (a.length > b.length) {
      i += 1;
    } else if (a.length < b.length) {
      j += 1;
    } else {
      i += 1;
      j += 1;
    }
  }
  return edits + (a.length - i) + (b.length - j) <= 1;
}

function termScore(term: Token, token: Token): number {
  if (term.stem === token.stem) {
    return 1;
  }
  if (term.norm.length >= 2 && token.norm.startsWith(term.norm)) {
    return 0.8;
  }
  if (term.stem.length >= 5 && withinOneEdit(term.stem, token.stem)) {
    return 0.5;
  }
  return 0;
}

function scoreEntry(entry: Entry, terms: Token[]): Scored {
  let score = 0;
  let matched = 0;
  const matchedTags = new Set<string>();

  for (const term of terms) {
    let best = 0;
    for (const field of FIELDS) {
      for (const token of entry.fields[field]) {
        best = Math.max(best, FIELD_WEIGHTS[field] * termScore(term, token));
      }
    }
    for (const { tag, tokens } of entry.tags) {
      if (tokens.some((token) => termScore(term, token) > 0)) {
        matchedTags.add(tag);
      }
    }
    if (best > 0) {
      score += best;
      matched += 1;
    }
  }

  return { entry, score, matched, matchedTags: [...matchedTags] };
}

function toHit({ entry, score, matchedTags }: Scored): SearchHit {
  return {
    link: entry.link,
    kind: entry.kind,
    score,
    collectionName: entry.collectionName,
    workspaceId: entry.workspaceId,
    workspaceName: entry.workspaceName,
    matchedTags,
  };
}

function newestFirst(a: Scored, b: Scored): number {
  return b.entry.link.createdAt - a.entry.link.createdAt;
}

function countKinds(items: Scored[]): Partial<Record<LinkKind, number>> {
  const counts: Partial<Record<LinkKind, number>> = {};
  for (const { entry } of items) {
    counts[entry.kind] = (counts[entry.kind] ?? 0) + 1;
  }
  return counts;
}

export function search(index: SearchIndex, query: string, options: SearchOptions = {}): SearchResult {
  const parsed = parseQuery(query);
  const kinds = [...new Set([...parsed.kinds, ...(options.kinds ?? [])])];
  const limit = options.limit ?? 50;
  const passesKinds = (s: Scored): boolean => kinds.length === 0 || kinds.includes(s.entry.kind);

  if (parsed.terms.length === 0) {
    const all: Scored[] = index.entries.map((entry) => ({ entry, score: 0, matched: 0, matchedTags: [] }));
    const results = kinds.length === 0
      ? []
      : all.filter(passesKinds).sort(newestFirst).slice(0, limit).map(toHit);
    return { results, partial: [], kinds, kindCounts: countKinds(all) };
  }

  const scored = index.entries.map((entry) => scoreEntry(entry, parsed.terms));
  const full = scored.filter((s) => s.matched === parsed.terms.length);
  const results = full
    .filter(passesKinds)
    .sort((a, b) => b.score - a.score || newestFirst(a, b))
    .slice(0, limit)
    .map(toHit);
  const some = scored.filter((s) => s.matched > 0);
  const partial = results.length > 0
    ? []
    : some
      .filter(passesKinds)
      .sort((a, b) => b.matched - a.matched || b.score - a.score || newestFirst(a, b))
      .slice(0, limit)
      .map(toHit);

  return { results, partial, kinds, kindCounts: countKinds(full.length > 0 ? full : some) };
}
