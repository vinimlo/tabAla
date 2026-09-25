import { describe, it, expect } from 'vitest';
import { linkActions } from '@/newtab/palette-actions';
import { createMockLink } from '../factories';

describe('linkActions', () => {
  it('offers everything for a pending link', () => {
    expect(linkActions(createMockLink()).map((action) => action.id)).toEqual(['open', 'complete', 'snooze', 'move', 'reveal', 'discard']);
  });

  it('offers to restore a completed link, and nothing to snooze', () => {
    expect(linkActions(createMockLink({ completedAt: 1 })).map((action) => action.id)).toEqual(['open', 'restore', 'move', 'reveal', 'discard']);
  });

  it('marks discard as dangerous and shows the keys of the shortcuts', () => {
    const actions = new Map(linkActions(createMockLink()).map((action) => [action.id, action]));
    expect(actions.get('discard')?.danger).toBe(true);
    expect(actions.get('open')?.keys).toEqual(['↵']);
    expect(actions.get('reveal')?.keys).toEqual(['⇧', '↵']);
  });
});
