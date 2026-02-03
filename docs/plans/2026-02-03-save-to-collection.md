# Save Link to Specific Collection Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Allow users to choose which collection to save a link to, with quick-save to Inbox and expandable collection selector.

**Architecture:** Modify the SaveButton to include a collection dropdown. Add derived store for available collections. Enhance storage layer with collection validation. Implement fallback to Inbox when selected collection is deleted.

**Tech Stack:** Svelte 5, TypeScript, Chrome Storage API, Vitest

---

## Task 1: Add availableCollections derived store

**Files:**
- Modify: `src/popup/stores/links.ts:242-256`
- Test: `src/test/stores/links.test.ts`

**Step 1: Write the failing test**

Add to `src/test/stores/links.test.ts`:

```typescript
describe('availableCollections', () => {
  beforeEach(async () => {
    vi.mocked(storage.getLinks).mockResolvedValue([]);
    vi.mocked(storage.getCollections).mockResolvedValue(mockCollections);
    await linksStore.load();
  });

  it('should always include Inbox first', () => {
    const collections = get(availableCollections);
    expect(collections[0].id).toBe('inbox');
    expect(collections[0].name).toBe('Inbox');
  });

  it('should include all existing collections', () => {
    const collections = get(availableCollections);
    expect(collections).toHaveLength(2);
    expect(collections.map(c => c.id)).toEqual(['inbox', 'work']);
  });

  it('should update when new collection is added', async () => {
    vi.mocked(storage.createCollection).mockResolvedValue({
      id: 'new-col',
      name: 'New',
      order: 2,
    });
    await linksStore.addCollection('New');

    const collections = get(availableCollections);
    expect(collections).toHaveLength(3);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `make test`
Expected: FAIL - "availableCollections is not exported"

**Step 3: Write minimal implementation**

Add to `src/popup/stores/links.ts` after `linksByCollection`:

```typescript
export const availableCollections = derived(linksStore, ($store) => {
  return $store.collections.slice().sort((a, b) => {
    if (a.id === INBOX_COLLECTION_ID) return -1;
    if (b.id === INBOX_COLLECTION_ID) return 1;
    return a.name.localeCompare(b.name);
  });
});
```

**Step 4: Run test to verify it passes**

Run: `make test`
Expected: PASS

**Step 5: Commit**

```bash
git add src/popup/stores/links.ts src/test/stores/links.test.ts
git commit -m "$(cat <<'EOF'
feat(TAB-195): add availableCollections derived store

Add derived store that provides sorted list of collections for selection UI.
Inbox is always first, followed by custom collections sorted alphabetically.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Add collection validation to storage layer

**Files:**
- Modify: `src/lib/storage.ts`
- Test: `src/test/lib/storage.test.ts`

**Step 1: Write the failing test**

Add to `src/test/lib/storage.test.ts`:

```typescript
describe('collectionExists', () => {
  beforeEach(async () => {
    await storage.storage.clear();
    await storage.saveCollections([
      { id: 'inbox', name: 'Inbox', order: 0, isDefault: true },
      { id: 'work', name: 'Work', order: 1 },
    ]);
  });

  it('should return true for existing collection', async () => {
    const exists = await storage.collectionExists('work');
    expect(exists).toBe(true);
  });

  it('should return true for inbox collection', async () => {
    const exists = await storage.collectionExists('inbox');
    expect(exists).toBe(true);
  });

  it('should return false for non-existent collection', async () => {
    const exists = await storage.collectionExists('nonexistent');
    expect(exists).toBe(false);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `make test`
Expected: FAIL - "collectionExists is not a function"

**Step 3: Write minimal implementation**

Add to `src/lib/storage.ts`:

```typescript
/**
 * Checks if a collection exists in storage.
 *
 * @param collectionId - The ID of the collection to check
 * @returns true if the collection exists, false otherwise
 */
export async function collectionExists(collectionId: string): Promise<boolean> {
  if (collectionId === INBOX_COLLECTION_ID) {
    return true;
  }
  const collections = await getCollections();
  return collections.some((c) => c.id === collectionId);
}
```

**Step 4: Run test to verify it passes**

Run: `make test`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/storage.ts src/test/lib/storage.test.ts
git commit -m "$(cat <<'EOF'
feat(TAB-197): add collectionExists validation function

Add function to verify collection existence before saving links.
Inbox always returns true as it cannot be deleted.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Enhance addLink store method to validate collection

**Files:**
- Modify: `src/popup/stores/links.ts:74-112`
- Test: `src/test/stores/links.test.ts`

**Step 1: Write the failing test**

Add to `src/test/stores/links.test.ts` in the `addLink` describe block:

```typescript
it('should fall back to inbox when collection does not exist', async () => {
  vi.mocked(storage.collectionExists).mockResolvedValue(false);

  const result = await linksStore.addLink({
    url: 'https://newlink.com',
    title: 'New Link',
    collectionId: 'deleted-collection',
  });

  const state = get(linksStore);
  expect(state.links[0].collectionId).toBe('inbox');
  expect(result.fallbackUsed).toBe(true);
});

