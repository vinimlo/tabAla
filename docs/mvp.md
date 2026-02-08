# TabAla

> Minimalist browser extension for temporary link organization.

## Vision

A "waiting room" for links — not a permanent bookmark, but an organized buffer to process later without cluttering the browser.

## Problem

- Accumulating open tabs causes anxiety and loss of focus
- Existing solutions are paid or limited
- Traditional bookmarks become a graveyard of links

## Solution

A lightweight extension that lets you save tabs into temporary collections, with a clutter-free experience aimed at students and tech professionals.

## Principles

- Radical minimalism in the interface
- Zero friction to save
- Organization without bureaucracy
- A feeling of relief and control

---

## Project Status

**Current phase:** 0 - Foundation (in progress)

### Completed
- [x] GitHub repository created
- [x] Apache 2.0 license configured
- [x] Base documentation (MVP, CLAUDE.md, README.md)
- [x] Jira integration configured (Atena + Hefesto)
- [x] Code review configured (CodeRabbit)
- [x] `.gitignore` configured

### Pending (Phase 0)
- [ ] Create `package.json` with dependencies
- [ ] Configure TypeScript (`tsconfig.json`)
- [ ] Configure Vite (`vite.config.ts`)
- [ ] Create `src/manifest.json` (Manifest V3)
- [ ] `src/` structure (popup, background, lib)
- [ ] Placeholder icons in `public/`
- [ ] "Hello TabAla" working in the popup

---

## MVP — Scope

### Included Features

- Save the current tab with one click
- Create and name collections
- View links organized by collection
- Reopen a saved link
- Remove a link from the list
- Default "Inbox" collection for uncategorized links
- Local persistence in the browser
- The entire application must be dockerized with make commands for easy interaction

### Out of MVP (future)

- Collection sharing
- Cross-device sync
- Link search
- Tag system
- AI-powered suggestions

---

## Development Phases

### Phase 0: Foundation

**Goal:** Base structure working

**Tasks:**
- [x] Create GitHub repository
- [x] Configure Apache 2.0 license
- [x] Configure `.gitignore`
- [ ] Configure `package.json`:
  - Svelte, TypeScript, Vite
  - @crxjs/vite-plugin (for Chrome extensions)
  - Vitest for testing
- [ ] Configure `tsconfig.json`
- [ ] Configure `vite.config.ts`
- [ ] Create folder structure:
  - `src/popup/`
  - `src/background/`
  - `src/lib/`
  - `public/icons/`
- [ ] Create `src/manifest.json` (Manifest V3)
- [ ] Build pipeline working
- [ ] Extension loading in Chrome (dev mode)
- [ ] Create `Dockerfile` (Node.js development environment)
- [ ] Create `docker-compose.yml` (orchestration)
- [ ] Create `Makefile` with targets: `dev`, `build`, `test`, `lint`, `shell`
- [ ] Configure ESLint (`.eslintrc.json`)
- [ ] Configure Vitest (`vitest.config.ts`)
- [ ] Update `.gitignore` for Node.js (node_modules, dist, .env)

**Deliverable:** "Hello TabAla" showing in the popup

**Verification:**
- [ ] `make build` runs without errors and generates output in `dist/`
- [ ] `make dev` starts watch mode in the container
- [ ] `make lint` passes without errors
- [ ] `make test` runs (even without tests yet)
- [ ] Extension loads in `chrome://extensions` (dev mode)
- [ ] Popup displays "Hello TabAla"

---

### Phase 1: Main Flow

**Goal:** Saving and retrieving links works

- Button to save the current tab
- Local storage for links
- List of saved links in the popup
- Open link action ✓
- Remove link action

**Deliverable:** Complete cycle: save → view → open → remove

**Verification:**
- [ ] Saving the current tab adds a link to the list
- [ ] List displays saved links with title and favicon
- [x] Clicking a link opens it in a new tab (TAB-26 implemented)
- [ ] Remove button deletes the link
- [ ] Data persists after closing/opening the popup

---

### Phase 2: Collections

**Goal:** Organization by categories

- Create a new collection
- Save a link to a specific collection
- Filtered view by collection
- "Inbox" as the default collection
- Rename a collection
- Delete a collection

**Deliverable:** Basic organization functional

---

### Phase 3: Refinement

**Goal:** Polished and minimalist experience

- Minimalist visual interface
- Link favicon display
- Link count per collection
- Well-designed empty states
- Keyboard shortcut to save

**Deliverable:** MVP with refined UX

---

### Phase 4: Launch

**Goal:** Make it publicly available

- README documentation
- Screenshots for promotion
- Publish to the Chrome Web Store

**Deliverable:** Extension available for installation

---

## Technical Specifications

- **Platform:** Chrome (Manifest V3)
- **Framework:** Svelte
- **Storage:** Local (chrome.storage)
- **License:** Apache 2.0
- **Repository:** GitHub (public)

---

## Data Entities

### Link
```typescript
interface Link {
  id: string;           // Unique UUID
  url: string;          // Full URL
  title: string;        // Page title
  favicon?: string;     // Favicon URL (optional)
  collectionId: string; // Collection ID
  createdAt: number;    // Creation timestamp
}
```

### Collection
```typescript
interface Collection {
  id: string;      // Unique UUID
  name: string;    // Collection name
  order: number;   // Display order
}
```

---

## Business Rules

- **Mandatory Inbox:** The "Inbox" collection always exists and cannot be deleted
- **Orphan links:** When a collection is deleted, its links are moved to Inbox
- **Multiple copies:** The same URL can exist in different collections
- **Sorting:** Links displayed by creation date (most recent first)
- **Storage:** Data persisted in `chrome.storage.local` (~5MB limit)

---

## File Structure

```
tabAla/
├── src/
│   ├── popup/              # Popup UI (Svelte)
│   │   ├── App.svelte      # Main component
│   │   ├── main.ts         # Entry point
│   │   ├── components/     # Reusable components
│   │   └── stores/         # Svelte stores
│   ├── background/         # Service worker
│   │   └── index.ts
│   ├── lib/                # Shared logic
│   │   ├── storage.ts      # chrome.storage wrapper
│   │   └── types.ts        # TypeScript types
│   └── manifest.json       # Manifest V3
├── public/                 # Static assets
│   └── icons/              # Icons (16, 48, 128px)
├── tests/                  # Unit tests (Vitest)
├── dist/                   # Build output (gitignore)
├── Dockerfile              # Development image
├── docker-compose.yml      # Container orchestration
├── Makefile                # Automation commands
├── package.json
├── tsconfig.json
├── vite.config.ts
├── vitest.config.ts
└── .eslintrc.json
```

---

## Development Commands

All commands are executed via Docker through the Makefile:

```bash
make dev             # Start development environment (watch mode)
make build           # Production build
make test            # Run tests
make lint            # Code linting
make shell           # Open shell in the container

# Load extension in Chrome
# 1. Go to chrome://extensions
# 2. Enable "Developer mode"
# 3. Click "Load unpacked"
# 4. Select the dist/ folder
```

> **Note:** Do not run npm commands directly. Always use make commands.

---

## Target Audience

- University students
- Tech professionals
- Self-learners
- Anyone who accumulates tabs to "check later"
