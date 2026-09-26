# Nova interface Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give TabAla one visual system (tokens, local font, icons, primitives) and a new experience on top of the existing engines: the Now card, the ⌘K command palette that acts on links, the triage overlay, the two-column Focus page and a Focus session that survives across tabs.

**Architecture:** Pure helpers first (time left, week dots, forecast, card meta, highlight, commands, session view), each with unit tests; then Svelte components that only render and dispatch. Shared primitives live in `src/shared/components/ui/` and are used by the new tab and the popup. The recommendation and search engines do not change; the session is a new storage key read through a store, like `activity`.

**Tech Stack:** Svelte 5 in legacy syntax (`export let`, `$:`, `createEventDispatcher`, `on:`), TypeScript, Vite + crxjs, Vitest + jsdom + @testing-library/svelte 5.3.1, Docker Compose.

**Spec:** `docs/superpowers/specs/2026-09-25-nova-interface-design.md`

## Global Constraints

- Every command runs in Docker: `make test`, `make lint`, `make build`, `docker compose run --rm app npx vitest run <file>`. Never `npm`, `npx`, `node` or `python` on the host.
- Never run `vite preview` or `vite dev`: with crxjs they empty `dist/`, which Chrome loads. Screens are checked only through `make preview` (build into `.preview/`).
- `make build` then `docker compose run --rm -T app du -sb dist` ≤ 573440 bytes (560 KB) at the end of every stage (baseline 447599 on 2026-09-25; the ceiling was 512000 until the user raised it on 2026-09-25, after Task 11).
- `make lint`: no new errors (baseline: 12 old errors).
- `src/manifest.json`: no new permission.
- Svelte 5 in legacy syntax, as the rest of the code; no runes. No Tailwind: scoped `<style>` with CSS variables.
- Every visible string goes through `t()` / `plural()`; `en` and `pt_BR` keep the same keys (`src/test/lib/locales.test.ts`, Task 1). Keys are added, changed and removed only with `scripts/i18n/keys.mjs` (Task 1). Tests query by key: the chrome mock returns the key itself.
- Copy: sentence case, no all-caps labels, no positive letter-spacing; a finished link is "concluído"/"completed", never "vencido".
- Colors only through tokens (`src/shared/styles/tokens.css`); `rgba(...)` outside `tokens.css` only inside a `box-shadow`. At most one coral-filled element per visible area.
- Icons only through `Icon.svelte`; the characters ✓ ⋯ ▸ ▾ are never used as icons.
- Commits: `git add` with explicit paths. Never stage `Dockerfile`, `docker-compose.yml`, `.github/workflows/release.yml`, `entrypoint.dev.sh`, `.serena/`, `AGENTS.md` or hunks of `CLAUDE.md` other than your own. Every commit message ends with `Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>`.
- Public repository: fixtures and the preview stub hold only fictional data.
- @testing-library/svelte 5.3.1: `rerender` is async; component events are passed with the `events` option.

## Review Focus

1. Links with an empty title (only a URL) in the Now card, the palette and the triage overlay: the URL shows instead of a blank line, long text is clamped, nothing overflows. Pinned by tests in Tasks 8, 9 and 11.
2. Missing or broken favicons: `LinkTile` falls back to the globe icon, also when the image fails to load. Pinned in Task 3.
3. A stored `focusSession` that is malformed, older than 12 h, or points to links that were deleted, discarded or completed elsewhere: it is treated as absent or those items drop out, never a crash. Pinned in Task 13.
4. Single-letter shortcuts (F, T, N, 1–4) while typing in a field, with modifiers or with a layer open, and ⌥↵ in the palette with no result selected: nothing happens. Pinned in Tasks 5, 9 and 11.
5. Narrow windows (1024 px) and the light theme: the palette drops the preview pane and offers the same actions in a menu; nothing depends on the dark theme. Pinned in Task 11 (test) and in each stage's screenshots.

## File map

| Path | Responsibility | Task |
|---|---|---|
| `scripts/preview/chrome-stub.js`, `scripts/preview/README.md`, `Makefile` (`preview`, `preview-stop`) | Screens outside Chrome, fictional data | 1 |
| `scripts/i18n/keys.mjs` | Add, change and remove messages in both locales without reformatting | 1 |
| `src/test/lib/locales.test.ts` | Same keys in both locales; every key used exists | 1 |
| `scripts/fonts/subset-instrument-sans.sh`, `public/fonts/*` | Local font files and license | 2 |
| `src/shared/styles/tokens.css`, `src/newtab/app.css`, `src/popup/app.css` | Tokens, type scale, font faces | 2 |
| `src/shared/components/ui/icons.ts`, `Icon.svelte`, `Button.svelte`, `IconButton.svelte`, `Kbd.svelte`, `LinkTile.svelte`, `ProgressRing.svelte`, `src/shared/platform.ts` | Primitives | 3 |
| `src/shared/components/ui/Menu.svelte`, `MenuItem.svelte`, `Segmented.svelte` | Primitives with keyboard | 4 |
| `src/newtab/header.ts`, `src/newtab/components/AppHeader.svelte`, `WorkspaceRail.svelte`, `TabsSidebar.svelte`, `src/newtab/shortcuts.ts`, `App.svelte` | Page structure | 5 |
| `src/newtab/card-meta.ts`, `LinkCard.svelte`, `Column.svelte`, `KanbanBoard.svelte` | Board card | 6 |
| `src/lib/recommend/time.ts`, `src/lib/recommend/progress.ts` | Time left, week dots, forecast | 7, 12 |
| `src/newtab/components/NowSection.svelte`, `NowHero.svelte`, `NowLater.svelte`, `src/newtab/next-up-labels.ts` | Now | 8 |
| `src/newtab/components/TriageOverlay.svelte`, `FocusTriagePanel.svelte`, `src/shared/focus-trap.ts` | Triage | 9 |
| `src/lib/search/highlight.ts`, `src/lib/recommend/recent.ts`, `src/newtab/commands.ts`, `src/newtab/palette-actions.ts` | Palette helpers | 10 |
| `src/newtab/components/CommandPalette.svelte`, `PalettePreview.svelte` | ⌘K | 11 |
| `src/newtab/components/FocusView.svelte`, `FocusSession.svelte`, `FocusFronts.svelte`, `FocusCompleted.svelte` | Focus | 12 |
| `src/lib/recommend/session.ts`, `src/lib/storage/session.ts`, `src/lib/stores/session.ts`, `src/newtab/components/SessionPill.svelte` | Session across tabs | 13 |
| `src/shared/components/*.svelte`, `SettingsModal.svelte`, `OnboardingWizard.svelte`, `src/popup/App.svelte` | Consistency, literal colors | 14 |
| `docs/privacy-policy*.md`, `CLAUDE.md` | Policy, project notes, final gates | 15 |

Removed along the way: `QuickActionsBar.svelte`, `StatusBar.svelte` (Task 5); `NextUpStrip.svelte`, `NextUpCard.svelte` (Task 8); `FocusTriage.svelte` (Task 9); `SearchPanel.svelte` (Task 11), with their tests.

---

## Stage 1 — Base and structure

### Task 1: Preview harness, locale guard and the i18n tool

**Files:**
- Create: `scripts/preview/chrome-stub.js`, `scripts/preview/README.md`, `scripts/i18n/keys.mjs`, `src/test/lib/locales.test.ts`
- Modify: `Makefile`, `.gitignore`
- Outside the repo: `<caderno>/arquitetura/port-map.md`

**Interfaces:**
- Produces: `make preview` (serves `.preview/` on port 4173) and `make preview-stop`; `node scripts/i18n/keys.mjs add|set <file.json>` and `node scripts/i18n/keys.mjs remove <key...>`, where `<file.json>` is `{ "<key>": { "en": "...", "pt_BR": "...", "placeholders"?: { "<name>": "$1" } } }`. Later tasks write their key files to `.superpowers/sdd/2026-09-25-nova-interface/keys-<task>.json` (git-ignored) and run the tool on them.

- [ ] **Step 1: Write the locale guard test**

`src/test/lib/locales.test.ts`:

```ts
/**
 * Both locales carry the same keys, and every key the code asks for exists.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { ACTION_KEYS, ROLE_KEYS, TRIAGE_KEYS } from '@/newtab/next-up-labels';
import { KIND_LABEL_KEYS } from '@/lib/search/labels';

type Messages = Record<string, { message: string }>;

const read = (locale: string): Messages =>
  JSON.parse(readFileSync(join(process.cwd(), 'public/_locales', locale, 'messages.json'), 'utf8')) as Messages;

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      return name === 'test' ? [] : sources(path);
    }
    return /\.(ts|svelte)$/.test(name) ? [path] : [];
  });
}

const en = read('en');
const ptBR = read('pt_BR');

describe('locales', () => {
  it('en and pt_BR have the same keys', () => {
    expect(Object.keys(ptBR).sort()).toEqual(Object.keys(en).sort());
  });

  it('every key written in the code exists', () => {
    const keys = new Set<string>();
    for (const file of sources(join(process.cwd(), 'src'))) {
      const text = readFileSync(file, 'utf8');
      for (const match of text.matchAll(/\bt\(\s*'([a-z0-9_]+)'/g)) {
        keys.add(match[1]);
      }
      for (const match of text.matchAll(/\bplural\([^,()]+,\s*'([a-z0-9_]+)',\s*'([a-z0-9_]+)'/g)) {
        keys.add(match[1]);
        keys.add(match[2]);
      }
    }
    for (const map of [ACTION_KEYS, ROLE_KEYS, TRIAGE_KEYS, KIND_LABEL_KEYS]) {
      for (const key of Object.values(map)) {
        keys.add(key);
      }
    }
    expect([...keys].filter((key) => !(key in en)).sort()).toEqual([]);
  });
});
```

- [ ] **Step 2: Run it**

Run: `docker compose run --rm app npx vitest run src/test/lib/locales.test.ts`
Expected: PASS (2 tests). This test guards what exists; if it fails, the list it prints names keys the code already uses without a message: add them with the tool from Step 4 in this task and ledger a ruling.

- [ ] **Step 3: Write the i18n tool**

`scripts/i18n/keys.mjs`:

```js
#!/usr/bin/env node
/**
 * Adds, changes or removes messages in both locales without reformatting them.
 *   node scripts/i18n/keys.mjs add <file.json>    new keys
 *   node scripts/i18n/keys.mjs set <file.json>    new text for existing keys
 *   node scripts/i18n/keys.mjs remove <key> ...   drops keys
 * <file.json>: { "key": { "en": "...", "pt_BR": "...", "placeholders": { "name": "$1" } } }
 * Runs in the container: docker compose run --rm app node scripts/i18n/keys.mjs ...
 */
import { readFileSync, writeFileSync } from 'node:fs';

const LOCALES = ['en', 'pt_BR'];
const path = (locale) => `public/_locales/${locale}/messages.json`;

function entryText(key, message, placeholders) {
  const lines = [`  ${JSON.stringify(key)}: {`, `    "message": ${JSON.stringify(message)}${placeholders ? ',' : ''}`];
  if (placeholders) {
    lines.push('    "placeholders": {');
    const names = Object.keys(placeholders);
    names.forEach((name, i) => {
      lines.push(`      ${JSON.stringify(name)}: {`, `        "content": ${JSON.stringify(placeholders[name])}`);
      lines.push(`      }${i < names.length - 1 ? ',' : ''}`);
    });
    lines.push('    }');
  }
  lines.push('  }');
  return lines.join('\n');
}

function entryRange(lines, key) {
  const start = lines.findIndex((line) => line.startsWith(`  ${JSON.stringify(key)}: {`));
  if (start === -1) {
    return null;
  }
  let depth = 0;
  for (let i = start; i < lines.length; i += 1) {
    depth += (lines[i].match(/{/g) ?? []).length - (lines[i].match(/}/g) ?? []).length;
    if (depth === 0) {
      return [start, i];
    }
  }
  throw new Error(`${key}: unbalanced entry`);
}

function write(locale, text) {
  JSON.parse(text);
  writeFileSync(path(locale), text);
}

function add(file) {
  const entries = JSON.parse(readFileSync(file, 'utf8'));
  for (const locale of LOCALES) {
    const text = readFileSync(path(locale), 'utf8');
    const existing = JSON.parse(text);
    const blocks = Object.entries(entries).map(([key, value]) => {
      if (key in existing) {
        throw new Error(`${locale}: ${key} already exists`);
      }
      if (typeof value[locale] !== 'string') {
        throw new Error(`${key}: missing ${locale}`);
      }
      return entryText(key, value[locale], value.placeholders);
    });
    const head = text.slice(0, text.lastIndexOf('}')).replace(/\s*$/, '');
    write(locale, `${head},\n\n${blocks.join(',\n')}\n}\n`);
  }
}

function set(file) {
  const entries = JSON.parse(readFileSync(file, 'utf8'));
  for (const locale of LOCALES) {
    const lines = readFileSync(path(locale), 'utf8').split('\n');
    for (const [key, value] of Object.entries(entries)) {
      const range = entryRange(lines, key);
      if (range === null) {
        throw new Error(`${locale}: ${key} not found`);
      }
      const at = lines.findIndex((line, i) => i > range[0] && i <= range[1] && line.includes('"message":'));
      lines[at] = lines[at].replace(/"message": ".*?"(,?)$/, `"message": ${JSON.stringify(value[locale])}$1`);
    }
    write(locale, lines.join('\n'));
  }
}

function remove(keys) {
  for (const locale of LOCALES) {
    const lines = readFileSync(path(locale), 'utf8').split('\n');
    for (const key of keys) {
      const range = entryRange(lines, key);
      if (range === null) {
        throw new Error(`${locale}: ${key} not found`);
      }
      lines.splice(range[0], range[1] - range[0] + 1);
    }
    const text = lines.join('\n').replace(/,(\s*)\n}\s*$/, '$1\n}\n').replace(/\n{3,}/g, '\n\n');
    write(locale, text);
  }
}

const [command, ...args] = process.argv.slice(2);
if (command === 'add') {
  add(args[0]);
} else if (command === 'set') {
  set(args[0]);
} else if (command === 'remove') {
  remove(args);
} else {
  throw new Error('usage: keys.mjs add|set <file.json> | remove <key>...');
}
```

- [ ] **Step 4: Check the tool on a throwaway key and roll it back**

```bash
mkdir -p .superpowers/sdd/2026-09-25-nova-interface
printf '{"zz_probe":{"en":"Probe $1","pt_BR":"Sonda $1","placeholders":{"count":"$1"}}}' > .superpowers/sdd/2026-09-25-nova-interface/keys-probe.json
docker compose run --rm app node scripts/i18n/keys.mjs add .superpowers/sdd/2026-09-25-nova-interface/keys-probe.json
docker compose run --rm app npx vitest run src/test/lib/locales.test.ts
docker compose run --rm app node scripts/i18n/keys.mjs remove zz_probe
git diff --stat public/_locales
```

Expected: the test passes with the probe key in both files; after `remove`, `git diff --stat public/_locales` prints nothing (the files are byte-identical to before).

- [ ] **Step 5: Write the preview stub**

`scripts/preview/chrome-stub.js`:

```js
// Fake chrome.* for rendering TabAla pages outside the extension. Fictional data only.
// Query string: ?theme=dark|light, ?session=1 (a Focus session in progress), ?empty=1 (nothing saved).
(() => {
  const DAY = 86400000;
  const now = Date.now();
  const params = new URLSearchParams(location.search);
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const dk = (t) => {
    const d = new Date(t);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };
  const fav = (host) => `https://www.google.com/s2/favicons?domain=${host}&sz=64`;

  const collections = [
    { id: 'inbox', name: 'Inbox', order: 0, isDefault: true, createdAt: now - 90 * DAY },
    { id: 'c-ml', name: 'Machine learning', order: 1, color: '#6B8AAF', workspaceId: 'general', focus: true, createdAt: now - 80 * DAY },
    { id: 'c-web', name: 'Web platform', order: 2, color: '#7CB890', workspaceId: 'general', createdAt: now - 70 * DAY },
    { id: 'c-talks', name: 'Talks para ver', order: 3, color: '#D4A85A', workspaceId: 'general', createdAt: now - 60 * DAY },
    { id: 'c-ref', name: 'Referência', order: 4, color: '#9B8AA0', workspaceId: 'general', reference: true, createdAt: now - 50 * DAY },
    { id: 'c-side', name: 'Projeto paralelo', order: 5, color: '#B07BAF', workspaceId: 'w-side', createdAt: now - 40 * DAY },
  ];
  const L = (id, col, title, url, host, ageDays, extra = {}) =>
    ({ id, collectionId: col, title, url, favicon: fav(host), createdAt: now - ageDays * DAY, ...extra });
  const links = params.get('empty') === '1' ? [] : [
    L('l1', 'c-ml', 'Attention Is All You Need', 'https://arxiv.org/abs/1706.03762', 'arxiv.org', 30, { order: 1 }),
    L('l2', 'c-ml', "Let's build GPT: from scratch, in code, spelled out", 'https://www.youtube.com/watch?v=kCc8FmEb1nY', 'youtube.com', 28, { order: 2 }),
    L('l3', 'c-ml', 'karpathy/nanoGPT', 'https://github.com/karpathy/nanoGPT', 'github.com', 25, { order: 3 }),
    L('l4', 'c-ml', 'The Illustrated Transformer', 'https://jalammar.github.io/illustrated-transformer/', 'jalammar.github.io', 20, { order: 4 }),
    L('l5', 'c-ml', 'Scaling Laws for Neural Language Models', 'https://arxiv.org/abs/2001.08361', 'arxiv.org', 18, { order: 5, completedAt: now - 2 * DAY }),
    L('l6', 'c-web', 'View Transitions API — MDN', 'https://developer.mozilla.org/en-US/docs/Web/API/View_Transitions_API', 'developer.mozilla.org', 15, { order: 1 }),
    L('l7', 'c-web', 'Svelte 5 runes: migration guide', 'https://svelte.dev/docs/svelte/v5-migration-guide', 'svelte.dev', 14, { order: 2 }),
    L('l8', 'c-web', 'CSS anchor positioning', 'https://developer.chrome.com/blog/anchor-positioning-api', 'developer.chrome.com', 12, { order: 3 }),
    L('l9', 'c-web', 'Web Locks API', 'https://developer.mozilla.org/en-US/docs/Web/API/Web_Locks_API', 'developer.mozilla.org', 70, { order: 4 }),
    L('l10', 'c-talks', 'Simple Made Easy — Rich Hickey', 'https://www.youtube.com/watch?v=SxdOUGdseq4', 'youtube.com', 45, { order: 1 }),
    L('l11', 'c-talks', "The Mess We're In — Joe Armstrong", 'https://www.youtube.com/watch?v=lKXe3HUG2l4', 'youtube.com', 65, { order: 2 }),
    L('l12', 'c-talks', 'Inventing on Principle — Bret Victor', 'https://vimeo.com/906418692', 'vimeo.com', 40, { order: 3, completedAt: now - 5 * DAY }),
    L('l13', 'c-ref', 'Refactoring UI', 'https://www.refactoringui.com/', 'refactoringui.com', 50, { order: 1 }),
    L('l14', 'c-ref', "Butterick's Practical Typography", 'https://practicaltypography.com/', 'practicaltypography.com', 49, { order: 2 }),
    L('l15', 'inbox', 'Conversa: plano de estudos de transformers', 'https://claude.ai/chat/2b1f0c', 'claude.ai', 3),
    L('l16', 'inbox', 'How to Read a Paper — S. Keshav', 'https://web.stanford.edu/class/ee384m/Handouts/HowtoReadPaper.pdf', 'stanford.edu', 1),
    L('l17', 'inbox', 'Designing Data-Intensive Applications — cap. 5', 'https://dataintensive.net/', 'dataintensive.net', 75),
    L('l18', 'c-side', 'Chrome Extensions: service worker lifecycle', 'https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle', 'developer.chrome.com', 10, { order: 1 }),
    L('l19', 'c-side', 'crxjs/chrome-extension-tools', 'https://github.com/crxjs/chrome-extension-tools', 'github.com', 9, { order: 2 }),
    L('l20', 'c-web', 'Interop 2026 dashboard', 'https://wpt.fyi/interop-2026', 'wpt.fyi', 8, { order: 5, snoozedUntil: today.getTime() + 3 * DAY }),
    L('l21', 'inbox', '', 'https://example.org/a/very/long/path/without/a/title/saved/from/a/tab', 'example.org', 2),
  ];
  const act = (o) => ({ opens: 0, openDays: [], shownDays: [], snoozes: 0, activeMs: 0, ...o });
  const activity = {
    l2: act({ opens: 2, lastOpenedAt: now - DAY, openDays: [dk(now - 3 * DAY), dk(now - DAY)], activeMs: 18 * 60000, askCompleteAt: now - 3600000 }),
    l1: act({ opens: 1, lastOpenedAt: now - 2 * DAY, openDays: [dk(now - 2 * DAY)], activeMs: 12 * 60000 }),
    l11: act({ shownDays: [dk(now - 3 * DAY), dk(now - 2 * DAY), dk(now - DAY)], snoozes: 3 }),
    l17: act({ shownDays: [dk(now - 4 * DAY), dk(now - 2 * DAY), dk(now - DAY)] }),
    l5: act({ opens: 3, activeMs: 42 * 60000 }),
    l12: act({ opens: 1, activeMs: 55 * 60000 }),
  };
  const data = {
    links,
    collections,
    workspaces: [
      { id: 'general', name: 'Geral', color: '#E85D42', order: 0, createdAt: now - 90 * DAY, isDefault: true },
      { id: 'w-side', name: 'Side projects', color: '#5DA3A0', order: 1, createdAt: now - 40 * DAY },
    ],
    settings: {
      newtabEnabled: true, onboardingCompleted: true, theme: params.get('theme') || 'dark', topicSearch: false,
      showNextUp: true, nextUpCollapsed: false, learnFromBrowsing: true,
    },
    activity,
    recoStats: {},
  };
  if (params.get('session') === '1') {
    data.focusSession = {
      minutes: 30, startedAt: now - 18 * 60000, completedIds: ['l5'],
      items: [{ type: 'link', linkId: 'l5' }, { type: 'link', linkId: 'l10' }, { type: 'link', linkId: 'l6' }],
    };
  }

  const ev = () => {
    const fns = [];
    return {
      addListener: (f) => fns.push(f),
      removeListener: (f) => { const i = fns.indexOf(f); if (i >= 0) fns.splice(i, 1); },
      hasListener: (f) => fns.includes(f),
      fns,
    };
  };
  const onChanged = ev();
  const pick = (store, keys) => {
    if (keys == null) return structuredClone(store);
    const list = typeof keys === 'string' ? [keys] : Array.isArray(keys) ? keys : Object.keys(keys);
    const out = {};
    for (const k of list) if (k in store) out[k] = structuredClone(store[k]);
    return out;
  };
  const area = (store, name) => ({
    get: async (keys) => pick(store, keys),
    set: async (items) => {
      const changes = {};
      for (const [k, v] of Object.entries(items)) {
        changes[k] = { oldValue: store[k], newValue: structuredClone(v) };
        store[k] = structuredClone(v);
      }
      onChanged.fns.forEach((f) => f(changes, name));
    },
    remove: async (keys) => {
      const changes = {};
      for (const k of [].concat(keys)) { changes[k] = { oldValue: store[k] }; delete store[k]; }
      onChanged.fns.forEach((f) => f(changes, name));
    },
    clear: async () => { for (const k of Object.keys(store)) delete store[k]; },
  });

  let messages = {};
  try {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', '/_locales/pt_BR/messages.json', false);
    xhr.send();
    messages = JSON.parse(xhr.responseText);
  } catch (error) {
    console.warn('preview stub: no locale', error);
  }
  const getMessage = (key, subs) => {
    const entry = messages[key];
    if (!entry) return '';
    const list = subs == null ? [] : [].concat(subs).map(String);
    let text = entry.message;
    for (const [name, ph] of Object.entries(entry.placeholders || {})) {
      const content = ph.content.replace(/\$(\d)/g, (_, n) => list[Number(n) - 1] ?? '');
      text = text.replace(new RegExp(`\\$${name}\\$`, 'gi'), content);
    }
    text = text.replace(/\$(\d)/g, (_, n) => list[Number(n) - 1] ?? '');
    return text.replace(/\$\$/g, '$');
  };

  const tabs = [
    { id: 101, windowId: 1, index: 0, active: false, pinned: false, title: 'Rust Book — Ownership', url: 'https://doc.rust-lang.org/book/ch04-01-what-is-ownership.html', favIconUrl: fav('rust-lang.org'), groupId: -1 },
    { id: 102, windowId: 1, index: 1, active: false, pinned: false, title: 'Hacker News', url: 'https://news.ycombinator.com/', favIconUrl: fav('ycombinator.com'), groupId: -1 },
    { id: 103, windowId: 1, index: 2, active: true, pinned: false, title: 'Nova aba', url: location.href, groupId: -1 },
  ];

  window.chrome = {
    runtime: {
      id: 'preview', getURL: (p) => `/${p.replace(/^\//, '')}`, getManifest: () => ({ version: '0.0.0' }),
      onMessage: ev(), onStartup: ev(), onInstalled: ev(), sendMessage: async () => undefined, lastError: undefined,
    },
    i18n: { getMessage, getUILanguage: () => 'pt-BR' },
    storage: { local: area(data, 'local'), session: area({}, 'session'), onChanged },
    tabs: {
      query: async () => structuredClone(tabs), create: async (o) => ({ id: 999, ...o }), update: async () => ({}),
      remove: async () => undefined, get: async (id) => tabs.find((t) => t.id === id), getCurrent: async () => tabs[2],
      onUpdated: ev(), onRemoved: ev(), onCreated: ev(), onActivated: ev(), onMoved: ev(), onAttached: ev(), onDetached: ev(),
    },
    tabGroups: { query: async () => [], onUpdated: ev(), onRemoved: ev(), onCreated: ev() },
    windows: {
      WINDOW_ID_NONE: -1, WINDOW_ID_CURRENT: -2, get: async () => ({ id: 1, focused: true }),
      getLastFocused: async () => ({ id: 1, focused: true }), onFocusChanged: ev(),
    },
    action: { setBadgeText: async () => undefined, setBadgeBackgroundColor: async () => undefined },
  };
})();
```

- [ ] **Step 6: Write the README**

`scripts/preview/README.md`:

````markdown
# Prévia das telas fora do Chrome

Para ver e capturar as telas sem carregar a extensão, com dados fictícios.

```bash
make preview        # builda em .preview/ (nunca no dist/) e serve em http://localhost:4173
make preview-stop   # para o servidor
```

No Playwright (MCP), injete o stub antes de abrir a página:

```js
async (page) => {
  await page.context().addInitScript({ path: '<caminho absoluto>/scripts/preview/chrome-stub.js' });
  await page.goto('http://localhost:4173/src/newtab/index.html?theme=dark');
}
```

Parâmetros: `theme=dark|light`, `session=1` (sessão de Foco em andamento), `empty=1` (nada salvo).

Nunca rode `vite preview` nem `vite dev`: com o crxjs eles esvaziam o `dist/`, de onde o Chrome carrega a extensão.
````

- [ ] **Step 7: Add the Makefile targets and ignore `.preview/`**

In `Makefile`, add `preview preview-stop` to the `.PHONY` line and append, after the `test-coverage` target:

```make
## preview: Builda em .preview/ (fora do dist/) e serve na porta 4173 com dados fictícios
preview:
	@echo "\033[32m>>> Build da prévia em .preview/...\033[0m"
	docker compose run --rm app npx vite build --outDir .preview --emptyOutDir
	-@docker rm -f tabala-preview >/dev/null 2>&1
	docker run --rm -d --cpus 1 --memory 256m -p 4173:4173 -v "$(CURDIR)/.preview:/srv:ro" -w /srv --name tabala-preview python:3.12-slim python -m http.server 4173
	@echo "\033[32m>>> Prévia em http://localhost:4173/src/newtab/index.html (injete scripts/preview/chrome-stub.js)\033[0m"

## preview-stop: Para o servidor da prévia
preview-stop:
	-docker rm -f tabala-preview
```

In `.gitignore`, under the "Build e Distribuição" block, add a line `.preview/`.

- [ ] **Step 8: Check that the preview never touches `dist/`**

```bash
ls dist/src/newtab/index.html
make preview
curl --max-time 5 -sI http://localhost:4173/src/newtab/index.html | head -1
ls dist/src/newtab/index.html
make preview-stop
```

Expected: `dist/src/newtab/index.html` exists before and after; the `curl` prints `HTTP/1.0 200 OK`. If `dist/` lost files, stop: run `make build` to restore it and ledger the finding.

- [ ] **Step 9: Register the port**

In `<caderno>/arquitetura/port-map.md`, add a row for port 4173: `tabAla — prévia das telas (make preview), sob demanda`, following the table's existing columns. Commit in the `caderno` repo:

```bash
git -C <caderno> add arquitetura/port-map.md
git -C <caderno> commit -m "port-map: 4173 para a prévia do tabAla

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

- [ ] **Step 10: Commit**

```bash
git add scripts/preview/chrome-stub.js scripts/preview/README.md scripts/i18n/keys.mjs src/test/lib/locales.test.ts Makefile .gitignore
git commit -m "chore(preview): screens outside Chrome with fictional data; locale guard and i18n tool

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

### Task 2: Tokens and the local font

**Files:**
- Create: `scripts/fonts/subset-instrument-sans.sh`, `public/fonts/instrument-sans.woff2`, `public/fonts/instrument-sans-condensed.woff2`, `public/fonts/OFL.txt`, `src/test/styles/tokens.test.ts`
- Modify: `src/shared/styles/tokens.css` (rewrite), `src/newtab/app.css:1-60`, `src/popup/app.css`

**Interfaces:**
- Produces (CSS custom properties every later task uses): `--surface-base|elevated|overlay|subtle|well|tile`, `--text-primary|secondary|tertiary`, `--text-on-accent`, `--accent-primary|secondary|ink|soft|glow|line`, `--semantic-success|warning|error`, `--success-soft`, `--warning-soft`, `--semantic-error-soft`, `--border-subtle|default|strong`, `--state-hover|pressed`, `--scrim`, `--shadow-lift`, `--shadow-float`, `--text-2xs|xs|sm|base|md|lg|xl|display`, `--space-1..8`, `--radius-sm|md|lg|xl|full`, `--control-sm|md|lg`, `--font-body`, `--font-display`, `--font-mono`, `--duration-fast|normal|slow`, `--ease-out`.

- [ ] **Step 1: Write the failing token test**

`src/test/styles/tokens.test.ts`:

```ts
/**
 * The design tokens of spec §4: themed in both themes, one scale for both apps,
 * and only the bundled fonts.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const file = (path: string): string => readFileSync(join(process.cwd(), path), 'utf8');
const tokens = file('src/shared/styles/tokens.css');

function block(selector: string): string {
  const start = tokens.indexOf(selector);
  expect(start).toBeGreaterThan(-1);
  return tokens.slice(start, tokens.indexOf('}', start));
}

const THEMED = [
  '--surface-well', '--surface-tile', '--accent-ink', '--accent-line', '--success-soft', '--semantic-warning',
  '--warning-soft', '--state-hover', '--state-pressed', '--scrim', '--shadow-lift', '--shadow-float', '--text-on-accent',
];

describe('design tokens', () => {
  it.each(['[data-theme="dark"] {', '[data-theme="light"] {'])('%s defines every themed token', (selector) => {
    const body = block(selector);
    for (const token of THEMED) {
      expect(body).toContain(`${token}:`);
    }
  });

  it('defines the type scale, controls and radii once for both apps', () => {
    for (const token of ['--text-2xs', '--text-display', '--control-sm', '--control-md', '--control-lg', '--radius-xl', '--font-display', '--space-8']) {
      expect(tokens).toContain(`${token}:`);
    }
  });

  it('loads only the bundled fonts', () => {
    const css = [tokens, file('src/newtab/app.css'), file('src/popup/app.css')].join('\n');
    expect(css).not.toMatch(/"Inter"|General Sans|JetBrains Mono|fonts\.googleapis/);
    expect(tokens).toContain('url("/fonts/instrument-sans.woff2")');
    expect(tokens).toContain('url("/fonts/instrument-sans-condensed.woff2")');
  });

  it('keeps both font files within 42 KB and ships their license', () => {
    const size = (name: string): number => statSync(join(process.cwd(), 'public/fonts', name)).size;
    expect(size('instrument-sans.woff2') + size('instrument-sans-condensed.woff2')).toBeLessThanOrEqual(42 * 1024);
    expect(file('public/fonts/OFL.txt')).toContain('SIL OPEN FONT LICENSE');
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `docker compose run --rm app npx vitest run src/test/styles/tokens.test.ts`
Expected: FAIL — the themed tokens are missing and `public/fonts/` does not exist.

- [ ] **Step 3: Write the subset script and produce the fonts**

`scripts/fonts/subset-instrument-sans.sh`:

```sh
#!/bin/sh
# Cuts Instrument Sans (SIL OFL) into the two local files of spec 2026-09-25 §4.2.
# From the repository root:
#   docker run --rm --cpus 1 --memory 512m -v "$PWD":/work -w /work python:3.12-slim sh scripts/fonts/subset-instrument-sans.sh
set -eu
pip install --quiet --root-user-action=ignore fonttools brotli
BASE=https://raw.githubusercontent.com/google/fonts/main/ofl/instrumentsans
TMP=$(mktemp -d)
mkdir -p public/fonts
python -c "import urllib.request as u; u.urlretrieve('$BASE/InstrumentSans%5Bwdth%2Cwght%5D.ttf', '$TMP/src.ttf'); u.urlretrieve('$BASE/OFL.txt', 'public/fonts/OFL.txt')"
UNICODES="U+0020-007E,U+00A0-00FF,U+2013-2014,U+2018-2019,U+201C-201D,U+2022,U+2026"
fonttools varLib.instancer "$TMP/src.ttf" wdth=100 wght=400:700 -o "$TMP/body.ttf" -q
fonttools varLib.instancer "$TMP/src.ttf" wdth=80 wght=620 -o "$TMP/condensed.ttf" -q
pyftsubset "$TMP/body.ttf" --output-file=public/fonts/instrument-sans.woff2 --flavor=woff2 \
  --unicodes="$UNICODES" --layout-features=kern,liga,calt,tnum --no-hinting --desubroutinize
pyftsubset "$TMP/condensed.ttf" --output-file=public/fonts/instrument-sans-condensed.woff2 --flavor=woff2 \
  --unicodes="$UNICODES" --layout-features=kern,liga --no-hinting --desubroutinize
ls -l public/fonts
```

Run: `docker run --rm --cpus 1 --memory 512m -v "$PWD":/work -w /work python:3.12-slim sh scripts/fonts/subset-instrument-sans.sh`
Expected: `public/fonts/` lists `OFL.txt` (~4.4 KB), `instrument-sans.woff2` (~27 KB) and `instrument-sans-condensed.woff2` (~14 KB).

- [ ] **Step 4: Rewrite `src/shared/styles/tokens.css`**

```css
/* =================================================================
   TABALA - Design tokens (spec 2026-09-25 §4)
   Shared by the new tab and the popup; each app adds only layout.
   ================================================================= */

@font-face {
  font-family: "Instrument Sans";
  src: url("/fonts/instrument-sans.woff2") format("woff2");
  font-weight: 400 700;
  font-style: normal;
  font-display: block;
}

@font-face {
  font-family: "Instrument Sans Condensed";
  src: url("/fonts/instrument-sans-condensed.woff2") format("woff2");
  font-weight: 600;
  font-style: normal;
  font-display: block;
}

/* Dark theme (default) */
:root,
[data-theme="dark"] {
  --surface-base: #0F0E11;
  --surface-elevated: #16151A;
  --surface-overlay: #1D1C21;
  --surface-subtle: #26252B;
  --surface-well: #0B0A0D;
  --surface-tile: #232228;

  --text-primary: #F5F3F0;
  --text-secondary: #A8A5A0;
  --text-tertiary: #6B6865;
  --text-on-accent: #FFFFFF;

  --accent-primary: #E85D42;
  --accent-secondary: #F07A62;
  --accent-ink: #FF8A70;
  --accent-soft: rgba(232, 93, 66, 0.12);
  --accent-glow: rgba(232, 93, 66, 0.24);
  --accent-line: rgba(232, 93, 66, 0.42);

  --semantic-success: #7CB890;
  --success-soft: rgba(124, 184, 144, 0.15);
  --semantic-warning: #D4A85A;
  --warning-soft: rgba(212, 168, 90, 0.14);
  --semantic-error: #D4726A;
  --semantic-error-soft: rgba(212, 114, 106, 0.15);
  --semantic-error-glow: rgba(212, 114, 106, 0.20);

  --border-subtle: rgba(255, 255, 255, 0.06);
  --border-default: rgba(255, 255, 255, 0.10);
  --border-strong: rgba(255, 255, 255, 0.16);

  --state-hover: rgba(255, 255, 255, 0.04);
  --state-pressed: rgba(255, 255, 255, 0.07);
  --scrim: rgba(7, 6, 9, 0.66);

  --shadow-lift: inset 0 1px 0 rgba(255, 255, 255, 0.04), 0 1px 2px rgba(0, 0, 0, 0.4);
  --shadow-float: 0 30px 80px rgba(0, 0, 0, 0.6), 0 4px 14px rgba(0, 0, 0, 0.4);

  color-scheme: dark;
}

/* Light theme */
[data-theme="light"] {
  --surface-base: #F8F6F3;
  --surface-elevated: #FFFFFF;
  --surface-overlay: #F0EDE8;
  --surface-subtle: #E8E4DE;
  --surface-well: #EFECE7;
  --surface-tile: #F1EEE9;

  --text-primary: #1A1816;
  --text-secondary: #6B665E;
  --text-tertiary: #8A857C;
  --text-on-accent: #FFFFFF;

  --accent-primary: #D14E35;
  --accent-secondary: #C4442D;
  --accent-ink: #C2432B;
  --accent-soft: rgba(209, 78, 53, 0.08);
  --accent-glow: rgba(209, 78, 53, 0.16);
  --accent-line: rgba(209, 78, 53, 0.35);

  --semantic-success: #3D8A5A;
  --success-soft: rgba(61, 138, 90, 0.10);
  --semantic-warning: #A67C1E;
  --warning-soft: rgba(166, 124, 30, 0.10);
  --semantic-error: #C4442D;
  --semantic-error-soft: rgba(196, 68, 45, 0.08);
  --semantic-error-glow: rgba(196, 68, 45, 0.12);

  --border-subtle: rgba(30, 20, 10, 0.07);
  --border-default: rgba(30, 20, 10, 0.11);
  --border-strong: rgba(30, 20, 10, 0.18);

  --state-hover: rgba(30, 20, 10, 0.035);
  --state-pressed: rgba(30, 20, 10, 0.06);
  --scrim: rgba(60, 50, 40, 0.28);

  --shadow-lift: 0 1px 2px rgba(40, 30, 20, 0.06), 0 0 0 1px rgba(30, 20, 10, 0.02);
  --shadow-float: 0 30px 80px rgba(40, 30, 20, 0.18), 0 4px 14px rgba(40, 30, 20, 0.08);

  color-scheme: light;
}

:root {
  /* Older names, kept as aliases of the two shadows */
  --shadow-sm: var(--shadow-lift);
  --shadow-md: var(--shadow-lift);
  --shadow-lg: var(--shadow-float);
  --shadow-xl: var(--shadow-float);
  --shadow-card-hover: var(--shadow-lift);
  --shadow-glow: 0 0 20px var(--accent-glow);

  /* Spacing */
  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-3: 0.75rem;
  --space-4: 1rem;
  --space-5: 1.5rem;
  --space-6: 2rem;
  --space-8: 3rem;

  /* Radius, by hierarchy */
  --radius-sm: 8px;
  --radius-md: 11px;
  --radius-lg: 16px;
  --radius-xl: 22px;
  --radius-full: 9999px;

  /* Control heights */
  --control-sm: 28px;
  --control-md: 34px;
  --control-lg: 42px;

  /* Typography */
  --font-body: "Instrument Sans", system-ui, -apple-system, "Segoe UI", sans-serif;
  --font-display: "Instrument Sans Condensed", "Instrument Sans", system-ui, sans-serif;
  --font-mono: ui-monospace, "SF Mono", Menlo, monospace;

  --text-2xs: 11px;
  --text-xs: 12px;
  --text-sm: 13px;
  --text-base: 14px;
  --text-md: 16px;
  --text-lg: 20px;
  --text-xl: 26px;
  --text-display: 46px;

  /* Motion */
  --duration-fast: 150ms;
  --duration-normal: 220ms;
  --duration-slow: 400ms;
  --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
  --ease-in-out: cubic-bezier(0.65, 0, 0.35, 1);
  --ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
  --ease-smooth: cubic-bezier(0.25, 0.1, 0.25, 1);
}
```

- [ ] **Step 5: Trim `src/newtab/app.css` to layout**

Replace everything from the top of `src/newtab/app.css` down to (and including) the closing `}` of the `:root { ... --sidebar-transition ... }` block with:

```css
/* =================================================================
   TABALA - New tab: layout variables and globals
   Tokens live in src/shared/styles/tokens.css.
   ================================================================= */

@import '../shared/styles/tokens.css';

:root {
  /* Layout - Column system */
  --column-width: 300px;
  --column-min-width: 280px;
  --column-max-width: 340px;
  --column-gap: 22px;

  /* Tabs panel */
  --sidebar-width: 320px;
  --sidebar-transition: var(--duration-normal) var(--ease-out);
}
```

In the same file, in the `html, body` rule, change `font-size: 14px;` to `font-size: var(--text-base);`. Delete the `.font-mono` utility line.

- [ ] **Step 6: Trim `src/popup/app.css`**

Replace the whole file with:

```css
@import '../shared/styles/tokens.css';

:root {
  /* The popup keeps a smaller scale (spec §13) */
  --text-2xs: 10px;
  --text-xs: 11px;
  --text-sm: 12px;
  --text-base: 13px;
  --text-md: 14px;
  --duration-normal: 200ms;
  --duration-slow: 300ms;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  padding: 0;
  font-family: var(--font-body);
  font-size: var(--text-base);
  line-height: 1.4;
  color: var(--text-primary);
  background-color: var(--surface-base);
  -webkit-font-smoothing: antialiased;
}

::selection {
  background: var(--accent-soft);
  color: var(--text-primary);
}

:focus-visible {
  outline: 2px solid var(--accent-primary);
  outline-offset: 2px;
}
```

- [ ] **Step 7: Run the token test**

Run: `docker compose run --rm app npx vitest run src/test/styles/tokens.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 8: Run the suite, lint and the size gate**

```bash
make test
make lint
make build && docker compose run --rm -T app du -sb dist
```

Expected: all tests pass; lint shows only the 12 old errors; `du -sb dist` prints at most 573440 (about 493000: the fonts and license add ~45 KB).

- [ ] **Step 9: Look at it**

Run `make preview`, capture the board at 1440×900 in both themes with the stub (see `scripts/preview/README.md`), and compare with the screenshots of the current main. Expected: the Instrument Sans shows everywhere; sizes are slightly tighter (the scale moved: `--text-sm` 14→13, `--text-base` 16→14, `--text-md` 20→16). Nothing overlaps. `make preview-stop`.

- [ ] **Step 10: Commit**

```bash
git add scripts/fonts/subset-instrument-sans.sh public/fonts/instrument-sans.woff2 public/fonts/instrument-sans-condensed.woff2 public/fonts/OFL.txt src/shared/styles/tokens.css src/newtab/app.css src/popup/app.css src/test/styles/tokens.test.ts
git commit -m "feat(ui): design tokens by role and the local Instrument Sans (two subset files, OFL)

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

### Task 3: Icons and the basic primitives

**Files:**
- Create: `src/shared/components/ui/icons.ts`, `Icon.svelte`, `Button.svelte`, `IconButton.svelte`, `Kbd.svelte`, `LinkTile.svelte`, `ProgressRing.svelte`, `src/shared/platform.ts`
- Test: `src/test/components/ui/primitives.test.ts`, `src/test/components/ui/ButtonHarness.svelte`

**Interfaces:**
- Produces:
  - `type IconName` and `ICONS: Record<IconName, IconShape[]>` from `icons.ts`; `<Icon name size? stroke?>`.
  - `<Button variant?: 'primary'|'secondary'|'quiet'|'danger' size?: 'sm'|'md' icon?: IconName|null type?: 'button'|'submit' disabled?>` with a default slot; forwards `on:click`.
  - `<IconButton icon label size?: 'sm'|'md' pressed? expanded? tone?: 'default'|'success'|'danger'>`; forwards `on:click`; `aria-label` and `title` are `label`.
  - `<Kbd>` with a default slot.
  - `<LinkTile link: { favicon?: string } size?: 32|36|56 tint?: string>`.
  - `<ProgressRing value size? stroke?>`.
  - `modLabel(): string` ('⌘' on Mac, 'Ctrl' elsewhere) and `altLabel(): string` ('⌥' or 'Alt') from `src/shared/platform.ts`.

- [ ] **Step 1: Write the failing tests**

`src/test/components/ui/ButtonHarness.svelte`:

```svelte
<script lang="ts">
  import Button from '@/shared/components/ui/Button.svelte';
  import type { IconName } from '@/shared/components/ui/icons';

  export let label = 'Salvar';
  export let variant: 'primary' | 'secondary' | 'quiet' | 'danger' = 'secondary';
  export let disabled = false;
  export let icon: IconName | null = null;
</script>

<Button {variant} {disabled} {icon} on:click>{label}</Button>
```

`src/test/components/ui/primitives.test.ts`:

```ts
/**
 * Shared primitives of spec §4.5–4.6.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import Icon from '@/shared/components/ui/Icon.svelte';
import IconButton from '@/shared/components/ui/IconButton.svelte';
import Kbd from '@/shared/components/ui/Kbd.svelte';
import LinkTile from '@/shared/components/ui/LinkTile.svelte';
import ProgressRing from '@/shared/components/ui/ProgressRing.svelte';
import { ICONS } from '@/shared/components/ui/icons';
import { altLabel, modLabel } from '@/shared/platform';
import ButtonHarness from './ButtonHarness.svelte';

describe('Icon', () => {
  it('draws the paths of its name and hides itself from assistive tech', () => {
    const { container } = render(Icon, { props: { name: 'check', size: 20 } });
    const svg = container.querySelector('svg') as SVGElement;

    expect(svg).toHaveAttribute('aria-hidden', 'true');
    expect(svg).toHaveAttribute('width', '20');
    expect(svg.querySelectorAll('path')).toHaveLength(ICONS.check.length);
  });

  it('fills the shapes marked as filled', () => {
    const { container } = render(Icon, { props: { name: 'more' } });
    expect(container.querySelector('path')).toHaveAttribute('fill', 'currentColor');
  });
});

describe('Button', () => {
  it('shows its text and variant, and reports clicks', async () => {
    const click = vi.fn();
    render(ButtonHarness, { props: { label: 'Concluir', variant: 'primary' }, events: { click } });
    const button = screen.getByRole('button', { name: 'Concluir' });

    await fireEvent.click(button);

    expect(button).toHaveClass('primary');
    expect(button).toHaveAttribute('type', 'button');
    expect(click).toHaveBeenCalledTimes(1);
  });

  it('draws its icon before the text', () => {
    render(ButtonHarness, { props: { label: 'Concluir', icon: 'check' } });
    expect(screen.getByRole('button', { name: 'Concluir' }).querySelector('svg')).not.toBeNull();
  });

  it('does not report clicks while disabled', async () => {
    const click = vi.fn();
    render(ButtonHarness, { props: { disabled: true }, events: { click } });

    await fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(click).not.toHaveBeenCalled();
  });
});

describe('IconButton', () => {
  it('is named by its label and reports clicks', async () => {
    const click = vi.fn();
    render(IconButton, { props: { icon: 'more', label: 'Mais ações', expanded: false }, events: { click } });
    const button = screen.getByRole('button', { name: 'Mais ações' });

    await fireEvent.click(button);

    expect(button).toHaveAttribute('title', 'Mais ações');
    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(click).toHaveBeenCalledTimes(1);
  });

  it('can be a toggle', () => {
    render(IconButton, { props: { icon: 'pin', label: 'Fixar', pressed: true } });
    expect(screen.getByRole('button', { name: 'Fixar' })).toHaveAttribute('aria-pressed', 'true');
  });
});

describe('Kbd', () => {
  it('renders a key', () => {
    const { container } = render(Kbd);
    expect(container.querySelector('kbd')).not.toBeNull();
  });
});

describe('LinkTile', () => {
  it('shows the favicon', () => {
    const { container } = render(LinkTile, { props: { link: { favicon: 'https://example.com/f.png' }, size: 36 } });
    expect(container.querySelector('img')).toHaveAttribute('src', 'https://example.com/f.png');
  });

  it('shows the globe without a favicon', () => {
    const { container } = render(LinkTile, { props: { link: {} } });
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('svg')).not.toBeNull();
  });

  it('falls back to the globe when the favicon fails to load', async () => {
    const { container } = render(LinkTile, { props: { link: { favicon: 'https://example.com/broken.png' } } });

    await fireEvent.error(container.querySelector('img') as HTMLImageElement);

    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('svg')).not.toBeNull();
  });
});

describe('ProgressRing', () => {
  it('draws only the track at zero', () => {
    const { container } = render(ProgressRing, { props: { value: 0, size: 40, stroke: 4 } });
    expect(container.querySelectorAll('circle')).toHaveLength(1);
  });

  it('draws the value as a share of the circumference', () => {
    const { container } = render(ProgressRing, { props: { value: 0.5, size: 40, stroke: 4 } });
    const value = container.querySelectorAll('circle')[1];
    const circumference = 2 * Math.PI * 18;

    expect(Number(value.getAttribute('stroke-dashoffset'))).toBeCloseTo(circumference / 2, 3);
  });

  it('clamps values above one', () => {
    const { container } = render(ProgressRing, { props: { value: 3, size: 40, stroke: 4 } });
    expect(Number(container.querySelectorAll('circle')[1].getAttribute('stroke-dashoffset'))).toBeCloseTo(0, 5);
  });
});

describe('platform labels', () => {
  it('names the modifier keys of the platform', () => {
    const platform = vi.spyOn(navigator, 'platform', 'get');
    platform.mockReturnValue('MacIntel');
    expect([modLabel(), altLabel()]).toEqual(['⌘', '⌥']);
    platform.mockReturnValue('Win32');
    expect([modLabel(), altLabel()]).toEqual(['Ctrl', 'Alt']);
    platform.mockRestore();
  });
});
```

- [ ] **Step 2: Run them to see them fail**

Run: `docker compose run --rm app npx vitest run src/test/components/ui/primitives.test.ts`
Expected: FAIL — cannot resolve `@/shared/components/ui/Icon.svelte`.

- [ ] **Step 3: Write `icons.ts`**

`src/shared/components/ui/icons.ts`:

```ts
/**
 * Icon shapes on a 24×24 grid, stroke 2, round caps (spec §4.5).
 * A shape with `fill` is filled instead of stroked.
 */
export interface IconShape {
  d: string;
  fill?: boolean;
}

function circle(cx: number, cy: number, r: number): string {
  return `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0`;
}

const GEAR = 'M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z';

export const ICONS = {
  check: [{ d: 'M20 6 9 17l-5-5' }],
  close: [{ d: 'M18 6 6 18' }, { d: 'm6 6 12 12' }],
  clock: [{ d: circle(12, 12, 9) }, { d: 'M12 7v5l3 2' }],
  more: [{ d: circle(5, 12, 1.6), fill: true }, { d: circle(12, 12, 1.6), fill: true }, { d: circle(19, 12, 1.6), fill: true }],
  'chevron-down': [{ d: 'm6 9 6 6 6-6' }],
  'chevron-right': [{ d: 'm9 6 6 6-6 6' }],
  target: [{ d: circle(12, 12, 9) }, { d: circle(12, 12, 5) }, { d: circle(12, 12, 1.3), fill: true }],
  search: [{ d: circle(11, 11, 7) }, { d: 'm20 20-3.5-3.5' }],
  board: [
    { d: 'M4.5 4h2A1.5 1.5 0 0 1 8 5.5v13A1.5 1.5 0 0 1 6.5 20h-2A1.5 1.5 0 0 1 3 18.5v-13A1.5 1.5 0 0 1 4.5 4Z' },
    { d: 'M11.5 4h2A1.5 1.5 0 0 1 15 5.5v8a1.5 1.5 0 0 1-1.5 1.5h-2a1.5 1.5 0 0 1-1.5-1.5v-8A1.5 1.5 0 0 1 11.5 4Z' },
    { d: 'M18.5 4h1A1.5 1.5 0 0 1 21 5.5v4a1.5 1.5 0 0 1-1.5 1.5h-1A1.5 1.5 0 0 1 17 9.5v-4A1.5 1.5 0 0 1 18.5 4Z' },
  ],
  tabs: [{ d: 'M3 9h18v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1Z' }, { d: 'M3 9V6a2 2 0 0 1 2-2h5l2 5' }],
  gear: [{ d: circle(12, 12, 3) }, { d: GEAR }],
  plus: [{ d: 'M12 5v14M5 12h14' }],
  external: [{ d: 'M14 4h6v6' }, { d: 'M20 4l-9 9' }, { d: 'M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5' }],
  play: [{ d: 'M6 5h12a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V8a3 3 0 0 1 3-3Z' }, { d: 'm10 9 5 3-5 3Z', fill: true }],
  paper: [{ d: 'M6 3h8l4 4v14H6Z' }, { d: 'M9 12h6M9 16h6' }],
  chat: [{ d: 'M4 5h16v11H9l-5 4Z' }],
  page: [{ d: 'M6 4h12a3 3 0 0 1 3 3v10a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3Z' }, { d: 'M3 9h18' }],
  code: [{ d: 'm8 7-5 5 5 5' }, { d: 'm16 7 5 5-5 5' }],
  docs: [{ d: 'M4 19.5A2.5 2.5 0 0 1 6.5 17H20' }, { d: 'M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z' }],
  repo: [{ d: 'M6 4h11a1 1 0 0 1 1 1v13H7a2 2 0 0 0 0 4h11' }, { d: 'M6 4v16' }],
  reference: [{ d: 'M6 3h12v18l-6-4-6 4Z' }],
  pin: [{ d: 'M9 4h6l-1 6 4 4H6l4-4-1-6Z' }, { d: 'M12 14v6' }],
  'pin-filled': [{ d: 'M9 4h6l-1 6 4 4H6l4-4-1-6Z', fill: true }, { d: 'M12 14v6' }],
  trash: [{ d: 'M4 7h16' }, { d: 'M9 7V4h6v3' }, { d: 'm7 7 1 13h8l1-13' }],
  keep: [{ d: 'M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z' }],
  move: [{ d: 'M4 12h14' }, { d: 'm14 7 5 5-5 5' }],
  eye: [{ d: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z' }, { d: circle(12, 12, 3) }],
  alert: [{ d: circle(12, 12, 9) }, { d: 'M12 7.5v5.5' }, { d: 'M12 16.5v.01' }],
  sun: [{ d: circle(12, 12, 4) }, { d: 'M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4' }],
  moon: [{ d: 'M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z' }],
  folder: [{ d: 'M3 6a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z' }],
  enter: [{ d: 'M20 5v7a3 3 0 0 1-3 3H5' }, { d: 'm9 11-4 4 4 4' }],
  undo: [{ d: 'M9 14 4 9l5-5' }, { d: 'M4 9h11a5 5 0 0 1 0 10h-3' }],
  globe: [{ d: circle(12, 12, 9) }, { d: 'M3 12h18' }, { d: 'M12 3a14 14 0 0 1 0 18a14 14 0 0 1 0-18Z' }],
  download: [{ d: 'M12 4v11' }, { d: 'm7 10 5 5 5-5' }, { d: 'M4 19h16' }],
  upload: [{ d: 'M12 15V4' }, { d: 'm7 9 5-5 5 5' }, { d: 'M4 19h16' }],
  logo: [
    { d: 'M6.5 6h11a1.5 1.5 0 0 1 0 3h-11a1.5 1.5 0 0 1 0-3Z', fill: true },
    { d: 'M6.5 11h7a1.5 1.5 0 0 1 0 3h-7a1.5 1.5 0 0 1 0-3Z', fill: true },
    { d: 'M6.5 16h3a1.5 1.5 0 0 1 0 3h-3a1.5 1.5 0 0 1 0-3Z', fill: true },
  ],
} satisfies Record<string, IconShape[]>;

export type IconName = keyof typeof ICONS;
```

- [ ] **Step 4: Write the components**

`src/shared/components/ui/Icon.svelte`:

```svelte
<script lang="ts">
  import { ICONS, type IconName } from './icons';

  export let name: IconName;
  export let size = 16;
  /** Stroke width on the 24-unit grid. */
  export let stroke = 2;
</script>

<svg class="icon" width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
  {#each ICONS[name] as shape (shape.d)}
    <path
      d={shape.d}
      fill={shape.fill === true ? 'currentColor' : 'none'}
      stroke={shape.fill === true ? 'none' : 'currentColor'}
      stroke-width={stroke}
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  {/each}
</svg>

<style>
  .icon {
    display: block;
    flex-shrink: 0;
  }
</style>
```

`src/shared/components/ui/Button.svelte`:

```svelte
<script lang="ts">
  import Icon from './Icon.svelte';
  import type { IconName } from './icons';

  export let variant: 'primary' | 'secondary' | 'quiet' | 'danger' = 'secondary';
  export let size: 'sm' | 'md' = 'md';
  export let icon: IconName | null = null;
  export let type: 'button' | 'submit' = 'button';
  export let disabled = false;
</script>

<button {type} class="btn {variant} {size}" {disabled} on:click on:mousedown {...$$restProps}>
  {#if icon !== null}
    <Icon name={icon} size={size === 'sm' ? 14 : 15} />
  {/if}
  <slot />
</button>

<style>
  .btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    height: var(--control-md);
    padding: 0 13px;
    border: 1px solid var(--border-default);
    border-radius: var(--radius-md);
    background: transparent;
    color: var(--text-primary);
    font: 500 var(--text-sm) / 1 var(--font-body);
    white-space: nowrap;
    cursor: pointer;
    transition:
      background-color var(--duration-fast) var(--ease-out),
      border-color var(--duration-fast) var(--ease-out),
      color var(--duration-fast) var(--ease-out);
  }

  .btn:hover:not(:disabled) {
    background: var(--state-hover);
    border-color: var(--border-strong);
  }

  .btn:active:not(:disabled) {
    background: var(--state-pressed);
  }

  .btn:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }

  .sm {
    gap: 6px;
    height: var(--control-sm);
    padding: 0 10px;
    border-radius: var(--radius-sm);
    font-size: var(--text-xs);
  }

  .primary {
    border-color: transparent;
    background: var(--accent-primary);
    color: var(--text-on-accent);
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.18), 0 6px 16px -6px var(--accent-glow);
  }

  .primary:hover:not(:disabled) {
    border-color: transparent;
    background: var(--accent-secondary);
  }

  .quiet {
    border-color: transparent;
    color: var(--text-secondary);
  }

  .quiet:hover:not(:disabled) {
    border-color: transparent;
    color: var(--text-primary);
  }

  .danger {
    border-color: transparent;
    background: var(--semantic-error);
    color: var(--text-on-accent);
  }

  .danger:hover:not(:disabled) {
    border-color: transparent;
    background: var(--semantic-error);
    filter: brightness(0.92);
  }
</style>
```

`src/shared/components/ui/IconButton.svelte`:

```svelte
<script lang="ts">
  import Icon from './Icon.svelte';
  import type { IconName } from './icons';

  export let icon: IconName;
  /** Accessible name and tooltip. */
  export let label: string;
  export let size: 'sm' | 'md' = 'md';
  export let pressed: boolean | undefined = undefined;
  export let expanded: boolean | undefined = undefined;
  export let tone: 'default' | 'success' | 'danger' = 'default';
</script>

<button
  type="button"
  class="icon-btn {size} {tone}"
  aria-label={label}
  title={label}
  aria-pressed={pressed}
  aria-expanded={expanded}
  on:click
  {...$$restProps}
>
  <Icon name={icon} size={size === 'sm' ? 15 : 17} />
</button>

<style>
  .icon-btn {
    display: inline-grid;
    place-items: center;
    width: var(--control-md);
    height: var(--control-md);
    padding: 0;
    border: 1px solid transparent;
    border-radius: var(--radius-md);
    background: transparent;
    color: var(--text-secondary);
    cursor: pointer;
    transition:
      background-color var(--duration-fast) var(--ease-out),
      color var(--duration-fast) var(--ease-out);
  }

  .sm {
    width: var(--control-sm);
    height: var(--control-sm);
    border-radius: var(--radius-sm);
  }

  .icon-btn:hover {
    background: var(--state-hover);
    color: var(--text-primary);
  }

  .icon-btn[aria-pressed='true'],
  .icon-btn[aria-expanded='true'] {
    color: var(--accent-primary);
  }

  .success:hover {
    color: var(--semantic-success);
  }

  .danger:hover {
    color: var(--semantic-error);
  }
</style>
```

`src/shared/components/ui/Kbd.svelte`:

```svelte
<kbd class="kbd"><slot /></kbd>

<style>
  .kbd {
    display: inline-grid;
    place-items: center;
    min-width: 20px;
    height: 20px;
    padding: 0 5px;
    border: 1px solid var(--border-default);
    border-bottom-width: 2px;
    border-radius: 5px;
    background: var(--surface-overlay);
    color: var(--text-secondary);
    font: 600 var(--text-2xs) / 1 var(--font-body);
  }
</style>
```

`src/shared/components/ui/LinkTile.svelte`:

```svelte
<script lang="ts">
  import Icon from './Icon.svelte';

  export let link: { favicon?: string };
  export let size: 32 | 36 | 56 = 36;
  /** Collection color that tints the tile. */
  export let tint: string | undefined = undefined;

  /** A favicon that failed to load; a new one is tried again. */
  let failed: string | undefined;

  $: src = link.favicon !== undefined && link.favicon !== failed ? link.favicon : undefined;
  $: glyph = size === 56 ? 26 : size === 36 ? 18 : 17;
</script>

<span class="tile" class:tinted={tint !== undefined} style:--tile-size="{size}px" style:--tint={tint}>
  {#if src !== undefined}
    <img {src} alt="" width={glyph} height={glyph} loading="lazy" on:error={() => (failed = src)} />
  {:else}
    <Icon name="globe" size={glyph} />
  {/if}
</span>

<style>
  .tile {
    display: grid;
    place-items: center;
    flex-shrink: 0;
    width: var(--tile-size);
    height: var(--tile-size);
    border-radius: calc(var(--tile-size) * 0.28);
    background: var(--surface-tile);
    color: var(--text-tertiary);
  }

  .tinted {
    background: color-mix(in srgb, var(--tint) 20%, var(--surface-tile));
  }

  img {
    border-radius: 4px;
    object-fit: contain;
  }
</style>
```

`src/shared/components/ui/ProgressRing.svelte`:

```svelte
<script lang="ts">
  /** Share done, 0–1 (clamped). */
  export let value: number;
  export let size = 104;
  export let stroke = 3;

  $: radius = (size - stroke) / 2;
  $: circumference = 2 * Math.PI * radius;
  $: done = Math.min(1, Math.max(0, value));
</script>

<svg class="ring" width={size} height={size} viewBox="0 0 {size} {size}" aria-hidden="true">
  <circle class="track" cx={size / 2} cy={size / 2} r={radius} fill="none" stroke-width={stroke} />
  {#if done > 0}
    <circle
      class="value"
      cx={size / 2}
      cy={size / 2}
      r={radius}
      fill="none"
      stroke-width={stroke}
      stroke-linecap="round"
      stroke-dasharray={circumference}
      stroke-dashoffset={circumference * (1 - done)}
    />
  {/if}
</svg>

<style>
  .ring {
    display: block;
    transform: rotate(-90deg);
  }

  .track {
    stroke: var(--border-default);
  }

  .value {
    stroke: var(--accent-primary);
    transition: stroke-dashoffset var(--duration-normal) var(--ease-out);
  }
</style>
```

`src/shared/platform.ts`:

```ts
/** Key names of the platform, for keyboard hints. */
function isMac(): boolean {
  return typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);
}

export function modLabel(): string {
  return isMac() ? '⌘' : 'Ctrl';
}

export function altLabel(): string {
  return isMac() ? '⌥' : 'Alt';
}
```

- [ ] **Step 5: Run the tests**

Run: `docker compose run --rm app npx vitest run src/test/components/ui/primitives.test.ts`
Expected: PASS (15 tests).

- [ ] **Step 6: Run the suite and lint**

Run: `make test && make lint`
Expected: all tests pass; lint shows only the 12 old errors.

- [ ] **Step 7: Commit**

```bash
git add src/shared/components/ui/icons.ts src/shared/components/ui/Icon.svelte src/shared/components/ui/Button.svelte src/shared/components/ui/IconButton.svelte src/shared/components/ui/Kbd.svelte src/shared/components/ui/LinkTile.svelte src/shared/components/ui/ProgressRing.svelte src/shared/platform.ts src/test/components/ui/primitives.test.ts src/test/components/ui/ButtonHarness.svelte
git commit -m "feat(ui): icons and basic primitives (button, icon button, key, link tile, progress ring)

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

### Task 4: Menu and segmented control

**Files:**
- Create: `src/shared/components/ui/Menu.svelte`, `src/shared/components/ui/MenuItem.svelte`, `src/shared/components/ui/Segmented.svelte`
- Test: `src/test/components/ui/menu.test.ts`, `src/test/components/ui/MenuHarness.svelte`

**Interfaces:**
- Consumes: `Icon`, `IconName` (Task 3).
- Produces:
  - `<Menu label align?: 'start'|'end' anchor?: HTMLElement>` with a default slot of `MenuItem`s; dispatches `close` on a click outside (the anchor counts as inside), Escape (then focuses the anchor) and Tab; ↑↓ move between items; the first item gets focus on open. Positioned `absolute` under its parent, so the parent must be `position: relative`.
  - `<MenuItem icon?: IconName|null danger? disabled?>` with a default slot and an optional `hint` slot; dispatches `select`; `role="menuitem"`.
  - `<Segmented label options: { value: string|number; label: string }[] value>`; dispatches `change` with the value; `role="radiogroup"` with `role="radio"` buttons; ← → move and select.

- [ ] **Step 1: Write the failing tests**

`src/test/components/ui/MenuHarness.svelte`:

```svelte
<script lang="ts">
  import Menu from '@/shared/components/ui/Menu.svelte';
  import MenuItem from '@/shared/components/ui/MenuItem.svelte';

  let open = false;
  let anchor: HTMLDivElement;
</script>

<div class="anchor" bind:this={anchor}>
  <button type="button" on:click={() => (open = !open)}>Abrir menu</button>
  {#if open}
    <Menu label="Ações" {anchor} on:close={() => (open = false)}>
      <MenuItem icon="clock" on:select>Amanhã</MenuItem>
      <MenuItem danger on:select>Descartar</MenuItem>
    </Menu>
  {/if}
</div>
<button type="button">Fora</button>
```

`src/test/components/ui/menu.test.ts`:

```ts
/**
 * Menu and segmented control (spec §4.6).
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import { tick } from 'svelte';
import Segmented from '@/shared/components/ui/Segmented.svelte';
import MenuHarness from './MenuHarness.svelte';

async function openMenu(): Promise<void> {
  await fireEvent.click(screen.getByRole('button', { name: 'Abrir menu' }));
  await tick();
}

describe('Menu', () => {
  it('opens with focus on the first item and reports the chosen one', async () => {
    const select = vi.fn();
    render(MenuHarness, { events: { select } });
    await openMenu();

    expect(screen.getByRole('menu', { name: 'Ações' })).toBeInTheDocument();
    expect(document.activeElement).toBe(screen.getByRole('menuitem', { name: 'Amanhã' }));
    await fireEvent.click(screen.getByRole('menuitem', { name: 'Descartar' }));

    expect(select).toHaveBeenCalledTimes(1);
  });

  it('moves between items with the arrows', async () => {
    render(MenuHarness);
    await openMenu();

    await fireEvent.keyDown(screen.getByRole('menu'), { key: 'ArrowDown' });
    expect(document.activeElement).toBe(screen.getByRole('menuitem', { name: 'Descartar' }));
    await fireEvent.keyDown(screen.getByRole('menu'), { key: 'ArrowDown' });
    expect(document.activeElement).toBe(screen.getByRole('menuitem', { name: 'Amanhã' }));
  });

  it('closes with Escape and gives the focus back to its anchor', async () => {
    render(MenuHarness);
    await openMenu();

    await fireEvent.keyDown(screen.getByRole('menu'), { key: 'Escape' });

    expect(screen.queryByRole('menu')).toBeNull();
    expect((document.activeElement as HTMLElement).closest('.anchor')).not.toBeNull();
  });

  it('closes on a click outside, but not on a click on its anchor', async () => {
    render(MenuHarness);
    await openMenu();

    await fireEvent.mouseDown(screen.getByRole('button', { name: 'Abrir menu' }));
    expect(screen.getByRole('menu')).toBeInTheDocument();
    await fireEvent.mouseDown(screen.getByRole('button', { name: 'Fora' }));
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('marks dangerous items', async () => {
    render(MenuHarness);
    await openMenu();
    expect(screen.getByRole('menuitem', { name: 'Descartar' })).toHaveClass('danger');
  });
});

describe('Segmented', () => {
  const options = [{ value: 15, label: '15 min' }, { value: 30, label: '30 min' }, { value: 60, label: '60 min' }];

  it('is a radio group that reports the chosen value', async () => {
    const change = vi.fn();
    render(Segmented, { props: { label: 'Tempo', options, value: 30 }, events: { change } });

    expect(screen.getByRole('radiogroup', { name: 'Tempo' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: '30 min' })).toHaveAttribute('aria-checked', 'true');
    await fireEvent.click(screen.getByRole('radio', { name: '60 min' }));

    expect(change.mock.calls[0][0].detail).toBe(60);
  });

  it('moves with the arrow keys', async () => {
    const change = vi.fn();
    render(Segmented, { props: { label: 'Tempo', options, value: 30 }, events: { change } });

    await fireEvent.keyDown(screen.getByRole('radio', { name: '30 min' }), { key: 'ArrowRight' });
    await fireEvent.keyDown(screen.getByRole('radio', { name: '30 min' }), { key: 'ArrowLeft' });

    expect(change.mock.calls.map((call) => call[0].detail)).toEqual([60, 15]);
  });

  it('lets the first option take the focus when nothing is chosen', () => {
    render(Segmented, { props: { label: 'Tempo', options, value: null } });
    expect(screen.getByRole('radio', { name: '15 min' })).toHaveAttribute('tabindex', '0');
  });
});
```

- [ ] **Step 2: Run them to see them fail**

Run: `docker compose run --rm app npx vitest run src/test/components/ui/menu.test.ts`
Expected: FAIL — cannot resolve `Menu.svelte`.

- [ ] **Step 3: Write the components**

`src/shared/components/ui/Menu.svelte`:

```svelte
<script lang="ts">
  import { createEventDispatcher, onMount, tick } from 'svelte';

  export let label: string;
  export let align: 'start' | 'end' = 'start';
  /** The element that opened the menu: clicks on it do not count as outside. */
  export let anchor: HTMLElement | undefined = undefined;

  const dispatch = createEventDispatcher<{ close: void }>();
  let root: HTMLDivElement;

  function items(): HTMLElement[] {
    return [...root.querySelectorAll<HTMLElement>('[role="menuitem"]:not([disabled])')];
  }

  function focusAt(offset: number): void {
    const list = items();
    if (list.length === 0) {
      return;
    }
    const index = list.indexOf(document.activeElement as HTMLElement);
    list[(index + offset + list.length) % list.length].focus();
  }

  function close(returnFocus: boolean): void {
    dispatch('close');
    if (returnFocus) {
      anchor?.querySelector<HTMLElement>('button')?.focus();
    }
  }

  function handleKeydown(event: KeyboardEvent): void {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      focusAt(1);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      focusAt(-1);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      close(true);
    } else if (event.key === 'Tab') {
      close(false);
    }
  }

  function handleWindowMousedown(event: MouseEvent): void {
    const target = event.target as Node;
    if (!root.contains(target) && anchor?.contains(target) !== true) {
      close(false);
    }
  }

  onMount(async () => {
    await tick();
    items()[0]?.focus();
  });
</script>

<svelte:window on:mousedown={handleWindowMousedown} />

<div class="menu {align}" role="menu" aria-label={label} tabindex="-1" bind:this={root} on:keydown={handleKeydown}>
  <slot />
</div>

<style>
  .menu {
    position: absolute;
    top: calc(100% + 6px);
    z-index: 30;
    display: flex;
    flex-direction: column;
    min-width: 220px;
    padding: 4px;
    background: var(--surface-elevated);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-float);
  }

  .start {
    left: 0;
  }

  .end {
    right: 0;
  }

  .menu:focus {
    outline: none;
  }
</style>
```

`src/shared/components/ui/MenuItem.svelte`:

```svelte
<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import Icon from './Icon.svelte';
  import type { IconName } from './icons';

  export let icon: IconName | null = null;
  export let danger = false;
  export let disabled = false;

  const dispatch = createEventDispatcher<{ select: void }>();
</script>

<button
  type="button"
  role="menuitem"
  class="item"
  class:danger
  {disabled}
  tabindex="-1"
  on:click|stopPropagation={() => dispatch('select')}
>
  {#if icon !== null}
    <Icon name={icon} size={15} />
  {/if}
  <span class="label"><slot /></span>
  {#if $$slots.hint}
    <span class="hint"><slot name="hint" /></span>
  {/if}
</button>

<style>
  .item {
    display: flex;
    align-items: center;
    gap: 10px;
    height: var(--control-md);
    padding: 0 10px;
    border: none;
    border-radius: var(--radius-sm);
    background: transparent;
    color: var(--text-primary);
    font: 500 var(--text-sm) / 1 var(--font-body);
    text-align: left;
    cursor: pointer;
  }

  .item :global(svg) {
    color: var(--text-secondary);
  }

  .item:hover,
  .item:focus-visible {
    background: var(--state-hover);
    outline: none;
  }

  .item:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }

  .danger,
  .danger :global(svg) {
    color: var(--semantic-error);
  }

  .label {
    flex: 1;
  }

  .hint {
    display: inline-flex;
    gap: 3px;
    color: var(--text-tertiary);
  }
</style>
```

`src/shared/components/ui/Segmented.svelte`:

```svelte
<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  export let label: string;
  export let options: { value: string | number; label: string }[];
  export let value: string | number | null = null;

  const dispatch = createEventDispatcher<{ change: string | number }>();

  function handleKeydown(event: KeyboardEvent, index: number): void {
    const step = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
    if (step === 0) {
      return;
    }
    event.preventDefault();
    dispatch('change', options[(index + step + options.length) % options.length].value);
  }
</script>

<div class="segmented" role="radiogroup" aria-label={label}>
  {#each options as option, index (option.value)}
    <button
      type="button"
      role="radio"
      aria-checked={option.value === value}
      tabindex={option.value === value || (value === null && index === 0) ? 0 : -1}
      on:click={() => dispatch('change', option.value)}
      on:keydown={(event) => handleKeydown(event, index)}
    >{option.label}</button>
  {/each}
</div>

<style>
  .segmented {
    display: inline-flex;
    gap: 2px;
    padding: 3px;
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-md);
    background: var(--surface-well);
  }

  button {
    height: 30px;
    padding: 0 16px;
    border: none;
    border-radius: var(--radius-sm);
    background: transparent;
    color: var(--text-secondary);
    font: 550 var(--text-sm) / 1 var(--font-body);
    cursor: pointer;
  }

  button:hover {
    color: var(--text-primary);
  }

  button[aria-checked='true'] {
    background: var(--surface-overlay);
    color: var(--text-primary);
    box-shadow: var(--shadow-lift);
  }
</style>
```

- [ ] **Step 4: Run the tests**

Run: `docker compose run --rm app npx vitest run src/test/components/ui/menu.test.ts`
Expected: PASS (8 tests).

- [ ] **Step 5: Run the suite and lint**

Run: `make test && make lint`
Expected: all pass; only the 12 old lint errors.

- [ ] **Step 6: Commit**

```bash
git add src/shared/components/ui/Menu.svelte src/shared/components/ui/MenuItem.svelte src/shared/components/ui/Segmented.svelte src/test/components/ui/menu.test.ts src/test/components/ui/MenuHarness.svelte
git commit -m "feat(ui): menu with keyboard and click-outside, segmented control

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

### Task 5: Rail, header, tabs panel and the F shortcut

**Files:**
- Create: `src/newtab/header.ts`, `src/newtab/components/AppHeader.svelte`, `src/test/newtab/header.test.ts`, `src/test/components/AppHeader.test.ts`, `src/test/components/TabsSidebar.test.ts`, `src/test/components/TabsCountHarness.svelte`
- Modify: `src/newtab/components/WorkspaceRail.svelte`, `src/newtab/components/TabsSidebar.svelte`, `src/newtab/shortcuts.ts`, `src/newtab/App.svelte`, `src/test/components/WorkspaceRail.test.ts`, `src/test/newtab/shortcuts.test.ts`
- Delete: `src/newtab/components/QuickActionsBar.svelte`, `src/test/components/QuickActionsBar.test.ts`, `src/newtab/components/StatusBar.svelte`
- Locales: add `nav_board`, `header_nothing_pending`, `header_pending_links_one|many`, `header_pending_in_one|many`; set `search_open_placeholder`, `search_placeholder`, `newtab_new_collection`, `tabs_sidebar_title`; remove `statusbar_links_one`, `statusbar_links_many`, `statusbar_collections_one`, `statusbar_collections_many`, `statusbar_last_saved`

**Interfaces:**
- Consumes: `Icon`, `Button`, `Kbd`, `modLabel` (Task 3).
- Produces:
  - `pendingSummary(links: Link[], collections: Collection[]): PendingSummary` with `PendingSummary = { links: number; collections: number }`, from `src/newtab/header.ts`.
  - `<AppHeader title: string|null summary: PendingSummary|null>` with a named slot `session`; dispatches `openSearch`, `newCollection`.
  - `<WorkspaceRail view: 'board'|'focus' tabsOpen: boolean tabCount: number>`; dispatches `board`, `focus`, `toggleTabs`, `openSettings`, `error`, `success`. The prop `focusActive` is gone.
  - `<TabsSidebar bind:expanded bind:count>`; nothing renders while `expanded` is false, but the count keeps updating.
  - `dashboardShortcut(event, layerOpen: boolean): DashboardAction`, with `DashboardAction = 'openSearch' | 'closeLayer' | 'closeAll' | 'newCollection' | 'toggleSidebar' | 'toggleFocus' | null` (`closeSearch` is renamed `closeLayer`).

- [ ] **Step 1: Write the failing helper test**

`src/test/newtab/header.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { pendingSummary } from '@/newtab/header';
import { createMockCollection, createMockLink } from '../factories';

const inbox = createMockCollection({ id: 'inbox', name: 'Inbox', isDefault: true });
const reading = createMockCollection({ id: 'r', name: 'Leituras', workspaceId: 'general' });
const refs = createMockCollection({ id: 'refs', name: 'Referência', workspaceId: 'general', reference: true });

describe('pendingSummary', () => {
  it('counts pending links and the collections that hold them', () => {
    const links = [
      createMockLink({ id: 'a', collectionId: 'inbox' }),
      createMockLink({ id: 'b', collectionId: 'r' }),
      createMockLink({ id: 'c', collectionId: 'r', snoozedUntil: Date.now() + 86_400_000 }),
      createMockLink({ id: 'd', collectionId: 'r', completedAt: 1 }),
      createMockLink({ id: 'e', collectionId: 'r', reference: true }),
      createMockLink({ id: 'f', collectionId: 'refs' }),
      createMockLink({ id: 'g', collectionId: 'refs', reference: false }),
      createMockLink({ id: 'h', collectionId: 'elsewhere' }),
    ];

    expect(pendingSummary(links, [inbox, reading, refs])).toEqual({ links: 4, collections: 3 });
  });

  it('is zero with nothing pending', () => {
    expect(pendingSummary([], [inbox])).toEqual({ links: 0, collections: 0 });
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `docker compose run --rm app npx vitest run src/test/newtab/header.test.ts`
Expected: FAIL — cannot resolve `@/newtab/header`.

- [ ] **Step 3: Write the helper**

`src/newtab/header.ts`:

```ts
/** Numbers of the page header (spec §5.1). */
import type { Collection, Link } from '@/lib/types';
import { isReference } from '@/lib/recommend/state';

export interface PendingSummary {
  links: number;
  collections: number;
}

/** Links of the collections on screen that are neither completed nor reference; snoozed ones count. */
export function pendingSummary(links: Link[], collections: Collection[]): PendingSummary {
  const byId = new Map(collections.map((collection) => [collection.id, collection]));
  const pending = links.filter((link) => {
    const collection = byId.get(link.collectionId);
    return collection !== undefined && link.completedAt === undefined && !isReference(link, collection);
  });
  return { links: pending.length, collections: new Set(pending.map((link) => link.collectionId)).size };
}
```

- [ ] **Step 4: Run it**

Run: `docker compose run --rm app npx vitest run src/test/newtab/header.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Add and change the locale keys**

`.superpowers/sdd/2026-09-25-nova-interface/keys-5-add.json`:

```json
{
  "nav_board": { "en": "Board", "pt_BR": "Início" },
  "header_nothing_pending": { "en": "Nothing pending", "pt_BR": "Nada pendente" },
  "header_pending_links_one": { "en": "1 pending", "pt_BR": "1 pendente" },
  "header_pending_links_many": { "en": "$1 pending", "pt_BR": "$1 pendentes", "placeholders": { "count": "$1" } },
  "header_pending_in_one": { "en": "in 1 collection", "pt_BR": "em 1 coleção" },
  "header_pending_in_many": { "en": "in $1 collections", "pt_BR": "em $1 coleções", "placeholders": { "count": "$1" } }
}
```

`.superpowers/sdd/2026-09-25-nova-interface/keys-5-set.json`:

```json
{
  "search_open_placeholder": { "en": "Search links or type a command", "pt_BR": "Buscar links ou digitar um comando" },
  "search_placeholder": { "en": "Search links or type a command", "pt_BR": "Buscar links ou digitar um comando" },
  "newtab_new_collection": { "en": "New collection", "pt_BR": "Nova coleção" },
  "tabs_sidebar_title": { "en": "Open tabs", "pt_BR": "Abas abertas" }
}
```

```bash
docker compose run --rm app node scripts/i18n/keys.mjs add .superpowers/sdd/2026-09-25-nova-interface/keys-5-add.json
docker compose run --rm app node scripts/i18n/keys.mjs set .superpowers/sdd/2026-09-25-nova-interface/keys-5-set.json
```

Expected: both commands exit 0.

- [ ] **Step 6: Write the failing component tests**

`src/test/components/AppHeader.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import AppHeader from '@/newtab/components/AppHeader.svelte';

describe('AppHeader', () => {
  it('names the workspace and what is pending in it', () => {
    render(AppHeader, { props: { title: 'Geral', summary: { links: 17, collections: 5 } } });

    expect(screen.getByRole('heading', { name: 'Geral' })).toBeInTheDocument();
    expect(screen.getByText('header_pending_links_many header_pending_in_many')).toBeInTheDocument();
  });

  it('says when nothing is pending', () => {
    render(AppHeader, { props: { title: 'Geral', summary: { links: 0, collections: 0 } } });
    expect(screen.getByText('header_nothing_pending')).toBeInTheDocument();
  });

  it('opens the search and creates a collection', async () => {
    const openSearch = vi.fn();
    const newCollection = vi.fn();
    render(AppHeader, { props: { title: 'Geral', summary: null }, events: { openSearch, newCollection } });

    await fireEvent.click(screen.getByRole('button', { name: /search_open_placeholder/ }));
    await fireEvent.click(screen.getByRole('button', { name: 'newtab_new_collection' }));

    expect(openSearch).toHaveBeenCalledTimes(1);
    expect(newCollection).toHaveBeenCalledTimes(1);
  });

  it('shows only the search in Focus', () => {
    render(AppHeader, { props: { title: null, summary: null } });

    expect(screen.queryByRole('heading')).toBeNull();
    expect(screen.queryByRole('button', { name: 'newtab_new_collection' })).toBeNull();
    expect(screen.getByRole('button', { name: /search_open_placeholder/ })).toBeInTheDocument();
  });
});
```

`src/test/components/TabsCountHarness.svelte`:

```svelte
<script lang="ts">
  import TabsSidebar from '@/newtab/components/TabsSidebar.svelte';

  export let expanded = false;
  let count = 0;
</script>

<TabsSidebar bind:expanded bind:count />
<output>{count}</output>
```

`src/test/components/TabsSidebar.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/svelte';
import { chromeMock } from '../setup';
import TabsCountHarness from './TabsCountHarness.svelte';

const tab = (id: number): chrome.tabs.Tab =>
  ({ id, url: `https://example.com/${id}`, title: `Tab ${id}`, active: false, pinned: false, index: id, windowId: 1 }) as chrome.tabs.Tab;

describe('TabsSidebar', () => {
  it('counts the open tabs even while closed, and shows nothing then', async () => {
    chromeMock.tabs.query.mockResolvedValueOnce([tab(1), tab(2)]);
    render(TabsCountHarness, { props: { expanded: false } });

    await waitFor(() => expect(screen.getByText('2')).toBeInTheDocument());
    expect(screen.queryByText('tabs_sidebar_title')).toBeNull();
    expect(screen.queryByRole('button', { name: 'tabs_sidebar_open' })).toBeNull();
  });

  it('lists the tabs when open', async () => {
    chromeMock.tabs.query.mockResolvedValueOnce([tab(1)]);
    render(TabsCountHarness, { props: { expanded: true } });

    expect(await screen.findByText('Tab 1')).toBeInTheDocument();
  });
});
```

Replace the body of `src/test/components/WorkspaceRail.test.ts` from its first `it(` to the end of the `describe` with:

```ts
  it('opens Focus from its entry', async () => {
    const focus = vi.fn();
    render(WorkspaceRail, { props: { view: 'board' }, events: { focus } });

    await fireEvent.click(screen.getByRole('button', { name: 'focus_open' }));

    expect(focus).toHaveBeenCalledTimes(1);
  });

  it('marks the view on screen, and no workspace while Focus is open', () => {
    render(WorkspaceRail, { props: { view: 'focus' } });

    expect(screen.getByRole('button', { name: 'focus_open' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'nav_board' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: 'Trabalho' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('goes back to the board from its entry and from a workspace', async () => {
    const board = vi.fn();
    render(WorkspaceRail, { props: { view: 'focus' }, events: { board } });

    await fireEvent.click(screen.getByRole('button', { name: 'nav_board' }));
    await fireEvent.click(screen.getByRole('button', { name: 'Trabalho' }));

    expect(board).toHaveBeenCalledTimes(2);
  });

  it('opens the tabs panel with the count of open tabs, and the settings', async () => {
    const toggleTabs = vi.fn();
    const openSettings = vi.fn();
    render(WorkspaceRail, { props: { view: 'board', tabsOpen: false, tabCount: 7 }, events: { toggleTabs, openSettings } });
    const tabs = screen.getByRole('button', { name: 'tabs_sidebar_title' });

    expect(tabs).toHaveAttribute('aria-expanded', 'false');
    expect(tabs).toHaveTextContent('7');
    await fireEvent.click(tabs);
    await fireEvent.click(screen.getByRole('button', { name: 'popup_settings' }));

    expect(toggleTabs).toHaveBeenCalledTimes(1);
    expect(openSettings).toHaveBeenCalledTimes(1);
  });
```

(Keep the file's imports and its `beforeEach` that seeds the `Trabalho` workspace; add `vi` to the vitest import if it is missing.)

In `src/test/newtab/shortcuts.test.ts`, in the `dashboardShortcut` table: change `'closeSearch'` to `'closeLayer'` and the label to `'Esc closes the open layer, wherever the focus is'`, rename the `searchOpen` parameter to `layerOpen`, and add these rows before `'Cmd+N is left to the browser'`:

```ts
    ['f on the page toggles Focus', 'toggleFocus', false, keydown({ key: 'f' })],
    ['f typed in a field does nothing', null, false, keydown({ key: 'f' }, input)],
    ['Ctrl+F is left to the browser', null, false, keydown({ key: 'f', ctrlKey: true })],
    ['f does nothing while a layer is open', null, true, keydown({ key: 'f' })],
```

- [ ] **Step 7: Run them to see them fail**

Run: `docker compose run --rm app npx vitest run src/test/components/AppHeader.test.ts src/test/components/TabsSidebar.test.ts src/test/components/WorkspaceRail.test.ts src/test/newtab/shortcuts.test.ts`
Expected: FAIL — `AppHeader.svelte` does not exist; the rail has no `nav_board` button; `toggleFocus` is not returned; the closed sidebar still renders its open button.

- [ ] **Step 8: Write the header**

`src/newtab/components/AppHeader.svelte`:

```svelte
<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { plural, t } from '@/lib/i18n';
  import Button from '@/shared/components/ui/Button.svelte';
  import Icon from '@/shared/components/ui/Icon.svelte';
  import Kbd from '@/shared/components/ui/Kbd.svelte';
  import { modLabel } from '@/shared/platform';
  import type { PendingSummary } from '../header';

  /** Workspace name; null in Focus, where the header shows only the search. */
  export let title: string | null;
  export let summary: PendingSummary | null = null;

  const dispatch = createEventDispatcher<{ openSearch: void; newCollection: void }>();

  $: summaryText = summary === null
    ? ''
    : summary.links === 0
      ? t('header_nothing_pending')
      : `${plural(summary.links, 'header_pending_links_one', 'header_pending_links_many')} ${plural(summary.collections, 'header_pending_in_one', 'header_pending_in_many')}`;
</script>

<header class="app-header" class:compact={title === null}>
  {#if title !== null}
    <div class="where">
      <h1>{title}</h1>
      {#if summaryText !== ''}
        <p>{summaryText}</p>
      {/if}
    </div>
  {/if}

  <button type="button" class="search-trigger" on:click={() => dispatch('openSearch')}>
    <Icon name="search" size={17} />
    <span class="placeholder">{t('search_open_placeholder')}</span>
    <span class="keys" aria-hidden="true"><Kbd>{modLabel()}</Kbd><Kbd>K</Kbd></span>
  </button>

  <div class="actions">
    <slot name="session" />
    {#if title !== null}
      <Button variant="quiet" icon="plus" on:click={() => dispatch('newCollection')}>{t('newtab_new_collection')}</Button>
    {/if}
  </div>
</header>

<style>
  .app-header {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
    align-items: center;
    gap: var(--space-4);
    padding: 18px 32px 0;
    min-height: 62px;
  }

  .compact {
    grid-template-columns: auto minmax(0, 1fr);
  }

  .where h1 {
    margin: 0;
    font: 650 var(--text-xl) / 1 var(--font-body);
    letter-spacing: -0.015em;
    color: var(--text-primary);
  }

  .where p {
    margin: 6px 0 0;
    font-size: var(--text-xs);
    color: var(--text-tertiary);
  }

  .search-trigger {
    display: flex;
    align-items: center;
    gap: 10px;
    width: min(520px, 44vw);
    height: var(--control-lg);
    padding: 0 8px 0 14px;
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-md);
    background: var(--surface-elevated);
    box-shadow: var(--shadow-lift);
    color: var(--text-tertiary);
    font: 400 var(--text-base) / 1 var(--font-body);
    cursor: pointer;
    transition: border-color var(--duration-fast) var(--ease-out);
  }

  .search-trigger:hover {
    border-color: var(--border-strong);
  }

  .placeholder {
    flex: 1;
    text-align: left;
  }

  .keys {
    display: flex;
    gap: 3px;
  }

  .actions {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: var(--space-2);
  }
</style>
```

- [ ] **Step 9: Change the rail**

In `src/newtab/components/WorkspaceRail.svelte`:

1. Add the import `import Icon from '@/shared/components/ui/Icon.svelte';`.
2. Replace the `focus`/`board` part of the dispatcher type and the `focusActive` prop with:

```ts
  const dispatch = createEventDispatcher<{
    error: string;
    success: string;
    focus: void;
    board: void;
    toggleTabs: void;
    openSettings: void;
  }>();

  /** What the main area shows. */
  export let view: 'board' | 'focus' = 'board';
  /** The tabs panel is open. */
  export let tabsOpen = false;
  /** Open tabs in this window. */
  export let tabCount = 0;
```

3. Replace the markup from `<nav class="workspace-rail"` down to its closing `</nav>` with:

```svelte
<nav class="workspace-rail" aria-label={t('workspace_title')}>
  <span class="mark" aria-hidden="true"><Icon name="logo" size={18} /></span>

  <button
    type="button"
    class="nav"
    class:active={view === 'board'}
    aria-pressed={view === 'board'}
    aria-label={t('nav_board')}
    title={t('nav_board')}
    on:click={() => dispatch('board')}
  >
    <Icon name="board" size={20} />
  </button>
  <button
    type="button"
    class="nav"
    class:active={view === 'focus'}
    aria-pressed={view === 'focus'}
    aria-label={t('focus_open')}
    title={t('focus_title')}
    on:click={() => dispatch('focus')}
  >
    <Icon name="target" size={20} />
  </button>
  <button
    type="button"
    class="nav"
    class:active={tabsOpen}
    aria-expanded={tabsOpen}
    aria-label={t('tabs_sidebar_title')}
    title={t('tabs_sidebar_title')}
    on:click={() => dispatch('toggleTabs')}
  >
    <Icon name="tabs" size={20} />
    {#if tabCount > 0}
      <span class="badge" aria-hidden="true">{tabCount}</span>
    {/if}
  </button>

  <div class="rail-divider"></div>

  <div class="workspace-list">
    {#each workspaces as workspace, index (workspace.id)}
      <!-- svelte-ignore a11y-no-static-element-interactions -->
      <div
        class="workspace-slot"
        class:drag-over={dragOverIndex === index}
        animate:flip={{ duration: 200 }}
        on:dragover={(e) => handleDragOver(e, index)}
        on:dragleave={handleDragLeave}
        on:drop={(e) => handleDrop(e, index)}
        on:dragstart={(e) => handleDragStart(e, workspace)}
        on:dragend={handleDragEnd}
      >
        <WorkspaceRailItem
          {workspace}
          isActive={view === 'board' && activeWorkspaceId === workspace.id}
          on:select={handleSelectWorkspace}
          on:contextmenu={handleContextMenu}
        />
      </div>
    {/each}
  </div>

  <button
    type="button"
    class="add-workspace-btn"
    on:click={handleOpenCreateModal}
    aria-label={t('workspace_create_new')}
    disabled={isLimitReached}
    title={isLimitReached ? t('workspace_limit_reached') : t('workspace_create_new')}
  >
    <Icon name="plus" size={16} />
  </button>

  <span class="rail-spacer"></span>

  <button
    type="button"
    class="nav"
    aria-label={t('popup_settings')}
    title={t('popup_settings')}
    on:click={() => dispatch('openSettings')}
  >
    <Icon name="gear" size={20} />
  </button>
</nav>
```

4. In the `<style>` block, delete the `.focus-entry`, `.focus-entry:hover` and `.focus-entry.active` rules and add:

```css
  .mark {
    display: grid;
    place-items: center;
    width: 30px;
    height: 30px;
    margin: 4px 0 var(--space-3);
    border-radius: 9px;
    background: var(--accent-primary);
    color: var(--text-on-accent);
    box-shadow: 0 6px 16px -6px var(--accent-glow);
    flex-shrink: 0;
  }

  .nav {
    position: relative;
    display: grid;
    place-items: center;
    width: 40px;
    height: 40px;
    padding: 0;
    border: none;
    border-radius: 12px;
    background: transparent;
    color: var(--text-tertiary);
    cursor: pointer;
    flex-shrink: 0;
    transition:
      background-color var(--duration-fast) var(--ease-out),
      color var(--duration-fast) var(--ease-out);
  }

  .nav:hover {
    background: var(--state-hover);
    color: var(--text-primary);
  }

  .nav.active {
    background: var(--surface-overlay);
    color: var(--text-primary);
    box-shadow: var(--shadow-lift);
  }

  .badge {
    position: absolute;
    top: 4px;
    right: 2px;
    min-width: 16px;
    height: 16px;
    padding: 0 4px;
    border: 1px solid var(--border-default);
    border-radius: 8px;
    background: var(--surface-overlay);
    color: var(--text-secondary);
    font: 700 10px / 14px var(--font-body);
    text-align: center;
  }

  .rail-spacer {
    flex: 1;
  }
```

5. In the same block: `.workspace-rail` gets `width: 68px; min-width: 68px; padding: var(--space-4) var(--space-1) var(--space-3); gap: 6px; background: var(--surface-base);`; in `.workspace-list` replace `flex: 1;` with `flex: 0 1 auto;` and add `min-height: 0;`; in `.add-workspace-btn` change `border-radius: var(--radius-full);` to `border-radius: 11px;`, `background` to `transparent`, and delete its `transform: scale(1.1);` hover line and the matching reduced-motion rule.

- [ ] **Step 10: Change the tabs panel**

In `src/newtab/components/TabsSidebar.svelte`:

1. After `export let expanded = false;` add:

```ts
  /** Open tabs in this window, for the badge on the rail. */
  export let count = 0;
```

2. Replace `let totalTabs = 0;` and the `$: totalTabs = ...` statement with:

```ts
  $: count =
    organizedTabs.pinned.length +
    organizedTabs.ungrouped.length +
    Array.from(organizedTabs.groups.values()).reduce((sum, g) => sum + g.tabs.length, 0);
```

and replace every other `totalTabs` in the file with `count`.

3. Delete the `{:else}` branch that renders the `sidebar-collapsed` button (from `{:else}` to the line before `{/if}` closing the `{#if expanded}`), and its `.sidebar-collapsed`, `.sidebar-collapsed:*` and `.badge` style rules.

4. Replace the `.sidebar` and `.sidebar.expanded` rules with:

```css
  .sidebar {
    display: flex;
    flex-direction: column;
    width: 0;
    height: 100%;
    background: var(--surface-elevated);
    transition: width var(--sidebar-transition);
    flex-shrink: 0;
    overflow: hidden;
  }

  .sidebar.expanded {
    width: var(--sidebar-width);
    border-right: 1px solid var(--border-subtle);
  }
```

- [ ] **Step 11: Add F to the shortcuts**

In `src/newtab/shortcuts.ts`, replace the `DashboardAction` type and `dashboardShortcut` with:

```ts
export type DashboardAction =
  | 'openSearch'
  | 'closeLayer'
  | 'closeAll'
  | 'newCollection'
  | 'toggleSidebar'
  | 'toggleFocus'
  | null;

/**
 * Dashboard keyboard shortcuts. While a layer (search, triage) is open only
 * Esc acts, closing it, so single-letter shortcuts never fire under it.
 */
export function dashboardShortcut(event: KeyboardEvent, layerOpen: boolean): DashboardAction {
  if (layerOpen) {
    return event.key === 'Escape' ? 'closeLayer' : null;
  }
  if (opensSearch(event)) {
    return 'openSearch';
  }
  if (event.key === 'Escape') {
    return 'closeAll';
  }
  if (isEditable(event.target) || event.ctrlKey || event.metaKey || event.altKey) {
    return null;
  }
  if (event.key === 'n') {
    return 'newCollection';
  }
  if (event.key === 't') {
    return 'toggleSidebar';
  }
  return event.key === 'f' ? 'toggleFocus' : null;
}
```

- [ ] **Step 12: Wire the page**

In `src/newtab/App.svelte`:

1. Imports: delete `import QuickActionsBar from './components/QuickActionsBar.svelte';` and `import StatusBar from './components/StatusBar.svelte';`; change the i18n import to `import { t, getCollectionDisplayName, getWorkspaceDisplayName } from '@lib/i18n';`; add `import AppHeader from './components/AppHeader.svelte';` and `import { pendingSummary } from './header';`.
2. Replace `let sidebarExpanded = false;` with:

```ts
  let tabsOpen = false;
  /** Open tabs in this window, counted by the tabs panel for the rail badge. */
  let openTabs = 0;
```

3. Delete `$: boardLinks = links.filter((link) => link.completedAt === undefined);` (its only reader was the status bar) and add `$: summary = pendingSummary($linksStore.links, collections);`.
4. In `handleKeydown`, replace `action === 'closeSearch'` with `action === 'closeLayer'`, replace `sidebarExpanded = !sidebarExpanded;` with `tabsOpen = !tabsOpen;`, and add before the closing brace of the `if` chain:

```ts
    } else if (action === 'toggleFocus') {
      if (view === 'focus') {
        view = 'board';
      } else {
        void openFocus(null);
      }
```

5. Replace the `<WorkspaceRail ... />` and `<TabsSidebar ... />` elements with:

```svelte
  <WorkspaceRail
    {view}
    {tabsOpen}
    tabCount={openTabs}
    on:focus={() => openFocus(null)}
    on:board={() => (view = 'board')}
    on:toggleTabs={() => (tabsOpen = !tabsOpen)}
    on:openSettings={() => (showSettings = true)}
    on:error={(e) => errorMessage = e.detail}
    on:success={(e) => successMessage = e.detail}
  />

  <TabsSidebar
    bind:expanded={tabsOpen}
    bind:count={openTabs}
    on:createCollectionFromGroup={handleCreateCollectionFromGroup}
  />
```

6. Replace the `<QuickActionsBar ... />` element with:

```svelte
      <AppHeader
        title={view === 'board' ? (currentWorkspace !== undefined ? getWorkspaceDisplayName(currentWorkspace) : '') : null}
        summary={view === 'board' ? summary : null}
        on:openSearch={() => (showSearch = true)}
        on:newCollection={() => (showCreateCollection = true)}
      />
```

7. Delete the line `<StatusBar links={boardLinks} {collections} workspace={currentWorkspace} />`.

8. Nothing animates when the page loads (spec §4.4). In the `<style>` block: from `.dashboard` delete `opacity: 0;`, `transform: translateY(4px);` and its `transition`; delete the `.dashboard.mounted` rule; from `.main-content` delete the `animation`, `animation-delay` and `opacity: 0;` lines; delete `.dashboard.mounted .main-content` and `@keyframes contentFadeIn`. Keep the `class:mounted` attribute (harmless) or drop it together with the `mounted` variable and its `setTimeout`.

- [ ] **Step 13: Delete the replaced components and their keys**

```bash
git rm src/newtab/components/QuickActionsBar.svelte src/test/components/QuickActionsBar.test.ts src/newtab/components/StatusBar.svelte
docker compose run --rm app node scripts/i18n/keys.mjs remove statusbar_links_one statusbar_links_many statusbar_collections_one statusbar_collections_many statusbar_last_saved
```

Expected: both succeed. (`src/test/lib/i18n.test.ts` uses `statusbar_links_*` only as sample keys against the mock and keeps passing.)

- [ ] **Step 14: Run the tests of this task**

Run: `docker compose run --rm app npx vitest run src/test/components/AppHeader.test.ts src/test/components/TabsSidebar.test.ts src/test/components/WorkspaceRail.test.ts src/test/newtab/shortcuts.test.ts src/test/newtab/header.test.ts src/test/lib/locales.test.ts`
Expected: PASS.

- [ ] **Step 15: Suite, lint, and a look**

```bash
make test && make lint
make preview
```

Capture the board at 1440×900 and 1024×768, dark and light. Expected: the rail shows the mark, Início (active), Foco and Abas abertas with a count; the header shows "Geral", "N pendentes em M coleções", the centered search and "Nova coleção"; there is no status bar and no 52 px column. T opens and closes the tabs panel; F switches to Focus and back. `make preview-stop`.

- [ ] **Step 16: Commit**

```bash
git add src/newtab/header.ts src/newtab/components/AppHeader.svelte src/newtab/components/WorkspaceRail.svelte src/newtab/components/TabsSidebar.svelte src/newtab/shortcuts.ts src/newtab/App.svelte src/test/newtab/header.test.ts src/test/components/AppHeader.test.ts src/test/components/TabsSidebar.test.ts src/test/components/TabsCountHarness.svelte src/test/components/WorkspaceRail.test.ts src/test/newtab/shortcuts.test.ts public/_locales/en/messages.json public/_locales/pt_BR/messages.json
git commit -m "feat(newtab): rail with Board, Focus and open tabs; header with pending count; F toggles Focus; status bar and tabs column removed

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

### Task 6: The board card

**Files:**
- Create: `src/newtab/card-meta.ts`, `src/test/newtab/card-meta.test.ts`
- Modify: `src/newtab/components/LinkCard.svelte` (rewrite), `src/newtab/components/Column.svelte` (header, container, menu trigger, `metaOf` prop), `src/newtab/components/KanbanBoard.svelte` (`metaOf` prop), `src/newtab/App.svelte`, `src/test/components/LinkCard.test.ts`, `src/test/components/Column.test.ts`
- Locales: add `card_kind_effort`, `card_progress`, `card_triage_skipped`, `card_triage_snoozed`, `card_triage_revisited`, `card_triage_stale`; set `linkcard_snoozed_until`

**Interfaces:**
- Consumes: `LinkTile`, `IconButton`, `Icon`, `Menu`, `MenuItem` (Tasks 3–4); `activityOf`, `lastTouch`, `TriageReason` (`src/lib/recommend/triage.ts`); `daysBetween` (`src/lib/recommend/dates.ts`); `linkKind`, `LinkKind`; `KIND_LABEL_KEYS`.
- Produces:
  - `type CardMeta = { type: 'reference' } | { type: 'snoozed'; until: number } | { type: 'triage'; reason: TriageReason; days: number; snoozes: number } | { type: 'progress'; spent: number; effort: number } | { type: 'kind'; kind: LinkKind; effort: number }`.
  - `cardMeta(input: CardMetaInput): CardMeta` with `CardMetaInput = { link: Link; reference: boolean; snoozed: boolean; triage: TriageReason | undefined; activity: LinkActivity; kind: LinkKind; effort: number; now: number }`.
  - `KIND_ICONS: Record<LinkKind, IconName>` and `metaView(meta: CardMeta): { icon: IconName; text: string; tone: 'plain' | 'warning' | 'progress' }`.
  - `LinkCard` prop `meta: CardMeta | null`; `Column` and `KanbanBoard` prop `metaOf: ((link: Link) => CardMeta) | null`.

- [ ] **Step 1: Write the failing helper test**

`src/test/newtab/card-meta.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { cardMeta, metaView, type CardMetaInput } from '@/newtab/card-meta';
import { EMPTY_ACTIVITY } from '@/lib/types';
import { createMockLink } from '../factories';

const DAY = 86_400_000;
const now = new Date(2026, 8, 25, 10).getTime();
const base: CardMetaInput = {
  link: createMockLink({ id: 'l', createdAt: now - 10 * DAY }),
  reference: false,
  snoozed: false,
  triage: undefined,
  activity: EMPTY_ACTIVITY,
  kind: 'video',
  effort: 20,
  now,
};

describe('cardMeta', () => {
  it('follows the first rule that applies: reference, snoozed, triage, progress, kind', () => {
    const everything: CardMetaInput = {
      ...base,
      reference: true,
      snoozed: true,
      link: { ...base.link, snoozedUntil: now + DAY },
      triage: 'stale',
      activity: { ...EMPTY_ACTIVITY, activeMs: 5 * 60_000 },
    };

    expect(cardMeta(everything)).toEqual({ type: 'reference' });
    expect(cardMeta({ ...everything, reference: false })).toEqual({ type: 'snoozed', until: now + DAY });
    expect(cardMeta({ ...everything, reference: false, snoozed: false })).toMatchObject({ type: 'triage', reason: 'stale' });
    expect(cardMeta({ ...everything, reference: false, snoozed: false, triage: undefined }))
      .toEqual({ type: 'progress', spent: 5, effort: 20 });
    expect(cardMeta(base)).toEqual({ type: 'kind', kind: 'video', effort: 20 });
  });

  it('counts the days since the last touch and the snoozes for triage', () => {
    const meta = cardMeta({ ...base, triage: 'stale', activity: { ...EMPTY_ACTIVITY, snoozes: 3 } });
    expect(meta).toEqual({ type: 'triage', reason: 'stale', days: 10, snoozes: 3 });
  });

  it('ignores less than a minute of reading', () => {
    expect(cardMeta({ ...base, activity: { ...EMPTY_ACTIVITY, activeMs: 59_000 } }).type).toBe('kind');
  });
});

describe('metaView', () => {
  it('turns each meta into an icon, a text and a tone', () => {
    expect(metaView({ type: 'reference' })).toEqual({ icon: 'reference', text: 'linkcard_reference_badge', tone: 'plain' });
    expect(metaView({ type: 'snoozed', until: now })).toEqual({ icon: 'clock', text: 'linkcard_snoozed_until', tone: 'plain' });
    expect(metaView({ type: 'triage', reason: 'stale', days: 75, snoozes: 0 })).toEqual({ icon: 'alert', text: 'card_triage_stale', tone: 'warning' });
    expect(metaView({ type: 'triage', reason: 'skipped', days: 1, snoozes: 0 }).text).toBe('card_triage_skipped');
    expect(metaView({ type: 'triage', reason: 'snoozedOften', days: 1, snoozes: 3 }).text).toBe('card_triage_snoozed');
    expect(metaView({ type: 'triage', reason: 'revisited', days: 1, snoozes: 0 }).text).toBe('card_triage_revisited');
    expect(metaView({ type: 'progress', spent: 12, effort: 40 })).toEqual({ icon: 'clock', text: 'card_progress', tone: 'progress' });
    expect(metaView({ type: 'kind', kind: 'repo', effort: 15 })).toEqual({ icon: 'repo', text: 'card_kind_effort', tone: 'plain' });
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `docker compose run --rm app npx vitest run src/test/newtab/card-meta.test.ts`
Expected: FAIL — cannot resolve `@/newtab/card-meta`.

- [ ] **Step 3: Write the helper**

`src/newtab/card-meta.ts`:

```ts
/** The line under a board card's title (spec §7). */
import { t } from '@/lib/i18n';
import type { Link, LinkActivity } from '@/lib/types';
import type { LinkKind } from '@/lib/link-kind';
import { daysBetween, shortDate } from '@/lib/recommend/dates';
import { lastTouch, type TriageReason } from '@/lib/recommend/triage';
import { KIND_LABEL_KEYS } from '@/lib/search/labels';
import type { IconName } from '@/shared/components/ui/icons';

export type CardMeta =
  | { type: 'reference' }
  | { type: 'snoozed'; until: number }
  | { type: 'triage'; reason: TriageReason; days: number; snoozes: number }
  | { type: 'progress'; spent: number; effort: number }
  | { type: 'kind'; kind: LinkKind; effort: number };

export interface CardMetaInput {
  link: Link;
  reference: boolean;
  snoozed: boolean;
  triage: TriageReason | undefined;
  activity: LinkActivity;
  kind: LinkKind;
  /** Minutes. */
  effort: number;
  now: number;
}

export const KIND_ICONS: Record<LinkKind, IconName> = {
  video: 'play',
  paper: 'paper',
  repo: 'repo',
  'code-change': 'code',
  docs: 'docs',
  exercise: 'code',
  chat: 'chat',
  social: 'chat',
  search: 'search',
  file: 'paper',
  page: 'page',
};

/** The first rule that applies: reference, snoozed, triage, in progress, kind and effort. */
export function cardMeta(input: CardMetaInput): CardMeta {
  if (input.reference) {
    return { type: 'reference' };
  }
  if (input.snoozed && input.link.snoozedUntil !== undefined) {
    return { type: 'snoozed', until: input.link.snoozedUntil };
  }
  if (input.triage !== undefined) {
    return {
      type: 'triage',
      reason: input.triage,
      days: daysBetween(lastTouch(input.link, input.activity), input.now),
      snoozes: input.activity.snoozes,
    };
  }
  const spent = Math.floor(input.activity.activeMs / 60_000);
  if (spent >= 1) {
    return { type: 'progress', spent, effort: input.effort };
  }
  return { type: 'kind', kind: input.kind, effort: input.effort };
}

export function metaView(meta: CardMeta): { icon: IconName; text: string; tone: 'plain' | 'warning' | 'progress' } {
  switch (meta.type) {
    case 'reference':
      return { icon: 'reference', text: t('linkcard_reference_badge'), tone: 'plain' };
    case 'snoozed':
      return { icon: 'clock', text: t('linkcard_snoozed_until', shortDate(meta.until)), tone: 'plain' };
    case 'triage': {
      const text = meta.reason === 'stale'
        ? t('card_triage_stale', meta.days)
        : meta.reason === 'snoozedOften'
          ? t('card_triage_snoozed', meta.snoozes)
          : meta.reason === 'revisited'
            ? t('card_triage_revisited')
            : t('card_triage_skipped');
      return { icon: 'alert', text, tone: 'warning' };
    }
    case 'progress':
      return { icon: 'clock', text: t('card_progress', meta.spent, meta.effort), tone: 'progress' };
    case 'kind':
      return { icon: KIND_ICONS[meta.kind], text: t('card_kind_effort', t(KIND_LABEL_KEYS[meta.kind]), meta.effort), tone: 'plain' };
  }
}
```

- [ ] **Step 4: Run it**

Run: `docker compose run --rm app npx vitest run src/test/newtab/card-meta.test.ts`
Expected: PASS (4 tests). If `daysBetween` rounds differently from the 10 days expected, read `src/lib/recommend/dates.ts:31` and ledger the ruling before changing the test.

- [ ] **Step 5: Locale keys**

`.superpowers/sdd/2026-09-25-nova-interface/keys-6-add.json`:

```json
{
  "card_kind_effort": { "en": "$1 · $2 min", "pt_BR": "$1 · $2 min", "placeholders": { "kind": "$1", "minutes": "$2" } },
  "card_progress": { "en": "$1 of ~$2 min", "pt_BR": "$1 de ~$2 min", "placeholders": { "spent": "$1", "effort": "$2" } },
  "card_triage_skipped": { "en": "Skipped 3 times", "pt_BR": "Pulado 3 vezes" },
  "card_triage_snoozed": { "en": "Snoozed $1 times", "pt_BR": "Adiado $1 vezes", "placeholders": { "count": "$1" } },
  "card_triage_revisited": { "en": "Opened, not completed", "pt_BR": "Aberto e não concluído" },
  "card_triage_stale": { "en": "Idle for $1 days", "pt_BR": "Parado há $1 dias", "placeholders": { "days": "$1" } }
}
```

`.superpowers/sdd/2026-09-25-nova-interface/keys-6-set.json`:

```json
{
  "linkcard_snoozed_until": { "en": "Snoozed until $1", "pt_BR": "Adiado até $1" }
}
```

```bash
docker compose run --rm app node scripts/i18n/keys.mjs add .superpowers/sdd/2026-09-25-nova-interface/keys-6-add.json
docker compose run --rm app node scripts/i18n/keys.mjs set .superpowers/sdd/2026-09-25-nova-interface/keys-6-set.json
```

- [ ] **Step 6: Update the card tests (failing first)**

In `src/test/components/LinkCard.test.ts`:

1. Replace the test `'should dispatch remove event when remove button is clicked'` with:

```ts
  it('removes from its menu', async () => {
    const remove = vi.fn();
    render(LinkCard, { props: { link: mockLink }, events: { remove } });

    await fireEvent.click(screen.getByRole('button', { name: 'progress_more' }));
    await fireEvent.click(screen.getByRole('menuitem', { name: 'linkcard_remove' }));

    expect(remove.mock.calls[0][0].detail).toEqual({ id: mockLink.id, title: mockLink.title });
  });
```

2. Replace the test `'shows when a link is a reference or snoozed'` with:

```ts
    it('shows the line its meta asks for, and dims a snoozed card', async () => {
      const until = new Date(2026, 8, 28).getTime();
      const { container, rerender } = render(LinkCard, { props: { link: mockLink, meta: { type: 'kind', kind: 'video', effort: 20 } } });
      expect(screen.getByText('card_kind_effort')).toBeInTheDocument();

      await rerender({ link: mockLink, meta: { type: 'snoozed', until } });

      expect(screen.getByText('linkcard_snoozed_until')).toBeInTheDocument();
      expect(container.querySelector('.link-card')).toHaveClass('dim');
    });

    it('shows the title even without meta, and the URL when the title is empty', () => {
      render(LinkCard, { props: { link: { ...mockLink, title: '' } } });
      expect(screen.getByText(mockLink.url)).toBeInTheDocument();
    });
```

(`mockLink` is the link the file already declares at the top; if it is named differently, use that name.)

In `src/test/components/Column.test.ts`, the test `'should render collection name and link count'` keeps its assertions; add after it:

```ts
  it('passes each card its meta line', () => {
    render(Column, {
      props: {
        collection: createMockCollection({ id: 'col-1', name: 'Work' }),
        links: [createMockLink({ id: 'l1', title: 'Link 1', collectionId: 'col-1' })],
        metaOf: () => ({ type: 'kind', kind: 'paper', effort: 40 }),
      },
    });
    expect(screen.getByText('card_kind_effort')).toBeInTheDocument();
  });
```

Run: `docker compose run --rm app npx vitest run src/test/components/LinkCard.test.ts src/test/components/Column.test.ts`
Expected: FAIL — there is no menu item `linkcard_remove`, no `meta` prop and no `metaOf` prop.

- [ ] **Step 7: Rewrite `LinkCard.svelte`**

`src/newtab/components/LinkCard.svelte`:

```svelte
<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { t } from '@lib/i18n';
  import type { Link } from '@/lib/types';
  import { extractDomain } from '@/lib/tabs';
  import { isSnoozed } from '@/lib/recommend/state';
  import { nextMonday, tomorrow } from '@/lib/recommend/dates';
  import Icon from '@/shared/components/ui/Icon.svelte';
  import IconButton from '@/shared/components/ui/IconButton.svelte';
  import LinkTile from '@/shared/components/ui/LinkTile.svelte';
  import Menu from '@/shared/components/ui/Menu.svelte';
  import MenuItem from '@/shared/components/ui/MenuItem.svelte';
  import { metaView, type CardMeta } from '../card-meta';

  export let link: Link;
  /** Counts as reference, by itself or through its collection. */
  export let reference = false;
  /** Its collection is a reference collection: unmarking then means `reference: false`. */
  export let collectionReference = false;
  /** The line under the title; without it, only reference and snooze show. */
  export let meta: CardMeta | null = null;

  const dispatch = createEventDispatcher<{
    open: Link;
    openInNewTab: Link;
    remove: { id: string; title: string };
    complete: Link;
    snooze: { link: Link; until: number };
    reference: { link: Link; value: boolean | null };
  }>();

  let showMenu = false;
  let menuAnchor: HTMLDivElement;

  function handleOpen(): void {
    dispatch('open', link);
  }

  function handleKeydown(event: KeyboardEvent): void {
    // Keys on the action buttons belong to those buttons.
    if (event.target !== event.currentTarget) {
      return;
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleOpen();
    }
  }

  function handleComplete(event: MouseEvent): void {
    event.stopPropagation();
    dispatch('complete', link);
  }

  function handleOpenInNewTab(event: MouseEvent): void {
    event.stopPropagation();
    dispatch('openInNewTab', link);
  }

  function toggleMenu(event: MouseEvent): void {
    event.stopPropagation();
    showMenu = !showMenu;
  }

  function snooze(until: number): void {
    showMenu = false;
    dispatch('snooze', { link, until });
  }

  function toggleReference(): void {
    showMenu = false;
    dispatch('reference', { link, value: reference ? (collectionReference ? false : null) : true });
  }

  function remove(): void {
    showMenu = false;
    dispatch('remove', { id: link.id, title: link.title });
  }

  $: domain = extractDomain(link.url).replace('www.', '');
  $: fallback = reference
    ? ({ type: 'reference' } as const)
    : isSnoozed(link, Date.now()) && link.snoozedUntil !== undefined
      ? ({ type: 'snoozed', until: link.snoozedUntil } as const)
      : null;
  $: shown = meta ?? fallback;
  $: view = shown === null ? null : metaView(shown);
</script>

<div
  class="link-card"
  class:dim={shown?.type === 'snoozed'}
  data-link-id={link.id}
  on:click={handleOpen}
  on:keydown={handleKeydown}
  role="button"
  tabindex="0"
>
  <LinkTile {link} size={32} />

  <div class="link-content">
    <span class="link-title" title={link.title}>{link.title || link.url}</span>
    <span class="link-meta">
      {#if view !== null}
        <span class="meta-state {view.tone}"><Icon name={view.icon} size={12} />{view.text}</span>
      {/if}
      <span class="link-domain">{domain}</span>
    </span>
  </div>

  <div class="link-actions">
    <IconButton icon="check" size="sm" tone="success" label={t('progress_complete')} on:click={handleComplete} />
    <IconButton icon="external" size="sm" label={t('linkcard_open')} on:click={handleOpenInNewTab} />
    <div class="card-menu" bind:this={menuAnchor}>
      <IconButton icon="more" size="sm" label={t('progress_more')} expanded={showMenu} on:click={toggleMenu} />
      {#if showMenu}
        <Menu label={t('progress_more')} align="end" anchor={menuAnchor} on:close={() => (showMenu = false)}>
          <MenuItem icon="clock" on:select={() => snooze(tomorrow(Date.now()))}>{t('progress_snooze_tomorrow')}</MenuItem>
          <MenuItem icon="clock" on:select={() => snooze(nextMonday(Date.now()))}>{t('progress_snooze_next_week')}</MenuItem>
          <MenuItem icon="reference" on:select={toggleReference}>
            {reference ? t('progress_unmark_reference') : t('progress_mark_reference')}
          </MenuItem>
          <MenuItem icon="trash" danger on:select={remove}>{t('linkcard_remove')}</MenuItem>
        </Menu>
      {/if}
    </div>
  </div>
</div>

<style>
  .link-card:global(.revealed) {
    border-color: var(--accent-primary);
    box-shadow: 0 0 0 2px var(--accent-soft);
  }

  .link-card {
    position: relative;
    display: grid;
    grid-template-columns: 32px minmax(0, 1fr);
    gap: var(--space-3);
    padding: 11px 12px;
    background: var(--surface-elevated);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-lift);
    cursor: pointer;
    user-select: none;
    transition: border-color var(--duration-fast) var(--ease-out);
  }

  .link-card:hover {
    border-color: var(--border-strong);
  }

  .link-card:focus {
    outline: none;
  }

  .link-card:focus-visible {
    outline: 2px solid var(--accent-primary);
    outline-offset: 2px;
  }

  .dim {
    opacity: 0.6;
  }

  .link-content {
    min-width: 0;
    display: flex;
    flex-direction: column;
  }

  .link-title {
    font: 500 var(--text-base) / 1.35 var(--font-body);
    color: var(--text-primary);
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    overflow-wrap: anywhere;
  }

  .link-meta {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    margin-top: 4px;
    font-size: var(--text-xs);
    color: var(--text-tertiary);
    white-space: nowrap;
    overflow: hidden;
  }

  .meta-state {
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }

  .meta-state.warning {
    color: var(--semantic-warning);
  }

  .meta-state.progress {
    color: var(--accent-ink);
  }

  .link-domain {
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .link-actions {
    position: absolute;
    top: 8px;
    right: 8px;
    display: flex;
    gap: 2px;
    padding: 2px;
    border: 1px solid var(--border-default);
    border-radius: 10px;
    background: var(--surface-overlay);
    box-shadow: var(--shadow-lift);
    opacity: 0;
    transition: opacity var(--duration-fast) var(--ease-out);
  }

  .link-card:hover .link-actions,
  .link-card:focus-within .link-actions {
    opacity: 1;
  }

  .card-menu {
    position: relative;
  }
</style>
```

- [ ] **Step 8: Change the column**

In `src/newtab/components/Column.svelte`:

1. Imports: add `import IconButton from '@/shared/components/ui/IconButton.svelte';`, `import Icon from '@/shared/components/ui/Icon.svelte';` and `import type { CardMeta } from '../card-meta';`.
2. Props: after `export let currentWorkspaceId: string = '';` add:

```ts
  /** The meta line of each card; null leaves only reference and snooze. */
  export let metaOf: ((link: Link) => CardMeta) | null = null;
```

3. In the `<LinkCard ... />` element add `meta={metaOf === null ? null : metaOf(link)}`.
4. Replace the non-editing title `<button class="column-title" ...>...</button>` with:

```svelte
        <button
          type="button"
          class="column-title"
          class:editable={!isInbox}
          on:dblclick={startEditing}
          title={isInbox ? t('common_inbox') : t('column_double_click_rename')}
        >
          <span class="dot" style:--dot={collection.color ?? 'var(--text-tertiary)'} aria-hidden="true"></span>
          {getCollectionDisplayName(collection)}
          <span class="link-count">{links.length}</span>
          {#if collection.focus === true}
            <span class="pin" title={t('reason_focus')}><Icon name="pin-filled" size={13} /></span>
          {/if}
        </button>
```

5. Replace the menu trigger `<button type="button" class="btn-menu" ...>...</button>` (with its inline SVG) with:

```svelte
          <IconButton icon="more" size="sm" label={t('column_menu')} expanded={showMenu} on:click={(event) => { event.stopPropagation(); toggleMenu(); }} />
```

6. Inside the column menu, replace each inline `<svg ...>...</svg>` with an `Icon` of size 14: open all → `external`, move to → `folder` (and the trailing chevron → `chevron-right` of size 12 with `class="chevron"` on a wrapping `<span>`), focus → `target`, reference → `reference`, delete → `trash`.
7. Styles: replace the `.column`, `.column.inbox`, `.column.tab-drag-over`, `.column-header`, `.column-title` and `.link-count` rules with:

```css
  .column {
    display: flex;
    flex-direction: column;
    width: var(--column-width);
    min-width: var(--column-min-width);
    max-width: var(--column-max-width);
    max-height: 100%;
    border-radius: var(--radius-lg);
    flex-shrink: 0;
    transition: background-color var(--duration-fast) var(--ease-out);
  }

  .column.tab-drag-over {
    background: var(--accent-soft);
    outline: 1px dashed var(--accent-line);
    outline-offset: 4px;
  }

  .column-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    min-height: 30px;
    padding: 0 4px;
    margin-bottom: var(--space-2);
  }

  .column-title {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-1) var(--space-2);
    margin: calc(-1 * var(--space-1)) calc(-1 * var(--space-2));
    background: transparent;
    border: none;
    border-radius: var(--radius-sm);
    color: var(--text-primary);
    font: 600 13.5px / 1 var(--font-body);
    cursor: default;
  }

  .dot {
    width: 8px;
    height: 8px;
    border-radius: 3px;
    background: var(--dot);
  }

  .link-count {
    font-size: var(--text-xs);
    font-weight: 500;
    color: var(--text-tertiary);
  }

  .pin {
    display: inline-grid;
    color: var(--accent-primary);
  }
```

and delete the `.btn-menu`, `.btn-menu:*` rules. In `.column-content`, set `gap: 6px` and `padding: 0` (keep its scroll rules).

- [ ] **Step 9: Pass `metaOf` through the board**

In `src/newtab/components/KanbanBoard.svelte`: add `import type { CardMeta } from '../card-meta';`, the prop `export let metaOf: ((link: Link) => CardMeta) | null = null;` and `{metaOf}` on the `<Column ... />` element.

In `src/newtab/App.svelte`:

1. Imports: add `import { cardMeta, type CardMeta } from './card-meta';`, `import { activityOf } from '@/lib/recommend/triage';`, `import { isReference, isSnoozed } from '@/lib/recommend/state';` and `import { linkKind } from '@/lib/link-kind';`.
2. After the `$: queue = buildQueue(...)` block add:

```ts
  $: triageReasons = new Map(queue.triage.map((item) => [item.link.id, item.reason]));
  $: collectionById = new Map($linksStore.collections.map((collection) => [collection.id, collection]));
  $: metaOf = (link: Link): CardMeta => cardMeta({
    link,
    reference: isReference(link, collectionById.get(link.collectionId)),
    snoozed: isSnoozed(link, now),
    triage: triageReasons.get(link.id),
    activity: activityOf($activityStore.activity, link.id),
    kind: linkKind(link.url),
    effort: queue.effortOf(link),
    now,
  });
```

3. Add `{metaOf}` to the `<KanbanBoard ... />` element.

- [ ] **Step 10: Run the tests of this task**

Run: `docker compose run --rm app npx vitest run src/test/newtab/card-meta.test.ts src/test/components/LinkCard.test.ts src/test/components/Column.test.ts src/test/components/KanbanBoard.test.ts src/test/lib/locales.test.ts`
Expected: PASS. If a `LinkCard` test still looks for the removed standalone remove button or the `linkcard_complete_title` tooltip, update it to the menu item or the `progress_complete` name and ledger it.

- [ ] **Step 11: Suite, lint, size, and a look**

```bash
make test && make lint
make build && docker compose run --rm -T app du -sb dist
make preview
```

Expected: tests pass; 12 old lint errors; `du` ≤ 573440. In the preview, the columns have no box; each card shows its tile, a two-line title, and "Vídeo · 20 min", "12 de ~40 min" (coral), "Parado há 75 dias" (amber) or "Adiado até …" (dimmed); hovering a card shows ✓, ↗ and ⋯; the focus column shows the coral pin. Capture both themes at 1440 and 1024. `make preview-stop`.

- [ ] **Step 12: Commit**

```bash
git add src/newtab/card-meta.ts src/newtab/components/LinkCard.svelte src/newtab/components/Column.svelte src/newtab/components/KanbanBoard.svelte src/newtab/App.svelte src/test/newtab/card-meta.test.ts src/test/components/LinkCard.test.ts src/test/components/Column.test.ts public/_locales/en/messages.json public/_locales/pt_BR/messages.json
git commit -m "feat(board): cards show kind and time, progress, triage and snooze; lanes without boxes; actions on hover

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

## Stage 2 — Now and triage

### Task 7: Time left and the week in dots

**Files:**
- Create: `src/lib/recommend/time.ts`, `src/test/lib/recommend/time.test.ts`
- Modify: `src/lib/recommend/progress.ts`, `src/test/lib/recommend/progress.test.ts`

**Interfaces:**
- Produces:
  - `timeLeft(activeMs: number, effort: number): TimeLeft` with `TimeLeft = { spent: number; progress: number; kind: 'estimate' | 'left' | 'over'; minutes: number }`.
  - `weekDots(links: Link[], now: number): WeekDot[]` with `WeekDot = { day: string; done: boolean; today: boolean }` (Monday first, 7 items).
  - `completedThisWeek(links: Link[], now: number): number`.

- [ ] **Step 1: Write the failing tests**

`src/test/lib/recommend/time.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { timeLeft } from '@/lib/recommend/time';

describe('timeLeft', () => {
  it('is the estimate when nothing was spent', () => {
    expect(timeLeft(0, 20)).toEqual({ spent: 0, progress: 0, kind: 'estimate', minutes: 20 });
    expect(timeLeft(20_000, 20)).toEqual({ spent: 0, progress: 0, kind: 'estimate', minutes: 20 });
  });

  it('is what is left while under the estimate', () => {
    expect(timeLeft(18 * 60_000, 20)).toEqual({ spent: 18, progress: 0.9, kind: 'left', minutes: 2 });
  });

  it('is the time spent once the estimate is reached', () => {
    expect(timeLeft(20 * 60_000, 20)).toEqual({ spent: 20, progress: 1, kind: 'over', minutes: 20 });
    expect(timeLeft(31 * 60_000, 20)).toEqual({ spent: 31, progress: 1, kind: 'over', minutes: 31 });
  });
});
```

Append to `src/test/lib/recommend/progress.test.ts` (add `completedThisWeek` and `weekDots` to its import from `@/lib/recommend/progress`, and `createMockLink` from `../../factories` if missing):

```ts
describe('weekDots', () => {
  // Thursday, 2026-09-24.
  const now = new Date(2026, 8, 24, 15).getTime();

  it('lists Monday to Sunday, marking the days with a completion and today', () => {
    const links = [
      createMockLink({ id: 'mon', completedAt: new Date(2026, 8, 21, 9).getTime() }),
      createMockLink({ id: 'thu', completedAt: new Date(2026, 8, 24, 8).getTime() }),
      createMockLink({ id: 'last-week', completedAt: new Date(2026, 8, 18, 9).getTime() }),
      createMockLink({ id: 'pending' }),
    ];

    const dots = weekDots(links, now);

    expect(dots.map((dot) => dot.day)).toEqual([
      '2026-09-21', '2026-09-22', '2026-09-23', '2026-09-24', '2026-09-25', '2026-09-26', '2026-09-27',
    ]);
    expect(dots.map((dot) => dot.done)).toEqual([true, false, false, true, false, false, false]);
    expect(dots.map((dot) => dot.today)).toEqual([false, false, false, true, false, false, false]);
  });

  it('counts the completions of this week', () => {
    const links = [
      createMockLink({ id: 'a', completedAt: new Date(2026, 8, 21, 9).getTime() }),
      createMockLink({ id: 'b', completedAt: new Date(2026, 8, 24, 8).getTime() }),
      createMockLink({ id: 'c', completedAt: new Date(2026, 8, 20, 23).getTime() }),
    ];
    expect(completedThisWeek(links, now)).toBe(2);
  });
});
```

- [ ] **Step 2: Run them to see them fail**

Run: `docker compose run --rm app npx vitest run src/test/lib/recommend/time.test.ts src/test/lib/recommend/progress.test.ts`
Expected: FAIL — `time.ts` does not exist and `weekDots` is not exported.

- [ ] **Step 3: Write the helpers**

`src/lib/recommend/time.ts`:

```ts
/** How long a recommendation takes, given the active time already spent on it (spec §6.3). */
export interface TimeLeft {
  /** Minutes spent, rounded. */
  spent: number;
  /** Share of the estimate spent, 0–1; 0 when nothing was spent. */
  progress: number;
  /** estimate: nothing spent; left: under the estimate; over: estimate reached. */
  kind: 'estimate' | 'left' | 'over';
  /** The estimate, what is left, or what was spent, in minutes. */
  minutes: number;
}

export function timeLeft(activeMs: number, effort: number): TimeLeft {
  const spent = Math.round(activeMs / 60_000);
  if (spent <= 0) {
    return { spent: 0, progress: 0, kind: 'estimate', minutes: effort };
  }
  if (spent < effort) {
    return { spent, progress: spent / effort, kind: 'left', minutes: effort - spent };
  }
  return { spent, progress: 1, kind: 'over', minutes: spent };
}
```

In `src/lib/recommend/progress.ts`, change the dates import to `import { addDays, dayKey, isoWeek, weekStart } from './dates';` and append:

```ts
export interface WeekDot {
  /** Local day, AAAA-MM-DD. */
  day: string;
  done: boolean;
  today: boolean;
}

/** Monday to Sunday of this week, marking the days with at least one completion. */
export function weekDots(links: Link[], now: number): WeekDot[] {
  const start = weekStart(now);
  const today = dayKey(now);
  const doneDays = new Set(links.flatMap((link) => (link.completedAt === undefined ? [] : [dayKey(link.completedAt)])));
  return Array.from({ length: 7 }, (_, i) => {
    const day = dayKey(addDays(start, i));
    return { day, done: doneDays.has(day), today: day === today };
  });
}

/** Links completed since this week's Monday. */
export function completedThisWeek(links: Link[], now: number): number {
  const start = weekStart(now);
  return links.filter((link) => link.completedAt !== undefined && link.completedAt >= start).length;
}
```

- [ ] **Step 4: Run them**

Run: `docker compose run --rm app npx vitest run src/test/lib/recommend/time.test.ts src/test/lib/recommend/progress.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/recommend/time.ts src/lib/recommend/progress.ts src/test/lib/recommend/time.test.ts src/test/lib/recommend/progress.test.ts
git commit -m "feat(recommend): time left against the estimate; this week's completions by day

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

### Task 8: The Now section

**Files:**
- Create: `src/newtab/components/NowSection.svelte`, `NowHero.svelte`, `NowLater.svelte`; `src/test/components/NowHero.test.ts`, `NowLater.test.ts`, `NowSection.test.ts`
- Modify: `src/newtab/next-up-labels.ts`, `src/newtab/App.svelte`, `src/test/lib/locales.test.ts`, `src/test/newtab/next-up-labels.test.ts`
- Delete: `src/newtab/components/NextUpStrip.svelte`, `NextUpCard.svelte`, `src/test/components/NextUpStrip.test.ts`, `NextUpCard.test.ts`
- Locales: add the `now_*` keys below; set `settings_nextup_title`, `settings_nextup_description`, `settings_nextup_toggle_label`; remove `nextup_title`, `nextup_triage_one`, `nextup_triage_many`, `nextup_role_continue`, `nextup_role_advance`, `nextup_role_revive`

**Interfaces:**
- Consumes: `timeLeft`, `TimeLeft` (Task 7); `weekDots`, `completedThisWeek` (Task 7); `Button`, `IconButton`, `Icon`, `Kbd`, `LinkTile`, `ProgressRing`, `Menu`, `MenuItem` (Tasks 3–4); `Queue`, `Recommendation` (`src/lib/recommend/engine.ts`).
- Produces:
  - In `next-up-labels.ts`: `CONTEXT_KEYS: Record<SlotRole, string>`, `CONTINUE_KEYS` and `DO_NOW_KEYS: Record<LinkAction, string>`, `timeText(time: TimeLeft): string`, `ringCaption(time: TimeLeft, effort: number): string`. `ROLE_KEYS` is removed.
  - `<NowHero rec activeMs>`; dispatches `open {link,newTab}`, `complete`, `snooze {link,until}`, `reference`, `discard`, `reveal`, `dismissAsk` (all with the `Link`).
  - `<NowLater recs triageCount justCompleted inSession>`; dispatches `open`, `complete`, `openTriage`, `openFocus`, `endSession`, `undo`.
  - `<NowSection queue links activity now collapsed justCompleted>`; forwards the events above and dispatches `toggleCollapsed`. Task 13 adds the prop `session`.

- [ ] **Step 1: Locale keys**

`.superpowers/sdd/2026-09-25-nova-interface/keys-8-add.json`:

```json
{
  "now_title": { "en": "Now", "pt_BR": "Agora" },
  "now_toggle": { "en": "Collapse or expand Now", "pt_BR": "Recolher ou expandir Agora" },
  "now_context_continue": { "en": "Continue in $1", "pt_BR": "Continuar em $1", "placeholders": { "collection": "$1" } },
  "now_context_advance": { "en": "Next in $1", "pt_BR": "Avançar em $1", "placeholders": { "collection": "$1" } },
  "now_context_revive": { "en": "Back to $1", "pt_BR": "Retomar em $1", "placeholders": { "collection": "$1" } },
  "now_continue_watch": { "en": "Keep watching", "pt_BR": "Continuar assistindo" },
  "now_continue_read": { "en": "Keep reading", "pt_BR": "Continuar lendo" },
  "now_continue_explore": { "en": "Keep exploring", "pt_BR": "Continuar explorando" },
  "now_continue_solve": { "en": "Keep solving", "pt_BR": "Continuar resolvendo" },
  "now_continue_review": { "en": "Keep reviewing", "pt_BR": "Continuar revisando" },
  "now_continue_resume": { "en": "Continue", "pt_BR": "Continuar" },
  "now_continue_search_again": { "en": "Search again", "pt_BR": "Refazer a busca" },
  "now_continue_open": { "en": "Open", "pt_BR": "Abrir" },
  "now_do_watch": { "en": "Watch now", "pt_BR": "Assistir agora" },
  "now_do_read": { "en": "Read now", "pt_BR": "Ler agora" },
  "now_do_explore": { "en": "Explore now", "pt_BR": "Explorar agora" },
  "now_do_solve": { "en": "Solve now", "pt_BR": "Resolver agora" },
  "now_do_review": { "en": "Review now", "pt_BR": "Revisar agora" },
  "now_do_resume": { "en": "Resume now", "pt_BR": "Retomar agora" },
  "now_do_search_again": { "en": "Search again", "pt_BR": "Refazer a busca" },
  "now_do_open": { "en": "Open now", "pt_BR": "Abrir agora" },
  "now_time_left": { "en": "about $1 min left", "pt_BR": "faltam uns $1 min", "placeholders": { "minutes": "$1" } },
  "now_time_over": { "en": "$1 min so far", "pt_BR": "$1 min até agora", "placeholders": { "minutes": "$1" } },
  "now_ring_spent": { "en": "$1 of ~$2 min", "pt_BR": "$1 de ~$2 min", "placeholders": { "spent": "$1", "effort": "$2" } },
  "now_ask_question": { "en": "Done with it?", "pt_BR": "Já terminou?" },
  "now_ask_detail": { "en": "You spent $1 min on this tab.", "pt_BR": "Você ficou $1 min nesta aba.", "placeholders": { "minutes": "$1" } },
  "now_later": { "en": "Later", "pt_BR": "Depois" },
  "now_later_session": { "en": "Later in this session", "pt_BR": "Depois, na sessão" },
  "now_triage_one": { "en": "Triage 1 idle link", "pt_BR": "Triar 1 link parado" },
  "now_triage_many": { "en": "Triage $1 idle links", "pt_BR": "Triar $1 links parados", "placeholders": { "count": "$1" } },
  "now_plan_session": { "en": "Plan a session", "pt_BR": "Planejar uma sessão" },
  "now_end_session": { "en": "End the session", "pt_BR": "Encerrar a sessão" },
  "now_just_completed": { "en": "$1, just completed", "pt_BR": "$1, concluído agora", "placeholders": { "title": "$1" } },
  "now_empty_title": { "en": "Nothing pending.", "pt_BR": "Nada pendente." },
  "now_empty_body": { "en": "Links you save show up here.", "pt_BR": "Os links que você salvar aparecem aqui." },
  "now_only_triage": { "en": "Decide on $1 idle links", "pt_BR": "Decida $1 links parados", "placeholders": { "count": "$1" } },
  "now_triage_now": { "en": "Triage now", "pt_BR": "Triar agora" }
}
```

`.superpowers/sdd/2026-09-25-nova-interface/keys-8-set.json`:

```json
{
  "settings_nextup_title": { "en": "Now on the new tab", "pt_BR": "Agora na nova aba" },
  "settings_nextup_description": { "en": "Suggests what to open, read or solve next among your saved links", "pt_BR": "Sugere o que abrir, ler ou resolver em seguida entre os links salvos" },
  "settings_nextup_toggle_label": { "en": "Turn Now on or off", "pt_BR": "Ligar ou desligar o Agora" }
}
```

```bash
docker compose run --rm app node scripts/i18n/keys.mjs add .superpowers/sdd/2026-09-25-nova-interface/keys-8-add.json
docker compose run --rm app node scripts/i18n/keys.mjs set .superpowers/sdd/2026-09-25-nova-interface/keys-8-set.json
```

- [ ] **Step 2: Write the failing tests**

`src/test/components/NowHero.test.ts`:

```ts
/**
 * The main card of Now (spec §6.1).
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import NowHero from '@/newtab/components/NowHero.svelte';
import type { Recommendation } from '@/lib/recommend/engine';
import { createMockCollection, createMockLink } from '../factories';

const rec: Recommendation = {
  link: createMockLink({ id: 'l1', title: 'Machines of Loving Grace', url: 'https://example.com/essay' }),
  collection: createMockCollection({ id: 'c1', name: 'IA', color: '#6B8AAF' }),
  role: 'revive',
  reason: { type: 'stale', weeks: 3 },
  kind: 'page',
  action: 'read',
  effort: 10,
};

describe('NowHero', () => {
  it('says where it comes from, why, what to do and how long it takes', () => {
    render(NowHero, { props: { rec } });

    for (const text of ['now_context_revive', 'reason_stale_weeks', 'action_read', 'nextup_effort']) {
      expect(screen.getAllByText(text).length).toBeGreaterThan(0);
    }
    expect(screen.getByRole('button', { name: /Machines of Loving Grace/ })).toBeInTheDocument();
  });

  it('shows what is left once reading started', () => {
    render(NowHero, { props: { rec: { ...rec, role: 'continue', reason: { type: 'opened', days: 1 } }, activeMs: 4 * 60_000 } });

    expect(screen.getByText('now_time_left')).toBeInTheDocument();
    expect(screen.getByText('now_ring_spent')).toBeInTheDocument();
  });

  it('shows the URL when the title is empty', () => {
    render(NowHero, { props: { rec: { ...rec, link: { ...rec.link, title: '' } } } });
    expect(screen.getByRole('button', { name: /https:\/\/example.com\/essay/ })).toBeInTheDocument();
  });

  it('opens from the title in this tab, or in a new one with Cmd or Ctrl', async () => {
    const open = vi.fn();
    render(NowHero, { props: { rec }, events: { open } });
    const title = screen.getByRole('button', { name: /Machines of Loving Grace/ });

    await fireEvent.click(title);
    await fireEvent.click(title, { metaKey: true });

    expect(open.mock.calls.map((call) => (call[0] as CustomEvent<{ newTab: boolean }>).detail.newTab)).toEqual([false, true]);
  });

  it('offers to do it now, or to keep going when it was started', async () => {
    const open = vi.fn();
    const { rerender } = render(NowHero, { props: { rec }, events: { open } });
    await fireEvent.click(screen.getByRole('button', { name: 'now_do_read' }));

    await rerender({ rec: { ...rec, role: 'continue', reason: { type: 'opened', days: 1 } } });
    await fireEvent.click(screen.getByRole('button', { name: 'now_continue_read' }));

    expect(open).toHaveBeenCalledTimes(2);
  });

  it('asks "done with it?" with yes and not yet', async () => {
    const complete = vi.fn();
    const dismissAsk = vi.fn();
    render(NowHero, {
      props: { rec: { ...rec, role: 'continue', reason: { type: 'ask', minutes: 25 } } },
      events: { complete, dismissAsk },
    });

    expect(screen.getByText('now_ask_question')).toBeInTheDocument();
    await fireEvent.click(screen.getByRole('button', { name: 'nextup_ask_yes' }));
    await fireEvent.click(screen.getByRole('button', { name: 'nextup_ask_no' }));

    expect(complete.mock.calls[0][0].detail).toEqual(rec.link);
    expect(dismissAsk.mock.calls[0][0].detail).toEqual(rec.link);
  });

  it('completes, snoozes, marks reference, reveals and discards', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 8, 24, 10));
    const handlers = { complete: vi.fn(), snooze: vi.fn(), reference: vi.fn(), reveal: vi.fn(), discard: vi.fn() };
    render(NowHero, { props: { rec }, events: handlers });

    await fireEvent.click(screen.getByRole('button', { name: 'progress_complete' }));
    await fireEvent.click(screen.getByRole('button', { name: 'progress_snooze' }));
    await fireEvent.click(screen.getByRole('menuitem', { name: 'progress_snooze_tomorrow' }));
    for (const [item, handler] of [
      ['progress_mark_reference', handlers.reference],
      ['progress_reveal', handlers.reveal],
      ['progress_discard', handlers.discard],
    ] as const) {
      await fireEvent.click(screen.getByRole('button', { name: 'progress_more' }));
      await fireEvent.click(screen.getByRole('menuitem', { name: item }));
      expect(handler.mock.calls[0][0].detail).toEqual(rec.link);
    }
    vi.useRealTimers();

    expect(handlers.complete.mock.calls[0][0].detail).toEqual(rec.link);
    expect(handlers.snooze.mock.calls[0][0].detail).toEqual({ link: rec.link, until: new Date(2026, 8, 25).getTime() });
  });
});
```

`src/test/components/NowLater.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import NowLater from '@/newtab/components/NowLater.svelte';
import type { Recommendation } from '@/lib/recommend/engine';
import { createMockCollection, createMockLink } from '../factories';

const collection = createMockCollection({ id: 'c', name: 'Talks' });
const recs: Recommendation[] = ['a', 'b'].map((id) => ({
  link: createMockLink({ id, title: `Talk ${id}`, url: `https://example.com/${id}` }),
  collection,
  role: 'advance',
  reason: { type: 'nextInColumn' },
  kind: 'video',
  action: 'watch',
  effort: 20,
}));

describe('NowLater', () => {
  it('lists the next recommendations and opens or completes them', async () => {
    const open = vi.fn();
    const complete = vi.fn();
    render(NowLater, { props: { recs }, events: { open, complete } });

    await fireEvent.click(screen.getByRole('button', { name: /Talk a/ }));
    await fireEvent.click(screen.getAllByRole('button', { name: 'progress_complete' })[1]);

    expect(open.mock.calls[0][0].detail).toEqual({ link: recs[0].link, newTab: false });
    expect(complete.mock.calls[0][0].detail).toEqual(recs[1].link);
  });

  it('offers the triage only when there is any, and planning a session', async () => {
    const openTriage = vi.fn();
    const openFocus = vi.fn();
    const { rerender } = render(NowLater, { props: { recs, triageCount: 0 }, events: { openTriage, openFocus } });
    expect(screen.queryByRole('button', { name: /now_triage/ })).toBeNull();

    await rerender({ recs, triageCount: 2 });
    await fireEvent.click(screen.getByRole('button', { name: /now_triage_many/ }));
    await fireEvent.click(screen.getByRole('button', { name: /now_plan_session/ }));

    expect(openTriage).toHaveBeenCalledTimes(1);
    expect(openFocus).toHaveBeenCalledTimes(1);
  });

  it('undoes what was just completed', async () => {
    const undo = vi.fn();
    render(NowLater, { props: { recs, justCompleted: recs[0].link }, events: { undo } });

    expect(screen.getByText('now_just_completed')).toBeInTheDocument();
    await fireEvent.click(screen.getByRole('button', { name: 'progress_undo' }));

    expect(undo.mock.calls[0][0].detail).toEqual(recs[0].link);
  });
});
```

`src/test/components/NowSection.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import NowSection from '@/newtab/components/NowSection.svelte';
import { buildQueue, type Queue } from '@/lib/recommend/engine';
import type { Link } from '@/lib/types';
import { createMockCollection, createMockLink } from '../factories';

const DAY = 86_400_000;
const now = Date.now();
const collections = [createMockCollection({ id: 'a', name: 'A', order: 1 })];
const pages = ['p1', 'p2', 'p3', 'p4'].map((id) =>
  createMockLink({ id, title: `Page ${id}`, url: `https://example.com/${id}`, collectionId: 'a', createdAt: now - DAY }));
const queueOf = (links: Link[]): Queue => buildQueue({ links, collections, activity: {}, now });
const props = (links: Link[], extra: Record<string, unknown> = {}): Record<string, unknown> =>
  ({ queue: queueOf(links), links, activity: {}, now, ...extra });

describe('NowSection', () => {
  it('shows one main recommendation and the next ones beside it', () => {
    render(NowSection, { props: props(pages) });

    expect(screen.getByRole('heading', { name: 'now_title' })).toBeInTheDocument();
    expect(screen.getAllByRole('article')).toHaveLength(1);
    expect(screen.getByRole('heading', { name: 'now_later' })).toBeInTheDocument();
  });

  it('shows the week in seven dots', () => {
    const done = createMockLink({ id: 'done', collectionId: 'a', completedAt: now });
    const { container } = render(NowSection, { props: props([...pages, done]) });

    expect(container.querySelectorAll('.dots i')).toHaveLength(7);
    expect(container.querySelectorAll('.dots i.done')).toHaveLength(1);
    expect(screen.getByText('focus_week_one')).toBeInTheDocument();
  });

  it('says when nothing is pending', () => {
    render(NowSection, { props: props([]) });
    expect(screen.getByText('now_empty_title')).toBeInTheDocument();
  });

  it('asks for the triage first when only idle links are left', async () => {
    const openTriage = vi.fn();
    const old = createMockLink({ id: 'old', collectionId: 'a', createdAt: now - 90 * DAY });
    render(NowSection, { props: props([old]), events: { openTriage } });

    expect(screen.getByText('now_only_triage')).toBeInTheDocument();
    await fireEvent.click(screen.getByRole('button', { name: 'now_triage_now' }));

    expect(openTriage).toHaveBeenCalledTimes(1);
  });

  it('collapses to one line and asks to toggle', async () => {
    const toggleCollapsed = vi.fn();
    render(NowSection, { props: props(pages, { collapsed: true }), events: { toggleCollapsed } });

    expect(screen.queryByRole('article')).toBeNull();
    expect(screen.getByText(/Page p1/)).toBeInTheDocument();
    await fireEvent.click(screen.getByRole('button', { name: 'now_toggle' }));

    expect(toggleCollapsed).toHaveBeenCalledTimes(1);
  });
});
```

In `src/test/lib/locales.test.ts`, change the import to `import { ACTION_KEYS, CONTEXT_KEYS, CONTINUE_KEYS, DO_NOW_KEYS, TRIAGE_KEYS } from '@/newtab/next-up-labels';` and the map list to `[ACTION_KEYS, CONTEXT_KEYS, CONTINUE_KEYS, DO_NOW_KEYS, TRIAGE_KEYS, KIND_LABEL_KEYS]`.

- [ ] **Step 3: Run them to see them fail**

Run: `docker compose run --rm app npx vitest run src/test/components/NowHero.test.ts src/test/components/NowLater.test.ts src/test/components/NowSection.test.ts src/test/lib/locales.test.ts`
Expected: FAIL — the components and `CONTEXT_KEYS` do not exist.

- [ ] **Step 4: Labels**

In `src/newtab/next-up-labels.ts`: add `import type { TimeLeft } from '@/lib/recommend/time';`, delete `ROLE_KEYS`, and add:

```ts
export const CONTEXT_KEYS: Record<SlotRole, string> = {
  continue: 'now_context_continue',
  advance: 'now_context_advance',
  revive: 'now_context_revive',
};

/** The main button of a link already started. */
export const CONTINUE_KEYS: Record<LinkAction, string> = {
  watch: 'now_continue_watch',
  read: 'now_continue_read',
  explore: 'now_continue_explore',
  solve: 'now_continue_solve',
  review: 'now_continue_review',
  resume: 'now_continue_resume',
  searchAgain: 'now_continue_search_again',
  open: 'now_continue_open',
};

/** The main button of a link not started yet. */
export const DO_NOW_KEYS: Record<LinkAction, string> = {
  watch: 'now_do_watch',
  read: 'now_do_read',
  explore: 'now_do_explore',
  solve: 'now_do_solve',
  review: 'now_do_review',
  resume: 'now_do_resume',
  searchAgain: 'now_do_search_again',
  open: 'now_do_open',
};

/** "~20 min", "faltam uns 2 min" or "31 min até agora". */
export function timeText(time: TimeLeft): string {
  if (time.kind === 'left') {
    return t('now_time_left', time.minutes);
  }
  return time.kind === 'over' ? t('now_time_over', time.minutes) : t('nextup_effort', time.minutes);
}

/** Under the ring: "18 de ~20 min", or the estimate when nothing was spent. */
export function ringCaption(time: TimeLeft, effort: number): string {
  return time.spent > 0 ? t('now_ring_spent', time.spent, effort) : t('nextup_effort', effort);
}
```

The `SlotRole` import stays (used by `CONTEXT_KEYS`). If `src/test/newtab/next-up-labels.test.ts` references `ROLE_KEYS`, switch it to `CONTEXT_KEYS` with the `now_context_*` values.

- [ ] **Step 5: Write `NowHero.svelte`**

```svelte
<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { getCollectionDisplayName, t } from '@/lib/i18n';
  import type { Link } from '@/lib/types';
  import type { Recommendation } from '@/lib/recommend/engine';
  import { nextMonday, tomorrow } from '@/lib/recommend/dates';
  import { timeLeft } from '@/lib/recommend/time';
  import Button from '@/shared/components/ui/Button.svelte';
  import Icon from '@/shared/components/ui/Icon.svelte';
  import IconButton from '@/shared/components/ui/IconButton.svelte';
  import Menu from '@/shared/components/ui/Menu.svelte';
  import MenuItem from '@/shared/components/ui/MenuItem.svelte';
  import ProgressRing from '@/shared/components/ui/ProgressRing.svelte';
  import { ACTION_KEYS, CONTEXT_KEYS, CONTINUE_KEYS, DO_NOW_KEYS, reasonText, ringCaption, timeText } from '../next-up-labels';

  export let rec: Recommendation;
  /** Active time already spent on the link, in ms. */
  export let activeMs = 0;

  const dispatch = createEventDispatcher<{
    open: { link: Link; newTab: boolean };
    complete: Link;
    snooze: { link: Link; until: number };
    reference: Link;
    discard: Link;
    reveal: Link;
    dismissAsk: Link;
  }>();

  let menu: 'snooze' | 'more' | null = null;
  let snoozeAnchor: HTMLDivElement;
  let moreAnchor: HTMLDivElement;
  let failedIcon = false;

  $: asking = rec.reason.type === 'ask';
  $: askMinutes = rec.reason.type === 'ask' ? rec.reason.minutes : 0;
  $: time = timeLeft(activeMs, rec.effort);
  $: title = rec.link.title || rec.link.url;
  $: primaryLabel = rec.role === 'continue' ? t(CONTINUE_KEYS[rec.action]) : t(DO_NOW_KEYS[rec.action]);

  function open(event: MouseEvent): void {
    dispatch('open', { link: rec.link, newTab: event.metaKey || event.ctrlKey });
  }

  function toggle(name: 'snooze' | 'more'): void {
    menu = menu === name ? null : name;
  }

  function snooze(until: number): void {
    menu = null;
    dispatch('snooze', { link: rec.link, until });
  }

  function pick(event: 'reference' | 'reveal' | 'discard'): void {
    menu = null;
    dispatch(event, rec.link);
  }
</script>

<article class="hero" style:--collection={rec.collection.color ?? 'var(--text-tertiary)'}>
  <div class="orb" aria-hidden="true">
    <ProgressRing value={time.progress} size={104} />
    <span class="disc">
      {#if rec.link.favicon !== undefined && !failedIcon}
        <img src={rec.link.favicon} alt="" width="38" height="38" on:error={() => (failedIcon = true)} />
      {:else}
        <Icon name="globe" size={30} />
      {/if}
    </span>
    <span class="caption">{ringCaption(time, rec.effort)}</span>
  </div>

  <div class="body">
    <p class="context">
      <span class="dot"></span>
      <span>{t(CONTEXT_KEYS[rec.role], getCollectionDisplayName(rec.collection))}</span>
      {#if !asking}
        <span class="why">{reasonText(rec.reason)}</span>
      {/if}
    </p>
    <p class="instruction">
      <span class="verb">{t(ACTION_KEYS[rec.action])}</span>
      <span class="time">{timeText(time)}</span>
    </p>
    <button type="button" class="title" on:click={open}>
      <span>{title}</span>
      <Icon name="external" size={15} />
    </button>

    <div class="actions">
      {#if asking}
        <p class="question"><strong>{t('now_ask_question')}</strong> {t('now_ask_detail', askMinutes)}</p>
        <Button variant="primary" icon="check" on:click={() => dispatch('complete', rec.link)}>{t('nextup_ask_yes')}</Button>
        <Button on:click={() => dispatch('dismissAsk', rec.link)}>{t('nextup_ask_no')}</Button>
      {:else}
        <Button variant="primary" on:click={open}>{primaryLabel}</Button>
        <Button icon="check" on:click={() => dispatch('complete', rec.link)}>{t('progress_complete')}</Button>
      {/if}
      <span class="spacer"></span>
      <div class="anchor" bind:this={snoozeAnchor}>
        <IconButton icon="clock" label={t('progress_snooze')} expanded={menu === 'snooze'} on:click={() => toggle('snooze')} />
        {#if menu === 'snooze'}
          <Menu label={t('progress_snooze')} align="end" anchor={snoozeAnchor} on:close={() => (menu = null)}>
            <MenuItem on:select={() => snooze(tomorrow(Date.now()))}>{t('progress_snooze_tomorrow')}</MenuItem>
            <MenuItem on:select={() => snooze(nextMonday(Date.now()))}>{t('progress_snooze_next_week')}</MenuItem>
          </Menu>
        {/if}
      </div>
      <div class="anchor" bind:this={moreAnchor}>
        <IconButton icon="more" label={t('progress_more')} expanded={menu === 'more'} on:click={() => toggle('more')} />
        {#if menu === 'more'}
          <Menu label={t('progress_more')} align="end" anchor={moreAnchor} on:close={() => (menu = null)}>
            <MenuItem icon="reference" on:select={() => pick('reference')}>{t('progress_mark_reference')}</MenuItem>
            <MenuItem icon="eye" on:select={() => pick('reveal')}>{t('progress_reveal')}</MenuItem>
            <MenuItem icon="trash" danger on:select={() => pick('discard')}>{t('progress_discard')}</MenuItem>
          </Menu>
        {/if}
      </div>
    </div>
  </div>
</article>

<style>
  .hero {
    position: relative;
    display: grid;
    grid-template-columns: 104px minmax(0, 1fr);
    gap: var(--space-5);
    height: 100%;
    padding: var(--space-5) var(--space-5) 20px;
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-xl);
    background:
      radial-gradient(600px 220px at 0% 0%, color-mix(in srgb, var(--collection) 16%, transparent), transparent 70%),
      var(--surface-elevated);
    box-shadow: var(--shadow-lift);
  }

  .orb {
    position: relative;
    width: 104px;
    height: 104px;
  }

  .disc {
    position: absolute;
    inset: 9px;
    display: grid;
    place-items: center;
    border-radius: 50%;
    background: color-mix(in srgb, var(--collection) 18%, var(--surface-tile));
    color: var(--text-tertiary);
  }

  .disc img {
    border-radius: 9px;
    object-fit: contain;
  }

  .caption {
    position: absolute;
    top: calc(100% + 8px);
    left: -8px;
    right: -8px;
    text-align: center;
    font-size: var(--text-xs);
    color: var(--text-tertiary);
    font-variant-numeric: tabular-nums;
  }

  .body {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  .context {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    margin: 0;
    font-size: var(--text-xs);
    color: var(--text-secondary);
  }

  .dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: var(--collection);
  }

  .why {
    margin-left: auto;
    color: var(--text-tertiary);
    white-space: nowrap;
  }

  .instruction {
    display: flex;
    align-items: baseline;
    gap: 14px;
    margin: 12px 0 0;
  }

  .verb {
    font: 600 var(--text-display) / 0.9 var(--font-display);
    letter-spacing: -0.025em;
    color: var(--text-primary);
  }

  .time {
    font-size: 17px;
    color: var(--text-secondary);
  }

  .title {
    display: inline-flex;
    align-items: baseline;
    gap: 6px;
    max-width: 640px;
    margin-top: 10px;
    padding: 0;
    border: none;
    background: transparent;
    color: var(--text-primary);
    font: 500 19px / 1.35 var(--font-body);
    letter-spacing: -0.01em;
    text-align: left;
    cursor: pointer;
  }

  .title span {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    overflow-wrap: anywhere;
  }

  .title :global(svg) {
    color: var(--text-tertiary);
  }

  .title:hover span {
    text-decoration: underline;
    text-decoration-color: var(--border-strong);
    text-underline-offset: 3px;
  }

  .actions {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: var(--space-2);
    margin-top: auto;
    padding-top: 18px;
  }

  .question {
    margin: 0 var(--space-2) 0 0;
    font-size: 13.5px;
    color: var(--text-secondary);
  }

  .question strong {
    color: var(--text-primary);
    font-weight: 600;
  }

  .spacer {
    flex: 1;
  }

  .anchor {
    position: relative;
  }
</style>
```

- [ ] **Step 6: Write `NowLater.svelte`**

```svelte
<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { getCollectionDisplayName, plural, t } from '@/lib/i18n';
  import type { Link } from '@/lib/types';
  import type { Recommendation } from '@/lib/recommend/engine';
  import Icon from '@/shared/components/ui/Icon.svelte';
  import IconButton from '@/shared/components/ui/IconButton.svelte';
  import Kbd from '@/shared/components/ui/Kbd.svelte';
  import LinkTile from '@/shared/components/ui/LinkTile.svelte';
  import { ACTION_KEYS, effortText } from '../next-up-labels';

  export let recs: Recommendation[];
  export let triageCount = 0;
  /** The link just completed from Now, while Undo is offered. */
  export let justCompleted: Link | null = null;
  /** Inside a Focus session: other title, and "end" instead of "plan". */
  export let inSession = false;

  const dispatch = createEventDispatcher<{
    open: { link: Link; newTab: boolean };
    complete: Link;
    openTriage: void;
    openFocus: void;
    endSession: void;
    undo: Link;
  }>();
</script>

<aside class="later" aria-labelledby="now-later-title">
  <h3 id="now-later-title">{inSession ? t('now_later_session') : t('now_later')}</h3>

  {#each recs as rec (rec.link.id)}
    <div class="row">
      <button type="button" class="row-main" on:click={(event) => dispatch('open', { link: rec.link, newTab: event.metaKey || event.ctrlKey })}>
        <LinkTile link={rec.link} size={36} />
        <span class="row-text">
          <span class="row-do"><strong>{t(ACTION_KEYS[rec.action])}</strong> {effortText(rec.effort)} · {getCollectionDisplayName(rec.collection)}</span>
          <span class="row-title">{rec.link.title || rec.link.url}</span>
        </span>
      </button>
      <span class="row-check">
        <IconButton icon="check" size="sm" tone="success" label={t('progress_complete')} on:click={() => dispatch('complete', rec.link)} />
      </span>
    </div>
  {/each}

  {#if recs.length > 0}
    <hr />
  {/if}

  {#if justCompleted !== null}
    <div class="act done">
      <span class="act-icon"><Icon name="check" size={18} /></span>
      <span class="act-text">{t('now_just_completed', justCompleted.title || justCompleted.url)}</span>
      <button type="button" class="act-link" on:click={() => justCompleted !== null && dispatch('undo', justCompleted)}>{t('progress_undo')}</button>
    </div>
  {/if}

  {#if triageCount > 0}
    <button type="button" class="act" on:click={() => dispatch('openTriage')}>
      <span class="act-icon warning"><Icon name="alert" size={18} /></span>
      <span class="act-text">{plural(triageCount, 'now_triage_one', 'now_triage_many')}</span>
      <Icon name="chevron-right" size={14} />
    </button>
  {/if}

  {#if inSession}
    <button type="button" class="act" on:click={() => dispatch('endSession')}>
      <span class="act-icon accent"><Icon name="target" size={18} /></span>
      <span class="act-text">{t('now_end_session')}</span>
      <Icon name="chevron-right" size={14} />
    </button>
  {:else}
    <button type="button" class="act" on:click={() => dispatch('openFocus')}>
      <span class="act-icon accent"><Icon name="target" size={18} /></span>
      <span class="act-text">{t('now_plan_session')}</span>
      <span class="act-hint" aria-hidden="true"><Kbd>F</Kbd></span>
      <Icon name="chevron-right" size={14} />
    </button>
  {/if}
</aside>

<style>
  .later {
    display: flex;
    flex-direction: column;
    padding: var(--space-2);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-xl);
    background: var(--surface-elevated);
    box-shadow: var(--shadow-lift);
    min-width: 0;
  }

  h3 {
    margin: var(--space-2) 10px 6px;
    font: 600 var(--text-xs) / 1.2 var(--font-body);
    color: var(--text-tertiary);
  }

  .row {
    position: relative;
    display: flex;
    align-items: center;
    border-radius: 12px;
  }

  .row:hover {
    background: var(--state-hover);
  }

  .row-main {
    display: grid;
    grid-template-columns: 36px minmax(0, 1fr);
    align-items: center;
    gap: var(--space-3);
    flex: 1;
    min-width: 0;
    padding: 9px 10px;
    border: none;
    background: transparent;
    color: inherit;
    font: inherit;
    text-align: left;
    cursor: pointer;
  }

  .row-text {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  .row-do {
    font-size: var(--text-xs);
    color: var(--text-secondary);
  }

  .row-do strong {
    color: var(--text-primary);
    font-weight: 600;
  }

  .row-title {
    margin-top: 2px;
    font: 500 13.5px / 1.3 var(--font-body);
    color: var(--text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .row-check {
    padding-right: 6px;
    opacity: 0;
    transition: opacity var(--duration-fast) var(--ease-out);
  }

  .row:hover .row-check,
  .row:focus-within .row-check {
    opacity: 1;
  }

  hr {
    margin: 4px 10px;
    border: 0;
    border-top: 1px solid var(--border-subtle);
  }

  .act {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    padding: 9px 10px;
    border: none;
    border-radius: 12px;
    background: transparent;
    color: var(--text-secondary);
    font: 400 var(--text-sm) / 1.2 var(--font-body);
    text-align: left;
    cursor: pointer;
  }

  button.act:hover {
    background: var(--state-hover);
    color: var(--text-primary);
  }

  .act-icon {
    display: grid;
    place-items: center;
    width: 36px;
  }

  .act-icon.warning {
    color: var(--semantic-warning);
  }

  .act-icon.accent {
    color: var(--accent-primary);
  }

  .done .act-icon {
    color: var(--semantic-success);
  }

  .act-text {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .act-hint {
    display: inline-flex;
  }

  .act-link {
    padding: 0;
    border: none;
    background: transparent;
    color: var(--text-secondary);
    font: 500 var(--text-sm) / 1 var(--font-body);
    text-decoration: underline;
    text-underline-offset: 3px;
    cursor: pointer;
  }
</style>
```

- [ ] **Step 7: Write `NowSection.svelte`**

```svelte
<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { fade } from 'svelte/transition';
  import { plural, t } from '@/lib/i18n';
  import type { Activity, Link } from '@/lib/types';
  import type { Queue } from '@/lib/recommend/engine';
  import { completedThisWeek, weekDots } from '@/lib/recommend/progress';
  import Button from '@/shared/components/ui/Button.svelte';
  import IconButton from '@/shared/components/ui/IconButton.svelte';
  import { ACTION_KEYS } from '../next-up-labels';
  import NowHero from './NowHero.svelte';
  import NowLater from './NowLater.svelte';

  export let queue: Queue;
  /** Every link, for the week dots. */
  export let links: Link[];
  export let activity: Activity;
  export let now: number;
  export let collapsed = false;
  export let justCompleted: Link | null = null;

  const dispatch = createEventDispatcher<{ toggleCollapsed: void; openTriage: void }>();

  $: hero = queue.slots[0];
  $: later = queue.slots.slice(1);
  $: dots = weekDots(links, now);
  $: weekText = plural(completedThisWeek(links, now), 'focus_week_one', 'focus_week_many');
</script>

<section class="now" aria-labelledby="now-title">
  <header class="now-head">
    <h2 id="now-title">{t('now_title')}</h2>
    <span class="toggle" class:collapsed>
      <IconButton icon="chevron-down" size="sm" label={t('now_toggle')} expanded={!collapsed} on:click={() => dispatch('toggleCollapsed')} />
    </span>
    {#if collapsed && hero !== undefined}
      <button type="button" class="summary" on:click={() => dispatch('toggleCollapsed')}>
        <strong>{t(ACTION_KEYS[hero.action])}</strong> {hero.link.title || hero.link.url}
      </button>
    {/if}
    <div class="week">
      <span class="dots" aria-hidden="true">
        {#each dots as dot (dot.day)}
          <i class:done={dot.done} class:today={dot.today}></i>
        {/each}
      </span>
      <span>{weekText}</span>
    </div>
  </header>

  {#if !collapsed}
    {#if hero === undefined}
      <div class="empty">
        {#if queue.triage.length > 0}
          <p class="empty-title">{t('now_only_triage', queue.triage.length)}</p>
          <Button variant="primary" icon="alert" on:click={() => dispatch('openTriage')}>{t('now_triage_now')}</Button>
        {:else}
          <p class="empty-title">{t('now_empty_title')}</p>
          <p class="empty-body">{t('now_empty_body')}</p>
        {/if}
      </div>
    {:else}
      <div class="grid">
        {#key hero.link.id}
          <div class="hero-slot" in:fade={{ duration: 220 }}>
            <NowHero
              rec={hero}
              activeMs={activity[hero.link.id]?.activeMs ?? 0}
              on:open
              on:complete
              on:snooze
              on:reference
              on:discard
              on:reveal
              on:dismissAsk
            />
          </div>
        {/key}
        <NowLater
          recs={later}
          triageCount={queue.triage.length}
          {justCompleted}
          on:open
          on:complete
          on:openTriage
          on:openFocus
          on:undo
        />
      </div>
    {/if}
  {/if}
</section>

<style>
  .now {
    padding: var(--space-5) 32px 30px;
  }

  .now-head {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    margin-bottom: var(--space-3);
  }

  h2 {
    margin: 0;
    font: 650 15px / 1 var(--font-body);
    color: var(--text-primary);
  }

  .toggle :global(svg) {
    transition: transform var(--duration-fast) var(--ease-out);
  }

  .toggle.collapsed :global(svg) {
    transform: rotate(-90deg);
  }

  .summary {
    min-width: 0;
    padding: 0;
    border: none;
    background: transparent;
    color: var(--text-secondary);
    font: 400 var(--text-sm) / 1.2 var(--font-body);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    cursor: pointer;
  }

  .summary strong {
    color: var(--text-primary);
    font-weight: 600;
  }

  .week {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-left: auto;
    font-size: 12.5px;
    color: var(--text-secondary);
    white-space: nowrap;
  }

  .dots {
    display: flex;
    gap: 4px;
  }

  .dots i {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--border-default);
  }

  .dots i.done {
    background: var(--semantic-success);
  }

  .dots i.today {
    box-shadow: 0 0 0 2px var(--surface-base), 0 0 0 3px var(--border-strong);
  }

  .grid {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 400px;
    gap: 14px;
  }

  .hero-slot {
    min-width: 0;
  }

  .empty {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: var(--space-3);
    padding: var(--space-5);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-xl);
    background: var(--surface-elevated);
  }

  .empty-title {
    margin: 0;
    font: 600 34px / 1 var(--font-display);
    letter-spacing: -0.02em;
    color: var(--text-primary);
  }

  .empty-body {
    margin: 0;
    font-size: var(--text-base);
    color: var(--text-secondary);
  }

  @media (max-width: 1279px) {
    .grid {
      grid-template-columns: minmax(0, 1fr) 320px;
    }
  }

  @media (max-width: 1023px) {
    .grid {
      grid-template-columns: minmax(0, 1fr);
    }
  }
</style>
```

- [ ] **Step 8: Wire it in the page and remove the strip**

In `src/newtab/App.svelte`:

1. Replace `import NextUpStrip from './components/NextUpStrip.svelte';` with `import NowSection from './components/NowSection.svelte';`.
2. After `let lastDiscarded: Link | null = null;` add:

```ts
  /** The link just completed from Now, while its Undo row shows. */
  let justCompleted: Link | null = null;
  let justCompletedTimer: ReturnType<typeof setTimeout> | undefined;

  async function handleNowComplete(event: CustomEvent<Link>): Promise<void> {
    await progress.completeLink(event.detail);
    justCompleted = event.detail;
    clearTimeout(justCompletedTimer);
    justCompletedTimer = setTimeout(() => (justCompleted = null), 10_000);
  }

  async function handleUndoComplete(event: CustomEvent<Link>): Promise<void> {
    clearTimeout(justCompletedTimer);
    justCompleted = null;
    await progress.restoreLink(event.detail);
  }
```

and add `clearTimeout(justCompletedTimer);` inside `onDestroy`.

3. Replace the whole `{#if $settingsStore.settings.showNextUp} <NextUpStrip ... /> {/if}` block with:

```svelte
        {#if $settingsStore.settings.showNextUp}
          <NowSection
            {queue}
            links={$linksStore.links}
            activity={$activityStore.activity}
            {now}
            collapsed={$settingsStore.settings.nextUpCollapsed}
            {justCompleted}
            on:open={handleOpen}
            on:complete={handleNowComplete}
            on:snooze={handleSnooze}
            on:reference={handleMarkReference}
            on:discard={handleDiscard}
            on:reveal={handleReveal}
            on:dismissAsk={handleDismissAsk}
            on:undo={handleUndoComplete}
            on:toggleCollapsed={() => settingsStore.setNextUpCollapsed(!$settingsStore.settings.nextUpCollapsed)}
            on:openTriage={() => openFocus('triage')}
            on:openFocus={() => openFocus(null)}
          />
        {/if}
```

(Task 9 points `openTriage` to the triage layer.)

4. Delete the strip and card, and the keys only they used:

```bash
git rm src/newtab/components/NextUpStrip.svelte src/newtab/components/NextUpCard.svelte src/test/components/NextUpStrip.test.ts src/test/components/NextUpCard.test.ts
/usr/bin/grep -rn "nextup_title\|nextup_triage_\|nextup_role_" src --include='*.ts' --include='*.svelte'
docker compose run --rm app node scripts/i18n/keys.mjs remove nextup_title nextup_triage_one nextup_triage_many nextup_role_continue nextup_role_advance nextup_role_revive
```

Expected: the `grep` prints nothing (if it prints a line, that key is still used: keep it out of the `remove` list and ledger it). `nextup_empty` stays: the Focus fronts use it until Task 12.

- [ ] **Step 9: Run the tests of this task**

Run: `docker compose run --rm app npx vitest run src/test/components/NowHero.test.ts src/test/components/NowLater.test.ts src/test/components/NowSection.test.ts src/test/newtab src/test/lib/locales.test.ts`
Expected: PASS.

- [ ] **Step 10: Suite, lint, size, look**

```bash
make test && make lint
make build && docker compose run --rm -T app du -sb dist
make preview
```

Expected: tests pass; 12 old lint errors; `du` ≤ 573440. In the preview (1440 and 1024, dark and light): "Agora" with the week dots on the right; the main card with the ring around the YouTube favicon ("18 de ~20 min"), "Continuar em Machine learning", "Assistir" in the condensed face, "Já terminou? Você ficou 18 min nesta aba." with "Sim, concluí" in coral; "Depois" with two rows, "Triar 2 links parados" and "Planejar uma sessão F". At 1024 px, Depois goes under the card. Completing from the card swaps it by a fade and shows "…, concluído agora — Desfazer". `make preview-stop`.

- [ ] **Step 11: Commit**

```bash
git add src/newtab/components/NowSection.svelte src/newtab/components/NowHero.svelte src/newtab/components/NowLater.svelte src/newtab/next-up-labels.ts src/newtab/App.svelte src/test/components/NowHero.test.ts src/test/components/NowLater.test.ts src/test/components/NowSection.test.ts src/test/lib/locales.test.ts src/test/newtab/next-up-labels.test.ts public/_locales/en/messages.json public/_locales/pt_BR/messages.json
git commit -m "feat(now): one main recommendation with time left and the question, the next ones beside it, the week in dots

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

### Task 9: The triage layer

**Files:**
- Create: `src/shared/focus-trap.ts`, `src/newtab/components/TriageOverlay.svelte`, `src/newtab/components/FocusTriagePanel.svelte`; `src/test/shared/focus-trap.test.ts`, `src/test/components/TriageOverlay.test.ts`, `src/test/components/FocusTriagePanel.test.ts`
- Modify: `src/newtab/components/FocusView.svelte`, `src/newtab/App.svelte`, `src/test/components/FocusView.test.ts`
- Delete: `src/newtab/components/FocusTriage.svelte`, `src/test/components/FocusTriage.test.ts`
- Locales: add `triage_progress`, `triage_open`, `triage_reference`, `triage_done_title`, `triage_count_kept_one|many`, `triage_count_discarded_one|many`, `triage_count_reference_one|many`, `triage_count_completed_one|many`, `focus_triage_waiting_one|many`; remove `triage_left_one`, `triage_left_many`

**Interfaces:**
- Consumes: `buildTriage`, `TriageItem` (`src/lib/recommend/triage.ts`); `TRIAGE_KEYS`, `collectionPath`; `Button`, `Icon`, `Kbd`, `LinkTile`; `isEditable` (`src/newtab/shortcuts.ts`).
- Produces:
  - `trapFocus(node: HTMLElement): { destroy(): void }` (Svelte action).
  - `<TriageOverlay items workspaces links>`; dispatches `keep`, `discard`, `reference`, `complete` (with the `Link`), `open {link,newTab}` and `close`.
  - `<FocusTriagePanel items>`; dispatches `openTriage`.
  - `FocusView` dispatches `openTriage` and loses the `keyboard` prop.

- [ ] **Step 1: Locale keys**

`.superpowers/sdd/2026-09-25-nova-interface/keys-9-add.json`:

```json
{
  "triage_progress": { "en": "$1 of $2", "pt_BR": "$1 de $2", "placeholders": { "index": "$1", "total": "$2" } },
  "triage_open": { "en": "Open to decide", "pt_BR": "Abrir para decidir" },
  "triage_reference": { "en": "Reference", "pt_BR": "Referência" },
  "triage_done_title": { "en": "Triage done.", "pt_BR": "Triagem feita." },
  "triage_count_kept_one": { "en": "1 kept", "pt_BR": "1 mantido" },
  "triage_count_kept_many": { "en": "$1 kept", "pt_BR": "$1 mantidos", "placeholders": { "count": "$1" } },
  "triage_count_discarded_one": { "en": "1 discarded", "pt_BR": "1 descartado" },
  "triage_count_discarded_many": { "en": "$1 discarded", "pt_BR": "$1 descartados", "placeholders": { "count": "$1" } },
  "triage_count_reference_one": { "en": "1 now reference", "pt_BR": "1 virou referência" },
  "triage_count_reference_many": { "en": "$1 now reference", "pt_BR": "$1 viraram referência", "placeholders": { "count": "$1" } },
  "triage_count_completed_one": { "en": "1 completed", "pt_BR": "1 concluído" },
  "triage_count_completed_many": { "en": "$1 completed", "pt_BR": "$1 concluídos", "placeholders": { "count": "$1" } },
  "focus_triage_waiting_one": { "en": "1 link waiting for a decision", "pt_BR": "1 link esperando decisão" },
  "focus_triage_waiting_many": { "en": "$1 links waiting for a decision", "pt_BR": "$1 links esperando decisão", "placeholders": { "count": "$1" } }
}
```

```bash
docker compose run --rm app node scripts/i18n/keys.mjs add .superpowers/sdd/2026-09-25-nova-interface/keys-9-add.json
```

- [ ] **Step 2: Write the failing tests**

`src/test/shared/focus-trap.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { fireEvent } from '@testing-library/svelte';
import { trapFocus } from '@/shared/focus-trap';

function dialog(): { root: HTMLDivElement; first: HTMLButtonElement; last: HTMLButtonElement } {
  const root = document.createElement('div');
  root.innerHTML = '<button>first</button><button tabindex="-1">skipped</button><button>last</button>';
  document.body.appendChild(root);
  const [first, , last] = [...root.querySelectorAll('button')];
  return { root, first, last };
}

describe('trapFocus', () => {
  it('keeps Tab inside the dialog in both directions', async () => {
    const { root, first, last } = dialog();
    const trap = trapFocus(root);

    last.focus();
    await fireEvent.keyDown(last, { key: 'Tab' });
    expect(document.activeElement).toBe(first);
    await fireEvent.keyDown(first, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(last);

    trap.destroy();
    root.remove();
  });

  it('gives the focus back to what had it before', () => {
    const outside = document.createElement('button');
    document.body.appendChild(outside);
    outside.focus();
    const { root, first } = dialog();
    const trap = trapFocus(root);
    first.focus();

    trap.destroy();

    expect(document.activeElement).toBe(outside);
    root.remove();
    outside.remove();
  });
});
```

`src/test/components/TriageOverlay.test.ts`:

```ts
/**
 * The triage layer: one decision at a time, by button or key (spec §9).
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import TriageOverlay from '@/newtab/components/TriageOverlay.svelte';
import { buildTriage } from '@/lib/recommend/triage';
import { createMockCollection, createMockLink } from '../factories';

const DAY = 86_400_000;
const now = Date.now();
const collection = createMockCollection({ id: 'c', name: 'Leituras' });
const old = createMockLink({ id: 'old', title: 'Old essay', collectionId: 'c', createdAt: now - 90 * DAY });
const older = createMockLink({ id: 'older', title: '', url: 'file:///notes/x.html', collectionId: 'c', createdAt: now - 120 * DAY });
const items = buildTriage([old, older], new Map([['c', collection]]), {}, now);

describe('TriageOverlay', () => {
  it('shows one link at a time, why it is here and how far along the triage is', () => {
    render(TriageOverlay, { props: { items } });

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('triage_reason_stale')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'file:///notes/x.html' })).toBeInTheDocument();
    expect(screen.getByText('triage_progress')).toBeInTheDocument();
    expect(screen.queryByText('Old essay')).toBeNull();
  });

  it.each([['1', 'keep'], ['2', 'discard'], ['3', 'reference'], ['4', 'complete']])('key %s decides %s', async (key, event) => {
    const handler = vi.fn();
    render(TriageOverlay, { props: { items }, events: { [event]: handler } });

    await fireEvent.keyDown(window, { key });

    expect(handler.mock.calls[0][0].detail.id).toBe('older');
  });

  it('decides with the buttons too', async () => {
    const keep = vi.fn();
    render(TriageOverlay, { props: { items }, events: { keep } });

    await fireEvent.click(screen.getByRole('button', { name: /triage_keep/ }));

    expect(keep).toHaveBeenCalledTimes(1);
  });

  it('never decides the same link twice while the list catches up', async () => {
    const keep = vi.fn();
    const discard = vi.fn();
    render(TriageOverlay, { props: { items }, events: { keep, discard } });

    await fireEvent.keyDown(window, { key: '1' });
    await fireEvent.keyDown(window, { key: '2' });

    expect(keep.mock.calls[0][0].detail.id).toBe('older');
    expect(discard.mock.calls[0][0].detail.id).toBe('old');
  });

  it('ignores the keys while typing in a field', async () => {
    const keep = vi.fn();
    render(TriageOverlay, { props: { items }, events: { keep } });
    const input = document.createElement('input');
    document.body.appendChild(input);

    await fireEvent.keyDown(input, { key: '1' });

    input.remove();
    expect(keep).not.toHaveBeenCalled();
  });

  it('ignores the keys while another dialog or a menu is open', async () => {
    const keep = vi.fn();
    render(TriageOverlay, { props: { items }, events: { keep } });
    const menu = document.createElement('div');
    menu.setAttribute('role', 'menu');
    document.body.appendChild(menu);

    await fireEvent.keyDown(window, { key: '1' });

    menu.remove();
    expect(keep).not.toHaveBeenCalled();
  });

  it('a held key decides only once', async () => {
    const discard = vi.fn();
    render(TriageOverlay, { props: { items }, events: { discard } });

    await fireEvent.keyDown(window, { key: '2' });
    await fireEvent.keyDown(window, { key: '2', repeat: true });

    expect(discard).toHaveBeenCalledTimes(1);
  });

  it('keeps the opened link on screen, so the next decision is about it', async () => {
    const open = vi.fn();
    const discard = vi.fn();
    const { rerender } = render(TriageOverlay, { props: { items, links: [old, older] }, events: { open, discard } });

    await fireEvent.click(screen.getByRole('button', { name: 'file:///notes/x.html' }));
    // Opening renews the link, so it leaves the triage list.
    await rerender({ items: items.filter((item) => item.link.id !== 'older'), links: [old, older] });
    await fireEvent.keyDown(window, { key: '2' });

    expect(open.mock.calls[0][0].detail).toEqual({ link: older, newTab: true });
    expect(discard.mock.calls[0][0].detail.id).toBe('older');
  });

  it('sums up the decisions at the end', async () => {
    const { rerender } = render(TriageOverlay, { props: { items } });

    await fireEvent.keyDown(window, { key: '1' });
    await fireEvent.keyDown(window, { key: '4' });
    await rerender({ items: [] });

    expect(screen.getByText('triage_done_title')).toBeInTheDocument();
    expect(screen.getByText('triage_count_kept_one, triage_count_completed_one')).toBeInTheDocument();
  });

  it('closes with Escape and from its button', async () => {
    const close = vi.fn();
    render(TriageOverlay, { props: { items: [] }, events: { close } });

    expect(screen.getByText('triage_empty')).toBeInTheDocument();
    await fireEvent.keyDown(window, { key: 'Escape' });
    await fireEvent.click(screen.getByRole('button', { name: 'common_close' }));

    expect(close).toHaveBeenCalledTimes(2);
  });
});
```

`src/test/components/FocusTriagePanel.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import FocusTriagePanel from '@/newtab/components/FocusTriagePanel.svelte';
import { buildTriage } from '@/lib/recommend/triage';
import { createMockCollection, createMockLink } from '../factories';

const now = Date.now();
const collection = createMockCollection({ id: 'c', name: 'Leituras' });
const old = createMockLink({ id: 'old', title: 'Old essay', collectionId: 'c', createdAt: now - 90 * 86_400_000 });

describe('FocusTriagePanel', () => {
  it('previews the first link and opens the triage', async () => {
    const openTriage = vi.fn();
    render(FocusTriagePanel, { props: { items: buildTriage([old], new Map([['c', collection]]), {}, now) }, events: { openTriage } });

    expect(screen.getByText('Old essay')).toBeInTheDocument();
    expect(screen.getByText('focus_triage_waiting_one')).toBeInTheDocument();
    await fireEvent.click(screen.getByRole('button', { name: 'now_triage_now' }));

    expect(openTriage).toHaveBeenCalledTimes(1);
  });

  it('says when there is nothing to triage', () => {
    render(FocusTriagePanel, { props: { items: [] } });
    expect(screen.getByText('triage_empty')).toBeInTheDocument();
  });
});
```

In `src/test/components/FocusView.test.ts`, replace the test `'has the triage, fronts and completed sections'` so it no longer passes `keyboard` and expects the section `focus-triage` to contain the `now_triage_now` button when there is triage (or `triage_empty` when not); keep the other assertions.

- [ ] **Step 3: Run them to see them fail**

Run: `docker compose run --rm app npx vitest run src/test/shared/focus-trap.test.ts src/test/components/TriageOverlay.test.ts src/test/components/FocusTriagePanel.test.ts src/test/components/FocusView.test.ts`
Expected: FAIL — the modules do not exist.

- [ ] **Step 4: Write the focus trap**

`src/shared/focus-trap.ts`:

```ts
/** Svelte action: keeps Tab inside a dialog and gives the focus back when it closes. */
const FOCUSABLE = 'button:not([disabled]):not([tabindex="-1"]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function trapFocus(node: HTMLElement): { destroy: () => void } {
  const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;

  function handleKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Tab') {
      return;
    }
    const items = [...node.querySelectorAll<HTMLElement>(FOCUSABLE)];
    if (items.length === 0) {
      return;
    }
    const first = items[0];
    const last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  node.addEventListener('keydown', handleKeydown);
  return {
    destroy(): void {
      node.removeEventListener('keydown', handleKeydown);
      previous?.focus();
    },
  };
}
```

- [ ] **Step 5: Write `TriageOverlay.svelte`**

```svelte
<script lang="ts">
  import { createEventDispatcher, onMount, tick } from 'svelte';
  import { fly } from 'svelte/transition';
  import { plural, t } from '@/lib/i18n';
  import type { Link, Workspace } from '@/lib/types';
  import type { TriageItem } from '@/lib/recommend/triage';
  import { shortDate } from '@/lib/recommend/dates';
  import { extractDomain } from '@/lib/tabs';
  import Button from '@/shared/components/ui/Button.svelte';
  import Icon from '@/shared/components/ui/Icon.svelte';
  import Kbd from '@/shared/components/ui/Kbd.svelte';
  import LinkTile from '@/shared/components/ui/LinkTile.svelte';
  import { trapFocus } from '@/shared/focus-trap';
  import { isEditable } from '../shortcuts';
  import { TRIAGE_KEYS, collectionPath } from '../next-up-labels';

  export let items: TriageItem[];
  export let workspaces: Workspace[] = [];
  /** All links: an opened link leaves triage, but stays on screen until decided. */
  export let links: Link[] = [];

  const dispatch = createEventDispatcher<{
    keep: Link;
    discard: Link;
    reference: Link;
    complete: Link;
    open: { link: Link; newTab: boolean };
    close: void;
  }>();

  const DECISIONS = [
    { key: '1', event: 'keep', label: 'triage_keep', icon: 'keep' },
    { key: '2', event: 'discard', label: 'progress_discard', icon: 'trash' },
    { key: '3', event: 'reference', label: 'triage_reference', icon: 'reference' },
    { key: '4', event: 'complete', label: 'triage_already_done', icon: 'check' },
  ] as const;

  type Decision = (typeof DECISIONS)[number]['event'];

  /** Fixed when the layer opens: the progress counts against it. */
  const total = items.length;
  let counts: Record<Decision, number> = { keep: 0, discard: 0, reference: 0, complete: 0 };
  /** Decided here; skipped even before the list catches up. */
  let decidedIds = new Set<string>();
  /** The link opened from here: opening renews it, so it leaves `items`. */
  let pinned: TriageItem | null = null;
  let root: HTMLDivElement;

  $: decided = counts.keep + counts.discard + counts.reference + counts.complete;
  $: current = resolveCurrent(pinned, items, links, decidedIds);
  $: position = Math.min(decided + 1, Math.max(total, 1));
  $: summary = [
    counts.keep > 0 ? plural(counts.keep, 'triage_count_kept_one', 'triage_count_kept_many') : '',
    counts.discard > 0 ? plural(counts.discard, 'triage_count_discarded_one', 'triage_count_discarded_many') : '',
    counts.reference > 0 ? plural(counts.reference, 'triage_count_reference_one', 'triage_count_reference_many') : '',
    counts.complete > 0 ? plural(counts.complete, 'triage_count_completed_one', 'triage_count_completed_many') : '',
  ].filter((part) => part !== '').join(', ');

  function resolveCurrent(held: TriageItem | null, list: TriageItem[], all: Link[], done: Set<string>): TriageItem | undefined {
    if (held !== null && !done.has(held.link.id)) {
      const live = all.find((link) => link.id === held.link.id);
      if (live !== undefined && live.completedAt === undefined && live.reference !== true) {
        return list.find((item) => item.link.id === live.id) ?? { ...held, link: live };
      }
    }
    return list.find((item) => !done.has(item.link.id));
  }

  function decide(decision: Decision): void {
    if (current === undefined) {
      return;
    }
    const link = current.link;
    pinned = null;
    decidedIds = new Set([...decidedIds, link.id]);
    counts = { ...counts, [decision]: counts[decision] + 1 };
    dispatch(decision, link);
  }

  function open(item: TriageItem): void {
    pinned = item;
    dispatch('open', { link: item.link, newTab: true });
  }

  /** Another dialog or a menu owns the keyboard while it is open. */
  function otherLayerOpen(): boolean {
    return [...document.querySelectorAll('[role="dialog"], [role="menu"]')].some((element) => element !== root && !root.contains(element));
  }

  function handleKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      if (!otherLayerOpen()) {
        event.preventDefault();
        dispatch('close');
      }
      return;
    }
    if (event.repeat || current === undefined || isEditable(event.target)
      || event.metaKey || event.ctrlKey || event.altKey || otherLayerOpen()) {
      return;
    }
    const decision = DECISIONS.find((d) => d.key === event.key);
    if (decision !== undefined) {
      event.preventDefault();
      decide(decision.event);
    }
  }

  onMount(async () => {
    await tick();
    root.querySelector<HTMLElement>('.decision, .finished button')?.focus();
  });
</script>

<svelte:window on:keydown={handleKeydown} />

<div class="layer">
  <button type="button" class="scrim" tabindex="-1" aria-hidden="true" aria-label={t('common_close')} on:click={() => dispatch('close')}></button>

  <div class="triage" role="dialog" aria-modal="true" aria-labelledby="triage-title" bind:this={root} use:trapFocus>
    <header class="head">
      <h2 id="triage-title">{t('focus_triage_title')}</h2>
      <span class="bar" aria-hidden="true"><i style:width="{total === 0 ? 100 : (decided / total) * 100}%"></i></span>
      <span class="count">{t('triage_progress', position, Math.max(total, 1))}</span>
      <Kbd>esc</Kbd>
    </header>

    {#if current !== undefined}
      {@const item = current}
      <div class="stack">
        <div class="sheet back two" aria-hidden="true"></div>
        <div class="sheet back one" aria-hidden="true"></div>
        {#key item.link.id}
          <article class="sheet front" in:fly={{ y: 12, duration: 180 }} out:fly={{ y: -16, duration: 180 }}>
            <span class="why"><Icon name="alert" size={14} />{t(TRIAGE_KEYS[item.reason])}</span>
            <div class="what">
              <LinkTile link={item.link} size={56} />
              <div class="what-text">
                <button type="button" class="title" on:click={() => open(item)}>{item.link.title || item.link.url}</button>
                <p class="meta">
                  <span>{extractDomain(item.link.url).replace(/^www\./, '')}</span>
                  {#if item.collection !== undefined}
                    <span>{collectionPath(item.collection, workspaces)}</span>
                  {/if}
                  <span>{t('triage_saved_on', shortDate(item.link.createdAt))}</span>
                </p>
              </div>
            </div>
            <button type="button" class="open" on:click={() => open(item)}>
              <Icon name="external" size={15} />{t('triage_open')}
            </button>
          </article>
        {/key}
      </div>

      <div class="decisions">
        {#each DECISIONS as decision (decision.key)}
          <button type="button" class="decision {decision.event}" on:click={() => decide(decision.event)}>
            <Icon name={decision.icon} size={20} />
            <span>{t(decision.label)}</span>
            <Kbd>{decision.key}</Kbd>
          </button>
        {/each}
      </div>
    {:else}
      <div class="finished">
        <p class="finished-title">{total === 0 ? t('triage_empty') : t('triage_done_title')}</p>
        {#if summary !== ''}
          <p class="finished-counts">{summary}</p>
        {/if}
        <Button variant="primary" on:click={() => dispatch('close')}>{t('common_close')}</Button>
      </div>
    {/if}
  </div>
</div>

<style>
  .layer {
    position: fixed;
    inset: 0;
    z-index: 110;
    display: flex;
    justify-content: center;
    align-items: flex-start;
    padding: 110px var(--space-4) var(--space-4);
  }

  .scrim {
    position: absolute;
    inset: 0;
    border: none;
    background: var(--scrim);
    backdrop-filter: blur(6px) saturate(0.9);
    cursor: default;
  }

  .triage {
    position: relative;
    width: min(640px, 100%);
  }

  .head {
    display: flex;
    align-items: center;
    gap: 14px;
    margin-bottom: 18px;
    font-size: var(--text-sm);
    color: var(--text-secondary);
  }

  h2 {
    margin: 0;
    font: 650 22px / 1 var(--font-body);
    letter-spacing: -0.015em;
    color: var(--text-primary);
  }

  .bar {
    flex: 1;
    height: 4px;
    border-radius: 2px;
    background: var(--border-default);
    overflow: hidden;
  }

  .bar i {
    display: block;
    height: 100%;
    background: var(--semantic-warning);
    transition: width var(--duration-normal) var(--ease-out);
  }

  .count {
    font-variant-numeric: tabular-nums;
  }

  .stack {
    position: relative;
    height: 250px;
  }

  .sheet {
    position: absolute;
    inset: 0;
    border: 1px solid var(--border-default);
    border-radius: var(--radius-xl);
    background: var(--surface-elevated);
    box-shadow: var(--shadow-float);
  }

  .back.one {
    transform: translateY(12px) scale(0.96);
    opacity: 0.75;
  }

  .back.two {
    transform: translateY(24px) scale(0.92);
    opacity: 0.45;
  }

  .front {
    display: flex;
    flex-direction: column;
    padding: 28px 30px;
  }

  .why {
    display: inline-flex;
    align-self: flex-start;
    align-items: center;
    gap: var(--space-2);
    height: 28px;
    padding: 0 12px;
    border-radius: 14px;
    background: var(--warning-soft);
    color: var(--semantic-warning);
    font: 600 12.5px / 1 var(--font-body);
  }

  .what {
    display: flex;
    align-items: center;
    gap: 18px;
    margin-top: var(--space-5);
  }

  .what-text {
    min-width: 0;
  }

  .title {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    overflow-wrap: anywhere;
    padding: 0;
    border: none;
    background: transparent;
    color: var(--text-primary);
    font: 600 26px / 1.15 var(--font-display);
    letter-spacing: -0.02em;
    text-align: left;
    cursor: pointer;
  }

  .meta {
    display: flex;
    flex-wrap: wrap;
    gap: 14px;
    margin: var(--space-2) 0 0;
    font-size: var(--text-sm);
    color: var(--text-tertiary);
  }

  .open {
    display: inline-flex;
    align-items: center;
    align-self: flex-start;
    gap: var(--space-2);
    margin-top: auto;
    padding: 0;
    border: none;
    background: transparent;
    color: var(--text-secondary);
    font: 400 var(--text-sm) / 1 var(--font-body);
    cursor: pointer;
  }

  .open:hover {
    color: var(--text-primary);
  }

  .decisions {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 10px;
    margin-top: 44px;
  }

  .decision {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    padding: 14px var(--space-2) 12px;
    border: 1px solid var(--border-default);
    border-radius: var(--radius-lg);
    background: var(--surface-elevated);
    color: var(--text-primary);
    font: 550 var(--text-sm) / 1.2 var(--font-body);
    cursor: pointer;
    transition: border-color var(--duration-fast) var(--ease-out), background-color var(--duration-fast) var(--ease-out);
  }

  .decision:hover {
    border-color: var(--border-strong);
    background: var(--surface-overlay);
  }

  .keep :global(svg),
  .complete :global(svg) {
    color: var(--semantic-success);
  }

  .discard :global(svg) {
    color: var(--accent-primary);
  }

  .reference :global(svg) {
    color: var(--text-secondary);
  }

  .finished {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: var(--space-3);
    padding: 28px 30px;
    border: 1px solid var(--border-default);
    border-radius: var(--radius-xl);
    background: var(--surface-elevated);
    box-shadow: var(--shadow-float);
  }

  .finished-title {
    margin: 0;
    font: 600 34px / 1 var(--font-display);
    color: var(--text-primary);
  }

  .finished-counts {
    margin: 0;
    color: var(--text-secondary);
  }
</style>
```

- [ ] **Step 6: Write `FocusTriagePanel.svelte`**

```svelte
<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { plural, t } from '@/lib/i18n';
  import type { TriageItem } from '@/lib/recommend/triage';
  import Button from '@/shared/components/ui/Button.svelte';
  import LinkTile from '@/shared/components/ui/LinkTile.svelte';
  import { TRIAGE_KEYS } from '../next-up-labels';

  export let items: TriageItem[];

  const dispatch = createEventDispatcher<{ openTriage: void }>();

  $: first = items[0];
</script>

<section id="focus-triage" class="focus-section" aria-labelledby="focus-triage-title">
  <div class="focus-section-head">
    <h2 id="focus-triage-title">{t('focus_triage_title')}</h2>
    {#if items.length > 0}
      <span class="aside">{plural(items.length, 'focus_triage_waiting_one', 'focus_triage_waiting_many')}</span>
    {/if}
  </div>
  {#if first === undefined}
    <p class="focus-empty">{t('triage_empty')}</p>
  {:else}
    <div class="mini-stack">
      {#if items.length > 2}<span class="sheet s2" aria-hidden="true"></span>{/if}
      {#if items.length > 1}<span class="sheet s1" aria-hidden="true"></span>{/if}
      <div class="sheet s0">
        <LinkTile link={first.link} size={36} />
        <span class="text">
          <span class="why">{t(TRIAGE_KEYS[first.reason])}</span>
          <span class="title">{first.link.title || first.link.url}</span>
        </span>
      </div>
    </div>
    <Button on:click={() => dispatch('openTriage')}>{t('now_triage_now')}</Button>
  {/if}
</section>

<style>
  .aside {
    margin-left: auto;
    font-size: 12.5px;
    color: var(--text-tertiary);
  }

  .mini-stack {
    position: relative;
    height: 92px;
    margin-bottom: 14px;
  }

  .sheet {
    position: absolute;
    left: 0;
    right: 0;
    height: 76px;
    border: 1px solid var(--border-default);
    border-radius: 14px;
    background: var(--surface-overlay);
  }

  .s2 {
    top: 16px;
    transform: scale(0.94);
    opacity: 0.5;
  }

  .s1 {
    top: 8px;
    transform: scale(0.97);
    opacity: 0.8;
  }

  .s0 {
    top: 0;
    display: grid;
    grid-template-columns: 36px minmax(0, 1fr);
    align-items: center;
    gap: var(--space-3);
    padding: 0 14px;
  }

  .text {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  .why {
    font: 600 var(--text-xs) / 1.2 var(--font-body);
    color: var(--semantic-warning);
  }

  .title {
    margin-top: 2px;
    font: 500 var(--text-base) / 1.3 var(--font-body);
    color: var(--text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
</style>
```

- [ ] **Step 7: Use them in Focus and in the page**

In `src/newtab/components/FocusView.svelte`:

1. Replace `import FocusTriage from './FocusTriage.svelte';` with `import FocusTriagePanel from './FocusTriagePanel.svelte';` and add `import { createEventDispatcher } from 'svelte';`.
2. Delete `export let keyboard = true;` and the `scrollTo` function; add `const dispatch = createEventDispatcher<{ openTriage: void }>();`.
3. Replace the `<FocusSession ... on:openTriage={() => scrollTo('focus-triage')} />` handler with `on:openTriage={() => dispatch('openTriage')}`, and replace the `<FocusTriage ... />` element with `<FocusTriagePanel items={queue.triage} on:openTriage={() => dispatch('openTriage')} />`.
4. Add to the style block a shared head for sections (Task 13 restyles all sections):

```css
  .focus-view :global(.focus-section-head) {
    display: flex;
    align-items: center;
    gap: var(--space-3);
  }
```

In `src/newtab/App.svelte`:

1. Add `import TriageOverlay from './components/TriageOverlay.svelte';` and `let showTriage = false;` next to `let showSearch = false;`.
2. In `handleKeydown`: call `dashboardShortcut(event, showSearch || showTriage)`, and in the `closeLayer` branch set both `showSearch = false;` and `showTriage = false;`.
3. On `<FocusView ... />`: delete the `keyboard={...}` prop and add `on:openTriage={() => (showTriage = true)}`.
4. On `<NowSection ... />`: change `on:openTriage={() => openFocus('triage')}` to `on:openTriage={() => (showTriage = true)}`.
5. After the `{#if showSearch} ... {/if}` block add:

```svelte
{#if showTriage}
  <TriageOverlay
    items={queue.triage}
    workspaces={$workspacesStore.workspaces}
    links={$linksStore.links}
    on:keep={handleKeep}
    on:discard={handleDiscard}
    on:reference={handleMarkReference}
    on:complete={handleComplete}
    on:open={handleOpen}
    on:close={() => (showTriage = false)}
  />
{/if}
```

6. Delete the old triage and its keys:

```bash
git rm src/newtab/components/FocusTriage.svelte src/test/components/FocusTriage.test.ts
/usr/bin/grep -rn "triage_left_" src --include='*.ts' --include='*.svelte'
docker compose run --rm app node scripts/i18n/keys.mjs remove triage_left_one triage_left_many
```

Expected: the `grep` prints nothing.

- [ ] **Step 8: Run the tests of this task**

Run: `docker compose run --rm app npx vitest run src/test/shared/focus-trap.test.ts src/test/components/TriageOverlay.test.ts src/test/components/FocusTriagePanel.test.ts src/test/components/FocusView.test.ts src/test/newtab/shortcuts.test.ts src/test/lib/locales.test.ts`
Expected: PASS.

- [ ] **Step 9: Suite, lint, size, look**

```bash
make test && make lint
make build && docker compose run --rm -T app du -sb dist
make preview
```

Expected: tests pass; 12 old lint errors; `du` ≤ 573440. In the preview, "Triar 2 links parados" in Depois opens the layer over a blurred page: "Triagem", the amber bar, "1 de 2", the stacked cards, the amber reason, the title in the condensed face, and the four decisions with keys. Keys 1–4 decide; Esc closes; the end shows "Triagem feita." with the counts. Capture both themes. `make preview-stop`.

- [ ] **Step 10: Commit**

```bash
git add src/shared/focus-trap.ts src/newtab/components/TriageOverlay.svelte src/newtab/components/FocusTriagePanel.svelte src/newtab/components/FocusView.svelte src/newtab/App.svelte src/test/shared/focus-trap.test.ts src/test/components/TriageOverlay.test.ts src/test/components/FocusTriagePanel.test.ts src/test/components/FocusView.test.ts public/_locales/en/messages.json public/_locales/pt_BR/messages.json
git commit -m "feat(triage): its own layer from anywhere, one card at a time with progress and a summary at the end

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

## Stage 3 — ⌘K

### Task 10: Palette helpers: highlight, recently opened, commands and link actions

**Files:**
- Create: `src/lib/search/highlight.ts`, `src/lib/recommend/recent.ts`, `src/newtab/commands.ts`, `src/newtab/palette-actions.ts`; `src/test/lib/search/highlight.test.ts`, `src/test/lib/recommend/recent.test.ts`, `src/test/newtab/commands.test.ts`, `src/test/newtab/palette-actions.test.ts`
- Locales: add the `command_*` and `palette_action_*` keys below

**Interfaces:**
- Consumes: `parseQuery`, `normalizeWords` (`src/lib/search/text.ts`); `SessionMinutes`, `SESSION_OPTIONS` (`src/lib/recommend/session.ts`); `IconName` (Task 3); `altLabel` (Task 3).
- Produces:
  - `highlight(title: string, queries: string[]): Segment[]` with `Segment = { text: string; match: boolean }`.
  - `recentlyOpened(links: Link[], activity: Activity, exclude: ReadonlySet<string>, limit = 5): Link[]`.
  - `CommandAction = { type: 'triage' } | { type: 'startSession'; minutes: SessionMinutes } | { type: 'endSession' } | { type: 'view'; view: 'board' | 'focus' } | { type: 'newCollection' } | { type: 'workspace'; id: string } | { type: 'theme'; theme: 'light' | 'dark' } | { type: 'toggleNow'; show: boolean } | { type: 'settings' }`; `Command = { id: string; label: string; icon: IconName; action: CommandAction; tone?: 'warning' | 'accent'; hint?: string }`; `CommandContext = { triageCount: number; sessionActive: boolean; view: 'board' | 'focus'; workspaces: { id: string; name: string }[]; theme: 'light' | 'dark'; showNow: boolean }`; `buildCommands(context: CommandContext): Command[]`; `matchCommands(commands: Command[], query: string): Command[]`; `isCommandQuery(query: string): boolean`.
  - `PaletteActionId = 'open' | 'complete' | 'restore' | 'snooze' | 'move' | 'reveal' | 'discard'`; `PaletteAction = { id: PaletteActionId; icon: IconName; label: string; keys: string[]; danger?: boolean }`; `linkActions(link: Link): PaletteAction[]`.

- [ ] **Step 1: Locale keys**

`.superpowers/sdd/2026-09-25-nova-interface/keys-10-add.json`:

```json
{
  "command_start_session": { "en": "Start a $1 min session", "pt_BR": "Começar uma sessão de $1 min", "placeholders": { "minutes": "$1" } },
  "command_open_focus": { "en": "Open Focus", "pt_BR": "Abrir o Foco" },
  "command_back_to_board": { "en": "Back to the board", "pt_BR": "Voltar ao quadro" },
  "command_go_to_workspace": { "en": "Go to $1", "pt_BR": "Ir para $1", "placeholders": { "workspace": "$1" } },
  "command_theme_light": { "en": "Switch to the light theme", "pt_BR": "Mudar para o tema claro" },
  "command_theme_dark": { "en": "Switch to the dark theme", "pt_BR": "Mudar para o tema escuro" },
  "command_show_now": { "en": "Show Now", "pt_BR": "Mostrar Agora" },
  "command_hide_now": { "en": "Hide Now", "pt_BR": "Ocultar Agora" },
  "command_settings": { "en": "Open settings", "pt_BR": "Abrir configurações" },
  "palette_action_open": { "en": "Open", "pt_BR": "Abrir" },
  "palette_action_restore": { "en": "Restore", "pt_BR": "Restaurar" },
  "palette_action_move": { "en": "Move to…", "pt_BR": "Mover para…" }
}
```

```bash
docker compose run --rm app node scripts/i18n/keys.mjs add .superpowers/sdd/2026-09-25-nova-interface/keys-10-add.json
```

- [ ] **Step 2: Write the failing tests**

`src/test/lib/search/highlight.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { highlight } from '@/lib/search/highlight';

describe('highlight', () => {
  it('marks the words that start with a search term, ignoring accents and case', () => {
    expect(highlight('Ações de transformação', ['acoes transf'])).toEqual([
      { text: 'Ações', match: true },
      { text: ' de ', match: false },
      { text: 'transf', match: true },
      { text: 'ormação', match: false },
    ]);
  });

  it('marks the terms of every query, as the translated one', () => {
    expect(highlight('Knapsack tutorial', ['problema da mochila', 'knapsack'])).toEqual([
      { text: 'Knapsack', match: true },
      { text: ' tutorial', match: false },
    ]);
  });

  it('uses the longest term that fits a word', () => {
    expect(highlight('Transformers', ['trans transformer'])).toEqual([
      { text: 'Transformer', match: true },
      { text: 's', match: false },
    ]);
  });

  it('treats symbols in the query as plain text', () => {
    expect(highlight('C++ primer (2nd)', ['c++ ('])).toEqual([
      { text: 'C', match: true },
      { text: '++ primer (2nd)', match: false },
    ]);
  });

  it('leaves the title whole without terms', () => {
    expect(highlight('Anything', [''])).toEqual([{ text: 'Anything', match: false }]);
    expect(highlight('', ['x'])).toEqual([{ text: '', match: false }]);
  });
});
```

`src/test/lib/recommend/recent.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { recentlyOpened } from '@/lib/recommend/recent';
import { EMPTY_ACTIVITY } from '@/lib/types';
import { createMockLink } from '../../factories';

const opened = (at: number) => ({ ...EMPTY_ACTIVITY, opens: 1, lastOpenedAt: at });

describe('recentlyOpened', () => {
  const links = ['a', 'b', 'c', 'd'].map((id) => createMockLink({ id }));
  const activity = { a: opened(1), b: opened(3), c: opened(2) };

  it('lists pending opened links, newest first', () => {
    expect(recentlyOpened(links, activity, new Set()).map((link) => link.id)).toEqual(['b', 'c', 'a']);
  });

  it('skips completed links, the excluded ones and caps the list', () => {
    const done = links.map((link) => (link.id === 'b' ? { ...link, completedAt: 5 } : link));
    expect(recentlyOpened(done, activity, new Set(['c']), 1).map((link) => link.id)).toEqual(['a']);
  });
});
```

`src/test/newtab/commands.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { buildCommands, isCommandQuery, matchCommands, type CommandContext } from '@/newtab/commands';

const context: CommandContext = {
  triageCount: 2,
  sessionActive: false,
  view: 'board',
  workspaces: [{ id: 'w2', name: 'Trabalho' }],
  theme: 'dark',
  showNow: true,
};

describe('buildCommands', () => {
  it('lists what can be done now, in a fixed order', () => {
    expect(buildCommands(context).map((command) => command.id)).toEqual([
      'triage', 'session-15', 'session-30', 'session-60', 'view', 'new-collection', 'workspace-w2', 'theme', 'toggle-now', 'settings',
    ]);
  });

  it('says what each command does', () => {
    const byId = new Map(buildCommands(context).map((command) => [command.id, command]));

    expect(byId.get('triage')?.action).toEqual({ type: 'triage' });
    expect(byId.get('session-30')?.action).toEqual({ type: 'startSession', minutes: 30 });
    expect(byId.get('view')?.action).toEqual({ type: 'view', view: 'focus' });
    expect(byId.get('workspace-w2')?.action).toEqual({ type: 'workspace', id: 'w2' });
    expect(byId.get('theme')?.action).toEqual({ type: 'theme', theme: 'light' });
    expect(byId.get('toggle-now')?.action).toEqual({ type: 'toggleNow', show: false });
    expect(byId.get('view')?.hint).toBe('F');
    expect(byId.get('new-collection')?.hint).toBe('N');
  });

  it('adapts to the moment: no triage, a session running, Focus on screen, light theme, Now hidden', () => {
    const ids = buildCommands({ ...context, triageCount: 0, sessionActive: true, view: 'focus', theme: 'light', showNow: false });
    const byId = new Map(ids.map((command) => [command.id, command]));

    expect(byId.has('triage')).toBe(false);
    expect(byId.has('session-15')).toBe(false);
    expect(byId.get('end-session')?.action).toEqual({ type: 'endSession' });
    expect(byId.get('view')?.action).toEqual({ type: 'view', view: 'board' });
    expect(byId.get('theme')?.action).toEqual({ type: 'theme', theme: 'dark' });
    expect(byId.get('toggle-now')?.action).toEqual({ type: 'toggleNow', show: true });
  });
});

describe('matchCommands', () => {
  const commands = buildCommands(context);

  it('keeps the commands whose words start with every typed word', () => {
    expect(matchCommands(commands, 'theme').map((command) => command.id)).toEqual(['theme']);
    expect(matchCommands(commands, '> start sess').map((command) => command.id)).toEqual(['session-15', 'session-30', 'session-60']);
    expect(matchCommands(commands, 'zzz')).toEqual([]);
  });

  it('keeps every command for an empty query', () => {
    expect(matchCommands(commands, '>')).toHaveLength(commands.length);
  });
});

describe('isCommandQuery', () => {
  it('is a query that starts with >', () => {
    expect(isCommandQuery(' > tema')).toBe(true);
    expect(isCommandQuery('tema')).toBe(false);
  });
});
```

`src/test/newtab/palette-actions.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { linkActions } from '@/newtab/palette-actions';
import { createMockLink } from '../factories';

describe('linkActions', () => {
  it('offers everything for a pending link', () => {
    expect(linkActions(createMockLink()).map((action) => action.id)).toEqual(['open', 'complete', 'snooze', 'move', 'reveal', 'discard']);
  });

  it('offers to restore a completed link, and nothing to snooze', () => {
    expect(linkActions(createMockLink({ completedAt: 1 })).map((action) => action.id)).toEqual(['open', 'restore', 'move', 'reveal', 'discard']);
  });

  it('marks discard as dangerous and shows the keys of the shortcuts', () => {
    const actions = new Map(linkActions(createMockLink()).map((action) => [action.id, action]));
    expect(actions.get('discard')?.danger).toBe(true);
    expect(actions.get('open')?.keys).toEqual(['↵']);
    expect(actions.get('reveal')?.keys).toEqual(['⇧', '↵']);
  });
});
```

- [ ] **Step 3: Run them to see them fail**

Run: `docker compose run --rm app npx vitest run src/test/lib/search/highlight.test.ts src/test/lib/recommend/recent.test.ts src/test/newtab/commands.test.ts src/test/newtab/palette-actions.test.ts`
Expected: FAIL — the modules do not exist.

- [ ] **Step 4: Write the helpers**

`src/lib/search/highlight.ts`:

```ts
/**
 * The parts of a title that match the search (spec §8.3): a word matches
 * when it starts with a search term, as the engine matches by prefix.
 */
import { parseQuery } from './text';

export interface Segment {
  text: string;
  match: boolean;
}

function fold(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

/** How many characters of `word` hold its first `letters` folded letters. */
function prefixLength(word: string, letters: number): number {
  let folded = 0;
  let length = 0;
  for (const char of word) {
    if (folded >= letters) {
      break;
    }
    folded += fold(char).length;
    length += char.length;
  }
  return length;
}

export function highlight(title: string, queries: string[]): Segment[] {
  const terms = [...new Set(queries.flatMap((query) => parseQuery(query).terms.map((term) => term.norm)))];
  if (terms.length === 0 || title === '') {
    return [{ text: title, match: false }];
  }
  const segments: Segment[] = [];
  let last = 0;
  for (const found of title.matchAll(/[\p{L}\p{N}]+/gu)) {
    const word = found[0];
    const start = found.index ?? 0;
    const folded = fold(word);
    const term = terms.filter((candidate) => folded.startsWith(candidate)).sort((a, b) => b.length - a.length)[0];
    if (term === undefined) {
      continue;
    }
    const end = start + prefixLength(word, term.length);
    if (start > last) {
      segments.push({ text: title.slice(last, start), match: false });
    }
    segments.push({ text: title.slice(start, end), match: true });
    last = end;
  }
  if (last < title.length) {
    segments.push({ text: title.slice(last), match: false });
  }
  return segments;
}
```

`src/lib/recommend/recent.ts`:

```ts
/** Links opened lately, for the palette before typing (spec §8.1). */
import type { Activity, Link } from '@/lib/types';

export function recentlyOpened(links: Link[], activity: Activity, exclude: ReadonlySet<string>, limit = 5): Link[] {
  return links
    .filter((link) => link.completedAt === undefined && !exclude.has(link.id) && activity[link.id]?.lastOpenedAt !== undefined)
    .sort((a, b) => (activity[b.id]?.lastOpenedAt ?? 0) - (activity[a.id]?.lastOpenedAt ?? 0))
    .slice(0, limit);
}
```

`src/newtab/commands.ts`:

```ts
/** The commands of the palette (spec §8.2): a pure list, filtered by what is typed. */
import { plural, t } from '@/lib/i18n';
import { SESSION_OPTIONS, type SessionMinutes } from '@/lib/recommend/session';
import { normalizeWords } from '@/lib/search/text';
import type { IconName } from '@/shared/components/ui/icons';

export type CommandAction =
  | { type: 'triage' }
  | { type: 'startSession'; minutes: SessionMinutes }
  | { type: 'endSession' }
  | { type: 'view'; view: 'board' | 'focus' }
  | { type: 'newCollection' }
  | { type: 'workspace'; id: string }
  | { type: 'theme'; theme: 'light' | 'dark' }
  | { type: 'toggleNow'; show: boolean }
  | { type: 'settings' };

export interface Command {
  id: string;
  label: string;
  icon: IconName;
  action: CommandAction;
  tone?: 'warning' | 'accent';
  /** Key of the page shortcut that does the same. */
  hint?: string;
}

export interface CommandContext {
  triageCount: number;
  sessionActive: boolean;
  view: 'board' | 'focus';
  /** Workspaces other than the active one, with their display names. */
  workspaces: { id: string; name: string }[];
  /** The theme on screen. */
  theme: 'light' | 'dark';
  showNow: boolean;
}

export function buildCommands(context: CommandContext): Command[] {
  const commands: Command[] = [];
  if (context.triageCount > 0) {
    commands.push({
      id: 'triage',
      label: plural(context.triageCount, 'now_triage_one', 'now_triage_many'),
      icon: 'alert',
      tone: 'warning',
      action: { type: 'triage' },
    });
  }
  if (context.sessionActive) {
    commands.push({ id: 'end-session', label: t('now_end_session'), icon: 'target', tone: 'accent', action: { type: 'endSession' } });
  } else {
    for (const minutes of SESSION_OPTIONS) {
      commands.push({
        id: `session-${minutes}`,
        label: t('command_start_session', minutes),
        icon: 'target',
        tone: 'accent',
        action: { type: 'startSession', minutes },
      });
    }
  }
  commands.push(
    context.view === 'board'
      ? { id: 'view', label: t('command_open_focus'), icon: 'target', hint: 'F', action: { type: 'view', view: 'focus' } }
      : { id: 'view', label: t('command_back_to_board'), icon: 'board', hint: 'F', action: { type: 'view', view: 'board' } },
    { id: 'new-collection', label: t('newtab_new_collection'), icon: 'folder', hint: 'N', action: { type: 'newCollection' } },
  );
  for (const workspace of context.workspaces) {
    commands.push({
      id: `workspace-${workspace.id}`,
      label: t('command_go_to_workspace', workspace.name),
      icon: 'board',
      action: { type: 'workspace', id: workspace.id },
    });
  }
  commands.push(
    context.theme === 'dark'
      ? { id: 'theme', label: t('command_theme_light'), icon: 'sun', action: { type: 'theme', theme: 'light' } }
      : { id: 'theme', label: t('command_theme_dark'), icon: 'moon', action: { type: 'theme', theme: 'dark' } },
    context.showNow
      ? { id: 'toggle-now', label: t('command_hide_now'), icon: 'eye', action: { type: 'toggleNow', show: false } }
      : { id: 'toggle-now', label: t('command_show_now'), icon: 'eye', action: { type: 'toggleNow', show: true } },
    { id: 'settings', label: t('command_settings'), icon: 'gear', action: { type: 'settings' } },
  );
  return commands;
}

export function isCommandQuery(query: string): boolean {
  return /^\s*>/.test(query);
}

/** Commands whose words start with every typed word; a leading ">" is ignored. */
export function matchCommands(commands: Command[], query: string): Command[] {
  const words = normalizeWords(query.replace(/^\s*>/, ''));
  if (words.length === 0) {
    return commands;
  }
  return commands.filter((command) => {
    const label = normalizeWords(command.label);
    return words.every((word) => label.some((part) => part.startsWith(word)));
  });
}
```

`src/newtab/palette-actions.ts`:

```ts
/** What can be done to a link from the palette (spec §8.4). */
import { t } from '@/lib/i18n';
import type { Link } from '@/lib/types';
import type { IconName } from '@/shared/components/ui/icons';
import { altLabel } from '@/shared/platform';

export type PaletteActionId = 'open' | 'complete' | 'restore' | 'snooze' | 'move' | 'reveal' | 'discard';

export interface PaletteAction {
  id: PaletteActionId;
  icon: IconName;
  label: string;
  /** Keys of the shortcut, empty when there is none. */
  keys: string[];
  danger?: boolean;
}

export function linkActions(link: Link): PaletteAction[] {
  const pending = link.completedAt === undefined;
  const actions: PaletteAction[] = [
    { id: 'open', icon: 'external', label: t('palette_action_open'), keys: ['↵'] },
    pending
      ? { id: 'complete', icon: 'check', label: t('progress_complete'), keys: [altLabel(), '↵'] }
      : { id: 'restore', icon: 'undo', label: t('palette_action_restore'), keys: [altLabel(), '↵'] },
  ];
  if (pending) {
    actions.push({ id: 'snooze', icon: 'clock', label: t('progress_snooze_tomorrow'), keys: [] });
  }
  actions.push(
    { id: 'move', icon: 'move', label: t('palette_action_move'), keys: [] },
    { id: 'reveal', icon: 'eye', label: t('progress_reveal'), keys: ['⇧', '↵'] },
    { id: 'discard', icon: 'trash', label: t('progress_discard'), keys: [], danger: true },
  );
  return actions;
}
```

- [ ] **Step 5: Run them**

Run: `docker compose run --rm app npx vitest run src/test/lib/search/highlight.test.ts src/test/lib/recommend/recent.test.ts src/test/newtab/commands.test.ts src/test/newtab/palette-actions.test.ts src/test/lib/locales.test.ts`
Expected: PASS. (The command labels are the keys themselves under the mock, so `'theme'` matches `command_theme_light` word by word.)

- [ ] **Step 6: Commit**

```bash
git add src/lib/search/highlight.ts src/lib/recommend/recent.ts src/newtab/commands.ts src/newtab/palette-actions.ts src/test/lib/search/highlight.test.ts src/test/lib/recommend/recent.test.ts src/test/newtab/commands.test.ts src/test/newtab/palette-actions.test.ts public/_locales/en/messages.json public/_locales/pt_BR/messages.json
git commit -m "feat(palette): highlight by prefix, recently opened, commands and link actions as pure helpers

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

### Task 11: The command palette

**Files:**
- Create: `src/newtab/components/CommandPalette.svelte`, `src/newtab/components/PalettePreview.svelte`, `src/test/components/CommandPalette.test.ts`
- Modify: `src/newtab/App.svelte`
- Delete: `src/newtab/components/SearchPanel.svelte`, `src/test/components/SearchPanel.test.ts`
- Locales: add the `palette_*` and `search_scope_all`, `success_link_moved` keys below; remove `search_hint_keys`, `search_empty`, `search_completed_badge`

**Interfaces:**
- Consumes: `highlight` (Task 10), `recentlyOpened` (Task 10), `buildCommands`, `matchCommands`, `isCommandQuery`, `Command`, `CommandAction` (Task 10), `linkActions`, `PaletteActionId` (Task 10), `timeLeft` (Task 7), `timeText`, `ACTION_KEYS`, `collectionPath` (`next-up-labels.ts`), `trapFocus` (Task 9), primitives (Tasks 3–4), `buildIndex`, `search`, `SearchHit` (`src/lib/search/engine.ts`).
- Produces: `<CommandPalette links collections workspaces topicSearchHint translate queue activity commands wide>`; dispatches `open`, `openInNewTab`, `reveal`, `complete`, `restore`, `discard` (with the `Link`), `snooze {link, until}`, `move {link, collectionId}`, `command` (a `CommandAction`) and `close`.

- [ ] **Step 1: Locale keys**

`.superpowers/sdd/2026-09-25-nova-interface/keys-11-add.json`:

```json
{
  "search_scope_all": { "en": "All workspaces", "pt_BR": "Todos os workspaces" },
  "palette_all": { "en": "All", "pt_BR": "Tudo" },
  "palette_group_recent": { "en": "Recently opened", "pt_BR": "Abertos recentemente" },
  "palette_group_actions": { "en": "Actions", "pt_BR": "Ações" },
  "palette_empty": { "en": "Nothing found for “$1”.", "pt_BR": "Nada encontrado para “$1”.", "placeholders": { "query": "$1" } },
  "palette_key_navigate": { "en": "navigate", "pt_BR": "navegar" },
  "palette_key_open": { "en": "open", "pt_BR": "abrir" },
  "palette_key_new_tab": { "en": "new tab", "pt_BR": "nova aba" },
  "palette_key_complete": { "en": "complete", "pt_BR": "concluir" },
  "palette_key_actions": { "en": "link actions", "pt_BR": "ações do link" },
  "palette_key_close": { "en": "close", "pt_BR": "fechar" },
  "palette_preview_label": { "en": "Link details", "pt_BR": "Detalhes do link" },
  "palette_fact_collection": { "en": "Collection", "pt_BR": "Coleção" },
  "palette_fact_kind": { "en": "Kind", "pt_BR": "Tipo" },
  "palette_fact_saved": { "en": "Saved", "pt_BR": "Salvo" },
  "palette_fact_opened": { "en": "Opened", "pt_BR": "Aberto" },
  "palette_never": { "en": "never", "pt_BR": "nunca" },
  "palette_kind_effort": { "en": "$1, about $2 min", "pt_BR": "$1, uns $2 min", "placeholders": { "kind": "$1", "minutes": "$2" } },
  "palette_move_placeholder": { "en": "Move “$1” to…", "pt_BR": "Mover “$1” para…", "placeholders": { "title": "$1" } },
  "palette_move_empty": { "en": "No collection found.", "pt_BR": "Nenhuma coleção encontrada." },
  "palette_completed_on": { "en": "Completed on $1", "pt_BR": "Concluído em $1", "placeholders": { "date": "$1" } },
  "success_link_moved": { "en": "Moved to $1", "pt_BR": "Movido para $1", "placeholders": { "collection": "$1" } }
}
```

```bash
docker compose run --rm app node scripts/i18n/keys.mjs add .superpowers/sdd/2026-09-25-nova-interface/keys-11-add.json
```

- [ ] **Step 2: Write the failing tests**

`src/test/components/CommandPalette.test.ts`:

```ts
/**
 * The ⌘K palette (spec §8): search, suggestions before typing, commands,
 * and acting on a link without leaving it.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/svelte';
import { tick } from 'svelte';
import CommandPalette from '@/newtab/components/CommandPalette.svelte';
import { recommendation, type Queue } from '@/lib/recommend/engine';
import { buildCommands } from '@/newtab/commands';
import { EMPTY_ACTIVITY } from '@/lib/types';
import { createMockCollection, createMockLink, createMockWorkspace } from '../factories';

const workspaces = [createMockWorkspace({ id: 'ws-agents', name: 'Agentes' })];
const collections = [
  createMockCollection({ id: 'inbox', name: 'Inbox', order: 0, isDefault: true }),
  createMockCollection({ id: 'hermes', name: 'Hermes Agent', order: 1, workspaceId: 'ws-agents' }),
];
const links = [
  createMockLink({ id: 'video', title: 'Hermes harness talk', url: 'https://www.youtube.com/watch?v=a', collectionId: 'hermes', createdAt: 3 }),
  createMockLink({ id: 'repo', title: 'hermes-agent', url: 'https://github.com/nous/hermes-agent', collectionId: 'hermes', createdAt: 2, tags: ['agentes', 'harness'] }),
  createMockLink({ id: 'other', title: 'Other thing', url: 'https://example.com/x', collectionId: 'inbox', createdAt: 1 }),
];
const knapsack = createMockLink({ id: 'knapsack', title: 'Knapsack tutorial', url: 'https://cp.example/knapsack', collectionId: 'inbox', createdAt: 9 });

const EVENTS = ['open', 'openInNewTab', 'reveal', 'close', 'command', 'complete', 'restore', 'snooze', 'discard', 'move'] as const;
type Handlers = Record<(typeof EVENTS)[number], ReturnType<typeof vi.fn>>;

function setup(props: Record<string, unknown> = {}): { handlers: Handlers; input: HTMLElement } {
  const handlers = Object.fromEntries(EVENTS.map((name) => [name, vi.fn()])) as Handlers;
  render(CommandPalette, { props: { links, collections, workspaces, ...props }, events: handlers });
  return { handlers, input: screen.getByPlaceholderText('search_placeholder') };
}

async function type(input: HTMLElement, value: string): Promise<void> {
  await fireEvent.input(input, { target: { value } });
}

const optionTexts = (): string[] => screen.getAllByRole('option').map((option) => option.textContent ?? '');
const detailOf = (handler: ReturnType<typeof vi.fn>): unknown => (handler.mock.calls[0][0] as CustomEvent).detail;

describe('CommandPalette: search', () => {
  it('adds the translated query to the search when it arrives', async () => {
    const translate = vi.fn((query: string) => Promise.resolve(query.startsWith('problema da mochila') ? 'knapsack' : null));
    const { input } = setup({ links: [...links, knapsack], translate });

    await type(input, 'problema da mochila');

    await waitFor(() => expect(optionTexts()).toEqual([expect.stringContaining('Knapsack tutorial')]));
  });

  it('ignores a translation that arrives after the query changed', async () => {
    let release: (value: string) => void = () => {};
    const translate = vi.fn((query: string) =>
      (query === 'mochila' ? new Promise<string>((resolve) => { release = resolve; }) : Promise.resolve(null)));
    const { input } = setup({ links: [...links, knapsack], translate });

    await type(input, 'mochila');
    await type(input, 'hermes');
    release('knapsack');
    await tick();

    expect(optionTexts().some((text) => text.includes('Knapsack'))).toBe(false);
    expect(screen.getAllByRole('option')).toHaveLength(2);
  });

  it('lists matches from any workspace with their path, and marks the matched words', async () => {
    const { input } = setup();
    await type(input, 'hermes');

    expect(optionTexts()).toEqual([expect.stringContaining('Hermes harness talk'), expect.stringContaining('hermes-agent')]);
    expect(screen.getAllByText('Agentes › Hermes Agent')).toHaveLength(2);
    expect(screen.getAllByRole('option')[0].querySelector('mark')?.textContent).toBe('Hermes');
  });

  it('moves with the arrows and opens the highlighted result with Enter', async () => {
    const { input, handlers } = setup();
    await type(input, 'hermes');
    await fireEvent.keyDown(input, { key: 'ArrowDown' });
    await fireEvent.keyDown(input, { key: 'Enter' });

    expect((detailOf(handlers.open) as { id: string }).id).toBe('repo');
  });

  it('opens in a new tab with Cmd+Enter and shows in the board with Shift+Enter', async () => {
    const { input, handlers } = setup();
    await type(input, 'hermes');
    await fireEvent.keyDown(input, { key: 'Enter', metaKey: true });
    await fireEvent.keyDown(input, { key: 'Enter', shiftKey: true });

    expect((detailOf(handlers.openInNewTab) as { id: string }).id).toBe('video');
    expect((detailOf(handlers.reveal) as { id: string }).id).toBe('video');
    expect(handlers.open).not.toHaveBeenCalled();
  });

  it('keeps the typing focus in the field when filters and results are clicked', async () => {
    const { input } = setup();
    await type(input, 'hermes');
    const chip = screen.getByRole('button', { name: /kind_video/, pressed: false });
    const firstResult = screen.getAllByRole('option')[0].querySelector('button') as HTMLElement;

    expect(await fireEvent.mouseDown(chip)).toBe(false);
    expect(await fireEvent.mouseDown(firstResult)).toBe(false);
  });

  it('filters by kind, and "All" clears the filter', async () => {
    const { input } = setup();
    await type(input, 'hermes');
    await fireEvent.click(screen.getByRole('button', { name: /kind_video/, pressed: false }));
    expect(optionTexts()).toEqual([expect.stringContaining('Hermes harness talk')]);

    await fireEvent.click(screen.getByRole('button', { name: /palette_all/ }));
    expect(screen.getAllByRole('option')).toHaveLength(2);
  });

  it('shows the tags of a result, marking the ones that matched', async () => {
    const { input } = setup();
    await type(input, 'agentes');

    expect(screen.getByText('agentes')).toHaveClass('matched');
    expect(screen.getByText('harness')).not.toHaveClass('matched');
  });

  it('says when nothing matches, inviting topic search when asked to', async () => {
    const { input } = setup({ topicSearchHint: true });
    await type(input, 'zzzzzz');

    expect(screen.getByText('palette_empty')).toBeInTheDocument();
    expect(screen.getByText('search_enable_topic_hint')).toBeInTheDocument();
  });

  it('marks completed links', async () => {
    const done = createMockLink({ id: 'done', title: 'Hermes finished talk', url: 'https://example.com/done', collectionId: 'hermes', createdAt: 5, completedAt: 6 });
    const { input } = setup({ links: [...links, done] });
    await type(input, 'finished');

    expect(screen.getByText('palette_completed_on')).toBeInTheDocument();
  });

  it('shows the address of a link saved without a title', async () => {
    const bare = createMockLink({ id: 'bare', title: '', url: 'https://example.org/untitled/notes', collectionId: 'inbox', createdAt: 4 });
    const { input } = setup({ links: [...links, bare] });
    await type(input, 'untitled');

    expect(optionTexts()).toEqual([expect.stringContaining('https://example.org/untitled/notes')]);
  });

  it('closes with Escape', async () => {
    const { input, handlers } = setup();
    await fireEvent.keyDown(input, { key: 'Escape' });
    expect(handlers.close).toHaveBeenCalledTimes(1);
  });
});

describe('CommandPalette: before typing, and commands', () => {
  const now = Date.now();
  // A fixed queue: what the engine picks is tested elsewhere.
  const queue: Queue = {
    slots: [recommendation(links[0], collections[1], 'advance', { type: 'nextInColumn' }, 20)],
    triage: [],
    fronts: [],
    size: 1,
    effortOf: () => 20,
  };
  const commands = buildCommands({ triageCount: 0, sessionActive: false, view: 'board', workspaces: [], theme: 'dark', showNow: true });

  it('suggests what to do now, what was opened lately and the actions', async () => {
    const activity = { other: { ...EMPTY_ACTIVITY, opens: 1, lastOpenedAt: now - 60_000 } };
    const { input, handlers } = setup({ queue, activity, commands });

    for (const label of ['now_title', 'palette_group_recent', 'palette_group_actions']) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
    await fireEvent.keyDown(input, { key: 'Enter' });

    expect((detailOf(handlers.open) as { id: string }).id).toBe(queue.slots[0].link.id);
  });

  it('shows only commands after ">", and runs the chosen one', async () => {
    const { input, handlers } = setup({ queue, commands });
    await type(input, '> theme');

    expect(optionTexts()).toEqual([expect.stringContaining('command_theme_light')]);
    await fireEvent.keyDown(input, { key: 'Enter' });

    expect(detailOf(handlers.command)).toEqual({ type: 'theme', theme: 'light' });
  });

  it('adds the matching commands after the results', async () => {
    const { input } = setup({ commands });
    await type(input, 'open');

    expect(optionTexts().at(-1)).toContain('command_open_focus');
  });
});

describe('CommandPalette: acting on a link', () => {
  it('shows the details of the selected link beside the list', async () => {
    const { input } = setup();
    await type(input, 'hermes');

    const preview = screen.getByRole('complementary', { name: 'palette_preview_label' });
    expect(within(preview).getByText('Hermes harness talk')).toBeInTheDocument();
    expect(within(preview).getByText('palette_never')).toBeInTheDocument();
  });

  it('completes with Option+Enter, and restores a completed link the same way', async () => {
    const done = createMockLink({ id: 'done', title: 'Hermes finished talk', collectionId: 'hermes', completedAt: 6 });
    const { input, handlers } = setup({ links: [...links, done] });
    await type(input, 'hermes harness');
    await fireEvent.keyDown(input, { key: 'Enter', altKey: true });
    await type(input, 'finished');
    await fireEvent.keyDown(input, { key: 'Enter', altKey: true });

    expect((detailOf(handlers.complete) as { id: string }).id).toBe('video');
    expect((detailOf(handlers.restore) as { id: string }).id).toBe('done');
    expect(handlers.open).not.toHaveBeenCalled();
  });

  it('does nothing on Option+Enter without a result', async () => {
    const { input, handlers } = setup();
    await type(input, 'zzzzzz');
    await fireEvent.keyDown(input, { key: 'Enter', altKey: true });

    expect(handlers.complete).not.toHaveBeenCalled();
    expect(handlers.open).not.toHaveBeenCalled();
  });

  it('walks into the actions with the right arrow and runs one with Enter', async () => {
    const { input, handlers } = setup();
    await type(input, 'hermes');
    await fireEvent.keyDown(input, { key: 'ArrowRight' });
    await fireEvent.keyDown(input, { key: 'ArrowDown' });
    await fireEvent.keyDown(input, { key: 'ArrowDown' });
    await fireEvent.keyDown(input, { key: 'Enter' });

    expect(detailOf(handlers.snooze)).toMatchObject({ link: { id: 'video' } });
  });

  it('moves a link to another collection, filtered by what is typed, and comes back to the results', async () => {
    const extra = createMockCollection({ id: 'reading', name: 'Leituras', order: 2, workspaceId: 'ws-agents' });
    const { input, handlers } = setup({ collections: [...collections, extra] });
    await type(input, 'hermes harness');
    await fireEvent.click(screen.getByRole('button', { name: /palette_action_move/ }));

    expect(screen.getByPlaceholderText('palette_move_placeholder')).toBeInTheDocument();
    await type(input, 'leit');
    expect(optionTexts()).toEqual([expect.stringContaining('Agentes › Leituras')]);
    await fireEvent.keyDown(input, { key: 'Enter' });

    expect(detailOf(handlers.move)).toMatchObject({ link: { id: 'video' }, collectionId: 'reading' });
    expect((input as HTMLInputElement).value).toBe('hermes harness');
  });

  it('leaves "move" with Escape without closing', async () => {
    const { input, handlers } = setup();
    await type(input, 'hermes');
    await fireEvent.click(screen.getAllByRole('button', { name: /palette_action_move/ })[0]);
    await fireEvent.keyDown(input, { key: 'Escape' });

    expect(handlers.close).not.toHaveBeenCalled();
    expect(handlers.move).not.toHaveBeenCalled();
    expect(screen.getByPlaceholderText('search_placeholder')).toBeInTheDocument();
  });

  it('in a narrow window, drops the details and offers the actions in a menu', async () => {
    const { input, handlers } = setup({ wide: false });
    await type(input, 'hermes');

    expect(screen.queryByRole('complementary')).toBeNull();
    await fireEvent.keyDown(input, { key: 'ArrowRight' });
    await fireEvent.click(await screen.findByRole('menuitem', { name: 'progress_discard' }));

    expect((detailOf(handlers.discard) as { id: string }).id).toBe('video');
  });
});
```

- [ ] **Step 3: Run it to see it fail**

Run: `docker compose run --rm app npx vitest run src/test/components/CommandPalette.test.ts`
Expected: FAIL — cannot resolve `CommandPalette.svelte`.

- [ ] **Step 4: Write `PalettePreview.svelte`**

```svelte
<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { formatRelativeTime, t } from '@/lib/i18n';
  import type { Link } from '@/lib/types';
  import type { LinkKind } from '@/lib/link-kind';
  import { shortDate } from '@/lib/recommend/dates';
  import { KIND_LABEL_KEYS } from '@/lib/search/labels';
  import Icon from '@/shared/components/ui/Icon.svelte';
  import Kbd from '@/shared/components/ui/Kbd.svelte';
  import LinkTile from '@/shared/components/ui/LinkTile.svelte';
  import type { PaletteAction, PaletteActionId } from '../palette-actions';

  export let link: Link;
  export let path: string;
  export let kind: LinkKind;
  /** Minutes. */
  export let effort: number;
  export let openedAt: number | undefined = undefined;
  export let tint: string | undefined = undefined;
  export let actions: PaletteAction[];
  /** The action the keyboard is on, or null while the list has the keyboard. */
  export let activeAction: number | null = null;

  const dispatch = createEventDispatcher<{ run: PaletteActionId }>();

  $: address = link.url.replace(/^[a-z]+:\/\//, '');
</script>

<aside class="preview" aria-label={t('palette_preview_label')}>
  <LinkTile {link} size={56} {tint} />
  <h4>{link.title || link.url}</h4>
  <p class="url">{address}</p>
  <dl class="facts">
    <dt>{t('palette_fact_collection')}</dt>
    <dd>{path}</dd>
    <dt>{t('palette_fact_kind')}</dt>
    <dd>{t('palette_kind_effort', t(KIND_LABEL_KEYS[kind]), effort)}</dd>
    <dt>{t('palette_fact_saved')}</dt>
    <dd>{shortDate(link.createdAt)}</dd>
    <dt>{t('palette_fact_opened')}</dt>
    <dd>{openedAt === undefined ? t('palette_never') : formatRelativeTime(openedAt)}</dd>
  </dl>
  <div class="actions">
    {#each actions as action, index (action.id)}
      <button
        type="button"
        class="action"
        class:current={activeAction === index}
        class:danger={action.danger === true}
        tabindex="-1"
        on:mousedown|preventDefault
        on:click={() => dispatch('run', action.id)}
      >
        <Icon name={action.icon} size={15} />
        <span class="label">{action.label}</span>
        {#if action.keys.length > 0}
          <span class="keys">{#each action.keys as key (key)}<Kbd>{key}</Kbd>{/each}</span>
        {/if}
      </button>
    {/each}
  </div>
</aside>

<style>
  .preview {
    display: flex;
    flex-direction: column;
    min-width: 0;
    padding: 22px 20px;
    border-left: 1px solid var(--border-subtle);
    background: color-mix(in srgb, var(--surface-base) 35%, var(--surface-elevated));
  }

  h4 {
    margin: var(--space-4) 0 4px;
    font: 600 17px / 1.3 var(--font-body);
    letter-spacing: -0.01em;
    color: var(--text-primary);
    overflow-wrap: anywhere;
  }

  .url {
    margin: 0;
    font-size: var(--text-xs);
    color: var(--text-tertiary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .facts {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: var(--space-2) 14px;
    margin: var(--space-4) 0;
    font-size: 12.5px;
  }

  dt {
    color: var(--text-tertiary);
  }

  dd {
    margin: 0;
    color: var(--text-primary);
    overflow-wrap: anywhere;
  }

  .actions {
    display: flex;
    flex-direction: column;
    gap: 2px;
    margin-top: auto;
  }

  .action {
    display: flex;
    align-items: center;
    gap: 10px;
    height: var(--control-md);
    padding: 0 10px;
    border: none;
    border-radius: 9px;
    background: transparent;
    color: var(--text-primary);
    font: 500 var(--text-sm) / 1 var(--font-body);
    text-align: left;
    cursor: pointer;
  }

  .action :global(svg) {
    color: var(--text-secondary);
  }

  .action:hover,
  .action.current {
    background: var(--surface-overlay);
    box-shadow: inset 0 0 0 1px var(--border-default);
  }

  .action.danger,
  .action.danger :global(svg) {
    color: var(--semantic-error);
  }

  .label {
    flex: 1;
  }

  .keys {
    display: flex;
    gap: 3px;
  }
</style>
```

- [ ] **Step 5: Write `CommandPalette.svelte`**

```svelte
<script lang="ts">
  import { createEventDispatcher, onMount, tick } from 'svelte';
  import { formatRelativeTime, getCollectionDisplayName, t } from '@/lib/i18n';
  import type { Activity, Collection, Link, Workspace } from '@/lib/types';
  import { LINK_KINDS, linkKind, type LinkKind } from '@/lib/link-kind';
  import { buildIndex, search, type SearchHit } from '@/lib/search/engine';
  import { displayNames, hitPath, KIND_LABEL_KEYS } from '@/lib/search/labels';
  import { highlight } from '@/lib/search/highlight';
  import { normalizeWords } from '@/lib/search/text';
  import { extractDomain } from '@/lib/tabs';
  import type { TranslateQuery } from '@/lib/ai/translator';
  import type { Queue } from '@/lib/recommend/engine';
  import { defaultEffort } from '@/lib/recommend/effort';
  import { shortDate, tomorrow } from '@/lib/recommend/dates';
  import { recentlyOpened } from '@/lib/recommend/recent';
  import { timeLeft } from '@/lib/recommend/time';
  import Icon from '@/shared/components/ui/Icon.svelte';
  import IconButton from '@/shared/components/ui/IconButton.svelte';
  import Kbd from '@/shared/components/ui/Kbd.svelte';
  import LinkTile from '@/shared/components/ui/LinkTile.svelte';
  import Menu from '@/shared/components/ui/Menu.svelte';
  import MenuItem from '@/shared/components/ui/MenuItem.svelte';
  import { trapFocus } from '@/shared/focus-trap';
  import { altLabel, modLabel } from '@/shared/platform';
  import { KIND_ICONS } from '../card-meta';
  import { isCommandQuery, matchCommands, type Command, type CommandAction } from '../commands';
  import { ACTION_KEYS, collectionPath, timeText } from '../next-up-labels';
  import { linkActions, type PaletteActionId } from '../palette-actions';
  import PalettePreview from './PalettePreview.svelte';

  export let links: Link[] = [];
  export let collections: Collection[] = [];
  export let workspaces: Workspace[] = [];
  /** Shown with "nothing found" when topic search is off but available. */
  export let topicSearchHint = false;
  /** Translates the query into English; null keeps the search in the typed language. */
  export let translate: TranslateQuery | null = null;
  /** For the suggestions before typing and each link's time. */
  export let queue: Queue | null = null;
  export let activity: Activity = {};
  export let commands: Command[] = [];
  /** Room for the details pane; without it, the actions open in a menu. */
  export let wide = true;

  const dispatch = createEventDispatcher<{
    open: Link;
    openInNewTab: Link;
    reveal: Link;
    complete: Link;
    restore: Link;
    discard: Link;
    snooze: { link: Link; until: number };
    move: { link: Link; collectionId: string };
    command: CommandAction;
    close: void;
  }>();

  type LinkEntry = { kind: 'link'; key: string; link: Link; meta: string[]; hit?: SearchHit };
  type CommandEntry = { kind: 'command'; key: string; command: Command };
  type CollectionEntry = { kind: 'collection'; key: string; collection: Collection; path: string };
  type Entry = LinkEntry | CommandEntry | CollectionEntry;
  interface Group {
    id: string;
    label: string | null;
    entries: Entry[];
  }

  let query = '';
  let translatedQuery: string | null = null;
  let selectedKinds: LinkKind[] = [];
  let activeIndex = 0;
  /** Where the arrows act: the list, or the actions of the selected link. */
  let zone: 'list' | 'actions' = 'list';
  let actionIndex = 0;
  /** The link being moved: the list shows collections meanwhile. */
  let moving: Link | null = null;
  let savedQuery = '';
  let narrowMenu = false;
  let menuAnchor: HTMLElement | undefined;
  let input: HTMLInputElement;

  async function requestTranslation(current: string, translator: TranslateQuery | null): Promise<void> {
    translatedQuery = null;
    if (translator === null || current.trim() === '' || isCommandQuery(current)) {
      return;
    }
    const translated = await translator(current);
    if (current === query) {
      translatedQuery = translated;
    }
  }

  $: void requestTranslation(moving === null ? query : '', translate);

  $: index = buildIndex(links, collections, workspaces, displayNames);
  $: commandMode = isCommandQuery(query);
  $: typed = query.trim() !== '' && !commandMode;
  $: queries = translatedQuery === null ? [query] : [query, translatedQuery];
  $: result = search(index, queries.length === 1 ? query : queries, { kinds: selectedKinds });
  $: showingPartial = result.results.length === 0 && result.partial.length > 0;
  $: hits = showingPartial ? result.partial : result.results;
  $: chipKinds = LINK_KINDS.filter((kind) => (result.kindCounts[kind] ?? 0) > 0 || selectedKinds.includes(kind));
  $: totalCount = Object.values(result.kindCounts).reduce((sum, count) => sum + (count ?? 0), 0);
  $: collectionById = new Map(collections.map((collection) => [collection.id, collection]));
  $: groups = moving !== null
    ? moveGroups(moving, query, collections, workspaces)
    : typed
      ? resultGroups(hits, query, commands)
      : emptyGroups(commandMode, query, queue, activity, links, commands, collectionById);
  $: flat = groups.flatMap((group) => group.entries);
  $: if (activeIndex > Math.max(flat.length - 1, 0)) {
    activeIndex = Math.max(flat.length - 1, 0);
  }
  $: active = flat[activeIndex];
  $: activeLink = active?.kind === 'link' ? active.link : undefined;
  $: actions = activeLink === undefined ? [] : linkActions(activeLink);
  $: activeKind = activeLink === undefined ? 'page' : linkKind(activeLink.url);
  $: activeCollection = activeLink === undefined ? undefined : collectionById.get(activeLink.collectionId);
  $: activePath = active?.kind === 'link' && active.hit !== undefined
    ? hitPath(active.hit)
    : activeCollection === undefined ? '' : collectionPath(activeCollection, workspaces);
  $: activeEffort = activeLink === undefined ? 0 : (queue?.effortOf(activeLink) ?? defaultEffort(activeKind));

  function linkEntry(key: string, link: Link, meta: string[], hit?: SearchHit): LinkEntry {
    return { kind: 'link', key, link, meta: meta.filter((part) => part !== ''), hit };
  }

  function commandEntries(available: Command[], text: string, limit = Infinity): CommandEntry[] {
    return matchCommands(available, text).slice(0, limit).map((command) => ({ kind: 'command', key: `command-${command.id}`, command }));
  }

  function emptyGroups(
    onlyCommands: boolean, text: string, current: Queue | null, acts: Activity, all: Link[], available: Command[], byId: Map<string, Collection>,
  ): Group[] {
    const actionsGroup: Group = { id: 'actions', label: t('palette_group_actions'), entries: commandEntries(available, text) };
    if (onlyCommands) {
      return [actionsGroup].filter((group) => group.entries.length > 0);
    }
    const slots = current?.slots ?? [];
    const now = slots.map((rec) => linkEntry(`now-${rec.link.id}`, rec.link, [
      `${t(ACTION_KEYS[rec.action])}, ${timeText(timeLeft(acts[rec.link.id]?.activeMs ?? 0, rec.effort))}`,
      getCollectionDisplayName(rec.collection),
    ]));
    const recent = recentlyOpened(all, acts, new Set(slots.map((rec) => rec.link.id))).map((link) => {
      const collection = byId.get(link.collectionId);
      return linkEntry(`recent-${link.id}`, link, [
        formatRelativeTime(acts[link.id]?.lastOpenedAt ?? 0),
        collection === undefined ? '' : getCollectionDisplayName(collection),
      ]);
    });
    return [
      { id: 'now', label: t('now_title'), entries: now },
      { id: 'recent', label: t('palette_group_recent'), entries: recent },
      actionsGroup,
    ].filter((group) => group.entries.length > 0);
  }

  function resultGroups(found: SearchHit[], text: string, available: Command[]): Group[] {
    const results = found.map((hit) => linkEntry(`hit-${hit.link.id}`, hit.link, [
      hitPath(hit),
      t(KIND_LABEL_KEYS[hit.kind]),
      extractDomain(hit.link.url).replace(/^www\./, ''),
    ], hit));
    return [
      { id: 'results', label: null, entries: results },
      { id: 'actions', label: t('palette_group_actions'), entries: commandEntries(available, text, 3) },
    ].filter((group) => group.entries.length > 0);
  }

  function moveGroups(link: Link, text: string, all: Collection[], spaces: Workspace[]): Group[] {
    const words = normalizeWords(text);
    const entries: CollectionEntry[] = all
      .filter((collection) => collection.id !== link.collectionId)
      .map((collection) => ({ kind: 'collection' as const, key: `move-${collection.id}`, collection, path: collectionPath(collection, spaces) }))
      .filter((entry) => {
        const path = normalizeWords(entry.path);
        return words.every((word) => path.some((part) => part.startsWith(word)));
      });
    return [{ id: 'move', label: null, entries }];
  }

  function toggleKind(kind: LinkKind): void {
    selectedKinds = selectedKinds.includes(kind) ? selectedKinds.filter((k) => k !== kind) : [...selectedKinds, kind];
    activeIndex = 0;
  }

  function startMove(link: Link): void {
    moving = link;
    savedQuery = query;
    query = '';
    activeIndex = 0;
    zone = 'list';
    void tick().then(() => input.focus());
  }

  function endMove(): void {
    moving = null;
    query = savedQuery;
    activeIndex = 0;
  }

  function run(id: PaletteActionId, link: Link): void {
    zone = 'list';
    narrowMenu = false;
    if (id === 'open') {
      dispatch('open', link);
    } else if (id === 'complete') {
      dispatch('complete', link);
    } else if (id === 'restore') {
      dispatch('restore', link);
    } else if (id === 'snooze') {
      dispatch('snooze', { link, until: tomorrow(Date.now()) });
    } else if (id === 'move') {
      startMove(link);
    } else if (id === 'reveal') {
      dispatch('reveal', link);
    } else {
      dispatch('discard', link);
    }
  }

  function choose(entry: Entry | undefined, keys: { metaKey: boolean; ctrlKey: boolean; shiftKey: boolean; altKey: boolean }): void {
    if (entry === undefined) {
      return;
    }
    if (entry.kind === 'command') {
      dispatch('command', entry.command.action);
    } else if (entry.kind === 'collection') {
      if (moving !== null) {
        dispatch('move', { link: moving, collectionId: entry.collection.id });
        endMove();
      }
    } else if (keys.altKey) {
      run(entry.link.completedAt === undefined ? 'complete' : 'restore', entry.link);
    } else if (keys.shiftKey) {
      dispatch('reveal', entry.link);
    } else if (keys.metaKey || keys.ctrlKey) {
      dispatch('openInNewTab', entry.link);
    } else {
      dispatch('open', entry.link);
    }
  }

  function caretAtEnd(): boolean {
    return input.selectionStart === input.value.length && input.selectionEnd === input.value.length;
  }

  function handleKeydown(event: KeyboardEvent): void {
    if (zone === 'actions') {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        actionIndex = Math.min(actionIndex + 1, actions.length - 1);
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        actionIndex = Math.max(actionIndex - 1, 0);
      } else if (event.key === 'Enter') {
        event.preventDefault();
        if (activeLink !== undefined && actions[actionIndex] !== undefined) {
          run(actions[actionIndex].id, activeLink);
        }
      } else if (event.key === 'ArrowLeft' || event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        zone = 'list';
      }
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      activeIndex = Math.min(activeIndex + 1, Math.max(flat.length - 1, 0));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      activeIndex = Math.max(activeIndex - 1, 0);
    } else if (event.key === 'ArrowRight' && activeLink !== undefined && moving === null && caretAtEnd()) {
      event.preventDefault();
      if (wide) {
        zone = 'actions';
        actionIndex = 0;
      } else {
        narrowMenu = true;
      }
    } else if (event.key === 'Enter') {
      event.preventDefault();
      choose(active, event);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      if (moving !== null) {
        endMove();
      } else {
        dispatch('close');
      }
    }
  }

  onMount(() => {
    input.focus();
  });
</script>

<div class="layer">
  <button type="button" class="scrim" tabindex="-1" aria-hidden="true" aria-label={t('common_close')} on:click={() => dispatch('close')}></button>

  <div class="palette" class:split={wide && moving === null && activeLink !== undefined} role="dialog" aria-modal="true" aria-label={t('search_dialog_label')} use:trapFocus>
    <div class="field">
      <Icon name={moving === null ? 'search' : 'move'} size={20} />
      <input
        bind:this={input}
        bind:value={query}
        on:input={() => { activeIndex = 0; zone = 'list'; }}
        on:keydown={handleKeydown}
        type="text"
        placeholder={moving === null ? t('search_placeholder') : t('palette_move_placeholder', moving.title || moving.url)}
        role="combobox"
        aria-expanded="true"
        aria-controls="palette-list"
        aria-autocomplete="list"
        aria-activedescendant={flat.length > 0 ? `palette-option-${activeIndex}` : undefined}
      />
      <span class="scope">{t('search_scope_all')}</span>
    </div>

    {#if typed && moving === null && chipKinds.length > 0}
      <div class="filters">
        <button type="button" class="filter" aria-pressed={selectedKinds.length === 0} on:mousedown|preventDefault on:click={() => { selectedKinds = []; activeIndex = 0; }}>
          {t('palette_all')} <span class="count">{totalCount}</span>
        </button>
        {#each chipKinds as kind (kind)}
          <button type="button" class="filter" aria-pressed={selectedKinds.includes(kind)} on:mousedown|preventDefault on:click={() => toggleKind(kind)}>
            <Icon name={KIND_ICONS[kind]} size={14} />
            {t(KIND_LABEL_KEYS[kind])}
            <span class="count">{result.kindCounts[kind] ?? 0}</span>
          </button>
        {/each}
      </div>
    {/if}

    <div class="body">
      <div class="list-area">
        {#if typed && showingPartial && moving === null}
          <p class="note">{t('search_partial')}</p>
        {/if}

        <ul id="palette-list" class="list" role="listbox" aria-label={t('search_dialog_label')}>
          {#each groups as group (group.id)}
            <li role="presentation">
              {#if group.label !== null}
                <div class="group-label" id="palette-group-{group.id}">{group.label}</div>
              {/if}
              <ul role="group" aria-labelledby={group.label === null ? undefined : `palette-group-${group.id}`}>
                {#each group.entries as entry (entry.key)}
                  {@const position = flat.indexOf(entry)}
                  <li id="palette-option-{position}" role="option" aria-selected={position === activeIndex} class:active={position === activeIndex}>
                    <button
                      type="button"
                      class="hit"
                      tabindex="-1"
                      on:mousedown|preventDefault
                      on:click={(event) => choose(entry, event)}
                      on:mousemove={() => { activeIndex = position; }}
                    >
                      {#if entry.kind === 'link'}
                        <LinkTile link={entry.link} size={36} />
                        <span class="hit-body">
                          <span class="hit-title">
                            {#each highlight(entry.link.title || entry.link.url, typed ? queries : []) as segment, i (i)}{#if segment.match}<mark>{segment.text}</mark>{:else}{segment.text}{/if}{/each}
                          </span>
                          <span class="hit-meta">
                            {#if entry.link.completedAt !== undefined}
                              <span class="done"><Icon name="check" size={11} />{t('palette_completed_on', shortDate(entry.link.completedAt))}</span>
                            {/if}
                            {#each entry.meta as part, i (i)}<span>{part}</span>{/each}
                          </span>
                          {#if entry.hit !== undefined && entry.hit.tags.length > 0}
                            <span class="hit-tags">
                              {#each entry.hit.tags as tag (tag)}
                                <span class="hit-tag" class:matched={entry.hit.matchedTags.includes(tag)}>{tag}</span>
                              {/each}
                            </span>
                          {/if}
                        </span>
                      {:else if entry.kind === 'command'}
                        <span class="command-icon {entry.command.tone ?? ''}"><Icon name={entry.command.icon} size={17} /></span>
                        <span class="hit-body"><span class="hit-title">{entry.command.label}</span></span>
                        {#if entry.command.hint !== undefined}
                          <Kbd>{entry.command.hint}</Kbd>
                        {/if}
                      {:else}
                        <span class="command-icon"><Icon name="folder" size={17} /></span>
                        <span class="hit-body"><span class="hit-title">{entry.path}</span></span>
                      {/if}
                    </button>
                    {#if !wide && entry.kind === 'link' && position === activeIndex}
                      <span class="row-more" bind:this={menuAnchor}>
                        <IconButton icon="more" size="sm" label={t('progress_more')} expanded={narrowMenu} on:click={() => (narrowMenu = !narrowMenu)} />
                        {#if narrowMenu}
                          <Menu label={t('progress_more')} align="end" anchor={menuAnchor} on:close={() => (narrowMenu = false)}>
                            {#each actions as action (action.id)}
                              <MenuItem icon={action.icon} danger={action.danger === true} on:select={() => run(action.id, entry.link)}>{action.label}</MenuItem>
                            {/each}
                          </Menu>
                        {/if}
                      </span>
                    {/if}
                  </li>
                {/each}
              </ul>
            </li>
          {/each}
        </ul>

        {#if moving !== null && flat.length === 0}
          <p class="note">{t('palette_move_empty')}</p>
        {:else if typed && hits.length === 0 && moving === null}
          <p class="empty">{t('palette_empty', query.trim())}</p>
          {#if topicSearchHint}
            <p class="note">{t('search_enable_topic_hint')}</p>
          {/if}
        {/if}
      </div>

      {#if wide && moving === null && activeLink !== undefined}
        <PalettePreview
          link={activeLink}
          path={activePath}
          kind={activeKind}
          effort={activeEffort}
          openedAt={activity[activeLink.id]?.lastOpenedAt}
          tint={activeCollection?.color}
          {actions}
          activeAction={zone === 'actions' ? actionIndex : null}
          on:run={(event) => activeLink !== undefined && run(event.detail, activeLink)}
        />
      {/if}
    </div>

    <footer class="keys">
      <span><Kbd>↑</Kbd><Kbd>↓</Kbd> {t('palette_key_navigate')}</span>
      <span><Kbd>↵</Kbd> {t('palette_key_open')}</span>
      <span><Kbd>{modLabel()}</Kbd><Kbd>↵</Kbd> {t('palette_key_new_tab')}</span>
      <span><Kbd>{altLabel()}</Kbd><Kbd>↵</Kbd> {t('palette_key_complete')}</span>
      <span><Kbd>→</Kbd> {t('palette_key_actions')}</span>
      <span class="right"><Kbd>esc</Kbd> {t('palette_key_close')}</span>
    </footer>
  </div>
</div>

<style>
  .layer {
    position: fixed;
    inset: 0;
    z-index: 100;
    display: flex;
    justify-content: center;
    align-items: flex-start;
    padding: 84px var(--space-4) var(--space-4);
  }

  .scrim {
    position: absolute;
    inset: 0;
    border: none;
    background: var(--scrim);
    backdrop-filter: blur(6px) saturate(0.9);
    cursor: default;
  }

  .palette {
    position: relative;
    display: flex;
    flex-direction: column;
    width: min(680px, 100%);
    max-height: calc(100vh - 120px);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-xl);
    background: var(--surface-elevated);
    box-shadow: var(--shadow-float);
    overflow: hidden;
  }

  .palette.split {
    width: min(820px, 100%);
  }

  .field {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    height: 62px;
    padding: 0 18px 0 20px;
    border-bottom: 1px solid var(--border-subtle);
    color: var(--text-tertiary);
  }

  input {
    flex: 1;
    min-width: 0;
    border: none;
    background: transparent;
    color: var(--text-primary);
    font: 400 19px / 1 var(--font-body);
    letter-spacing: -0.01em;
    caret-color: var(--accent-primary);
  }

  input:focus {
    outline: none;
  }

  input::placeholder {
    color: var(--text-tertiary);
  }

  .scope {
    height: 26px;
    padding: 0 10px;
    border: 1px solid var(--border-default);
    border-radius: 13px;
    background: var(--surface-overlay);
    color: var(--text-secondary);
    font-size: var(--text-xs);
    line-height: 24px;
    white-space: nowrap;
  }

  .filters {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    padding: 10px 14px 2px;
  }

  .filter {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: var(--control-sm);
    padding: 0 10px;
    border: none;
    border-radius: var(--radius-sm);
    background: transparent;
    color: var(--text-secondary);
    font: 400 12.5px / 1 var(--font-body);
    cursor: pointer;
  }

  .filter:hover {
    color: var(--text-primary);
  }

  .filter[aria-pressed='true'] {
    background: var(--surface-overlay);
    color: var(--text-primary);
    box-shadow: inset 0 0 0 1px var(--border-default);
  }

  .count {
    color: var(--text-tertiary);
    font-variant-numeric: tabular-nums;
  }

  .body {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    min-height: 0;
    overflow: hidden;
  }

  .split .body {
    grid-template-columns: minmax(0, 1fr) 300px;
  }

  .list-area {
    min-height: 0;
    overflow-y: auto;
    padding: 6px var(--space-2) 10px;
  }

  .list,
  .list ul {
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .group-label {
    padding: 12px 12px 6px;
    font: 600 var(--text-xs) / 1 var(--font-body);
    color: var(--text-tertiary);
  }

  li[role='option'] {
    position: relative;
    border-radius: 12px;
  }

  li[role='option'].active {
    background: var(--surface-overlay);
    box-shadow: inset 0 0 0 1px var(--border-default);
  }

  .hit {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    width: 100%;
    padding: 8px 12px;
    border: none;
    background: transparent;
    color: inherit;
    font: inherit;
    text-align: left;
    cursor: pointer;
  }

  .hit-body {
    display: flex;
    flex: 1;
    flex-direction: column;
    min-width: 0;
  }

  .hit-title {
    font: 500 var(--text-base) / 1.35 var(--font-body);
    color: var(--text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  mark {
    padding: 0 1px;
    border-radius: 3px;
    background: color-mix(in srgb, var(--accent-primary) 22%, transparent);
    color: var(--text-primary);
  }

  .hit-meta,
  .hit-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    margin-top: 2px;
    font-size: var(--text-xs);
    color: var(--text-tertiary);
  }

  .done {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    color: var(--semantic-success);
  }

  .hit-tag {
    padding: 0 6px;
    border-radius: var(--radius-full);
    background: var(--surface-overlay);
  }

  .hit-tag.matched {
    background: var(--accent-soft);
    color: var(--text-primary);
  }

  .command-icon {
    display: grid;
    place-items: center;
    flex-shrink: 0;
    width: 36px;
    height: 36px;
    border-radius: 10px;
    background: var(--surface-tile);
    color: var(--text-secondary);
  }

  .command-icon.warning {
    color: var(--semantic-warning);
  }

  .command-icon.accent {
    color: var(--accent-primary);
  }

  .row-more {
    position: absolute;
    top: 50%;
    right: 8px;
    transform: translateY(-50%);
  }

  .note,
  .empty {
    margin: var(--space-3) 12px 0;
    font-size: var(--text-xs);
    color: var(--text-tertiary);
  }

  .empty {
    font-size: var(--text-sm);
    color: var(--text-secondary);
  }

  .keys {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 18px;
    min-height: 42px;
    padding: 0 20px;
    border-top: 1px solid var(--border-subtle);
    font-size: var(--text-xs);
    color: var(--text-tertiary);
  }

  .keys span {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }

  .keys .right {
    margin-left: auto;
  }
</style>
```

- [ ] **Step 6: Wire it in the page**

In `src/newtab/App.svelte`:

1. Replace `import SearchPanel from './components/SearchPanel.svelte';` with `import CommandPalette from './components/CommandPalette.svelte';` and add `import { buildCommands, type CommandAction } from './commands';`.
2. Add `let innerWidth = 1440;` next to the other `let`s, and change `<svelte:window on:keydown={handleKeydown} />` to `<svelte:window on:keydown={handleKeydown} bind:innerWidth />`.
3. Add, after the `metaOf` statement:

```ts
  /** The theme on screen ("system" resolved). */
  function currentTheme(): 'light' | 'dark' {
    return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
  }

  $: commands = showSearch
    ? buildCommands({
      triageCount: queue.triage.length,
      sessionActive: false,
      view,
      workspaces: $workspacesStore.workspaces
        .filter((workspace) => workspace.id !== $workspacesStore.activeWorkspaceId)
        .map((workspace) => ({ id: workspace.id, name: getWorkspaceDisplayName(workspace) })),
      theme: currentTheme(),
      showNow: $settingsStore.settings.showNextUp,
    })
    : [];

  async function handleCommand(event: CustomEvent<CommandAction>): Promise<void> {
    showSearch = false;
    const action = event.detail;
    if (action.type === 'triage') {
      showTriage = true;
    } else if (action.type === 'startSession' || action.type === 'endSession') {
      // Task 13 starts and ends sessions; until then the command opens Focus.
      await openFocus(null);
    } else if (action.type === 'view') {
      if (action.view === 'focus') {
        await openFocus(null);
      } else {
        view = 'board';
      }
    } else if (action.type === 'newCollection') {
      showCreateCollection = true;
    } else if (action.type === 'workspace') {
      workspacesStore.setActiveWorkspace(action.id);
      view = 'board';
    } else if (action.type === 'theme') {
      await settingsStore.setTheme(action.theme);
    } else if (action.type === 'toggleNow') {
      await settingsStore.setShowNextUp(action.show);
    } else {
      showSettings = true;
    }
  }

  async function handleMove(event: CustomEvent<{ link: Link; collectionId: string }>): Promise<void> {
    const { link, collectionId } = event.detail;
    await linksStore.moveLink(link.id, collectionId);
    const target = $linksStore.collections.find((collection) => collection.id === collectionId);
    successMessage = t('success_link_moved', target === undefined ? '' : getCollectionDisplayName(target));
  }
```

4. Replace the `<SearchPanel ... />` element with:

```svelte
  <CommandPalette
    links={$linksStore.links}
    collections={$linksStore.collections}
    workspaces={$workspacesStore.workspaces}
    translate={$settingsStore.settings.topicSearch ? translateQuery : null}
    topicSearchHint={translationAvailable && !$settingsStore.settings.topicSearch}
    {queue}
    activity={$activityStore.activity}
    {commands}
    wide={innerWidth >= 900}
    on:open={handleSearchOpen}
    on:openInNewTab={handleSearchOpenInNewTab}
    on:reveal={handleSearchReveal}
    on:complete={handleComplete}
    on:restore={handleRestore}
    on:snooze={handleSnooze}
    on:discard={handleDiscard}
    on:move={handleMove}
    on:command={handleCommand}
    on:close={() => (showSearch = false)}
  />
```

5. Delete the old panel and the keys it alone used:

```bash
git rm src/newtab/components/SearchPanel.svelte src/test/components/SearchPanel.test.ts
/usr/bin/grep -rn "search_hint_keys\|'search_empty'\|search_completed_badge" src --include='*.ts' --include='*.svelte'
docker compose run --rm app node scripts/i18n/keys.mjs remove search_hint_keys search_empty search_completed_badge
```

Expected: the `grep` prints nothing.

- [ ] **Step 7: Run the tests of this task**

Run: `docker compose run --rm app npx vitest run src/test/components/CommandPalette.test.ts src/test/lib/locales.test.ts`
Expected: PASS. If a test about focus or `mousedown` fails because `trapFocus` moved the focus, check that the only focusable elements in the dialog are the input, the filters and (narrow) the row's menu button; ledger what you change.

- [ ] **Step 8: Suite, lint, size, look**

```bash
make test && make lint
make build && docker compose run --rm -T app du -sb dist
make preview
```

Expected: tests pass; 12 old lint errors; `du` ≤ 573440. In the preview (1440 and 1024, both themes): ⌘K with nothing typed shows "Agora", "Abertos recentemente" and "Ações"; `>` shows only commands; typing "transformer" highlights the word in the titles, shows the filters with icons and "Tudo", and the details pane with the facts and the actions with their keys; → walks into the actions; "Mover para…" lists the collections; at 1024 px the pane is gone and → opens a menu. `make preview-stop`.

- [ ] **Step 9: Commit**

```bash
git add src/newtab/components/CommandPalette.svelte src/newtab/components/PalettePreview.svelte src/newtab/App.svelte src/test/components/CommandPalette.test.ts public/_locales/en/messages.json public/_locales/pt_BR/messages.json
git commit -m "feat(palette): ⌘K suggests before typing, runs commands, highlights matches and acts on the link (complete, snooze, move, show, discard)

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

## Stage 4 — Focus and the session

### Task 12: The Focus page

**Files:**
- Modify: `src/lib/recommend/progress.ts`, `src/newtab/components/FocusView.svelte` (rewrite), `FocusSession.svelte` (rewrite), `FocusFronts.svelte` (rewrite), `FocusCompleted.svelte` (rewrite); tests `src/test/lib/recommend/progress.test.ts`, `src/test/components/FocusView.test.ts`, `FocusSession.test.ts`, `FocusFronts.test.ts`, `FocusCompleted.test.ts`
- Locales: add `focus_week_now`, `focus_queue_fell`, `focus_queue_rose`, `focus_forecast_zero`, `focus_forecast_rate`, `focus_forecast_weeks_one|many`, `focus_session_at`, `focus_session_budget`, `focus_session_triage_verb`, `focus_completed_this_week`, `focus_completed_all`, `focus_completed_less`; set `focus_progress_title`, `focus_session_next`; remove `focus_queue`, `focus_queue_down`, `focus_queue_up`, `nextup_empty`

**Interfaces:**
- Consumes: `completedByWeek`, `previousQueue`, `completedHistory`, `WeekBar` (`progress.ts`); `buildSession`, `SESSION_OPTIONS`, `SessionItem`, `SessionMinutes`; `FocusTriagePanel` (Task 9); primitives.
- Produces:
  - `queueForecast(bars: WeekBar[], queueSize: number): Forecast | null` with `Forecast = { perWeek: number; weeks: number | null }`.
  - `FocusView` (props `queue links stats now workspaces`) dispatches `openTriage` and forwards `open`, `complete`, `restore`, `collectionFocus`, `collectionReference`.
  - `FocusSession` (prop `queue`) dispatches `open`, `complete`, `openTriage`. Task 13 adds `session`, `start`, `end`.
  - `FocusCompleted` gains the prop `now: number`.

- [ ] **Step 1: Locale keys**

`.superpowers/sdd/2026-09-25-nova-interface/keys-12-add.json`:

```json
{
  "focus_week_now": { "en": "now", "pt_BR": "agora" },
  "focus_queue_fell": { "en": "The queue fell from $1 to $2.", "pt_BR": "A fila caiu de $1 para $2.", "placeholders": { "before": "$1", "now": "$2" } },
  "focus_queue_rose": { "en": "The queue rose from $1 to $2.", "pt_BR": "A fila subiu de $1 para $2.", "placeholders": { "before": "$1", "now": "$2" } },
  "focus_forecast_zero": { "en": "The queue is empty.", "pt_BR": "A fila está zerada." },
  "focus_forecast_rate": { "en": "You complete about $1 a week.", "pt_BR": "Você conclui uns $1 por semana.", "placeholders": { "count": "$1" } },
  "focus_forecast_weeks_one": { "en": "At this pace, the queue is done in 1 week.", "pt_BR": "No ritmo atual, a fila zera em 1 semana." },
  "focus_forecast_weeks_many": { "en": "At this pace, the queue is done in $1 weeks.", "pt_BR": "No ritmo atual, a fila zera em $1 semanas.", "placeholders": { "count": "$1" } },
  "focus_session_at": { "en": "$1′", "pt_BR": "$1′", "placeholders": { "minute": "$1" } },
  "focus_session_budget": { "en": "$1 of $2 min", "pt_BR": "$1 de $2 min", "placeholders": { "planned": "$1", "budget": "$2" } },
  "focus_session_triage_verb": { "en": "Triage", "pt_BR": "Triar" },
  "focus_completed_this_week": { "en": "This week", "pt_BR": "Esta semana" },
  "focus_completed_all": { "en": "Show all", "pt_BR": "Ver todos" },
  "focus_completed_less": { "en": "Show less", "pt_BR": "Mostrar menos" }
}
```

`.superpowers/sdd/2026-09-25-nova-interface/keys-12-set.json`:

```json
{
  "focus_progress_title": { "en": "Week by week", "pt_BR": "Semana a semana" },
  "focus_session_next": { "en": "Open the next one", "pt_BR": "Abrir o próximo" }
}
```

```bash
docker compose run --rm app node scripts/i18n/keys.mjs add .superpowers/sdd/2026-09-25-nova-interface/keys-12-add.json
docker compose run --rm app node scripts/i18n/keys.mjs set .superpowers/sdd/2026-09-25-nova-interface/keys-12-set.json
```

- [ ] **Step 2: Write the failing tests**

Append to `src/test/lib/recommend/progress.test.ts` (add `queueForecast` to its import):

```ts
describe('queueForecast', () => {
  const bars = (counts: number[]) => counts.map((completed, i) => ({ week: `w${i}`, completed }));

  it('uses the pace of the four full weeks before this one', () => {
    expect(queueForecast(bars([9, 9, 9, 2, 4, 6, 4, 1]), 14)).toEqual({ perWeek: 4, weeks: 4 });
  });

  it('says nothing without completions in those weeks', () => {
    expect(queueForecast(bars([5, 0, 0, 0, 0, 3]), 14)).toBeNull();
  });

  it('drops the weeks beyond a year, and knows an empty queue', () => {
    expect(queueForecast(bars([0, 0, 0, 1, 0, 0, 0, 0]), 100)).toEqual({ perWeek: 0.25, weeks: null });
    expect(queueForecast(bars([0, 0, 0, 0, 0]), 0)).toEqual({ perWeek: 0, weeks: 0 });
  });
});
```

Replace `src/test/components/FocusView.test.ts` with:

```ts
/**
 * The Focus page as a whole (spec §10).
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import FocusView from '@/newtab/components/FocusView.svelte';
import { buildQueue } from '@/lib/recommend/engine';
import { isoWeek } from '@/lib/recommend/dates';
import { EMPTY_WEEK } from '@/lib/types';
import { createMockCollection, createMockLink } from '../factories';

const now = Date.now();
const empty = buildQueue({ links: [], collections: [], activity: {}, now });

describe('FocusView', () => {
  it('opens with the week in one sentence', () => {
    render(FocusView, { props: { queue: empty, links: [], stats: {}, now, workspaces: [] } });

    expect(screen.getByRole('heading', { name: 'focus_title' })).toBeInTheDocument();
    expect(screen.getByText(/focus_week_many/)).toBeInTheDocument();
  });

  it('says whether the queue fell or rose since last week', () => {
    const lastWeek = isoWeek(now - 7 * 86_400_000);
    render(FocusView, { props: { queue: empty, links: [], stats: { [lastWeek]: { ...EMPTY_WEEK, queue: 16 } }, now, workspaces: [] } });

    expect(screen.getByText(/focus_queue_fell/)).toBeInTheDocument();
  });

  it('has the session, triage, week, fronts and completed sections', () => {
    render(FocusView, { props: { queue: empty, links: [], stats: {}, now, workspaces: [] } });

    for (const title of ['focus_session_title', 'focus_triage_title', 'focus_progress_title', 'focus_fronts_title', 'focus_completed_title']) {
      expect(screen.getByRole('heading', { name: title })).toBeInTheDocument();
    }
    expect(screen.getByText('focus_forecast_zero')).toBeInTheDocument();
  });

  it('asks for the triage layer', async () => {
    const openTriage = vi.fn();
    const collection = createMockCollection({ id: 'c', name: 'C' });
    const old = createMockLink({ id: 'old', collectionId: 'c', createdAt: now - 90 * 86_400_000 });
    const queue = buildQueue({ links: [old], collections: [collection], activity: {}, now });
    render(FocusView, { props: { queue, links: [old], stats: {}, now, workspaces: [] }, events: { openTriage } });

    await fireEvent.click(screen.getByRole('button', { name: 'now_triage_now' }));

    expect(openTriage).toHaveBeenCalledTimes(1);
  });
});
```

Replace `src/test/components/FocusSession.test.ts` with:

```ts
/**
 * The session planner of the Focus page.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import FocusSession from '@/newtab/components/FocusSession.svelte';
import { buildQueue, type Queue } from '@/lib/recommend/engine';
import type { Link } from '@/lib/types';
import { createMockCollection, createMockLink } from '../factories';

const DAY = 86_400_000;
const now = Date.now();
const collections = [createMockCollection({ id: 'a', name: 'A', order: 1 })];
const pages = ['p1', 'p2', 'p3', 'p4'].map((id) =>
  createMockLink({ id, title: `Page ${id}`, url: `https://example.com/${id}`, collectionId: 'a', createdAt: now - DAY }));
const queueOf = (links: Link[]): Queue => buildQueue({ links, collections, activity: {}, now });

async function pick(index: number): Promise<void> {
  await fireEvent.click(screen.getAllByRole('radio', { name: 'focus_session_minutes' })[index]);
}

describe('FocusSession', () => {
  it('lays out a session for the chosen time, with the minute each step starts', async () => {
    render(FocusSession, { props: { queue: queueOf(pages) } });
    await pick(1);

    expect(screen.getAllByRole('listitem')).toHaveLength(3);
    expect(screen.getAllByText('focus_session_at')).toHaveLength(3);
    expect(screen.getByText('focus_session_budget')).toBeInTheDocument();
  });

  it('opens the next link in a new tab', async () => {
    const open = vi.fn();
    render(FocusSession, { props: { queue: queueOf(pages) }, events: { open } });
    await pick(1);

    await fireEvent.click(screen.getByRole('button', { name: 'focus_session_next' }));

    expect(open.mock.calls[0][0].detail).toEqual({ link: pages[0], newTab: true });
  });

  it('completes a link from the list', async () => {
    const complete = vi.fn();
    render(FocusSession, { props: { queue: queueOf(pages) }, events: { complete } });
    await pick(0);

    await fireEvent.click(screen.getByRole('button', { name: 'progress_complete' }));

    expect(complete.mock.calls[0][0].detail.id).toBe('p1');
  });

  it('starts with the triage when there is any', async () => {
    const old = createMockLink({ id: 'old', collectionId: 'a', createdAt: now - 90 * DAY });
    const openTriage = vi.fn();
    render(FocusSession, { props: { queue: queueOf([...pages, old]) }, events: { openTriage } });
    await pick(0);

    await fireEvent.click(screen.getByRole('button', { name: /focus_session_triage_one/ }));

    expect(openTriage).toHaveBeenCalledTimes(1);
  });

  it('says when there is nothing to do', async () => {
    render(FocusSession, { props: { queue: queueOf([]) } });
    await pick(2);
    expect(screen.getByText('focus_session_empty')).toBeInTheDocument();
  });
});
```

Replace `src/test/components/FocusFronts.test.ts` with:

```ts
/**
 * The fronts of the Focus page.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import FocusFronts from '@/newtab/components/FocusFronts.svelte';
import { buildQueue } from '@/lib/recommend/engine';
import { createMockCollection, createMockLink, createMockWorkspace } from '../factories';

const now = Date.now();
const inbox = createMockCollection({ id: 'inbox', name: 'Inbox', order: 0, isDefault: true });
const hermes = createMockCollection({ id: 'h', name: 'Hermes', order: 1, workspaceId: 'ws-a' });
const workspaces = [createMockWorkspace({ id: 'ws-a', name: 'Agentes' })];
const links = [
  createMockLink({ id: 'i1', collectionId: 'inbox', createdAt: now - 86_400_000 }),
  createMockLink({ id: 'h1', collectionId: 'h', createdAt: now - 86_400_000 }),
  createMockLink({ id: 'h2', collectionId: 'h', createdAt: now - 86_400_000 }),
];
// Hermes (2 left) comes before Inbox (1 left).
const { fronts } = buildQueue({ links, collections: [inbox, hermes], activity: {}, now });

describe('FocusFronts', () => {
  it('lists each front with its path, reason and how many are left', () => {
    render(FocusFronts, { props: { fronts, workspaces } });

    expect(screen.getByText('Agentes › Hermes')).toBeInTheDocument();
    expect(screen.getByTitle('focus_front_count_many')).toHaveTextContent('2');
    expect(screen.getAllByText('reason_nearly_done_one')).toHaveLength(1);
  });

  it('pins a front as focus and marks it as reference from its menu', async () => {
    const collectionFocus = vi.fn();
    const collectionReference = vi.fn();
    render(FocusFronts, { props: { fronts, workspaces }, events: { collectionFocus, collectionReference } });

    await fireEvent.click(screen.getAllByRole('button', { name: 'column_pin_focus' })[0]);
    await fireEvent.click(screen.getByRole('button', { name: 'column_menu' }));
    await fireEvent.click(screen.getByRole('menuitem', { name: 'column_mark_reference' }));

    expect(collectionFocus.mock.calls[0][0].detail).toEqual({ collection: hermes, value: true });
    expect(collectionReference.mock.calls[0][0].detail).toEqual({ collection: hermes, value: true });
  });

  it('never offers to turn Inbox into a reference collection', () => {
    render(FocusFronts, { props: { fronts, workspaces } });
    expect(screen.getAllByRole('button', { name: 'column_menu' })).toHaveLength(1);
  });

  it('says when nothing is pending', () => {
    render(FocusFronts, { props: { fronts: [], workspaces } });
    expect(screen.getByText('now_empty_title')).toBeInTheDocument();
  });
});
```

Replace `src/test/components/FocusCompleted.test.ts` with:

```ts
/**
 * Completed links, by week, with undo.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import FocusCompleted from '@/newtab/components/FocusCompleted.svelte';
import { createMockLink } from '../factories';

const at = (day: number): number => new Date(2026, 8, day, 10).getTime();
const done = createMockLink({ id: 'a', title: 'Finished talk', completedAt: at(23) });
const pending = createMockLink({ id: 'b', title: 'Still open' });

describe('FocusCompleted', () => {
  it('lists completed links by week and undoes a completion', async () => {
    const restore = vi.fn();
    const { container } = render(FocusCompleted, { props: { links: [done, pending], now: at(30) }, events: { restore } });

    expect(screen.getByText('Finished talk')).toBeInTheDocument();
    expect(screen.queryByText('Still open')).toBeNull();
    expect(screen.getByText('focus_week_of')).toBeInTheDocument();
    expect(container.querySelector('[data-link-id="a"]')).not.toBeNull();

    await fireEvent.click(screen.getByRole('button', { name: 'progress_undo' }));

    expect(restore.mock.calls[0][0].detail).toEqual(done);
  });

  it('names the current week', () => {
    render(FocusCompleted, { props: { links: [done], now: at(24) } });
    expect(screen.getByText('focus_completed_this_week')).toBeInTheDocument();
  });

  it('shows two weeks, and all of them on request', async () => {
    const older = [9, 14].map((day) => createMockLink({ id: `d${day}`, title: `Done ${day}`, completedAt: at(day) }));
    render(FocusCompleted, { props: { links: [done, ...older], now: at(24) } });

    expect(screen.queryByText('Done 9')).toBeNull();
    await fireEvent.click(screen.getByRole('button', { name: 'focus_completed_all' }));

    expect(screen.getByText('Done 9')).toBeInTheDocument();
  });

  it('says when nothing was completed yet', () => {
    render(FocusCompleted, { props: { links: [pending], now: at(24) } });
    expect(screen.getByText('focus_completed_empty')).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Run them to see them fail**

Run: `docker compose run --rm app npx vitest run src/test/lib/recommend/progress.test.ts src/test/components/FocusView.test.ts src/test/components/FocusSession.test.ts src/test/components/FocusFronts.test.ts src/test/components/FocusCompleted.test.ts`
Expected: FAIL — no `queueForecast`, no radios, no menus, no `now` prop.

- [ ] **Step 4: The forecast**

Append to `src/lib/recommend/progress.ts`:

```ts
export interface Forecast {
  /** Completions per week in the four full weeks before this one. */
  perWeek: number;
  /** Weeks until the queue is done at that pace; null beyond a year. */
  weeks: number | null;
}

/** How long the queue lasts at the recent pace (spec §10.1); null without a pace. */
export function queueForecast(bars: WeekBar[], queueSize: number): Forecast | null {
  if (queueSize === 0) {
    return { perWeek: 0, weeks: 0 };
  }
  const recent = bars.slice(-5, -1);
  const total = recent.reduce((sum, bar) => sum + bar.completed, 0);
  if (recent.length === 0 || total === 0) {
    return null;
  }
  const perWeek = total / recent.length;
  const weeks = Math.ceil(queueSize / perWeek);
  return { perWeek, weeks: weeks > 52 ? null : weeks };
}
```

- [ ] **Step 5: Rewrite `FocusView.svelte`**

```svelte
<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { plural, t } from '@/lib/i18n';
  import type { Link, RecoStats, Workspace } from '@/lib/types';
  import type { Queue } from '@/lib/recommend/engine';
  import { addDays, shortDate, weekStart } from '@/lib/recommend/dates';
  import { completedByWeek, previousQueue, queueForecast } from '@/lib/recommend/progress';
  import FocusSession from './FocusSession.svelte';
  import FocusTriagePanel from './FocusTriagePanel.svelte';
  import FocusFronts from './FocusFronts.svelte';
  import FocusCompleted from './FocusCompleted.svelte';

  export let queue: Queue;
  export let links: Link[];
  export let stats: RecoStats;
  export let now: number;
  export let workspaces: Workspace[] = [];

  const dispatch = createEventDispatcher<{ openTriage: void }>();

  $: bars = completedByWeek(links, now);
  $: thisWeek = bars[bars.length - 1].completed;
  $: tallest = Math.max(1, ...bars.map((bar) => bar.completed));
  $: previous = previousQueue(stats, now);
  $: queueChange = previous === undefined || previous === queue.size
    ? ''
    : queue.size < previous ? t('focus_queue_fell', previous, queue.size) : t('focus_queue_rose', previous, queue.size);
  $: forecast = queueForecast(bars, queue.size);
  $: forecastText = forecast === null
    ? ''
    : queue.size === 0
      ? t('focus_forecast_zero')
      : [
        t('focus_forecast_rate', Math.max(1, Math.round(forecast.perWeek))),
        forecast.weeks === null ? '' : plural(forecast.weeks, 'focus_forecast_weeks_one', 'focus_forecast_weeks_many'),
      ].filter((part) => part !== '').join(' ');
  $: labels = bars.map((_, i) => {
    if (i === bars.length - 1) {
      return t('focus_week_now');
    }
    return i % 2 === 0 ? shortDate(weekStart(addDays(now, -7 * (bars.length - 1 - i)))) : '';
  });
</script>

<div class="focus-view scrollbar-thin">
  <header class="focus-head">
    <h1>{t('focus_title')}</h1>
    <p><strong>{plural(thisWeek, 'focus_week_one', 'focus_week_many')}.</strong>{#if queueChange !== ''} {queueChange}{/if}</p>
  </header>

  <div class="focus-grid">
    <div class="focus-column">
      <FocusSession {queue} on:open on:complete on:openTriage={() => dispatch('openTriage')} />
      <FocusTriagePanel items={queue.triage} on:openTriage={() => dispatch('openTriage')} />
    </div>

    <div class="focus-column">
      <section id="focus-progress" class="focus-section" aria-labelledby="focus-progress-title">
        <div class="focus-section-head">
          <h2 id="focus-progress-title">{t('focus_progress_title')}</h2>
        </div>
        <div class="bars" aria-hidden="true">
          {#each bars as bar, i (bar.week)}
            <span class="bar" class:current={i === bars.length - 1} style:--height="{Math.round((bar.completed / tallest) * 100)}%" title={String(bar.completed)}></span>
          {/each}
        </div>
        <div class="bar-labels" aria-hidden="true">
          {#each labels as label, i (i)}<span>{label}</span>{/each}
        </div>
        {#if forecastText !== ''}
          <p class="forecast">{forecastText}</p>
        {/if}
      </section>

      <FocusFronts fronts={queue.fronts} {workspaces} on:collectionFocus on:collectionReference />
      <FocusCompleted {links} {now} on:restore on:open />
    </div>
  </div>
</div>

<style>
  .focus-view {
    flex: 1;
    overflow-y: auto;
    padding: var(--space-2) 32px var(--space-8);
  }

  .focus-head {
    display: flex;
    align-items: flex-end;
    gap: 20px;
    margin: var(--space-4) 0 26px;
  }

  h1 {
    margin: 0;
    font: 600 48px / 0.85 var(--font-display);
    letter-spacing: -0.03em;
    color: var(--text-primary);
  }

  .focus-head p {
    margin: 0 0 2px;
    font-size: var(--text-base);
    color: var(--text-secondary);
  }

  .focus-head strong {
    color: var(--semantic-success);
    font-weight: 650;
  }

  .focus-grid {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 380px;
    gap: var(--space-4);
    align-items: start;
  }

  .focus-column {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
    min-width: 0;
  }

  .focus-view :global(.focus-section) {
    padding: 20px 22px;
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-xl);
    background: var(--surface-elevated);
    box-shadow: var(--shadow-lift);
  }

  .focus-view :global(.focus-section-head) {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    margin-bottom: var(--space-4);
  }

  .focus-view :global(.focus-section h2) {
    margin: 0;
    font: 650 var(--text-md) / 1.2 var(--font-body);
    letter-spacing: -0.01em;
    color: var(--text-primary);
  }

  .focus-view :global(.focus-empty) {
    margin: 0;
    font-size: var(--text-sm);
    color: var(--text-tertiary);
  }

  .bars,
  .bar-labels {
    display: grid;
    grid-template-columns: repeat(8, 1fr);
    gap: 7px;
  }

  .bars {
    align-items: end;
    height: 92px;
  }

  .bar {
    height: max(3px, var(--height));
    border-radius: 5px 5px 2px 2px;
    background: color-mix(in srgb, var(--semantic-success) 28%, transparent);
  }

  .bar.current {
    background: var(--semantic-success);
  }

  .bar-labels {
    margin-top: 7px;
    font-size: 10.5px;
    color: var(--text-tertiary);
    text-align: center;
  }

  .forecast {
    margin: 14px 0 0;
    font-size: var(--text-sm);
    line-height: 1.5;
    color: var(--text-secondary);
  }

  @media (max-width: 1199px) {
    .focus-grid {
      grid-template-columns: minmax(0, 1fr);
    }
  }
</style>
```

- [ ] **Step 6: Rewrite `FocusSession.svelte`**

```svelte
<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { getCollectionDisplayName, plural, t } from '@/lib/i18n';
  import type { Link } from '@/lib/types';
  import type { Queue } from '@/lib/recommend/engine';
  import { buildSession, SESSION_OPTIONS, type SessionItem, type SessionMinutes } from '@/lib/recommend/session';
  import Button from '@/shared/components/ui/Button.svelte';
  import Icon from '@/shared/components/ui/Icon.svelte';
  import IconButton from '@/shared/components/ui/IconButton.svelte';
  import LinkTile from '@/shared/components/ui/LinkTile.svelte';
  import Segmented from '@/shared/components/ui/Segmented.svelte';
  import { ACTION_KEYS, effortText } from '../next-up-labels';

  export let queue: Queue;

  const dispatch = createEventDispatcher<{
    open: { link: Link; newTab: boolean };
    complete: Link;
    openTriage: void;
  }>();

  let minutes: SessionMinutes | null = null;
  let opened = new Set<string>();
  /** The sequence as chosen: opening a link must not reshuffle it. */
  let planned: SessionItem[] = [];

  $: options = SESSION_OPTIONS.map((value) => ({ value, label: t('focus_session_minutes', value) }));
  $: eligible = new Set(queue.fronts.flatMap((front) => front.eligible.map((link) => link.id)));
  $: items = planned.flatMap((item): SessionItem[] => {
    if (item.type === 'triage') {
      return queue.triage.length === 0 ? [] : [{ type: 'triage', count: Math.min(item.count, queue.triage.length) }];
    }
    return eligible.has(item.rec.link.id) ? [item] : [];
  });
  $: timeline = withStarts(items);
  $: plannedMinutes = timeline.reduce((sum, row) => sum + row.minutes, 0);
  $: nextLink = items.flatMap((item) => (item.type === 'link' && !opened.has(item.rec.link.id) ? [item.rec.link] : []))[0];

  /** The engine counts one minute for the triage step. */
  function stepMinutes(item: SessionItem): number {
    return item.type === 'triage' ? 1 : item.rec.effort;
  }

  function withStarts(list: SessionItem[]): { item: SessionItem; start: number; minutes: number }[] {
    let start = 0;
    return list.map((item) => {
      const row = { item, start, minutes: stepMinutes(item) };
      start += row.minutes;
      return row;
    });
  }

  function tone(item: SessionItem): string {
    if (item.type === 'triage') {
      return 'warning';
    }
    return item.rec.role === 'continue' ? 'accent' : 'plain';
  }

  function choose(event: CustomEvent<string | number>): void {
    minutes = event.detail as SessionMinutes;
    planned = buildSession(queue, minutes);
    opened = new Set();
  }

  /** The session keeps the Focus page: links open in a new tab. */
  function open(link: Link): void {
    opened = new Set([...opened, link.id]);
    dispatch('open', { link, newTab: true });
  }
</script>

<section id="focus-session" class="focus-section" aria-labelledby="focus-session-title">
  <div class="focus-section-head">
    <h2 id="focus-session-title">{t('focus_session_title')}</h2>
    <span class="question">{t('focus_session_pick')}</span>
    <Segmented label={t('focus_session_pick')} {options} value={minutes} on:change={choose} />
  </div>

  {#if minutes !== null}
    {#if items.length === 0}
      <p class="focus-empty">{t('focus_session_empty')}</p>
    {:else}
      <ol class="timeline">
        {#each timeline as row (row.item.type === 'link' ? row.item.rec.link.id : 'triage')}
          <li class="step" class:opened={row.item.type === 'link' && opened.has(row.item.rec.link.id)}>
            <span class="at">{t('focus_session_at', row.start)}</span>
            {#if row.item.type === 'triage'}
              <span class="triage-tile"><Icon name="alert" size={17} /></span>
              <button type="button" class="what" on:click={() => dispatch('openTriage')}>
                <span class="do"><strong>{t('focus_session_triage_verb')}</strong></span>
                <span class="title">{plural(row.item.count, 'focus_session_triage_one', 'focus_session_triage_many')}</span>
              </button>
              <span class="min">{effortText(1)}</span>
              <span></span>
            {:else}
              {@const rec = row.item.rec}
              <LinkTile link={rec.link} size={36} />
              <button type="button" class="what" on:click={() => open(rec.link)}>
                <span class="do"><strong>{t(ACTION_KEYS[rec.action])}</strong> · {getCollectionDisplayName(rec.collection)}</span>
                <span class="title">{rec.link.title || rec.link.url}</span>
              </button>
              <span class="min">
                {effortText(rec.effort)}
                {#if row.item.overBudget}<span class="over">{t('focus_session_over_budget')}</span>{/if}
              </span>
              <IconButton icon="check" size="sm" tone="success" label={t('progress_complete')} on:click={() => dispatch('complete', rec.link)} />
            {/if}
          </li>
        {/each}
      </ol>

      <div class="budget">
        <span class="bar" aria-hidden="true">
          {#each timeline as row, i (i)}
            <i class={tone(row.item)} style:flex-grow={row.minutes}></i>
          {/each}
          {#if plannedMinutes < minutes}
            <i class="rest" style:flex-grow={minutes - plannedMinutes}></i>
          {/if}
        </span>
        <span class="label">{t('focus_session_budget', plannedMinutes, minutes)}</span>
        {#if nextLink !== undefined}
          <Button variant="primary" on:click={() => nextLink !== undefined && open(nextLink)}>{t('focus_session_next')}</Button>
        {/if}
      </div>
    {/if}
  {/if}
</section>

<style>
  .question {
    margin-left: auto;
    font-size: 12.5px;
    color: var(--text-tertiary);
  }

  .timeline {
    margin: var(--space-2) 0 0;
    padding: 0;
    list-style: none;
  }

  .step {
    display: grid;
    grid-template-columns: 44px 36px minmax(0, 1fr) auto 28px;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-2) 0;
  }

  .step.opened .title {
    color: var(--text-secondary);
  }

  .at {
    font-size: var(--text-xs);
    color: var(--text-tertiary);
    font-variant-numeric: tabular-nums;
    text-align: right;
  }

  .triage-tile {
    display: grid;
    place-items: center;
    width: 36px;
    height: 36px;
    border-radius: 10px;
    background: var(--warning-soft);
    color: var(--semantic-warning);
  }

  .what {
    display: flex;
    flex-direction: column;
    min-width: 0;
    padding: 0;
    border: none;
    background: transparent;
    color: inherit;
    font: inherit;
    text-align: left;
    cursor: pointer;
  }

  .do {
    font-size: var(--text-xs);
    color: var(--text-secondary);
  }

  .do strong {
    color: var(--text-primary);
    font-weight: 600;
  }

  .title {
    margin-top: 2px;
    font: 500 var(--text-base) / 1.3 var(--font-body);
    color: var(--text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .what:hover .title {
    text-decoration: underline;
    text-decoration-color: var(--border-strong);
    text-underline-offset: 3px;
  }

  .min {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    font-size: 12.5px;
    color: var(--text-tertiary);
    font-variant-numeric: tabular-nums;
  }

  .over {
    font-size: var(--text-2xs);
  }

  .budget {
    display: flex;
    align-items: center;
    gap: 14px;
    margin-top: var(--space-4);
    padding-top: var(--space-4);
    border-top: 1px solid var(--border-subtle);
  }

  .bar {
    display: flex;
    flex: 1;
    gap: 2px;
    height: 6px;
    border-radius: 3px;
    background: var(--surface-well);
    overflow: hidden;
  }

  .bar i {
    display: block;
    height: 100%;
    background: var(--text-secondary);
  }

  .bar i.warning {
    background: var(--semantic-warning);
  }

  .bar i.accent {
    background: var(--accent-primary);
  }

  .bar i.rest {
    background: transparent;
  }

  .label {
    font-size: 12.5px;
    color: var(--text-secondary);
    font-variant-numeric: tabular-nums;
  }
</style>
```

- [ ] **Step 7: Rewrite `FocusFronts.svelte`**

```svelte
<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { plural, t } from '@/lib/i18n';
  import type { Collection, Workspace } from '@/lib/types';
  import { INBOX_COLLECTION_ID } from '@/lib/types';
  import { advanceReason, type Front } from '@/lib/recommend/engine';
  import IconButton from '@/shared/components/ui/IconButton.svelte';
  import Menu from '@/shared/components/ui/Menu.svelte';
  import MenuItem from '@/shared/components/ui/MenuItem.svelte';
  import { collectionPath, reasonText } from '../next-up-labels';

  export let fronts: Front[];
  export let workspaces: Workspace[] = [];

  const dispatch = createEventDispatcher<{
    collectionFocus: { collection: Collection; value: boolean };
    collectionReference: { collection: Collection; value: boolean };
  }>();

  let openMenu: string | null = null;
  const anchors: Record<string, HTMLElement> = {};

  function markReference(collection: Collection): void {
    openMenu = null;
    dispatch('collectionReference', { collection, value: true });
  }
</script>

<section id="focus-fronts" class="focus-section" aria-labelledby="focus-fronts-title">
  <div class="focus-section-head">
    <h2 id="focus-fronts-title">{t('focus_fronts_title')}</h2>
  </div>
  {#if fronts.length === 0}
    <p class="focus-empty">{t('now_empty_title')}</p>
  {:else}
    <ul class="fronts">
      {#each fronts as front (front.collection.id)}
        {@const pinned = front.collection.focus === true}
        <li class="front">
          <span class="dot" style:--dot={front.collection.color ?? 'var(--text-tertiary)'} aria-hidden="true"></span>
          <span class="name">
            <span class="path">{collectionPath(front.collection, workspaces)}</span>
            <small>{reasonText(advanceReason(front))}</small>
          </span>
          <span class="count" title={plural(front.eligible.length, 'focus_front_count_one', 'focus_front_count_many')}>{front.eligible.length}</span>
          <IconButton
            icon={pinned ? 'pin-filled' : 'pin'}
            size="sm"
            label={pinned ? t('column_unpin_focus') : t('column_pin_focus')}
            pressed={pinned}
            on:click={() => dispatch('collectionFocus', { collection: front.collection, value: !pinned })}
          />
          {#if front.collection.id !== INBOX_COLLECTION_ID}
            <span class="anchor" bind:this={anchors[front.collection.id]}>
              <IconButton
                icon="more"
                size="sm"
                label={t('column_menu')}
                expanded={openMenu === front.collection.id}
                on:click={() => (openMenu = openMenu === front.collection.id ? null : front.collection.id)}
              />
              {#if openMenu === front.collection.id}
                <Menu label={t('column_menu')} align="end" anchor={anchors[front.collection.id]} on:close={() => (openMenu = null)}>
                  <MenuItem icon="reference" on:select={() => markReference(front.collection)}>{t('column_mark_reference')}</MenuItem>
                </Menu>
              {/if}
            </span>
          {:else}
            <span></span>
          {/if}
        </li>
      {/each}
    </ul>
  {/if}
</section>

<style>
  .fronts {
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .front {
    display: grid;
    grid-template-columns: 8px minmax(0, 1fr) auto 28px 28px;
    align-items: center;
    gap: 10px;
    padding: 10px 0;
    border-top: 1px solid var(--border-subtle);
  }

  .front:first-child {
    padding-top: 0;
    border-top: 0;
  }

  .dot {
    width: 8px;
    height: 8px;
    border-radius: 3px;
    background: var(--dot);
  }

  .name {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  .path {
    font: 550 13.5px / 1.3 var(--font-body);
    color: var(--text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  small {
    margin-top: 2px;
    font-size: 11.5px;
    color: var(--text-tertiary);
  }

  .count {
    font-size: var(--text-sm);
    color: var(--text-secondary);
    font-variant-numeric: tabular-nums;
  }

  .anchor {
    position: relative;
  }
</style>
```

- [ ] **Step 8: Rewrite `FocusCompleted.svelte`**

```svelte
<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { t } from '@/lib/i18n';
  import type { Link } from '@/lib/types';
  import { shortDate, weekStart } from '@/lib/recommend/dates';
  import { completedHistory } from '@/lib/recommend/progress';
  import Button from '@/shared/components/ui/Button.svelte';
  import Icon from '@/shared/components/ui/Icon.svelte';

  export let links: Link[];
  export let now: number = Date.now();

  const dispatch = createEventDispatcher<{
    restore: Link;
    open: { link: Link; newTab: boolean };
  }>();

  let showAll = false;

  $: history = completedHistory(links);
  $: thisWeek = weekStart(now);
  $: shown = showAll ? history : history.slice(0, 2);

  function weekLabel(start: number): string {
    return start === thisWeek ? t('focus_completed_this_week') : t('focus_week_of', shortDate(start));
  }

  function dayLabel(ms: number): string {
    return ms >= thisWeek ? new Date(ms).toLocaleDateString(undefined, { weekday: 'short' }) : shortDate(ms);
  }
</script>

<section id="focus-completed" class="focus-section" aria-labelledby="focus-completed-title">
  <div class="focus-section-head">
    <h2 id="focus-completed-title">{t('focus_completed_title')}</h2>
    {#if history.length > 2}
      <span class="toggle">
        <Button variant="quiet" size="sm" on:click={() => (showAll = !showAll)}>
          {showAll ? t('focus_completed_less') : t('focus_completed_all')}
        </Button>
      </span>
    {/if}
  </div>
  {#if history.length === 0}
    <p class="focus-empty">{t('focus_completed_empty')}</p>
  {:else}
    {#each shown as group (group.week)}
      <h3 class="week">{weekLabel(group.start)}</h3>
      <ul class="rows">
        {#each group.links as link (link.id)}
          <li class="row" data-link-id={link.id}>
            <span class="ok" aria-hidden="true"><Icon name="check" size={10} stroke={3} /></span>
            <button type="button" class="title" on:click={() => dispatch('open', { link, newTab: true })}>{link.title || link.url}</button>
            <span class="date">{dayLabel(link.completedAt ?? 0)}</span>
            <span class="undo">
              <Button variant="quiet" size="sm" on:click={() => dispatch('restore', link)}>{t('progress_undo')}</Button>
            </span>
          </li>
        {/each}
      </ul>
    {/each}
  {/if}
</section>

<style>
  .toggle {
    margin-left: auto;
  }

  .week {
    margin: var(--space-2) 0 6px;
    font: 500 11.5px / 1.2 var(--font-body);
    color: var(--text-tertiary);
  }

  .rows {
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .row {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 5px 0;
    border-radius: var(--radius-sm);
    font-size: var(--text-sm);
  }

  .row:global(.revealed) {
    background: var(--accent-soft);
    box-shadow: 0 0 0 1px var(--accent-primary);
  }

  .ok {
    display: grid;
    place-items: center;
    flex-shrink: 0;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: var(--success-soft);
    color: var(--semantic-success);
  }

  .title {
    flex: 1;
    min-width: 0;
    padding: 0;
    border: none;
    background: transparent;
    color: var(--text-primary);
    font: 400 var(--text-sm) / 1.3 var(--font-body);
    text-align: left;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    cursor: pointer;
  }

  .date {
    font-size: 11.5px;
    color: var(--text-tertiary);
  }

  .undo {
    opacity: 0;
    transition: opacity var(--duration-fast) var(--ease-out);
  }

  .row:hover .undo,
  .row:focus-within .undo {
    opacity: 1;
  }
</style>
```

- [ ] **Step 9: Remove the keys that lost their last use**

```bash
/usr/bin/grep -rn "'focus_queue'\|focus_queue_down\|focus_queue_up\|nextup_empty" src --include='*.ts' --include='*.svelte'
docker compose run --rm app node scripts/i18n/keys.mjs remove focus_queue focus_queue_down focus_queue_up nextup_empty
```

Expected: the `grep` prints nothing.

- [ ] **Step 10: Run the tests of this task**

Run: `docker compose run --rm app npx vitest run src/test/lib/recommend/progress.test.ts src/test/components/FocusView.test.ts src/test/components/FocusSession.test.ts src/test/components/FocusFronts.test.ts src/test/components/FocusCompleted.test.ts src/test/components/FocusTriagePanel.test.ts src/test/lib/locales.test.ts`
Expected: PASS.

- [ ] **Step 11: Suite, lint, size, look**

```bash
make test && make lint
make build && docker compose run --rm -T app du -sb dist
make preview
```

Expected: tests pass; 12 old lint errors; `du` ≤ 573440. In the preview, Focus (F or the rail): "Foco" in the condensed face with the green sentence; two columns at 1440 px (session and triage on the left; week by week, fronts and completed on the right), one column at 1024 px; the session shows 15/30/60 as a segmented control, then the timeline with 0′, 1′, … and the colored budget bar; the fronts have the coral pin; completed rows show Undo on hover. Capture both themes. `make preview-stop`.

- [ ] **Step 12: Commit**

```bash
git add src/lib/recommend/progress.ts src/newtab/components/FocusView.svelte src/newtab/components/FocusSession.svelte src/newtab/components/FocusFronts.svelte src/newtab/components/FocusCompleted.svelte src/test/lib/recommend/progress.test.ts src/test/components/FocusView.test.ts src/test/components/FocusSession.test.ts src/test/components/FocusFronts.test.ts src/test/components/FocusCompleted.test.ts public/_locales/en/messages.json public/_locales/pt_BR/messages.json
git commit -m "feat(focus): two columns, the session as a timeline with a budget, the week with a forecast, fronts with a pin

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

### Task 13: The session across tabs

**Files:**
- Create: `src/lib/storage/session.ts`, `src/lib/stores/session.ts`, `src/newtab/components/SessionPill.svelte`; `src/test/lib/storage/session.test.ts`, `src/test/stores/session.test.ts`, `src/test/components/SessionPill.test.ts`
- Modify: `src/lib/recommend/session.ts`, `src/lib/storage/progress.ts` (`clearUsageData`), `src/lib/storage/index.ts`, `src/test/mocks/storage.ts`, `src/newtab/components/FocusSession.svelte`, `FocusView.svelte`, `NowSection.svelte`, `src/newtab/App.svelte`; tests `src/test/lib/recommend/session.test.ts`, `src/test/lib/storage/progress.test.ts`, `src/test/components/FocusSession.test.ts`, `src/test/components/NowSection.test.ts`
- Locales: add `session_title`, `session_left`, `session_ended`, `session_dismiss`, `focus_session_start`, `focus_session_end`, `focus_session_progress`, `now_session_position`

**Interfaces:**
- Consumes: `buildSession`, `SESSION_OPTIONS`, `SessionMinutes` (`session.ts`); `recommendation`, `Queue`, `Recommendation` (`engine.ts`); `isReference` (`state.ts`); `storage`, `withDataLock` (`storage/core.ts`); `ProgressRing`, `IconButton`, `Button` (Task 3); `CommandAction` (Task 10).
- Produces:
  - In `session.ts`: `PlanItem = { type: 'triage'; count: number } | { type: 'link'; linkId: string }`; `FocusSession = { minutes: SessionMinutes; startedAt: number; items: PlanItem[]; completedIds: string[] }`; `SESSION_TTL_MS = 12 * 60 * 60_000`; `startSession(queue, minutes, now): FocusSession`; `parseFocusSession(value: unknown): FocusSession | null`; `SessionView = { current?: Recommendation; next: Recommendation[]; triageLeft: number; done: number; total: number; position: number; remainingMs: number; elapsed: number; timeUp: boolean; finished: boolean }`; `sessionView(session, links, queue, collections, now): SessionView`.
  - In `storage/session.ts` (and re-exported by `@/lib/storage`): `SESSION_KEY = 'focusSession'`, `getFocusSession()`, `saveFocusSession(session)`, `clearFocusSession()`, `markSessionCompletion(linkId, completed)`.
  - `sessionStore` with `subscribe`, `load(now?)`, `start(session)`, `markCompleted(linkId, completed)`, `end()`.
  - `<SessionPill view: SessionView>`; dispatches `open`, `dismiss`.
  - `FocusSession` gains the prop `session: SessionView | null` and the events `start` (minutes) and `end`; `FocusView` gains `session` and forwards them. `NowSection` gains `session: SessionView | null` and forwards `endSession`.

- [ ] **Step 1: Locale keys**

`.superpowers/sdd/2026-09-25-nova-interface/keys-13-add.json`:

```json
{
  "session_title": { "en": "Session", "pt_BR": "Sessão" },
  "session_left": { "en": "$1 min left", "pt_BR": "$1 min restantes", "placeholders": { "minutes": "$1" } },
  "session_ended": { "en": "Session over: $1 of $2", "pt_BR": "Sessão encerrada: $1 de $2", "placeholders": { "done": "$1", "total": "$2" } },
  "session_dismiss": { "en": "Close the session summary", "pt_BR": "Fechar o resumo da sessão" },
  "focus_session_start": { "en": "Start session", "pt_BR": "Começar sessão" },
  "focus_session_end": { "en": "End", "pt_BR": "Encerrar" },
  "focus_session_progress": { "en": "$1 of $2 done", "pt_BR": "$1 de $2 feitos", "placeholders": { "done": "$1", "total": "$2" } },
  "now_session_position": { "en": "$1 of $2 in this session", "pt_BR": "$1 de $2 na sessão", "placeholders": { "position": "$1", "total": "$2" } }
}
```

```bash
docker compose run --rm app node scripts/i18n/keys.mjs add .superpowers/sdd/2026-09-25-nova-interface/keys-13-add.json
```

- [ ] **Step 2: Write the failing tests for the pure part**

Append to `src/test/lib/recommend/session.test.ts` (add `parseFocusSession`, `sessionView`, `startSession`, `SESSION_TTL_MS`, `type FocusSession` to its import from `@/lib/recommend/session`):

```ts
describe('stored session', () => {
  const now = new Date(2026, 8, 25, 10).getTime();
  const collections = [createMockCollection({ id: 'a', name: 'A', order: 1 })];
  const pages = ['p1', 'p2', 'p3'].map((id) =>
    createMockLink({ id, title: `Page ${id}`, url: `https://example.com/${id}`, collectionId: 'a', createdAt: now - DAY }));
  const queueOf = (links: Link[]) => buildQueue({ links, collections, activity: {}, now });

  it('keeps only ids of the plan when it starts', () => {
    const started = startSession(queueOf(pages), 30, now);

    expect(started).toEqual({
      minutes: 30,
      startedAt: now,
      completedIds: [],
      items: [{ type: 'link', linkId: 'p1' }, { type: 'link', linkId: 'p2' }, { type: 'link', linkId: 'p3' }],
    });
  });

  it('treats anything malformed as no session', () => {
    const good: FocusSession = { minutes: 15, startedAt: now, completedIds: [], items: [{ type: 'triage', count: 2 }] };

    expect(parseFocusSession(good)).toEqual(good);
    for (const bad of [null, 'x', { ...good, minutes: 20 }, { ...good, startedAt: '1' }, { ...good, items: [{ type: 'link' }] }, { ...good, completedIds: [3] }]) {
      expect(parseFocusSession(bad)).toBeNull();
    }
  });

  it('follows the plan: the first link not completed is the current one', () => {
    const session: FocusSession = { minutes: 30, startedAt: now - 10 * 60_000, completedIds: ['p1'], items: pages.map((p) => ({ type: 'link', linkId: p.id })) };
    const links = pages.map((p) => (p.id === 'p1' ? { ...p, completedAt: now - 60_000 } : p));

    const view = sessionView(session, links, queueOf(links), collections, now);

    expect(view.current?.link.id).toBe('p2');
    expect(view.next.map((rec) => rec.link.id)).toEqual(['p3']);
    expect([view.done, view.total, view.position]).toEqual([1, 3, 2]);
    expect(view.remainingMs).toBe(20 * 60_000);
    expect(view.elapsed).toBeCloseTo(1 / 3, 5);
    expect([view.timeUp, view.finished]).toEqual([false, false]);
  });

  it('drops links deleted, turned into reference or completed outside the session', () => {
    const session: FocusSession = { minutes: 30, startedAt: now, completedIds: [], items: [...pages.map((p) => ({ type: 'link' as const, linkId: p.id })), { type: 'link', linkId: 'gone' }] };
    const links = [{ ...pages[0], completedAt: now }, { ...pages[1], reference: true }, pages[2]];

    const view = sessionView(session, links, queueOf(links), collections, now);

    expect(view.current?.link.id).toBe('p3');
    expect([view.done, view.total]).toEqual([0, 1]);
  });

  it('is finished when the time is up or nothing is left', () => {
    const session: FocusSession = { minutes: 15, startedAt: now - 16 * 60_000, completedIds: [], items: [{ type: 'link', linkId: 'p1' }] };
    expect(sessionView(session, pages, queueOf(pages), collections, now)).toMatchObject({ timeUp: true, finished: true, remainingMs: 0 });

    const done = { ...session, startedAt: now, completedIds: ['p1'] };
    const links = [{ ...pages[0], completedAt: now }, pages[1], pages[2]];
    expect(sessionView(done, links, queueOf(links), collections, now)).toMatchObject({ current: undefined, done: 1, total: 1, finished: true });
  });

  it('keeps a triage step while there is triage to do', () => {
    const old = createMockLink({ id: 'old', collectionId: 'a', createdAt: now - 90 * DAY });
    const session: FocusSession = { minutes: 15, startedAt: now, completedIds: [], items: [{ type: 'triage', count: 5 }] };

    expect(sessionView(session, [old], queueOf([old]), collections, now)).toMatchObject({ triageLeft: 1, finished: false });
    expect(sessionView(session, [], queueOf([]), collections, now)).toMatchObject({ triageLeft: 0, finished: true });
  });

  it('expires after twelve hours', () => {
    expect(SESSION_TTL_MS).toBe(12 * 60 * 60_000);
  });
});
```

`src/test/lib/storage/session.test.ts`:

```ts
/**
 * The stored Focus session (spec §11.1).
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { chromeMock, clearMockStorage } from '../../setup';
import {
  clearFocusSession, clearUsageData, getFocusSession, markSessionCompletion, saveFocusSession,
} from '@/lib/storage';
import type { FocusSession } from '@/lib/recommend/session';

const session: FocusSession = {
  minutes: 30, startedAt: 1000, completedIds: [], items: [{ type: 'link', linkId: 'a' }, { type: 'link', linkId: 'b' }],
};

describe('focus session storage', () => {
  beforeEach(() => clearMockStorage());

  it('saves, reads and clears the session', async () => {
    await saveFocusSession(session);
    expect(await getFocusSession()).toEqual(session);

    await clearFocusSession();
    expect(await getFocusSession()).toBeNull();
  });

  it('reads a malformed value as no session', async () => {
    await chromeMock.storage.local.set({ focusSession: { minutes: 30 } });
    expect(await getFocusSession()).toBeNull();
  });

  it('marks and unmarks a link of the plan as completed, and ignores links outside it', async () => {
    await saveFocusSession(session);

    await markSessionCompletion('a', true);
    await markSessionCompletion('z', true);
    expect((await getFocusSession())?.completedIds).toEqual(['a']);

    await markSessionCompletion('a', false);
    expect((await getFocusSession())?.completedIds).toEqual([]);
  });

  it('is erased with the usage data', async () => {
    await saveFocusSession(session);
    await clearUsageData();
    expect(await getFocusSession()).toBeNull();
  });
});
```

- [ ] **Step 3: Run them to see them fail**

Run: `docker compose run --rm app npx vitest run src/test/lib/recommend/session.test.ts src/test/lib/storage/session.test.ts`
Expected: FAIL — `startSession` and `getFocusSession` do not exist.

- [ ] **Step 4: Write the pure part**

In `src/lib/recommend/session.ts`, replace the file's header comment with:

```ts
/**
 * Focus session (spec §6.5, §11): a triage batch, the link already started,
 * then the next links of the two best fronts that fit the time. A started
 * session is stored as ids under `focusSession` and followed in every tab.
 */
```

change the engine import to `import { advanceReason, recommendation, type Queue, type Recommendation } from './engine';` (keep as it is if already identical), add `import type { Collection, Link } from '@/lib/types';` and `import { isReference } from './state';`, and append:

```ts
export type PlanItem = { type: 'triage'; count: number } | { type: 'link'; linkId: string };

export interface FocusSession {
  minutes: SessionMinutes;
  startedAt: number;
  items: PlanItem[];
  /** Links completed during the session, for the summary. */
  completedIds: string[];
}

/** A session left behind is dropped when the page loads this long after it started. */
export const SESSION_TTL_MS = 12 * 60 * 60_000;

export function startSession(queue: Queue, minutes: SessionMinutes, now: number): FocusSession {
  return {
    minutes,
    startedAt: now,
    completedIds: [],
    items: buildSession(queue, minutes).map((item): PlanItem =>
      (item.type === 'triage' ? { type: 'triage', count: item.count } : { type: 'link', linkId: item.rec.link.id })),
  };
}

/** A stored value if it is a session; anything malformed counts as none. */
export function parseFocusSession(value: unknown): FocusSession | null {
  if (typeof value !== 'object' || value === null) {
    return null;
  }
  const raw = value as Record<string, unknown>;
  if (!SESSION_OPTIONS.includes(raw.minutes as SessionMinutes) || typeof raw.startedAt !== 'number'
    || !Array.isArray(raw.items) || !Array.isArray(raw.completedIds)
    || !raw.completedIds.every((id) => typeof id === 'string')) {
    return null;
  }
  const items: PlanItem[] = [];
  for (const entry of raw.items as unknown[]) {
    const item = (typeof entry === 'object' && entry !== null ? entry : {}) as Record<string, unknown>;
    if (item.type === 'triage' && typeof item.count === 'number') {
      items.push({ type: 'triage', count: item.count });
    } else if (item.type === 'link' && typeof item.linkId === 'string') {
      items.push({ type: 'link', linkId: item.linkId });
    } else {
      return null;
    }
  }
  return { minutes: raw.minutes as SessionMinutes, startedAt: raw.startedAt, items, completedIds: raw.completedIds as string[] };
}

export interface SessionView {
  /** The link to do now: the first of the plan not completed. */
  current?: Recommendation;
  /** The links after it. */
  next: Recommendation[];
  /** Links of the triage step still waiting; 0 when done or absent. */
  triageLeft: number;
  /** Links completed during the session (and still completed). */
  done: number;
  /** done plus the links still in the plan. */
  total: number;
  /** Place of `current`, from 1. */
  position: number;
  remainingMs: number;
  /** Share of the time gone, 0–1. */
  elapsed: number;
  timeUp: boolean;
  /** The time is up, or nothing is left. */
  finished: boolean;
}

/**
 * The session as it stands: links deleted, turned into reference or
 * completed outside the session leave the plan (spec §11.2).
 */
export function sessionView(session: FocusSession, links: Link[], queue: Queue, collections: Collection[], now: number): SessionView {
  const linkById = new Map(links.map((link) => [link.id, link]));
  const collectionById = new Map(collections.map((collection) => [collection.id, collection]));
  const slotById = new Map(queue.slots.map((rec) => [rec.link.id, rec]));
  const completedHere = new Set(session.completedIds);
  const pending: Recommendation[] = [];
  let done = 0;
  let triageCount = 0;

  for (const item of session.items) {
    if (item.type === 'triage') {
      triageCount = item.count;
      continue;
    }
    const link = linkById.get(item.linkId);
    const collection = link === undefined ? undefined : collectionById.get(link.collectionId);
    if (link === undefined || collection === undefined) {
      continue;
    }
    if (link.completedAt !== undefined) {
      done += completedHere.has(link.id) ? 1 : 0;
      continue;
    }
    if (isReference(link, collection)) {
      continue;
    }
    pending.push(slotById.get(link.id) ?? recommendation(link, collection, 'advance', { type: 'nextInColumn' }, queue.effortOf(link)));
  }

  const triageLeft = Math.min(triageCount, queue.triage.length);
  const durationMs = session.minutes * 60_000;
  const elapsedMs = Math.max(0, now - session.startedAt);
  const timeUp = elapsedMs >= durationMs;
  return {
    current: pending[0],
    next: pending.slice(1),
    triageLeft,
    done,
    total: done + pending.length,
    position: done + 1,
    remainingMs: Math.max(0, durationMs - elapsedMs),
    elapsed: Math.min(1, elapsedMs / durationMs),
    timeUp,
    finished: timeUp || (pending.length === 0 && triageLeft === 0),
  };
}
```

- [ ] **Step 5: Write the storage**

`src/lib/storage/session.ts`:

```ts
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
```

In `src/lib/storage/progress.ts`, change `clearUsageData` to:

```ts
/** Removes what the user did, the numbers and the session in progress; links stay. */
export async function clearUsageData(): Promise<void> {
  await withDataLock(() => storage.removeBatch(['activity', 'recoStats', 'focusSession']));
}
```

In `src/lib/storage/index.ts`, add:

```ts
// Focus session in progress
export {
  SESSION_KEY,
  getFocusSession,
  saveFocusSession,
  clearFocusSession,
  markSessionCompletion,
} from './session';
```

In `src/test/mocks/storage.ts`, add to the returned object:

```ts
    getFocusSession: vi.fn(() => Promise.resolve(null)),
    saveFocusSession: vi.fn(() => Promise.resolve()),
    clearFocusSession: vi.fn(() => Promise.resolve()),
    markSessionCompletion: vi.fn(() => Promise.resolve()),
```

- [ ] **Step 6: Run the pure and storage tests**

Run: `docker compose run --rm app npx vitest run src/test/lib/recommend/session.test.ts src/test/lib/storage/session.test.ts src/test/lib/storage/progress.test.ts`
Expected: PASS. If an old test in `src/test/lib/storage/progress.test.ts` asserts the exact keys removed by `clearUsageData`, add `'focusSession'` to it and ledger it.

- [ ] **Step 7: Write the failing store and component tests**

`src/test/stores/session.test.ts`:

```ts
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
```

`src/test/components/SessionPill.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import SessionPill from '@/newtab/components/SessionPill.svelte';
import type { SessionView } from '@/lib/recommend/session';

const running: SessionView = { next: [], triageLeft: 0, done: 1, total: 3, position: 2, remainingMs: 12 * 60_000, elapsed: 0.6, timeUp: false, finished: false };

describe('SessionPill', () => {
  it('shows the time left and opens Focus', async () => {
    const open = vi.fn();
    render(SessionPill, { props: { view: running }, events: { open } });

    expect(screen.getByText('session_left')).toBeInTheDocument();
    await fireEvent.click(screen.getByRole('button', { name: /session_title/ }));

    expect(open).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('button', { name: 'session_dismiss' })).toBeNull();
  });

  it('sums up a finished session until it is closed', async () => {
    const dismiss = vi.fn();
    render(SessionPill, { props: { view: { ...running, finished: true, timeUp: true } }, events: { dismiss } });

    expect(screen.getByText('session_ended')).toBeInTheDocument();
    await fireEvent.click(screen.getByRole('button', { name: 'session_dismiss' }));

    expect(dismiss).toHaveBeenCalledTimes(1);
  });
});
```

Append to `src/test/components/FocusSession.test.ts`:

```ts
describe('FocusSession with a session', () => {
  it('starts the planned session', async () => {
    const start = vi.fn();
    render(FocusSession, { props: { queue: queueOf(pages) }, events: { start } });
    await pick(1);

    await fireEvent.click(screen.getByRole('button', { name: 'focus_session_start' }));

    expect(start.mock.calls[0][0].detail).toBe(30);
  });

  it('follows a running session: opens the current link and ends it', async () => {
    const queue = queueOf(pages);
    const view = { current: queue.slots[0], next: queue.slots.slice(1), triageLeft: 0, done: 0, total: 3, position: 1, remainingMs: 600_000, elapsed: 0.5, timeUp: false, finished: false };
    const open = vi.fn();
    const end = vi.fn();
    render(FocusSession, { props: { queue, session: view }, events: { open, end } });

    expect(screen.queryByRole('radiogroup')).toBeNull();
    expect(screen.getByText(/focus_session_progress/)).toBeInTheDocument();
    await fireEvent.click(screen.getByRole('button', { name: 'focus_session_next' }));
    await fireEvent.click(screen.getByRole('button', { name: 'focus_session_end' }));

    expect(open.mock.calls[0][0].detail).toEqual({ link: queue.slots[0].link, newTab: true });
    expect(end).toHaveBeenCalledTimes(1);
  });
});
```

and, in the same file, delete the test `'opens the next link in a new tab'` (the planner no longer opens links: starting the session does).

Append to `src/test/components/NowSection.test.ts`: (change its engine import to `import { buildQueue, recommendation, type Queue, type Recommendation } from '@/lib/recommend/engine';`)

```ts
  it('follows the session in progress', () => {
    const rec = (link: Link): Recommendation => recommendation(link, collections[0], 'advance', { type: 'nextInColumn' }, 10);
    const session = { current: rec(pages[1]), next: [rec(pages[2])], triageLeft: 0, done: 1, total: 3, position: 2, remainingMs: 600_000, elapsed: 0.5, timeUp: false, finished: false };
    render(NowSection, { props: props(pages, { session }) });

    expect(screen.getByText('now_session_position')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'now_later_session' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Page p2/ })).toBeInTheDocument();
  });
```

(put it inside the existing `describe('NowSection', ...)`).

Run: `docker compose run --rm app npx vitest run src/test/stores/session.test.ts src/test/components/SessionPill.test.ts src/test/components/FocusSession.test.ts src/test/components/NowSection.test.ts`
Expected: FAIL — the store, the pill and the new props do not exist.

- [ ] **Step 8: Write the store and the pill**

`src/lib/stores/session.ts`:

```ts
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
```

`src/newtab/components/SessionPill.svelte`:

```svelte
<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { t } from '@/lib/i18n';
  import type { SessionView } from '@/lib/recommend/session';
  import IconButton from '@/shared/components/ui/IconButton.svelte';
  import ProgressRing from '@/shared/components/ui/ProgressRing.svelte';

  export let view: SessionView;

  const dispatch = createEventDispatcher<{ open: void; dismiss: void }>();

  $: minutesLeft = Math.ceil(view.remainingMs / 60_000);
</script>

<div class="pill" class:finished={view.finished}>
  <button type="button" class="main" on:click={() => dispatch('open')}>
    <ProgressRing value={view.finished ? 1 : view.elapsed} size={20} stroke={2.5} />
    {#if view.finished}
      <span class="name">{t('session_ended', view.done, view.total)}</span>
    {:else}
      <span class="name">{t('session_title')}</span>
      <span class="left">{t('session_left', minutesLeft)}</span>
    {/if}
  </button>
  {#if view.finished}
    <IconButton icon="close" size="sm" label={t('session_dismiss')} on:click={() => dispatch('dismiss')} />
  {/if}
</div>

<style>
  .pill {
    display: inline-flex;
    align-items: center;
    gap: 2px;
    height: var(--control-md);
    padding: 0 4px 0 0;
    border: 1px solid var(--accent-line);
    border-radius: 17px;
    background: var(--accent-soft);
  }

  .main {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    height: 100%;
    padding: 0 8px 0 7px;
    border: none;
    background: transparent;
    color: var(--accent-ink);
    font: 600 var(--text-sm) / 1 var(--font-body);
    cursor: pointer;
  }

  .left {
    color: var(--text-secondary);
    font-weight: 500;
    font-variant-numeric: tabular-nums;
  }

  .finished {
    border-color: var(--border-default);
    background: var(--surface-elevated);
  }

  .finished .main {
    color: var(--text-primary);
  }
</style>
```

- [ ] **Step 9: Let the planner and Now follow the session**

In `src/newtab/components/FocusSession.svelte`:

1. Change the session import to `import { buildSession, SESSION_OPTIONS, type SessionItem, type SessionMinutes, type SessionView } from '@/lib/recommend/session';` and add `import type { Recommendation } from '@/lib/recommend/engine';` (merge with the existing `Queue` import).
2. After `export let queue: Queue;` add:

```ts
  /** The session in progress; while it runs, the planner shows it. */
  export let session: SessionView | null = null;
```

3. Add `start: SessionMinutes;` and `end: void;` to the dispatcher type, and after the `nextLink` statement add:

```ts
  $: running = session === null ? [] : [session.current, ...session.next].filter((rec): rec is Recommendation => rec !== undefined);
```

4. In the markup, wrap the `<Segmented ... />` in `{#if session === null} ... {/if}`; wrap the block `{#if minutes !== null} ... {/if}` in `{#if session === null} ... {:else} (running markup below) {/if}`; and inside the planning `budget` div replace the `{#if nextLink !== undefined} <Button ...>focus_session_next</Button> {/if}` with:

```svelte
        <Button variant="primary" on:click={() => minutes !== null && dispatch('start', minutes)}>{t('focus_session_start')}</Button>
```

The running markup (the `{:else}` branch):

```svelte
    <ol class="timeline">
      {#if session.triageLeft > 0}
        <li class="step">
          <span class="at"></span>
          <span class="triage-tile"><Icon name="alert" size={17} /></span>
          <button type="button" class="what" on:click={() => dispatch('openTriage')}>
            <span class="do"><strong>{t('focus_session_triage_verb')}</strong></span>
            <span class="title">{plural(session.triageLeft, 'focus_session_triage_one', 'focus_session_triage_many')}</span>
          </button>
          <span class="min">{effortText(1)}</span>
          <span></span>
        </li>
      {/if}
      {#each running as rec, i (rec.link.id)}
        <li class="step" class:current={i === 0}>
          <span class="at">{i === 0 ? t('now_title') : ''}</span>
          <LinkTile link={rec.link} size={36} />
          <button type="button" class="what" on:click={() => dispatch('open', { link: rec.link, newTab: true })}>
            <span class="do"><strong>{t(ACTION_KEYS[rec.action])}</strong> · {getCollectionDisplayName(rec.collection)}</span>
            <span class="title">{rec.link.title || rec.link.url}</span>
          </button>
          <span class="min">{effortText(rec.effort)}</span>
          <IconButton icon="check" size="sm" tone="success" label={t('progress_complete')} on:click={() => dispatch('complete', rec.link)} />
        </li>
      {/each}
    </ol>
    <div class="budget">
      <span class="bar" aria-hidden="true">
        <i class="accent" style:flex-grow={session.elapsed}></i>
        <i class="rest" style:flex-grow={1 - session.elapsed}></i>
      </span>
      <span class="label">{t('focus_session_progress', session.done, session.total)} · {t('session_left', Math.ceil(session.remainingMs / 60_000))}</span>
      <Button on:click={() => dispatch('end')}>{t('focus_session_end')}</Button>
      {#if running[0] !== undefined}
        <Button variant="primary" on:click={() => running[0] !== undefined && dispatch('open', { link: running[0].link, newTab: true })}>{t('focus_session_next')}</Button>
      {/if}
    </div>
```

Add to its style block:

```css
  .step.current .title {
    font-weight: 600;
  }

  .step.current .at {
    color: var(--accent-ink);
  }
```

The `opened`/`nextLink` state is now unused; delete `opened`, `nextLink`, the `class:opened` directive, the `.step.opened .title` rule, and simplify `open(link)` to dispatch `open` with `newTab: true`.

In `src/newtab/components/FocusView.svelte`: add `import type { SessionView } from '@/lib/recommend/session';`, the prop `export let session: SessionView | null = null;`, and change the planner element to `<FocusSession {queue} {session} on:open on:complete on:start on:end on:openTriage={() => dispatch('openTriage')} />`.

In `src/newtab/components/NowSection.svelte`:

1. Add `import type { SessionView } from '@/lib/recommend/session';` and the prop `export let session: SessionView | null = null;`.
2. Replace the `hero` and `later` statements with:

```ts
  $: inSession = session !== null && session.current !== undefined;
  $: hero = inSession && session !== null ? session.current : queue.slots[0];
  $: later = inSession && session !== null ? session.next.slice(0, 2) : queue.slots.slice(1);
  $: triageCount = inSession && session !== null ? session.triageLeft : queue.triage.length;
```

3. After the toggle `<span class="toggle">…</span>` add:

```svelte
    {#if inSession && session !== null}
      <span class="position">{t('now_session_position', session.position, session.total)}</span>
    {/if}
```

and the style rule `.position { font-size: 12.5px; color: var(--text-tertiary); }`.
4. On `<NowLater ... />` use `triageCount={triageCount}`, add `inSession={inSession}` and `on:endSession`.

- [ ] **Step 10: Wire the session in the page**

In `src/newtab/App.svelte`:

1. Imports: `import { sessionStore } from '@/lib/stores/session';`, `import { sessionView, startSession, type SessionMinutes } from '@/lib/recommend/session';`, `import SessionPill from './components/SessionPill.svelte';`.
2. State and derived values, after the `queue` statement:

```ts
  /** Ticks every 30 s while a session runs, for the time left. */
  let clock = Date.now();
  let clockTimer: ReturnType<typeof setInterval> | undefined;

  $: session = $sessionStore.session;
  $: currentSession = session === null ? null : sessionView(session, $linksStore.links, queue, $linksStore.collections, clock);
  $: if (session !== null && clockTimer === undefined) {
    clockTimer = setInterval(() => (clock = Date.now()), 30_000);
  } else if (session === null && clockTimer !== undefined) {
    clearInterval(clockTimer);
    clockTimer = undefined;
  }

  async function beginSession(minutes: SessionMinutes): Promise<void> {
    clock = Date.now();
    await sessionStore.start(startSession(queue, minutes, clock));
    view = 'board';
  }

  async function endSession(): Promise<void> {
    await sessionStore.end();
  }
```

3. `onMount`: add `sessionStore.load()` to the `Promise.all([...])`. `onDestroy`: add `clearInterval(clockTimer);`.
4. Completions count for the session: at the end of `handleComplete` and of `handleNowComplete` add `if (session !== null) { await sessionStore.markCompleted(event.detail.id, true); }`; at the end of `handleRestore` and of `handleUndoComplete` add `if (session !== null) { await sessionStore.markCompleted(event.detail.id, false); }`.
5. In `handleCommand`, replace the interim branch with:

```ts
    } else if (action.type === 'startSession') {
      await beginSession(action.minutes);
    } else if (action.type === 'endSession') {
      await endSession();
```

and in the `buildCommands({...})` call replace `sessionActive: false` with `sessionActive: session !== null`.
6. On `<AppHeader ...>`, turn it into an element with children:

```svelte
      <AppHeader
        title={view === 'board' ? (currentWorkspace !== undefined ? getWorkspaceDisplayName(currentWorkspace) : '') : null}
        summary={view === 'board' ? summary : null}
        on:openSearch={() => (showSearch = true)}
        on:newCollection={() => (showCreateCollection = true)}
      >
        <svelte:fragment slot="session">
          {#if currentSession !== null}
            <SessionPill view={currentSession} on:open={() => openFocus(null)} on:dismiss={endSession} />
          {/if}
        </svelte:fragment>
      </AppHeader>
```

7. On `<NowSection ... />` add `session={currentSession}` and `on:endSession={endSession}`.
8. On `<FocusView ... />` add `session={currentSession}`, `on:start={(e) => beginSession(e.detail)}` and `on:end={endSession}`.

- [ ] **Step 11: Run the tests of this task**

Run: `docker compose run --rm app npx vitest run src/test/lib/recommend/session.test.ts src/test/lib/storage src/test/stores src/test/components/SessionPill.test.ts src/test/components/FocusSession.test.ts src/test/components/FocusView.test.ts src/test/components/NowSection.test.ts src/test/lib/locales.test.ts`
Expected: PASS.

- [ ] **Step 12: Suite, lint, size, look**

```bash
make test && make lint
make build && docker compose run --rm -T app du -sb dist
make preview
```

Expected: tests pass; 12 old lint errors; `du` ≤ 573440. In the preview with `?session=1`: the coral pill "Sessão · N min restantes" in the header, "2 de 3 na sessão" next to "Agora", the current session link as the main card and "Depois, na sessão" with "Encerrar a sessão". In Focus, the planner shows the running session with "Abrir o próximo" and "Encerrar". Without `session=1`: choose 30 min in Focus, "Começar sessão", and the board shows the pill; reload the page and the session is still there. Capture both themes. `make preview-stop`.

- [ ] **Step 13: Commit**

```bash
git add src/lib/recommend/session.ts src/lib/storage/session.ts src/lib/storage/progress.ts src/lib/storage/index.ts src/lib/stores/session.ts src/newtab/components/SessionPill.svelte src/newtab/components/FocusSession.svelte src/newtab/components/FocusView.svelte src/newtab/components/NowSection.svelte src/newtab/App.svelte src/test/mocks/storage.ts src/test/lib/recommend/session.test.ts src/test/lib/storage/session.test.ts src/test/stores/session.test.ts src/test/components/SessionPill.test.ts src/test/components/FocusSession.test.ts src/test/components/NowSection.test.ts public/_locales/en/messages.json public/_locales/pt_BR/messages.json
git commit -m "feat(session): a started Focus session is stored and followed in every tab, with the time left in the header

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

## Stage 5 — Consistency

### Task 14: Dialogs, toast and popup on the primitives; no literal colors

**Files:**
- Create: `src/test/styles/literal-colors.test.ts`
- Modify: `src/shared/styles/tokens.css`, `src/shared/components/ConfirmDialog.svelte`, `CreateCollectionModal.svelte`, `WorkspaceModal.svelte`, `Toast.svelte`, `src/newtab/components/SettingsModal.svelte`, `OnboardingWizard.svelte`, `WorkspaceRailItem.svelte`, `Column.svelte`, `src/popup/App.svelte`

**Interfaces:**
- Consumes: `Button`, `IconButton`, `Icon` (Task 3); tokens (Task 2).
- Produces: theme-preview tokens in `tokens.css` `:root`: `--swatch-light-surface`, `--swatch-dark-surface`, `--swatch-light-accent`, `--swatch-dark-accent`, `--swatch-light-line`, `--swatch-dark-line`, `--swatch-light-line-strong`, `--swatch-dark-line-strong`.

- [ ] **Step 1: Write the failing guard**

`src/test/styles/literal-colors.test.ts`:

```ts
/**
 * Components color through tokens (spec §4.1): no hex colors, and rgba()
 * only inside shadows.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

function svelteFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      return name === 'test' ? [] : svelteFiles(path);
    }
    return name.endsWith('.svelte') ? [path] : [];
  });
}

describe('component styles', () => {
  it('use tokens instead of literal colors', () => {
    const offenders: string[] = [];
    for (const file of svelteFiles(join(process.cwd(), 'src'))) {
      readFileSync(file, 'utf8').split('\n').forEach((line, index) => {
        const hex = /#[0-9a-fA-F]{3,8}\b/.test(line);
        const rgba = /rgba?\(/.test(line) && !/shadow/.test(line) && !/^\s+(inset\s|\d)/.test(line);
        if (hex || rgba) {
          offenders.push(`${file.replace(process.cwd(), '')}:${index + 1}: ${line.trim()}`);
        }
      });
    }
    expect(offenders).toEqual([]);
  });
});
```

Run: `docker compose run --rm app npx vitest run src/test/styles/literal-colors.test.ts`
Expected: FAIL, listing the lines in `SettingsModal`, `OnboardingWizard`, `WorkspaceRailItem`, `Column`, the three shared dialogs and the popup.

- [ ] **Step 2: Tokens for the theme previews**

The theme options in Settings and Onboarding draw each theme whatever theme is on screen, so they need fixed colors. Add to the `:root { ... }` block of `src/shared/styles/tokens.css`, after the shadow aliases:

```css
  /* Theme previews: each theme's own colors, whatever theme is on screen */
  --swatch-light-surface: #F8F6F3;
  --swatch-dark-surface: #0F0E11;
  --swatch-light-accent: #D14E35;
  --swatch-dark-accent: #E85D42;
  --swatch-light-line: rgba(0, 0, 0, 0.08);
  --swatch-dark-line: rgba(255, 255, 255, 0.08);
  --swatch-light-line-strong: rgba(0, 0, 0, 0.12);
  --swatch-dark-line-strong: rgba(255, 255, 255, 0.12);
```

- [ ] **Step 3: Replace the literals**

In the `<style>` blocks, replace (the value on the left, wherever it appears in these files):

| File | Literal | Becomes |
|---|---|---|
| `SettingsModal.svelte`, `OnboardingWizard.svelte` | `#F8F6F3` | `var(--swatch-light-surface)` |
| same | `#0F0E11` | `var(--swatch-dark-surface)` |
| same | `#D14E35` | `var(--swatch-light-accent)` |
| same | `#E85D42` | `var(--swatch-dark-accent)` |
| same | `rgba(0, 0, 0, 0.08)` | `var(--swatch-light-line)` |
| same | `rgba(255, 255, 255, 0.08)` | `var(--swatch-dark-line)` |
| same | `rgba(0, 0, 0, 0.12)` | `var(--swatch-light-line-strong)` |
| same | `rgba(255, 255, 255, 0.12)` | `var(--swatch-dark-line-strong)` |
| `SettingsModal.svelte`, `OnboardingWizard.svelte`, `ConfirmDialog.svelte`, `CreateCollectionModal.svelte`, `WorkspaceModal.svelte` | `background-color: rgba(0, 0, 0, 0.7);` (backdrop) | `background-color: var(--scrim);` |
| `CreateCollectionModal.svelte`, `src/popup/App.svelte` | `border: 2px solid rgba(255, 255, 255, 0.3);` (spinner on a coral button) | `border: 2px solid color-mix(in srgb, var(--text-on-accent) 30%, transparent);` |
| `WorkspaceRailItem.svelte` | `rgba(255, 255, 255, N)` in `border` / `border-color` lines | `color-mix(in srgb, var(--text-on-accent) N×100%, transparent)` (0.1 → 10%, 0.15 → 15%, 0.2 → 20%, 0.25 → 25%, 0.3 → 30%) |
| `WorkspaceRailItem.svelte`, `Column.svelte` | `var(--accent-secondary, #d4563f)` | `var(--accent-secondary)` |

Also in the three shared dialogs and the two newtab modals, change the dialog box to `border-radius: var(--radius-xl);` and `box-shadow: var(--shadow-float);` (replacing the multi-line `box-shadow` that stacks `--shadow-xl` with an rgba glow), and the backdrop's `backdrop-filter` to `blur(6px) saturate(0.9)`.

Run: `docker compose run --rm app npx vitest run src/test/styles/literal-colors.test.ts`
Expected: PASS. If a line is still listed, it is one of the table's cases in a spelling the table missed (for example `rgba(0,0,0,0.08)` without spaces): apply the same row.

- [ ] **Step 4: Buttons on the primitives**

`src/shared/components/ConfirmDialog.svelte`: import `Button`; replace the two `<button class="btn btn-cancel|btn-confirm">` with:

```svelte
      <Button on:click={() => dispatch('cancel')}>{cancelText}</Button>
      <Button variant="danger" on:click={() => dispatch('confirm')}>{confirmText}</Button>
```

and delete the `.btn`, `.btn:focus`, `.btn:focus-visible`, `.btn-cancel*`, `.btn-confirm*` rules and the reduced-motion block that only held `.btn-confirm:hover`.

`src/shared/components/CreateCollectionModal.svelte`: import `Button`; replace the two buttons with:

```svelte
        <Button on:click={() => dispatch('cancel')} disabled={isSubmitting}>{t('common_cancel')}</Button>
        <Button variant="primary" type="submit" disabled={!canSubmit}>
          {#if isSubmitting}
            <span class="spinner"></span>
            {t('common_creating')}
          {:else}
            {t('common_create')}
          {/if}
        </Button>
```

and delete the `.btn*` rules (keep `.spinner` and its keyframes).

`src/shared/components/WorkspaceModal.svelte`: import `Button` and `IconButton`; replace the header close button with `<IconButton icon="close" size="sm" label={t('common_close')} on:click={() => dispatch('cancel')} />`, and the two footer buttons as in `CreateCollectionModal` (with `{isEditing ? t('common_saving') : t('common_creating')}` and `{isEditing ? t('common_save') : t('common_create')}`); delete the `.close-btn*` and `.btn*` rules.

`src/shared/components/Toast.svelte`: import `Button` and `IconButton`; replace the action and close buttons with:

```svelte
      {#if actionLabel !== null}
        <Button variant="quiet" size="sm" on:click={() => { onAction(); dismiss(); }}>{actionLabel}</Button>
      {/if}
      <IconButton icon="close" size="sm" label={t('toast_close')} on:click={dismiss} />
```

and delete the `.toast-action*` and `.toast-close*` rules.

`src/newtab/components/SettingsModal.svelte`: import `Button` and `IconButton`; replace:
- the header `<button class="btn-close" ...>` with `<IconButton icon="close" label={t('common_close')} on:click={handleClose} />`;
- `<button type="button" class="btn-action" on:click={handleEnableTopicSearch}>…</button>` with `<Button size="sm" on:click={handleEnableTopicSearch}>{t('topic_search_enable')}</Button>`;
- the export button with `<IconButton icon="download" label={t('settings_export_button')} on:click={handleExport} />`;
- the import button with `<IconButton icon="upload" label={t('settings_import_button')} on:click={handleImportClick} />`;
- the clear-usage button with `<IconButton icon="trash" tone="danger" label={t('settings_usage_clear')} on:click={() => (confirmClearUsage = true)} />`;
and delete the `.btn-close*` and `.btn-action*` rules. The toggles and theme options stay as they are.

`src/newtab/components/OnboardingWizard.svelte`: import `Button`; replace the back and next buttons with:

```svelte
          <Button variant="quiet" on:click={goBack}>{t('onboarding_back')}</Button>
```

```svelte
        <Button variant="primary" on:click={goNext}>
          {currentStep === TOTAL_STEPS ? t('onboarding_get_started') : t('onboarding_next')}
        </Button>
```

and delete the `.btn-back*` and `.btn-next*` rules.

`src/popup/App.svelte`: import `Button`, `IconButton` and `Icon`; replace:
- the header `<button class="btn-dashboard" ...>` (with its SVG) with `<IconButton icon="board" label={t('popup_open_dashboard')} on:click={openDashboard} />`;
- `<button type="button" class="saved-here-action" on:click={() => handleCompleteHere(savedHere)}>✓ {t('progress_complete')}</button>` with `<Button size="sm" icon="check" on:click={() => handleCompleteHere(savedHere)}>{t('progress_complete')}</Button>`;
- the undo `saved-here-action` with `<Button size="sm" variant="quiet" on:click={() => restoreLink(savedHere)}>{t('progress_undo')}</Button>`;
- the `<button class="btn-save" ...>` element with `<Button variant="primary" on:click={handleSaveCurrentTab} disabled={isSaving}>` keeping its inner `{#if isSaving}…{/if}` content, closed by `</Button>`;
- the `<button class="btn-open-dashboard" ...>` (with its SVG) with `<Button size="sm" variant="quiet" icon="external" on:click={openDashboard}>` and its text, closed by `</Button>`;
and delete the `.btn-dashboard*`, `.saved-here-action*`, `.btn-save*` and `.btn-open-dashboard*` rules. If the popup's save button relied on a full-width rule, wrap it in `<div class="save-row">` with `.save-row :global(button) { width: 100%; }`.

- [ ] **Step 5: Run the affected tests**

Run: `docker compose run --rm app npx vitest run src/test/styles src/test/components/ConfirmDialog.test.ts src/test/components/CreateCollectionModal.test.ts src/test/components/Toast.test.ts src/test/components/SettingsModal.test.ts src/test/components/OnboardingWizard.test.ts src/test/components/App.test.ts src/test/components/WorkspaceRail.test.ts`
Expected: PASS. The tests query buttons by their accessible names, which did not change; if one looks for a removed class (`.btn-confirm`), switch it to the role and name and ledger it.

- [ ] **Step 6: Suite, lint, size, look**

```bash
make test && make lint
make build && docker compose run --rm -T app du -sb dist
make preview
```

Expected: tests pass; 12 old lint errors; `du` ≤ 573440. In the preview, open Settings (rail), New collection (N), a workspace's edit dialog, the remove-link confirmation and the discard toast in both themes: same Instrument Sans, same buttons as the rest, blurred backdrop. `make preview-stop`. For the popup, open `http://localhost:4173/src/popup/index.html` with the stub at 360×600.

- [ ] **Step 7: Commit**

```bash
git add src/test/styles/literal-colors.test.ts src/shared/styles/tokens.css src/shared/components/ConfirmDialog.svelte src/shared/components/CreateCollectionModal.svelte src/shared/components/WorkspaceModal.svelte src/shared/components/Toast.svelte src/newtab/components/SettingsModal.svelte src/newtab/components/OnboardingWizard.svelte src/newtab/components/WorkspaceRailItem.svelte src/newtab/components/Column.svelte src/popup/App.svelte
git commit -m "refactor(ui): dialogs, toast, settings, onboarding and popup on the shared primitives; colors only through tokens

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

### Task 15: Privacy policy, project notes and the final gates

**Files:**
- Modify: `docs/privacy-policy.md`, `docs/privacy-policy.pt.md`, `CLAUDE.md` (own lines only)
- Outside the repo: `<caderno>/projetos/tabAla.md`

- [ ] **Step 1: Privacy policy**

In `docs/privacy-policy.md`, section "Next up and Focus (suggestions)":
- replace `the "Next up" strip` with `the "Now" section` (both places it appears);
- add this bullet at the end of the list:

```markdown
- while a Focus session runs: its length, when it started and which saved links it plans, so every new tab can follow it. It is erased when the session ends, twelve hours after it started, or with "Clear usage data".
```

- in the paragraph after the list, change `The strip can be turned off in Settings.` to `"Now" can be turned off in Settings.`

In `docs/privacy-policy.pt.md`, the same in Portuguese: `a faixa "Próximos passos"` → `a seção "Agora"`; the bullet:

```markdown
- enquanto uma sessão de Foco está em andamento: a duração, o horário de início e quais links salvos ela planeja, para que toda nova aba possa segui-la. Isso é apagado quando a sessão termina, doze horas depois do início ou em "Apagar dados de uso".
```

and `A faixa pode ser desligada em Configurações.` → `O "Agora" pode ser desligado em Configurações.`

In both files, set the effective date to the day of this commit (`**Effective date:** <Month D, YYYY>` / `**Data de vigência:** <D de mês de AAAA>`).

- [ ] **Step 2: Project notes in `CLAUDE.md`, staging only these lines**

`CLAUDE.md` has uncommitted changes from other sessions that must not be committed. Build the new version from `HEAD` and stage it by hash:

```bash
git show HEAD:CLAUDE.md > .superpowers/sdd/2026-09-25-nova-interface/CLAUDE.head.md
```

In that copy (and, with the same edits, in the working-tree `CLAUDE.md`):
1. Under "Regras de Negócio", replace the **Busca** line with:

```markdown
- **Busca**: paleta ⌘K em todos os workspaces (src/newtab/components/CommandPalette.svelte sobre src/lib/search). Antes de digitar mostra Agora, abertos recentemente e ações; `>` lista só comandos (src/newtab/commands.ts); com um resultado selecionado dá para abrir, concluir (⌥↵), adiar, mover, mostrar no quadro e descartar. A busca por assunto traduz a consulta para o inglês com o Translator do Chrome (src/lib/ai/translator.ts)
```

2. In the **Próximos passos e Foco** line, append: ` A seção da nova aba chama-se **Agora** (um cartão principal + Depois). A sessão de Foco iniciada fica em \`focusSession\` (src/lib/storage/session.ts) e é seguida em toda aba; expira em 12 h e sai com "Apagar dados de uso".`
3. Add a new rule after it:

```markdown
- **Interface**: tokens em src/shared/styles/tokens.css (cor por papel: coral = ação principal, verde = concluído, âmbar = triagem); fonte Instrument Sans local em public/fonts (recorte por scripts/fonts/subset-instrument-sans.sh); primitivas em src/shared/components/ui (Button, IconButton, Icon, Kbd, Menu, LinkTile, Segmented, ProgressRing). Cor literal em componente não passa em src/test/styles/literal-colors.test.ts. Para ver telas fora do Chrome: `make preview` (nunca `vite preview`/`vite dev`, que apagam o dist/)
```

4. Under "Comandos", add after `make build`: `make preview        # Builda em .preview/ e serve as telas na porta 4173 (ver scripts/preview/README.md)`.
5. Under "Anti-Patterns", change `- **Evitar** bundle grande - manter extensão leve (<500KB)` to `- **Evitar** bundle grande - manter extensão leve (<560KB; `du -sb dist` ≤ 573440)`: the user raised the ceiling on 2026-09-25.

Then:

```bash
blob=$(git hash-object -w .superpowers/sdd/2026-09-25-nova-interface/CLAUDE.head.md)
git update-index --cacheinfo 100644,"$blob",CLAUDE.md
git diff --cached --stat
```

Expected: `git diff --cached --stat` shows `CLAUDE.md` with only your lines (a handful of insertions), and `git diff CLAUDE.md` still shows the other sessions' hunks unstaged.

- [ ] **Step 3: Final gates**

```bash
make test
make lint
make build && docker compose run --rm -T app du -sb dist
git diff main -- src/manifest.json
docker compose run --rm app npx vitest run src/test/lib/locales.test.ts src/test/styles
```

Expected: every test passes; lint shows only the 12 old errors; `du -sb dist` ≤ 573440; the manifest diff is empty; locales and style guards pass.

- [ ] **Step 4: The whole tour in the preview**

`make preview` and capture, at 1440×900 and 1024×768 in both themes, into `.superpowers/sdd/2026-09-25-nova-interface/shots/` (git-ignored): board with Now; board with `?session=1`; board with `?empty=1`; ⌘K before typing, with `>`, with results and the details pane, in "Mover para…"; the triage layer and its end; Focus; Settings. Compare with the v2 preview (`mockup-v2.html`, spec §1). Write down, in the ledger, any screen that differs from the preview and why. `make preview-stop`.

- [ ] **Step 5: Commit**

```bash
git add docs/privacy-policy.md docs/privacy-policy.pt.md
git commit -m "docs: privacy policy covers the stored Focus session and names Now; project notes for the new interface

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

(`CLAUDE.md` is already staged by hash in Step 2 and goes into this commit.)

- [ ] **Step 6: Record it in the brain**

In `<caderno>/projetos/tabAla.md`, add a dated line at the top of **Log.** with: the branch, the number of commits and tests, the `du -sb dist` figure, the new shortcuts (F; ⌥↵ and → in ⌘K), the `focusSession` key and `make preview`. Commit it in the `caderno` repo with `git -C <caderno> add projetos/tabAla.md && git -C <caderno> commit -m "tabAla: nova interface implementada na feat/nova-interface" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"`.

- [ ] **Step 7: Manual test script for the user**

Put in the final message, for Chrome after "Recarregar" in `chrome://extensions`:
1. Open a new tab: the Instrument Sans shows (no network needed), the rail has Início, Foco and Abas abertas with the count.
2. Now shows one main card; complete it and use "Desfazer" in Depois.
3. ⌘K with nothing typed shows Agora, abertos recentemente and Ações; `> tema` switches the theme.
4. ⌘K "algum termo", → then "Mover para…", pick a collection; the toast says "Movido para …".
5. "Triar N links parados": decide with 1–4; Esc closes.
6. F opens Focus; choose 15 min, "Começar sessão"; open a second new tab: the pill and "1 de N na sessão" are there too.
7. Settings → "Apagar dados de uso": the session pill disappears.

---

## Execution record (2026-09-25)

All 15 tasks done on `feat/nova-interface`, then a whole-branch review by a fresh reviewer (no Critical, 3 Important, 9 Minor) and one fix pass (`5b52a76`). Final gates: 938 tests passing, lint at the 10 old dialog errors, `du -sb dist` = 538 216 of 573 440.

### Rulings made during execution

- Setup: Ruling: executing on branch feat/nova-interface in the main working tree, not a worktree — same as phases 1–2 of Próximos passos, and the other sessions' uncommitted files (Dockerfile, docker-compose.yml, release.yml, CLAUDE.md hunks, entrypoint.dev.sh, .serena/, AGENTS.md) stay untouched and never staged — cost if wrong: none beyond care when staging.
- Task 1: Ruling: keys.mjs remove left a blank line before the closing brace (plan regex kept the captured whitespace) — changed to /,?\s*
- Task 2: Ruling: the plan's new newtab/app.css head dropped --sidebar-collapsed-width, still used by TabsSidebar until Task 5 — kept it in app.css; Task 5 deletes it with the collapsed column — cost if wrong: one stray variable.
- Task 3: Ruling: the plan's Button test expected a synthetic click on a disabled button to be ignored; per the HTML spec only user-initiated clicks are blocked, jsdom dispatches fireEvent clicks — the test now asserts toBeDisabled(), the guarantee a person gets — cost if wrong: none, the browser blocks real clicks.
- Task 4: Ruling: menu.test.ts mapped mock calls to .detail on any (no-unsafe-return lint error) — typed as CustomEvent<number>; later mock maps follow the same pattern — cost if wrong: none.
- Task 5: Ruling: removing boardLinks left `$: links` in App.svelte without readers, which crashed ESLint's no-unused-vars on a reactive declaration — deleted the declaration — cost if wrong: none.
- Task 5: Ruling: AppHeader grid squeezed at 1024 px with the tabs panel open (summary wrapped per word, search over the button) — side columns now shrink with ellipsis and the search takes a minmax(220px, 520px) middle — cost if wrong: header layout only.
- Task 6: Ruling: keys.mjs `set` used a replacement string, so a new message with $1 got the capture group ("Adiado até ,") — now a replacer function; Task 5's set values had no $ and were correct — cost if wrong: none.
- Task 6: Ruling: LinkCard tests selected the removed .link-favicon wrapper; the favicon now lives in LinkTile (.tile) — selectors updated, same assertions; also kept a test that reference still shows without meta (the old reference/snooze test's coverage) — cost if wrong: none.
- Task 6: Ruling: `$: metaOf = (link) => …` trips svelte/no-reactive-functions (and crashes its fixer) — App computes `cardMetas` (Map) reactively and passes `metaOf={(link) => cardMetas.get(link.id) ?? null}`; Column/KanbanBoard type widened to CardMeta | null — cost if wrong: none.
- Task 6: Ruling: after Task 6 dist was 506011 of 512000 with most UI still ahead — added a 'minify-locales' build plugin in vite.config.ts (the two messages.json ship minified, same content): 493969 now. A lever outside spec §4.2's font-only list, chosen first because it is invisible; the font fallbacks stay in reserve — cost if wrong: a build plugin to remove.
- Task 8: Ruling: dist reached 513174 (> 512000) after the Now section. Applied spec §4.2 fallback 1 (condensed face now letters, space, comma, period: 14.2 → 7.0 KB) and made the build drop locale placeholders no message names (Chrome substitutes $1 directly; no message uses $NAME$): 499728 now. Titles of arbitrary links must not use --font-display from here on (the triage title switches to the body face in Task 9) — cost if wrong: if a future message needs $NAME$ the build keeps its placeholders automatically.
- Task 8: Ruling: the Now collapse chevron used IconButton's expanded colour (coral), a second coral element in the area — NowSection overrides it to tertiary — cost if wrong: none.
- Task 9: Ruling: the triage title (any link title) uses the body face at 650/24px instead of --font-display, which now covers letters only (Task 8 ruling) — cost if wrong: a slightly less condensed title.
- Task 9: Ruling: dist hit 511572 (428 bytes of room) after the triage layer. Invisible savings: removed 29 locale keys no source mentions (checked: no key is built dynamically), and the body font keeps only the Latin-1 symbols in use (· « » ° nbsp) with the weight axis capped at 650 (the old 700 only styled a 10 px badge) — cost if wrong: a removed key would show as its raw name; a 700 weight renders as 650.
- Task 9: Ruling: Svelte scoped classes use the prefix 's' instead of 'svelte-' (vite.config.ts cssHash): -7.8 KB, no visual change; dist 497810 — cost if wrong: none (tests query component classes, not hashes).
- Task 11: Ruling: the palette test counted the path 'Agentes › Hermes Agent' in the whole dialog, but the details pane repeats the selected link's path — the count is now scoped to the result list — cost if wrong: none.
- Task 11: Ruling: the popup still uses search_empty and search_completed_badge (the plan's grep caught it, my chained command removed them anyway) — restored both with their original texts; only search_hint_keys is gone — cost if wrong: none.
- Task 11: Ruling: Array.prototype.at is outside the project's TS lib (lint: unsafe call) — the test indexes the last option instead — cost if wrong: none.
- Task 12: Ruling: FocusSession's options list was a reactive statement over constants (lint warning) — now a const; a test helper got its return type — cost if wrong: none.
- Task 12: Ruling: the triage step showed 'Triar' over 'Triar 3 links' (the existing message already carries the verb) — the extra line and the focus_session_triage_verb key are gone; Task 13's running view drops it too — cost if wrong: none.
- Task 13: Ruling: the reactive block that started/stopped the session clock tripped svelte/infinite-reactive-loop (error) — the clock now ticks from a plain interval set in onMount that only updates while a session exists; parseFocusSession narrows completedIds with a type predicate instead of a cast; a test helper got its return type — cost if wrong: one 30 s interval always on.
- Task 13: Ruling: the running planner still showed 'Quanto tempo você tem?' without the selector — the question hides with it — cost if wrong: none.
- Task 14: Ruling: popup is 380px wide (App.svelte .popup), not 360 — shots taken at 380×550 — cost if wrong: none, viewport only.
- Task 14: Ruling: SettingsModal had no max-height (pre-existing at BASE) and its bottom section (export/import/clear usage) was unreachable under ~1000px of viewport; capped at 100vh − 2·space-6 with a scrolling body, since the task polishes this very dialog — layout only, jsdom cannot measure it, verified by screenshot t14-settings-bottom-* — cost if wrong: three CSS lines to revert.
- Task 15: Ruling: the policy heading "Next up and Focus"/"Próximos passos e Foco" also renamed to "Now and Focus"/"Agora e Foco" — the brief said "both places" but the phrase "the Next up strip" appears once; the heading is the second place a reader meets the old name — cost if wrong: one heading.
- Final: Ruling: finding 12 (hero .why nowrap) stays Minor — the collection span is a flex item whose min width is its longest word, so it wraps between words; only a single word wider than ~290 px overflows — cost if wrong: a clipped line with an unusually long one-word collection name.
- Final: Ruling: session start from Focus switches to the board — stands, Task 13 specifies it and F returns — cost if wrong: one key.
- Final: Ruling: always-on 30 s clock — stands (Task 13 ruling) — cost if wrong: negligible CPU.
- Final: Ruling: double keydown listeners in ConfirmDialog/CreateCollectionModal/WorkspaceModal (possible double confirm/submit) — pre-existing at 0437355, outside this branch; reported to the user as an adjacent issue, not fixed — cost if wrong: Enter may act twice in those dialogs, as it did before this branch.
- Final: Ruling: column menu not on the Menu primitive — stands, spec §4.6 does not list it — cost if wrong: one menu with the older look.
- Final: Ruling: card ⋯ menu may clip at a column's last card — pre-existing positioning, stands — cost if wrong: the last card's menu opens partly hidden.
- Final: Ruling: CLAUDE.md "Svelte 4" — belongs to another session's unstaged hunk, left alone — cost if wrong: none for this branch.
- Final: Ruling: no Home/End in Menu, no textarea/select in the focus-trap selector — no dialog here has those elements — cost if wrong: added when one does.
- Final: Ruling: f/t/n with a card menu open — folded into the modal fix ([role="menu"] counts) — cost if wrong: none.
- Final: Ruling: plan note 13 (plan says the pane is gone at 1024; spec §8.4 and the code keep it down to 900 px) — implementation follows the spec, plan text was wrong — cost if wrong: none.

### Fixed in the final pass

- Segmented roving focus — "moves with the arrow keys, and the focus follows the choice" RED→GREEN, suite 938/938
- single-letter shortcuts under modals and open menus — "with a modal or menu open: …" (4 cases) RED→GREEN; App wiring (one line, no App test) checked in the preview: f/n under Settings do nothing, Esc closes, f then opens Focus — suite 938/938
- narrow palette losing keyboard focus after the ⋯ menu — "in a narrow window, gives the focus back to the field after the menu" RED→GREEN, also checked at 860 px in the preview — suite 938/938
- (re-graded Minor→Important: focus loss in a keyboard-first dialog, same class as the narrow palette) triage end state — "moves the focus to Close when the last link is decided, so Enter ends it" RED→GREEN — suite 938/938
- (re-graded Minor→Important: the user asked for design-system standardization; Settings showed "ou" in English, missed the new F and T and used caps labels that spec §4.2 forbids) Settings shortcut list on Kbd + common_or key + sentence-case titles — "lists every dashboard shortcut, with no text outside the locales" RED→GREEN — suite 938/938

### Deferred (minor)

- "Encerrar" clears the session at once, without the "Sessão encerrada: X de Y" pill of spec §11.3.
- ⌘K "Começar uma sessão de N min" on an empty queue creates an instantly finished session ("0 de 0").
- literal-colour guard misses named colours; `color: white` remains in WorkspaceRailItem, SettingsModal and OnboardingWizard.
- aria-activedescendant does not follow the palette's actions zone.
- the Now "Desfazer" line lasts 10 s even after the next action.
- parseFocusSession accepts a negative or NaN triage count (only by hand-editing storage).
- hero context line: .why is nowrap; a single very long word in a collection name could overflow.