it('should save to specified collection when it exists', async () => {
  vi.mocked(storage.collectionExists).mockResolvedValue(true);

  const result = await linksStore.addLink({
    url: 'https://newlink.com',
    title: 'New Link',
    collectionId: 'work',
  });

  const state = get(linksStore);
  expect(state.links[0].collectionId).toBe('work');
  expect(result.fallbackUsed).toBe(false);
});
```

**Step 2: Run test to verify it fails**

Run: `make test`
Expected: FAIL - result.fallbackUsed is undefined

**Step 3: Write minimal implementation**

Update `addLink` in `src/popup/stores/links.ts`:

```typescript
interface AddLinkResult {
  link: Link;
  fallbackUsed: boolean;
  originalCollectionId?: string;
}

async function addLink(linkData: Omit<Link, 'id' | 'createdAt'>): Promise<AddLinkResult> {
  let currentState: LinksState | null = null;
  update((state) => {
    currentState = state;
    return state;
  });

  if (currentState!.isAdding) {
    return { link: {} as Link, fallbackUsed: false };
  }

  let collectionId = linkData.collectionId;
  let fallbackUsed = false;
  let originalCollectionId: string | undefined;

  if (collectionId !== INBOX_COLLECTION_ID) {
    const exists = await collectionExists(collectionId);
    if (!exists) {
      originalCollectionId = collectionId;
      collectionId = INBOX_COLLECTION_ID;
      fallbackUsed = true;
    }
  }

  const newLink: Link = {
    ...linkData,
    collectionId,
    id: crypto.randomUUID(),
    createdAt: Date.now(),
  };

  let linksToSave: Link[] = [];
  update((state) => {
    linksToSave = [newLink, ...state.links];
    return {
      ...state,
      links: linksToSave,
      isAdding: true,
    };
  });

  try {
    await saveLinks(linksToSave);
  } catch (error) {
    update((state) => ({
      ...state,
      links: state.links.filter((l) => l.id !== newLink.id),
      error: 'Failed to save link',
    }));
  } finally {
    update((state) => ({ ...state, isAdding: false }));
  }

  return { link: newLink, fallbackUsed, originalCollectionId };
}
```

**Step 4: Run test to verify it passes**

Run: `make test`
Expected: PASS

**Step 5: Commit**

```bash
git add src/popup/stores/links.ts src/test/stores/links.test.ts
git commit -m "$(cat <<'EOF'
feat(TAB-196, TAB-197): enhance addLink with collection validation

Add collection existence check before saving link. If collection was
deleted, automatically fall back to Inbox and return fallbackUsed flag
for UI notification.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Create CollectionSelector component

**Files:**
- Create: `src/popup/components/CollectionSelector.svelte`
- Test: `src/test/components/CollectionSelector.test.ts`

**Step 1: Write the failing test**

