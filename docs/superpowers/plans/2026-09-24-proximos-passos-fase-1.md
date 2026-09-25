# Próximos passos e Foco — fase 1: plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** recomendar, de forma explicável, o próximo passo concreto para os links salvos (faixa "Próximos passos" em toda nova aba + espaço Foco) e tirar do caminho o que já foi concluído, aprendendo só com o que a pessoa faz dentro do tabAla.

**Architecture:** o link ganha um ciclo de vida (pendente, adiado, referência, concluído) em campos opcionais de `Link`/`Collection`; o comportamento (aberturas, dias mostrados, adiamentos) fica numa chave separada `activity` e a medição em `recoStats`. Um motor puro (`src/lib/recommend/`) escolhe frentes (coleções), pega o próximo link pela ordem da coluna, monta as 3 vagas da faixa, a triagem e a sessão. A interface (faixa, Foco, card do quadro, popup, busca, Configurações) só chama ações de progresso (`src/lib/stores/progress.ts`) que gravam sob `withDataLock`.

**Tech Stack:** Svelte 5 (sintaxe legada do repo), TypeScript, Vite + crxjs, Vitest + @testing-library/svelte, Chrome MV3 (`chrome.storage.local`).

**Spec:** `docs/superpowers/specs/2026-09-24-proximos-passos-design.md` (fase 1: §3–§7, §9 parcial, §10, §11). A fase 2 (sinais do service worker, §8) tem plano próprio, depois deste.

## Global Constraints

- Docker-first: nunca `npm`/`npx` no host. Um arquivo de teste: `docker compose run --rm app npx vitest run <arquivo>`. Suíte: `make test`. Lint dos arquivos tocados: `docker compose run --rm app npx eslint <arquivos>`. Tipos dos arquivos tocados: `docker compose run --rm app sh -c "npx tsc --noEmit 2>&1 | grep -E '<regex dos arquivos>'"` (há erros antigos em outros arquivos; os tocados não podem ganhar nenhum). `make lint` não pode ganhar erro novo (hoje: 12 erros antigos de a11y/svelte-ignore).
- Imports novos usam `@/…` (o `tsconfig` não conhece `@lib`/`@shared`); arquivos existentes mantêm os imports que têm.
- Nenhuma dependência npm nova; o `dist` inteiro fica abaixo de 500 KB (`make build`; hoje ~400 KB).
- **Nenhuma permissão nova** no `src/manifest.json`.
- Componentes Svelte na sintaxe legada do repo: `export let`, `$:`, `createEventDispatcher`. Sem runes.
- Todo texto de interface passa por `t()` com a chave nos dois arquivos `public/_locales/en/messages.json` e `public/_locales/pt_BR/messages.json`, acrescentada ao fim do objeto (vírgula após a última entrada). Nomes de chave só com `[a-zA-Z0-9_]`; substituições `$1` com bloco `placeholders`, como as chaves existentes.
- O estado feito se chama **concluído** (en *completed*), nunca "vencido". A faixa é **Próximos passos** (en *Next up*); o espaço é **Foco** (en *Focus*).
- Gravação no storage só por funções embrulhadas em `withDataLock`; uma função travada nunca chama outra travada.
- Campos novos de `Link`/`Collection` são opcionais; exports antigos continuam importando. `activity` e `recoStats` nunca entram no export.
- O repositório é público: nada de dados pessoais (títulos de links reais, exports) em commit. `.eval/` fica no `.gitignore`.
- Não colocar no índice as mudanças de outra sessão que estão no working tree: `Dockerfile`, `docker-compose.yml`, `.github/workflows/release.yml`, `entrypoint.dev.sh`, `.serena/` e os trechos alheios do `CLAUDE.md`. Sempre `git add <arquivos>` explícitos.
- Mensagens de commit terminam com `Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>`.
- Branch: `feat/proximos-passos`.

## Review Focus

- Link de título vazio (há 4 `file://` nos dados reais): card da faixa, sessão, triagem e concluídos mostram a URL, nunca uma linha em branco. → Task 11 (card) e Task 13 (triagem).
- Nada pendente (instalação nova, ou tudo concluído/referência): a faixa diz que não há nada, o Foco mostra estados vazios e a sessão fica vazia — sem erro de `Math.max` em lista vazia. → Task 4, Task 5, Task 11 e Task 12.
- A mesma URL salva duas vezes (em duas coleções, uma já concluída): o popup age sobre a cópia pendente. → Task 14.
- Teclas 1–4 da triagem digitadas num campo de texto ou com um diálogo aberto nunca decidem nada. → Task 13.
- Links da Inbox (coleção sem workspace): formam frente normal e o caminho mostra só "Inbox". → Task 4 e Task 11.

---

### Task 1: Tipo `chat` para conversas salvas

**Files:**
- Modify: `src/lib/link-kind.ts`
- Modify: `src/lib/search/text.ts:44-51` (`KIND_WORDS`)
- Modify: `src/lib/search/labels.ts` (`KIND_LABEL_KEYS`)
- Modify: `public/_locales/en/messages.json`, `public/_locales/pt_BR/messages.json`
- Test: `src/test/lib/link-kind.test.ts`, `src/test/lib/search/text.test.ts`

**Interfaces:**
- Produces: `LinkKind` passa a incluir `'chat'`; `LINK_KINDS` inclui `'chat'` depois de `'exercise'`; `KIND_LABEL_KEYS.chat = 'kind_chat'`.

- [ ] **Step 1: Write the failing tests**

Em `src/test/lib/link-kind.test.ts`, dentro do `it.each`, antes de `['not a url', 'page'],`:

```ts
    ['https://claude.ai/chat/0a1b2c', 'chat'],
    ['https://claude.ai/project/0a1b2c', 'chat'],
    ['https://chatgpt.com/c/6aac817e', 'chat'],
    ['https://chatgpt.com/g/g-abc123/c/6aad', 'chat'],
    ['https://chat.openai.com/c/123', 'chat'],
    ['https://gemini.google.com/app/5f2c', 'chat'],
    ['https://notebooklm.google.com/notebook/e226b780', 'chat'],
    ['https://notebook.google.com/notebook/e226b780', 'chat'],
    ['https://learn.chatgpt.com/docs/quickstart', 'docs'],
    ['https://claude.ai/login', 'page'],
```

Em `src/test/lib/search/text.test.ts`, no `it.each` de `parseQuery`, antes de `['!!!', [], []],`:

```ts
    ['conversas sobre agentes ', ['agent'], ['chat']],
    ['chat', [], ['chat']],
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `docker compose run --rm app npx vitest run src/test/lib/link-kind.test.ts src/test/lib/search/text.test.ts`
Expected: FAIL — os casos `chat` recebem `'page'`; `parseQuery` devolve `kinds: []` para "conversas"/"chat".

- [ ] **Step 3: Implement**

Em `src/lib/link-kind.ts`, no tipo, depois de `| 'docs'`:

```ts
  | 'chat'
```

Em `LINK_KINDS`:

```ts
export const LINK_KINDS: readonly LinkKind[] = [
  'video', 'paper', 'repo', 'code-change', 'docs', 'exercise', 'chat', 'social', 'search', 'file', 'page',
];
```

Depois de `isExercise`:

```ts
/** Saved conversations with an AI assistant or notebook. */
function isChat(host: string, path: string): boolean {
  return (host === 'claude.ai' && (path.startsWith('/chat/') || path.startsWith('/project/')))
    || ((host === 'chatgpt.com' || host === 'chat.openai.com') && (path.startsWith('/c/') || path.startsWith('/g/')))
    || (host === 'gemini.google.com' && path.startsWith('/app'))
    || ((host === 'notebooklm.google.com' || host === 'notebook.google.com') && path.startsWith('/notebook/'));
}
```

Em `linkKind`, logo depois da linha do `isExercise`:

```ts
  if (isChat(host, path)) { return 'chat'; }
```

Em `src/lib/search/text.ts`, dentro de `KIND_WORDS`, depois da linha dos exercícios:

```ts
  conversa: 'chat', conversas: 'chat', chat: 'chat', chats: 'chat',
```

Em `src/lib/search/labels.ts`, em `KIND_LABEL_KEYS`, depois de `exercise`:

```ts
  chat: 'kind_chat',
```

Locales — `en`:

```json
  "kind_chat": {
    "message": "Chat"
  }
```

`pt_BR`:

```json
  "kind_chat": {
    "message": "Conversa"
  }
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `docker compose run --rm app npx vitest run src/test/lib/link-kind.test.ts src/test/lib/search/text.test.ts src/test/components/SearchPanel.test.ts`
Expected: PASS (o painel ganha um chip a mais e continua passando).

- [ ] **Step 5: Commit**

```bash
git add src/lib/link-kind.ts src/lib/search/text.ts src/lib/search/labels.ts public/_locales/en/messages.json public/_locales/pt_BR/messages.json src/test/lib/link-kind.test.ts src/test/lib/search/text.test.ts
git commit -m "feat(kind): saved AI conversations get their own kind, chat

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Campos do ciclo de vida, datas e estado do link

**Files:**
- Modify: `src/lib/types.ts` (Link, Collection, tipos de atividade)
- Create: `src/lib/recommend/dates.ts`, `src/lib/recommend/state.ts`, `src/lib/recommend/effort.ts`
- Test: `src/test/lib/recommend/dates.test.ts`, `src/test/lib/recommend/state.test.ts`, `src/test/lib/recommend/effort.test.ts`

**Interfaces:**
- Consumes: `LinkKind` (Task 1).
- Produces:
  - `Link.completedAt?: number`, `Link.snoozedUntil?: number`, `Link.keptAt?: number`, `Link.reference?: boolean`; `Collection.reference?: boolean`, `Collection.focus?: boolean`.
  - `interface LinkActivity { opens: number; lastOpenedAt?: number; openDays: string[]; shownDays: string[]; skippedAt?: number; snoozes: number; activeMs: number; askCompleteAt?: number }`, `type Activity = Record<string, LinkActivity>`, `interface WeekStats { shown; acted; snoozed; discarded; skipped; queue: number }`, `type RecoStats = Record<string, WeekStats>`, `EMPTY_ACTIVITY: LinkActivity`, `EMPTY_WEEK: WeekStats`.
  - `dates.ts`: `DAY_MS`, `startOfDay(ms): number`, `addDays(ms, days): number`, `dayKey(ms): string`, `daysBetween(from, to): number`, `tomorrow(now): number`, `nextMonday(now): number`, `weekStart(ms): number`, `isoWeek(ms): string`, `shortDate(ms): string`.
  - `state.ts`: `isCompleted(link)`, `isReference(link, collection | undefined)`, `isSnoozed(link, now)`, `isPending(link, collection | undefined, now)` — todos `boolean`.
  - `effort.ts`: `type LinkAction = 'watch' | 'read' | 'explore' | 'solve' | 'review' | 'resume' | 'searchAgain' | 'open'`, `linkAction(kind): LinkAction`, `defaultEffort(kind): number` (minutos).

- [ ] **Step 1: Write the failing tests**

`src/test/lib/recommend/dates.test.ts`:

```ts
/**
 * Calendar helpers: everything the recommender does is by local day.
 */
import { describe, it, expect } from 'vitest';
import {
  addDays, dayKey, daysBetween, isoWeek, nextMonday, shortDate, startOfDay, tomorrow, weekStart,
} from '@/lib/recommend/dates';

const at = (year: number, month: number, day: number, hour = 10): number => new Date(year, month - 1, day, hour).getTime();

describe('dates', () => {
  it('keys a local day as AAAA-MM-DD, which sorts in date order', () => {
    expect(dayKey(at(2026, 9, 4, 23))).toBe('2026-09-04');
  });

  it('counts calendar days, not 24-hour spans', () => {
    expect(daysBetween(at(2026, 9, 23, 23), at(2026, 9, 24, 1))).toBe(1);
    expect(daysBetween(at(2026, 9, 24, 1), at(2026, 9, 24, 23))).toBe(0);
  });

  it('adds days from the start of the day', () => {
    expect(addDays(at(2026, 9, 24, 15), -60)).toBe(new Date(2026, 6, 26).getTime());
    expect(startOfDay(at(2026, 9, 24, 15))).toBe(new Date(2026, 8, 24).getTime());
  });

  it('snoozing until tomorrow means the start of the next day', () => {
    expect(tomorrow(at(2026, 9, 24, 22))).toBe(new Date(2026, 8, 25).getTime());
  });

  it.each([
    [at(2026, 9, 21), new Date(2026, 8, 28)],
    [at(2026, 9, 24), new Date(2026, 8, 28)],
    [at(2026, 9, 27), new Date(2026, 8, 28)],
  ])('next week starts on the next Monday (%#)', (now, expected) => {
    expect(nextMonday(now)).toBe(expected.getTime());
  });

  it('finds the Monday a week starts on', () => {
    expect(weekStart(at(2026, 9, 24))).toBe(new Date(2026, 8, 21).getTime());
    expect(weekStart(at(2026, 9, 27))).toBe(new Date(2026, 8, 21).getTime());
  });

  it.each([
    [at(2026, 9, 24), '2026-W39'],
    [at(2026, 1, 1), '2026-W01'],
    [at(2026, 12, 28), '2026-W53'],
    [at(2027, 1, 1), '2026-W53'],
    [at(2027, 1, 4), '2027-W01'],
  ])('ISO week of %s is %s', (ms, week) => {
    expect(isoWeek(ms)).toBe(week);
  });

  it('writes a short day and month', () => {
    const text = shortDate(at(2026, 9, 25));
    expect(text).toContain('25');
    expect(text).toContain('09');
  });
});
```

`src/test/lib/recommend/state.test.ts`:

```ts
/**
 * Link lifecycle: completed, reference, snoozed, pending.
 */
import { describe, it, expect } from 'vitest';
import { isCompleted, isPending, isReference, isSnoozed } from '@/lib/recommend/state';
import { createMockCollection, createMockLink } from '../../factories';

const now = new Date(2026, 8, 24, 10).getTime();
const tomorrowStart = new Date(2026, 8, 25).getTime();

describe('link state', () => {
  const plain = createMockCollection({ id: 'c' });
  const referenceCollection = createMockCollection({ id: 'r', reference: true });

  it('a link with completedAt is completed', () => {
    expect(isCompleted(createMockLink({ completedAt: 1 }))).toBe(true);
    expect(isCompleted(createMockLink())).toBe(false);
  });

  it('a link follows its collection unless it says otherwise', () => {
    expect(isReference(createMockLink({ collectionId: 'r' }), referenceCollection)).toBe(true);
    expect(isReference(createMockLink({ collectionId: 'r', reference: false }), referenceCollection)).toBe(false);
    expect(isReference(createMockLink({ reference: true }), plain)).toBe(true);
    expect(isReference(createMockLink(), undefined)).toBe(false);
  });

  it('a snoozed link comes back at the start of the chosen day', () => {
    const link = createMockLink({ snoozedUntil: tomorrowStart });
    expect(isSnoozed(link, now)).toBe(true);
    expect(isSnoozed(link, new Date(2026, 8, 25, 0, 1).getTime())).toBe(false);
  });

  it('pending means not completed, not reference and not snoozed', () => {
    expect(isPending(createMockLink(), plain, now)).toBe(true);
    expect(isPending(createMockLink({ completedAt: 1 }), plain, now)).toBe(false);
    expect(isPending(createMockLink({ collectionId: 'r' }), referenceCollection, now)).toBe(false);
    expect(isPending(createMockLink({ snoozedUntil: tomorrowStart }), plain, now)).toBe(false);
  });
});
```

`src/test/lib/recommend/effort.test.ts`:

```ts
/**
 * What to do with each kind of link, and roughly how long it takes.
 */
import { describe, it, expect } from 'vitest';
import { defaultEffort, linkAction } from '@/lib/recommend/effort';
import { LINK_KINDS } from '@/lib/link-kind';

