# TAB-24: Save Tab Button Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement a "Save Tab" button in the popup that captures the current tab's data (URL, title, favicon) and saves it to the Inbox collection with visual feedback and auto-close.

**Architecture:** The feature follows a layered approach: (1) utility layer for Chrome API interactions and permissions checking, (2) storage layer extension for saving links to Inbox, (3) UI layer with SaveButton component and Toast notifications, (4) integration layer connecting all pieces with proper state management.

**Tech Stack:** Svelte 4, TypeScript, Chrome Extension APIs (tabs, storage), Vitest for testing

---

## Task Overview

| Task | Description | Complexity |
|------|-------------|------------|
| 1 | Create tabs utility with getCurrentTabData() | Low |
| 2 | Add permission checking for restricted URLs | Low |
| 3 | Extend storage service with addLinkToInbox() | Medium |
| 4 | Create SaveButton component with states | Medium |
| 5 | Create Toast notification component | Medium |
| 6 | Integrate SaveButton with save flow | Medium |
| 7 | Add popup auto-close after success | Low |
| 8 | Update App.svelte with SaveButton | Low |
| 9 | Create unit tests for all modules | Medium |

---

## Task 1: Create Tabs Utility with getCurrentTabData()

**Files:**
- Create: `src/lib/tabs.ts`
- Create: `src/test/lib/tabs.test.ts`

**Step 1: Write the failing test**

```typescript
// src/test/lib/tabs.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getCurrentTabData } from '@/lib/tabs';
import { chromeMock } from '../setup';

describe('getCurrentTabData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns tab data for a valid tab', async () => {
    chromeMock.tabs.query.mockResolvedValueOnce([
      {
        id: 1,
        url: 'https://example.com/page',
        title: 'Example Page',
        favIconUrl: 'https://example.com/favicon.ico',
      },
    ]);

    const result = await getCurrentTabData();

    expect(result).toEqual({
      url: 'https://example.com/page',
      title: 'Example Page',
      favicon: 'https://example.com/favicon.ico',
    });
    expect(chromeMock.tabs.query).toHaveBeenCalledWith({
      active: true,
      currentWindow: true,
    });
  });

  it('returns empty favicon when tab has no favicon', async () => {
    chromeMock.tabs.query.mockResolvedValueOnce([
      {
        id: 1,
        url: 'https://example.com',
        title: 'No Favicon',
      },
    ]);

    const result = await getCurrentTabData();

    expect(result.favicon).toBeUndefined();
  });

  it('throws error when no active tab found', async () => {
    chromeMock.tabs.query.mockResolvedValueOnce([]);

    await expect(getCurrentTabData()).rejects.toThrow('No active tab found');
  });

  it('throws error when tab has no URL', async () => {
    chromeMock.tabs.query.mockResolvedValueOnce([
      { id: 1, title: 'No URL Tab' },
    ]);

    await expect(getCurrentTabData()).rejects.toThrow('Tab has no URL');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `make test`
Expected: FAIL with "Cannot find module '@/lib/tabs'"

**Step 3: Write minimal implementation**

```typescript
// src/lib/tabs.ts
/**
 * Utilities for interacting with Chrome tabs API.
 */

export interface TabData {
  url: string;
  title: string;
  favicon?: string;
}

/**
 * Gets data from the currently active tab.
 * @returns Promise with tab URL, title, and optional favicon
 * @throws Error if no active tab or tab has no URL
 */
export async function getCurrentTabData(): Promise<TabData> {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });

  if (tabs.length === 0) {
    throw new Error('No active tab found');
  }

  const tab = tabs[0];

  if (!tab.url) {
    throw new Error('Tab has no URL');
  }

  return {
    url: tab.url,
    title: tab.title || tab.url,
    favicon: tab.favIconUrl,
  };
}
```

**Step 4: Run test to verify it passes**

Run: `make test`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/tabs.ts src/test/lib/tabs.test.ts
git commit -m "feat(tabs): add getCurrentTabData utility for capturing active tab info"
```

---

## Task 2: Add Permission Checking for Restricted URLs

**Files:**
- Modify: `src/lib/tabs.ts`
- Modify: `src/test/lib/tabs.test.ts`

**Step 1: Write the failing tests**

Add to `src/test/lib/tabs.test.ts`:

