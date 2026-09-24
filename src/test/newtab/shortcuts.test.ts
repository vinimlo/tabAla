import { describe, it, expect } from 'vitest';
import { dashboardShortcut, opensSearch } from '@/newtab/shortcuts';

function keydown(init: KeyboardEventInit, target: EventTarget = document.body): KeyboardEvent {
  const event = new KeyboardEvent('keydown', init);
  Object.defineProperty(event, 'target', { value: target });
  return event;
}

describe('opensSearch', () => {
  const input = document.createElement('input');
  const textarea = document.createElement('textarea');

  it.each([
    ['Cmd+K', true, keydown({ key: 'k', metaKey: true })],
    ['Ctrl+K', true, keydown({ key: 'k', ctrlKey: true })],
    ['Ctrl+K while typing in a field', true, keydown({ key: 'k', ctrlKey: true }, input)],
    ['/ on the page', true, keydown({ key: '/' })],
    ['/ typed in a field', false, keydown({ key: '/' }, input)],
    ['/ typed in a textarea', false, keydown({ key: '/' }, textarea)],
    ['k alone', false, keydown({ key: 'k' })],
  ])('%s -> %s', (_label, expected, event) => {
    expect(opensSearch(event)).toBe(expected);
  });
});

describe('dashboardShortcut', () => {
  const input = document.createElement('input');

  it.each([
    ['Esc closes the open search, wherever the focus is', 'closeSearch', true, keydown({ key: 'Escape' })],
    ['n does nothing while the search is open', null, true, keydown({ key: 'n' })],
    ['t does nothing while the search is open', null, true, keydown({ key: 't' })],
    ['Cmd+K does nothing while the search is open', null, true, keydown({ key: 'k', metaKey: true })],
    ['Cmd+K opens the search', 'openSearch', false, keydown({ key: 'k', metaKey: true })],
    ['/ on the page opens the search', 'openSearch', false, keydown({ key: '/' })],
    ['/ typed in a field does nothing', null, false, keydown({ key: '/' }, input)],
    ['Esc closes dialogs', 'closeAll', false, keydown({ key: 'Escape' })],
    ['n on the page creates a collection', 'newCollection', false, keydown({ key: 'n' })],
    ['n typed in a field does nothing', null, false, keydown({ key: 'n' }, input)],
    ['t on the page toggles the tabs sidebar', 'toggleSidebar', false, keydown({ key: 't' })],
    ['Cmd+N is left to the browser', null, false, keydown({ key: 'n', metaKey: true })],
  ] as const)('%s -> %s', (_label, expected, searchOpen, event) => {
    expect(dashboardShortcut(event, searchOpen)).toBe(expected);
  });
});
