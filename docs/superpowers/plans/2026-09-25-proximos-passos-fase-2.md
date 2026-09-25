# Próximos passos e Foco — fase 2: plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** aprender com o que a pessoa realmente faz no navegador — visitas a links salvos por qualquer caminho, tempo ativo, a pergunta "concluído?" e o esforço aprendido — sem nenhuma permissão nova.

**Architecture:** o service worker ganha um rastreador (`src/background/activity.ts`) com dependências injetadas, que transforma eventos de `chrome.tabs`/`chrome.windows` em aberturas e visitas; a visita em curso fica em `chrome.storage.session`. O casamento de URL (`src/lib/url-match.ts`) é compartilhado com o popup. O motor passa a usar o esforço aprendido (mediana do tempo ativo dos concluídos) e põe a pergunta "concluído?" na vaga Continuar; a faixa mostra essa vaga como pergunta.

**Tech Stack:** Svelte 5 (sintaxe legada do repo), TypeScript, Vite + crxjs, Vitest, Chrome MV3 (`tabs`, `windows`, `action`, `storage.session`).

**Decisão deste plano sobre a spec §8.2:** em vez de um mapa URL → ids guardado em memória e invalidado quando `links` muda, o rastreador lê links, coleções, atividade e configurações do storage a cada evento e compara ali. Com ~170 links o custo é desprezível, o resultado é o mesmo, e não existe cache para ficar velho quando o service worker acorda.

**Spec:** `docs/superpowers/specs/2026-09-24-proximos-passos-design.md` — fase 2: §6.2 (Continuar com `askCompleteAt`), §6.3 (esforço aprendido), §7.1 (pergunta na faixa), §7.3 (casamento normalizado no popup), §7.4 (aprender com o que eu abro), §8, §9, §11 (testes da fase 2).

## Global Constraints

- Docker-first: nunca `npm`/`npx` no host. Um arquivo de teste: `docker compose run --rm app npx vitest run <arquivo>`. Suíte: `make test`. Lint dos arquivos tocados: `docker compose run --rm app npx eslint <arquivos>`. Tipos: `docker compose run --rm app sh -c "npx tsc --noEmit 2>&1 | grep -E '<regex>'"` — arquivos tocados não ganham erro (o TS2352 de `import-export.ts:159` é antigo). `make lint` fica nos 12 erros antigos.
- Imports novos usam `@/…`. Nenhuma dependência npm nova; `dist` abaixo de 500 KB (hoje 476 KB).
- **Nenhuma permissão nova** no `src/manifest.json` (`tabs` já existe; `storage.session` faz parte de `storage`; `chrome.action` e `chrome.windows` não pedem permissão).
- Componentes Svelte na sintaxe legada (`export let`, `$:`, `createEventDispatcher`).
- Texto de interface por `t()` com a chave em `public/_locales/en/messages.json` e `public/_locales/pt_BR/messages.json` (mesmo conjunto de chaves nas duas; `$1` com bloco `placeholders`).
- O estado feito é **concluído** (en *completed*), nunca "vencido".
- Gravação só por funções com `withDataLock`; nenhuma função travada chama outra travada. Web Locks existem no service worker.
- Abas anônimas nunca são lidas. URLs não salvas são comparadas em memória e descartadas. Nada sai do aparelho.
- O repositório é público: nada de dados pessoais em commit.
- Não colocar no índice as mudanças de outra sessão no working tree (`Dockerfile`, `docker-compose.yml`, `.github/workflows/release.yml`, `entrypoint.dev.sh`, `.serena/`, trechos alheios do `CLAUDE.md`). Sempre `git add <arquivos>`.
- Commits terminam com `Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>`.
- Branch: `feat/proximos-passos-fase-2` (a partir de `main` `94d3bf5`).

## Review Focus

- A mesma página aberta em duas janelas ou duas abas: só a aba ativa da janela em foco conta tempo; trocar de janela encerra uma visita e começa a outra, sem somar em dobro. → Task 4.
- O service worker é encerrado no meio de uma visita (MV3 faz isso em ~30 s de inatividade): ao acordar, a visita continua de `storage.session` e fechar a aba ainda a encerra. → Task 4.
- Aba esquecida aberta a noite toda: a visita soma no máximo 30 min. → Task 3.
- A mesma URL salva duas vezes (em duas coleções): as duas recebem a abertura e o tempo. → Task 4.
- Abrir pelo tabAla (que já registra a abertura) e o service worker ver a mesma aba carregar: conta uma abertura só. → Task 3.

---

### Task 1: Casamento de URL

**Files:**
- Create: `src/lib/url-match.ts`
- Modify: `src/popup/App.svelte` (`findSaved`)
- Test: `src/test/lib/url-match.test.ts`, `src/test/components/App.test.ts`

**Interfaces:**
- Produces: `normalizeUrl(url: string): string | null`, `sameUrl(a: string, b: string): boolean`.

- [ ] **Step 1: Write the failing tests**

`src/test/lib/url-match.test.ts`:

```ts
/**
 * URL matching between open tabs and saved links (spec §8.2).
 */
import { describe, it, expect } from 'vitest';
import { normalizeUrl, sameUrl } from '@/lib/url-match';

describe('normalizeUrl', () => {
  it.each([
    ['https://www.Example.com/Path/#section', 'example.com/Path'],
    ['http://example.com/a/', 'example.com/a'],
    ['https://example.com/', 'example.com/'],
    ['https://example.com:8080/a', 'example.com:8080/a'],
    ['https://example.com/a?utm_source=x&b=2&a=1&fbclid=z&gclid=g&ref=r&ref_src=s', 'example.com/a?a=1&b=2'],
    ['https://x.com/u/status/1?s=20', 'x.com/u/status/1'],
    ['https://twitter.com/u/status/1?s=20&t=abc', 'twitter.com/u/status/1?t=abc'],
    ['https://example.com/search?s=term', 'example.com/search?s=term'],
    ['https://www.youtube.com/watch?v=abc&t=42s&list=L', 'youtube.com/watch?v=abc'],
    ['https://m.youtube.com/watch?v=abc', 'youtube.com/watch?v=abc'],
    ['https://youtu.be/abc?si=xyz', 'youtube.com/watch?v=abc'],
    ['file:///Users/me/notes.html', 'file:///Users/me/notes.html'],
    ['chrome://newtab/', null],
    ['not a url', null],
  ])('%s -> %s', (url, expected) => {
    expect(normalizeUrl(url)).toBe(expected);
  });
});

describe('sameUrl', () => {
  it('matches across scheme, www, fragment and tracking', () => {
    expect(sameUrl('https://a.com/x', 'http://www.a.com/x/?utm_campaign=c#top')).toBe(true);
  });

  it('never matches pages it cannot read', () => {
    expect(sameUrl('chrome://newtab/', 'chrome://newtab/')).toBe(false);
  });
});
```

Em `src/test/components/App.test.ts`, dentro de `describe('when the current tab is a saved link', …)`:

```ts
    it('recognizes the page through tracking parameters and fragments', async () => {
      chromeMock.tabs.query.mockResolvedValue([{ url: 'https://saved.example/post?utm_source=news#top', title: 'Saved post' }] as never[]);
      setStoreState({});
      render(App);
      await waitFor(() => expect(chromeMock.tabs.query).toHaveBeenCalled());
      await act(() => setStoreState({ links: [saved] }));

      expect(await screen.findByText('popup_saved_in')).toBeInTheDocument();
    });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `docker compose run --rm app npx vitest run src/test/lib/url-match.test.ts src/test/components/App.test.ts`
Expected: FAIL — `@/lib/url-match` não existe; o popup não reconhece a URL com `utm_source`.

- [ ] **Step 3: Implement**

`src/lib/url-match.ts`:

```ts
/**
 * Matching open tabs to saved links (spec §8.2): scheme, www., fragment,
 * trailing slash and tracking parameters do not make a different page.
 */
