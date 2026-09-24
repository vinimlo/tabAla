/**
 * Popup, new tab and service worker each keep their own copy of the data and
 * write to the same chrome.storage keys. These tests reproduce the
 * interleavings that used to lose or resurrect links.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { get } from 'svelte/store';
import { chromeMock, clearMockStorage } from '../setup';
import { addLink, removeLink, getLinks, initializeInbox } from '@/lib/storage';
import { linksStore } from '@/lib/stores/links';
import type { Link } from '@/lib/types';
import { createMockLink } from '../factories';

/** Delivers a storage change to every onChanged listener, as Chrome does. */
function emitStorageChange(changes: Record<string, chrome.storage.StorageChange>): void {
  for (const [listener] of chromeMock.storage.onChanged.addListener.mock.calls) {
    (listener as (c: typeof changes, area: string) => void)(changes, 'local');
  }
}

async function storedUrls(): Promise<string[]> {
  return (await getLinks()).map((l) => l.url).sort();
}

describe('concurrent writes', () => {
  beforeEach(async () => {
    clearMockStorage();
    await initializeInbox();
  });

  it('keeps both links when two saves run at the same time', async () => {
    await Promise.all([
      addLink({ url: 'https://a.example', title: 'A' }),
      addLink({ url: 'https://b.example', title: 'B' }),
    ]);

    expect(await storedUrls()).toEqual(['https://a.example', 'https://b.example']);
  });

  it('keeps a link another context saved while this one had a stale copy', async () => {
    await addLink({ url: 'https://first.example', title: 'First' });
    await linksStore.load();

    // The popup saves while the new tab still holds the old list.
    await addLink({ url: 'https://popup.example', title: 'From popup' });
    await linksStore.addLink({ url: 'https://newtab.example', title: 'From new tab', collectionId: 'inbox' });

    expect(await storedUrls()).toEqual([
      'https://first.example',
      'https://newtab.example',
      'https://popup.example',
    ]);
  });

  it('does not bring back a link another context removed', async () => {
    await addLink({ url: 'https://keep.example', title: 'Keep' });
    const gone = await addLink({ url: 'https://gone.example', title: 'Gone' });
    await linksStore.load();

    await removeLink(gone.id);
    await linksStore.addLink({ url: 'https://new.example', title: 'New', collectionId: 'inbox' });

    expect(await storedUrls()).toEqual(['https://keep.example', 'https://new.example']);
  });

  it('keeps links saved elsewhere when removing from a stale copy', async () => {
    const old = await addLink({ url: 'https://old.example', title: 'Old' });
    await linksStore.load();

    await addLink({ url: 'https://popup.example', title: 'From popup' });
    await linksStore.removeLink(old.id);

    expect(await storedUrls()).toEqual(['https://popup.example']);
  });

  it('applies a change from another context even while a local save is in flight', () => {
    const mine = createMockLink({ id: 'mine', collectionId: 'inbox', createdAt: 1000 });
    const theirs = createMockLink({ id: 'theirs', collectionId: 'inbox', createdAt: 2000 });
    linksStore.update((s) => ({ ...s, loading: false, links: [mine], pendingLocalUpdate: true }));

    emitStorageChange({ links: { newValue: [theirs, mine] as Link[] } });

    expect(get(linksStore).links.map((l) => l.id)).toEqual(['theirs', 'mine']);
  });

  describe('with Web Locks available', () => {
    const realSet = chromeMock.storage.local.set.getMockImplementation();
    let insideLock = false;
    const writesOutsideLock: unknown[] = [];

    beforeEach(() => {
      writesOutsideLock.length = 0;
      Object.defineProperty(navigator, 'locks', {
        configurable: true,
        value: {
          request: async (_name: string, task: () => Promise<unknown>) => {
            insideLock = true;
            try {
              return await task();
            } finally {
              insideLock = false;
            }
          },
        },
      });
      vi.mocked(chromeMock.storage.local.set).mockImplementation((items, cb) => {
        if (!insideLock) {
          writesOutsideLock.push(items);
        }
        return realSet?.(items, cb) as Promise<void>;
      });
    });

    afterEach(() => {
      delete (navigator as unknown as Record<string, unknown>).locks;
      if (realSet) {
        vi.mocked(chromeMock.storage.local.set).mockImplementation(realSet);
      }
    });

    it('writes only while holding the lock shared by all extension contexts', async () => {
      await addLink({ url: 'https://locked.example', title: 'Locked' });

      expect(await storedUrls()).toEqual(['https://locked.example']);
      expect(writesOutsideLock).toEqual([]);
    });
  });
});
