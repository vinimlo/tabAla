/** The Focus session in progress (spec §11.1): local, never exported. */
import { parseFocusSession, type FocusSession } from '../recommend/session';
import { storage, withDataLock } from './core';

export const SESSION_KEY = 'focusSession';

export async function getFocusSession(): Promise<FocusSession | null> {
  return parseFocusSession(await storage.get<unknown>(SESSION_KEY));
}

export async function saveFocusSession(session: FocusSession): Promise<void> {
  await withDataLock(() => storage.set(SESSION_KEY, session));
}

export async function clearFocusSession(): Promise<void> {
  await withDataLock(() => storage.remove(SESSION_KEY));
}

/** Marks a link of the plan as completed during the session, or not; links outside the plan change nothing. */
export async function markSessionCompletion(linkId: string, completed: boolean): Promise<void> {
  await withDataLock(async () => {
    const session = parseFocusSession(await storage.get<unknown>(SESSION_KEY));
    if (session === null || !session.items.some((item) => item.type === 'link' && item.linkId === linkId)) {
      return;
    }
    const others = session.completedIds.filter((id) => id !== linkId);
    await storage.set(SESSION_KEY, { ...session, completedIds: completed ? [...others, linkId] : others });
  });
}