const TRACKING_PARAMS = new Set(['fbclid', 'gclid', 'si', 'ref', 'ref_src']);
const SHARE_PARAM_HOSTS = new Set(['x.com', 'twitter.com']);
const YOUTUBE_HOSTS = new Set(['youtube.com', 'm.youtube.com']);

/** A comparable key for a page, or null for pages TabAla does not track. */
export function normalizeUrl(url: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (parsed.protocol === 'file:') {
    return `file://${parsed.pathname}`;
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return null;
  }
  const hostname = parsed.hostname.toLowerCase().replace(/^www\./, '');
  const host = parsed.port === '' ? hostname : `${hostname}:${parsed.port}`;
  const path = parsed.pathname.length > 1 ? parsed.pathname.replace(/\/+$/, '') : parsed.pathname;

  if (hostname === 'youtu.be' && path.length > 1) {
    return `youtube.com/watch?v=${path.slice(1)}`;
  }
  const video = parsed.searchParams.get('v');
  if (YOUTUBE_HOSTS.has(hostname) && path === '/watch' && video !== null) {
    return `youtube.com/watch?v=${video}`;
  }

  const params = [...parsed.searchParams.entries()]
    .filter(([key]) => !key.startsWith('utm_') && !TRACKING_PARAMS.has(key)
      && !(key === 's' && SHARE_PARAM_HOSTS.has(hostname)))
    .sort(([a, av], [b, bv]) => a.localeCompare(b) || av.localeCompare(bv));
  const query = params.length === 0 ? '' : `?${new URLSearchParams(params).toString()}`;
  return `${host}${path}${query}`;
}

export function sameUrl(a: string, b: string): boolean {
  const key = normalizeUrl(a);
  return key !== null && key === normalizeUrl(b);
}
```

Em `src/popup/App.svelte`: import `import { sameUrl } from '@/lib/url-match';` e, em `findSaved`, troque `links.filter((link) => link.url === url)` por `links.filter((link) => sameUrl(link.url, url))`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `docker compose run --rm app npx vitest run src/test/lib/url-match.test.ts src/test/components/App.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/url-match.ts src/popup/App.svelte src/test/lib/url-match.test.ts src/test/components/App.test.ts
git commit -m "feat(url): match tabs to saved links across scheme, www, fragments and tracking; the popup uses it

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Esforço aprendido

**Files:**
- Create: `src/lib/recommend/learned.ts`
- Modify: `src/lib/recommend/engine.ts` (`recommendation`, `Queue.effortOf`, `buildQueue`)
- Modify: `src/lib/recommend/session.ts`
- Test: `src/test/lib/recommend/learned.test.ts`, `src/test/lib/recommend/engine.test.ts`, `src/test/lib/recommend/session.test.ts`

**Interfaces:**
- Consumes: `linkKind` (`@/lib/link-kind`), `defaultEffort` (`./effort`).
- Produces:
  - `MIN_SAMPLES = 3`, `effortEstimator(links: Link[], activity: Activity): (link: Link) => number` (minutos, múltiplo de 5, mínimo 5).
  - `recommendation(link, collection, role, reason, effort?: number)` — sem `effort`, usa o padrão do tipo.
  - `Queue.effortOf: (link: Link) => number`.

- [ ] **Step 1: Write the failing tests**

`src/test/lib/recommend/learned.test.ts`:

```ts
/**
 * Learned effort: the user's own median time, after 3 completed links.
 */
import { describe, it, expect } from 'vitest';
import { effortEstimator } from '@/lib/recommend/learned';
import { EMPTY_ACTIVITY, type Activity, type Link } from '@/lib/types';
import { createMockLink } from '../../factories';

const MIN = 60_000;
const page = (id: string, collectionId: string, extra: Partial<Link> = {}): Link =>
  createMockLink({ id, url: `https://example.com/${id}`, collectionId, ...extra });
const spent = (minutes: number): Activity[string] => ({ ...EMPTY_ACTIVITY, activeMs: minutes * MIN });

describe('effortEstimator', () => {
  it('uses the default of the kind until there are 3 completed links', () => {
    const links = [page('d1', 'a', { completedAt: 1 }), page('d2', 'a', { completedAt: 1 }), page('next', 'a')];
    const estimate = effortEstimator(links, { d1: spent(30), d2: spent(30) });
    expect(estimate(links[2])).toBe(10);
  });

  it('uses the median of the same collection and kind, rounded to 5 minutes', () => {
    const links = [
      page('d1', 'a', { completedAt: 1 }), page('d2', 'a', { completedAt: 1 }), page('d3', 'a', { completedAt: 1 }), page('next', 'a'),
    ];
    const estimate = effortEstimator(links, { d1: spent(18), d2: spent(33), d3: spent(90) });
    expect(estimate(links[3])).toBe(35);
  });

  it('falls back to the same kind in any collection', () => {
    const links = [
      page('d1', 'b', { completedAt: 1 }), page('d2', 'c', { completedAt: 1 }), page('d3', 'c', { completedAt: 1 }), page('next', 'a'),
    ];
    const estimate = effortEstimator(links, { d1: spent(20), d2: spent(22), d3: spent(40) });
    expect(estimate(links[3])).toBe(20);
  });

  it('never goes below 5 minutes and ignores completions without time', () => {
    const links = [
      page('d1', 'a', { completedAt: 1 }), page('d2', 'a', { completedAt: 1 }), page('d3', 'a', { completedAt: 1 }),
      page('d4', 'a', { completedAt: 1 }), page('next', 'a'),
    ];
    const estimate = effortEstimator(links, { d1: spent(1), d2: spent(1), d3: spent(2) });
    expect(estimate(links[4])).toBe(5);
  });
});
```

Em `src/test/lib/recommend/engine.test.ts`, no fim do `describe`:

```ts
  it('uses the effort learned from completed links of the same collection', () => {
    const done = ['d1', 'd2', 'd3'].map((id) => link(id, 'a', { completedAt: daysAgo(20) }));
    const activity: Activity = Object.fromEntries(done.map((l) => [l.id, { ...EMPTY_ACTIVITY, activeMs: 25 * 60_000 }]));
    const [card] = buildQueue({ links: [...done, link('next', 'a')], collections: [col('a', 1)], activity, now }).slots;
    expect(card).toMatchObject({ link: { id: 'next' }, effort: 25 });
  });
```

Em `src/test/lib/recommend/session.test.ts`, no fim do `describe`:

```ts
  it('fits the session with the learned effort', () => {
    const done = ['d1', 'd2', 'd3'].map((id) => page(id, 'a', { completedAt: now - 20 * DAY }));
    const activity: Activity = Object.fromEntries(done.map((l) => [l.id, { ...EMPTY_ACTIVITY, activeMs: 20 * 60_000 }]));
    expect(session([...done, page('p1', 'a'), page('p2', 'a')], [col('a', 1)], 30, activity)).toEqual(['p1']);
  });
```

(Com o padrão de 10 min, a sessão de 30 teria `p1` e `p2`; com 20 min aprendidos, só `p1` cabe.)

- [ ] **Step 2: Run tests to verify they fail**

Run: `docker compose run --rm app npx vitest run src/test/lib/recommend`
Expected: FAIL — `learned` não existe; o card tem esforço 10; a sessão tem `['p1', 'p2']`.

- [ ] **Step 3: Implement**

`src/lib/recommend/learned.ts`:

```ts
/**
 * Learned effort (spec §6.3): the median active time of completed links of
 * the same collection and kind, then of the same kind; the default of the
 * kind until there are 3 samples.
 */