Create `src/test/components/CollectionSelector.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import CollectionSelector from '@/popup/components/CollectionSelector.svelte';
import type { Collection } from '@/lib/types';

const mockCollections: Collection[] = [
  { id: 'inbox', name: 'Inbox', order: 0, isDefault: true },
  { id: 'work', name: 'Work', order: 1 },
  { id: 'personal', name: 'Personal', order: 2 },
];

describe('CollectionSelector', () => {
  it('should render collapsed by default', () => {
    const { queryByRole } = render(CollectionSelector, {
      props: { collections: mockCollections, selectedId: 'inbox' },
    });

    expect(queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('should show collection list when expanded', async () => {
    const { getByRole, getByLabelText } = render(CollectionSelector, {
      props: { collections: mockCollections, selectedId: 'inbox' },
    });

    const expandBtn = getByLabelText('Selecionar coleção');
    await fireEvent.click(expandBtn);

    expect(getByRole('listbox')).toBeInTheDocument();
  });

  it('should dispatch select event with collection id', async () => {
    const handleSelect = vi.fn();
    const { getByLabelText, getByText, component } = render(CollectionSelector, {
      props: { collections: mockCollections, selectedId: 'inbox' },
    });

    component.$on('select', handleSelect);

    await fireEvent.click(getByLabelText('Selecionar coleção'));
    await fireEvent.click(getByText('Work'));

    expect(handleSelect).toHaveBeenCalledWith(
      expect.objectContaining({ detail: 'work' })
    );
  });

  it('should close after selection', async () => {
    const { getByLabelText, getByText, queryByRole } = render(CollectionSelector, {
      props: { collections: mockCollections, selectedId: 'inbox' },
    });

    await fireEvent.click(getByLabelText('Selecionar coleção'));
    await fireEvent.click(getByText('Work'));

    expect(queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('should hide when only inbox exists', () => {
    const { queryByLabelText } = render(CollectionSelector, {
      props: { collections: [mockCollections[0]], selectedId: 'inbox' },
    });

    expect(queryByLabelText('Selecionar coleção')).not.toBeInTheDocument();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `make test`
Expected: FAIL - Cannot find module CollectionSelector.svelte

**Step 3: Write minimal implementation**

Create `src/popup/components/CollectionSelector.svelte`:

```svelte
<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { Collection } from '@/lib/types';

  export let collections: Collection[] = [];
  export let selectedId: string = 'inbox';
  export let disabled: boolean = false;

  const dispatch = createEventDispatcher<{ select: string }>();

  let expanded = false;

  $: hasCustomCollections = collections.length > 1;
  $: selectedCollection = collections.find(c => c.id === selectedId) ?? collections[0];

  function toggleExpanded(): void {
    if (!disabled) {
      expanded = !expanded;
    }
  }

  function handleSelect(collectionId: string): void {
    dispatch('select', collectionId);
    expanded = false;
  }

  function handleKeydown(event: KeyboardEvent, collectionId: string): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleSelect(collectionId);
    }
  }
</script>

