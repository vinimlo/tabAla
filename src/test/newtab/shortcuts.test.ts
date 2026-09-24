import { describe, it, expect } from 'vitest';
import { opensSearch } from '@/newtab/shortcuts';

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