import type { Activity, Link } from '@/lib/types';
import { linkKind, type LinkKind } from '@/lib/link-kind';
import { defaultEffort } from './effort';

export const MIN_SAMPLES = 3;
const MINUTE = 60_000;

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function toMinutes(ms: number): number {
  return Math.max(5, Math.round(ms / MINUTE / 5) * 5);
}

function add<K>(map: Map<K, number[]>, key: K, value: number): void {
  const list = map.get(key);
  if (list === undefined) {
    map.set(key, [value]);
  } else {
    list.push(value);
  }
}

export function effortEstimator(links: Link[], activity: Activity): (link: Link) => number {
  const byCollection = new Map<string, number[]>();
  const byKind = new Map<LinkKind, number[]>();
  for (const link of links) {
    const ms = activity[link.id]?.activeMs ?? 0;
    if (link.completedAt === undefined || ms <= 0) {
      continue;
    }
    const kind = linkKind(link.url);
    add(byCollection, `${link.collectionId}|${kind}`, ms);
    add(byKind, kind, ms);
  }
  const enough = (list: number[] | undefined): number[] | undefined =>
    (list !== undefined && list.length >= MIN_SAMPLES ? list : undefined);

  return (link) => {
    const kind = linkKind(link.url);
    const samples = enough(byCollection.get(`${link.collectionId}|${kind}`)) ?? enough(byKind.get(kind));
    return samples === undefined ? defaultEffort(kind) : toMinutes(median(samples));
  };
}
```

`src/lib/recommend/engine.ts`:

1. Import: `import { effortEstimator } from './learned';`
2. `Queue` ganha:

```ts
  /** Minutes a link takes: learned from completed links, or the default of its kind. */
  effortOf: (link: Link) => number;
```

3. `recommendation`:

```ts
export function recommendation(
  link: Link, collection: Collection, role: SlotRole, reason: Reason, effort?: number
): Recommendation {
  const kind = linkKind(link.url);
  return { link, collection, role, reason, kind, action: linkAction(kind), effort: effort ?? defaultEffort(kind) };
}
```

4. `continueSlot` e `pickSlots` recebem `effortOf: (link: Link) => number` como último parâmetro e passam `effortOf(<link>)` como 5º argumento em toda chamada de `recommendation`.
5. Em `buildQueue`:

```ts
  const effortOf = effortEstimator(links, activity);
  const fronts = buildFronts(links, collections, activity, inTriage, now);
  return {
    slots: pickSlots(fronts, activity, now, effortOf),
    triage,
    fronts,
    size: fronts.reduce((total, front) => total + front.eligible.length, 0) + triage.length,
    effortOf,
  };
```

`src/lib/recommend/session.ts`: as duas chamadas `recommendation(link, front.collection, 'advance', advanceReason(front))` e `recommendation(front.eligible[0], …)` ganham `queue.effortOf(<link>)` como 5º argumento.

- [ ] **Step 4: Run tests to verify they pass**

Run: `docker compose run --rm app npx vitest run src/test/lib/recommend src/test/components`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/recommend/learned.ts src/lib/recommend/engine.ts src/lib/recommend/session.ts src/test/lib/recommend/learned.test.ts src/test/lib/recommend/engine.test.ts src/test/lib/recommend/session.test.ts
git commit -m "feat(recommend): effort learned from the time spent on completed links

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: Configuração e storage dos sinais

**Files:**
- Modify: `src/lib/types.ts` (`Settings.learnFromBrowsing`)
- Modify: `src/lib/stores/settings.ts` (`setLearnFromBrowsing`)
- Modify: `src/lib/storage/progress.ts`, `src/lib/storage/index.ts`
- Modify: `src/lib/stores/activity.ts`, `src/lib/stores/progress.ts`
- Modify: `src/test/mocks/storage.ts`
- Modify (literais de `Settings`): `src/test/stores/settings.test.ts`, `src/test/lib/storage.test.ts`
- Test: `src/test/lib/storage/progress.test.ts`, `src/test/stores/progress.test.ts`, `src/test/stores/settings.test.ts`

**Interfaces:**
- Produces:
  - `Settings.learnFromBrowsing: boolean` (padrão `true`); `settingsStore.setLearnFromBrowsing(enabled)`.
  - Storage: `OPEN_DEDUP_MS = 60_000`, `VISIT_CAP_MS = 1_800_000`, `recordBrowsingOpen(linkIds: string[], now: number): Promise<void>`, `recordVisit(linkIds: string[], elapsedMs: number, thresholds: Record<string, number> | null, now: number): Promise<void>`, `dismissAsk(linkId: string): Promise<void>`, `clearAsks(): Promise<void>`.
  - `activityStore.dismissAsk(linkId)`, `activityStore.clearAsks()`; ação `dismissAsk(link: Link)` em `src/lib/stores/progress.ts`.

- [ ] **Step 1: Write the failing tests**

Nos literais de `Settings` (os mesmos três lugares da fase 1: `customSettings` em `src/test/stores/settings.test.ts` e em `src/test/lib/storage.test.ts`, e a chamada `saveSettings({ … })`), acrescente `learnFromBrowsing: true`.

Em `src/test/stores/settings.test.ts`, dentro de `describe('next up', …)`:

```ts
    it('saves whether to learn from browsing', async () => {
      await settingsStore.setLearnFromBrowsing(false);
      expect(vi.mocked(storage.updateSettings)).toHaveBeenCalledWith({ learnFromBrowsing: false });
    });
```

Em `src/test/lib/storage/progress.test.ts`, acrescente aos imports de `@/lib/storage/progress`: `clearAsks, dismissAsk, recordBrowsingOpen, recordVisit`; e no fim do arquivo:

```ts
describe('browsing signals', () => {
  beforeEach(() => clearMockStorage());
  const MIN = 60_000;

  it('records an open seen in the browser, once per minute', async () => {
    await recordBrowsingOpen(['l1', 'l2'], now);
    await recordBrowsingOpen(['l1'], now + 30_000);

    const activity = await getActivity();
    expect(activity.l1.opens).toBe(1);
    expect(activity.l2.opens).toBe(1);
  });

  it('does not count again an open TabAla recorded a moment ago', async () => {
    await recordAction('l1', 'open', now);
    await recordBrowsingOpen(['l1'], now + 5_000);

    expect((await getActivity()).l1.opens).toBe(1);
  });

  it('counts opening a link the strip showed as acting on it', async () => {
    await recordShown(['l1'], [], 3, now);
    await recordBrowsingOpen(['l1'], now);

    expect((await getRecoStats())[week].acted).toBe(1);
  });

  it('adds the time of a visit, at most 30 minutes', async () => {
    await recordVisit(['l1'], 10 * MIN, null, now);
    await recordVisit(['l1'], 8 * 60 * MIN, null, now);

    expect((await getActivity()).l1.activeMs).toBe(40 * MIN);
  });

  it('asks "completed?" when a visit that ended reaches the threshold', async () => {
    await recordVisit(['l1', 'l2'], 6 * MIN, { l1: 5 * MIN, l2: 20 * MIN }, now);

    const activity = await getActivity();
    expect(activity.l1.askCompleteAt).toBe(now);
    expect(activity.l2.askCompleteAt).toBeUndefined();
  });

  it('"not yet" clears one question; turning learning off clears them all', async () => {
    await recordVisit(['l1', 'l2'], 6 * MIN, { l1: MIN, l2: MIN }, now);

    await dismissAsk('l1');
    expect((await getActivity()).l1.askCompleteAt).toBeUndefined();

    await clearAsks();
    expect((await getActivity()).l2.askCompleteAt).toBeUndefined();
    expect((await getActivity()).l2.activeMs).toBe(6 * MIN);
  });
});
```

Em `src/test/stores/progress.test.ts`, acrescente `dismissAsk` ao import de `@/lib/stores/progress` e, no `describe('progress actions')`:

```ts
  it('"not yet" dismisses the question about a link', async () => {
    await dismissAsk(link);
    expect(storage.dismissAsk).toHaveBeenCalledWith('l1');
  });