```typescript
describe('isRestrictedUrl', () => {
  it('returns true for chrome:// URLs', () => {
    expect(isRestrictedUrl('chrome://extensions')).toBe(true);
    expect(isRestrictedUrl('chrome://settings')).toBe(true);
  });

  it('returns true for about: URLs', () => {
    expect(isRestrictedUrl('about:blank')).toBe(true);
    expect(isRestrictedUrl('about:newtab')).toBe(true);
  });

  it('returns true for chrome-extension:// URLs', () => {
    expect(isRestrictedUrl('chrome-extension://abc123/popup.html')).toBe(true);
  });

  it('returns true for file:// URLs', () => {
    expect(isRestrictedUrl('file:///home/user/doc.pdf')).toBe(true);
  });

  it('returns true for edge:// URLs', () => {
    expect(isRestrictedUrl('edge://settings')).toBe(true);
  });

  it('returns false for http:// URLs', () => {
    expect(isRestrictedUrl('http://example.com')).toBe(false);
  });

  it('returns false for https:// URLs', () => {
    expect(isRestrictedUrl('https://example.com')).toBe(false);
  });
});

describe('getRestrictionReason', () => {
  it('returns reason for chrome:// URLs', () => {
    expect(getRestrictionReason('chrome://extensions')).toBe(
      'Páginas internas do navegador não podem ser salvas'
    );
  });

  it('returns reason for file:// URLs', () => {
    expect(getRestrictionReason('file:///doc.pdf')).toBe(
      'Arquivos locais não podem ser salvos'
    );
  });

  it('returns null for allowed URLs', () => {
    expect(getRestrictionReason('https://example.com')).toBeNull();
  });
});
```

Update import:
```typescript
import { getCurrentTabData, isRestrictedUrl, getRestrictionReason } from '@/lib/tabs';
```

**Step 2: Run test to verify it fails**

Run: `make test`
Expected: FAIL with "isRestrictedUrl is not exported"

**Step 3: Write minimal implementation**

Add to `src/lib/tabs.ts`:

```typescript
const RESTRICTED_PROTOCOLS = [
  'chrome:',
  'chrome-extension:',
  'about:',
  'edge:',
  'file:',
  'devtools:',
  'view-source:',
];

/**
 * Checks if a URL is restricted (cannot be saved by the extension).
 */
export function isRestrictedUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return RESTRICTED_PROTOCOLS.includes(urlObj.protocol);
  } catch {
    return true;
  }
}

/**
 * Returns a user-friendly reason why the URL cannot be saved, or null if allowed.
 */
export function getRestrictionReason(url: string): string | null {
  if (!isRestrictedUrl(url)) {
    return null;
  }

  try {
    const urlObj = new URL(url);
    const protocol = urlObj.protocol;

    if (protocol === 'chrome:' || protocol === 'edge:' || protocol === 'about:') {
      return 'Páginas internas do navegador não podem ser salvas';
    }
    if (protocol === 'chrome-extension:') {
      return 'Páginas de extensões não podem ser salvas';
    }
    if (protocol === 'file:') {
      return 'Arquivos locais não podem ser salvos';
    }
    if (protocol === 'devtools:' || protocol === 'view-source:') {
      return 'Ferramentas do desenvolvedor não podem ser salvas';
    }
  } catch {
    return 'URL inválida';
  }

  return 'Esta página não pode ser salva';
}
```

**Step 4: Run test to verify it passes**

Run: `make test`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/tabs.ts src/test/lib/tabs.test.ts
git commit -m "feat(tabs): add URL restriction checking for browser internal pages"
```

---

## Task 3: Extend Storage Service with addLinkToInbox()

**Files:**
- Modify: `src/lib/storage.ts`
- Create: `src/test/lib/storage.test.ts`

**Step 1: Write the failing tests**

```typescript
// src/test/lib/storage.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { addLinkToInbox, ensureInboxExists, INBOX_COLLECTION_ID } from '@/lib/storage';
import { chromeMock, mockStorage } from '../setup';

describe('INBOX_COLLECTION_ID', () => {
  it('is a constant string', () => {
    expect(typeof INBOX_COLLECTION_ID).toBe('string');
    expect(INBOX_COLLECTION_ID).toBe('inbox');
  });
});

describe('ensureInboxExists', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.keys(mockStorage).forEach((key) => delete mockStorage[key]);
  });

  it('creates Inbox collection if it does not exist', async () => {
    await ensureInboxExists();

    expect(chromeMock.storage.local.set).toHaveBeenCalled();
    const setCall = chromeMock.storage.local.set.mock.calls[0][0];
    expect(setCall.collections).toContainEqual(
      expect.objectContaining({ id: 'inbox', name: 'Inbox' })
    );
  });

  it('does not duplicate Inbox if it already exists', async () => {
    mockStorage.collections = [{ id: 'inbox', name: 'Inbox', order: 0 }];

    await ensureInboxExists();

    expect(chromeMock.storage.local.set).not.toHaveBeenCalled();
  });
});

