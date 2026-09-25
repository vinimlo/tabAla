/**
 * Service worker tests.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { chromeMock } from '../setup';
const { createStorageMock } = await vi.hoisted(() => import('../mocks/storage'));

vi.mock('@/lib/storage', () => createStorageMock());

describe('service-worker', () => {
  let onInstalledCallback: (details: { reason: string }) => void;
  let initializeInbox: ReturnType<typeof vi.fn>;
  // eslint-disable-next-line @typescript-eslint/unbound-method
  const addListenerMock = vi.mocked(chrome.runtime.onInstalled).addListener;

  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();

    // Re-mock storage after resetModules
    vi.mock('@/lib/storage', () => createStorageMock());

    // Capture the listener callback when onInstalled.addListener is called
    addListenerMock.mockImplementation(
      (cb: (details: { reason: string }) => void) => {
        onInstalledCallback = cb;
      }
    );

    // Get the mocked initializeInbox
    const storage = await import('@/lib/storage');
    initializeInbox = vi.mocked(storage.initializeInbox);
  });

  async function loadServiceWorker(): Promise<void> {
    await import('@/background/service-worker');
  }

  it('should register a listener on chrome.runtime.onInstalled', async () => {
    await loadServiceWorker();

    expect(addListenerMock).toHaveBeenCalledTimes(1);
    expect(addListenerMock).toHaveBeenCalledWith(
      expect.any(Function)
    );
  });

  it('should call initializeInbox on install event', async () => {
    await loadServiceWorker();
    onInstalledCallback({ reason: 'install' });

    await vi.waitFor(() => {
      expect(initializeInbox).toHaveBeenCalledTimes(1);
    });
  });

  it('should call initializeInbox on update event', async () => {
    await loadServiceWorker();
    onInstalledCallback({ reason: 'update' });

    await vi.waitFor(() => {
      expect(initializeInbox).toHaveBeenCalledTimes(1);
    });
  });

  it('should NOT call initializeInbox for chrome_update reason', async () => {
    await loadServiceWorker();
    onInstalledCallback({ reason: 'chrome_update' });

    await new Promise((r) => setTimeout(r, 50));
    expect(initializeInbox).not.toHaveBeenCalled();
  });

  it('should NOT call initializeInbox for shared_module_update reason', async () => {
    await loadServiceWorker();
    onInstalledCallback({ reason: 'shared_module_update' });

    await new Promise((r) => setTimeout(r, 50));
    expect(initializeInbox).not.toHaveBeenCalled();
  });

  it('should handle initializeInbox failure without crashing', async () => {
    const error = new Error('Storage unavailable');
    initializeInbox.mockRejectedValue(error);

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await loadServiceWorker();
    onInstalledCallback({ reason: 'install' });

    await vi.waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(
        '[TabAla] Failed to initialize Inbox:',
        error
      );
    });

    consoleSpy.mockRestore();
  });

  it('listens to tabs and windows to learn from browsing', async () => {
    await loadServiceWorker();

    for (const event of [chrome.tabs.onUpdated, chrome.tabs.onActivated, chrome.tabs.onRemoved, chrome.windows.onFocusChanged]) {
      expect(vi.mocked(event.addListener)).toHaveBeenCalledTimes(1);
    }
  });

  it('re-marks open tabs when saved links change, and on browser start', async () => {
    const storage = await import('@/lib/storage');
    vi.mocked(storage.getLinks).mockResolvedValue([
      { id: 'l1', url: 'https://example.com/post', title: 'Post', collectionId: 'inbox', createdAt: 1 },
    ]);
    chromeMock.tabs.query.mockResolvedValue([
      { id: 3, windowId: 10, url: 'https://example.com/post', active: false, incognito: false },
    ] as never[]);
    await loadServiceWorker();
    const onChanged = chromeMock.storage.onChanged.addListener.mock.calls[0][0] as (
      changes: Record<string, unknown>, area: string
    ) => void;

    onChanged({ links: { newValue: [] } }, 'local');
    await vi.waitFor(() => expect(chrome.action.setBadgeText).toHaveBeenCalledWith({ tabId: 3, text: '•' }));

    expect(chromeMock.runtime.onStartup.addListener).toHaveBeenCalledTimes(1);
    chromeMock.tabs.query.mockImplementation(() => Promise.resolve([]));
  });

  it('records an open and marks the tab when a saved page finishes loading', async () => {
    const storage = await import('@/lib/storage');
    vi.mocked(storage.getLinks).mockResolvedValue([
      { id: 'l1', url: 'https://example.com/post', title: 'Post', collectionId: 'inbox', createdAt: 1 },
    ]);
    await loadServiceWorker();
    // eslint-disable-next-line @typescript-eslint/unbound-method
    const onUpdated = vi.mocked(chrome.tabs.onUpdated.addListener).mock.calls[0][0] as (
      id: number, change: { status?: string }, tab: chrome.tabs.Tab
    ) => void;

    onUpdated(1, { status: 'complete' }, {
      id: 1, windowId: 10, url: 'https://example.com/post', active: true, incognito: false,
    } as chrome.tabs.Tab);

    await vi.waitFor(() => {
      expect(storage.recordBrowsingOpen).toHaveBeenCalledWith(['l1'], expect.any(Number));
      expect(chrome.action.setBadgeText).toHaveBeenCalledWith({ tabId: 1, text: '•' });
    });
  });
});
