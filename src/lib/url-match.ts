/**
 * Matching open tabs to saved links (spec §8.2): scheme, www., fragment,
 * trailing slash and tracking parameters do not make a different page.
 */
const TRACKING_PARAMS = new Set(['fbclid', 'gclid', 'si', 'ref', 'ref_src']);
const SHARE_PARAM_HOSTS = new Set(['x.com', 'twitter.com']);
const YOUTUBE_HOSTS = new Set(['youtube.com', 'm.youtube.com']);

/** A comparable key for a page, or null for pages TabAla does not track. */
export function normalizeUrl(url: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (parsed.protocol === 'file:') {
    return `file://${parsed.pathname}`;
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return null;
  }
  const hostname = parsed.hostname.toLowerCase().replace(/^www\./, '');
  const host = parsed.port === '' ? hostname : `${hostname}:${parsed.port}`;
  const path = parsed.pathname.length > 1 ? parsed.pathname.replace(/\/+$/, '') : parsed.pathname;

  if (hostname === 'youtu.be' && path.length > 1) {
    return `youtube.com/watch?v=${path.slice(1)}`;
  }
  const video = parsed.searchParams.get('v');
  if (YOUTUBE_HOSTS.has(hostname) && path === '/watch' && video !== null) {
    return `youtube.com/watch?v=${video}`;
  }

  const params = [...parsed.searchParams.entries()]
    .filter(([key]) => !key.startsWith('utm_') && !TRACKING_PARAMS.has(key)
      && !(key === 's' && SHARE_PARAM_HOSTS.has(hostname)))
    .sort(([a, av], [b, bv]) => a.localeCompare(b) || av.localeCompare(bv));
  const query = params.length === 0 ? '' : `?${new URLSearchParams(params).toString()}`;
  // A fragment that looks like an app route (#/x, #!x, #inbox/thread) names a
  // different page; a plain anchor (#section) does not.
  const route = /^#[/!]|\//.test(parsed.hash) ? parsed.hash : '';
  return `${host}${path}${query}${route}`;
}

export function sameUrl(a: string, b: string): boolean {
  const key = normalizeUrl(a);
  return key !== null && key === normalizeUrl(b);
}