describe('addLinkToInbox', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.keys(mockStorage).forEach((key) => delete mockStorage[key]);
  });

  it('adds a new link to storage with generated id and timestamp', async () => {
    const tabData = {
      url: 'https://example.com',
      title: 'Example',
      favicon: 'https://example.com/favicon.ico',
    };

    const result = await addLinkToInbox(tabData);

    expect(result.url).toBe('https://example.com');
    expect(result.title).toBe('Example');
    expect(result.favicon).toBe('https://example.com/favicon.ico');
    expect(result.collectionId).toBe('inbox');
    expect(typeof result.id).toBe('string');
    expect(result.id.length).toBeGreaterThan(0);
    expect(typeof result.createdAt).toBe('number');
    expect(result.createdAt).toBeLessThanOrEqual(Date.now());
  });

  it('saves link without favicon when not provided', async () => {
    const tabData = {
      url: 'https://example.com',
      title: 'Example',
    };

    const result = await addLinkToInbox(tabData);

    expect(result.favicon).toBeUndefined();
  });

  it('ensures Inbox collection exists before saving', async () => {
    const tabData = {
      url: 'https://example.com',
      title: 'Example',
    };

    await addLinkToInbox(tabData);

    const collectionsCall = chromeMock.storage.local.set.mock.calls.find(
      (call) => call[0].collections
    );
    expect(collectionsCall).toBeDefined();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `make test`
Expected: FAIL with "addLinkToInbox is not exported"

**Step 3: Write minimal implementation**

Add to `src/lib/storage.ts`:

```typescript
export const INBOX_COLLECTION_ID = 'inbox';

/**
 * Generates a unique ID for links.
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Ensures the Inbox collection exists, creating it if necessary.
 */
export async function ensureInboxExists(): Promise<void> {
  const collections = await getCollections();
  const inboxExists = collections.some((c) => c.id === INBOX_COLLECTION_ID);

  if (!inboxExists) {
    const inbox: Collection = {
      id: INBOX_COLLECTION_ID,
      name: 'Inbox',
      order: 0,
    };
    await saveCollections([inbox, ...collections]);
  }
}

/**
 * Input data for adding a link (from tab data).
 */
export interface AddLinkInput {
  url: string;
  title: string;
  favicon?: string;
}

/**
 * Adds a new link to the Inbox collection.
 * Creates the Inbox collection if it doesn't exist.
 * @returns The created Link object
 */
export async function addLinkToInbox(input: AddLinkInput): Promise<Link> {
  await ensureInboxExists();

  const link: Link = {
    id: generateId(),
    url: input.url,
    title: input.title,
    favicon: input.favicon,
    collectionId: INBOX_COLLECTION_ID,
    createdAt: Date.now(),
  };

  const links = await getLinks();
  await saveLinks([link, ...links]);

  return link;
}
```

**Step 4: Run test to verify it passes**

Run: `make test`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/storage.ts src/test/lib/storage.test.ts
git commit -m "feat(storage): add addLinkToInbox and ensureInboxExists utilities"
```

---

## Task 4: Create SaveButton Component with States

**Files:**
- Create: `src/popup/components/SaveButton.svelte`
- Create: `src/test/components/SaveButton.test.ts`

**Step 1: Write the failing tests**

```typescript
// src/test/components/SaveButton.test.ts
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import SaveButton from '@/popup/components/SaveButton.svelte';

describe('SaveButton', () => {
  it('renders with default idle state', () => {
    render(SaveButton);

    const button = screen.getByRole('button', { name: /salvar aba/i });
    expect(button).toBeInTheDocument();
    expect(button).not.toBeDisabled();
  });

  it('shows loading state when status is loading', () => {
    render(SaveButton, { props: { status: 'loading' } });

    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(screen.getByText(/salvando/i)).toBeInTheDocument();
  });

  it('shows success state when status is success', () => {
    render(SaveButton, { props: { status: 'success' } });

    expect(screen.getByText(/salvo/i)).toBeInTheDocument();
  });

  it('shows error state when status is error', () => {
    render(SaveButton, { props: { status: 'error' } });

    expect(screen.getByText(/erro/i)).toBeInTheDocument();
  });

  it('is disabled when disabled prop is true', () => {
    render(SaveButton, { props: { disabled: true } });

    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
  });

  it('shows tooltip when disabled with disabledReason', () => {
    render(SaveButton, {
      props: {
        disabled: true,
        disabledReason: 'Páginas internas não podem ser salvas',
      },
    });

    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('title', 'Páginas internas não podem ser salvas');
  });

  it('calls onClick when clicked in idle state', async () => {
    const onClick = vi.fn();
    render(SaveButton, { props: { onClick } });

    const button = screen.getByRole('button');
    await fireEvent.click(button);

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('does not call onClick when disabled', async () => {
    const onClick = vi.fn();
    render(SaveButton, { props: { onClick, disabled: true } });

    const button = screen.getByRole('button');
    await fireEvent.click(button);

    expect(onClick).not.toHaveBeenCalled();
  });

  it('does not call onClick when loading', async () => {
    const onClick = vi.fn();
    render(SaveButton, { props: { onClick, status: 'loading' } });

    const button = screen.getByRole('button');
    await fireEvent.click(button);

    expect(onClick).not.toHaveBeenCalled();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `make test`
Expected: FAIL with "Cannot find module '@/popup/components/SaveButton.svelte'"

**Step 3: Write minimal implementation**

```svelte
<!-- src/popup/components/SaveButton.svelte -->
<script lang="ts">
  export type ButtonStatus = 'idle' | 'loading' | 'success' | 'error';

  export let status: ButtonStatus = 'idle';
  export let disabled = false;
  export let disabledReason = '';
  export let onClick: (() => void) | undefined = undefined;

  $: isDisabled = disabled || status === 'loading';
  $: tooltipText = disabled ? disabledReason : '';

  function handleClick() {
    if (!isDisabled && onClick) {
      onClick();
    }
  }

  $: buttonText = {
    idle: 'Salvar Aba',
    loading: 'Salvando...',
    success: 'Salvo!',
    error: 'Erro ao salvar',
  }[status];

  $: statusClass = `save-button--${status}`;
</script>

<button
  type="button"
  class="save-button {statusClass}"
  class:save-button--disabled={isDisabled}
  disabled={isDisabled}
  title={tooltipText}
  on:click={handleClick}
  aria-busy={status === 'loading'}
>
  {#if status === 'loading'}
    <span class="save-button__spinner" aria-hidden="true"></span>
  {/if}
  <span class="save-button__text">{buttonText}</span>
</button>

<style>
  .save-button {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    width: 100%;
    padding: 0.75rem 1rem;
    font-size: 1rem;
    font-weight: 500;
    color: white;
    background-color: #2563eb;
    border: none;
    border-radius: 0.5rem;
    cursor: pointer;
    transition: background-color 0.2s, opacity 0.2s;
  }

  .save-button:hover:not(:disabled) {
    background-color: #1d4ed8;
  }

  .save-button:focus-visible {
    outline: 2px solid #2563eb;
    outline-offset: 2px;
  }

  .save-button--disabled,
  .save-button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .save-button--loading {
    background-color: #6b7280;
  }

  .save-button--success {
    background-color: #16a34a;
  }

  .save-button--error {
    background-color: #dc2626;
  }

  .save-button__spinner {
    width: 1rem;
    height: 1rem;
    border: 2px solid transparent;
    border-top-color: white;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .save-button__text {
    line-height: 1;
  }
</style>
```

**Step 4: Run test to verify it passes**

Run: `make test`
Expected: PASS

**Step 5: Commit**

```bash
git add src/popup/components/SaveButton.svelte src/test/components/SaveButton.test.ts
git commit -m "feat(popup): add SaveButton component with idle, loading, success, error states"
```

---

## Task 5: Create Toast Notification Component

**Files:**
- Create: `src/popup/components/Toast.svelte`
- Create: `src/test/components/Toast.test.ts`

**Step 1: Write the failing tests**

```typescript
// src/test/components/Toast.test.ts
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import Toast from '@/popup/components/Toast.svelte';

describe('Toast', () => {
  it('renders with message', () => {
    render(Toast, { props: { message: 'Test message', type: 'success' } });

    expect(screen.getByText('Test message')).toBeInTheDocument();
  });

  it('renders success variant', () => {
    render(Toast, { props: { message: 'Success!', type: 'success' } });

    const toast = screen.getByRole('alert');
    expect(toast).toHaveClass('toast--success');
  });

  it('renders error variant', () => {
    render(Toast, { props: { message: 'Error!', type: 'error' } });

    const toast = screen.getByRole('alert');
    expect(toast).toHaveClass('toast--error');
  });

  it('is accessible with role alert', () => {
    render(Toast, { props: { message: 'Alert message', type: 'success' } });

    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('renders nothing when message is empty', () => {
    render(Toast, { props: { message: '', type: 'success' } });

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `make test`
Expected: FAIL with "Cannot find module '@/popup/components/Toast.svelte'"

**Step 3: Write minimal implementation**

```svelte
<!-- src/popup/components/Toast.svelte -->
<script lang="ts">
  export type ToastType = 'success' | 'error' | 'warning';

  export let message = '';
  export let type: ToastType = 'success';
</script>

{#if message}
  <div class="toast toast--{type}" role="alert" aria-live="polite">
    <span class="toast__icon" aria-hidden="true">
      {#if type === 'success'}
        ✓
      {:else if type === 'error'}
        ✕
      {:else}
        !
      {/if}
    </span>
    <span class="toast__message">{message}</span>
  </div>
{/if}

<style>
  .toast {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1rem;
    border-radius: 0.5rem;
    font-size: 0.875rem;
    animation: slideIn 0.2s ease-out;
  }

  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateY(-0.5rem);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .toast--success {
    background-color: #dcfce7;
    color: #166534;
    border: 1px solid #bbf7d0;
  }

  .toast--error {
    background-color: #fee2e2;
    color: #991b1b;
    border: 1px solid #fecaca;
  }

  .toast--warning {
    background-color: #fef3c7;
    color: #92400e;
    border: 1px solid #fde68a;
  }

  .toast__icon {
    font-weight: bold;
    font-size: 1rem;
  }

  .toast__message {
    flex: 1;
  }
</style>
```

**Step 4: Run test to verify it passes**

Run: `make test`
Expected: PASS

**Step 5: Commit**

```bash
git add src/popup/components/Toast.svelte src/test/components/Toast.test.ts
git commit -m "feat(popup): add Toast notification component for success/error feedback"
```

---

## Task 6: Integrate SaveButton with Save Flow

**Files:**
- Create: `src/popup/services/saveTab.ts`
- Create: `src/test/services/saveTab.test.ts`

**Step 1: Write the failing tests**

```typescript
// src/test/services/saveTab.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { saveCurrentTab, type SaveTabResult } from '@/popup/services/saveTab';
import { chromeMock, mockStorage } from '../setup';

vi.mock('@/lib/tabs', () => ({
  getCurrentTabData: vi.fn(),
  isRestrictedUrl: vi.fn(),
  getRestrictionReason: vi.fn(),
}));

vi.mock('@/lib/storage', () => ({
  addLinkToInbox: vi.fn(),
}));

import { getCurrentTabData, isRestrictedUrl, getRestrictionReason } from '@/lib/tabs';
import { addLinkToInbox } from '@/lib/storage';

describe('saveCurrentTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(isRestrictedUrl).mockReturnValue(false);
    vi.mocked(getRestrictionReason).mockReturnValue(null);
  });

  it('successfully saves a normal tab', async () => {
    vi.mocked(getCurrentTabData).mockResolvedValue({
      url: 'https://example.com',
      title: 'Example',
      favicon: 'https://example.com/favicon.ico',
    });
    vi.mocked(addLinkToInbox).mockResolvedValue({
      id: '123',
      url: 'https://example.com',
      title: 'Example',
      favicon: 'https://example.com/favicon.ico',
      collectionId: 'inbox',
      createdAt: Date.now(),
    });

    const result = await saveCurrentTab();

    expect(result.success).toBe(true);
    expect(result.link).toBeDefined();
    expect(addLinkToInbox).toHaveBeenCalledWith({
      url: 'https://example.com',
      title: 'Example',
      favicon: 'https://example.com/favicon.ico',
    });
  });

  it('returns error for restricted URLs', async () => {
    vi.mocked(getCurrentTabData).mockResolvedValue({
      url: 'chrome://extensions',
      title: 'Extensions',
    });
    vi.mocked(isRestrictedUrl).mockReturnValue(true);
    vi.mocked(getRestrictionReason).mockReturnValue('Páginas internas não podem ser salvas');

    const result = await saveCurrentTab();

    expect(result.success).toBe(false);
    expect(result.error).toBe('Páginas internas não podem ser salvas');
    expect(addLinkToInbox).not.toHaveBeenCalled();
  });

  it('handles storage errors gracefully', async () => {
    vi.mocked(getCurrentTabData).mockResolvedValue({
      url: 'https://example.com',
      title: 'Example',
    });
    vi.mocked(addLinkToInbox).mockRejectedValue(new Error('Storage full'));

    const result = await saveCurrentTab();

    expect(result.success).toBe(false);
    expect(result.error).toBe('Erro ao salvar: Storage full');
  });

  it('handles tab query errors', async () => {
    vi.mocked(getCurrentTabData).mockRejectedValue(new Error('No active tab found'));

    const result = await saveCurrentTab();

    expect(result.success).toBe(false);
    expect(result.error).toBe('Erro ao salvar: No active tab found');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `make test`
Expected: FAIL with "Cannot find module '@/popup/services/saveTab'"

**Step 3: Write minimal implementation**

```typescript
// src/popup/services/saveTab.ts
/**
 * Service for saving the current tab to the Inbox collection.
 */

import { getCurrentTabData, isRestrictedUrl, getRestrictionReason } from '@/lib/tabs';
import { addLinkToInbox } from '@/lib/storage';
import type { Link } from '@/lib/types';

export interface SaveTabResult {
  success: boolean;
  link?: Link;
  error?: string;
}

/**
 * Attempts to save the current tab to the Inbox collection.
 * Handles restricted URLs and storage errors gracefully.
 */
export async function saveCurrentTab(): Promise<SaveTabResult> {
  try {
    const tabData = await getCurrentTabData();

    if (isRestrictedUrl(tabData.url)) {
      const reason = getRestrictionReason(tabData.url);
      return {
        success: false,
        error: reason || 'Esta página não pode ser salva',
      };
    }

    const link = await addLinkToInbox({
      url: tabData.url,
      title: tabData.title,
      favicon: tabData.favicon,
    });

    return { success: true, link };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido';
    return {
      success: false,
      error: `Erro ao salvar: ${message}`,
    };
  }
}
```

**Step 4: Run test to verify it passes**

Run: `make test`
Expected: PASS

**Step 5: Commit**

```bash
git add src/popup/services/saveTab.ts src/test/services/saveTab.test.ts
git commit -m "feat(popup): add saveCurrentTab service integrating tabs and storage"
```

---

## Task 7: Add Popup Auto-Close After Success

**Files:**
- Create: `src/lib/popup.ts`
- Create: `src/test/lib/popup.test.ts`

**Step 1: Write the failing tests**

```typescript
// src/test/lib/popup.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { closePopup, closePopupAfterDelay } from '@/lib/popup';

describe('closePopup', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal('window', { close: vi.fn() });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('calls window.close', () => {
    closePopup();
    expect(window.close).toHaveBeenCalled();
  });
});

describe('closePopupAfterDelay', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal('window', { close: vi.fn() });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('closes popup after specified delay', () => {
    closePopupAfterDelay(1500);

    expect(window.close).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1500);

    expect(window.close).toHaveBeenCalled();
  });

  it('uses default delay of 1500ms', () => {
    closePopupAfterDelay();

    vi.advanceTimersByTime(1499);
    expect(window.close).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(window.close).toHaveBeenCalled();
  });

  it('returns a function to cancel the close', () => {
    const cancel = closePopupAfterDelay(1000);

    vi.advanceTimersByTime(500);
    cancel();

    vi.advanceTimersByTime(1000);
    expect(window.close).not.toHaveBeenCalled();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `make test`
Expected: FAIL with "Cannot find module '@/lib/popup'"

**Step 3: Write minimal implementation**

```typescript
// src/lib/popup.ts
/**
 * Utilities for managing the popup window.
 */

/**
 * Closes the popup window immediately.
 */
export function closePopup(): void {
  window.close();
}

/**
 * Closes the popup window after a delay.
 * @param delay Delay in milliseconds (default: 1500ms)
 * @returns A function to cancel the scheduled close
 */
export function closePopupAfterDelay(delay = 1500): () => void {
  const timeoutId = setTimeout(() => {
    closePopup();
  }, delay);

  return () => {
    clearTimeout(timeoutId);
  };
}
```

**Step 4: Run test to verify it passes**

Run: `make test`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/popup.ts src/test/lib/popup.test.ts
git commit -m "feat(popup): add popup close utilities with delay and cancellation"
```

---

## Task 8: Update App.svelte with SaveButton Integration

**Files:**
- Modify: `src/popup/App.svelte`
- Modify: `src/test/components/App.test.ts`

**Step 1: Write the failing tests**

```typescript
// src/test/components/App.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import App from '@/popup/App.svelte';
import { chromeMock } from '../setup';

vi.mock('@/popup/services/saveTab', () => ({
  saveCurrentTab: vi.fn(),
}));

vi.mock('@/lib/tabs', () => ({
  getCurrentTabData: vi.fn(),
  isRestrictedUrl: vi.fn(),
  getRestrictionReason: vi.fn(),
}));

vi.mock('@/lib/popup', () => ({
  closePopupAfterDelay: vi.fn(() => vi.fn()),
}));

import { saveCurrentTab } from '@/popup/services/saveTab';
import { getCurrentTabData, isRestrictedUrl, getRestrictionReason } from '@/lib/tabs';
import { closePopupAfterDelay } from '@/lib/popup';

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(isRestrictedUrl).mockReturnValue(false);
    vi.mocked(getRestrictionReason).mockReturnValue(null);
    vi.mocked(getCurrentTabData).mockResolvedValue({
      url: 'https://example.com',
      title: 'Example',
    });
  });

  it('renders the app with SaveButton', () => {
    render(App);

    expect(screen.getByText('TabAla')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /salvar aba/i })).toBeInTheDocument();
  });

  it('saves tab on button click', async () => {
    vi.mocked(saveCurrentTab).mockResolvedValue({
      success: true,
      link: {
        id: '123',
        url: 'https://example.com',
        title: 'Example',
        collectionId: 'inbox',
        createdAt: Date.now(),
      },
    });

    render(App);

    const button = screen.getByRole('button', { name: /salvar aba/i });
    await fireEvent.click(button);

    await waitFor(() => {
      expect(saveCurrentTab).toHaveBeenCalled();
    });
  });

  it('shows success feedback and schedules popup close', async () => {
    vi.mocked(saveCurrentTab).mockResolvedValue({
      success: true,
      link: {
        id: '123',
        url: 'https://example.com',
        title: 'Example',
        collectionId: 'inbox',
        createdAt: Date.now(),
      },
    });

    render(App);

    const button = screen.getByRole('button', { name: /salvar aba/i });
    await fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText(/salvo/i)).toBeInTheDocument();
    });

    expect(closePopupAfterDelay).toHaveBeenCalled();
  });

  it('shows error feedback on failure', async () => {
    vi.mocked(saveCurrentTab).mockResolvedValue({
      success: false,
      error: 'Erro ao salvar: Storage full',
    });

    render(App);

    const button = screen.getByRole('button', { name: /salvar aba/i });
    await fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText(/erro/i)).toBeInTheDocument();
    });
  });

  it('disables button for restricted URLs', async () => {
    vi.mocked(isRestrictedUrl).mockReturnValue(true);
    vi.mocked(getRestrictionReason).mockReturnValue('Páginas internas não podem ser salvas');
    vi.mocked(getCurrentTabData).mockResolvedValue({
      url: 'chrome://extensions',
      title: 'Extensions',
    });

    render(App);

    await waitFor(() => {
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `make test`
Expected: FAIL (component doesn't have SaveButton integration yet)

**Step 3: Write minimal implementation**

```svelte
<!-- src/popup/App.svelte -->
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import SaveButton, { type ButtonStatus } from './components/SaveButton.svelte';
  import Toast, { type ToastType } from './components/Toast.svelte';
  import { saveCurrentTab } from './services/saveTab';
  import { getCurrentTabData, isRestrictedUrl, getRestrictionReason } from '@/lib/tabs';
  import { closePopupAfterDelay } from '@/lib/popup';

  let buttonStatus: ButtonStatus = 'idle';
  let disabled = false;
  let disabledReason = '';
  let toastMessage = '';
  let toastType: ToastType = 'success';
  let errorResetTimeout: ReturnType<typeof setTimeout> | null = null;

  onMount(async () => {
    try {
      const tabData = await getCurrentTabData();
      if (isRestrictedUrl(tabData.url)) {
        disabled = true;
        disabledReason = getRestrictionReason(tabData.url) || 'Esta página não pode ser salva';
      }
    } catch {
      disabled = true;
      disabledReason = 'Não foi possível acessar a aba atual';
    }
  });

  onDestroy(() => {
    if (errorResetTimeout) {
      clearTimeout(errorResetTimeout);
    }
  });

  async function handleSave() {
    if (buttonStatus === 'loading') return;

    // Clear any existing error reset timeout
    if (errorResetTimeout) {
      clearTimeout(errorResetTimeout);
      errorResetTimeout = null;
    }

    buttonStatus = 'loading';
    toastMessage = '';

    const result = await saveCurrentTab();

    if (result.success) {
      buttonStatus = 'success';
      toastMessage = 'Link salvo na Inbox!';
      toastType = 'success';
      closePopupAfterDelay(1500);
    } else {
      buttonStatus = 'error';
      toastMessage = result.error || 'Erro ao salvar';
      toastType = 'error';

      errorResetTimeout = setTimeout(() => {
        buttonStatus = 'idle';
        errorResetTimeout = null;
      }, 2000);
    }
  }
</script>

<main>
  <header>
    <h1>TabAla</h1>
  </header>

  <section class="save-section">
    <SaveButton
      status={buttonStatus}
      {disabled}
      {disabledReason}
      onClick={handleSave}
    />

    {#if toastMessage}
      <div class="toast-container">
        <Toast message={toastMessage} type={toastType} />
      </div>
    {/if}
  </section>
</main>

<style>
  main {
    display: flex;
    flex-direction: column;
    min-height: 100%;
    padding: 1rem;
    font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background-color: #fafafa;
  }

  header {
    margin-bottom: 1.5rem;
  }

  h1 {
    color: #1f2937;
    font-size: 1.25rem;
    font-weight: 600;
    margin: 0;
  }

  .save-section {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .toast-container {
    margin-top: 0.5rem;
  }
</style>
```

**Step 4: Run test to verify it passes**

Run: `make test`
Expected: PASS

**Step 5: Commit**

```bash
git add src/popup/App.svelte src/test/components/App.test.ts
git commit -m "feat(popup): integrate SaveButton with save flow and feedback"
```

---

## Task 9: Final Integration Test and Verification

**Files:**
- All previously created/modified files

**Step 1: Run full test suite**

Run: `make test`
Expected: All tests PASS

**Step 2: Run lint**

Run: `make lint`
Expected: No errors

**Step 3: Build the extension**

Run: `make build`
Expected: Build succeeds, outputs to `dist/`

**Step 4: Manual verification checklist**

Load extension in Chrome and verify:
- [ ] Popup opens when clicking extension icon
- [ ] SaveButton shows "Salvar Aba" in idle state
- [ ] Clicking button shows loading spinner
- [ ] Success toast appears after saving
- [ ] Popup closes automatically after ~1.5 seconds
- [ ] Button is disabled on chrome:// pages with tooltip
- [ ] Error toast appears and button resets on failure
- [ ] Multiple rapid clicks don't create duplicate saves

**Step 5: Final commit**

```bash
git add -A
git commit -m "feat(TAB-24): implement save current tab button with feedback

- Add getCurrentTabData() for capturing active tab info
- Add URL restriction checking for chrome://, about://, etc.
- Extend storage service with addLinkToInbox()
- Create SaveButton component with idle/loading/success/error states
- Create Toast notification component
- Integrate save flow with auto-close popup
- Add comprehensive unit tests (80%+ coverage)

Closes TAB-24"
```

---

## Summary

### Files Created
- `src/lib/tabs.ts` - Tab data capture and URL restriction utilities
- `src/lib/popup.ts` - Popup close utilities
- `src/popup/components/SaveButton.svelte` - Save button component
- `src/popup/components/Toast.svelte` - Toast notification component
- `src/popup/services/saveTab.ts` - Save tab orchestration service
- `src/test/lib/tabs.test.ts` - Tabs utility tests
- `src/test/lib/popup.test.ts` - Popup utility tests
- `src/test/lib/storage.test.ts` - Storage extension tests
- `src/test/components/SaveButton.test.ts` - SaveButton tests
- `src/test/components/Toast.test.ts` - Toast tests
- `src/test/services/saveTab.test.ts` - Save service tests

### Files Modified
- `src/lib/storage.ts` - Added addLinkToInbox(), ensureInboxExists()
- `src/popup/App.svelte` - Integrated SaveButton with save flow
- `src/test/components/App.test.ts` - Updated App tests

### Architecture Decisions
1. **Layered approach**: Utilities → Services → Components
2. **Error handling at service level**: Components receive clean success/error results
3. **Immediate feedback**: Loading state prevents double-clicks
4. **Graceful degradation**: Restricted URLs show helpful message instead of failing silently
