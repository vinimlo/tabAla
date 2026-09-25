/**
 * Content type derived from the URL.
 */
import { describe, it, expect } from 'vitest';
import { linkKind } from '@/lib/link-kind';

describe('linkKind', () => {
  it.each([
    ['file:///Users/me/notes/index.html', 'file'],
    ['https://www.youtube.com/watch?v=abc123', 'video'],
    ['https://youtu.be/abc123', 'video'],
    ['https://m.youtube.com/shorts/xyz', 'video'],
    ['https://vimeo.com/123456', 'video'],
    ['https://github.com/owner/repo/pull/55', 'code-change'],
    ['https://github.com/owner/repo/issues/12', 'code-change'],
    ['https://gitlab.com/group/project/-/merge_requests/7', 'code-change'],
    ['https://arxiv.org/abs/2401.00001', 'paper'],
    ['https://example.com/files/report.PDF', 'paper'],
    ['https://github.com/owner/repo', 'repo'],
    ['https://github.com/owner/repo/tree/main/src', 'repo'],
    ['https://github.com/features/copilot', 'page'],
    ['https://github.com/owner', 'page'],
    ['https://codeforces.com/contest/2000/problem/A', 'exercise'],
    ['https://atcoder.jp/contests/abc300/tasks/abc300_a', 'exercise'],
    ['https://cses.fi/problemset/task/1068', 'exercise'],
    ['https://docs.python.org/3/library/py_compile.html', 'docs'],
    ['https://developer.chrome.com/docs/extensions', 'docs'],
    ['https://example.com/docs/getting-started', 'docs'],
    ['https://x.com/someone/status/1', 'social'],
    ['https://www.linkedin.com/posts/someone_activity-1', 'social'],
    ['https://www.google.com/search?q=harness+engineering', 'search'],
    ['https://www.google.com.br/search?q=teste', 'search'],
    ['https://duckduckgo.com/?q=tabala', 'search'],
    ['https://www.anthropic.com/news/claude', 'page'],
    ['https://claude.ai/chat/0a1b2c', 'chat'],
    ['https://claude.ai/project/0a1b2c', 'chat'],
    ['https://chatgpt.com/c/6aac817e', 'chat'],
    ['https://chatgpt.com/g/g-abc123/c/6aad', 'chat'],
    ['https://chat.openai.com/c/123', 'chat'],
    ['https://gemini.google.com/app/5f2c', 'chat'],
    ['https://notebooklm.google.com/notebook/e226b780', 'chat'],
    ['https://notebook.google.com/notebook/e226b780', 'chat'],
    ['https://learn.chatgpt.com/docs/quickstart', 'docs'],
    ['https://claude.ai/login', 'page'],
    ['not a url', 'page'],
  ])('%s is %s', (url, kind) => {
    expect(linkKind(url)).toBe(kind);
  });
});