```

E em `src/test/mocks/storage.ts`, antes de `getErrorMessage`:

```ts
    recordBrowsingOpen: vi.fn(() => Promise.resolve()),
    recordVisit: vi.fn(() => Promise.resolve()),
    dismissAsk: vi.fn(() => Promise.resolve()),
    clearAsks: vi.fn(() => Promise.resolve()),
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `docker compose run --rm app npx vitest run src/test/lib/storage/progress.test.ts src/test/stores`
Expected: FAIL — funções inexistentes; `setLearnFromBrowsing` não é função.

- [ ] **Step 3: Implement**

`src/lib/types.ts` — em `Settings`, depois de `nextUpCollapsed`:

```ts
  /** Learn from the pages you open and the time you spend on them (service worker, this device only). */
  learnFromBrowsing: boolean;
```

e `learnFromBrowsing: true,` em `DEFAULT_SETTINGS`.

`src/lib/stores/settings.ts`: `setLearnFromBrowsing: (enabled: boolean) => Promise<void>;` no tipo; a função

```ts
  async function setLearnFromBrowsing(enabled: boolean): Promise<void> {
    await updateSettingsStore({ learnFromBrowsing: enabled });
  }
```

e `setLearnFromBrowsing,` no `return`.

`src/lib/storage/progress.ts`, no fim:

```ts
// Browsing signals (phase 2, written by the service worker)

/** An open TabAla recorded this recently is the same open the service worker sees. */
export const OPEN_DEDUP_MS = 60_000;
/** Without the `idle` permission a forgotten tab would count for hours. */
export const VISIT_CAP_MS = 30 * 60_000;

/** Opens seen in the browser, by any path; one per link per minute. */
export async function recordBrowsingOpen(linkIds: string[], now: number): Promise<void> {
  await withDataLock(async () => {
    const [activity, stats] = await Promise.all([getActivity(), getRecoStats()]);
    const next: Activity = { ...activity };
    let acted = 0;
    let changed = false;
    for (const id of linkIds) {
      const current = next[id] ?? EMPTY_ACTIVITY;
      if (current.lastOpenedAt !== undefined && now - current.lastOpenedAt < OPEN_DEDUP_MS) {
        continue;
      }
      if (current.shownDays.length > 0) {
        acted += 1;
      }
      next[id] = afterAction(current, 'open', now);
      changed = true;
    }
    if (!changed) {
      return;
    }
    await storage.setBatch(acted > 0 ? { activity: next, recoStats: bump(stats, now, { acted }) } : { activity: next });
  });
}

/**
 * Adds a visit's active time (at most 30 min). `thresholds` is set when the
 * visit ended by closing the tab or leaving the page: a link whose total
 * reaches its threshold gets the "completed?" question.
 */
export async function recordVisit(
  linkIds: string[], elapsedMs: number, thresholds: Record<string, number> | null, now: number
): Promise<void> {
  const added = Math.max(0, Math.min(elapsedMs, VISIT_CAP_MS));
  await withDataLock(async () => {
    const activity = await getActivity();
    const next: Activity = { ...activity };
    for (const id of linkIds) {
      const current = next[id] ?? EMPTY_ACTIVITY;
      const updated: LinkActivity = { ...current, activeMs: current.activeMs + added };
      const threshold = thresholds?.[id];
      if (threshold !== undefined && updated.activeMs >= threshold) {
        updated.askCompleteAt = now;
      }
      next[id] = updated;
    }
    await storage.set('activity', next);
  });
}

function withoutAsk(current: LinkActivity): LinkActivity {
  const { askCompleteAt: _askCompleteAt, ...rest } = current;
  return rest;
}

/** "Not yet": the question about this link goes away. */
export async function dismissAsk(linkId: string): Promise<void> {
  await withDataLock(async () => {
    const activity = await getActivity();
    const current = activity[linkId];
    if (current?.askCompleteAt === undefined) {
      return;
    }
    await storage.set('activity', { ...activity, [linkId]: withoutAsk(current) });
  });
}

/** Turning learning off clears every pending question. */
export async function clearAsks(): Promise<void> {
  await withDataLock(async () => {
    const activity = await getActivity();
    const next = Object.fromEntries(Object.entries(activity).map(([id, entry]) => [id, withoutAsk(entry)]));
    await storage.set('activity', next);
  });
}
```

`src/lib/storage/index.ts` — no bloco `// Recommendation space`, acrescente `recordBrowsingOpen,`, `recordVisit,`, `dismissAsk,`, `clearAsks,`.

`src/lib/stores/activity.ts`: importe `dismissAsk as storageDismissAsk` e `clearAsks as storageClearAsks` de `@/lib/storage`; no tipo devolvido, `dismissAsk: (linkId: string) => Promise<void>;` e `clearAsks: () => Promise<void>;`; no objeto devolvido:

```ts
    async dismissAsk(linkId: string): Promise<void> {
      await storageDismissAsk(linkId);
      await load();
    },
    async clearAsks(): Promise<void> {
      await storageClearAsks();
      await load();
    },
```

`src/lib/stores/progress.ts`, no fim:

```ts
/** "Not yet" to the "completed?" question. */
export async function dismissAsk(link: Link): Promise<void> {
  await activityStore.dismissAsk(link.id);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `docker compose run --rm app npx vitest run src/test/lib/storage src/test/lib/storage.test.ts src/test/stores`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/types.ts src/lib/stores/settings.ts src/lib/storage/progress.ts src/lib/storage/index.ts src/lib/stores/activity.ts src/lib/stores/progress.ts src/test/mocks/storage.ts src/test/stores/settings.test.ts src/test/lib/storage.test.ts src/test/lib/storage/progress.test.ts src/test/stores/progress.test.ts
git commit -m "feat(storage): browsing opens, visit time with a 30-minute cap and the completed? question

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: Rastreador de visitas

**Files:**
- Create: `src/background/activity.ts`
- Test: `src/test/background/activity.test.ts`

**Interfaces:**
- Consumes: `normalizeUrl` (Task 1), `effortEstimator` (Task 2), `isPending` (`@/lib/recommend/state`).
- Produces:
  - `interface TabInfo { id: number; windowId: number; url?: string; active: boolean; incognito: boolean }`
  - `interface Visit { tabId: number; linkIds: string[]; startedAt: number }`
  - `interface Snapshot { links: Link[]; collections: Collection[]; activity: Activity; learn: boolean }`
  - `interface TrackerDeps { now(): number; snapshot(): Promise<Snapshot>; getVisit(): Promise<Visit | null>; setVisit(visit: Visit | null): Promise<void>; activeTab(windowId: number): Promise<TabInfo | null>; isWindowFocused(windowId: number): Promise<boolean>; setBadge(tabId: number, text: string): Promise<void>; recordOpen(linkIds: string[], now: number): Promise<void>; recordVisit(linkIds: string[], elapsedMs: number, thresholds: Record<string, number> | null, now: number): Promise<void> }`
  - `interface Tracker { tabUpdated(tab: TabInfo, loaded: boolean): Promise<void>; tabActivated(tab: TabInfo): Promise<void>; tabRemoved(tabId: number): Promise<void>; windowFocused(windowId: number | null): Promise<void> }`
  - `createTracker(deps: TrackerDeps): Tracker`, `MIN_ASK_MS = 120_000`, `BADGE = '•'`

- [ ] **Step 1: Write the failing test**

`src/test/background/activity.test.ts`:

```ts
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

