/**
 * The stored Focus session (spec §11.1).
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { chromeMock, clearMockStorage } from '../../setup';
import {
  clearFocusSession, clearUsageData, getFocusSession, markSessionCompletion, saveFocusSession,
} from '@/lib/storage';
import type { FocusSession } from '@/lib/recommend/session';

const session: FocusSession = {
  minutes: 30, startedAt: 1000, completedIds: [], items: [{ type: 'link', linkId: 'a' }, { type: 'link', linkId: 'b' }],
};

describe('focus session storage', () => {
  beforeEach(() => clearMockStorage());

  it('saves, reads and clears the session', async () => {
    await saveFocusSession(session);
    expect(await getFocusSession()).toEqual(session);

    await clearFocusSession();
    expect(await getFocusSession()).toBeNull();
  });

  it('reads a malformed value as no session', async () => {
    await chromeMock.storage.local.set({ focusSession: { minutes: 30 } });
    expect(await getFocusSession()).toBeNull();
  });

  it('marks and unmarks a link of the plan as completed, and ignores links outside it', async () => {
    await saveFocusSession(session);

    await markSessionCompletion('a', true);
    await markSessionCompletion('z', true);
    expect((await getFocusSession())?.completedIds).toEqual(['a']);

    await markSessionCompletion('a', false);
    expect((await getFocusSession())?.completedIds).toEqual([]);
  });

  it('is erased with the usage data', async () => {
    await saveFocusSession(session);
    await clearUsageData();
    expect(await getFocusSession()).toBeNull();
  });
});
