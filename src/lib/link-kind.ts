/**
 * Content type of a saved link, derived from its URL (never stored).
 * Shared by search (kind filters) and the upcoming recommendation space.
 */
export type LinkKind =
  | 'file'
  | 'video'
  | 'code-change'
  | 'paper'
  | 'repo'
  | 'exercise'
  | 'docs'
  | 'social'
  | 'search'
  | 'page';

/** Display order of kind chips. */
export const LINK_KINDS: readonly LinkKind[] = [
  'video', 'paper', 'repo', 'code-change', 'docs', 'exercise', 'social', 'search', 'file', 'page',
];

const PAPER_HOSTS = ['arxiv.org', 'openreview.net', 'aclanthology.org', 'dl.acm.org', 'ieeexplore.ieee.org'];
const SOCIAL_HOSTS = ['x.com', 'twitter.com', 'bsky.app'];
/** First path segments of github.com that are site pages, not repositories. */
const GITHUB_RESERVED = new Set([
  'about', 'collections', 'enterprise', 'explore', 'features', 'login', 'marketplace',
  'notifications', 'orgs', 'pricing', 'search', 'settings', 'sponsors', 'topics', 'trending',
]);

function onDomain(host: string, domain: string): boolean {
  return host === domain || host.endsWith(`.${domain}`);
}

function isVideo(host: string, path: string): boolean {
  return (onDomain(host, 'youtube.com') && (path === '/watch' || path.startsWith('/shorts/')))
    || host === 'youtu.be'
    || (host === 'vimeo.com' && /^\/\d+/.test(path));
}

function isCodeChange(host: string, segments: string[], path: string): boolean {
  if (host === 'github.com') {
    return segments.length >= 4
      && (segments[2] === 'pull' || segments[2] === 'issues')
      && /^\d+$/.test(segments[3]);
  }
  return host === 'gitlab.com' && /\/-\/(merge_requests|issues)\/\d+/.test(path);
}

function isRepo(host: string, segments: string[]): boolean {
  if (host === 'github.com') {
    return segments.length >= 2 && !GITHUB_RESERVED.has(segments[0]);
  }
  return host === 'gitlab.com' && segments.length >= 2;
}

function isExercise(host: string, path: string): boolean {
  return (onDomain(host, 'codeforces.com') && path.includes('/problem/'))
    || (host === 'atcoder.jp' && /^\/contests\/[^/]+\/tasks\/[^/]+/.test(path))
    || (host === 'cses.fi' && path.startsWith('/problemset/task/'))
    || (host === 'leetcode.com' && path.startsWith('/problems/'))
    || (host === 'vjudge.net' && path.startsWith('/problem/'))
    || (host === 'judge.beecrowd.com' && path.includes('/problems/view/'));
}

function isDocs(host: string, path: string): boolean {
  return /^(docs|developer|developers|learn)\./.test(host)
    || onDomain(host, 'readthedocs.io')
    || /\/(docs|documentation)(\/|$)/.test(path);
}

function isSocial(host: string, path: string): boolean {
  return SOCIAL_HOSTS.some((domain) => onDomain(host, domain))
    || (onDomain(host, 'linkedin.com') && path.startsWith('/posts/'))
    || (onDomain(host, 'reddit.com') && path.startsWith('/r/'))
    || (host === 'news.ycombinator.com' && path === '/item');
}

function isSearch(host: string, url: URL): boolean {
  return (/(^|\.)google\.[a-z.]+$/.test(host) && url.pathname === '/search')
    || (onDomain(host, 'bing.com') && url.pathname === '/search')
    || (host === 'duckduckgo.com' && url.searchParams.has('q'));
}

export function linkKind(url: string): LinkKind {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return 'page';
  }
  if (parsed.protocol === 'file:') {
    return 'file';
  }
  const host = parsed.hostname.toLowerCase().replace(/^www\./, '');
  const path = parsed.pathname;
  const segments = path.split('/').filter((segment) => segment !== '');

  if (isVideo(host, path)) { return 'video'; }
  if (isCodeChange(host, segments, path)) { return 'code-change'; }
  if (PAPER_HOSTS.some((domain) => onDomain(host, domain)) || path.toLowerCase().endsWith('.pdf')) { return 'paper'; }
  if (isRepo(host, segments)) { return 'repo'; }
  if (isExercise(host, path)) { return 'exercise'; }
  if (isDocs(host, path)) { return 'docs'; }
  if (isSocial(host, path)) { return 'social'; }
  if (isSearch(host, parsed)) { return 'search'; }
  return 'page';
}
