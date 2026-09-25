/**
 * URL matching between open tabs and saved links (spec §8.2).
 */
import { describe, it, expect } from 'vitest';
import { normalizeUrl, sameUrl } from '@/lib/url-match';

describe('normalizeUrl', () => {
  it.each([
    ['https://www.Example.com/Path/#section', 'example.com/Path'],
    ['http://example.com/a/', 'example.com/a'],
    ['https://example.com/', 'example.com/'],
    ['https://example.com:8080/a', 'example.com:8080/a'],
    ['https://example.com/a?utm_source=x&b=2&a=1&fbclid=z&gclid=g&ref=r&ref_src=s', 'example.com/a?a=1&b=2'],
    ['https://x.com/u/status/1?s=20', 'x.com/u/status/1'],
    ['https://twitter.com/u/status/1?s=20&t=abc', 'twitter.com/u/status/1?t=abc'],
    ['https://example.com/search?s=term', 'example.com/search?s=term'],
    ['https://www.youtube.com/watch?v=abc&t=42s&list=L', 'youtube.com/watch?v=abc'],
    ['https://m.youtube.com/watch?v=abc', 'youtube.com/watch?v=abc'],
    ['https://youtu.be/abc?si=xyz', 'youtube.com/watch?v=abc'],
    ['file:///Users/me/notes.html', 'file:///Users/me/notes.html'],
    ['chrome://newtab/', null],
    ['not a url', null],
  ])('%s -> %s', (url, expected) => {
    expect(normalizeUrl(url)).toBe(expected);
  });
});

describe('sameUrl', () => {
  it('matches across scheme, www, fragment and tracking', () => {
    expect(sameUrl('https://a.com/x', 'http://www.a.com/x/?utm_campaign=c#top')).toBe(true);
  });

  it('never matches pages it cannot read', () => {
    expect(sameUrl('chrome://newtab/', 'chrome://newtab/')).toBe(false);
  });
});
