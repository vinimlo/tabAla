/**
 * Service worker tests.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
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
});
