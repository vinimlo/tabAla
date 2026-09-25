/**
 * Visit tracker: tab and window events become opens, visit time and the
 * "completed?" question (spec §8.1).
 */
import { describe, it, expect, vi } from 'vitest';
import { createTracker, type Snapshot, type TabInfo, type TrackerDeps, type Visit } from '@/background/activity';
import { createMockCollection, createMockLink } from '../factories';

const MIN = 60_000;
const collection = createMockCollection({ id: 'c' });
const saved = createMockLink({ id: 'l1', url: 'https://example.com/post', collectionId: 'c' });
const copy = createMockLink({ id: 'l2', url: 'https://example.com/post?utm_source=x', collectionId: 'c' });
const done = createMockLink({ id: 'l3', url: 'https://example.com/done', collectionId: 'c', completedAt: 1 });

function tab(overrides: Partial<TabInfo> = {}): TabInfo {
  return { id: 1, windowId: 10, url: 'https://example.com/post#top', active: true, incognito: false, ...overrides };
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type -- the shape is the test fixture
function setup(snapshot: Partial<Snapshot> = {}, focused = 10) {
  let clock = new Date(2026, 8, 25, 10).getTime();
  let visit: Visit | null = null;
  let focusedId: number | null = focused;
  let unseen: number[] = [];
  const tabs: TabInfo[] = [];
  const deps = {
    now: (): number => clock,
    snapshot: vi.fn(() => Promise.resolve({ links: [saved, done], collections: [collection], activity: {}, learn: true, ...snapshot })),
    getVisit: vi.fn(() => Promise.resolve(visit)),
    setVisit: vi.fn((next: Visit | null) => { visit = next; return Promise.resolve(); }),
    getUnseen: vi.fn(() => Promise.resolve(unseen)),
    setUnseen: vi.fn((tabIds: number[]) => { unseen = tabIds; return Promise.resolve(); }),
    allTabs: vi.fn(() => Promise.resolve([...tabs])),
    focusedWindow: vi.fn(() => Promise.resolve(focusedId)),
    activeTab: vi.fn((windowId: number) => Promise.resolve(tabs.find((t) => t.windowId === windowId && t.active) ?? null)),
    isWindowFocused: vi.fn((windowId: number) => Promise.resolve(windowId === focusedId)),
    setBadge: vi.fn(() => Promise.resolve()),
    recordOpen: vi.fn(() => Promise.resolve()),
    recordVisit: vi.fn(() => Promise.resolve()),
  } satisfies TrackerDeps;
  return {
    deps,
    tabs,
    tracker: createTracker(deps),
    advance: (ms: number): void => { clock += ms; },
    visit: (): Visit | null => visit,
    focus: (windowId: number | null): void => { focusedId = windowId; },
  };
}

describe('tracker', () => {
  it('records an open when a saved page loads, and marks its tab', async () => {
    const { tracker, deps } = setup();

    await tracker.tabUpdated(tab(), true);

    expect(deps.recordOpen).toHaveBeenCalledWith(['l1'], expect.any(Number));
    expect(deps.setBadge).toHaveBeenCalledWith(1, '•');
  });

  it('does not count again when the same page only changes title', async () => {
    const { tracker, deps } = setup();
    await tracker.tabUpdated(tab(), true);
    await tracker.tabUpdated(tab(), false);
    expect(deps.recordOpen).toHaveBeenCalledTimes(1);
  });

  it('gives the open and the time to every copy of a page saved twice', async () => {
    const { tracker, deps, visit } = setup({ links: [saved, copy] });
    await tracker.tabUpdated(tab(), true);
    expect(deps.recordOpen).toHaveBeenCalledWith(['l1', 'l2'], expect.any(Number));
    expect(visit()?.linkIds).toEqual(['l1', 'l2']);
  });

  it('ignores pages that are not saved and completed links, and clears the mark', async () => {
    const { tracker, deps } = setup();
    await tracker.tabUpdated(tab({ url: 'https://example.com/done' }), true);
    expect(deps.recordOpen).not.toHaveBeenCalled();
    expect(deps.setBadge).toHaveBeenCalledWith(1, '');
  });

  it('never looks at incognito tabs', async () => {
    const { tracker, deps } = setup();
    await tracker.tabUpdated(tab({ incognito: true }), true);
    await tracker.tabActivated(tab({ incognito: true }));
    expect(deps.snapshot).not.toHaveBeenCalled();
    expect(deps.recordOpen).not.toHaveBeenCalled();
  });

  it('records nothing and shows no mark when learning is off', async () => {
    const { tracker, deps, visit } = setup({ learn: false });
    await tracker.tabUpdated(tab(), true);
    expect(deps.recordOpen).not.toHaveBeenCalled();
    expect(deps.setBadge).toHaveBeenCalledWith(1, '');
    expect(visit()).toBeNull();
  });

  it('times a visit and records it when the user switches tabs', async () => {
    const { tracker, deps, advance } = setup();
    await tracker.tabUpdated(tab(), true);
    advance(10 * MIN);

    await tracker.tabActivated(tab({ id: 2, url: 'https://other.example/' }));

    expect(deps.recordVisit).toHaveBeenCalledWith(['l1'], 10 * MIN, null, expect.any(Number));
  });

  it('asks "completed?" with a threshold when the tab closes', async () => {
    const { tracker, deps, advance } = setup();
    await tracker.tabUpdated(tab(), true);
    advance(7 * MIN);

    await tracker.tabRemoved(1);

    // A page takes ~10 min by default: half of it, at least 2 min.
    expect(deps.recordVisit).toHaveBeenCalledWith(['l1'], 7 * MIN, { l1: 5 * MIN }, expect.any(Number));
  });

  it('asks when the tab leaves the page for another one', async () => {
    const { tracker, deps, advance } = setup();
    await tracker.tabUpdated(tab(), true);
    advance(3 * MIN);

    await tracker.tabUpdated(tab({ url: 'https://other.example/' }), true);

    expect(deps.recordVisit).toHaveBeenCalledWith(['l1'], 3 * MIN, { l1: 5 * MIN }, expect.any(Number));
  });

  it('only the active tab of the focused window counts', async () => {
    const { tracker, visit } = setup({}, 99);
    await tracker.tabUpdated(tab(), true);
    expect(visit()).toBeNull();
    await tracker.tabUpdated(tab({ id: 5, active: false, windowId: 99 }), true);
    expect(visit()).toBeNull();
  });

  it('pauses when the browser loses focus and resumes in the window that gets it', async () => {
    const { tracker, deps, tabs, advance, visit } = setup();
    await tracker.tabUpdated(tab(), true);
    advance(4 * MIN);

    await tracker.windowFocused(null);
    expect(deps.recordVisit).toHaveBeenCalledWith(['l1'], 4 * MIN, null, expect.any(Number));
    expect(visit()).toBeNull();

    tabs.push(tab());
    await tracker.windowFocused(10);
    expect(visit()?.tabId).toBe(1);
  });

  it('a visit survives the service worker being stopped', async () => {
    const { deps, advance } = setup();
    await createTracker(deps).tabUpdated(tab(), true);
    advance(6 * MIN);

    await createTracker(deps).tabRemoved(1);

    expect(deps.recordVisit).toHaveBeenCalledWith(['l1'], 6 * MIN, { l1: 5 * MIN }, expect.any(Number));
  });

  it('a tab activated in a background window does not end the visit being read', async () => {
    const { tracker, deps, visit } = setup();
    await tracker.tabUpdated(tab(), true);

    await tracker.tabActivated(tab({ id: 7, windowId: 20, url: 'https://other.example/' }));

    expect(deps.recordVisit).not.toHaveBeenCalled();
    expect(visit()?.tabId).toBe(1);
  });

  it('moving to the same page in another window counts the time once and follows the user', async () => {
    const { tracker, deps, tabs, advance, visit, focus } = setup();
    await tracker.tabUpdated(tab(), true);
    advance(5 * MIN);

    focus(20);
    tabs.push(tab({ id: 2, windowId: 20 }));
    await tracker.windowFocused(20);

    expect(deps.recordVisit).toHaveBeenCalledTimes(1);
    expect(deps.recordVisit).toHaveBeenCalledWith(['l1'], 5 * MIN, null, expect.any(Number));
    expect(visit()?.tabId).toBe(2);
  });

  it('a page loaded in the background counts as opened only when the user looks at it, once', async () => {
    const { tracker, deps } = setup();

    await tracker.tabUpdated(tab({ active: false }), true);
    expect(deps.recordOpen).not.toHaveBeenCalled();

    await tracker.tabActivated(tab());
    await tracker.tabActivated(tab({ id: 2, url: 'https://other.example/' }));
    await tracker.tabActivated(tab());

    expect(deps.recordOpen).toHaveBeenCalledTimes(1);
  });

  it('refresh marks every open tab and clears the marks of links no longer pending', async () => {
    const { tracker, deps, tabs } = setup();
    tabs.push(tab(), tab({ id: 2, active: false, url: 'https://example.com/done' }), tab({ id: 3, incognito: true }));

    await tracker.refresh();

    expect(deps.setBadge).toHaveBeenCalledWith(1, '•');
    expect(deps.setBadge).toHaveBeenCalledWith(2, '');
    expect(deps.setBadge).not.toHaveBeenCalledWith(3, expect.anything());
  });

  it('refresh starts timing the page that was just saved', async () => {
    const { tracker, tabs, visit } = setup();
    tabs.push(tab());

    await tracker.refresh();

    expect(visit()?.tabId).toBe(1);
  });

  it('refresh with learning off clears every mark', async () => {
    const { tracker, deps, tabs } = setup({ learn: false });
    tabs.push(tab());

    await tracker.refresh();

    expect(deps.setBadge).toHaveBeenCalledWith(1, '');
  });

  it('handles events one at a time', async () => {
    const { tracker, deps, advance } = setup();
    await tracker.tabUpdated(tab(), true);
    advance(MIN);

    await Promise.all([tracker.tabRemoved(1), tracker.tabActivated(tab({ id: 2, url: 'https://other.example/' }))]);

    expect(deps.recordVisit).toHaveBeenCalledTimes(1);
  });
});