describe('effort', () => {
  it.each([
    ['video', 'watch', 20],
    ['paper', 'read', 40],
    ['page', 'read', 10],
    ['docs', 'read', 15],
    ['repo', 'explore', 15],
    ['exercise', 'solve', 30],
    ['code-change', 'review', 15],
    ['chat', 'resume', 10],
    ['social', 'read', 3],
    ['search', 'searchAgain', 3],
    ['file', 'open', 10],
  ] as const)('%s: %s, ~%i min', (kind, action, minutes) => {
    expect(linkAction(kind)).toBe(action);
    expect(defaultEffort(kind)).toBe(minutes);
  });

  it('covers every kind', () => {
    expect(LINK_KINDS.every((kind) => defaultEffort(kind) > 0)).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `docker compose run --rm app npx vitest run src/test/lib/recommend`
Expected: FAIL — "Failed to resolve import '@/lib/recommend/dates'" (e os outros módulos).

- [ ] **Step 3: Implement**

`src/lib/types.ts` — em `Link`, depois de `tags?`:

```ts
  /** Unix ms. Present: completed — off the board and the queue, listed in Focus › Completed. */
  completedAt?: number;
  /** Start of a local day (Unix ms). Until then the link stays out of the queue. */
  snoozedUntil?: number;
  /** Unix ms of the last "still worth it" answer in triage. */
  keptAt?: number;
  /** true: reference, never in the queue. false: pending even in a reference collection. Absent: follows the collection. */
  reference?: boolean;
```

Em `Collection`, depois de `workspaceId?`:

```ts
  /** Every link counts as reference, unless the link says `reference: false`. */
  reference?: boolean;
  /** Front pinned as focus by the user. */
  focus?: boolean;
```

No fim de `src/lib/types.ts`:

```ts
// Recommendation data (never exported)

/**
 * What the user did with a link. Kept apart from `links` so recording an
 * open never redraws the board.
 */
export interface LinkActivity {
  opens: number;
  lastOpenedAt?: number;
  /** Distinct local days (AAAA-MM-DD) the link was opened, the last 10. */
  openDays: string[];
  /** Distinct local days the strip showed the link with no action since; any action clears it. */
  shownDays: string[];
  /** When leaving the strip after 3 days was counted; cleared with shownDays. */
  skippedAt?: number;
  /** Times snoozed; cleared on complete and on "still worth it". */
  snoozes: number;
  /** Phase 2: accumulated active time, in ms. */
  activeMs: number;
  /** Phase 2: set when a visit ended long enough to ask "completed?". */
  askCompleteAt?: number;
}

/** Keyed by link id. */
export type Activity = Record<string, LinkActivity>;

export const EMPTY_ACTIVITY: LinkActivity = { opens: 0, openDays: [], shownDays: [], snoozes: 0, activeMs: 0 };

/** Numbers of one ISO week. */
export interface WeekStats {
  /** Link × day shown in the strip. */
  shown: number;
  /** Opens or completions of a link the strip had shown (each showing counts once). */
  acted: number;
  snoozed: number;
  discarded: number;
  /** Links that left the strip after 3 days without action. */
  skipped: number;
  /** Last queue size seen in the week. */
  queue: number;
}

/** Keyed by ISO week (AAAA-Www); the last 12 weeks. */
export type RecoStats = Record<string, WeekStats>;

export const EMPTY_WEEK: WeekStats = { shown: 0, acted: 0, snoozed: 0, discarded: 0, skipped: 0, queue: 0 };
```

`src/lib/recommend/dates.ts`:

```ts
/**
 * Local-calendar helpers. The recommender works by day, so a new tab never
 * reshuffles the strip within the same day.
 */
export const DAY_MS = 86_400_000;

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

export function startOfDay(ms: number): number {
  const date = new Date(ms);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

/** Start of the day `days` after the day of `ms` (safe across DST changes). */
export function addDays(ms: number, days: number): number {
  const date = new Date(startOfDay(ms));
  date.setDate(date.getDate() + days);
  return date.getTime();
}

/** Local day as AAAA-MM-DD; sorts as text in date order. */
export function dayKey(ms: number): string {
  const date = new Date(ms);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Calendar days from the day of `from` to the day of `to`. */
export function daysBetween(from: number, to: number): number {
  return Math.round((startOfDay(to) - startOfDay(from)) / DAY_MS);
}

export function tomorrow(now: number): number {
  return addDays(now, 1);
}

/** Start of next Monday; on a Monday, the one a week later. */
export function nextMonday(now: number): number {
  const weekday = new Date(now).getDay(); // 0 = Sunday
  return addDays(now, weekday === 0 ? 1 : 8 - weekday);
}

/** Start of the Monday of the week of `ms`. */
export function weekStart(ms: number): number {
  return addDays(ms, -((new Date(ms).getDay() + 6) % 7));
}

/** ISO 8601 week, e.g. 2026-W39. */
export function isoWeek(ms: number): string {
  const thursday = new Date(addDays(weekStart(ms), 3));
  const year = thursday.getFullYear();
  const firstThursday = new Date(addDays(weekStart(new Date(year, 0, 4).getTime()), 3));
  const week = 1 + Math.round((thursday.getTime() - firstThursday.getTime()) / (7 * DAY_MS));
  return `${year}-W${pad(week)}`;
}

/** Day and month in the browser's locale (25/09, 09/25). */
export function shortDate(ms: number): string {
  return new Date(ms).toLocaleDateString(undefined, { day: '2-digit', month: '2-digit' });
}
```

`src/lib/recommend/state.ts`:

```ts
/**
 * Link lifecycle (spec §4): pending, snoozed, reference, completed.
 */
import type { Collection, Link } from '@/lib/types';
import { startOfDay } from './dates';

export function isCompleted(link: Link): boolean {
  return link.completedAt !== undefined;
}

/** The link's own flag wins; otherwise it follows its collection. */
export function isReference(link: Link, collection: Collection | undefined): boolean {
  return link.reference ?? collection?.reference === true;
}

/** Snoozed until a day that has not started yet. */
export function isSnoozed(link: Link, now: number): boolean {
  return link.snoozedUntil !== undefined && link.snoozedUntil > startOfDay(now);
}

/** Not completed, not reference and not snoozed: a candidate for the queue or for triage. */
export function isPending(link: Link, collection: Collection | undefined, now: number): boolean {
  return !isCompleted(link) && !isReference(link, collection) && !isSnoozed(link, now);
}
```

`src/lib/recommend/effort.ts`:

```ts
/**
 * What to do with a link of each kind, and a default effort in minutes
 * (phase 2 replaces it with the user's own median).
 */
import type { LinkKind } from '@/lib/link-kind';

export type LinkAction = 'watch' | 'read' | 'explore' | 'solve' | 'review' | 'resume' | 'searchAgain' | 'open';

const BY_KIND: Record<LinkKind, { action: LinkAction; minutes: number }> = {
  video: { action: 'watch', minutes: 20 },
  paper: { action: 'read', minutes: 40 },
  page: { action: 'read', minutes: 10 },
  docs: { action: 'read', minutes: 15 },
  repo: { action: 'explore', minutes: 15 },
  exercise: { action: 'solve', minutes: 30 },
  'code-change': { action: 'review', minutes: 15 },
  chat: { action: 'resume', minutes: 10 },
  social: { action: 'read', minutes: 3 },
  search: { action: 'searchAgain', minutes: 3 },
  file: { action: 'open', minutes: 10 },
};

export function linkAction(kind: LinkKind): LinkAction {
  return BY_KIND[kind].action;
}

export function defaultEffort(kind: LinkKind): number {
  return BY_KIND[kind].minutes;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `docker compose run --rm app npx vitest run src/test/lib/recommend`
Expected: PASS.

- [ ] **Step 5: Type-check and commit**

Run: `docker compose run --rm app sh -c "npx tsc --noEmit 2>&1 | grep -E 'src/lib/(types|recommend/)'"`
Expected: nenhuma linha.

```bash
git add src/lib/types.ts src/lib/recommend/dates.ts src/lib/recommend/state.ts src/lib/recommend/effort.ts src/test/lib/recommend/dates.test.ts src/test/lib/recommend/state.test.ts src/test/lib/recommend/effort.test.ts
git commit -m "feat(recommend): link lifecycle fields, calendar helpers and effort by kind

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: Triagem

**Files:**
- Create: `src/lib/recommend/triage.ts`
- Test: `src/test/lib/recommend/triage.test.ts`

**Interfaces:**
- Consumes: `isPending` (Task 2), `addDays`, `dayKey` (Task 2), `LinkActivity`, `Activity`, `EMPTY_ACTIVITY` (Task 2).
- Produces:
  - `type TriageReason = 'skipped' | 'snoozedOften' | 'revisited' | 'stale'`
  - `interface TriageItem { link: Link; collection: Collection | undefined; reason: TriageReason }`
  - `SKIP_DAYS = 3`, `SNOOZE_LIMIT = 3`, `REVISIT_DAYS = 3`, `REVISIT_WINDOW_DAYS = 30`, `STALE_DAYS = 60`
  - `activityOf(activity: Activity, linkId: string): LinkActivity`
  - `lastTouch(link: Link, activity: LinkActivity): number`
  - `triageReason(link: Link, activity: LinkActivity, now: number): TriageReason | null`
  - `buildTriage(links: Link[], collections: Map<string, Collection>, activity: Activity, now: number): TriageItem[]`

- [ ] **Step 1: Write the failing test**

`src/test/lib/recommend/triage.test.ts`:

```ts
/**
 * Triage: pending links that need a decision before being recommended.
 */
import { describe, it, expect } from 'vitest';
import { buildTriage, triageReason } from '@/lib/recommend/triage';
import { EMPTY_ACTIVITY, type Activity, type LinkActivity } from '@/lib/types';
import { createMockCollection, createMockLink } from '../../factories';

const now = new Date(2026, 8, 24, 10).getTime();
const on = (month: number, day: number): number => new Date(2026, month - 1, day, 12).getTime();
const act = (overrides: Partial<LinkActivity>): LinkActivity => ({ ...EMPTY_ACTIVITY, ...overrides });
const fresh = createMockLink({ id: 'l', createdAt: on(9, 20) });

describe('triageReason', () => {
  it('a link shown on 3 earlier days without any action was skipped', () => {
    expect(triageReason(fresh, act({ shownDays: ['2026-09-21', '2026-09-22', '2026-09-23'] }), now)).toBe('skipped');
  });

  it('today does not count yet, so the strip stays the same all day', () => {
    expect(triageReason(fresh, act({ shownDays: ['2026-09-22', '2026-09-23', '2026-09-24'] }), now)).toBeNull();
  });

  it('a link snoozed 3 times needs a decision', () => {
    expect(triageReason(fresh, act({ snoozes: 3 }), now)).toBe('snoozedOften');
  });

  it('a link opened on 3 days in the last 30 without being completed was revisited', () => {
    expect(triageReason(fresh, act({ openDays: ['2026-09-10', '2026-09-15', '2026-09-20'] }), now)).toBe('revisited');
  });

  it('visits up to a "still worth it" answer no longer count', () => {
    const kept = { ...fresh, keptAt: on(9, 15) };
    expect(triageReason(kept, act({ openDays: ['2026-09-10', '2026-09-15', '2026-09-20'] }), now)).toBeNull();
  });

  it('visits older than 30 days do not count', () => {
    expect(triageReason(fresh, act({ openDays: ['2026-08-01', '2026-08-10', '2026-08-20'] }), now)).toBeNull();
  });

  it('a link untouched for more than 60 days is stale until kept or opened', () => {
    const old = createMockLink({ id: 'old', createdAt: on(2, 4) });
    expect(triageReason(old, EMPTY_ACTIVITY, now)).toBe('stale');
    expect(triageReason({ ...old, keptAt: on(9, 1) }, EMPTY_ACTIVITY, now)).toBeNull();
    expect(triageReason(old, act({ lastOpenedAt: on(9, 1) }), now)).toBeNull();
  });
});

describe('buildTriage', () => {
  const collection = createMockCollection({ id: 'c' });
  const referenceCollection = createMockCollection({ id: 'r', reference: true });
  const collections = new Map([[collection.id, collection], [referenceCollection.id, referenceCollection]]);

  it('only triages pending links', () => {
    const links = [
      createMockLink({ id: 'done', collectionId: 'c', createdAt: on(2, 1), completedAt: on(9, 1) }),
      createMockLink({ id: 'ref', collectionId: 'r', createdAt: on(2, 1) }),
      createMockLink({ id: 'later', collectionId: 'c', createdAt: on(2, 1), snoozedUntil: on(9, 30) }),
      createMockLink({ id: 'old', collectionId: 'c', createdAt: on(2, 1) }),
    ];
    expect(buildTriage(links, collections, {}, now).map((item) => item.link.id)).toEqual(['old']);
  });

  it('puts skipped links first and stale ones last, oldest first', () => {
    const links = [
      createMockLink({ id: 'stale-newer', collectionId: 'c', createdAt: on(3, 1) }),
      createMockLink({ id: 'stale-older', collectionId: 'c', createdAt: on(2, 1) }),
      createMockLink({ id: 'skipped', collectionId: 'c', createdAt: on(9, 20) }),
    ];
    const activity: Activity = { skipped: act({ shownDays: ['2026-09-20', '2026-09-21', '2026-09-22'] }) };

    expect(buildTriage(links, collections, activity, now).map((item) => [item.link.id, item.reason])).toEqual([
      ['skipped', 'skipped'],
      ['stale-older', 'stale'],
      ['stale-newer', 'stale'],
    ]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `docker compose run --rm app npx vitest run src/test/lib/recommend/triage.test.ts`
Expected: FAIL — "Failed to resolve import '@/lib/recommend/triage'".

- [ ] **Step 3: Implement**

`src/lib/recommend/triage.ts`:

```ts
/**
 * Triage (spec §6.4): pending links that need a decision — still worth it,
 * discard, reference, already done — before they are recommended.
 */
import type { Activity, Collection, Link, LinkActivity } from '@/lib/types';
import { EMPTY_ACTIVITY } from '@/lib/types';
import { addDays, dayKey } from './dates';
import { isPending } from './state';

export type TriageReason = 'skipped' | 'snoozedOften' | 'revisited' | 'stale';

export interface TriageItem {
  link: Link;
  collection: Collection | undefined;
  reason: TriageReason;
}

export const SKIP_DAYS = 3;
export const SNOOZE_LIMIT = 3;
export const REVISIT_DAYS = 3;
export const REVISIT_WINDOW_DAYS = 30;
export const STALE_DAYS = 60;

const REASON_ORDER: Record<TriageReason, number> = { skipped: 0, snoozedOften: 1, revisited: 2, stale: 3 };

export function activityOf(activity: Activity, linkId: string): LinkActivity {
  return activity[linkId] ?? EMPTY_ACTIVITY;
}

/** Last time the user touched the link: saved it, kept it or opened it. */
export function lastTouch(link: Link, activity: LinkActivity): number {
  return Math.max(link.createdAt, link.keptAt ?? 0, activity.lastOpenedAt ?? 0);
}

/**
 * Why a pending link needs a decision, or null. Days shown today do not
 * count yet, so the strip does not change during the day.
 */
export function triageReason(link: Link, activity: LinkActivity, now: number): TriageReason | null {
  const today = dayKey(now);
  if (activity.shownDays.filter((day) => day < today).length >= SKIP_DAYS) {
    return 'skipped';
  }
  if (activity.snoozes >= SNOOZE_LIMIT) {
    return 'snoozedOften';
  }
  const windowStart = dayKey(addDays(now, -REVISIT_WINDOW_DAYS));
  const keptDay = link.keptAt === undefined ? '' : dayKey(link.keptAt);
  const revisits = activity.openDays.filter((day) => day >= windowStart && day > keptDay);
  if (revisits.length >= REVISIT_DAYS) {
    return 'revisited';
  }
  if (lastTouch(link, activity) < addDays(now, -STALE_DAYS)) {
    return 'stale';
  }
  return null;
}

/** Skipped first, then snoozed too often, revisited and stale; oldest first within each. */
export function buildTriage(
  links: Link[],
  collections: Map<string, Collection>,
  activity: Activity,
  now: number
): TriageItem[] {
  const items: (TriageItem & { touch: number })[] = [];
  for (const link of links) {
    const collection = collections.get(link.collectionId);
    if (!isPending(link, collection, now)) {
      continue;
    }
    const linkActivity = activityOf(activity, link.id);
    const reason = triageReason(link, linkActivity, now);
    if (reason !== null) {
      items.push({ link, collection, reason, touch: lastTouch(link, linkActivity) });
    }
  }
  return items
    .sort((a, b) => REASON_ORDER[a.reason] - REASON_ORDER[b.reason] || a.touch - b.touch)
    .map(({ link, collection, reason }) => ({ link, collection, reason }));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `docker compose run --rm app npx vitest run src/test/lib/recommend/triage.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/recommend/triage.ts src/test/lib/recommend/triage.test.ts
git commit -m "feat(recommend): triage of skipped, over-snoozed, revisited and stale links

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: Frentes e vagas da faixa

**Files:**
- Create: `src/lib/recommend/engine.ts`
- Test: `src/test/lib/recommend/engine.test.ts`

**Interfaces:**
- Consumes: `linkKind` (Task 1), `sortCollectionLinks` (`src/lib/link-order.ts`), `addDays`, `daysBetween`, `isPending`, `linkAction`, `defaultEffort`, `LinkAction` (Task 2), `activityOf`, `buildTriage`, `lastTouch`, `TriageItem` (Task 3).
- Produces:
  - `type SlotRole = 'continue' | 'advance' | 'revive'`
  - `type Reason = { type: 'opened'; days: number } | { type: 'focus' } | { type: 'momentum'; count: number } | { type: 'nearlyDone'; remaining: number } | { type: 'nextInColumn' } | { type: 'stale'; weeks: number }`
  - `interface Front { collection: Collection; eligible: Link[]; momentum: number; lastTouch: number }`
  - `interface Recommendation { link: Link; collection: Collection; role: SlotRole; reason: Reason; kind: LinkKind; action: LinkAction; effort: number }`
  - `interface Queue { slots: Recommendation[]; triage: TriageItem[]; fronts: Front[]; size: number }`
  - `interface EngineInput { links: Link[]; collections: Collection[]; activity: Activity; now: number }`
  - `recommendation(link, collection, role, reason): Recommendation`, `advanceReason(front): Reason`, `buildQueue(input): Queue`

- [ ] **Step 1: Write the failing test**

`src/test/lib/recommend/engine.test.ts`:

```ts
/**
 * Recommendation engine: fronts, the strip's three slots and the queue.
 */
import { describe, it, expect } from 'vitest';
import { buildQueue } from '@/lib/recommend/engine';
import { dayKey } from '@/lib/recommend/dates';
import { EMPTY_ACTIVITY, type Activity, type Collection, type Link, type LinkActivity } from '@/lib/types';
import { createMockCollection, createMockLink } from '../../factories';

const DAY = 86_400_000;
const now = new Date(2026, 8, 24, 10).getTime();
const daysAgo = (days: number): number => now - days * DAY;

function col(id: string, order: number, extra: Partial<Collection> = {}): Collection {
  return createMockCollection({ id, name: id, order, workspaceId: 'ws', ...extra });
}

function link(id: string, collectionId: string, extra: Partial<Link> = {}): Link {
  return createMockLink({ id, title: id, url: `https://example.com/${id}`, collectionId, createdAt: daysAgo(1), ...extra });
}

function opened(days: number): LinkActivity {
  return { ...EMPTY_ACTIVITY, opens: 1, lastOpenedAt: daysAgo(days), openDays: [dayKey(daysAgo(days))] };
}

function slots(links: Link[], collections: Collection[], activity: Activity = {}): string[] {
  return buildQueue({ links, collections, activity, now }).slots.map((slot) => `${slot.role}:${slot.link.id}`);
}

describe('buildQueue', () => {
  it('recommends the first eligible link in the column order', () => {
    const links = [link('a1', 'a', { order: 1 }), link('a2', 'a', { order: 0 })];
    expect(slots(links, [col('a', 1)])).toEqual(['advance:a2']);
  });

  it('never recommends completed, reference, snoozed or triaged links, and counts what is left', () => {
    const links = [
      link('done', 'a', { completedAt: daysAgo(1), order: 0 }),
      link('ref', 'a', { reference: true, order: 1 }),
      link('later', 'a', { snoozedUntil: now + DAY, order: 2 }),
      link('old', 'a', { createdAt: daysAgo(90), order: 3 }),
      link('next', 'a', { order: 4 }),
    ];
    const queue = buildQueue({ links, collections: [col('a', 1)], activity: {}, now });

    expect(queue.slots.map((slot) => slot.link.id)).toEqual(['next']);
    expect(queue.triage.map((item) => item.link.id)).toEqual(['old']);
    expect(queue.size).toBe(2);
  });

  it('advances the front with more completions this week, then the one closest to empty', () => {
    const links = [
      ...['b1', 'b2', 'b3', 'b4', 'b5'].map((id) => link(id, 'big')),
      ...['s1', 's2'].map((id) => link(id, 'small')),
      ...['u1', 'u2', 'u3', 'u4'].map((id) => link(id, 'busy')),
      link('u-done1', 'busy', { completedAt: daysAgo(2) }),
      link('u-done2', 'busy', { completedAt: daysAgo(3) }),
    ];
    const queue = buildQueue({ links, collections: [col('big', 1), col('small', 2), col('busy', 3)], activity: {}, now });

    expect(queue.slots.map((slot) => [slot.collection.id, slot.reason])).toEqual([
      ['busy', { type: 'momentum', count: 2 }],
      ['small', { type: 'nearlyDone', remaining: 2 }],
      ['big', { type: 'nextInColumn' }],
    ]);
  });

  it('puts a pinned focus front first', () => {
    const links = [link('a1', 'a'), link('b1', 'b'), link('b2', 'b')];
    expect(slots(links, [col('a', 1), col('b', 2, { focus: true })])).toEqual(['continue:b1', 'advance:a1']);
  });

  it('continues the link opened most recently in the last 14 days', () => {
    const links = [link('a1', 'a'), link('a2', 'a'), link('b1', 'b'), link('c1', 'c')];
    const queue = buildQueue({
      links,
      collections: [col('a', 1), col('b', 2), col('c', 3)],
      activity: { a2: opened(2), b1: opened(5) },
      now,
    });

    expect(queue.slots[0]).toMatchObject({ role: 'continue', link: { id: 'a2' }, reason: { type: 'opened', days: 2 } });
    expect(queue.slots.map((slot) => slot.collection.id)).toEqual(['a', 'b', 'c']);
  });

  it('ignores opens older than 14 days', () => {
    expect(slots([link('a1', 'a')], [col('a', 1)], { a1: opened(20) })).toEqual(['advance:a1']);
  });

  it('revisits the front untouched for longest, after 14 days, as the last card', () => {
    const links = [
      link('a1', 'a'),
      link('b1', 'b'),
      link('o1', 'old', { createdAt: daysAgo(30) }),
      link('o2', 'old', { createdAt: daysAgo(31) }),
    ];
    const queue = buildQueue({ links, collections: [col('a', 1), col('b', 2), col('old', 3)], activity: {}, now });

    expect(queue.slots.map((slot) => `${slot.role}:${slot.collection.id}`)).toEqual(['advance:a', 'advance:b', 'revive:old']);
    expect(queue.slots[2].reason).toEqual({ type: 'stale', weeks: 4 });
  });

  it('fills every slot from a different front', () => {
    const links = [link('a1', 'a'), link('a2', 'a'), link('b1', 'b'), link('c1', 'c'), link('d1', 'd')];
    const queue = buildQueue({ links, collections: [col('a', 1), col('b', 2), col('c', 3), col('d', 4)], activity: {}, now });

    expect(queue.slots).toHaveLength(3);
    expect(new Set(queue.slots.map((slot) => slot.collection.id)).size).toBe(3);
  });

  it('has no cards and an empty queue when nothing is pending', () => {
    const queue = buildQueue({ links: [link('a1', 'a', { completedAt: daysAgo(1) })], collections: [col('a', 1)], activity: {}, now });
    expect(queue).toMatchObject({ slots: [], triage: [], fronts: [], size: 0 });
  });

  it('treats Inbox, which has no workspace, as a front like any other', () => {
    const inbox = createMockCollection({ id: 'inbox', name: 'Inbox', order: 0, isDefault: true });
    expect(slots([link('i1', 'inbox')], [inbox])).toEqual(['advance:i1']);
  });

  it('shows the same cards all day, even after recording what it showed', () => {
    const links = [link('a1', 'a'), link('b1', 'b'), link('c1', 'c'), link('d1', 'd')];
    const collections = [col('a', 1), col('b', 2), col('c', 3), col('d', 4)];
    const before = slots(links, collections);
    const shownToday: Activity = Object.fromEntries(
      before.map((slot) => [slot.split(':')[1], { ...EMPTY_ACTIVITY, shownDays: [dayKey(now)] }])
    );

    expect(slots(links, collections, shownToday)).toEqual(before);
  });

  it('describes each card with the action and effort of its kind', () => {
    const video = link('v', 'a', { url: 'https://www.youtube.com/watch?v=x' });
    const [card] = buildQueue({ links: [video], collections: [col('a', 1)], activity: {}, now }).slots;
    expect(card).toMatchObject({ kind: 'video', action: 'watch', effort: 20 });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `docker compose run --rm app npx vitest run src/test/lib/recommend/engine.test.ts`
Expected: FAIL — "Failed to resolve import '@/lib/recommend/engine'".

- [ ] **Step 3: Implement**

`src/lib/recommend/engine.ts`:

```ts
/**
 * Recommendation engine (spec §6). Pure: no chrome.* access.
 *
 * A front is a collection with eligible links; its next link is the first
 * eligible one in the column order the user drags. The strip has up to three
 * cards from different fronts: Continue (a link opened recently, or the
 * pinned focus), Advance (momentum, then closest to empty) and Revive (the
 * front untouched for longest, after 14 days).
 */
import type { Activity, Collection, Link } from '@/lib/types';
import { linkKind, type LinkKind } from '@/lib/link-kind';
import { sortCollectionLinks } from '@/lib/link-order';
import { addDays, daysBetween } from './dates';
import { defaultEffort, linkAction, type LinkAction } from './effort';
import { isPending } from './state';
import { activityOf, buildTriage, lastTouch, type TriageItem } from './triage';

export type SlotRole = 'continue' | 'advance' | 'revive';

export type Reason =
  | { type: 'opened'; days: number }
  | { type: 'focus' }
  | { type: 'momentum'; count: number }
  | { type: 'nearlyDone'; remaining: number }
  | { type: 'nextInColumn' }
  | { type: 'stale'; weeks: number };

export interface Front {
  collection: Collection;
  /** Eligible links in column order; the first is the next one. */
  eligible: Link[];
  /** Links of the collection completed in the last 7 days. */
  momentum: number;
  /** Last time any link of the collection was saved, completed, kept or opened. */
  lastTouch: number;
}

export interface Recommendation {
  link: Link;
  collection: Collection;
  role: SlotRole;
  reason: Reason;
  kind: LinkKind;
  action: LinkAction;
  /** Minutes. */
  effort: number;
}

export interface Queue {
  slots: Recommendation[];
  triage: TriageItem[];
  /** Every front, in Advance order. */
  fronts: Front[];
  /** Eligible links plus triage: what is left to do or decide. */
  size: number;
}

export interface EngineInput {
  links: Link[];
  collections: Collection[];
  activity: Activity;
  now: number;
}

export const SLOTS = 3;
export const CONTINUE_DAYS = 14;
export const REVIVE_DAYS = 14;
export const MOMENTUM_DAYS = 7;
export const NEARLY_DONE = 3;

export function recommendation(link: Link, collection: Collection, role: SlotRole, reason: Reason): Recommendation {
  const kind = linkKind(link.url);
  return { link, collection, role, reason, kind, action: linkAction(kind), effort: defaultEffort(kind) };
}

/** Focus first, then momentum, then fewer eligible links, then collection order. */
function compareFronts(a: Front, b: Front): number {
  return Number(b.collection.focus === true) - Number(a.collection.focus === true)
    || b.momentum - a.momentum
    || a.eligible.length - b.eligible.length
    || a.collection.order - b.collection.order;
}

/** Why a front is worth advancing; the first that applies. */
export function advanceReason(front: Front): Reason {
  if (front.collection.focus === true) {
    return { type: 'focus' };
  }
  if (front.momentum > 0) {
    return { type: 'momentum', count: front.momentum };
  }
  if (front.eligible.length <= NEARLY_DONE) {
    return { type: 'nearlyDone', remaining: front.eligible.length };
  }
  return { type: 'nextInColumn' };
}

function buildFronts(links: Link[], collections: Collection[], activity: Activity, inTriage: Set<string>, now: number): Front[] {
  const momentumSince = addDays(now, -MOMENTUM_DAYS);
  const fronts: Front[] = [];
  for (const collection of collections) {
    const own = links.filter((link) => link.collectionId === collection.id);
    const eligible = sortCollectionLinks(
      own.filter((link) => isPending(link, collection, now) && !inTriage.has(link.id))
    );
    if (eligible.length === 0) {
      continue;
    }
    fronts.push({
      collection,
      eligible,
      momentum: own.filter((link) => link.completedAt !== undefined && link.completedAt >= momentumSince).length,
      lastTouch: Math.max(...own.map((link) => Math.max(lastTouch(link, activityOf(activity, link.id)), link.completedAt ?? 0))),
    });
  }
  return fronts.sort(compareFronts);
}

function continueSlot(fronts: Front[], activity: Activity, now: number): Recommendation | null {
  const since = addDays(now, -CONTINUE_DAYS);
  let best: { link: Link; front: Front; openedAt: number } | null = null;
  for (const front of fronts) {
    for (const link of front.eligible) {
      const openedAt = activityOf(activity, link.id).lastOpenedAt;
      if (openedAt !== undefined && openedAt >= since && (best === null || openedAt > best.openedAt)) {
        best = { link, front, openedAt };
      }
    }
  }
  if (best !== null) {
    return recommendation(best.link, best.front.collection, 'continue', {
      type: 'opened',
      days: daysBetween(best.openedAt, now),
    });
  }
  // Fronts are sorted with focus first, then by momentum.
  const focus = fronts.find((front) => front.collection.focus === true);
  return focus === undefined ? null : recommendation(focus.eligible[0], focus.collection, 'continue', { type: 'focus' });
}

function pickSlots(fronts: Front[], activity: Activity, now: number): Recommendation[] {
  const slots: Recommendation[] = [];
  const used = new Set<string>();

  const continued = continueSlot(fronts, activity, now);
  if (continued !== null) {
    slots.push(continued);
    used.add(continued.collection.id);
  }

  const reviveBefore = addDays(now, -REVIVE_DAYS);
  const revive = fronts
    .filter((front) => !used.has(front.collection.id) && front.lastTouch < reviveBefore)
    .sort((a, b) => a.lastTouch - b.lastTouch)[0];
  if (revive !== undefined) {
    used.add(revive.collection.id);
  }

  const advanceCount = SLOTS - slots.length - (revive === undefined ? 0 : 1);
  for (const front of fronts.filter((f) => !used.has(f.collection.id)).slice(0, advanceCount)) {
    slots.push(recommendation(front.eligible[0], front.collection, 'advance', advanceReason(front)));
  }

  if (revive !== undefined) {
    slots.push(recommendation(revive.eligible[0], revive.collection, 'revive', {
      type: 'stale',
      weeks: Math.floor(daysBetween(revive.lastTouch, now) / 7),
    }));
  }
  return slots;
}

export function buildQueue({ links, collections, activity, now }: EngineInput): Queue {
  const byId = new Map(collections.map((collection) => [collection.id, collection]));
  const triage = buildTriage(links, byId, activity, now);
  const inTriage = new Set(triage.map((item) => item.link.id));
  const fronts = buildFronts(links, collections, activity, inTriage, now);
  return {
    slots: pickSlots(fronts, activity, now),
    triage,
    fronts,
    size: fronts.reduce((total, front) => total + front.eligible.length, 0) + triage.length,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `docker compose run --rm app npx vitest run src/test/lib/recommend/engine.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/recommend/engine.ts src/test/lib/recommend/engine.test.ts
git commit -m "feat(recommend): fronts in column order and the strip's continue, advance and revive slots

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: Sessão

**Files:**
- Create: `src/lib/recommend/session.ts`
- Test: `src/test/lib/recommend/session.test.ts`

**Interfaces:**
- Consumes: `Queue`, `Front`, `Recommendation`, `recommendation`, `advanceReason` (Task 4).
- Produces:
  - `type SessionMinutes = 15 | 30 | 60`, `SESSION_OPTIONS: readonly SessionMinutes[]`
  - `TRIAGE_BATCH = 5`, `SESSION_FRONTS = 2`, `MIN_LEFT = 5`
  - `type SessionItem = { type: 'triage'; count: number } | { type: 'link'; rec: Recommendation; overBudget: boolean }`
  - `buildSession(queue: Queue, minutes: SessionMinutes): SessionItem[]`

- [ ] **Step 1: Write the failing test**

`src/test/lib/recommend/session.test.ts`:

```ts
/**
 * Session: a sequence that fits the time the user has.
 */
import { describe, it, expect } from 'vitest';
import { buildQueue } from '@/lib/recommend/engine';
import { buildSession, type SessionItem, type SessionMinutes } from '@/lib/recommend/session';
import { EMPTY_ACTIVITY, type Activity, type Collection, type Link } from '@/lib/types';
import { createMockCollection, createMockLink } from '../../factories';

const DAY = 86_400_000;
const now = new Date(2026, 8, 24, 10).getTime();

const col = (id: string, order: number): Collection => createMockCollection({ id, name: id, order, workspaceId: 'ws' });
const page = (id: string, collectionId: string, extra: Partial<Link> = {}): Link =>
  createMockLink({ id, url: `https://example.com/${id}`, collectionId, createdAt: now - DAY, ...extra });
const paper = (id: string, collectionId: string): Link => page(id, collectionId, { url: `https://arxiv.org/abs/${id}` });

function label(item: SessionItem): string {
  return item.type === 'triage' ? `triage:${item.count}` : `${item.rec.link.id}${item.overBudget ? '!' : ''}`;
}

function session(links: Link[], collections: Collection[], minutes: SessionMinutes, activity: Activity = {}): string[] {
  return buildSession(buildQueue({ links, collections, activity, now }), minutes).map(label);
}

describe('buildSession', () => {
  it('starts with a batch of at most 5 triage decisions', () => {
    const old = ['o1', 'o2', 'o3', 'o4', 'o5', 'o6', 'o7'].map((id) => page(id, 'a', { createdAt: now - 90 * DAY }));
    expect(session([...old, page('p1', 'a')], [col('a', 1)], 15)).toEqual(['triage:5', 'p1']);
  });

  it('fills the time with the next links of the best front, then the second', () => {
    const links = [page('a1', 'a'), page('a2', 'a'), page('a3', 'a'), page('b1', 'b'), page('b2', 'b')];
    expect(session(links, [col('a', 1), col('b', 2)], 30)).toEqual(['b1', 'b2', 'a1']);
  });

  it('uses at most two fronts', () => {
    const links = [page('a1', 'a'), page('b1', 'b'), page('c1', 'c')];
    expect(session(links, [col('a', 1), col('b', 2), col('c', 3)], 60)).toEqual(['a1', 'b1']);
  });

  it('skips a link that does not fit and tries the next one', () => {
    expect(session([paper('p1', 'a'), page('a2', 'a')], [col('a', 1)], 15)).toEqual(['a2']);
  });

  it('starts with the link the user already opened', () => {
    const links = [page('a1', 'a'), page('a2', 'a'), page('b1', 'b')];
    const activity: Activity = { a2: { ...EMPTY_ACTIVITY, opens: 1, lastOpenedAt: now - DAY } };
    expect(session(links, [col('a', 1), col('b', 2)], 30, activity)[0]).toBe('a2');
  });

  it('offers the next link, marked as longer than the session, when nothing fits', () => {
    expect(session([paper('p1', 'a')], [col('a', 1)], 15)).toEqual(['p1!']);
  });

  it('is empty when there is nothing to do', () => {
    expect(session([], [col('a', 1)], 30)).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `docker compose run --rm app npx vitest run src/test/lib/recommend/session.test.ts`
Expected: FAIL — "Failed to resolve import '@/lib/recommend/session'".

- [ ] **Step 3: Implement**

`src/lib/recommend/session.ts`:

```ts
/**
 * Focus session (spec §6.5): a triage batch, the link already started,
 * then the next links of the two best fronts that fit the time. Never
 * stored: the engine is deterministic, so a reload rebuilds the same
 * sequence without what was completed.
 */
import { advanceReason, recommendation, type Queue, type Recommendation } from './engine';

export type SessionMinutes = 15 | 30 | 60;

export const SESSION_OPTIONS: readonly SessionMinutes[] = [15, 30, 60];
export const TRIAGE_BATCH = 5;
export const SESSION_FRONTS = 2;
/** Stop filling when fewer minutes than this are left. */
export const MIN_LEFT = 5;

export type SessionItem =
  | { type: 'triage'; count: number }
  | { type: 'link'; rec: Recommendation; overBudget: boolean };

export function buildSession(queue: Queue, minutes: SessionMinutes): SessionItem[] {
  const items: SessionItem[] = [];
  const taken = new Set<string>();
  let left: number = minutes;

  if (queue.triage.length > 0) {
    items.push({ type: 'triage', count: Math.min(TRIAGE_BATCH, queue.triage.length) });
    left -= 1;
  }

  const continued = queue.slots.find((slot) => slot.role === 'continue');
  if (continued !== undefined) {
    items.push({ type: 'link', rec: continued, overBudget: continued.effort > left });
    taken.add(continued.link.id);
    left -= continued.effort;
  }

  for (const front of queue.fronts.slice(0, SESSION_FRONTS)) {
    for (const link of front.eligible) {
      if (left < MIN_LEFT) {
        break;
      }
      if (taken.has(link.id)) {
        continue;
      }
      const rec = recommendation(link, front.collection, 'advance', advanceReason(front));
      if (rec.effort <= left) {
        items.push({ type: 'link', rec, overBudget: false });
        taken.add(link.id);
        left -= rec.effort;
      }
    }
  }

  if (!items.some((item) => item.type === 'link') && queue.fronts.length > 0) {
    const front = queue.fronts[0];
    items.push({
      type: 'link',
      rec: recommendation(front.eligible[0], front.collection, 'advance', advanceReason(front)),
      overBudget: true,
    });
  }
  return items;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `docker compose run --rm app npx vitest run src/test/lib/recommend`
Expected: PASS (todos os testes de `recommend`).

- [ ] **Step 5: Commit**

```bash
git add src/lib/recommend/session.ts src/test/lib/recommend/session.test.ts
git commit -m "feat(recommend): focus session that fits 15, 30 or 60 minutes

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 6: Ensaio com os dados reais (ponto de parada)

Roda o motor sobre o export real **antes** de qualquer interface, para a pessoa revisar os pesos com os próprios dados (spec §11). O teste é pulado sem `TABALA_EVAL_DIR`; os dados ficam em `.eval/`, fora do git.

**Files:**
- Create: `src/test/eval/recommend.eval.test.ts`

**Interfaces:**
- Consumes: `buildQueue` (Task 4), `buildSession`, `SESSION_OPTIONS` (Task 5), `dayKey` (Task 2), `TabAlaExportFile` (`@/lib/storage`).

- [ ] **Step 1: Write the harness**

`src/test/eval/recommend.eval.test.ts`:

```ts
/* eslint-disable no-console -- the harness reports through the console */
/**
 * Dry run of the recommender on a real export: prints the strip, triage,
 * fronts and sessions so the weights can be reviewed before any UI exists.
 * Skipped unless TABALA_EVAL_DIR points to a folder with export.json and,
 * optionally, activity.json (an Activity map simulating usage). Those files
 * hold personal data and never enter the repository (.eval/ is gitignored).
 */
import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildQueue } from '@/lib/recommend/engine';
import { buildSession, SESSION_OPTIONS } from '@/lib/recommend/session';
import { dayKey } from '@/lib/recommend/dates';
import type { TabAlaExportFile } from '@/lib/storage';
import type { Activity, Collection } from '@/lib/types';

const dir = process.env.TABALA_EVAL_DIR;

function read<T>(name: string): T {
  return JSON.parse(readFileSync(join(dir ?? '', name), 'utf8')) as T;
}

describe.skipIf(dir === undefined)('recommendation dry run', () => {
  it('prints what the strip, triage, fronts and sessions would show', () => {
    const data = read<TabAlaExportFile>('export.json');
    const activity = existsSync(join(dir ?? '', 'activity.json')) ? read<Activity>('activity.json') : {};
    const now = Date.now();
    const workspaceNames = new Map(data.workspaces.map((w) => [w.id, w.name]));
    const path = (c: Collection): string => `${workspaceNames.get(c.workspaceId ?? '') ?? '(global)'} › ${c.name}`;

    const queue = buildQueue({ links: data.links, collections: data.collections, activity, now });
    console.log(`\nfila: ${queue.size} (elegíveis ${queue.size - queue.triage.length}, triagem ${queue.triage.length})`);

    console.log('\n== Faixa');
    for (const slot of queue.slots) {
      console.log(`  [${slot.role}] ${path(slot.collection)} — ${JSON.stringify(slot.reason)}`);
      console.log(`      ${slot.action} "${slot.link.title}" (~${slot.effort} min, ${slot.kind})`);
    }

    const byReason = queue.triage.reduce<Record<string, number>>((counts, item) => {
      counts[item.reason] = (counts[item.reason] ?? 0) + 1;
      return counts;
    }, {});
    console.log('\n== Triagem', byReason);
    for (const item of queue.triage.slice(0, 10)) {
      console.log(`  [${item.reason}] ${dayKey(item.link.createdAt)} "${item.link.title}"`);
    }

    console.log('\n== Frentes (top 12)');
    for (const front of queue.fronts.slice(0, 12)) {
      console.log(`  ${path(front.collection)}: ${front.eligible.length} elegíveis, momento ${front.momentum}, último toque ${dayKey(front.lastTouch)}`);
    }

    for (const minutes of SESSION_OPTIONS) {
      console.log(`\n== Sessão de ${minutes} min`);
      for (const item of buildSession(queue, minutes)) {
        console.log(item.type === 'triage'
          ? `  triar ${item.count}`
          : `  ${item.rec.action} "${item.rec.link.title}" ~${item.rec.effort} min${item.overBudget ? ' (passa do tempo)' : ''}`);
      }
    }

    expect(queue.size).toBeGreaterThanOrEqual(0);
  });
});
```

- [ ] **Step 2: Run it on the real export**

`.eval/export.json` já existe (é a cópia do export canônico usada pela avaliação da busca). Se não existir, copie `<caderno>/anexos/tabala/tabala-organizado-2026-09-24.json` para `.eval/export.json`.

Run: `docker compose run --rm -e TABALA_EVAL_DIR=/app/.eval app npx vitest run src/test/eval/recommend.eval.test.ts`
Expected: PASS, imprimindo faixa (até 3 cards de frentes diferentes), triagem (hoje ~79 "stale"), frentes e as três sessões. Sem `TABALA_EVAL_DIR` o teste aparece como pulado.

Run: `git status --short .eval`
Expected: nenhuma linha (a pasta está no `.gitignore`).

- [ ] **Step 3: PARE — mostre o resultado à pessoa**

Mensagem final do turno: o que a faixa, a triagem e cada sessão mostrariam hoje, e as constantes que controlam isso (`STALE_DAYS` 60, `SKIP_DAYS` 3, `REVIVE_DAYS` 14, `NEARLY_DONE` 3, esforços por tipo). Siga para a Task 7 só com o "ok" dela; se ela pedir outro peso, mude a constante, ajuste o teste correspondente (Tasks 2–5) e registre no ledger como `Ruling`.

- [ ] **Step 4: Commit**

```bash
git add src/test/eval/recommend.eval.test.ts
git commit -m "test(eval): dry run of the recommender on a real export

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 7: Storage do estado do link e da coleção

**Files:**
- Create: `src/lib/storage/progress.ts`
- Modify: `src/lib/storage/index.ts` (exports)
- Modify: `src/lib/storage/import-export.ts:103-144` (validação)
- Modify: `public/_locales/en/messages.json`, `public/_locales/pt_BR/messages.json`
- Test: `src/test/lib/storage/progress.test.ts`, `src/test/lib/storage/import-export.test.ts`

**Interfaces:**
- Consumes: `withDataLock`, `getErrorMessage`, `OperationResult` (`./core`), `getLinks`, `saveLinks`, `getCollections`, `saveCollections` (`./data-access`), campos da Task 2.
- Produces:
  - `type LinkStatePatch = { completedAt?: number | null; snoozedUntil?: number | null; keptAt?: number | null; reference?: boolean | null }` (valor grava; `null` remove; ausente não mexe)
  - `type CollectionStatePatch = { reference?: boolean | null; focus?: boolean | null }`
  - `applyPatch<T extends object>(target: T, patch: Record<string, unknown>): T`
  - `patchLinkState(linkId: string, patch: LinkStatePatch): Promise<OperationResult>`
  - `patchCollectionState(collectionId: string, patch: CollectionStatePatch): Promise<OperationResult>`
  - chaves i18n `error_update_link_failed`, `error_update_collection_failed`

- [ ] **Step 1: Write the failing tests**

`src/test/lib/storage/progress.test.ts`:

```ts
/**
 * Recommendation storage: link and collection state, activity and numbers.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { clearMockStorage } from '../../setup';
import { getCollections, getLinks, initializeInbox, removeCollection, saveCollections, saveLinks } from '@/lib/storage';
import { patchCollectionState, patchLinkState } from '@/lib/storage/progress';
import { createMockCollection, createMockLink } from '../../factories';

describe('patchLinkState', () => {
  beforeEach(() => clearMockStorage());

  it('sets the fields it is given and removes the ones set to null', async () => {
    await saveLinks([createMockLink({ id: 'l1', snoozedUntil: 5 }), createMockLink({ id: 'l2' })]);

    expect(await patchLinkState('l1', { completedAt: 100, snoozedUntil: null })).toEqual({ success: true });

    const [first, second] = await getLinks();
    expect(first.completedAt).toBe(100);
    expect('snoozedUntil' in first).toBe(false);
    expect(second.completedAt).toBeUndefined();
  });

  it('reports a link that no longer exists', async () => {
    await saveLinks([]);
    expect(await patchLinkState('gone', { completedAt: 1 })).toEqual({ success: false, error: 'storage_link_not_found' });
  });
});

describe('patchCollectionState', () => {
  beforeEach(() => clearMockStorage());

  it('pins and unpins a collection as focus', async () => {
    await saveCollections([createMockCollection({ id: 'c1' })]);

    await patchCollectionState('c1', { focus: true });
    expect((await getCollections())[0].focus).toBe(true);

    await patchCollectionState('c1', { focus: null });
    expect('focus' in (await getCollections())[0]).toBe(false);
  });

  it('reports a collection that no longer exists', async () => {
    await saveCollections([]);
    expect(await patchCollectionState('gone', { reference: true })).toEqual({ success: false, error: 'storage_collection_not_found' });
  });
});

describe('completed links and deleted collections', () => {
  beforeEach(() => clearMockStorage());

  // Regression pin (spec §4): already true before this task, must stay true.
  it('a completed link of a deleted collection goes to Inbox and stays completed', async () => {
    await initializeInbox();
    await saveCollections([...(await getCollections()), createMockCollection({ id: 'c1', order: 1 })]);
    await saveLinks([createMockLink({ id: 'l1', collectionId: 'c1', completedAt: 5 })]);

    await removeCollection('c1');

    expect((await getLinks())[0]).toMatchObject({ collectionId: 'inbox', completedAt: 5 });
  });
});
```

(O teste de regressão trava um comportamento que já existe: ele falha no Step 2 só porque o arquivo não carrega sem `@/lib/storage/progress`, e passa no Step 4 sem nenhuma mudança própria.)

Em `src/test/lib/storage/import-export.test.ts`, dentro de `describe('validateExportFile', …)`, depois do teste `'accepts links with and without a position'` (acrescente `import type { Collection, Link } from '@/lib/types';` no topo se ainda não houver):

```ts
  it('rejects lifecycle fields of the wrong type', () => {
    const link = createMockLink({ id: 'link-1' });
    for (const bad of [{ completedAt: 'yesterday' }, { snoozedUntil: Number.NaN }, { keptAt: null }, { reference: 'yes' }]) {
      const file = exportFile({ links: [{ ...link, ...bad } as unknown as Link] });
      expect(() => validateExportFile(file)).toThrow('Invalid link at index 0');
    }
    const collection = createMockCollection({ id: 'c1' });
    for (const bad of [{ reference: 1 }, { focus: 'on' }]) {
      const file = exportFile({ collections: [{ ...collection, ...bad } as unknown as Collection] });
      expect(() => validateExportFile(file)).toThrow('Invalid collection at index 0');
    }
  });

  it('accepts completed, snoozed, kept and reference links and flagged collections', () => {
    const file = exportFile({
      collections: [createMockCollection({ id: 'c1', reference: true, focus: true })],
      links: [createMockLink({ id: 'l1', collectionId: 'c1', completedAt: 1, snoozedUntil: 2, keptAt: 3, reference: false })],
    });
    expect(() => validateExportFile(file)).not.toThrow();
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `docker compose run --rm app npx vitest run src/test/lib/storage/progress.test.ts src/test/lib/storage/import-export.test.ts`
Expected: FAIL — `progress.test.ts` não resolve `@/lib/storage/progress`; `import-export` falha em "rejects lifecycle fields of the wrong type" (nada é recusado).

- [ ] **Step 3: Implement**

`src/lib/storage/progress.ts`:

```ts
/**
 * Storage for the recommendation space: link and collection state (spec §4-§5).
 */
import type { Collection, Link } from '../types';
import { t } from '../i18n';
import type { OperationResult } from './core';
import { getErrorMessage, withDataLock } from './core';
import { getLinks, saveLinks, getCollections, saveCollections } from './data-access';

/** A value sets the field; null removes it; an absent key leaves it alone. */
type Patch<T> = { [K in keyof T]?: T[K] | null };

export type LinkStatePatch = Patch<Required<Pick<Link, 'completedAt' | 'snoozedUntil' | 'keptAt' | 'reference'>>>;
export type CollectionStatePatch = Patch<Required<Pick<Collection, 'reference' | 'focus'>>>;

export function applyPatch<T extends object>(target: T, patch: Record<string, unknown>): T {
  const result: Record<string, unknown> = { ...target };
  for (const [key, value] of Object.entries(patch)) {
    if (value === null) {
      delete result[key];
    } else if (value !== undefined) {
      result[key] = value;
    }
  }
  return result as T;
}

export async function patchLinkState(linkId: string, patch: LinkStatePatch): Promise<OperationResult> {
  try {
    return await withDataLock(async () => {
      const links = await getLinks();
      if (!links.some((link) => link.id === linkId)) {
        return { success: false, error: t('storage_link_not_found') };
      }
      await saveLinks(links.map((link) => (link.id === linkId ? applyPatch(link, patch) : link)));
      return { success: true };
    });
  } catch (error) {
    console.error('Failed to update link state:', error);
    return { success: false, error: getErrorMessage(error, t('error_update_link_failed')) };
  }
}

export async function patchCollectionState(collectionId: string, patch: CollectionStatePatch): Promise<OperationResult> {
  try {
    return await withDataLock(async () => {
      const collections = await getCollections();
      if (!collections.some((c) => c.id === collectionId)) {
        return { success: false, error: t('storage_collection_not_found') };
      }
      await saveCollections(collections.map((c) => (c.id === collectionId ? applyPatch(c, patch) : c)));
      return { success: true };
    });
  } catch (error) {
    console.error('Failed to update collection state:', error);
    return { success: false, error: getErrorMessage(error, t('error_update_collection_failed')) };
  }
}
```

Em `src/lib/storage/index.ts`, no fim:

```ts
// Recommendation space
export {
  applyPatch,
  patchLinkState,
  patchCollectionState,
  type LinkStatePatch,
  type CollectionStatePatch,
} from './progress';
```

Em `src/lib/storage/import-export.ts`, no laço das coleções, depois da checagem de `color`:

```ts
    for (const flag of ['reference', 'focus'] as const) {
      if (c[flag] !== undefined && typeof c[flag] !== 'boolean') {
        throw new Error(`Invalid collection at index ${i}: invalid ${flag}`);
      }
    }
```

No laço dos links, depois da checagem de `tags`:

```ts
    for (const field of ['completedAt', 'snoozedUntil', 'keptAt'] as const) {
      if (l[field] !== undefined && !Number.isFinite(l[field])) {
        throw new Error(`Invalid link at index ${i}: invalid ${field}`);
      }
    }
    if (l.reference !== undefined && typeof l.reference !== 'boolean') {
      throw new Error(`Invalid link at index ${i}: invalid reference`);
    }
```

Locales — `en`:

```json
  "error_update_link_failed": {
    "message": "Could not update the link"
  },
  "error_update_collection_failed": {
    "message": "Could not update the collection"
  }
```

`pt_BR`:

```json
  "error_update_link_failed": {
    "message": "Não foi possível atualizar o link"
  },
  "error_update_collection_failed": {
    "message": "Não foi possível atualizar a coleção"
  }
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `docker compose run --rm app npx vitest run src/test/lib/storage src/test/lib/storage.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/storage/progress.ts src/lib/storage/index.ts src/lib/storage/import-export.ts public/_locales/en/messages.json public/_locales/pt_BR/messages.json src/test/lib/storage/progress.test.ts src/test/lib/storage/import-export.test.ts
git commit -m "feat(storage): set and clear link and collection state; import validates the new fields

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 8: Storage de atividade e medição

**Files:**
- Modify: `src/lib/storage/progress.ts`
- Modify: `src/lib/storage/index.ts`
- Test: `src/test/lib/storage/progress.test.ts`

**Interfaces:**
- Consumes: `storage` (`./core`: `get`, `setBatch`, `removeBatch`), `Activity`, `LinkActivity`, `RecoStats`, `WeekStats`, `EMPTY_ACTIVITY`, `EMPTY_WEEK` (Task 2), `dayKey`, `isoWeek` (Task 2).
- Produces:
  - `type ActivityEvent = 'open' | 'complete' | 'snooze' | 'keep' | 'reference' | 'discard'`
  - `getActivity(): Promise<Activity>`, `getRecoStats(): Promise<RecoStats>`
  - `recordAction(linkId: string, event: ActivityEvent, now: number): Promise<void>`
  - `recordShown(shownIds: string[], skippedIds: string[], queueSize: number, now: number): Promise<void>`
  - `clearUsageData(): Promise<void>`
  - `MAX_DAYS = 10`, `STATS_WEEKS = 12`

- [ ] **Step 1: Write the failing tests**

Em `src/test/lib/storage/progress.test.ts`, ajuste os imports do topo para:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { chromeMock, clearMockStorage } from '../../setup';
import {
  exportData, getCollections, getLinks, initializeInbox, removeCollection, saveCollections, saveLinks,
} from '@/lib/storage';
import {
  clearUsageData, getActivity, getRecoStats, patchCollectionState, patchLinkState, recordAction, recordShown,
} from '@/lib/storage/progress';
import { isoWeek } from '@/lib/recommend/dates';
import { createMockCollection, createMockLink } from '../../factories';

const DAY = 86_400_000;
const now = new Date(2026, 8, 24, 10).getTime();
const week = isoWeek(now);
```

E acrescente no fim do arquivo:

```ts
describe('recordAction', () => {
  beforeEach(() => clearMockStorage());

  it('counts opens and remembers each day once', async () => {
    await recordAction('l1', 'open', now);
    await recordAction('l1', 'open', now + 60_000);

    expect((await getActivity()).l1).toMatchObject({ opens: 2, lastOpenedAt: now + 60_000, openDays: ['2026-09-24'] });
  });

  it('counts acting on a link the strip showed once, and clears what it showed', async () => {
    await recordShown(['l1'], [], 5, now);
    await recordAction('l1', 'open', now);
    await recordAction('l1', 'complete', now);

    expect((await getRecoStats())[week]).toMatchObject({ shown: 1, acted: 1 });
    expect((await getActivity()).l1.shownDays).toEqual([]);
  });

  it('counts snoozes, and "still worth it" starts over', async () => {
    await recordAction('l1', 'snooze', now);
    await recordAction('l1', 'snooze', now);
    expect((await getActivity()).l1.snoozes).toBe(2);
    expect((await getRecoStats())[week].snoozed).toBe(2);

    await recordAction('l1', 'keep', now);
    expect((await getActivity()).l1.snoozes).toBe(0);
  });

  it('forgets a discarded link and counts the discard', async () => {
    await recordAction('l1', 'open', now);
    await recordAction('l1', 'discard', now);

    expect((await getActivity()).l1).toBeUndefined();
    expect((await getRecoStats())[week].discarded).toBe(1);
  });
});

describe('recordShown', () => {
  beforeEach(() => clearMockStorage());

  it('records each link once per day and the queue size of the week', async () => {
    await recordShown(['l1', 'l2'], [], 7, now);
    await recordShown(['l1', 'l2'], [], 7, now + 3_600_000);

    expect((await getActivity()).l1.shownDays).toEqual(['2026-09-24']);
    expect((await getRecoStats())[week]).toMatchObject({ shown: 2, queue: 7 });
  });

  it('writes nothing when nothing changed', async () => {
    await recordShown(['l1'], [], 7, now);
    const writes = chromeMock.storage.local.set.mock.calls.length;

    await recordShown(['l1'], [], 7, now);

    expect(chromeMock.storage.local.set.mock.calls.length).toBe(writes);
  });

  it('counts a link leaving the strip only once', async () => {
    await recordShown([], ['l1'], 7, now);
    await recordShown([], ['l1'], 7, now + DAY);

    const skipped = Object.values(await getRecoStats()).reduce((total, w) => total + w.skipped, 0);
    expect(skipped).toBe(1);
  });

  it('keeps the numbers of the last 12 weeks', async () => {
    for (let i = 0; i < 14; i += 1) {
      await recordShown([`l${i}`], [], i, now + i * 7 * DAY);
    }
    expect(Object.keys(await getRecoStats())).toHaveLength(12);
  });
});

describe('clearUsageData', () => {
  beforeEach(() => clearMockStorage());

  it('removes activity and numbers, never links', async () => {
    await saveLinks([createMockLink({ id: 'l1' })]);
    await recordAction('l1', 'open', now);

    await clearUsageData();

    expect(await getActivity()).toEqual({});
    expect(await getRecoStats()).toEqual({});
    expect(await getLinks()).toHaveLength(1);
  });

  it('usage data never goes into an export', async () => {
    await recordAction('l1', 'open', now);
    expect(Object.keys(await exportData())).not.toContain('activity');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `docker compose run --rm app npx vitest run src/test/lib/storage/progress.test.ts`
Expected: FAIL — `recordAction`/`recordShown`/`getActivity` não são exportados.

- [ ] **Step 3: Implement**

Em `src/lib/storage/progress.ts`, troque os imports do topo por:

```ts
import type { Activity, Collection, Link, LinkActivity, RecoStats, WeekStats } from '../types';
import { EMPTY_ACTIVITY, EMPTY_WEEK } from '../types';
import { t } from '../i18n';
import { dayKey, isoWeek } from '../recommend/dates';
import type { OperationResult } from './core';
import { getErrorMessage, storage, withDataLock } from './core';
import { getLinks, saveLinks, getCollections, saveCollections } from './data-access';
```

E acrescente no fim:

```ts
// Activity and numbers (never exported)

export type ActivityEvent = 'open' | 'complete' | 'snooze' | 'keep' | 'reference' | 'discard';

export const MAX_DAYS = 10;
export const STATS_WEEKS = 12;

export async function getActivity(): Promise<Activity> {
  return (await storage.get<Activity>('activity')) ?? {};
}

export async function getRecoStats(): Promise<RecoStats> {
  return (await storage.get<RecoStats>('recoStats')) ?? {};
}

function addDay(days: string[], day: string): string[] {
  return days.includes(day) ? days : [...days, day].sort().slice(-MAX_DAYS);
}

/** Adds to this week's counters (queue is replaced) and keeps the last 12 weeks. */
function bump(stats: RecoStats, now: number, changes: Partial<WeekStats>): RecoStats {
  const week = isoWeek(now);
  const current: WeekStats = { ...EMPTY_WEEK, ...stats[week] };
  const next: WeekStats = {
    shown: current.shown + (changes.shown ?? 0),
    acted: current.acted + (changes.acted ?? 0),
    snoozed: current.snoozed + (changes.snoozed ?? 0),
    discarded: current.discarded + (changes.discarded ?? 0),
    skipped: current.skipped + (changes.skipped ?? 0),
    queue: changes.queue ?? current.queue,
  };
  const merged: RecoStats = { ...stats, [week]: next };
  const kept = Object.keys(merged).sort().slice(-STATS_WEEKS);
  return Object.fromEntries(kept.map((key) => [key, merged[key]]));
}

/** Any action clears what the strip showed; opens and snoozes are counted. */
function afterAction(current: LinkActivity, event: ActivityEvent, now: number): LinkActivity {
  const { skippedAt: _skippedAt, askCompleteAt, ...rest } = current;
  const updated: LinkActivity = { ...rest, shownDays: [] };
  if (askCompleteAt !== undefined && event !== 'complete') {
    updated.askCompleteAt = askCompleteAt;
  }
  if (event === 'open') {
    updated.opens = current.opens + 1;
    updated.lastOpenedAt = now;
    updated.openDays = addDay(current.openDays, dayKey(now));
  } else if (event === 'snooze') {
    updated.snoozes = current.snoozes + 1;
  } else if (event === 'keep' || event === 'complete') {
    updated.snoozes = 0;
  }
  return updated;
}

/**
 * Records what the user did with a link. Opening or completing a link the
 * strip had shown counts as acted; the action clears shownDays, so each
 * showing counts at most once.
 */
export async function recordAction(linkId: string, event: ActivityEvent, now: number): Promise<void> {
  await withDataLock(async () => {
    const [activity, stats] = await Promise.all([getActivity(), getRecoStats()]);
    const current = activity[linkId] ?? EMPTY_ACTIVITY;
    const changes: Partial<WeekStats> = {
      acted: (event === 'open' || event === 'complete') && current.shownDays.length > 0 ? 1 : 0,
      snoozed: event === 'snooze' ? 1 : 0,
      discarded: event === 'discard' ? 1 : 0,
    };
    const { [linkId]: _previous, ...others } = activity;
    const next: Activity = event === 'discard' ? others : { ...others, [linkId]: afterAction(current, event, now) };
    const counted = (changes.acted ?? 0) + (changes.snoozed ?? 0) + (changes.discarded ?? 0) > 0;
    await storage.setBatch(counted ? { activity: next, recoStats: bump(stats, now, changes) } : { activity: next });
  });
}

/**
 * Records that the strip showed these links today (once per link per day),
 * that these links left it after 3 days without action (once each), and the
 * queue size seen this week. Writes nothing when nothing changed.
 */
export async function recordShown(shownIds: string[], skippedIds: string[], queueSize: number, now: number): Promise<void> {
  await withDataLock(async () => {
    const [activity, stats] = await Promise.all([getActivity(), getRecoStats()]);
    const today = dayKey(now);
    const next: Activity = { ...activity };
    let shown = 0;
    let skipped = 0;
    for (const id of shownIds) {
      const current = next[id] ?? EMPTY_ACTIVITY;
      if (!current.shownDays.includes(today)) {
        next[id] = { ...current, shownDays: addDay(current.shownDays, today) };
        shown += 1;
      }
    }
    for (const id of skippedIds) {
      const current = next[id] ?? EMPTY_ACTIVITY;
      if (current.skippedAt === undefined) {
        next[id] = { ...current, skippedAt: now };
        skipped += 1;
      }
    }
    const queueChanged = stats[isoWeek(now)]?.queue !== queueSize;
    if (shown === 0 && skipped === 0 && !queueChanged) {
      return;
    }
    const recoStats = bump(stats, now, { shown, skipped, queue: queueSize });
    await storage.setBatch(shown > 0 || skipped > 0 ? { activity: next, recoStats } : { recoStats });
  });
}

/** Removes what the user did and the numbers; links stay. */
export async function clearUsageData(): Promise<void> {
  await withDataLock(() => storage.removeBatch(['activity', 'recoStats']));
}
```

Em `src/lib/storage/index.ts`, no bloco `// Recommendation space`, acrescente à lista:

```ts
  getActivity,
  getRecoStats,
  recordAction,
  recordShown,
  clearUsageData,
  type ActivityEvent,
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `docker compose run --rm app npx vitest run src/test/lib/storage/progress.test.ts`
Expected: PASS.

- [ ] **Step 5: Type-check and commit**

Run: `docker compose run --rm app sh -c "npx tsc --noEmit 2>&1 | grep -E 'src/lib/storage/'"`
Expected: nenhuma linha.

```bash
git add src/lib/storage/progress.ts src/lib/storage/index.ts src/test/lib/storage/progress.test.ts
git commit -m "feat(storage): record opens, snoozes, discards and what the strip showed, per week

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 9: Stores e ações de progresso

**Files:**
- Modify: `src/lib/stores/links.ts` (`patchLinkState`, `patchCollectionState`, `linksByCollection` sem concluídos)
- Create: `src/lib/stores/activity.ts`, `src/lib/stores/progress.ts`
- Modify: `src/test/mocks/storage.ts`
- Test: `src/test/stores/progress.test.ts`

**Interfaces:**
- Consumes: `patchLinkState`, `patchCollectionState`, `applyPatch`, `LinkStatePatch`, `CollectionStatePatch` (Task 7), `getActivity`, `getRecoStats`, `recordAction`, `recordShown`, `clearUsageData`, `ActivityEvent` (Task 8).
- Produces:
  - `linksStore.patchLinkState(linkId, patch): Promise<void>`, `linksStore.patchCollectionState(collectionId, patch): Promise<void>` (otimistas, com rollback)
  - `linksByCollection` deixa de fora os links com `completedAt`
  - `activityStore`: `{ subscribe, set, load(): Promise<void>, record(linkId, event, now?): Promise<void>, recordShown(shownIds, skippedIds, queueSize, now): Promise<void>, clear(): Promise<void> }` com estado `{ activity: Activity; stats: RecoStats; loading: boolean }`
  - `src/lib/stores/progress.ts`: `completeLink(link, now?)`, `restoreLink(link)`, `snoozeLink(link, until, now?)`, `keepLink(link, now?)`, `setLinkReference(link, value: boolean | null, now?)`, `discardLink(link, now?)`, `recordOpen(link, now?)`, `setCollectionReference(collection, value: boolean)`, `setCollectionFocus(collection, value: boolean)` — todas `Promise<void>`; `now` padrão `Date.now()`.

- [ ] **Step 1: Write the failing test**

Em `src/test/mocks/storage.ts`, dentro do objeto devolvido, antes de `getErrorMessage`:

```ts
    patchLinkState: vi.fn(() => Promise.resolve({ success: true })),
    patchCollectionState: vi.fn(() => Promise.resolve({ success: true })),
    getActivity: vi.fn(() => Promise.resolve({})),
    getRecoStats: vi.fn(() => Promise.resolve({})),
    recordAction: vi.fn(() => Promise.resolve()),
    recordShown: vi.fn(() => Promise.resolve()),
    clearUsageData: vi.fn(() => Promise.resolve()),
```

`src/test/stores/progress.test.ts`:

```ts
/**
 * Progress actions: what the buttons do to the stores and to storage.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import * as storage from '@/lib/storage';
import { linksStore, linksByCollection } from '@/lib/stores/links';
import { activityStore } from '@/lib/stores/activity';
import {
  completeLink, discardLink, keepLink, recordOpen, restoreLink, setCollectionFocus,
  setCollectionReference, setLinkReference, snoozeLink,
} from '@/lib/stores/progress';
import type { Link } from '@/lib/types';
import { EMPTY_ACTIVITY } from '@/lib/types';
import { createMockCollection, createMockLink } from '../factories';
const { createStorageMock } = await vi.hoisted(() => import('../mocks/storage'));

vi.mock('@/lib/storage', () => createStorageMock());

const collection = createMockCollection({ id: 'c1' });
const link = createMockLink({ id: 'l1', collectionId: 'c1' });

function seed(links: Link[] = [link]): void {
  linksStore.set({
    links,
    collections: [collection],
    loading: false,
    error: null,
    isAdding: false,
    isRemoving: new Set(),
    pendingLocalUpdate: false,
  });
}

describe('progress actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    seed();
  });

  it('completing takes the link off the board and records the action', async () => {
    await completeLink(link, 1000);

    expect(storage.patchLinkState).toHaveBeenCalledWith('l1', { completedAt: 1000, snoozedUntil: null });
    expect(storage.recordAction).toHaveBeenCalledWith('l1', 'complete', 1000);
    expect(get(linksStore).links[0].completedAt).toBe(1000);
    expect(get(linksByCollection).get('c1')).toEqual([]);
  });

  it('undoing puts the link back in its column', async () => {
    seed([{ ...link, completedAt: 1000 }]);

    await restoreLink({ ...link, completedAt: 1000 });

    expect(storage.patchLinkState).toHaveBeenCalledWith('l1', { completedAt: null });
    expect(get(linksByCollection).get('c1')?.map((l) => l.id)).toEqual(['l1']);
  });

  it('snoozing saves the day it comes back and counts the snooze', async () => {
    await snoozeLink(link, 5000, 1000);

    expect(storage.patchLinkState).toHaveBeenCalledWith('l1', { snoozedUntil: 5000 });
    expect(storage.recordAction).toHaveBeenCalledWith('l1', 'snooze', 1000);
  });

  it('"still worth it" saves when it was answered', async () => {
    await keepLink(link, 1000);

    expect(storage.patchLinkState).toHaveBeenCalledWith('l1', { keptAt: 1000 });
    expect(storage.recordAction).toHaveBeenCalledWith('l1', 'keep', 1000);
  });

  it('marks and unmarks a link as reference', async () => {
    await setLinkReference(link, true, 1000);
    await setLinkReference(link, null, 1000);

    expect(vi.mocked(storage.patchLinkState).mock.calls.map((call) => call[1])).toEqual([{ reference: true }, { reference: null }]);
  });

  it('discarding deletes the link and records the discard', async () => {
    await discardLink(link, 1000);

    expect(storage.removeLink).toHaveBeenCalledWith('l1');
    expect(storage.recordAction).toHaveBeenCalledWith('l1', 'discard', 1000);
  });

  it('opening records the open', async () => {
    await recordOpen(link, 1000);
    expect(storage.recordAction).toHaveBeenCalledWith('l1', 'open', 1000);
  });

  it('collection flags are present or absent, never false', async () => {
    await setCollectionFocus(collection, true);
    await setCollectionReference(collection, false);

    expect(vi.mocked(storage.patchCollectionState).mock.calls).toEqual([['c1', { focus: true }], ['c1', { reference: null }]]);
    expect(get(linksStore).collections[0].focus).toBe(true);
  });

  it('keeps the link as it was when saving fails', async () => {
    vi.mocked(storage.patchLinkState).mockResolvedValueOnce({ success: false, error: 'falhou' });

    await completeLink(link, 1000);

    expect(get(linksStore).links[0].completedAt).toBeUndefined();
    expect(get(linksStore).error).toBe('falhou');
  });
});

describe('activityStore', () => {
  beforeEach(() => vi.clearAllMocks());

  it('reads activity and numbers again after recording', async () => {
    vi.mocked(storage.getActivity).mockResolvedValue({ l1: { ...EMPTY_ACTIVITY, opens: 1 } });

    await activityStore.record('l1', 'open', 1000);

    expect(get(activityStore)).toMatchObject({ loading: false, activity: { l1: { opens: 1 } } });
  });

  it('clearing asks storage to remove usage data', async () => {
    await activityStore.clear();
    expect(storage.clearUsageData).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `docker compose run --rm app npx vitest run src/test/stores/progress.test.ts`
Expected: FAIL — não resolve `@/lib/stores/activity` / `@/lib/stores/progress`.

- [ ] **Step 3: Implement**

Em `src/lib/stores/links.ts`:

1. Nos imports de `@/lib/storage`, acrescente `applyPatch`, `patchLinkState as storagePatchLinkState`, `patchCollectionState as storagePatchCollectionState`, `type LinkStatePatch`, `type CollectionStatePatch`.
2. No tipo devolvido por `createLinksStore`, acrescente:

```ts
  patchLinkState: (linkId: string, patch: LinkStatePatch) => Promise<void>;
  patchCollectionState: (collectionId: string, patch: CollectionStatePatch) => Promise<void>;
```

3. Depois de `reorderLinks`:

```ts
  async function patchLinkState(linkId: string, patch: LinkStatePatch): Promise<void> {
    await optimisticUpdate(
      store,
      (state) => ({
        updated: { ...state, links: state.links.map((link) => (link.id === linkId ? applyPatch(link, patch) : link)) },
        rollback: { links: state.links } as Partial<LinksState>,
      }),
      async () => {
        const result = await storagePatchLinkState(linkId, patch);
        return result.success ? null : (result.error ?? t('error_update_link_failed'));
      },
      t('error_update_link_failed')
    );
  }

  async function patchCollectionState(collectionId: string, patch: CollectionStatePatch): Promise<void> {
    await optimisticUpdate(
      store,
      (state) => ({
        updated: {
          ...state,
          collections: state.collections.map((c) => (c.id === collectionId ? applyPatch(c, patch) : c)),
        },
        rollback: { collections: state.collections } as Partial<LinksState>,
      }),
      async () => {
        const result = await storagePatchCollectionState(collectionId, patch);
        return result.success ? null : (result.error ?? t('error_update_collection_failed'));
      },
      t('error_update_collection_failed')
    );
  }
```

4. No `return` do store, acrescente `patchLinkState,` e `patchCollectionState,`.
5. Em `linksByCollection`, no começo do `for (const link of $store.links)`:

```ts
    if (link.completedAt !== undefined) {
      continue; // completed links leave the board (Focus › Completed lists them)
    }
```

`src/lib/stores/activity.ts`:

```ts
/**
 * What the user did with links (activity) and the weekly numbers (recoStats).
 * Storage is the source of truth: every write reads both back.
 */
import { writable, type Writable } from 'svelte/store';
import type { Activity, RecoStats } from '@/lib/types';
import {
  clearUsageData, getActivity, getRecoStats, recordAction, recordShown, storage, type ActivityEvent,
} from '@/lib/storage';

interface ActivityState {
  activity: Activity;
  stats: RecoStats;
  loading: boolean;
}

function createActivityStore(): {
  subscribe: Writable<ActivityState>['subscribe'];
  set: (state: ActivityState) => void;
  load: () => Promise<void>;
  record: (linkId: string, event: ActivityEvent, now?: number) => Promise<void>;
  recordShown: (shownIds: string[], skippedIds: string[], queueSize: number, now: number) => Promise<void>;
  clear: () => Promise<void>;
} {
  const { subscribe, set, update } = writable<ActivityState>({ activity: {}, stats: {}, loading: true });

  storage.watch((changes) => {
    if (changes.activity === undefined && changes.recoStats === undefined) {
      return;
    }
    update((state) => ({
      ...state,
      activity: changes.activity === undefined ? state.activity : ((changes.activity.newValue as Activity | undefined) ?? {}),
      stats: changes.recoStats === undefined ? state.stats : ((changes.recoStats.newValue as RecoStats | undefined) ?? {}),
    }));
  });

  async function load(): Promise<void> {
    const [activity, stats] = await Promise.all([getActivity(), getRecoStats()]);
    set({ activity, stats, loading: false });
  }

  return {
    subscribe,
    set,
    load,
    async record(linkId: string, event: ActivityEvent, now = Date.now()): Promise<void> {
      await recordAction(linkId, event, now);
      await load();
    },
    async recordShown(shownIds: string[], skippedIds: string[], queueSize: number, now: number): Promise<void> {
      await recordShown(shownIds, skippedIds, queueSize, now);
      await load();
    },
    async clear(): Promise<void> {
      await clearUsageData();
      await load();
    },
  };
}

export const activityStore = createActivityStore();
```

`src/lib/stores/progress.ts`:

```ts
/**
 * What the progress buttons do (complete, snooze, keep, reference, discard,
 * open): change the link through linksStore and record the action.
 * Shared by the dashboard and the popup.
 */
import type { Collection, Link } from '@/lib/types';
import { linksStore } from './links';
import { activityStore } from './activity';

export async function completeLink(link: Link, now = Date.now()): Promise<void> {
  await linksStore.patchLinkState(link.id, { completedAt: now, snoozedUntil: null });
  await activityStore.record(link.id, 'complete', now);
}

export async function restoreLink(link: Link): Promise<void> {
  await linksStore.patchLinkState(link.id, { completedAt: null });
}

export async function snoozeLink(link: Link, until: number, now = Date.now()): Promise<void> {
  await linksStore.patchLinkState(link.id, { snoozedUntil: until });
  await activityStore.record(link.id, 'snooze', now);
}

export async function keepLink(link: Link, now = Date.now()): Promise<void> {
  await linksStore.patchLinkState(link.id, { keptAt: now });
  await activityStore.record(link.id, 'keep', now);
}

/** true: reference; false: pending inside a reference collection; null: follow the collection. */
export async function setLinkReference(link: Link, value: boolean | null, now = Date.now()): Promise<void> {
  await linksStore.patchLinkState(link.id, { reference: value });
  await activityStore.record(link.id, 'reference', now);
}

export async function discardLink(link: Link, now = Date.now()): Promise<void> {
  await linksStore.removeLink(link.id);
  await activityStore.record(link.id, 'discard', now);
}

export async function recordOpen(link: Link, now = Date.now()): Promise<void> {
  await activityStore.record(link.id, 'open', now);
}

export async function setCollectionReference(collection: Collection, value: boolean): Promise<void> {
  await linksStore.patchCollectionState(collection.id, { reference: value ? true : null });
}

export async function setCollectionFocus(collection: Collection, value: boolean): Promise<void> {
  await linksStore.patchCollectionState(collection.id, { focus: value ? true : null });
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `docker compose run --rm app npx vitest run src/test/stores src/test/integration`
Expected: PASS.

- [ ] **Step 5: Type-check and commit**

Run: `docker compose run --rm app sh -c "npx tsc --noEmit 2>&1 | grep -E 'src/lib/stores/'"`
Expected: nenhuma linha.

```bash
git add src/lib/stores/links.ts src/lib/stores/activity.ts src/lib/stores/progress.ts src/test/mocks/storage.ts src/test/stores/progress.test.ts
git commit -m "feat(stores): progress actions; completed links leave the board

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 10: Quadro — concluir, adiar e referência no card e na coluna

**Files:**
- Modify: `src/newtab/components/LinkCard.svelte`
- Modify: `src/newtab/components/Column.svelte`
- Modify: `src/newtab/components/KanbanBoard.svelte`
- Modify: `src/newtab/App.svelte` (StatusBar sem concluídos)
- Modify: `public/_locales/en/messages.json`, `public/_locales/pt_BR/messages.json`
- Test: `src/test/components/LinkCard.test.ts`, `src/test/components/Column.test.ts`, `src/test/components/KanbanBoard.test.ts` (novo)

**Interfaces:**
- Consumes: `isReference`, `isSnoozed` (Task 2), `tomorrow`, `nextMonday`, `shortDate` (Task 2), `completeLink`, `snoozeLink`, `setLinkReference`, `recordOpen`, `setCollectionFocus`, `setCollectionReference` (Task 9).
- Produces:
  - `LinkCard` props novas `reference = false`, `collectionReference = false`; eventos novos `complete: Link`, `snooze: { link: Link; until: number }`, `reference: { link: Link; value: boolean | null }`.
  - `Column` eventos novos `completeLink: Link`, `snoozeLink: { link; until }`, `linkReference: { link; value }`, `collectionFocus: { collection: Collection; value: boolean }`, `collectionReference: { collection: Collection; value: boolean }`.
  - chaves i18n `progress_complete`, `progress_more`, `progress_snooze_tomorrow`, `progress_snooze_next_week`, `progress_mark_reference`, `progress_unmark_reference`, `linkcard_complete_title`, `linkcard_reference_badge`, `linkcard_snoozed_until`, `column_pin_focus`, `column_unpin_focus`, `column_mark_reference`, `column_unmark_reference`, `success_link_completed`, `success_link_snoozed`, `success_link_reference`.

- [ ] **Step 1: Write the failing tests**

Em `src/test/components/LinkCard.test.ts`, acrescente no fim do `describe` principal:

```ts
  describe('progress', () => {
    const link = createMockLink({ id: 'l1', title: 'Paper', url: 'https://example.com/p', collectionId: 'c1' });

    it('completes without opening the link', async () => {
      const complete = vi.fn();
      const open = vi.fn();
      render(LinkCard, { props: { link }, events: { complete, open } });

      await fireEvent.click(screen.getByRole('button', { name: 'progress_complete' }));

      expect(complete.mock.calls[0][0].detail).toEqual(link);
      expect(open).not.toHaveBeenCalled();
    });

    it('Enter on an action button does not open the link', async () => {
      const open = vi.fn();
      render(LinkCard, { props: { link }, events: { open } });

      await fireEvent.keyDown(screen.getByRole('button', { name: 'progress_complete' }), { key: 'Enter' });

      expect(open).not.toHaveBeenCalled();
    });

    it('snoozes until next week from the menu', async () => {
      vi.useFakeTimers({ toFake: ['Date'] });
      vi.setSystemTime(new Date(2026, 8, 24, 10));
      const snooze = vi.fn();
      render(LinkCard, { props: { link }, events: { snooze } });

      await fireEvent.click(screen.getByRole('button', { name: 'progress_more' }));
      await fireEvent.click(screen.getByRole('menuitem', { name: 'progress_snooze_next_week' }));
      vi.useRealTimers();

      expect(snooze.mock.calls[0][0].detail).toEqual({ link, until: new Date(2026, 8, 28).getTime() });
    });

    it('marks a link as reference', async () => {
      const reference = vi.fn();
      render(LinkCard, { props: { link }, events: { reference } });

      await fireEvent.click(screen.getByRole('button', { name: 'progress_more' }));
      await fireEvent.click(screen.getByRole('menuitem', { name: 'progress_mark_reference' }));

      expect(reference.mock.calls[0][0].detail).toEqual({ link, value: true });
    });

    it('unmarking inside a reference collection keeps it pending there', async () => {
      const reference = vi.fn();
      render(LinkCard, { props: { link, reference: true, collectionReference: true }, events: { reference } });

      await fireEvent.click(screen.getByRole('button', { name: 'progress_more' }));
      await fireEvent.click(screen.getByRole('menuitem', { name: 'progress_unmark_reference' }));

      expect(reference.mock.calls[0][0].detail).toEqual({ link, value: false });
    });

    it('shows when a link is a reference or snoozed', () => {
      const snoozed = { ...link, snoozedUntil: Date.now() + 2 * 86_400_000 };
      render(LinkCard, { props: { link: snoozed, reference: true } });

      expect(screen.getByText('linkcard_reference_badge')).toBeInTheDocument();
      expect(screen.getByText('linkcard_snoozed_until')).toBeInTheDocument();
    });
  });
```

Em `src/test/components/Column.test.ts`, acrescente no fim do `describe`:

```ts
  it('forwards completing a card', async () => {
    const completeLink = vi.fn();
    render(Column, { props: { collection: workCollection, links: mockLinks }, events: { completeLink } });

    await fireEvent.click(screen.getAllByRole('button', { name: 'progress_complete' })[0]);

    expect(completeLink.mock.calls[0][0].detail.id).toBe('link-1');
  });

  it('pins the collection as focus and marks it as reference from its menu', async () => {
    const collectionFocus = vi.fn();
    const collectionReference = vi.fn();
    render(Column, {
      props: { collection: workCollection, links: mockLinks },
      events: { collectionFocus, collectionReference },
    });

    await fireEvent.click(screen.getByRole('button', { name: 'column_menu' }));
    await fireEvent.click(screen.getByRole('button', { name: /column_pin_focus/ }));
    await fireEvent.click(screen.getByRole('button', { name: 'column_menu' }));
    await fireEvent.click(screen.getByRole('button', { name: /column_mark_reference/ }));

    expect(collectionFocus.mock.calls[0][0].detail).toEqual({ collection: workCollection, value: true });
    expect(collectionReference.mock.calls[0][0].detail).toEqual({ collection: workCollection, value: true });
  });

  it('marks the cards of a reference collection', () => {
    render(Column, { props: { collection: { ...workCollection, reference: true }, links: mockLinks } });
    expect(screen.getAllByText('linkcard_reference_badge')).toHaveLength(2);
  });
```

`src/test/components/KanbanBoard.test.ts`:

```ts
/**
 * KanbanBoard: progress actions from the cards reach the stores.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import KanbanBoard from '@/newtab/components/KanbanBoard.svelte';
import * as progress from '@/lib/stores/progress';
import { createMockCollection, createMockLink } from '../factories';
const { createStorageMock } = await vi.hoisted(() => import('../mocks/storage'));

vi.mock('@/lib/storage', () => createStorageMock());
vi.mock('svelte-dnd-action', () => ({
  dndzone: () => ({ destroy: () => {} }),
  SOURCES: { POINTER: 'pointer' },
  TRIGGERS: { DROPPED_INTO_ZONE: 'droppedIntoZone' },
}));
vi.mock('@/lib/stores/progress', () => ({
  completeLink: vi.fn(() => Promise.resolve()),
  snoozeLink: vi.fn(() => Promise.resolve()),
  setLinkReference: vi.fn(() => Promise.resolve()),
  recordOpen: vi.fn(() => Promise.resolve()),
  setCollectionFocus: vi.fn(() => Promise.resolve()),
  setCollectionReference: vi.fn(() => Promise.resolve()),
}));

const work = createMockCollection({ id: 'work', name: 'Work', order: 1 });
const link = createMockLink({ id: 'l1', title: 'Paper', url: 'https://example.com/p', collectionId: 'work' });

function renderBoard(events: Record<string, ReturnType<typeof vi.fn>> = {}): void {
  render(KanbanBoard, { props: { collections: [work], linksByCollection: new Map([['work', [link]]]) }, events });
}

describe('KanbanBoard', () => {
  beforeEach(() => vi.clearAllMocks());

  it('completes a link and says so', async () => {
    const success = vi.fn();
    renderBoard({ success });

    await fireEvent.click(screen.getByRole('button', { name: 'progress_complete' }));

    await waitFor(() => expect(success).toHaveBeenCalledTimes(1));
    expect(progress.completeLink).toHaveBeenCalledWith(link);
    expect(success.mock.calls[0][0].detail).toBe('success_link_completed');
  });

  it('records the open when a card is opened', async () => {
    renderBoard();

    await fireEvent.click(screen.getByText('Paper'));

    await waitFor(() => expect(progress.recordOpen).toHaveBeenCalledWith(link));
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `docker compose run --rm app npx vitest run src/test/components/LinkCard.test.ts src/test/components/Column.test.ts src/test/components/KanbanBoard.test.ts`
Expected: FAIL — não há botão `progress_complete`, nem itens de menu novos.

- [ ] **Step 3: Implement**

**`src/newtab/components/LinkCard.svelte`** — script:

```ts
  import { createEventDispatcher } from 'svelte';
  import { t } from '@lib/i18n';
  import type { Link } from '@/lib/types';
  import { extractDomain } from '@/lib/tabs';
  import { isSnoozed } from '@/lib/recommend/state';
  import { nextMonday, shortDate, tomorrow } from '@/lib/recommend/dates';

  export let link: Link;
  /** Counts as reference, by itself or through its collection. */
  export let reference = false;
  /** Its collection is a reference collection: unmarking then means `reference: false`. */
  export let collectionReference = false;

  const dispatch = createEventDispatcher<{
    open: Link;
    openInNewTab: Link;
    remove: { id: string; title: string };
    complete: Link;
    snooze: { link: Link; until: number };
    reference: { link: Link; value: boolean | null };
  }>();

  let showMenu = false;
  let menuRef: HTMLDivElement;
```

Mantenha `handleOpen`, `handleOpenInNewTab`, `handleRemove`. Troque `handleKeydown` e acrescente as funções novas:

```ts
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

  function handleWindowClick(event: MouseEvent): void {
    if (showMenu && menuRef !== undefined && !menuRef.contains(event.target as Node)) {
      showMenu = false;
    }
  }

  $: domain = extractDomain(link.url).replace('www.', '');
  $: snoozedUntil = isSnoozed(link, Date.now()) ? link.snoozedUntil : undefined;
```

Markup: acrescente `<svelte:window on:click={handleWindowClick} />` antes do `<div class="link-card"…>`. Dentro de `.link-content`, depois de `.link-domain`:

```svelte
    {#if reference || snoozedUntil !== undefined}
      <span class="link-state">
        {#if reference}
          <span class="state-badge">{t('linkcard_reference_badge')}</span>
        {/if}
        {#if snoozedUntil !== undefined}
          <span class="state-badge">{t('linkcard_snoozed_until', shortDate(snoozedUntil))}</span>
        {/if}
      </span>
    {/if}
```

Em `.link-actions`, antes do botão `btn-open`:

```svelte
    <button
      type="button"
      class="btn-action btn-complete"
      on:click={handleComplete}
      aria-label={t('progress_complete')}
      title={t('linkcard_complete_title')}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="20 6 9 17 4 12"/>
      </svg>
    </button>
```

Entre `btn-open` e `btn-remove`:

```svelte
    <div class="card-menu" bind:this={menuRef}>
      <button
        type="button"
        class="btn-action btn-more"
        on:click={toggleMenu}
        aria-label={t('progress_more')}
        aria-expanded={showMenu}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>
        </svg>
      </button>
      {#if showMenu}
        <div class="card-menu-dropdown" role="menu">
          <button type="button" role="menuitem" on:click|stopPropagation={() => snooze(tomorrow(Date.now()))}>
            {t('progress_snooze_tomorrow')}
          </button>
          <button type="button" role="menuitem" on:click|stopPropagation={() => snooze(nextMonday(Date.now()))}>
            {t('progress_snooze_next_week')}
          </button>
          <button type="button" role="menuitem" on:click|stopPropagation={toggleReference}>
            {reference ? t('progress_unmark_reference') : t('progress_mark_reference')}
          </button>
        </div>
      {/if}
    </div>
```

Estilos, no fim do `<style>`:

```css
  .link-state {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-1);
    margin-top: var(--space-1);
  }

  .state-badge {
    font-size: var(--text-xs);
    color: var(--text-tertiary);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-sm);
    padding: 0 var(--space-1);
  }

  .btn-complete:hover {
    background: var(--accent-soft);
    color: var(--accent-primary);
  }

  .card-menu {
    position: relative;
  }

  .card-menu-dropdown {
    position: absolute;
    top: 100%;
    right: 0;
    z-index: 20;
    display: flex;
    flex-direction: column;
    min-width: 220px;
    padding: var(--space-1);
    background: var(--surface-elevated);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-md);
  }

  .card-menu-dropdown button {
    padding: var(--space-2) var(--space-3);
    border: none;
    background: transparent;
    color: var(--text-primary);
    font-family: var(--font-body);
    font-size: var(--text-sm);
    text-align: left;
    border-radius: var(--radius-sm);
    cursor: pointer;
  }

  .card-menu-dropdown button:hover,
  .card-menu-dropdown button:focus-visible {
    background: var(--surface-overlay);
  }
```

**`src/newtab/components/Column.svelte`**:

1. Imports: acrescente `import { isReference } from '@/lib/recommend/state';`.
2. No `createEventDispatcher`, acrescente:

```ts
    completeLink: Link;
    snoozeLink: { link: Link; until: number };
    linkReference: { link: Link; value: boolean | null };
    collectionFocus: { collection: Collection; value: boolean };
    collectionReference: { collection: Collection; value: boolean };
```

3. Depois de `handleDeleteCollection`:

```ts
  function handleToggleFocus(): void {
    closeMenu();
    dispatch('collectionFocus', { collection, value: collection.focus !== true });
  }

  function handleToggleReference(): void {
    closeMenu();
    dispatch('collectionReference', { collection, value: collection.reference !== true });
  }
```

4. No menu (`.menu-dropdown`), antes do botão de excluir:

```svelte
              <button type="button" class="menu-item" on:click={handleToggleFocus}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>
                </svg>
                {collection.focus === true ? t('column_unpin_focus') : t('column_pin_focus')}
              </button>
              <button type="button" class="menu-item" on:click={handleToggleReference}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
                </svg>
                {collection.reference === true ? t('column_unmark_reference') : t('column_mark_reference')}
              </button>
```

5. No `<LinkCard …>`:

```svelte
          <LinkCard
            {link}
            reference={isReference(link, collection)}
            collectionReference={collection.reference === true}
            on:open={(e) => dispatch('openLink', e.detail)}
            on:openInNewTab={(e) => dispatch('openLinkInNewTab', e.detail)}
            on:remove={(e) => dispatch('removeLink', e.detail)}
            on:complete={(e) => dispatch('completeLink', e.detail)}
            on:snooze={(e) => dispatch('snoozeLink', e.detail)}
            on:reference={(e) => dispatch('linkReference', e.detail)}
          />
```

**`src/newtab/components/KanbanBoard.svelte`**:

1. Imports: acrescente

```ts
  import {
    completeLink, recordOpen, setCollectionFocus, setCollectionReference, setLinkReference, snoozeLink,
  } from '@/lib/stores/progress';
```

2. Em `handleOpenLink` e `handleOpenLinkInNewTab`, logo depois de `const link = event.detail;`:

```ts
    await recordOpen(link);
```

3. Depois de `handleOpenLinkInNewTab`:

```ts
  async function handleCompleteLink(event: CustomEvent<Link>): Promise<void> {
    await completeLink(event.detail);
    dispatch('success', t('success_link_completed'));
  }

  async function handleSnoozeLink(event: CustomEvent<{ link: Link; until: number }>): Promise<void> {
    await snoozeLink(event.detail.link, event.detail.until);
    dispatch('success', t('success_link_snoozed'));
  }

  async function handleLinkReference(event: CustomEvent<{ link: Link; value: boolean | null }>): Promise<void> {
    await setLinkReference(event.detail.link, event.detail.value);
    if (event.detail.value === true) {
      dispatch('success', t('success_link_reference'));
    }
  }

  async function handleCollectionFocus(event: CustomEvent<{ collection: Collection; value: boolean }>): Promise<void> {
    await setCollectionFocus(event.detail.collection, event.detail.value);
  }

  async function handleCollectionReference(event: CustomEvent<{ collection: Collection; value: boolean }>): Promise<void> {
    await setCollectionReference(event.detail.collection, event.detail.value);
  }
```

4. No `<Column …>`, acrescente:

```svelte
          on:completeLink={handleCompleteLink}
          on:snoozeLink={handleSnoozeLink}
          on:linkReference={handleLinkReference}
          on:collectionFocus={handleCollectionFocus}
          on:collectionReference={handleCollectionReference}
```

**`src/newtab/App.svelte`** — a contagem da barra de status ignora concluídos. Depois de `$: links = $linksStore.links;`:

```ts
  $: boardLinks = links.filter((link) => link.completedAt === undefined);
```

E troque `<StatusBar {links} …>` por `<StatusBar links={boardLinks} {collections} workspace={currentWorkspace} />`.

Locales — `en`:

```json
  "progress_complete": { "message": "Complete" },
  "progress_more": { "message": "More actions" },
  "progress_snooze_tomorrow": { "message": "Snooze until tomorrow" },
  "progress_snooze_next_week": { "message": "Snooze until next week" },
  "progress_mark_reference": { "message": "Mark as reference" },
  "progress_unmark_reference": { "message": "Not a reference" },
  "linkcard_complete_title": { "message": "Complete: leaves the board and stays in Focus › Completed" },
  "linkcard_reference_badge": { "message": "Reference" },
  "linkcard_snoozed_until": {
    "message": "Until $1",
    "placeholders": { "date": { "content": "$1" } }
  },
  "column_pin_focus": { "message": "Pin as focus" },
  "column_unpin_focus": { "message": "Unpin focus" },
  "column_mark_reference": { "message": "Mark collection as reference" },
  "column_unmark_reference": { "message": "Unmark reference collection" },
  "success_link_completed": { "message": "Completed" },
  "success_link_snoozed": { "message": "Snoozed" },
  "success_link_reference": { "message": "Marked as reference" }
```

`pt_BR`:

```json
  "progress_complete": { "message": "Concluir" },
  "progress_more": { "message": "Mais ações" },
  "progress_snooze_tomorrow": { "message": "Adiar para amanhã" },
  "progress_snooze_next_week": { "message": "Adiar para a próxima semana" },
  "progress_mark_reference": { "message": "Marcar como referência" },
  "progress_unmark_reference": { "message": "Não é referência" },
  "linkcard_complete_title": { "message": "Concluir: sai do quadro e fica em Foco › Concluídos" },
  "linkcard_reference_badge": { "message": "Referência" },
  "linkcard_snoozed_until": {
    "message": "Até $1",
    "placeholders": { "date": { "content": "$1" } }
  },
  "column_pin_focus": { "message": "Fixar como foco" },
  "column_unpin_focus": { "message": "Desafixar foco" },
  "column_mark_reference": { "message": "Marcar coleção como referência" },
  "column_unmark_reference": { "message": "Desmarcar coleção de referência" },
  "success_link_completed": { "message": "Concluído" },
  "success_link_snoozed": { "message": "Adiado" },
  "success_link_reference": { "message": "Marcado como referência" }
```

(Formate cada entrada no estilo multilinha do arquivo.)

- [ ] **Step 4: Run tests to verify they pass**

Run: `docker compose run --rm app npx vitest run src/test/components`
Expected: PASS.

- [ ] **Step 5: Lint and commit**

Run: `docker compose run --rm app npx eslint src/newtab/components/LinkCard.svelte src/newtab/components/Column.svelte src/newtab/components/KanbanBoard.svelte src/newtab/App.svelte`
Expected: nenhum erro novo; os erros antigos de a11y/svelte-ignore do `Column.svelte` continuam os mesmos (a referência é o total de `make lint` no `main`: 12 erros).

```bash
git add src/newtab/components/LinkCard.svelte src/newtab/components/Column.svelte src/newtab/components/KanbanBoard.svelte src/newtab/App.svelte public/_locales/en/messages.json public/_locales/pt_BR/messages.json src/test/components/LinkCard.test.ts src/test/components/Column.test.ts src/test/components/KanbanBoard.test.ts
git commit -m "feat(board): complete, snooze and mark reference from the card; focus and reference from the column

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 11: Faixa Próximos passos

**Files:**
- Modify: `src/lib/types.ts` (`Settings.showNextUp`, `Settings.nextUpCollapsed`)
- Modify: `src/lib/stores/settings.ts`
- Create: `src/newtab/next-up-labels.ts`, `src/newtab/components/NextUpCard.svelte`, `src/newtab/components/NextUpStrip.svelte`
- Modify: `src/newtab/App.svelte`
- Modify: `public/_locales/en/messages.json`, `public/_locales/pt_BR/messages.json`
- Modify (literais de `Settings`): `src/test/stores/settings.test.ts:53-58`, `src/test/lib/storage.test.ts:321-335`
- Test: `src/test/newtab/next-up-labels.test.ts`, `src/test/components/NextUpCard.test.ts`, `src/test/components/NextUpStrip.test.ts`, `src/test/stores/settings.test.ts`

**Interfaces:**
- Consumes: `buildQueue`, `Queue`, `Recommendation`, `Reason`, `SlotRole` (Task 4), `LinkAction` (Task 2), `TriageReason` (Task 3), `tomorrow`, `nextMonday`, `dayKey` (Task 2), `activityStore` e ações de `src/lib/stores/progress.ts` (Task 9).
- Produces:
  - `Settings.showNextUp: boolean` (padrão `true`), `Settings.nextUpCollapsed: boolean` (padrão `false`); `settingsStore.setShowNextUp(enabled)`, `settingsStore.setNextUpCollapsed(collapsed)`.
  - `next-up-labels.ts`: `ROLE_KEYS: Record<SlotRole, string>`, `ACTION_KEYS: Record<LinkAction, string>`, `TRIAGE_KEYS: Record<TriageReason, string>`, `reasonText(reason: Reason): string`, `effortText(minutes: number): string`, `collectionPath(collection: Collection, workspaces: Workspace[]): string`.
  - `NextUpCard` props `rec: Recommendation`, `path: string`; eventos `open: { link: Link; newTab: boolean }`, `complete: Link`, `snooze: { link: Link; until: number }`, `reference: Link`, `discard: Link`, `reveal: Link`.
  - `NextUpStrip` props `queue: Queue`, `workspaces: Workspace[]`, `collapsed: boolean`; repassa os eventos do card e emite `toggleCollapsed`, `openTriage`, `openFocus`.
  - No `App.svelte`: `now`, `queue`, `openLink(link, newTab)`, `revealOnBoard(link)`, `handleOpen`, `handleComplete`, `handleSnooze`, `handleMarkReference`, `handleDiscard`, `handleReveal` (as Tasks 12–13 reusam).

- [ ] **Step 1: Write the failing tests**

Nos literais de `Settings` dos testes existentes, acrescente os campos novos:
- `src/test/stores/settings.test.ts` (objeto `customSettings`): `showNextUp: true, nextUpCollapsed: false,`
- `src/test/lib/storage.test.ts` (objeto `customSettings` e a chamada `saveSettings({ … topicSearch: false })`): `showNextUp: true, nextUpCollapsed: false`

Em `src/test/stores/settings.test.ts`, depois do `describe('setTopicSearch', …)`:

```ts
  describe('next up', () => {
    it('saves whether the strip shows and whether it is collapsed', async () => {
      await settingsStore.setShowNextUp(false);
      await settingsStore.setNextUpCollapsed(true);

      expect(vi.mocked(storage.updateSettings).mock.calls.map((call) => call[0])).toEqual([
        { showNextUp: false },
        { nextUpCollapsed: true },
      ]);
      expect(get(settingsStore).settings.nextUpCollapsed).toBe(true);
    });
  });
```

`src/test/newtab/next-up-labels.test.ts`:

```ts
/**
 * Texts of the next up strip.
 */
import { describe, it, expect } from 'vitest';
import { collectionPath, effortText, reasonText } from '@/newtab/next-up-labels';
import type { Reason } from '@/lib/recommend/engine';
import { createMockCollection, createMockWorkspace } from '../factories';

describe('next up labels', () => {
  it.each([
    [{ type: 'opened', days: 0 }, 'reason_opened_today'],
    [{ type: 'opened', days: 1 }, 'reason_opened_day'],
    [{ type: 'opened', days: 4 }, 'reason_opened_days'],
    [{ type: 'focus' }, 'reason_focus'],
    [{ type: 'momentum', count: 1 }, 'reason_momentum_one'],
    [{ type: 'momentum', count: 3 }, 'reason_momentum_many'],
    [{ type: 'nearlyDone', remaining: 1 }, 'reason_nearly_done_one'],
    [{ type: 'nearlyDone', remaining: 2 }, 'reason_nearly_done_many'],
    [{ type: 'nextInColumn' }, 'reason_next_in_column'],
    [{ type: 'stale', weeks: 1 }, 'reason_stale_week'],
    [{ type: 'stale', weeks: 3 }, 'reason_stale_weeks'],
  ] as [Reason, string][])('%j reads %s', (reason, key) => {
    expect(reasonText(reason)).toBe(key);
  });

  it('shows only the collection for Inbox, and "Workspace › Collection" otherwise', () => {
    const workspace = createMockWorkspace({ id: 'ws-a', name: 'Agentes' });
    expect(collectionPath(createMockCollection({ id: 'inbox', name: 'Inbox' }), [workspace])).toBe('common_inbox');
    expect(collectionPath(createMockCollection({ id: 'h', name: 'Hermes', workspaceId: 'ws-a' }), [workspace])).toBe('Agentes › Hermes');
  });

  it('writes the effort in minutes', () => {
    expect(effortText(10)).toBe('nextup_effort');
  });
});
```

`src/test/components/NextUpCard.test.ts`:

```ts
/**
 * One recommendation card of the next up strip.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import NextUpCard from '@/newtab/components/NextUpCard.svelte';
import type { Recommendation } from '@/lib/recommend/engine';
import { createMockCollection, createMockLink } from '../factories';

const rec: Recommendation = {
  link: createMockLink({ id: 'l1', title: 'Machines of Loving Grace', url: 'https://example.com/essay' }),
  collection: createMockCollection({ id: 'c1', name: 'IA' }),
  role: 'revive',
  reason: { type: 'stale', weeks: 3 },
  kind: 'page',
  action: 'read',
  effort: 10,
};

describe('NextUpCard', () => {
  it('shows role, path, reason, action, title and effort', () => {
    render(NextUpCard, { props: { rec, path: 'Leituras › IA' } });

    for (const text of ['nextup_role_revive', 'Leituras › IA', 'reason_stale_weeks', 'action_read', 'Machines of Loving Grace', 'nextup_effort']) {
      expect(screen.getByText(text)).toBeInTheDocument();
    }
  });

  it('shows the URL when the title is empty', () => {
    render(NextUpCard, { props: { rec: { ...rec, link: { ...rec.link, title: '' } }, path: 'x' } });
    expect(screen.getByText('https://example.com/essay')).toBeInTheDocument();
  });

  it('opens in this tab, or in a new one with Cmd or Ctrl', async () => {
    const open = vi.fn();
    render(NextUpCard, { props: { rec, path: 'x' }, events: { open } });
    const main = screen.getByRole('button', { name: /Machines of Loving Grace/ });

    await fireEvent.click(main);
    await fireEvent.click(main, { metaKey: true });

    expect(open.mock.calls.map((call) => call[0].detail.newTab)).toEqual([false, true]);
  });

  it('completes, snoozes, marks reference, reveals and discards', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 8, 24, 10));
    const handlers = { complete: vi.fn(), snooze: vi.fn(), reference: vi.fn(), reveal: vi.fn(), discard: vi.fn() };
    render(NextUpCard, { props: { rec, path: 'x' }, events: handlers });

    await fireEvent.click(screen.getByRole('button', { name: /progress_complete/ }));
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

`src/test/components/NextUpStrip.test.ts`:

```ts
/**
 * The next up strip above the board.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import NextUpStrip from '@/newtab/components/NextUpStrip.svelte';
import { buildQueue, type Queue } from '@/lib/recommend/engine';
import type { Link } from '@/lib/types';
import { createMockCollection, createMockLink } from '../factories';

const DAY = 86_400_000;
const now = Date.now();
const collections = ['a', 'b', 'c', 'd'].map((id, i) => createMockCollection({ id, name: `Col ${id}`, order: i + 1 }));
const links = ['a', 'b', 'c', 'd'].map((id) =>
  createMockLink({ id: `${id}1`, title: `Link ${id}`, url: `https://example.com/${id}`, collectionId: id, createdAt: now - DAY }));

function queueOf(list: Link[]): Queue {
  return buildQueue({ links: list, collections, activity: {}, now });
}

describe('NextUpStrip', () => {
  it('shows up to three cards', () => {
    render(NextUpStrip, { props: { queue: queueOf(links), workspaces: [], collapsed: false } });
    expect(screen.getAllByRole('article')).toHaveLength(3);
  });

  it('says when nothing is pending', () => {
    render(NextUpStrip, { props: { queue: queueOf([]), workspaces: [], collapsed: false } });
    expect(screen.getByText('nextup_empty')).toBeInTheDocument();
  });

  it('offers the triage with its count', async () => {
    const old = createMockLink({ id: 'old', collectionId: 'a', createdAt: now - 90 * DAY });
    const openTriage = vi.fn();
    render(NextUpStrip, { props: { queue: queueOf([...links, old]), workspaces: [], collapsed: false }, events: { openTriage } });

    await fireEvent.click(screen.getByRole('button', { name: 'nextup_triage_one' }));

    expect(openTriage).toHaveBeenCalledTimes(1);
  });

  it('hides the cards when collapsed and asks to toggle', async () => {
    const toggleCollapsed = vi.fn();
    render(NextUpStrip, { props: { queue: queueOf(links), workspaces: [], collapsed: true }, events: { toggleCollapsed } });

    expect(screen.queryAllByRole('article')).toHaveLength(0);
    await fireEvent.click(screen.getByRole('button', { name: 'nextup_title' }));
    expect(toggleCollapsed).toHaveBeenCalledTimes(1);
  });

  it('passes on what is done with a card', async () => {
    const complete = vi.fn();
    const openFocus = vi.fn();
    render(NextUpStrip, { props: { queue: queueOf(links), workspaces: [], collapsed: false }, events: { complete, openFocus } });

    await fireEvent.click(screen.getAllByRole('button', { name: /progress_complete/ })[0]);
    await fireEvent.click(screen.getByRole('button', { name: 'focus_title' }));

    expect(complete).toHaveBeenCalledTimes(1);
    expect(openFocus).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `docker compose run --rm app npx vitest run src/test/newtab/next-up-labels.test.ts src/test/components/NextUpCard.test.ts src/test/components/NextUpStrip.test.ts src/test/stores/settings.test.ts`
Expected: FAIL — módulos novos não existem; `setShowNextUp` não é função.

- [ ] **Step 3: Implement**

`src/lib/types.ts` — em `Settings`, depois de `topicSearch`:

```ts
  /** Show the next up strip above the board. */
  showNextUp: boolean;
  /** The next up strip is collapsed to its header. */
  nextUpCollapsed: boolean;
```

Em `DEFAULT_SETTINGS`: `showNextUp: true,` e `nextUpCollapsed: false,`.

`src/lib/stores/settings.ts` — no tipo devolvido acrescente `setShowNextUp: (enabled: boolean) => Promise<void>;` e `setNextUpCollapsed: (collapsed: boolean) => Promise<void>;`; depois de `setTopicSearch`:

```ts
  async function setShowNextUp(enabled: boolean): Promise<void> {
    await updateSettingsStore({ showNextUp: enabled });
  }

  async function setNextUpCollapsed(collapsed: boolean): Promise<void> {
    await updateSettingsStore({ nextUpCollapsed: collapsed });
  }
```

e acrescente `setShowNextUp,` e `setNextUpCollapsed,` no `return`.

`src/newtab/next-up-labels.ts`:

```ts
/** Texts of the next up strip and the Focus space. */
import { getCollectionDisplayName, getWorkspaceDisplayName, plural, t } from '@/lib/i18n';
import type { Collection, Workspace } from '@/lib/types';
import type { Reason, SlotRole } from '@/lib/recommend/engine';
import type { LinkAction } from '@/lib/recommend/effort';
import type { TriageReason } from '@/lib/recommend/triage';

export const ROLE_KEYS: Record<SlotRole, string> = {
  continue: 'nextup_role_continue',
  advance: 'nextup_role_advance',
  revive: 'nextup_role_revive',
};

export const ACTION_KEYS: Record<LinkAction, string> = {
  watch: 'action_watch',
  read: 'action_read',
  explore: 'action_explore',
  solve: 'action_solve',
  review: 'action_review',
  resume: 'action_resume',
  searchAgain: 'action_search_again',
  open: 'action_open',
};

export const TRIAGE_KEYS: Record<TriageReason, string> = {
  skipped: 'triage_reason_skipped',
  snoozedOften: 'triage_reason_snoozed',
  revisited: 'triage_reason_revisited',
  stale: 'triage_reason_stale',
};

export function reasonText(reason: Reason): string {
  switch (reason.type) {
    case 'opened':
      if (reason.days === 0) { return t('reason_opened_today'); }
      return reason.days === 1 ? t('reason_opened_day') : t('reason_opened_days', reason.days);
    case 'focus':
      return t('reason_focus');
    case 'momentum':
      return plural(reason.count, 'reason_momentum_one', 'reason_momentum_many');
    case 'nearlyDone':
      return plural(reason.remaining, 'reason_nearly_done_one', 'reason_nearly_done_many');
    case 'nextInColumn':
      return t('reason_next_in_column');
    case 'stale':
      return plural(reason.weeks, 'reason_stale_week', 'reason_stale_weeks');
  }
}

export function effortText(minutes: number): string {
  return t('nextup_effort', minutes);
}

/** "Workspace › Collection"; Inbox, which belongs to no workspace, shows only its name. */
export function collectionPath(collection: Collection, workspaces: Workspace[]): string {
  const name = getCollectionDisplayName(collection);
  const workspace = workspaces.find((w) => w.id === collection.workspaceId);
  return workspace === undefined ? name : `${getWorkspaceDisplayName(workspace)} › ${name}`;
}
```

`src/newtab/components/NextUpCard.svelte`:

```svelte
<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { t } from '@/lib/i18n';
  import type { Link } from '@/lib/types';
  import type { Recommendation } from '@/lib/recommend/engine';
  import { nextMonday, tomorrow } from '@/lib/recommend/dates';
  import { ACTION_KEYS, ROLE_KEYS, effortText, reasonText } from '../next-up-labels';

  export let rec: Recommendation;
  export let path: string;

  const dispatch = createEventDispatcher<{
    open: { link: Link; newTab: boolean };
    complete: Link;
    snooze: { link: Link; until: number };
    reference: Link;
    discard: Link;
    reveal: Link;
  }>();

  let menu: 'snooze' | 'more' | null = null;

  function toggle(name: 'snooze' | 'more'): void {
    menu = menu === name ? null : name;
  }

  function snooze(until: number): void {
    menu = null;
    dispatch('snooze', { link: rec.link, until });
  }

  function pick(event: 'reference' | 'discard' | 'reveal'): void {
    menu = null;
    dispatch(event, rec.link);
  }
</script>

<article class="nextup-card" data-role={rec.role}>
  <p class="card-meta">
    <span class="card-role">{t(ROLE_KEYS[rec.role])}</span>
    <span class="card-path">{path}</span>
    <span class="card-reason">{reasonText(rec.reason)}</span>
  </p>

  <button
    type="button"
    class="card-main"
    on:click={(event) => dispatch('open', { link: rec.link, newTab: event.metaKey || event.ctrlKey })}
  >
    <span class="card-action">{t(ACTION_KEYS[rec.action])}</span>
    <span class="card-title">{rec.link.title || rec.link.url}</span>
    <span class="card-effort">{effortText(rec.effort)}</span>
  </button>

  <div class="card-actions">
    <button type="button" class="card-btn card-complete" on:click={() => dispatch('complete', rec.link)}>
      ✓ {t('progress_complete')}
    </button>
    <div class="card-menu">
      <button type="button" class="card-btn" aria-expanded={menu === 'snooze'} on:click={() => toggle('snooze')}>
        {t('progress_snooze')}
      </button>
      {#if menu === 'snooze'}
        <div class="card-dropdown" role="menu">
          <button type="button" role="menuitem" on:click={() => snooze(tomorrow(Date.now()))}>{t('progress_snooze_tomorrow')}</button>
          <button type="button" role="menuitem" on:click={() => snooze(nextMonday(Date.now()))}>{t('progress_snooze_next_week')}</button>
        </div>
      {/if}
    </div>
    <div class="card-menu">
      <button
        type="button"
        class="card-btn"
        aria-label={t('progress_more')}
        aria-expanded={menu === 'more'}
        on:click={() => toggle('more')}
      >⋯</button>
      {#if menu === 'more'}
        <div class="card-dropdown" role="menu">
          <button type="button" role="menuitem" on:click={() => pick('reference')}>{t('progress_mark_reference')}</button>
          <button type="button" role="menuitem" on:click={() => pick('reveal')}>{t('progress_reveal')}</button>
          <button type="button" role="menuitem" class="danger" on:click={() => pick('discard')}>{t('progress_discard')}</button>
        </div>
      {/if}
    </div>
  </div>
</article>

<style>
  .nextup-card {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    padding: var(--space-3) var(--space-4);
    background: var(--surface-elevated);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-lg);
    min-width: 0;
  }

  .card-meta {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
    margin: 0;
    font-size: var(--text-xs);
    color: var(--text-tertiary);
  }

  .card-role {
    color: var(--accent-primary);
    font-weight: 600;
  }

  .card-main {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: var(--space-1);
    padding: 0;
    border: none;
    background: transparent;
    color: var(--text-primary);
    font-family: var(--font-body);
    text-align: left;
    cursor: pointer;
    min-width: 0;
  }

  .card-action {
    font-size: var(--text-xs);
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .card-title {
    font-size: var(--text-sm);
    font-weight: 500;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 100%;
  }

  .card-main:hover .card-title {
    color: var(--accent-primary);
  }

  .card-effort {
    font-size: var(--text-xs);
    color: var(--text-tertiary);
  }

  .card-actions {
    display: flex;
    gap: var(--space-2);
  }

  .card-menu {
    position: relative;
  }

  .card-btn {
    padding: var(--space-1) var(--space-2);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-md);
    background: transparent;
    color: var(--text-secondary);
    font-family: var(--font-body);
    font-size: var(--text-xs);
    cursor: pointer;
  }

  .card-btn:hover {
    border-color: var(--border-default);
    color: var(--text-primary);
  }

  .card-complete:hover {
    border-color: var(--accent-primary);
    color: var(--accent-primary);
  }

  .card-dropdown {
    position: absolute;
    top: calc(100% + 4px);
    left: 0;
    z-index: 20;
    display: flex;
    flex-direction: column;
    min-width: 200px;
    padding: var(--space-1);
    background: var(--surface-elevated);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-md);
  }

  .card-dropdown button {
    padding: var(--space-2) var(--space-3);
    border: none;
    background: transparent;
    color: var(--text-primary);
    font-family: var(--font-body);
    font-size: var(--text-sm);
    text-align: left;
    border-radius: var(--radius-sm);
    cursor: pointer;
  }

  .card-dropdown button:hover {
    background: var(--surface-overlay);
  }

  .card-dropdown .danger {
    color: var(--semantic-error);
  }
</style>
```

`src/newtab/components/NextUpStrip.svelte`:

```svelte
<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { plural, t } from '@/lib/i18n';
  import type { Workspace } from '@/lib/types';
  import type { Queue } from '@/lib/recommend/engine';
  import NextUpCard from './NextUpCard.svelte';
  import { collectionPath } from '../next-up-labels';

  export let queue: Queue;
  export let workspaces: Workspace[] = [];
  export let collapsed = false;

  const dispatch = createEventDispatcher<{
    toggleCollapsed: void;
    openTriage: void;
    openFocus: void;
  }>();
</script>

<section class="nextup" aria-label={t('nextup_title')}>
  <header class="nextup-header">
    <button
      type="button"
      class="nextup-toggle"
      aria-expanded={!collapsed}
      on:click={() => dispatch('toggleCollapsed')}
    >{t('nextup_title')}</button>
    <span class="nextup-spacer"></span>
    {#if queue.triage.length > 0}
      <button type="button" class="nextup-link" on:click={() => dispatch('openTriage')}>
        {plural(queue.triage.length, 'nextup_triage_one', 'nextup_triage_many')}
      </button>
    {/if}
    <button type="button" class="nextup-link" on:click={() => dispatch('openFocus')}>{t('focus_title')}</button>
  </header>

  {#if !collapsed}
    {#if queue.slots.length === 0}
      <p class="nextup-empty">{t('nextup_empty')}</p>
    {:else}
      <div class="nextup-cards">
        {#each queue.slots as rec (rec.link.id)}
          <NextUpCard
            {rec}
            path={collectionPath(rec.collection, workspaces)}
            on:open
            on:complete
            on:snooze
            on:reference
            on:discard
            on:reveal
          />
        {/each}
      </div>
    {/if}
  {/if}
</section>

<style>
  .nextup {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    padding: 0 var(--space-5) var(--space-3);
  }

  .nextup-header {
    display: flex;
    align-items: center;
    gap: var(--space-3);
  }

  .nextup-toggle {
    padding: 0;
    border: none;
    background: transparent;
    color: var(--text-secondary);
    font-family: var(--font-body);
    font-size: var(--text-xs);
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    cursor: pointer;
  }

  .nextup-toggle[aria-expanded='false']::after {
    content: ' ▸';
  }

  .nextup-toggle[aria-expanded='true']::after {
    content: ' ▾';
  }

  .nextup-spacer {
    flex: 1;
  }

  .nextup-link {
    padding: 0;
    border: none;
    background: transparent;
    color: var(--accent-primary);
    font-family: var(--font-body);
    font-size: var(--text-xs);
    cursor: pointer;
  }

  .nextup-cards {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    gap: var(--space-3);
  }

  .nextup-empty {
    margin: 0;
    font-size: var(--text-sm);
    color: var(--text-tertiary);
  }
</style>
```

**`src/newtab/App.svelte`**:

1. Imports: troque `import { onMount } from 'svelte';` por `import { onDestroy, onMount } from 'svelte';` e acrescente:

```ts
  import NextUpStrip from './components/NextUpStrip.svelte';
  import { activityStore } from '@/lib/stores/activity';
  import * as progress from '@/lib/stores/progress';
  import { buildQueue, type Queue } from '@/lib/recommend/engine';
  import { dayKey } from '@/lib/recommend/dates';
```

2. Estado e reatividade, depois de `let translationAvailable = false;`:

```ts
  /** Refreshed when the page becomes visible, so a tab left open overnight moves to the new day. */
  let now = Date.now();
  let lastShownReport = '';

  $: queue = buildQueue({
    links: $linksStore.links,
    collections: $linksStore.collections,
    activity: $activityStore.activity,
    now,
  });
  $: nextUpVisible = !loading && $settingsStore.settings.showNextUp && !$settingsStore.settings.nextUpCollapsed;
  $: if (nextUpVisible && !$activityStore.loading) {
    reportShown(queue);
  }

  /** Records what the strip shows, once per distinct set of cards per day. */
  function reportShown(current: Queue): void {
    const shown = current.slots.map((slot) => slot.link.id);
    const skipped = current.triage.filter((item) => item.reason === 'skipped').map((item) => item.link.id);
    const report = [dayKey(now), current.size, ...shown, '|', ...skipped].join(',');
    if (report === lastShownReport) {
      return;
    }
    lastShownReport = report;
    void activityStore.recordShown(shown, skipped, current.size, now);
  }

  function refreshDay(): void {
    if (document.visibilityState === 'visible') {
      now = Date.now();
    }
  }
```

3. Em `onMount`, acrescente `activityStore.load(),` ao `Promise.all` e, no fim do `onMount`, `document.addEventListener('visibilitychange', refreshDay);`. Depois do `onMount`:

```ts
  onDestroy(() => document.removeEventListener('visibilitychange', refreshDay));
```

4. Troque `handleSearchOpen`, `handleSearchOpenInNewTab` e `handleSearchReveal` por:

```ts
  /** Every open from the dashboard is recorded first: opening in this tab leaves the page. */
  async function openLink(link: Link, newTab: boolean): Promise<void> {
    await progress.recordOpen(link);
    const result = newTab ? await openLinkInNewTab(link.url) : await openLinkInCurrentTab(link.url);
    if (!result.success) {
      errorMessage = result.error ?? t('error_open_link_failed');
    }
  }

  async function revealOnBoard(link: Link): Promise<void> {
    workspacesStore.setActiveWorkspace(
      workspaceForLink(link, $linksStore.collections, $workspacesStore.activeWorkspaceId)
    );
    await revealLink(link.id);
  }

  async function handleSearchOpen(event: CustomEvent<Link>): Promise<void> {
    showSearch = false;
    await openLink(event.detail, false);
  }

  async function handleSearchOpenInNewTab(event: CustomEvent<Link>): Promise<void> {
    await openLink(event.detail, true);
  }

  async function handleSearchReveal(event: CustomEvent<Link>): Promise<void> {
    showSearch = false;
    await revealOnBoard(event.detail);
  }

  function handleOpen(event: CustomEvent<{ link: Link; newTab: boolean }>): void {
    void openLink(event.detail.link, event.detail.newTab);
  }

  async function handleComplete(event: CustomEvent<Link>): Promise<void> {
    await progress.completeLink(event.detail);
    successMessage = t('success_link_completed');
  }

  async function handleSnooze(event: CustomEvent<{ link: Link; until: number }>): Promise<void> {
    await progress.snoozeLink(event.detail.link, event.detail.until);
    successMessage = t('success_link_snoozed');
  }

  async function handleMarkReference(event: CustomEvent<Link>): Promise<void> {
    await progress.setLinkReference(event.detail, true);
    successMessage = t('success_link_reference');
  }

  async function handleDiscard(event: CustomEvent<Link>): Promise<void> {
    await progress.discardLink(event.detail);
    successMessage = t('success_link_removed');
  }

  async function handleReveal(event: CustomEvent<Link>): Promise<void> {
    await revealOnBoard(event.detail);
  }
```

5. Markup, entre `<QuickActionsBar …/>` e `<KanbanBoard …>`:

```svelte
      {#if $settingsStore.settings.showNextUp}
        <NextUpStrip
          {queue}
          workspaces={$workspacesStore.workspaces}
          collapsed={$settingsStore.settings.nextUpCollapsed}
          on:open={handleOpen}
          on:complete={handleComplete}
          on:snooze={handleSnooze}
          on:reference={handleMarkReference}
          on:discard={handleDiscard}
          on:reveal={handleReveal}
          on:toggleCollapsed={() => settingsStore.setNextUpCollapsed(!$settingsStore.settings.nextUpCollapsed)}
        />
      {/if}
```

Locales — `en`:

```json
  "nextup_title": { "message": "Next up" },
  "nextup_empty": { "message": "Nothing pending. Links you save show up here." },
  "nextup_triage_one": { "message": "1 to triage" },
  "nextup_triage_many": { "message": "$1 to triage", "placeholders": { "count": { "content": "$1" } } },
  "nextup_effort": { "message": "~$1 min", "placeholders": { "minutes": { "content": "$1" } } },
  "nextup_role_continue": { "message": "Continue" },
  "nextup_role_advance": { "message": "Advance" },
  "nextup_role_revive": { "message": "Revisit" },
  "action_watch": { "message": "Watch" },
  "action_read": { "message": "Read" },
  "action_explore": { "message": "Explore" },
  "action_solve": { "message": "Solve" },
  "action_review": { "message": "Review" },
  "action_resume": { "message": "Resume" },
  "action_search_again": { "message": "Search again" },
  "action_open": { "message": "Open" },
  "reason_opened_today": { "message": "Opened today" },
  "reason_opened_day": { "message": "Opened yesterday" },
  "reason_opened_days": { "message": "Opened $1 days ago", "placeholders": { "days": { "content": "$1" } } },
  "reason_focus": { "message": "Pinned focus" },
  "reason_momentum_one": { "message": "1 completed this week" },
  "reason_momentum_many": { "message": "$1 completed this week", "placeholders": { "count": { "content": "$1" } } },
  "reason_nearly_done_one": { "message": "1 left to clear" },
  "reason_nearly_done_many": { "message": "$1 left to clear", "placeholders": { "count": { "content": "$1" } } },
  "reason_next_in_column": { "message": "Next in the column" },
  "reason_stale_week": { "message": "Untouched for 1 week" },
  "reason_stale_weeks": { "message": "Untouched for $1 weeks", "placeholders": { "weeks": { "content": "$1" } } },
  "progress_snooze": { "message": "Snooze" },
  "progress_discard": { "message": "Discard" },
  "progress_reveal": { "message": "Show in its column" },
  "focus_title": { "message": "Focus" }
```

`pt_BR`:

```json
  "nextup_title": { "message": "Próximos passos" },
  "nextup_empty": { "message": "Nada pendente. Os links que você salvar aparecem aqui." },
  "nextup_triage_one": { "message": "1 para triar" },
  "nextup_triage_many": { "message": "$1 para triar", "placeholders": { "count": { "content": "$1" } } },
  "nextup_effort": { "message": "~$1 min", "placeholders": { "minutes": { "content": "$1" } } },
  "nextup_role_continue": { "message": "Continuar" },
  "nextup_role_advance": { "message": "Avançar" },
  "nextup_role_revive": { "message": "Retomar" },
  "action_watch": { "message": "Assistir" },
  "action_read": { "message": "Ler" },
  "action_explore": { "message": "Explorar" },
  "action_solve": { "message": "Resolver" },
  "action_review": { "message": "Revisar" },
  "action_resume": { "message": "Retomar" },
  "action_search_again": { "message": "Refazer a busca" },
  "action_open": { "message": "Abrir" },
  "reason_opened_today": { "message": "Aberto hoje" },
  "reason_opened_day": { "message": "Aberto ontem" },
  "reason_opened_days": { "message": "Aberto há $1 dias", "placeholders": { "days": { "content": "$1" } } },
  "reason_focus": { "message": "Foco fixado" },
  "reason_momentum_one": { "message": "1 concluído esta semana" },
  "reason_momentum_many": { "message": "$1 concluídos esta semana", "placeholders": { "count": { "content": "$1" } } },
  "reason_nearly_done_one": { "message": "Falta 1 para zerar" },
  "reason_nearly_done_many": { "message": "Faltam $1 para zerar", "placeholders": { "count": { "content": "$1" } } },
  "reason_next_in_column": { "message": "Próximo da coluna" },
  "reason_stale_week": { "message": "Parada há 1 semana" },
  "reason_stale_weeks": { "message": "Parada há $1 semanas", "placeholders": { "weeks": { "content": "$1" } } },
  "progress_snooze": { "message": "Adiar" },
  "progress_discard": { "message": "Descartar" },
  "progress_reveal": { "message": "Ver na coluna" },
  "focus_title": { "message": "Foco" }
```

(Formate no estilo multilinha do arquivo.)

- [ ] **Step 4: Run tests to verify they pass**

Run: `docker compose run --rm app npx vitest run src/test/newtab src/test/components src/test/stores src/test/lib/storage.test.ts`
Expected: PASS.

- [ ] **Step 5: Lint, type-check and commit**

Run: `docker compose run --rm app npx eslint src/newtab/next-up-labels.ts src/newtab/components/NextUpCard.svelte src/newtab/components/NextUpStrip.svelte src/newtab/App.svelte src/lib/stores/settings.ts`
Expected: nenhum erro.

Run: `docker compose run --rm app sh -c "npx tsc --noEmit 2>&1 | grep -E 'src/(newtab|lib/(types|stores))'"`
Expected: nenhuma linha.

```bash
git add src/lib/types.ts src/lib/stores/settings.ts src/newtab/next-up-labels.ts src/newtab/components/NextUpCard.svelte src/newtab/components/NextUpStrip.svelte src/newtab/App.svelte public/_locales/en/messages.json public/_locales/pt_BR/messages.json src/test/stores/settings.test.ts src/test/lib/storage.test.ts src/test/newtab/next-up-labels.test.ts src/test/components/NextUpCard.test.ts src/test/components/NextUpStrip.test.ts
git commit -m "feat(next-up): strip with continue, advance and revive cards above the board

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 12: Espaço Foco — progresso, sessão e navegação

**Files:**
- Create: `src/lib/recommend/progress.ts`
- Create: `src/newtab/components/FocusSession.svelte`, `src/newtab/components/FocusView.svelte`
- Modify: `src/newtab/components/WorkspaceRail.svelte`
- Modify: `src/newtab/App.svelte`
- Modify: `public/_locales/en/messages.json`, `public/_locales/pt_BR/messages.json`
- Test: `src/test/lib/recommend/progress.test.ts`, `src/test/components/FocusSession.test.ts`, `src/test/components/FocusView.test.ts`, `src/test/components/WorkspaceRail.test.ts`

**Interfaces:**
- Consumes: `isoWeek`, `addDays`, `weekStart` (Task 2), `buildSession`, `SESSION_OPTIONS`, `SessionMinutes` (Task 5), `Queue` (Task 4), `ACTION_KEYS`, `effortText` (Task 11), `openLink`/`handleOpen`/`handleComplete` do `App.svelte` (Task 11).
- Produces:
  - `progress.ts`: `interface WeekBar { week: string; completed: number }`, `PROGRESS_WEEKS = 8`, `completedByWeek(links, now, weeks?): WeekBar[]`, `previousQueue(stats: RecoStats, now): number | undefined`, `interface CompletedWeek { week: string; start: number; links: Link[] }`, `completedHistory(links): CompletedWeek[]`.
  - `FocusSession` props `queue: Queue`; eventos `open: { link: Link; newTab: boolean }` (sempre `newTab: true`), `complete: Link`, `openTriage: void`.
  - `FocusView` props `queue`, `links`, `stats`, `now`; repassa `open` e `complete`; seções com `id="focus-progress"`, `id="focus-session"`.
  - `WorkspaceRail` prop `focusActive = false`; eventos `focus: void`, `board: void`.
  - No `App.svelte`: `view: 'board' | 'focus'`, `openFocus(section: 'triage' | 'completed' | null): Promise<void>`.

- [ ] **Step 1: Write the failing tests**

`src/test/lib/recommend/progress.test.ts`:

```ts
/**
 * Numbers of the Focus space.
 */
import { describe, it, expect } from 'vitest';
import { completedByWeek, completedHistory, previousQueue } from '@/lib/recommend/progress';
import { EMPTY_WEEK } from '@/lib/types';
import { createMockLink } from '../../factories';

const now = new Date(2026, 8, 24, 10).getTime();
const links = [
  createMockLink({ id: 'a', completedAt: new Date(2026, 8, 23).getTime() }),
  createMockLink({ id: 'b', completedAt: new Date(2026, 8, 21).getTime() }),
  createMockLink({ id: 'c', completedAt: new Date(2026, 8, 15).getTime() }),
  createMockLink({ id: 'd', completedAt: new Date(2026, 0, 5).getTime() }),
  createMockLink({ id: 'e' }),
];

describe('Focus numbers', () => {
  it('counts completions in each of the last 8 weeks, oldest first', () => {
    const bars = completedByWeek(links, now);

    expect(bars).toHaveLength(8);
    expect(bars.slice(-2)).toEqual([{ week: '2026-W38', completed: 1 }, { week: '2026-W39', completed: 2 }]);
    expect(bars.reduce((total, bar) => total + bar.completed, 0)).toBe(3);
  });

  it('reads the queue size recorded last week', () => {
    expect(previousQueue({ '2026-W38': { ...EMPTY_WEEK, queue: 120 } }, now)).toBe(120);
    expect(previousQueue({}, now)).toBeUndefined();
  });

  it('groups completed links by week, newest first', () => {
    const history = completedHistory(links);

    expect(history.map((group) => [group.week, group.links.map((l) => l.id)])).toEqual([
      ['2026-W39', ['a', 'b']],
      ['2026-W38', ['c']],
      ['2026-W02', ['d']],
    ]);
    expect(history[0].start).toBe(new Date(2026, 8, 21).getTime());
  });
});
```

`src/test/components/FocusSession.test.ts`:

```ts
/**
 * The session of the Focus space.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import FocusSession from '@/newtab/components/FocusSession.svelte';
import { buildQueue } from '@/lib/recommend/engine';
import type { Link } from '@/lib/types';
import { createMockCollection, createMockLink } from '../factories';

const DAY = 86_400_000;
const now = Date.now();
const collections = [createMockCollection({ id: 'a', name: 'A', order: 1 })];
const pages = ['p1', 'p2', 'p3', 'p4'].map((id) =>
  createMockLink({ id, title: `Page ${id}`, url: `https://example.com/${id}`, collectionId: 'a', createdAt: now - DAY }));
const queueOf = (links: Link[]): ReturnType<typeof buildQueue> => buildQueue({ links, collections, activity: {}, now });

async function pick(index: number): Promise<void> {
  await fireEvent.click(screen.getAllByRole('button', { name: 'focus_session_minutes' })[index]);
}

describe('FocusSession', () => {
  it('builds a session for the chosen time', async () => {
    render(FocusSession, { props: { queue: queueOf(pages) } });
    await pick(1);
    expect(screen.getAllByRole('listitem')).toHaveLength(3);
  });

  it('"Next" opens, in a new tab, the first link not opened yet', async () => {
    const open = vi.fn();
    render(FocusSession, { props: { queue: queueOf(pages) }, events: { open } });
    await pick(1);

    await fireEvent.click(screen.getByRole('button', { name: 'focus_session_next' }));
    await fireEvent.click(screen.getByRole('button', { name: 'focus_session_next' }));

    expect(open.mock.calls.map((call) => [call[0].detail.link.id, call[0].detail.newTab])).toEqual([['p1', true], ['p2', true]]);
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

    await fireEvent.click(screen.getByRole('button', { name: 'focus_session_triage_one' }));

    expect(openTriage).toHaveBeenCalledTimes(1);
  });

  it('says when there is nothing to do', async () => {
    render(FocusSession, { props: { queue: queueOf([]) } });
    await pick(2);
    expect(screen.getByText('focus_session_empty')).toBeInTheDocument();
  });
});
```

`src/test/components/FocusView.test.ts`:

```ts
/**
 * The Focus space as a whole.
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import FocusView from '@/newtab/components/FocusView.svelte';
import { buildQueue } from '@/lib/recommend/engine';

const now = Date.now();

describe('FocusView', () => {
  it('shows its progress even with nothing saved', () => {
    render(FocusView, { props: { queue: buildQueue({ links: [], collections: [], activity: {}, now }), links: [], stats: {}, now } });

    expect(screen.getByText(/focus_week_many/)).toBeInTheDocument();
    expect(screen.getByText(/focus_queue/)).toBeInTheDocument();
  });
});
```

`src/test/components/WorkspaceRail.test.ts`:

```ts
/**
 * The workspace rail and its Focus entry.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import WorkspaceRail from '@/newtab/components/WorkspaceRail.svelte';
import { workspacesStore } from '@/lib/stores/workspaces';
import { createMockWorkspace } from '../factories';
const { createStorageMock } = await vi.hoisted(() => import('../mocks/storage'));

vi.mock('@/lib/storage', () => createStorageMock());

const work = createMockWorkspace({ id: 'ws-work', name: 'Trabalho' });

describe('WorkspaceRail', () => {
  beforeEach(() => {
    workspacesStore.set({ workspaces: [work], activeWorkspaceId: 'ws-work', loading: false, error: null, pendingLocalUpdate: false });
  });

  it('opens Focus from its entry at the top', async () => {
    const focus = vi.fn();
    render(WorkspaceRail, { props: { focusActive: false }, events: { focus } });

    await fireEvent.click(screen.getByRole('button', { name: 'focus_open' }));

    expect(focus).toHaveBeenCalledTimes(1);
  });

  it('while Focus is open, no workspace looks selected', () => {
    render(WorkspaceRail, { props: { focusActive: true } });

    expect(screen.getByRole('button', { name: 'focus_open' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Trabalho' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('choosing a workspace goes back to the board', async () => {
    const board = vi.fn();
    render(WorkspaceRail, { props: { focusActive: true }, events: { board } });

    await fireEvent.click(screen.getByRole('button', { name: 'Trabalho' }));

    expect(board).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `docker compose run --rm app npx vitest run src/test/lib/recommend/progress.test.ts src/test/components/FocusSession.test.ts src/test/components/FocusView.test.ts src/test/components/WorkspaceRail.test.ts`
Expected: FAIL — módulos e componentes novos não existem; a entrada `focus_open` não existe no rail.

- [ ] **Step 3: Implement**

`src/lib/recommend/progress.ts`:

```ts
/**
 * Numbers of the Focus space: completions per week and the history.
 */
import type { Link, RecoStats } from '@/lib/types';
import { addDays, isoWeek, weekStart } from './dates';

export interface WeekBar {
  week: string;
  completed: number;
}

export const PROGRESS_WEEKS = 8;

/** Completions in each of the last `weeks` ISO weeks, oldest first. */
export function completedByWeek(links: Link[], now: number, weeks = PROGRESS_WEEKS): WeekBar[] {
  const keys = Array.from({ length: weeks }, (_, i) => isoWeek(addDays(now, -7 * (weeks - 1 - i))));
  const counts = new Map(keys.map((key) => [key, 0]));
  for (const link of links) {
    if (link.completedAt === undefined) {
      continue;
    }
    const key = isoWeek(link.completedAt);
    const count = counts.get(key);
    if (count !== undefined) {
      counts.set(key, count + 1);
    }
  }
  return keys.map((week) => ({ week, completed: counts.get(week) ?? 0 }));
}

/** Queue size recorded in the previous week, if the strip was seen then. */
export function previousQueue(stats: RecoStats, now: number): number | undefined {
  return stats[isoWeek(addDays(now, -7))]?.queue;
}

export interface CompletedWeek {
  week: string;
  /** Start of the Monday of that week. */
  start: number;
  links: Link[];
}

/** Completed links grouped by ISO week, newest first. */
export function completedHistory(links: Link[]): CompletedWeek[] {
  const done = links
    .filter((link) => link.completedAt !== undefined)
    .sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0));
  const groups: CompletedWeek[] = [];
  for (const link of done) {
    const at = link.completedAt ?? 0;
    const week = isoWeek(at);
    const last = groups[groups.length - 1];
    if (last !== undefined && last.week === week) {
      last.links.push(link);
    } else {
      groups.push({ week, start: weekStart(at), links: [link] });
    }
  }
  return groups;
}
```

`src/newtab/components/FocusSession.svelte`:

```svelte
<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { plural, t } from '@/lib/i18n';
  import type { Link } from '@/lib/types';
  import type { Queue } from '@/lib/recommend/engine';
  import { buildSession, SESSION_OPTIONS, type SessionMinutes } from '@/lib/recommend/session';
  import { ACTION_KEYS, effortText } from '../next-up-labels';

  export let queue: Queue;

  const dispatch = createEventDispatcher<{
    open: { link: Link; newTab: boolean };
    complete: Link;
    openTriage: void;
  }>();

  let minutes: SessionMinutes | null = null;
  let opened = new Set<string>();

  $: items = minutes === null ? [] : buildSession(queue, minutes);
  $: nextLink = items.flatMap((item) => (item.type === 'link' && !opened.has(item.rec.link.id) ? [item.rec.link] : []))[0];

  function choose(option: SessionMinutes): void {
    minutes = option;
    opened = new Set();
  }

  /** The session keeps the Focus page: links open in a new tab. */
  function open(link: Link): void {
    opened = new Set([...opened, link.id]);
    dispatch('open', { link, newTab: true });
  }
</script>

<section id="focus-session" class="focus-section" aria-labelledby="focus-session-title">
  <h2 id="focus-session-title">{t('focus_session_title')}</h2>
  <div class="session-options" role="group" aria-label={t('focus_session_pick')}>
    <span class="session-question">{t('focus_session_pick')}</span>
    {#each SESSION_OPTIONS as option (option)}
      <button type="button" aria-pressed={minutes === option} on:click={() => choose(option)}>
        {t('focus_session_minutes', option)}
      </button>
    {/each}
  </div>

  {#if minutes !== null}
    {#if items.length === 0}
      <p class="focus-empty">{t('focus_session_empty')}</p>
    {:else}
      <ol class="session-items">
        {#each items as item (item.type === 'link' ? item.rec.link.id : 'triage')}
          <li class="session-item">
            {#if item.type === 'triage'}
              <button type="button" class="session-triage" on:click={() => dispatch('openTriage')}>
                {plural(item.count, 'focus_session_triage_one', 'focus_session_triage_many')}
              </button>
            {:else}
              <span class="session-action">{t(ACTION_KEYS[item.rec.action])}</span>
              <button type="button" class="session-title" class:opened={opened.has(item.rec.link.id)} on:click={() => open(item.rec.link)}>
                {item.rec.link.title || item.rec.link.url}
              </button>
              <span class="session-effort">
                {effortText(item.rec.effort)}{#if item.overBudget} · {t('focus_session_over_budget')}{/if}
              </span>
              <button
                type="button"
                class="session-complete"
                aria-label={t('progress_complete')}
                on:click={() => dispatch('complete', item.rec.link)}
              >✓</button>
            {/if}
          </li>
        {/each}
      </ol>
      {#if nextLink !== undefined}
        <button type="button" class="session-next" on:click={() => open(nextLink)}>{t('focus_session_next')}</button>
      {/if}
    {/if}
  {/if}
</section>

<style>
  .session-options {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    flex-wrap: wrap;
  }

  .session-question {
    font-size: var(--text-sm);
    color: var(--text-secondary);
    margin-right: var(--space-2);
  }

  .session-options button,
  .session-next {
    padding: var(--space-1) var(--space-3);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-full);
    background: transparent;
    color: var(--text-primary);
    font-family: var(--font-body);
    font-size: var(--text-sm);
    cursor: pointer;
  }

  .session-options button[aria-pressed='true'],
  .session-next {
    border-color: var(--accent-primary);
    background: var(--accent-soft);
    color: var(--accent-primary);
  }

  .session-items {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    margin: var(--space-3) 0;
    padding-left: var(--space-5);
  }

  .session-item {
    font-size: var(--text-sm);
  }

  .session-item > * {
    vertical-align: middle;
  }

  .session-action {
    font-size: var(--text-xs);
    color: var(--text-secondary);
    text-transform: uppercase;
    margin-right: var(--space-2);
  }

  .session-title,
  .session-triage {
    padding: 0;
    border: none;
    background: transparent;
    color: var(--text-primary);
    font-family: var(--font-body);
    font-size: var(--text-sm);
    text-align: left;
    cursor: pointer;
  }

  .session-title:hover,
  .session-triage:hover {
    color: var(--accent-primary);
  }

  .session-title.opened {
    color: var(--text-secondary);
  }

  .session-effort {
    font-size: var(--text-xs);
    color: var(--text-tertiary);
    margin: 0 var(--space-2);
  }

  .session-complete {
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-sm);
    background: transparent;
    color: var(--text-secondary);
    cursor: pointer;
  }

  .session-complete:hover {
    border-color: var(--accent-primary);
    color: var(--accent-primary);
  }
</style>
```

`src/newtab/components/FocusView.svelte`:

```svelte
<script lang="ts">
  import { plural, t } from '@/lib/i18n';
  import type { Link, RecoStats } from '@/lib/types';
  import type { Queue } from '@/lib/recommend/engine';
  import { completedByWeek, previousQueue } from '@/lib/recommend/progress';
  import FocusSession from './FocusSession.svelte';

  export let queue: Queue;
  export let links: Link[];
  export let stats: RecoStats;
  export let now: number;

  $: bars = completedByWeek(links, now);
  $: thisWeek = bars[bars.length - 1].completed;
  $: tallest = Math.max(1, ...bars.map((bar) => bar.completed));
  $: previous = previousQueue(stats, now);

  function scrollTo(id: string): void {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
</script>

<div class="focus-view scrollbar-thin">
  <section id="focus-progress" class="focus-section" aria-labelledby="focus-progress-title">
    <h2 id="focus-progress-title">{t('focus_progress_title')}</h2>
    <div class="bars" aria-hidden="true">
      {#each bars as bar (bar.week)}
        <span class="bar" style="--height: {Math.round((bar.completed / tallest) * 100)}%" title="{bar.week}: {bar.completed}"></span>
      {/each}
    </div>
    <p class="progress-summary">
      {plural(thisWeek, 'focus_week_one', 'focus_week_many')} · {t('focus_queue', queue.size)}{#if previous !== undefined && previous !== queue.size}
        · {queue.size < previous ? t('focus_queue_down', previous - queue.size) : t('focus_queue_up', queue.size - previous)}{/if}
    </p>
  </section>

  <FocusSession {queue} on:open on:complete on:openTriage={() => scrollTo('focus-triage')} />
</div>

<style>
  .focus-view {
    flex: 1;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: var(--space-6);
    padding: var(--space-4) var(--space-6) var(--space-8);
    max-width: 920px;
  }

  .focus-view :global(.focus-section h2) {
    margin: 0 0 var(--space-3);
    font-family: var(--font-display);
    font-size: var(--text-lg);
    color: var(--text-primary);
  }

  .focus-view :global(.focus-empty) {
    margin: 0;
    font-size: var(--text-sm);
    color: var(--text-tertiary);
  }

  .bars {
    display: flex;
    align-items: flex-end;
    gap: var(--space-2);
    height: 64px;
  }

  .bar {
    flex: 1;
    max-width: 32px;
    height: max(2px, var(--height));
    background: var(--accent-primary);
    border-radius: var(--radius-sm) var(--radius-sm) 0 0;
    opacity: 0.85;
  }

  .progress-summary {
    margin: var(--space-2) 0 0;
    font-size: var(--text-sm);
    color: var(--text-secondary);
  }
</style>
```

**`src/newtab/components/WorkspaceRail.svelte`**:

1. `createEventDispatcher<{ error: string; success: string; focus: void; board: void }>()`.
2. Depois do dispatcher: `export let focusActive = false;`
3. `handleSelectWorkspace`:

```ts
  function handleSelectWorkspace(event: CustomEvent<string>): void {
    workspacesStore.setActiveWorkspace(event.detail);
    dispatch('board');
  }
```

4. No markup, logo depois de `<nav class="workspace-rail" …>`:

```svelte
  <button
    type="button"
    class="focus-entry"
    class:active={focusActive}
    on:click={() => dispatch('focus')}
    aria-label={t('focus_open')}
    aria-pressed={focusActive}
    title={t('focus_title')}
  >
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
      <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>
    </svg>
  </button>

  <div class="rail-divider"></div>
```

5. No `<WorkspaceRailItem …>`: `isActive={!focusActive && activeWorkspaceId === workspace.id}`.
6. Estilos:

```css
  .focus-entry {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    margin-bottom: var(--space-2);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-lg);
    background: transparent;
    color: var(--text-secondary);
    cursor: pointer;
    transition: all var(--duration-fast) var(--ease-out);
  }

  .focus-entry:hover {
    color: var(--text-primary);
    border-color: var(--border-default);
  }

  .focus-entry.active {
    color: var(--accent-primary);
    border-color: var(--accent-primary);
    background: var(--accent-soft);
  }
```

**`src/newtab/App.svelte`**:

1. Imports: troque o import de `svelte` por `import { onDestroy, onMount, tick } from 'svelte';` e acrescente `import FocusView from './components/FocusView.svelte';`.
2. Estado, depois de `let lastShownReport = '';`:

```ts
  let view: 'board' | 'focus' = 'board';

  async function openFocus(section: 'triage' | 'completed' | null): Promise<void> {
    view = 'focus';
    if (section !== null) {
      await tick();
      document.getElementById(`focus-${section}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
```

3. `$: nextUpVisible = !loading && view === 'board' && $settingsStore.settings.showNextUp && !$settingsStore.settings.nextUpCollapsed;`
4. Em `revealOnBoard`, primeira linha: `view = 'board';`.
5. `<WorkspaceRail …>` ganha:

```svelte
    focusActive={view === 'focus'}
    on:focus={() => openFocus(null)}
    on:board={() => (view = 'board')}
```

6. No `<NextUpStrip …>`, acrescente `on:openTriage={() => openFocus('triage')}` e `on:openFocus={() => openFocus(null)}`.
7. No bloco `{:else}` do conteúdo (depois de `<QuickActionsBar …/>`), envolva faixa, quadro e barra de status:

```svelte
      {#if view === 'focus'}
        <FocusView
          {queue}
          links={$linksStore.links}
          stats={$activityStore.stats}
          {now}
          on:open={handleOpen}
          on:complete={handleComplete}
        />
      {:else}
        <!-- NextUpStrip, KanbanBoard e StatusBar, como estão -->
      {/if}
```

Locales — `en`:

```json
  "focus_open": { "message": "Open Focus" },
  "focus_progress_title": { "message": "Progress" },
  "focus_week_one": { "message": "1 completed this week" },
  "focus_week_many": { "message": "$1 completed this week", "placeholders": { "count": { "content": "$1" } } },
  "focus_queue": { "message": "$1 in the queue", "placeholders": { "count": { "content": "$1" } } },
  "focus_queue_down": { "message": "$1 fewer than last week", "placeholders": { "count": { "content": "$1" } } },
  "focus_queue_up": { "message": "$1 more than last week", "placeholders": { "count": { "content": "$1" } } },
  "focus_session_title": { "message": "Session" },
  "focus_session_pick": { "message": "How much time do you have?" },
  "focus_session_minutes": { "message": "$1 min", "placeholders": { "minutes": { "content": "$1" } } },
  "focus_session_next": { "message": "Next" },
  "focus_session_over_budget": { "message": "longer than the session" },
  "focus_session_triage_one": { "message": "Triage 1 link" },
  "focus_session_triage_many": { "message": "Triage $1 links", "placeholders": { "count": { "content": "$1" } } },
  "focus_session_empty": { "message": "Nothing to do in this session." }
```

`pt_BR`:

```json
  "focus_open": { "message": "Abrir o Foco" },
  "focus_progress_title": { "message": "Progresso" },
  "focus_week_one": { "message": "1 concluído esta semana" },
  "focus_week_many": { "message": "$1 concluídos esta semana", "placeholders": { "count": { "content": "$1" } } },
  "focus_queue": { "message": "$1 na fila", "placeholders": { "count": { "content": "$1" } } },
  "focus_queue_down": { "message": "$1 a menos que na semana passada", "placeholders": { "count": { "content": "$1" } } },
  "focus_queue_up": { "message": "$1 a mais que na semana passada", "placeholders": { "count": { "content": "$1" } } },
  "focus_session_title": { "message": "Sessão" },
  "focus_session_pick": { "message": "Quanto tempo você tem?" },
  "focus_session_minutes": { "message": "$1 min", "placeholders": { "minutes": { "content": "$1" } } },
  "focus_session_next": { "message": "Próximo" },
  "focus_session_over_budget": { "message": "passa do tempo" },
  "focus_session_triage_one": { "message": "Triar 1 link" },
  "focus_session_triage_many": { "message": "Triar $1 links", "placeholders": { "count": { "content": "$1" } } },
  "focus_session_empty": { "message": "Nada para fazer nesta sessão." }
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `docker compose run --rm app npx vitest run src/test/lib/recommend src/test/components`
Expected: PASS.

- [ ] **Step 5: Lint, type-check and commit**

Run: `docker compose run --rm app npx eslint src/lib/recommend/progress.ts src/newtab/components/FocusSession.svelte src/newtab/components/FocusView.svelte src/newtab/components/WorkspaceRail.svelte src/newtab/App.svelte`
Expected: nenhum erro novo.

```bash
git add src/lib/recommend/progress.ts src/newtab/components/FocusSession.svelte src/newtab/components/FocusView.svelte src/newtab/components/WorkspaceRail.svelte src/newtab/App.svelte public/_locales/en/messages.json public/_locales/pt_BR/messages.json src/test/lib/recommend/progress.test.ts src/test/components/FocusSession.test.ts src/test/components/FocusView.test.ts src/test/components/WorkspaceRail.test.ts
git commit -m "feat(focus): Focus space with weekly progress and a timed session, reached from the rail

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 13: Foco — triagem, frentes e concluídos

**Files:**
- Create: `src/newtab/components/FocusTriage.svelte`, `src/newtab/components/FocusFronts.svelte`, `src/newtab/components/FocusCompleted.svelte`
- Modify: `src/newtab/components/FocusView.svelte`
- Modify: `src/newtab/App.svelte`
- Modify: `public/_locales/en/messages.json`, `public/_locales/pt_BR/messages.json`
- Test: `src/test/components/FocusTriage.test.ts`, `src/test/components/FocusFronts.test.ts`, `src/test/components/FocusCompleted.test.ts`, `src/test/components/FocusView.test.ts`

**Interfaces:**
- Consumes: `TriageItem` (Task 3), `Front`, `advanceReason` (Task 4), `completedHistory` (Task 12), `shortDate` (Task 2), `isEditable` (`src/newtab/shortcuts.ts`), `TRIAGE_KEYS`, `collectionPath`, `reasonText` (Task 11), ações de progresso (Task 9), `openFocus`, `revealOnBoard` (Tasks 11–12).
- Produces:
  - `FocusTriage` props `items: TriageItem[]`, `workspaces: Workspace[]`, `keyboard = true`; eventos `keep`, `discard`, `reference`, `complete` (todos `Link`), `open: { link; newTab }`; `id="focus-triage"`.
  - `FocusFronts` props `fronts: Front[]`, `workspaces`; eventos `collectionFocus`, `collectionReference` (`{ collection: Collection; value: boolean }`).
  - `FocusCompleted` props `links: Link[]`; eventos `restore: Link`, `open`; `id="focus-completed"`; cada linha com `data-link-id`.
  - `FocusView` props novas `workspaces: Workspace[]`, `keyboard = true`.

- [ ] **Step 1: Write the failing tests**

`src/test/components/FocusTriage.test.ts`:

```ts
/**
 * Triage in the Focus space: one decision at a time, by button or key.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import FocusTriage from '@/newtab/components/FocusTriage.svelte';
import { buildTriage } from '@/lib/recommend/triage';
import { createMockCollection, createMockLink } from '../factories';

const DAY = 86_400_000;
const now = Date.now();
const collection = createMockCollection({ id: 'c', name: 'Leituras' });
const old = createMockLink({ id: 'old', title: 'Old essay', collectionId: 'c', createdAt: now - 90 * DAY });
const older = createMockLink({ id: 'older', title: '', url: 'file:///notes/x.html', collectionId: 'c', createdAt: now - 120 * DAY });
const items = buildTriage([old, older], new Map([['c', collection]]), {}, now);

describe('FocusTriage', () => {
  it('shows one link at a time, with why it is here', () => {
    render(FocusTriage, { props: { items, workspaces: [] } });

    expect(screen.getByText('triage_reason_stale')).toBeInTheDocument();
    expect(screen.getByText('file:///notes/x.html')).toBeInTheDocument();
    expect(screen.getByText('triage_left_many')).toBeInTheDocument();
    expect(screen.queryByText('Old essay')).toBeNull();
  });

  it.each([['1', 'keep'], ['2', 'discard'], ['3', 'reference'], ['4', 'complete']])('key %s decides %s', async (key, event) => {
    const handler = vi.fn();
    render(FocusTriage, { props: { items, workspaces: [] }, events: { [event]: handler } });

    await fireEvent.keyDown(window, { key });

    expect(handler.mock.calls[0][0].detail.id).toBe('older');
  });

  it('decides with the buttons too', async () => {
    const keep = vi.fn();
    render(FocusTriage, { props: { items, workspaces: [] }, events: { keep } });

    await fireEvent.click(screen.getByRole('button', { name: /triage_keep/ }));

    expect(keep).toHaveBeenCalledTimes(1);
  });

  it('ignores the keys while typing in a field', async () => {
    const keep = vi.fn();
    render(FocusTriage, { props: { items, workspaces: [] }, events: { keep } });
    const input = document.createElement('input');
    document.body.appendChild(input);

    await fireEvent.keyDown(input, { key: '1' });

    input.remove();
    expect(keep).not.toHaveBeenCalled();
  });

  it('ignores the keys while a dialog is open', async () => {
    const keep = vi.fn();
    render(FocusTriage, { props: { items, workspaces: [], keyboard: false }, events: { keep } });

    await fireEvent.keyDown(window, { key: '1' });

    expect(keep).not.toHaveBeenCalled();
  });

  it('says when there is nothing to triage', () => {
    render(FocusTriage, { props: { items: [], workspaces: [] } });
    expect(screen.getByText('triage_empty')).toBeInTheDocument();
  });
});
```

`src/test/components/FocusFronts.test.ts`:

```ts
/**
 * The fronts of the Focus space.
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
const { fronts } = buildQueue({ links, collections: [inbox, hermes], activity: {}, now });

describe('FocusFronts', () => {
  it('lists each front with its path, count and reason', () => {
    render(FocusFronts, { props: { fronts, workspaces } });

    expect(screen.getByText('Agentes › Hermes')).toBeInTheDocument();
    expect(screen.getByText('focus_front_count_many')).toBeInTheDocument();
    expect(screen.getAllByText('reason_nearly_done_one')).toHaveLength(1);
  });

  it('pins a front as focus and marks it as reference', async () => {
    const collectionFocus = vi.fn();
    const collectionReference = vi.fn();
    render(FocusFronts, { props: { fronts, workspaces }, events: { collectionFocus, collectionReference } });

    await fireEvent.click(screen.getAllByRole('button', { name: 'column_pin_focus' })[1]);
    await fireEvent.click(screen.getByRole('button', { name: 'column_mark_reference' }));

    expect(collectionFocus.mock.calls[0][0].detail).toEqual({ collection: hermes, value: true });
    expect(collectionReference.mock.calls[0][0].detail).toEqual({ collection: hermes, value: true });
  });

  it('never offers to turn Inbox into a reference collection', () => {
    render(FocusFronts, { props: { fronts, workspaces } });
    expect(screen.getAllByRole('button', { name: 'column_mark_reference' })).toHaveLength(1);
  });
});
```

(Ordem das frentes: `inbox` tem 1 elegível e `h` tem 2, então `inbox` vem primeiro; o índice `[1]` é Hermes.)

`src/test/components/FocusCompleted.test.ts`:

```ts
/**
 * Completed links, grouped by week, with undo.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import FocusCompleted from '@/newtab/components/FocusCompleted.svelte';
import { createMockLink } from '../factories';

const done = createMockLink({ id: 'a', title: 'Finished talk', completedAt: new Date(2026, 8, 23).getTime() });
const pending = createMockLink({ id: 'b', title: 'Still open' });

describe('FocusCompleted', () => {
  it('lists completed links by week and undoes a completion', async () => {
    const restore = vi.fn();
    const { container } = render(FocusCompleted, { props: { links: [done, pending] }, events: { restore } });

    expect(screen.getByText('Finished talk')).toBeInTheDocument();
    expect(screen.queryByText('Still open')).toBeNull();
    expect(screen.getByText('focus_week_of')).toBeInTheDocument();
    expect(container.querySelector('[data-link-id="a"]')).not.toBeNull();

    await fireEvent.click(screen.getByRole('button', { name: 'progress_undo' }));

    expect(restore.mock.calls[0][0].detail).toEqual(done);
  });

  it('says when nothing was completed yet', () => {
    render(FocusCompleted, { props: { links: [pending] } });
    expect(screen.getByText('focus_completed_empty')).toBeInTheDocument();
  });
});
```

Em `src/test/components/FocusView.test.ts`, no `render`, acrescente `workspaces: []` às props e um segundo teste:

```ts
  it('has the triage, fronts and completed sections', () => {
    render(FocusView, { props: { queue: buildQueue({ links: [], collections: [], activity: {}, now }), links: [], stats: {}, now, workspaces: [] } });

    for (const title of ['focus_triage_title', 'focus_fronts_title', 'focus_completed_title']) {
      expect(screen.getByRole('heading', { name: title })).toBeInTheDocument();
    }
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `docker compose run --rm app npx vitest run src/test/components/FocusTriage.test.ts src/test/components/FocusFronts.test.ts src/test/components/FocusCompleted.test.ts src/test/components/FocusView.test.ts`
Expected: FAIL — componentes não existem; o `FocusView` não tem as seções.

- [ ] **Step 3: Implement**

`src/newtab/components/FocusTriage.svelte`:

```svelte
<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { plural, t } from '@/lib/i18n';
  import type { Link, Workspace } from '@/lib/types';
  import type { TriageItem } from '@/lib/recommend/triage';
  import { shortDate } from '@/lib/recommend/dates';
  import { isEditable } from '../shortcuts';
  import { TRIAGE_KEYS, collectionPath } from '../next-up-labels';

  export let items: TriageItem[];
  export let workspaces: Workspace[] = [];
  /** False while a dialog or the search is open: keys 1–4 then belong to it. */
  export let keyboard = true;

  const dispatch = createEventDispatcher<{
    keep: Link;
    discard: Link;
    reference: Link;
    complete: Link;
    open: { link: Link; newTab: boolean };
  }>();

  const DECISIONS = [
    { key: '1', event: 'keep', label: 'triage_keep' },
    { key: '2', event: 'discard', label: 'progress_discard' },
    { key: '3', event: 'reference', label: 'progress_mark_reference' },
    { key: '4', event: 'complete', label: 'triage_already_done' },
  ] as const;

  type Decision = (typeof DECISIONS)[number]['event'];

  $: current = items[0];

  function decide(decision: Decision): void {
    if (current !== undefined) {
      dispatch(decision, current.link);
    }
  }

  function handleKeydown(event: KeyboardEvent): void {
    if (!keyboard || current === undefined || isEditable(event.target) || event.metaKey || event.ctrlKey || event.altKey) {
      return;
    }
    const decision = DECISIONS.find((d) => d.key === event.key);
    if (decision !== undefined) {
      event.preventDefault();
      decide(decision.event);
    }
  }
</script>

<svelte:window on:keydown={handleKeydown} />

<section id="focus-triage" class="focus-section" aria-labelledby="focus-triage-title">
  <h2 id="focus-triage-title">{t('focus_triage_title')}</h2>
  {#if current === undefined}
    <p class="focus-empty">{t('triage_empty')}</p>
  {:else}
    <p class="triage-left">{plural(items.length, 'triage_left_one', 'triage_left_many')}</p>
    <article class="triage-card">
      <p class="triage-reason">{t(TRIAGE_KEYS[current.reason])}</p>
      <button type="button" class="triage-title" on:click={() => dispatch('open', { link: current.link, newTab: true })}>
        {current.link.title || current.link.url}
      </button>
      <p class="triage-meta">
        {#if current.collection !== undefined}{collectionPath(current.collection, workspaces)} · {/if}{t('triage_saved_on', shortDate(current.link.createdAt))}
      </p>
      <div class="triage-decisions">
        {#each DECISIONS as decision (decision.key)}
          <button type="button" on:click={() => decide(decision.event)}>
            <kbd>{decision.key}</kbd> {t(decision.label)}
          </button>
        {/each}
      </div>
    </article>
  {/if}
</section>

<style>
  .triage-left {
    margin: 0 0 var(--space-2);
    font-size: var(--text-xs);
    color: var(--text-tertiary);
  }

  .triage-card {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    padding: var(--space-4);
    background: var(--surface-elevated);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-lg);
  }

  .triage-reason {
    margin: 0;
    font-size: var(--text-sm);
    color: var(--accent-primary);
  }

  .triage-title {
    padding: 0;
    border: none;
    background: transparent;
    color: var(--text-primary);
    font-family: var(--font-body);
    font-size: var(--text-md);
    font-weight: 500;
    text-align: left;
    cursor: pointer;
    word-break: break-word;
  }

  .triage-title:hover {
    color: var(--accent-primary);
  }

  .triage-meta {
    margin: 0;
    font-size: var(--text-xs);
    color: var(--text-tertiary);
  }

  .triage-decisions {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
    margin-top: var(--space-2);
  }

  .triage-decisions button {
    padding: var(--space-1) var(--space-3);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-md);
    background: transparent;
    color: var(--text-primary);
    font-family: var(--font-body);
    font-size: var(--text-sm);
    cursor: pointer;
  }

  .triage-decisions button:hover {
    border-color: var(--accent-primary);
  }

  kbd {
    font-family: var(--font-mono);
    font-size: var(--text-xs);
    color: var(--text-tertiary);
  }
</style>
```

`src/newtab/components/FocusFronts.svelte`:

```svelte
<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { plural, t } from '@/lib/i18n';
  import type { Collection, Workspace } from '@/lib/types';
  import { INBOX_COLLECTION_ID } from '@/lib/types';
  import { advanceReason, type Front } from '@/lib/recommend/engine';
  import { collectionPath, reasonText } from '../next-up-labels';

  export let fronts: Front[];
  export let workspaces: Workspace[] = [];

  const dispatch = createEventDispatcher<{
    collectionFocus: { collection: Collection; value: boolean };
    collectionReference: { collection: Collection; value: boolean };
  }>();
</script>

<section id="focus-fronts" class="focus-section" aria-labelledby="focus-fronts-title">
  <h2 id="focus-fronts-title">{t('focus_fronts_title')}</h2>
  {#if fronts.length === 0}
    <p class="focus-empty">{t('nextup_empty')}</p>
  {:else}
    <ul class="fronts">
      {#each fronts as front (front.collection.id)}
        <li class="front">
          <span class="front-path">{collectionPath(front.collection, workspaces)}</span>
          <span class="front-count">{plural(front.eligible.length, 'focus_front_count_one', 'focus_front_count_many')}</span>
          <span class="front-reason">{reasonText(advanceReason(front))}</span>
          <span class="front-actions">
            <button
              type="button"
              aria-pressed={front.collection.focus === true}
              on:click={() => dispatch('collectionFocus', { collection: front.collection, value: front.collection.focus !== true })}
            >{front.collection.focus === true ? t('column_unpin_focus') : t('column_pin_focus')}</button>
            {#if front.collection.id !== INBOX_COLLECTION_ID}
              <button
                type="button"
                on:click={() => dispatch('collectionReference', { collection: front.collection, value: true })}
              >{t('column_mark_reference')}</button>
            {/if}
          </span>
        </li>
      {/each}
    </ul>
  {/if}
</section>

<style>
  .fronts {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .front {
    display: grid;
    grid-template-columns: minmax(0, 2fr) auto minmax(0, 1.5fr) auto;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-2) var(--space-3);
    border-bottom: 1px solid var(--border-subtle);
    font-size: var(--text-sm);
  }

  .front-path {
    color: var(--text-primary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .front-count,
  .front-reason {
    color: var(--text-tertiary);
    font-size: var(--text-xs);
  }

  .front-actions {
    display: flex;
    gap: var(--space-2);
  }

  .front-actions button {
    padding: var(--space-1) var(--space-2);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-md);
    background: transparent;
    color: var(--text-secondary);
    font-family: var(--font-body);
    font-size: var(--text-xs);
    cursor: pointer;
  }

  .front-actions button[aria-pressed='true'] {
    border-color: var(--accent-primary);
    color: var(--accent-primary);
  }
</style>
```

`src/newtab/components/FocusCompleted.svelte`:

```svelte
<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { t } from '@/lib/i18n';
  import type { Link } from '@/lib/types';
  import { shortDate } from '@/lib/recommend/dates';
  import { completedHistory } from '@/lib/recommend/progress';

  export let links: Link[];

  const dispatch = createEventDispatcher<{
    restore: Link;
    open: { link: Link; newTab: boolean };
  }>();

  $: history = completedHistory(links);
</script>

<section id="focus-completed" class="focus-section" aria-labelledby="focus-completed-title">
  <h2 id="focus-completed-title">{t('focus_completed_title')}</h2>
  {#if history.length === 0}
    <p class="focus-empty">{t('focus_completed_empty')}</p>
  {:else}
    {#each history as group (group.week)}
      <h3 class="completed-week">{t('focus_week_of', shortDate(group.start))}</h3>
      <ul class="completed-list">
        {#each group.links as link (link.id)}
          <li class="completed-row" data-link-id={link.id}>
            <button type="button" class="completed-title" on:click={() => dispatch('open', { link, newTab: true })}>
              {link.title || link.url}
            </button>
            <span class="completed-date">{shortDate(link.completedAt ?? 0)}</span>
            <button type="button" class="completed-undo" on:click={() => dispatch('restore', link)}>{t('progress_undo')}</button>
          </li>
        {/each}
      </ul>
    {/each}
  {/if}
</section>

<style>
  .completed-week {
    margin: var(--space-3) 0 var(--space-1);
    font-size: var(--text-xs);
    font-weight: 600;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .completed-list {
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .completed-row {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-1) var(--space-2);
    border-radius: var(--radius-md);
    font-size: var(--text-sm);
  }

  .completed-row:global(.revealed) {
    background: var(--accent-soft);
    box-shadow: 0 0 0 1px var(--accent-primary);
  }

  .completed-title {
    flex: 1;
    min-width: 0;
    padding: 0;
    border: none;
    background: transparent;
    color: var(--text-primary);
    font-family: var(--font-body);
    font-size: var(--text-sm);
    text-align: left;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    cursor: pointer;
  }

  .completed-date {
    font-size: var(--text-xs);
    color: var(--text-tertiary);
  }

  .completed-undo {
    padding: 0 var(--space-2);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-sm);
    background: transparent;
    color: var(--text-secondary);
    font-family: var(--font-body);
    font-size: var(--text-xs);
    cursor: pointer;
  }
</style>
```

**`src/newtab/components/FocusView.svelte`**:

1. Imports: acrescente `import type { Workspace } from '@/lib/types';` (junto do import de tipos existente), `import FocusTriage from './FocusTriage.svelte';`, `import FocusFronts from './FocusFronts.svelte';`, `import FocusCompleted from './FocusCompleted.svelte';`.
2. Props novas:

```ts
  export let workspaces: Workspace[] = [];
  export let keyboard = true;
```

3. Depois de `<FocusSession …/>`:

```svelte
  <FocusTriage items={queue.triage} {workspaces} {keyboard} on:keep on:discard on:reference on:complete on:open />
  <FocusFronts fronts={queue.fronts} {workspaces} on:collectionFocus on:collectionReference />
  <FocusCompleted {links} on:restore on:open />
```

**`src/newtab/App.svelte`**:

1. Import de tipos: `import type { Collection, Link } from '@/lib/types';`.
2. Handlers, depois de `handleReveal`:

```ts
  async function handleKeep(event: CustomEvent<Link>): Promise<void> {
    await progress.keepLink(event.detail);
  }

  async function handleRestore(event: CustomEvent<Link>): Promise<void> {
    await progress.restoreLink(event.detail);
    successMessage = t('success_link_restored');
  }

  async function handleCollectionFocus(event: CustomEvent<{ collection: Collection; value: boolean }>): Promise<void> {
    await progress.setCollectionFocus(event.detail.collection, event.detail.value);
  }

  async function handleCollectionReference(event: CustomEvent<{ collection: Collection; value: boolean }>): Promise<void> {
    await progress.setCollectionReference(event.detail.collection, event.detail.value);
  }
```

3. `handleSearchReveal` — um link concluído aparece no histórico do Foco:

```ts
  async function handleSearchReveal(event: CustomEvent<Link>): Promise<void> {
    showSearch = false;
    const link = event.detail;
    if (link.completedAt !== undefined) {
      view = 'focus';
      await revealLink(link.id);
      return;
    }
    await revealOnBoard(link);
  }
```

4. `<FocusView …>` completo:

```svelte
        <FocusView
          {queue}
          links={$linksStore.links}
          stats={$activityStore.stats}
          {now}
          workspaces={$workspacesStore.workspaces}
          keyboard={!showOnboarding && !showSearch && !showSettings && !showCreateCollection && linkToRemove === null}
          on:open={handleOpen}
          on:complete={handleComplete}
          on:keep={handleKeep}
          on:discard={handleDiscard}
          on:reference={handleMarkReference}
          on:restore={handleRestore}
          on:collectionFocus={handleCollectionFocus}
          on:collectionReference={handleCollectionReference}
        />
```

Locales — `en`:

```json
  "focus_triage_title": { "message": "Triage" },
  "focus_fronts_title": { "message": "Fronts" },
  "focus_completed_title": { "message": "Completed" },
  "focus_completed_empty": { "message": "Completed links show up here, and you can undo." },
  "focus_week_of": { "message": "Week of $1", "placeholders": { "date": { "content": "$1" } } },
  "focus_front_count_one": { "message": "1 pending" },
  "focus_front_count_many": { "message": "$1 pending", "placeholders": { "count": { "content": "$1" } } },
  "triage_reason_skipped": { "message": "You skipped this 3 times. Is it still worth it?" },
  "triage_reason_snoozed": { "message": "Snoozed 3 times. Is it still worth it?" },
  "triage_reason_revisited": { "message": "You keep coming back without completing it. Make it a reference?" },
  "triage_reason_stale": { "message": "Saved over 60 days ago with no decision" },
  "triage_keep": { "message": "Still worth it" },
  "triage_already_done": { "message": "Already done" },
  "triage_saved_on": { "message": "Saved on $1", "placeholders": { "date": { "content": "$1" } } },
  "triage_left_one": { "message": "1 left" },
  "triage_left_many": { "message": "$1 left", "placeholders": { "count": { "content": "$1" } } },
  "triage_empty": { "message": "Nothing to triage." },
  "progress_undo": { "message": "Undo" },
  "success_link_restored": { "message": "Back in its column" }
```

`pt_BR`:

```json
  "focus_triage_title": { "message": "Triagem" },
  "focus_fronts_title": { "message": "Frentes" },
  "focus_completed_title": { "message": "Concluídos" },
  "focus_completed_empty": { "message": "Os links concluídos aparecem aqui, e dá para desfazer." },
  "focus_week_of": { "message": "Semana de $1", "placeholders": { "date": { "content": "$1" } } },
  "focus_front_count_one": { "message": "1 pendente" },
  "focus_front_count_many": { "message": "$1 pendentes", "placeholders": { "count": { "content": "$1" } } },
  "triage_reason_skipped": { "message": "Você pulou isto 3 vezes. Ainda vale?" },
  "triage_reason_snoozed": { "message": "Adiado 3 vezes. Ainda vale?" },
  "triage_reason_revisited": { "message": "Você volta aqui e não conclui. Virar referência?" },
  "triage_reason_stale": { "message": "Salvo há mais de 60 dias, sem decisão" },
  "triage_keep": { "message": "Ainda vale" },
  "triage_already_done": { "message": "Já concluí" },
  "triage_saved_on": { "message": "Salvo em $1", "placeholders": { "date": { "content": "$1" } } },
  "triage_left_one": { "message": "Falta 1" },
  "triage_left_many": { "message": "Faltam $1", "placeholders": { "count": { "content": "$1" } } },
  "triage_empty": { "message": "Nada para triar." },
  "progress_undo": { "message": "Desfazer" },
  "success_link_restored": { "message": "De volta à coluna" }
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `docker compose run --rm app npx vitest run src/test/components src/test/newtab`
Expected: PASS.

- [ ] **Step 5: Lint, type-check and commit**

Run: `docker compose run --rm app npx eslint src/newtab/components/FocusTriage.svelte src/newtab/components/FocusFronts.svelte src/newtab/components/FocusCompleted.svelte src/newtab/components/FocusView.svelte src/newtab/App.svelte`
Expected: nenhum erro novo.

Run: `docker compose run --rm app sh -c "npx tsc --noEmit 2>&1 | grep -E 'src/newtab/'"`
Expected: nenhuma linha nova.

```bash
git add src/newtab/components/FocusTriage.svelte src/newtab/components/FocusFronts.svelte src/newtab/components/FocusCompleted.svelte src/newtab/components/FocusView.svelte src/newtab/App.svelte public/_locales/en/messages.json public/_locales/pt_BR/messages.json src/test/components/FocusTriage.test.ts src/test/components/FocusFronts.test.ts src/test/components/FocusCompleted.test.ts src/test/components/FocusView.test.ts
git commit -m "feat(focus): triage with keys 1-4, fronts with focus and reference, completed history with undo

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 14: Popup e busca

**Files:**
- Modify: `src/popup/App.svelte`
- Modify: `src/newtab/components/SearchPanel.svelte`
- Modify: `public/_locales/en/messages.json`, `public/_locales/pt_BR/messages.json`
- Test: `src/test/components/App.test.ts` (popup), `src/test/components/SearchPanel.test.ts`

**Interfaces:**
- Consumes: `completeLink`, `restoreLink`, `recordOpen` (Task 9), `shortDate` (Task 2), `getCurrentTab` (`src/lib/tabs.ts`).
- Produces: chaves i18n `popup_saved_in`, `popup_completed_on`, `search_completed_badge`.

- [ ] **Step 1: Write the failing tests**

Em `src/test/components/SearchPanel.test.ts`, no fim do `describe`:

```ts
  it('marks completed links', async () => {
    const done = createMockLink({
      id: 'done', title: 'Hermes finished talk', url: 'https://example.com/done', collectionId: 'hermes', createdAt: 5, completedAt: 6,
    });
    const { input } = setup({ links: [...links, done] });

    await type(input, 'finished');

    expect(screen.getByText('search_completed_badge')).toBeInTheDocument();
  });
```

Em `src/test/components/App.test.ts` (popup), acrescente `import * as storage from '@/lib/storage';` aos imports e, no fim do `describe('App Component', …)`:

```ts
  describe('when the current tab is a saved link', () => {
    const saved = createMockLink({ id: 'saved', url: 'https://saved.example/post', title: 'Saved post', collectionId: 'inbox' });

    async function renderOn(links: Link[]): Promise<void> {
      chromeMock.tabs.query.mockResolvedValue([{ url: 'https://saved.example/post', title: 'Saved post' }]);
      setStoreState({});
      render(App);
      await waitFor(() => expect(chromeMock.tabs.query).toHaveBeenCalled());
      await act(() => setStoreState({ links }));
    }

    afterEach(() => {
      chromeMock.tabs.query.mockImplementation(() => Promise.resolve([]));
    });

    it('offers to complete it', async () => {
      await renderOn([saved]);

      expect(await screen.findByText('popup_saved_in')).toBeInTheDocument();
      await fireEvent.click(screen.getByRole('button', { name: /progress_complete/ }));

      expect(storage.patchLinkState).toHaveBeenCalledWith('saved', { completedAt: expect.any(Number), snoozedUntil: null });
    });

    it('offers to undo when it is already completed', async () => {
      await renderOn([{ ...saved, completedAt: 1 }]);

      expect(await screen.findByText('popup_completed_on')).toBeInTheDocument();
      await fireEvent.click(screen.getByRole('button', { name: 'progress_undo' }));

      expect(storage.patchLinkState).toHaveBeenCalledWith('saved', { completedAt: null });
    });

    it('acts on the pending copy when the page was saved twice', async () => {
      await renderOn([{ ...saved, id: 'old-copy', completedAt: 1 }, saved]);

      await fireEvent.click(await screen.findByRole('button', { name: /progress_complete/ }));

      expect(vi.mocked(storage.patchLinkState).mock.calls[0][0]).toBe('saved');
    });
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `docker compose run --rm app npx vitest run src/test/components/App.test.ts src/test/components/SearchPanel.test.ts`
Expected: FAIL — não há `popup_saved_in` nem `search_completed_badge`.

- [ ] **Step 3: Implement**

**`src/newtab/components/SearchPanel.svelte`** — em `.hit-meta`, depois de `.hit-domain`:

```svelte
                {#if hit.link.completedAt !== undefined}
                  <span class="hit-completed">{t('search_completed_badge')}</span>
                {/if}
```

Estilo:

```css
  .hit-completed {
    color: var(--semantic-success);
  }
```

**`src/popup/App.svelte`**:

1. Imports: acrescente

```ts
  import { completeLink, recordOpen, restoreLink } from '@/lib/stores/progress';
  import { shortDate } from '@/lib/recommend/dates';
```

2. Estado, depois de `let translatedQuery …`:

```ts
  let currentUrl: string | null = null;

  /** The saved link for this tab; the pending copy wins when the page was saved twice. */
  function findSaved(links: Link[], url: string | null): Link | undefined {
    if (url === null) {
      return undefined;
    }
    const matches = links.filter((link) => link.url === url);
    return matches.find((link) => link.completedAt === undefined) ?? matches[0];
  }

  function collectionName(link: Link): string {
    const collection = $linksStore.collections.find((c) => c.id === link.collectionId);
    return collection === undefined ? '' : getCollectionDisplayName(collection);
  }

  async function handleCompleteHere(link: Link): Promise<void> {
    await completeLink(link);
    successMessage = t('success_link_completed');
  }

  $: savedHere = findSaved($linksStore.links, currentUrl);
```

3. `totalLinks` ignora concluídos:

```ts
  $: totalLinks = $linksStore.links.filter((link) => link.completedAt === undefined).length;
```

4. No `onMount`, depois do `Promise.all(…)`: `currentUrl = (await getCurrentTab())?.url ?? null;`
5. `handleOpenLink`, primeira linha: `await recordOpen(link);`
6. Markup, logo antes de `<!-- Save Section -->`:

```svelte
    {#if savedHere !== undefined}
      <div class="saved-here" role="status">
        {#if savedHere.completedAt === undefined}
          <span class="saved-here-text">{t('popup_saved_in', collectionName(savedHere))}</span>
          <button type="button" class="saved-here-action" on:click={() => handleCompleteHere(savedHere)}>
            ✓ {t('progress_complete')}
          </button>
        {:else}
          <span class="saved-here-text">{t('popup_completed_on', shortDate(savedHere.completedAt))}</span>
          <button type="button" class="saved-here-action" on:click={() => restoreLink(savedHere)}>{t('progress_undo')}</button>
        {/if}
      </div>
    {/if}
```

O nome acessível do botão de concluir é "✓ progress_complete" nos testes, por isso eles procuram `/progress_complete/`. Estilos:

```css
  .saved-here {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-2);
    margin: 0 var(--space-4) var(--space-3);
    padding: var(--space-2) var(--space-3);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-md);
    font-size: var(--text-sm);
  }

  .saved-here-text {
    color: var(--text-secondary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .saved-here-action {
    flex-shrink: 0;
    padding: var(--space-1) var(--space-2);
    border: 1px solid var(--accent-primary);
    border-radius: var(--radius-md);
    background: var(--accent-soft);
    color: var(--accent-primary);
    font-family: var(--font-body);
    font-size: var(--text-xs);
    cursor: pointer;
  }
```

7. Nos resultados da busca do popup, dentro de `.search-hit-text`, depois de `.search-hit-path`:

```svelte
              {#if hit.link.completedAt !== undefined}
                <span class="search-hit-path">{t('search_completed_badge')}</span>
              {/if}
```

Locales — `en`:

```json
  "popup_saved_in": { "message": "Saved in $1", "placeholders": { "collection": { "content": "$1" } } },
  "popup_completed_on": { "message": "Completed on $1", "placeholders": { "date": { "content": "$1" } } },
  "search_completed_badge": { "message": "completed" }
```

`pt_BR`:

```json
  "popup_saved_in": { "message": "Salvo em $1", "placeholders": { "collection": { "content": "$1" } } },
  "popup_completed_on": { "message": "Concluído em $1", "placeholders": { "date": { "content": "$1" } } },
  "search_completed_badge": { "message": "concluído" }
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `docker compose run --rm app npx vitest run src/test/components/App.test.ts src/test/components/SearchPanel.test.ts`
Expected: PASS.

- [ ] **Step 5: Lint and commit**

Run: `docker compose run --rm app npx eslint src/popup/App.svelte src/newtab/components/SearchPanel.svelte`
Expected: nenhum erro novo.

```bash
git add src/popup/App.svelte src/newtab/components/SearchPanel.svelte public/_locales/en/messages.json public/_locales/pt_BR/messages.json src/test/components/App.test.ts src/test/components/SearchPanel.test.ts
git commit -m "feat(popup): complete or undo the saved link of the current tab; search marks completed links

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 15: Configurações

**Files:**
- Modify: `src/newtab/components/SettingsModal.svelte`
- Modify: `public/_locales/en/messages.json`, `public/_locales/pt_BR/messages.json`
- Test: `src/test/components/SettingsModal.test.ts` (novo)

**Interfaces:**
- Consumes: `settingsStore.setShowNextUp` (Task 11), `activityStore.clear` (Task 9).
- Produces: chaves i18n `settings_nextup_title`, `settings_nextup_description`, `settings_nextup_toggle_label`, `settings_usage_clear`, `settings_usage_description`, `settings_usage_confirm`, `success_usage_cleared`.

- [ ] **Step 1: Write the failing test**

`src/test/components/SettingsModal.test.ts`:

```ts
/**
 * Settings: the next up strip and the usage data.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import SettingsModal from '@/newtab/components/SettingsModal.svelte';
import { settingsStore } from '@/lib/stores/settings';
import * as storage from '@/lib/storage';
import { DEFAULT_SETTINGS } from '@/lib/types';
const { createStorageMock } = await vi.hoisted(() => import('../mocks/storage'));

vi.mock('@/lib/storage', () => createStorageMock());
vi.mock('@/lib/ai/translator', () => ({
  getTranslationAvailability: vi.fn(() => Promise.resolve('unavailable')),
  downloadTranslation: vi.fn(() => Promise.resolve()),
  topicSearchView: vi.fn(() => 'unavailable'),
}));

describe('SettingsModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    settingsStore.set({ settings: { ...DEFAULT_SETTINGS }, loading: false, error: null, pendingLocalUpdate: false });
  });

  it('turns the next up strip off', async () => {
    render(SettingsModal);

    await fireEvent.click(screen.getByRole('button', { name: 'settings_nextup_toggle_label' }));

    expect(storage.updateSettings).toHaveBeenCalledWith({ showNextUp: false });
  });

  it('clears usage data only after confirming', async () => {
    render(SettingsModal);

    await fireEvent.click(screen.getByRole('button', { name: 'settings_usage_clear' }));
    expect(storage.clearUsageData).not.toHaveBeenCalled();
    await fireEvent.click(screen.getByRole('button', { name: 'common_delete' }));

    await waitFor(() => expect(storage.clearUsageData).toHaveBeenCalledTimes(1));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `docker compose run --rm app npx vitest run src/test/components/SettingsModal.test.ts`
Expected: FAIL — não há botão `settings_nextup_toggle_label`.

- [ ] **Step 3: Implement**

Em `src/newtab/components/SettingsModal.svelte`:

1. Imports: `import { activityStore } from '@/lib/stores/activity';`.
2. Estado e funções, depois de `let showToast = false;`:

```ts
  let confirmClearUsage = false;

  async function toggleNextUp(): Promise<void> {
    await settingsStore.setShowNextUp(!settings.showNextUp);
  }

  async function handleClearUsage(): Promise<void> {
    confirmClearUsage = false;
    await activityStore.clear();
    showToastMessage(t('success_usage_cleared'), 'success');
  }
```

3. Markup — depois do bloco da busca por assunto (antes do `<div class="setting-divider"></div>` que precede os atalhos):

```svelte
      <div class="setting-divider"></div>

      <div class="setting-item">
        <div class="setting-info">
          <span class="setting-label">{t('settings_nextup_title')}</span>
          <span class="setting-description">{t('settings_nextup_description')}</span>
        </div>
        <button
          type="button"
          class="toggle"
          class:active={settings.showNextUp}
          on:click={toggleNextUp}
          aria-pressed={settings.showNextUp}
          aria-label={t('settings_nextup_toggle_label')}
        >
          <span class="toggle-track">
            <span class="toggle-thumb"></span>
          </span>
        </button>
      </div>
```

4. Na seção de dados, depois do item de importar (antes do `<input type="file" …>`):

```svelte
        <div class="setting-item">
          <div class="setting-info">
            <span class="setting-label">{t('settings_usage_clear')}</span>
            <span class="setting-description">{t('settings_usage_description')}</span>
          </div>
          <button
            type="button"
            class="btn-action"
            on:click={() => (confirmClearUsage = true)}
            aria-label={t('settings_usage_clear')}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
            </svg>
          </button>
        </div>
```

5. Depois do `{#if showConfirmDialog} … {/if}`:

```svelte
{#if confirmClearUsage}
  <ConfirmDialog
    message={t('settings_usage_confirm')}
    confirmText={t('common_delete')}
    cancelText={t('common_cancel')}
    on:confirm={handleClearUsage}
    on:cancel={() => (confirmClearUsage = false)}
  />
{/if}
```

Locales — `en`:

```json
  "settings_nextup_title": { "message": "Next up on the new tab" },
  "settings_nextup_description": { "message": "Suggests what to open, read or solve next among your saved links" },
  "settings_nextup_toggle_label": { "message": "Turn next up on or off" },
  "settings_usage_clear": { "message": "Clear usage data" },
  "settings_usage_description": { "message": "What you opened, completed or snoozed, used only for the suggestions on this device. Your links stay." },
  "settings_usage_confirm": { "message": "Clear usage data? Your links stay, and suggestions start learning again." },
  "success_usage_cleared": { "message": "Usage data cleared" }
```

`pt_BR`:

```json
  "settings_nextup_title": { "message": "Próximos passos na nova aba" },
  "settings_nextup_description": { "message": "Sugere o que abrir, ler ou resolver em seguida entre os links salvos" },
  "settings_nextup_toggle_label": { "message": "Ligar ou desligar os próximos passos" },
  "settings_usage_clear": { "message": "Apagar dados de uso" },
  "settings_usage_description": { "message": "O que você abriu, concluiu ou adiou, usado só para as sugestões neste aparelho. Os links ficam." },
  "settings_usage_confirm": { "message": "Apagar os dados de uso? Os links continuam, e as sugestões voltam a aprender do zero." },
  "success_usage_cleared": { "message": "Dados de uso apagados" }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `docker compose run --rm app npx vitest run src/test/components/SettingsModal.test.ts`
Expected: PASS.

- [ ] **Step 5: Lint and commit**

Run: `docker compose run --rm app npx eslint src/newtab/components/SettingsModal.svelte`
Expected: nenhum erro novo.

```bash
git add src/newtab/components/SettingsModal.svelte public/_locales/en/messages.json public/_locales/pt_BR/messages.json src/test/components/SettingsModal.test.ts
git commit -m "feat(settings): turn next up off and clear usage data

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 16: Documentação e verificação final

**Files:**
- Modify: `docs/privacy-policy.md`, `docs/privacy-policy.pt.md`
- Modify: `CLAUDE.md` (só os trechos desta branch)

- [ ] **Step 1: Privacy policy**

Em `docs/privacy-policy.pt.md`, depois da seção "## Busca por assunto (tradução no próprio computador)":

```markdown
## Próximos passos e Foco (recomendações)

Para sugerir o que abrir, ler ou resolver em seguida, o TabAla guarda no seu computador, junto dos links:

- quando você concluiu, adiou ou marcou um link como referência, e quando respondeu "ainda vale" na triagem;
- quantas vezes e em que dias você abriu um link salvo pelo próprio TabAla;
- em que dias a faixa "Próximos passos" mostrou cada link, e contagens por semana (quantos foram mostrados, abertos, adiados, descartados).

Esses dados ficam só em `chrome.storage.local`, nunca saem do navegador e não entram no arquivo de exportação. Você pode apagá-los em Configurações → Dados → "Apagar dados de uso"; os links continuam. A faixa pode ser desligada em Configurações.
```

Em `docs/privacy-policy.md`, depois da seção equivalente da busca por assunto:

```markdown
## Next up and Focus (suggestions)

To suggest what to open, read or solve next, TabAla keeps on your computer, alongside your links:

- when you completed, snoozed or marked a link as reference, and when you answered "still worth it" in triage;
- how many times and on which days you opened a saved link through TabAla;
- on which days the "Next up" strip showed each link, and weekly counts (how many were shown, opened, snoozed, discarded).

This data stays in `chrome.storage.local`, never leaves the browser and is not included in exports. You can clear it in Settings → Data → "Clear usage data"; your links stay. The strip can be turned off in Settings.
```

- [ ] **Step 2: CLAUDE.md (só os trechos desta branch)**

Em `CLAUDE.md`, na interface `Link` da seção Entidades, depois de `tags?`:

```
  completedAt?: number; // concluído: sai do quadro, fica em Foco › Concluídos
  snoozedUntil?: number; // adiado até o início deste dia
  keptAt?: number;   // "ainda vale" na triagem
  reference?: boolean; // referência; false = pendente numa coleção de referência
```

Na seção Regras de Negócio, depois da linha **Busca**:

```
- **Próximos passos e Foco**: motor puro em src/lib/recommend (frentes = coleções, próximo link pela ordem da coluna, vagas continuar/avançar/retomar, triagem, sessão). Um link feito é **concluído** (nunca "vencido"). Comportamento em `activity` e números em `recoStats`, chaves separadas de `links` e fora do export; botões chamam src/lib/stores/progress.ts
```

O `CLAUDE.md` tem mudanças de outra sessão no working tree. Coloque no índice só este trecho: gere a versão "HEAD + estas linhas" num arquivo temporário e grave-a no índice sem tocar o working tree:

```bash
git show HEAD:CLAUDE.md > "$TMPDIR/CLAUDE.head.md"
# aplique as duas edições acima em "$TMPDIR/CLAUDE.head.md" (e as mesmas no CLAUDE.md do working tree)
blob=$(git hash-object -w "$TMPDIR/CLAUDE.head.md")
git update-index --cacheinfo 100644,"$blob",CLAUDE.md
git diff --cached CLAUDE.md
```

Expected: o `git diff --cached` mostra só as linhas desta task.

- [ ] **Step 3: Verificação completa**

Run: `make test`
Expected: todos os arquivos passam (o teste de avaliação aparece como pulado).

Run: `make lint`
Expected: os mesmos 12 erros antigos, nenhum novo.

Run: `make build && du -sh dist`
Expected: build sem erro; `dist` abaixo de 500 KB.

Run: `git diff main -- src/manifest.json`
Expected: saída vazia (nenhuma permissão nova).

Run: `docker compose run --rm app node -e "for (const f of ['public/_locales/en/messages.json','public/_locales/pt_BR/messages.json']) JSON.parse(require('fs').readFileSync(f,'utf8')); const en=Object.keys(require('./public/_locales/en/messages.json')), pt=Object.keys(require('./public/_locales/pt_BR/messages.json')); console.log(en.filter(k=>!pt.includes(k)), pt.filter(k=>!en.includes(k)))"`
Expected: `[] []` (as duas línguas têm as mesmas chaves).

- [ ] **Step 4: Commit**

```bash
git add docs/privacy-policy.md docs/privacy-policy.pt.md
git commit -m "docs: privacy policy and project notes for next up and Focus

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

(O `CLAUDE.md` já está no índice pelo Step 2 e entra neste commit.)

- [ ] **Step 5: Teste manual no Chrome (roteiro para a pessoa)**

Recarregue a extensão em `chrome://extensions` (o `dist` novo) e confira:

1. A nova aba mostra "Próximos passos" com até 3 cards de coleções diferentes, cada um com papel, caminho, motivo, ação, título e esforço; recolher e reabrir fica gravado.
2. "✓ Concluir" num card da faixa e no card do quadro: o link some do quadro e da faixa; aparece em Foco › Concluídos; "Desfazer" devolve à coluna.
3. Adiar para amanhã: o card do quadro mostra "Até dd/mm" e o link sai da faixa.
4. Foco (ícone de alvo no topo do rail): progresso, sessão de 15/30/60 min com "Próximo" abrindo em nova aba, triagem com teclas 1–4 (e as teclas não agem com a busca ⌘K aberta), frentes com "Fixar como foco".
5. Popup numa página salva: "Salvo em … · ✓ Concluir"; numa página concluída: "Concluído em … · Desfazer".
6. Busca ⌘K: um link concluído aparece com o selo "concluído"; ⇧Enter leva ao Foco › Concluídos com a linha destacada.
7. Configurações: desligar a faixa; "Apagar dados de uso" pede confirmação e mantém os links.