{#if hasCustomCollections}
  <div class="selector" class:expanded>
    <button
      type="button"
      class="selector-trigger"
      on:click={toggleExpanded}
      aria-label="Selecionar coleção"
      aria-expanded={expanded}
      aria-haspopup="listbox"
      {disabled}
    >
      <span class="selected-name">{selectedCollection?.name ?? 'Inbox'}</span>
      <svg
        class="chevron"
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <polyline points="6 9 12 15 18 9"></polyline>
      </svg>
    </button>

    {#if expanded}
      <ul class="collection-list" role="listbox" aria-label="Coleções disponíveis">
        {#each collections as collection (collection.id)}
          <li
            role="option"
            class="collection-item"
            class:selected={collection.id === selectedId}
            aria-selected={collection.id === selectedId}
            tabindex="0"
            on:click={() => handleSelect(collection.id)}
            on:keydown={(e) => handleKeydown(e, collection.id)}
          >
            {collection.name}
          </li>
        {/each}
      </ul>
    {/if}
  </div>
{/if}

<style>
  .selector {
    position: relative;
  }

  .selector-trigger {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-2) var(--space-3);
    background: var(--bg-secondary);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    color: var(--text-secondary);
    font-family: inherit;
    font-size: 0.75rem;
    cursor: pointer;
    transition: all var(--duration-fast) var(--ease-out);
  }

  .selector-trigger:hover:not(:disabled) {
    background: var(--bg-tertiary);
    color: var(--text-primary);
    border-color: var(--border-hover);
  }

  .selector-trigger:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .chevron {
    transition: transform var(--duration-fast) var(--ease-out);
  }

  .expanded .chevron {
    transform: rotate(180deg);
  }

  .collection-list {
    position: absolute;
    bottom: 100%;
    left: 0;
    right: 0;
    margin: 0 0 var(--space-1) 0;
    padding: var(--space-1);
    background: var(--bg-secondary);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    list-style: none;
    max-height: 150px;
    overflow-y: auto;
    z-index: 10;
  }

  .collection-item {
    padding: var(--space-2) var(--space-3);
    border-radius: var(--radius-sm);
    font-size: 0.75rem;
    color: var(--text-secondary);
    cursor: pointer;
    transition: all var(--duration-fast) var(--ease-out);
  }

  .collection-item:hover {
    background: var(--bg-tertiary);
    color: var(--text-primary);
  }

  .collection-item.selected {
    background: var(--accent-soft);
    color: var(--accent);
  }

  .collection-item:focus {
    outline: none;
    background: var(--bg-tertiary);
  }

  .collection-item:focus-visible {
    outline: 1px solid var(--accent);
    outline-offset: -1px;
  }
</style>
```

**Step 4: Run test to verify it passes**

Run: `make test`
Expected: PASS

**Step 5: Commit**

```bash
git add src/popup/components/CollectionSelector.svelte src/test/components/CollectionSelector.test.ts
git commit -m "$(cat <<'EOF'
feat(TAB-194): create CollectionSelector component

Add expandable dropdown component for selecting save destination.
Hidden when only Inbox exists (TAB-200). Includes keyboard navigation
and accessibility attributes.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Integrate CollectionSelector with App.svelte

**Files:**
- Modify: `src/popup/App.svelte`

**Step 1: Update imports and state**

Add to imports in `src/popup/App.svelte`:

```typescript
import { linksStore, linksByCollection, availableCollections } from '@stores/links';
import CollectionSelector from '@components/CollectionSelector.svelte';
```

Add state variable:

```typescript
let selectedCollectionId = INBOX_COLLECTION_ID;
```

**Step 2: Update handleSaveCurrentTab function**

Replace `handleSaveCurrentTab` function:

```typescript
async function handleSaveCurrentTab(collectionId?: string): Promise<void> {
  if (isSaving) {
    return;
  }

  isSaving = true;

  try {
    const tabInfo = await getCurrentTab();

    if (!tabInfo) {
      errorMessage = 'Não foi possível obter a aba atual.';
      return;
    }

    if (!isSaveableUrl(tabInfo.url)) {
      errorMessage = 'Esta página não pode ser salva.';
      return;
    }

    const targetCollection = collectionId ?? selectedCollectionId;
    const result = await linksStore.addLink({
      url: tabInfo.url,
      title: tabInfo.title,
      favicon: tabInfo.favicon,
      collectionId: targetCollection,
    });

    if (result.fallbackUsed) {
      successMessage = 'Coleção não encontrada. Link salvo na Inbox.';
    } else {
      const collection = $linksStore.collections.find(c => c.id === targetCollection);
      successMessage = `Link salvo em ${collection?.name ?? 'Inbox'}!`;
    }

    selectedCollectionId = INBOX_COLLECTION_ID;
  } catch (err) {
    console.error('Failed to save current tab:', err);
    errorMessage = 'Erro ao salvar link. Tente novamente.';
  } finally {
    isSaving = false;
  }
}

function handleCollectionSelect(event: CustomEvent<string>): void {
  selectedCollectionId = event.detail;
}

function handleQuickSave(): void {
  handleSaveCurrentTab(INBOX_COLLECTION_ID);
}
```

**Step 3: Update template**

Replace SaveButton section in template:

```svelte
<div class="save-area">
  <CollectionSelector
    collections={$availableCollections}
    selectedId={selectedCollectionId}
    disabled={isSaving || loading}
    on:select={handleCollectionSelect}
  />
  <SaveButton loading={isSaving} disabled={loading} on:click={() => handleSaveCurrentTab()} />
</div>
```

Add styles for save-area:

```css
.save-area {
  position: fixed;
  bottom: calc(var(--space-6) + 8px);
  right: var(--space-4);
  display: flex;
  align-items: flex-end;
  gap: var(--space-2);
  z-index: 100;
}
```

**Step 4: Run tests and lint**

Run: `make lint && make test`
Expected: All checks pass

**Step 5: Commit**

```bash
git add src/popup/App.svelte
git commit -m "$(cat <<'EOF'
feat(TAB-198): integrate CollectionSelector with save flow

Connect collection selection UI to link saving logic. Displays
collection name in success message. Resets to Inbox after save.
Shows fallback notification when collection was deleted (TAB-199).

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: Add integration tests for save-to-collection flow

**Files:**
- Create: `src/test/integration/save-to-collection.test.ts`

**Step 1: Create integration test file**

Create `src/test/integration/save-to-collection.test.ts`:

```typescript
/**
 * Integration tests for save-to-collection flow.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import { linksStore, availableCollections } from '@/popup/stores/links';
import * as storage from '@/lib/storage';
import type { Collection } from '@/lib/types';

vi.mock('@/lib/storage', () => ({
  getLinks: vi.fn(() => Promise.resolve([])),
  saveLinks: vi.fn(() => Promise.resolve()),
  getCollections: vi.fn(() => Promise.resolve([])),
  saveCollections: vi.fn(() => Promise.resolve()),
  initializeInbox: vi.fn(() => Promise.resolve()),
  removeCollection: vi.fn(() => Promise.resolve()),
  collectionExists: vi.fn(() => Promise.resolve(true)),
  createCollection: vi.fn(),
}));

const mockCollections: Collection[] = [
  { id: 'inbox', name: 'Inbox', order: 0, isDefault: true },
  { id: 'work', name: 'Work', order: 1 },
  { id: 'personal', name: 'Personal', order: 2 },
];

describe('Save to Collection Integration', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    vi.mocked(storage.getLinks).mockResolvedValue([]);
    vi.mocked(storage.getCollections).mockResolvedValue(mockCollections);
    await linksStore.load();
  });

  describe('Saving to specific collection', () => {
    it('should save link to selected collection', async () => {
      vi.mocked(storage.collectionExists).mockResolvedValue(true);

      const result = await linksStore.addLink({
        url: 'https://example.com',
        title: 'Example',
        collectionId: 'work',
      });

      expect(result.link.collectionId).toBe('work');
      expect(result.fallbackUsed).toBe(false);
    });

    it('should fall back to inbox when collection deleted', async () => {
      vi.mocked(storage.collectionExists).mockResolvedValue(false);

      const result = await linksStore.addLink({
        url: 'https://example.com',
        title: 'Example',
        collectionId: 'deleted-col',
      });

      expect(result.link.collectionId).toBe('inbox');
      expect(result.fallbackUsed).toBe(true);
      expect(result.originalCollectionId).toBe('deleted-col');
    });
  });

  describe('Available collections', () => {
    it('should list Inbox first', () => {
      const collections = get(availableCollections);
      expect(collections[0].id).toBe('inbox');
    });

    it('should sort custom collections alphabetically', () => {
      const collections = get(availableCollections);
      const customCollections = collections.slice(1);
      const names = customCollections.map(c => c.name);
      expect(names).toEqual(['Personal', 'Work']);
    });
  });

  describe('Edge cases', () => {
    it('should handle saving when only inbox exists', async () => {
      vi.mocked(storage.getCollections).mockResolvedValue([mockCollections[0]]);
      await linksStore.load();

      const result = await linksStore.addLink({
        url: 'https://example.com',
        title: 'Example',
        collectionId: 'inbox',
      });

      expect(result.link.collectionId).toBe('inbox');
      expect(result.fallbackUsed).toBe(false);
    });

    it('should always skip validation for inbox', async () => {
      vi.mocked(storage.collectionExists).mockResolvedValue(false);

      const result = await linksStore.addLink({
        url: 'https://example.com',
        title: 'Example',
        collectionId: 'inbox',
      });

      expect(result.link.collectionId).toBe('inbox');
      expect(result.fallbackUsed).toBe(false);
      expect(storage.collectionExists).not.toHaveBeenCalled();
    });
  });
});
```

**Step 2: Run test to verify all pass**

Run: `make test`
Expected: PASS

**Step 3: Commit**

```bash
git add src/test/integration/save-to-collection.test.ts
git commit -m "$(cat <<'EOF'
test(TAB-201): add integration tests for save-to-collection

Cover full flow including:
- Saving to specific collection
- Fallback to Inbox when collection deleted
- Available collections ordering
- Edge case: only Inbox exists

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: Final verification and cleanup

**Step 1: Run full test suite**

Run: `make test`
Expected: All tests pass

**Step 2: Run lint**

Run: `make lint`
Expected: No errors

**Step 3: Build extension**

Run: `make build`
Expected: Build succeeds

**Step 4: Manual testing checklist**

1. Load extension in Chrome (chrome://extensions)
2. Open a webpage
3. Click save button - should save to Inbox
4. Create a new collection
5. Click dropdown, select new collection, click save - should save to selected collection
6. Delete the collection via storage
7. Try to save to deleted collection - should fall back to Inbox with notification
8. With only Inbox, selector should be hidden

**Step 5: Final commit**

```bash
git add -A
git commit -m "$(cat <<'EOF'
feat(TAB-30): implement save link to specific collection

Complete implementation of TAB-30 with all subtasks:
- TAB-194: Collection selector UI
- TAB-195: Available collections store
- TAB-196: addLink accepts collectionId parameter
- TAB-197: Collection validation before save
- TAB-198: UI-to-store connection
- TAB-199: Success/error feedback messages
- TAB-200: Handle case when no custom collections
- TAB-201: Integration tests

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Summary

| Task | Subtasks Covered | Files Changed |
|------|------------------|---------------|
| 1 | TAB-195 | stores/links.ts, tests |
| 2 | TAB-197 | storage.ts, tests |
| 3 | TAB-196, TAB-197 | stores/links.ts, tests |
| 4 | TAB-194, TAB-200 | CollectionSelector.svelte, tests |
| 5 | TAB-198, TAB-199 | App.svelte |
| 6 | TAB-201 | integration tests |
| 7 | All | verification |
