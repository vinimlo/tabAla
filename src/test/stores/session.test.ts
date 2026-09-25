import { describe, it, expect, vi, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import * as storage from '@/lib/storage';
import { sessionStore } from '@/lib/stores/session';
import type { FocusSession } from '@/lib/recommend/session';
const { createStorageMock } = await vi.hoisted(() => import('../mocks/storage'));

vi.mock('@/lib/storage', () => createStorageMock());

const now = new Date(2026, 8, 25, 10).getTime();
const session: FocusSession = { minutes: 30, startedAt: now - 60 * 60_000, completedIds: [], items: [{ type: 'link', linkId: 'a' }] };

describe('sessionStore', () => {
  beforeEach(() => vi.clearAllMocks());

  it('loads the stored session', async () => {
    vi.mocked(storage.getFocusSession).mockResolvedValueOnce(session);
    await sessionStore.load(now);
    expect(get(sessionStore)).toEqual({ session, loading: false });
  });

  it('drops a session started more than twelve hours ago', async () => {
    vi.mocked(storage.getFocusSession).mockResolvedValueOnce({ ...session, startedAt: now - 13 * 60 * 60_000 });
    await sessionStore.load(now);

    expect(storage.clearFocusSession).toHaveBeenCalledTimes(1);
    expect(get(sessionStore).session).toBeNull();
  });

  it('starts, records completions and ends', async () => {
    await sessionStore.start(session);
    expect(storage.saveFocusSession).toHaveBeenCalledWith(session);
    expect(get(sessionStore).session).toEqual(session);

    vi.mocked(storage.getFocusSession).mockResolvedValueOnce({ ...session, completedIds: ['a'] });
    await sessionStore.markCompleted('a', true);
    expect(storage.markSessionCompletion).toHaveBeenCalledWith('a', true);
    expect(get(sessionStore).session?.completedIds).toEqual(['a']);

    await sessionStore.end();
    expect(storage.clearFocusSession).toHaveBeenCalled();
    expect(get(sessionStore).session).toBeNull();
  });
});
