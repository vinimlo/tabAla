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
    ['Esc closes the open layer, wherever the focus is', 'closeLayer', true, keydown({ key: 'Escape' })],
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
    ['f on the page toggles Focus', 'toggleFocus', false, keydown({ key: 'f' })],
    ['f typed in a field does nothing', null, false, keydown({ key: 'f' }, input)],
    ['Ctrl+F is left to the browser', null, false, keydown({ key: 'f', ctrlKey: true })],
    ['f does nothing while a layer is open', null, true, keydown({ key: 'f' })],
    ['Cmd+N is left to the browser', null, false, keydown({ key: 'n', metaKey: true })],
  ] as const)('%s -> %s', (_label, expected, layerOpen, event) => {
    expect(dashboardShortcut(event, layerOpen)).toBe(expected);
  });

  it.each([
    ['f does not switch the page behind a modal', null, keydown({ key: 'f' })],
    ['t does not open the tabs behind a modal', null, keydown({ key: 't' })],
    ['n does not stack another modal', null, keydown({ key: 'n' })],
    ['Cmd+K does not open the palette over a modal', null, keydown({ key: 'k', metaKey: true })],
    ['Esc still closes the modal', 'closeAll', keydown({ key: 'Escape' })],
  ] as const)('with a modal or menu open: %s -> %s', (_label, expected, event) => {
    expect(dashboardShortcut(event, false, true)).toBe(expected);
  });
});