function setup(snapshot: Partial<Snapshot> = {}, focused = 10) {
  let clock = new Date(2026, 8, 25, 10).getTime();
  let visit: Visit | null = null;
  const tabs: TabInfo[] = [];
  const deps = {
    now: (): number => clock,
    snapshot: vi.fn(() => Promise.resolve({ links: [saved, done], collections: [collection], activity: {}, learn: true, ...snapshot })),
    getVisit: vi.fn(() => Promise.resolve(visit)),
    setVisit: vi.fn((next: Visit | null) => { visit = next; return Promise.resolve(); }),
    activeTab: vi.fn((windowId: number) => Promise.resolve(tabs.find((t) => t.windowId === windowId && t.active) ?? null)),
    isWindowFocused: vi.fn((windowId: number) => Promise.resolve(windowId === focused)),
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

  it('handles events one at a time', async () => {
    const { tracker, deps, advance } = setup();
    await tracker.tabUpdated(tab(), true);
    advance(MIN);

    await Promise.all([tracker.tabRemoved(1), tracker.tabActivated(tab({ id: 2, url: 'https://other.example/' }))]);

    expect(deps.recordVisit).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `docker compose run --rm app npx vitest run src/test/background/activity.test.ts`
Expected: FAIL — `@/background/activity` não existe.

- [ ] **Step 3: Implement**

`src/background/activity.ts`:

```ts
/**
 * Visit tracker (spec §8.1). Turns tab and window events into opens, visit
 * time and the "completed?" question. Chrome is injected (TrackerDeps) so the
 * state machine can be tested; the visit in progress lives in
 * storage.session because the service worker can be stopped at any time.
 */
import type { Activity, Collection, Link } from '@/lib/types';
import { normalizeUrl } from '@/lib/url-match';
import { effortEstimator } from '@/lib/recommend/learned';
import { isPending } from '@/lib/recommend/state';

export interface TabInfo {
  id: number;
  windowId: number;
  url?: string;
  active: boolean;
  incognito: boolean;
}

export interface Visit {
  tabId: number;
  linkIds: string[];
  startedAt: number;
}

export interface Snapshot {
  links: Link[];
  collections: Collection[];
  activity: Activity;
  /** settings.learnFromBrowsing */
  learn: boolean;
}

export interface TrackerDeps {
  now(): number;
  snapshot(): Promise<Snapshot>;
  getVisit(): Promise<Visit | null>;
  setVisit(visit: Visit | null): Promise<void>;
  activeTab(windowId: number): Promise<TabInfo | null>;
  isWindowFocused(windowId: number): Promise<boolean>;
  setBadge(tabId: number, text: string): Promise<void>;
  recordOpen(linkIds: string[], now: number): Promise<void>;
  recordVisit(linkIds: string[], elapsedMs: number, thresholds: Record<string, number> | null, now: number): Promise<void>;
}

export interface Tracker {
  /** `loaded`: the page finished loading (one open per load). */
  tabUpdated(tab: TabInfo, loaded: boolean): Promise<void>;
  tabActivated(tab: TabInfo): Promise<void>;
  tabRemoved(tabId: number): Promise<void>;
  /** null: no browser window has focus. */
  windowFocused(windowId: number | null): Promise<void>;
}

type EndReason = 'switched' | 'blurred' | 'closed' | 'navigated';

export const MIN_ASK_MS = 2 * 60_000;
export const BADGE = '•';

interface Context {
  snapshot: Snapshot;
  collections: Map<string, Collection>;
  effortOf: (link: Link) => number;
}

export function createTracker(deps: TrackerDeps): Tracker {
  let queue: Promise<void> = Promise.resolve();

  /** Events run one at a time; a failure is logged, never thrown at Chrome. */
  function serial(task: () => Promise<void>): Promise<void> {
    queue = queue.then(task).catch((error: unknown) => {
      console.error('[TabAla] Visit tracking failed:', error);
    });
    return queue;
  }

  async function context(): Promise<Context | null> {
    const snapshot = await deps.snapshot();
    if (!snapshot.learn) {
      return null;
    }
    return {
      snapshot,
      collections: new Map(snapshot.collections.map((c) => [c.id, c])),
      effortOf: effortEstimator(snapshot.links, snapshot.activity),
    };
  }

  /** Saved, not completed links for this URL. */
  function linksAt(ctx: Context, url: string | undefined): Link[] {
    const key = url === undefined ? null : normalizeUrl(url);
    if (key === null) {
      return [];
    }
    return ctx.snapshot.links.filter((link) => link.completedAt === undefined && normalizeUrl(link.url) === key);
  }

  function sameLinks(a: string[], b: string[]): boolean {
    return a.length === b.length && a.every((id) => b.includes(id));
  }

  async function end(ctx: Context | null, reason: EndReason): Promise<void> {
    const visit = await deps.getVisit();
    if (visit === null) {
      return;
    }
    await deps.setVisit(null);
    if (ctx === null) {
      return; // learning is off: the visit is dropped
    }
    const now = deps.now();
    let thresholds: Record<string, number> | null = null;
    if (reason === 'closed' || reason === 'navigated') {
      thresholds = {};
      for (const id of visit.linkIds) {
        const link = ctx.snapshot.links.find((l) => l.id === id);
        if (link !== undefined) {
          thresholds[id] = Math.max(MIN_ASK_MS, (ctx.effortOf(link) * 60_000) / 2);
        }
      }
    }
    await deps.recordVisit(visit.linkIds, now - visit.startedAt, thresholds, now);
  }

  async function start(ctx: Context, tab: TabInfo): Promise<void> {
    const links = linksAt(ctx, tab.url);
    if (links.length === 0 || !tab.active || !(await deps.isWindowFocused(tab.windowId))) {
      return;
    }
    await deps.setVisit({ tabId: tab.id, linkIds: links.map((l) => l.id), startedAt: deps.now() });
  }

  async function mark(ctx: Context | null, tab: TabInfo): Promise<void> {
    const pending = ctx === null
      ? []
      : linksAt(ctx, tab.url).filter((l) => isPending(l, ctx.collections.get(l.collectionId), deps.now()));
    await deps.setBadge(tab.id, pending.length > 0 ? BADGE : '');
  }

  return {
    tabUpdated: (tab, loaded) => serial(async () => {
      if (tab.incognito) {
        return;
      }
      const ctx = await context();
      await mark(ctx, tab);
      if (ctx === null) {
        await end(null, 'navigated');
        return;
      }
      const ids = linksAt(ctx, tab.url).map((l) => l.id);
      if (loaded && ids.length > 0) {
        await deps.recordOpen(ids, deps.now());
      }
      const visit = await deps.getVisit();
      if (visit !== null && visit.tabId === tab.id) {
        if (sameLinks(visit.linkIds, ids)) {
          return;
        }
        await end(ctx, 'navigated');
      }
      if (visit === null || visit.tabId === tab.id) {
        await start(ctx, tab);
      }
    }),

    tabActivated: (tab) => serial(async () => {
      if (tab.incognito) {
        return;
      }
      const ctx = await context();
      const visit = await deps.getVisit();
      if (visit !== null && visit.tabId === tab.id) {
        return;
      }
      await end(ctx, 'switched');
      if (ctx !== null) {
        await start(ctx, tab);
      }
    }),

    tabRemoved: (tabId) => serial(async () => {
      const visit = await deps.getVisit();
      if (visit !== null && visit.tabId === tabId) {
        await end(await context(), 'closed');
      }
    }),

    windowFocused: (windowId) => serial(async () => {
      const ctx = await context();
      await end(ctx, 'blurred');
      if (ctx === null || windowId === null) {
        return;
      }
      const tab = await deps.activeTab(windowId);
      if (tab !== null && !tab.incognito) {
        await start(ctx, tab);
      }
    }),
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `docker compose run --rm app npx vitest run src/test/background/activity.test.ts`
Expected: PASS.

- [ ] **Step 5: Type-check and commit**

Run: `docker compose run --rm app sh -c "npx tsc --noEmit 2>&1 | grep -E 'src/background|src/test/background|src/lib/url-match'"`
Expected: nenhuma linha.

```bash
git add src/background/activity.ts src/test/background/activity.test.ts
git commit -m "feat(background): visit tracker for saved links, with the visit kept in session storage

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: Ligar o rastreador no service worker

**Files:**
- Create: `src/background/chrome-deps.ts`
- Modify: `src/background/service-worker.ts`
- Modify: `src/test/setup.ts` (mock de `windows`, `action`, `storage.session`)
- Test: `src/test/background/service-worker.test.ts`

**Interfaces:**
- Consumes: `createTracker`, `TrackerDeps`, `TabInfo`, `Visit` (Task 4); `getLinks`, `getCollections`, `getActivity`, `getSettings`, `recordBrowsingOpen`, `recordVisit` (`@/lib/storage`).
- Produces: `toTabInfo(tab: chrome.tabs.Tab): TabInfo | null`, `chromeDeps: TrackerDeps`.

- [ ] **Step 1: Write the failing test**

Em `src/test/setup.ts`, dentro de `chromeMock`:
- em `storage`, ao lado de `local` e `sync`: `session: createStorageArea(),`
- depois de `tabs`:

```ts
  windows: {
    WINDOW_ID_NONE: -1,
    get: vi.fn((windowId: number) => Promise.resolve({ id: windowId, focused: true })),
    onFocusChanged: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
    },
  },

  action: {
    setBadgeText: vi.fn(() => Promise.resolve()),
    setBadgeBackgroundColor: vi.fn(() => Promise.resolve()),
  },
```

- em `tabs`, se ainda não houver: `onActivated: { addListener: vi.fn(), removeListener: vi.fn() },`

Em `src/test/background/service-worker.test.ts`, no fim do `describe`:

```ts
  it('listens to tabs and windows to learn from browsing', async () => {
    await loadServiceWorker();

    for (const event of [chrome.tabs.onUpdated, chrome.tabs.onActivated, chrome.tabs.onRemoved, chrome.windows.onFocusChanged]) {
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(vi.mocked(event.addListener)).toHaveBeenCalledTimes(1);
    }
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `docker compose run --rm app npx vitest run src/test/background/service-worker.test.ts`
Expected: FAIL — nenhum listener em `tabs`/`windows`.

- [ ] **Step 3: Implement**

`src/background/chrome-deps.ts`:

```ts
/** Chrome and storage behind the visit tracker (see activity.ts). */
import type { TabInfo, TrackerDeps, Visit } from './activity';
import {
  getActivity, getCollections, getLinks, getSettings, recordBrowsingOpen, recordVisit,
} from '@/lib/storage';

const VISIT_KEY = 'visit';

export function toTabInfo(tab: chrome.tabs.Tab): TabInfo | null {
  if (tab.id === undefined) {
    return null;
  }
  return { id: tab.id, windowId: tab.windowId, url: tab.url, active: tab.active, incognito: tab.incognito };
}

export const chromeDeps: TrackerDeps = {
  now: () => Date.now(),

  async snapshot() {
    const [links, collections, activity, settings] = await Promise.all([
      getLinks(), getCollections(), getActivity(), getSettings(),
    ]);
    return { links, collections, activity, learn: settings.learnFromBrowsing };
  },

  async getVisit() {
    const stored = await chrome.storage.session.get(VISIT_KEY);
    return (stored[VISIT_KEY] as Visit | undefined) ?? null;
  },

  async setVisit(visit) {
    if (visit === null) {
      await chrome.storage.session.remove(VISIT_KEY);
    } else {
      await chrome.storage.session.set({ [VISIT_KEY]: visit });
    }
  },

  async activeTab(windowId) {
    const [tab] = await chrome.tabs.query({ active: true, windowId });
    return tab === undefined ? null : toTabInfo(tab);
  },

  async isWindowFocused(windowId) {
    try {
      return (await chrome.windows.get(windowId)).focused;
    } catch {
      return false; // the window is gone
    }
  },

  async setBadge(tabId, text) {
    try {
      await chrome.action.setBadgeText({ tabId, text });
    } catch {
      // the tab closed meanwhile
    }
  },

  recordOpen: (linkIds, now) => recordBrowsingOpen(linkIds, now),
  recordVisit: (linkIds, elapsedMs, thresholds, now) => recordVisit(linkIds, elapsedMs, thresholds, now),
};
```

`src/background/service-worker.ts` — substitua o import e acrescente depois do listener `onInstalled` (mantenha `export {};` no fim):

```ts
import { initializeInbox } from '@/lib/storage';
import { createTracker } from './activity';
import { chromeDeps, toTabInfo } from './chrome-deps';
```

```ts
// Learning from browsing (spec §8). Listeners are registered synchronously
// at the top level so Chrome wakes this worker for them.
const tracker = createTracker(chromeDeps);

void chrome.action.setBadgeBackgroundColor({ color: '#E85D42' }).catch(() => undefined);

chrome.tabs.onUpdated.addListener((_tabId, changeInfo, tab) => {
  const info = toTabInfo(tab);
  if (info !== null && (changeInfo.status === 'complete' || changeInfo.url !== undefined)) {
    void tracker.tabUpdated(info, changeInfo.status === 'complete');
  }
});

chrome.tabs.onActivated.addListener(({ tabId }) => {
  void chrome.tabs.get(tabId)
    .then((tab) => {
      const info = toTabInfo(tab);
      return info === null ? undefined : tracker.tabActivated(info);
    })
    .catch(() => undefined);
});

chrome.tabs.onRemoved.addListener((tabId) => {
  void tracker.tabRemoved(tabId);
});

chrome.windows.onFocusChanged.addListener((windowId) => {
  void tracker.windowFocused(windowId === chrome.windows.WINDOW_ID_NONE ? null : windowId);
});
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `docker compose run --rm app npx vitest run src/test/background`
Expected: PASS (os testes antigos do `onInstalled` também).

- [ ] **Step 5: Lint, type-check and commit**

Run: `docker compose run --rm app npx eslint src/background src/test/background src/test/setup.ts`
Expected: nenhum erro.

```bash
git add src/background/chrome-deps.ts src/background/service-worker.ts src/test/setup.ts src/test/background/service-worker.test.ts
git commit -m "feat(background): the service worker learns from tabs and windows, no new permission

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 6: A pergunta "concluído?" na faixa

**Files:**
- Modify: `src/lib/recommend/engine.ts` (`Reason`, `continueSlot`)
- Modify: `src/newtab/next-up-labels.ts`
- Modify: `src/newtab/components/NextUpCard.svelte`, `src/newtab/components/NextUpStrip.svelte`
- Modify: `src/newtab/App.svelte`
- Modify: `public/_locales/en/messages.json`, `public/_locales/pt_BR/messages.json`
- Test: `src/test/lib/recommend/engine.test.ts`, `src/test/newtab/next-up-labels.test.ts`, `src/test/components/NextUpCard.test.ts`

**Interfaces:**
- Consumes: `dismissAsk` (Task 3).
- Produces: `Reason` ganha `{ type: 'ask'; minutes: number }` e `{ type: 'spent'; minutes: number }`; `NextUpCard` e `NextUpStrip` emitem `dismissAsk: Link`; chaves `nextup_ask`, `nextup_ask_yes`, `nextup_ask_no`, `reason_spent`.

- [ ] **Step 1: Write the failing tests**

Em `src/test/lib/recommend/engine.test.ts`:

```ts
  it('asks "completed?" first, about the link with the latest question', () => {
    const links = [link('a1', 'a'), link('b1', 'b')];
    const activity: Activity = {
      a1: { ...opened(1), activeMs: 25 * 60_000, askCompleteAt: daysAgo(1) },
      b1: { ...opened(0), activeMs: 12 * 60_000 },
    };
    const queue = buildQueue({ links, collections: [col('a', 1), col('b', 2)], activity, now });
    expect(queue.slots[0]).toMatchObject({ role: 'continue', link: { id: 'a1' }, reason: { type: 'ask', minutes: 25 } });
  });

  it('says how long the user spent on the link to continue', () => {
    const activity: Activity = { a1: { ...opened(1), activeMs: 12 * 60_000 } };
    const [card] = buildQueue({ links: [link('a1', 'a')], collections: [col('a', 1)], activity, now }).slots;
    expect(card.reason).toEqual({ type: 'spent', minutes: 12 });
  });
```

Em `src/test/newtab/next-up-labels.test.ts`, no `it.each` de `reasonText`, acrescente:

```ts
    [{ type: 'ask', minutes: 25 }, 'nextup_ask'],
    [{ type: 'spent', minutes: 12 }, 'reason_spent'],
```

Em `src/test/components/NextUpCard.test.ts`:

```ts
  it('asks "completed?" with yes and not yet', async () => {
    const complete = vi.fn();
    const dismissAsk = vi.fn();
    const asking: Recommendation = { ...rec, role: 'continue', reason: { type: 'ask', minutes: 25 } };
    render(NextUpCard, { props: { rec: asking, path: 'x' }, events: { complete, dismissAsk } });

    expect(screen.getByText('nextup_ask')).toBeInTheDocument();
    await fireEvent.click(screen.getByRole('button', { name: /nextup_ask_yes/ }));
    await fireEvent.click(screen.getByRole('button', { name: 'nextup_ask_no' }));

    expect(complete.mock.calls[0][0].detail).toEqual(rec.link);
    expect(dismissAsk.mock.calls[0][0].detail).toEqual(rec.link);
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `docker compose run --rm app npx vitest run src/test/lib/recommend/engine.test.ts src/test/newtab/next-up-labels.test.ts src/test/components/NextUpCard.test.ts`
Expected: FAIL — a vaga Continuar não pergunta; `reasonText` não conhece `ask`/`spent`; o card não tem os botões.

- [ ] **Step 3: Implement**

`src/lib/recommend/engine.ts`:

1. Em `Reason`, acrescente `| { type: 'ask'; minutes: number }` e `| { type: 'spent'; minutes: number }`.
2. Em `continueSlot`, antes do laço de `lastOpenedAt`:

```ts
  // A visit long enough to ask "completed?" takes the first slot (spec §7.1).
  let asking: { link: Link; front: Front; at: number } | null = null;
  for (const front of fronts) {
    for (const link of front.eligible) {
      const at = activityOf(activity, link.id).askCompleteAt;
      if (at !== undefined && (asking === null || at > asking.at)) {
        asking = { link, front, at };
      }
    }
  }
  if (asking !== null) {
    const minutes = Math.max(1, Math.round(activityOf(activity, asking.link.id).activeMs / 60_000));
    return recommendation(asking.link, asking.front.collection, 'continue', { type: 'ask', minutes }, effortOf(asking.link));
  }
```

3. No retorno do link aberto mais recente, troque a razão:

```ts
  if (best !== null) {
    const spent = Math.round(activityOf(activity, best.link.id).activeMs / 60_000);
    const reason: Reason = spent >= 1
      ? { type: 'spent', minutes: spent }
      : { type: 'opened', days: daysBetween(best.openedAt, now) };
    return recommendation(best.link, best.front.collection, 'continue', reason, effortOf(best.link));
  }
```

`src/newtab/next-up-labels.ts` — em `reasonText`, dois casos novos:

```ts
    case 'ask':
      return t('nextup_ask', reason.minutes);
    case 'spent':
      return t('reason_spent', reason.minutes);
```

`src/newtab/components/NextUpCard.svelte`:

1. No `createEventDispatcher`, acrescente `dismissAsk: Link;`.
2. Troque o conteúdo de `<article …>` por:

```svelte
<article class="nextup-card" class:asking={rec.reason.type === 'ask'} data-role={rec.role}>
  <p class="card-meta">
    <span class="card-role">{t(ROLE_KEYS[rec.role])}</span>
    <span class="card-path">{path}</span>
    {#if rec.reason.type !== 'ask'}
      <span class="card-reason">{reasonText(rec.reason)}</span>
    {/if}
  </p>
  {#if rec.reason.type === 'ask'}
    <p class="card-question">{reasonText(rec.reason)}</p>
  {/if}

  <button
    type="button"
    class="card-main"
    on:click={(event) => dispatch('open', { link: rec.link, newTab: event.metaKey || event.ctrlKey })}
  >
    <span class="card-action">{t(ACTION_KEYS[rec.action])}</span>
    <span class="card-title">{rec.link.title || rec.link.url}</span>
    <span class="card-effort">{effortText(rec.effort)}</span>
  </button>

  {#if rec.reason.type === 'ask'}
    <div class="card-actions">
      <button type="button" class="card-btn card-complete" on:click={() => dispatch('complete', rec.link)}>
        ✓ {t('nextup_ask_yes')}
      </button>
      <button type="button" class="card-btn" on:click={() => dispatch('dismissAsk', rec.link)}>{t('nextup_ask_no')}</button>
    </div>
  {:else}
    <!-- the existing .card-actions block (complete, snooze menu, more menu), unchanged -->
  {/if}
</article>
```

3. Estilos:

```css
  .nextup-card.asking {
    border-color: var(--accent-primary);
  }

  .card-question {
    margin: 0;
    font-size: var(--text-sm);
    color: var(--accent-primary);
  }
```

`src/newtab/components/NextUpStrip.svelte` — no `<NextUpCard …>`, acrescente `on:dismissAsk`.

`src/newtab/App.svelte`:

```ts
  async function handleDismissAsk(event: CustomEvent<Link>): Promise<void> {
    await progress.dismissAsk(event.detail);
  }
```

e `on:dismissAsk={handleDismissAsk}` no `<NextUpStrip …>`.

Locales — `en`: `nextup_ask` "You spent $1 min here. Completed?" (placeholder `minutes`), `nextup_ask_yes` "Yes, completed", `nextup_ask_no` "Not yet", `reason_spent` "$1 min spent here" (placeholder `minutes`). `pt_BR`: `nextup_ask` "Você passou $1 min aqui. Concluído?", `nextup_ask_yes` "Sim, concluí", `nextup_ask_no` "Ainda não", `reason_spent` "Você passou $1 min aqui".

- [ ] **Step 4: Run tests to verify they pass**

Run: `docker compose run --rm app npx vitest run src/test/lib/recommend src/test/newtab src/test/components`
Expected: PASS.

- [ ] **Step 5: Lint and commit**

Run: `docker compose run --rm app npx eslint src/lib/recommend/engine.ts src/newtab/next-up-labels.ts src/newtab/components/NextUpCard.svelte src/newtab/components/NextUpStrip.svelte src/newtab/App.svelte`
Expected: nenhum erro.

```bash
git add src/lib/recommend/engine.ts src/newtab/next-up-labels.ts src/newtab/components/NextUpCard.svelte src/newtab/components/NextUpStrip.svelte src/newtab/App.svelte public/_locales/en/messages.json public/_locales/pt_BR/messages.json src/test/lib/recommend/engine.test.ts src/test/newtab/next-up-labels.test.ts src/test/components/NextUpCard.test.ts
git commit -m "feat(next-up): after a long visit the strip asks whether the link is completed

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 7: Configuração, política e verificação

**Files:**
- Modify: `src/newtab/components/SettingsModal.svelte`
- Modify: `public/_locales/en/messages.json`, `public/_locales/pt_BR/messages.json`
- Modify: `docs/privacy-policy.md`, `docs/privacy-policy.pt.md`
- Modify: `CLAUDE.md` (só o trecho desta branch)
- Test: `src/test/components/SettingsModal.test.ts`

**Interfaces:**
- Consumes: `settingsStore.setLearnFromBrowsing`, `activityStore.clearAsks` (Task 3).
- Produces: chaves `settings_learn_title`, `settings_learn_description`, `settings_learn_toggle_label`.

- [ ] **Step 1: Write the failing test**

Em `src/test/components/SettingsModal.test.ts`:

```ts
  it('turning learning off stops it and clears pending questions', async () => {
    render(SettingsModal);

    await fireEvent.click(screen.getByRole('button', { name: 'settings_learn_toggle_label' }));

    expect(storage.updateSettings).toHaveBeenCalledWith({ learnFromBrowsing: false });
    await waitFor(() => expect(storage.clearAsks).toHaveBeenCalledTimes(1));
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `docker compose run --rm app npx vitest run src/test/components/SettingsModal.test.ts`
Expected: FAIL — não há o botão.

- [ ] **Step 3: Implement**

Em `SettingsModal.svelte`, a função:

```ts
  async function toggleLearn(): Promise<void> {
    const enabled = !settings.learnFromBrowsing;
    await settingsStore.setLearnFromBrowsing(enabled);
    if (!enabled) {
      await activityStore.clearAsks();
    }
  }
```

e, logo depois do item "Próximos passos na nova aba":

```svelte
      <div class="setting-item">
        <div class="setting-info">
          <span class="setting-label">{t('settings_learn_title')}</span>
          <span class="setting-description">{t('settings_learn_description')}</span>
        </div>
        <button
          type="button"
          class="toggle"
          class:active={settings.learnFromBrowsing}
          on:click={toggleLearn}
          aria-pressed={settings.learnFromBrowsing}
          aria-label={t('settings_learn_toggle_label')}
        >
          <span class="toggle-track">
            <span class="toggle-thumb"></span>
          </span>
        </button>
      </div>
```

Locales — `en`: `settings_learn_title` "Learn from what I open", `settings_learn_description` "Notices, on this device only, when you open a saved link and how long its tab stays active, to ask whether it is completed and to learn how long things take. Turning it off stops it; Clear usage data erases what was learned.", `settings_learn_toggle_label` "Turn learning from browsing on or off". `pt_BR`: `settings_learn_title` "Aprender com o que eu abro", `settings_learn_description` "Percebe, só neste aparelho, quando você abre um link salvo e quanto tempo a aba fica ativa, para perguntar se ele foi concluído e aprender quanto tempo cada coisa leva. Desligar para de registrar; Apagar dados de uso apaga o que foi aprendido.", `settings_learn_toggle_label` "Ligar ou desligar o aprendizado com o que eu abro".

Política — em `docs/privacy-policy.pt.md`, no fim da seção "Próximos passos e Foco (recomendações)":

```markdown
Com "Aprender com o que eu abro" ligado (padrão), o TabAla também percebe, pela permissão `tabs` que já usa, quando uma aba abre um link salvo — por qualquer caminho — e por quanto tempo ela fica ativa numa janela em foco (no máximo 30 minutos por visita). Com isso ele pergunta "concluído?" depois de uma visita longa, aprende quanto tempo cada tipo de link leva e marca com um ponto o ícone da extensão numa aba de link salvo. Endereços que não estão salvos são comparados na memória e descartados; abas anônimas nunca são lidas. Desligar em Configurações para de registrar.
```

Na tabela de permissões, a linha de `tabs` passa a ser: "Obter URL e título da aba ativa, listar abas abertas, abrir e fechar abas e reconhecer quando uma aba abre um link salvo".

Em `docs/privacy-policy.md`, o mesmo:

```markdown
With "Learn from what I open" on (the default), TabAla also notices, through the `tabs` permission it already uses, when a tab opens a saved link — by any path — and how long it stays active in a focused window (at most 30 minutes per visit). It uses this to ask "completed?" after a long visit, to learn how long each kind of link takes, and to mark the extension icon with a dot on a tab showing a saved link. Addresses that are not saved are compared in memory and discarded; incognito tabs are never read. Turning it off in Settings stops it.
```

e a linha de `tabs`: "Get the URL and title of the active tab, list open tabs, open and close tabs, and recognize when a tab opens a saved link".

`CLAUDE.md` (só este trecho, com o mesmo procedimento de `git hash-object`/`git update-index` da fase 1): na linha **Próximos passos e Foco**, acrescente ao fim: "Fase 2: o service worker (src/background/activity.ts, visita em `storage.session`) registra aberturas por qualquer caminho, tempo ativo (teto de 30 min por visita) e a pergunta \"concluído?\"; casamento de URL em src/lib/url-match.ts".

- [ ] **Step 4: Run tests and full verification**

Run: `docker compose run --rm app npx vitest run src/test/components/SettingsModal.test.ts`
Expected: PASS.

Run: `make test` → tudo passa. `make lint` → 12 erros antigos. `make build && du -sh dist` → abaixo de 500 KB. `git diff main -- src/manifest.json` → vazio. Chaves iguais nas duas línguas (mesmo comando `node -e` da fase 1).

- [ ] **Step 5: Commit**

```bash
git add src/newtab/components/SettingsModal.svelte public/_locales/en/messages.json public/_locales/pt_BR/messages.json docs/privacy-policy.md docs/privacy-policy.pt.md src/test/components/SettingsModal.test.ts
git commit -m "feat(settings): learn from what I open, with privacy policy and project notes

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

- [ ] **Step 6: Teste manual no Chrome (roteiro para a pessoa)**

Recarregue a extensão e confira:

1. Abra um link salvo fora do tabAla (pelo histórico ou colando a URL): o ícone da extensão ganha um ponto nessa aba.
2. Fique alguns minutos na aba e feche-a: numa nova aba, a primeira vaga da faixa pergunta "Você passou N min aqui. Concluído?"; "Sim" conclui, "Ainda não" some com a pergunta.
3. Troque de aba no meio da leitura e volte: o tempo continua somando (a pergunta só vem ao fechar ou sair da página).
4. Janela anônima com a extensão permitida: nada é registrado.
5. Configurações → desligue "Aprender com o que eu abro": o ponto some das abas novas e a pergunta pendente desaparece.
