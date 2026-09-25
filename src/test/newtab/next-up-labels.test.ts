/**
 * Texts of the next up strip.
 */
import { describe, it, expect } from 'vitest';
import { collectionPath, effortText, reasonText } from '@/newtab/next-up-labels';
import type { Reason } from '@/lib/recommend/engine';
import { createMockCollection, createMockWorkspace } from '../factories';

describe('next up labels', () => {
  it.each([
    [{ type: 'opened', days: 0 }, 'reason_opened_today'],
    [{ type: 'opened', days: 1 }, 'reason_opened_day'],
    [{ type: 'opened', days: 4 }, 'reason_opened_days'],
    [{ type: 'focus' }, 'reason_focus'],
    [{ type: 'momentum', count: 1 }, 'reason_momentum_one'],
    [{ type: 'momentum', count: 3 }, 'reason_momentum_many'],
    [{ type: 'nearlyDone', remaining: 1 }, 'reason_nearly_done_one'],
    [{ type: 'nearlyDone', remaining: 2 }, 'reason_nearly_done_many'],
    [{ type: 'nextInColumn' }, 'reason_next_in_column'],
    [{ type: 'stale', weeks: 1 }, 'reason_stale_week'],
    [{ type: 'stale', weeks: 3 }, 'reason_stale_weeks'],
  ] as [Reason, string][])('%j reads %s', (reason, key) => {
    expect(reasonText(reason)).toBe(key);
  });

  it('shows only the collection for Inbox, and "Workspace › Collection" otherwise', () => {
    const workspace = createMockWorkspace({ id: 'ws-a', name: 'Agentes' });
    expect(collectionPath(createMockCollection({ id: 'inbox', name: 'Inbox' }), [workspace])).toBe('common_inbox');
    expect(collectionPath(createMockCollection({ id: 'h', name: 'Hermes', workspaceId: 'ws-a' }), [workspace])).toBe('Agentes › Hermes');
  });

  it('writes the effort in minutes', () => {
    expect(effortText(10)).toBe('nextup_effort');
  });
});
