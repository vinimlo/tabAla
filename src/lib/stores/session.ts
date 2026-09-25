/**
 * The Focus session in progress, shared by every tab through storage.
 */
import { writable, type Readable } from 'svelte/store';
import {
  clearFocusSession, getFocusSession, markSessionCompletion, saveFocusSession, storage,
} from '@/lib/storage';
import { parseFocusSession, SESSION_TTL_MS, type FocusSession } from '@/lib/recommend/session';

interface SessionState {
  session: FocusSession | null;
  loading: boolean;
}

function createSessionStore(): {
  subscribe: Readable<SessionState>['subscribe'];
  load: (now?: number) => Promise<void>;
  start: (session: FocusSession) => Promise<void>;
  markCompleted: (linkId: string, completed: boolean) => Promise<void>;
  end: () => Promise<void>;
} {
  const { subscribe, set } = writable<SessionState>({ session: null, loading: true });

  storage.watch((changes) => {
    if (changes.focusSession !== undefined) {
      set({ session: parseFocusSession(changes.focusSession.newValue), loading: false });
    }
  });

  return {
    subscribe,
    async load(now = Date.now()): Promise<void> {
      const session = await getFocusSession();
      if (session !== null && now - session.startedAt > SESSION_TTL_MS) {
        await clearFocusSession();
        set({ session: null, loading: false });
        return;
      }
      set({ session, loading: false });
    },
    async start(session: FocusSession): Promise<void> {
      await saveFocusSession(session);
      set({ session, loading: false });
    },
    async markCompleted(linkId: string, completed: boolean): Promise<void> {
      await markSessionCompletion(linkId, completed);
      set({ session: await getFocusSession(), loading: false });
    },
    async end(): Promise<void> {
      await clearFocusSession();
      set({ session: null, loading: false });
    },
  };
}

export const sessionStore = createSessionStore();
