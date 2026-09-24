# Busca inteligente — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** achar qualquer link salvo, em qualquer workspace, pelo assunto, por parte do título ou do site e pelo tipo de conteúdo — no dashboard (⌘K) e no popup.

**Architecture:** um motor de busca local e puro (`src/lib/search/`) ranqueia título, tags, site, coleção, workspace e caminho da URL, com filtro por tipo derivado da URL (`src/lib/link-kind.ts`). A busca por assunto vem de tags que o Gemini Nano do Chrome gera para cada link em segundo plano, no dashboard (`src/lib/ai/`). Um painel (`SearchPanel.svelte`) substitui o filtro do quadro; o popup ganha um campo de busca que usa o mesmo motor.

**Tech Stack:** Svelte 5 (sintaxe legada do repo), TypeScript, Vite + crxjs, Vitest + @testing-library/svelte, Chrome MV3, Prompt API do Chrome (`LanguageModel`).

**Spec:** `docs/superpowers/specs/2026-09-24-busca-inteligente-design.md`

## Global Constraints

- Docker-first: nunca `npm`/`npx` no host. Um arquivo de teste: `docker compose run --rm app npx vitest run <arquivo>`. Suíte: `make test`. Lint de arquivos tocados: `docker compose run --rm app npx eslint <arquivos>`. Tipos dos arquivos tocados: `docker compose run --rm app sh -c "npx tsc --noEmit 2>&1 | grep -E '^<regex dos arquivos>'"` (há erros antigos em outros arquivos; os tocados não podem ganhar nenhum).
- Imports novos usam `@/…` (o `tsconfig` não conhece `@lib`/`@shared`); arquivos existentes mantêm os imports que têm.
- Nenhuma dependência npm nova; o `dist` inteiro fica abaixo de 500 KB.
- Componentes Svelte na sintaxe legada do repo: `export let`, `$:`, `createEventDispatcher`. Sem runes.
- Todo texto de interface passa por `t()` com a chave nos dois arquivos `public/_locales/en/messages.json` e `public/_locales/pt_BR/messages.json`. Nomes de chave só com `[a-zA-Z0-9_]`; substituições `$1`, `$2` com bloco `placeholders`, como as chaves existentes.
- Gravação no storage só por funções embrulhadas em `withDataLock`; uma função travada nunca chama outra travada.
- Campos novos de `Link` são opcionais; exports antigos continuam importando.
- O repositório é público: nada de dados pessoais (títulos de links reais, exports, gabarito) em commit. `.eval/` fica no `.gitignore`.
- Não colocar no índice as mudanças de outra sessão que estão no working tree: `Dockerfile`, `docker-compose.yml`, `.github/workflows/release.yml`, `entrypoint.dev.sh`, `.serena/` e os trechos alheios do `CLAUDE.md`. Sempre `git add <arquivos>` explícitos.
- Mensagens de commit terminam com `Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>`.
- Branch: `feat/busca-inteligente`.

## Review Focus

- Uma consulta que é só palavra de tipo ou só palavra vazia ("vídeo", "de ") lista os vídeos ou nada — nunca erro. → Task 2 (palavra vazia) e Task 3 (tipo sozinho).
- "/" digitado dentro de qualquer campo de texto (renomear coleção, editar tags) escreve a barra; ⌘K/Ctrl+K abrem a busca de qualquer lugar. → Task 5.
- Títulos e consultas com pontuação, símbolos ou título vazio (links `file://`, "(PDF)", "node.js", "") não quebram nada e casam por site, caminho ou coleção. → Task 2 e Task 3.
- Um link apagado ou re-etiquetado pelo usuário enquanto o lote do etiquetador está em voo nunca volta e a tag do usuário vence. → Task 9.
- A busca do popup acha links de workspaces que não são o ativo; link da Inbox mostra só "Inbox" como caminho. → Task 3 e Task 7.

---

### Task 0: Spike no Chrome real (descartável)

Responde, antes de qualquer código: o Nano aceita português? `responseConstraint` funciona? Quanto tempo leva um lote de 5? Gera o mapa de tags usado na medição (Task 4). **Nada vai para o repositório e nada é gravado no storage da extensão.**

**Files:**
- Create (fora do repo): `<scratchpad>/spike-tags.js`
- Resultado: `<caderno>/anexos/tabala/tags-spike-2026-09.json`

**Interfaces:**
- Produces: arquivo JSON `{ langs: string[], msPerBatch: number[], failures: {batch, error}[], tags: { [linkId]: string[] } }` e a decisão `MODEL_LANGUAGES` (`['en','pt']` ou `['en']`) usada na Task 9.

- [ ] **Step 1: Escrever o snippet**

```js
// Cole no Console do DevTools de uma nova aba do tabAla (⌥⌘I). Só lê o storage.
(async () => {
  const LM = globalThis.LanguageModel;
  if (!LM) { console.log('LanguageModel ausente neste contexto'); return; }
  const opts = (langs) => ({
    expectedInputs: [{ type: 'text', languages: langs }],
    expectedOutputs: [{ type: 'text', languages: langs }],
  });
  for (const langs of [['en', 'pt'], ['en']]) {
    try { console.log('availability', langs.join('+'), await LM.availability(opts(langs))); }
    catch (e) { console.log('availability', langs.join('+'), 'ERRO', e.message); }
  }
  const { links = [], collections = [], workspaces = [] } =
    await chrome.storage.local.get(['links', 'collections', 'workspaces']);
  const colById = new Map(collections.map((c) => [c.id, c]));
  const wsById = new Map(workspaces.map((w) => [w.id, w]));
  const SCHEMA = { type: 'array', items: { type: 'object',
    properties: { i: { type: 'integer' }, tags: { type: 'array', items: { type: 'string' }, maxItems: 6 } },
    required: ['i', 'tags'] } };
  const system = (langs) => 'You tag saved links in a tab organizer. For each link (title, site, collection and workspace), '
    + `return 3 to 6 short subject tags, ${langs.includes('pt') ? 'in Portuguese and in English' : 'in English'}, lowercase. `
    + 'Do not use the site name or generic words like link, page, article, video.';
  const btn = document.createElement('button');
  btn.textContent = `Spike: etiquetar ${links.length} links`;
  btn.style.cssText = 'position:fixed;top:12px;right:12px;z-index:99999;padding:12px 16px;font-size:16px';
  document.body.append(btn);
  btn.onclick = async () => {
    btn.disabled = true;
    const langs = (await LM.availability(opts(['en', 'pt']))) === 'unavailable' ? ['en'] : ['en', 'pt'];
    const session = await LM.create({
      ...opts(langs),
      initialPrompts: [{ role: 'system', content: system(langs) }],
      monitor(m) { m.addEventListener('downloadprogress', (e) => { btn.textContent = `Baixando ${Math.round(e.loaded * 100)}%`; }); },
    });
    const tags = {}; const msPerBatch = []; const failures = [];
    const sorted = [...links].sort((a, b) => b.createdAt - a.createdAt);
    for (let i = 0; i < sorted.length; i += 5) {
      const batch = sorted.slice(i, i + 5);
      const prompt = batch.map((l, n) => {
        const c = colById.get(l.collectionId);
        const w = c && c.workspaceId ? wsById.get(c.workspaceId) : undefined;
        let host = '';
        try { host = new URL(l.url).hostname.replace(/^www\./, ''); } catch { /* keep empty */ }
        return `${n + 1}. title: ${l.title} | site: ${host} | collection: ${c ? c.name : 'Inbox'}${w ? ` (${w.name})` : ''}`;
      }).join('\n');
      const t0 = performance.now();
      try {
        const out = JSON.parse(await session.prompt(prompt, { responseConstraint: SCHEMA }));
        msPerBatch.push(Math.round(performance.now() - t0));
        for (const item of out) { const l = batch[item.i - 1]; if (l) { tags[l.id] = item.tags; } }
      } catch (e) { failures.push({ batch: i / 5, error: String(e) }); }
      btn.textContent = `Etiquetando ${Math.min(i + 5, sorted.length)}/${sorted.length}`;
    }
    session.destroy();
    const sortedMs = [...msPerBatch].sort((a, b) => a - b);
    console.log('langs', langs, 'mediana ms/lote', sortedMs[Math.floor(sortedMs.length / 2)], 'falhas', failures.length);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify({ langs, msPerBatch, failures, tags }, null, 2)], { type: 'application/json' }));
    a.download = 'tabala-tags-spike.json';
    a.click();
    btn.textContent = `Pronto: ${Object.keys(tags).length} links`;
  };
})();
```

- [ ] **Step 2: Pedir ao usuário para rodar** — abrir uma nova aba, ⌥⌘I, colar o snippet, anotar as linhas `availability` do console e clicar no botão "Spike: etiquetar" (o clique é o gesto que o Chrome exige para baixar o modelo). Esperar o download de `tabala-tags-spike.json` em `~/Downloads`.

- [ ] **Step 3: Guardar e registrar**

```bash
mv ~/Downloads/tabala-tags-spike.json <caderno>/anexos/tabala/tags-spike-2026-09.json
python3 -c "
import json; d=json.load(open('<caderno>/anexos/tabala/tags-spike-2026-09.json'))
ms=sorted(d['msPerBatch']); print('langs', d['langs'], 'lotes', len(ms), 'mediana', ms[len(ms)//2] if ms else None, 'falhas', len(d['failures']), 'links', len(d['tags']))
print(list(d['tags'].values())[:5])"
```

Registrar na página `caderno/projetos/tabAla.md` (log de hoje): idiomas aceitos, mediana ms/lote, falhas, 5 exemplos de tags. Commit no repo `caderno`: `git add anexos/tabala/tags-spike-2026-09.json projetos/tabAla.md && git commit -m "tabAla: spike do Nano (idiomas, tempo por lote, tags)"` com a linha Co-Authored-By.

**Decisão que sai daqui:** `MODEL_LANGUAGES = d['langs']` (Task 9). Se `LanguageModel` estiver ausente ou `unavailable` nas duas combinações, parar e reportar: a busca por assunto por tags não é viável nesta máquina.

---

### Task 1: Tipo do link pela URL

**Files:**
- Create: `src/lib/link-kind.ts`
- Test: `src/test/lib/link-kind.test.ts`

**Interfaces:**
- Produces: `type LinkKind = 'file' | 'video' | 'code-change' | 'paper' | 'repo' | 'exercise' | 'docs' | 'social' | 'search' | 'page'`; `const LINK_KINDS: readonly LinkKind[]` (ordem dos chips); `function linkKind(url: string): LinkKind`.

- [ ] **Step 1: Teste que falha**

```ts
/**
 * Content type derived from the URL.
 */
import { describe, it, expect } from 'vitest';
import { linkKind } from '@/lib/link-kind';

describe('linkKind', () => {
  it.each([
    ['file:///Users/me/notes/index.html', 'file'],
    ['https://www.youtube.com/watch?v=abc123', 'video'],
    ['https://youtu.be/abc123', 'video'],
    ['https://m.youtube.com/shorts/xyz', 'video'],
    ['https://vimeo.com/123456', 'video'],
    ['https://github.com/owner/repo/pull/55', 'code-change'],
    ['https://github.com/owner/repo/issues/12', 'code-change'],
    ['https://gitlab.com/group/project/-/merge_requests/7', 'code-change'],
    ['https://arxiv.org/abs/2401.00001', 'paper'],
    ['https://example.com/files/report.PDF', 'paper'],
    ['https://github.com/owner/repo', 'repo'],
    ['https://github.com/owner/repo/tree/main/src', 'repo'],
    ['https://github.com/features/copilot', 'page'],
    ['https://github.com/owner', 'page'],
    ['https://codeforces.com/contest/2000/problem/A', 'exercise'],
    ['https://atcoder.jp/contests/abc300/tasks/abc300_a', 'exercise'],
    ['https://cses.fi/problemset/task/1068', 'exercise'],
    ['https://docs.python.org/3/library/py_compile.html', 'docs'],
    ['https://developer.chrome.com/docs/extensions', 'docs'],
    ['https://example.com/docs/getting-started', 'docs'],
    ['https://x.com/someone/status/1', 'social'],
    ['https://www.linkedin.com/posts/someone_activity-1', 'social'],
    ['https://www.google.com/search?q=harness+engineering', 'search'],
    ['https://www.google.com.br/search?q=teste', 'search'],
    ['https://duckduckgo.com/?q=tabala', 'search'],
    ['https://www.anthropic.com/news/claude', 'page'],
    ['not a url', 'page'],
  ])('%s is %s', (url, kind) => {
    expect(linkKind(url)).toBe(kind);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar** — `docker compose run --rm app npx vitest run src/test/lib/link-kind.test.ts` → FAIL (módulo `@/lib/link-kind` não existe).

- [ ] **Step 3: Implementar**

```ts
/**
 * Content type of a saved link, derived from its URL (never stored).
 * Shared by search (kind filters) and the upcoming recommendation space.
 */
export type LinkKind =
  | 'file'
  | 'video'
  | 'code-change'
  | 'paper'
  | 'repo'
  | 'exercise'
  | 'docs'
  | 'social'
  | 'search'
  | 'page';

/** Display order of kind chips. */
export const LINK_KINDS: readonly LinkKind[] = [
  'video', 'paper', 'repo', 'code-change', 'docs', 'exercise', 'social', 'search', 'file', 'page',
];

const PAPER_HOSTS = ['arxiv.org', 'openreview.net', 'aclanthology.org', 'dl.acm.org', 'ieeexplore.ieee.org'];
const SOCIAL_HOSTS = ['x.com', 'twitter.com', 'bsky.app'];
/** First path segments of github.com that are site pages, not repositories. */
const GITHUB_RESERVED = new Set([
  'about', 'collections', 'enterprise', 'explore', 'features', 'login', 'marketplace',
  'notifications', 'orgs', 'pricing', 'search', 'settings', 'sponsors', 'topics', 'trending',
]);

function onDomain(host: string, domain: string): boolean {
  return host === domain || host.endsWith(`.${domain}`);
}

function isVideo(host: string, path: string): boolean {
  return (onDomain(host, 'youtube.com') && (path === '/watch' || path.startsWith('/shorts/')))
    || host === 'youtu.be'
    || (host === 'vimeo.com' && /^\/\d+/.test(path));
}

function isCodeChange(host: string, segments: string[], path: string): boolean {
  if (host === 'github.com') {
    return segments.length >= 4
      && (segments[2] === 'pull' || segments[2] === 'issues')
      && /^\d+$/.test(segments[3]);
  }
  return host === 'gitlab.com' && /\/-\/(merge_requests|issues)\/\d+/.test(path);
}

function isRepo(host: string, segments: string[]): boolean {
  if (host === 'github.com') {
    return segments.length >= 2 && !GITHUB_RESERVED.has(segments[0]);
  }
  return host === 'gitlab.com' && segments.length >= 2;
}

function isExercise(host: string, path: string): boolean {
  return (onDomain(host, 'codeforces.com') && path.includes('/problem/'))
    || (host === 'atcoder.jp' && /^\/contests\/[^/]+\/tasks\/[^/]+/.test(path))
    || (host === 'cses.fi' && path.startsWith('/problemset/task/'))
    || (host === 'leetcode.com' && path.startsWith('/problems/'))
    || (host === 'vjudge.net' && path.startsWith('/problem/'))
    || (host === 'judge.beecrowd.com' && path.includes('/problems/view/'));
}

function isDocs(host: string, path: string): boolean {
  return /^(docs|developer|developers|learn)\./.test(host)
    || onDomain(host, 'readthedocs.io')
    || /\/(docs|documentation)(\/|$)/.test(path);
}

function isSocial(host: string, path: string): boolean {
  return SOCIAL_HOSTS.some((domain) => onDomain(host, domain))
    || (onDomain(host, 'linkedin.com') && path.startsWith('/posts/'))
    || (onDomain(host, 'reddit.com') && path.startsWith('/r/'))
    || (host === 'news.ycombinator.com' && path === '/item');
}

function isSearch(host: string, url: URL): boolean {
  return (/(^|\.)google\.[a-z.]+$/.test(host) && url.pathname === '/search')
    || (onDomain(host, 'bing.com') && url.pathname === '/search')
    || (host === 'duckduckgo.com' && url.searchParams.has('q'));
}

export function linkKind(url: string): LinkKind {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return 'page';
  }
  if (parsed.protocol === 'file:') {
    return 'file';
  }
  const host = parsed.hostname.toLowerCase().replace(/^www\./, '');
  const path = parsed.pathname;
  const segments = path.split('/').filter((segment) => segment !== '');

  if (isVideo(host, path)) { return 'video'; }
  if (isCodeChange(host, segments, path)) { return 'code-change'; }
  if (PAPER_HOSTS.some((domain) => onDomain(host, domain)) || path.toLowerCase().endsWith('.pdf')) { return 'paper'; }
  if (isRepo(host, segments)) { return 'repo'; }
  if (isExercise(host, path)) { return 'exercise'; }
  if (isDocs(host, path)) { return 'docs'; }
  if (isSocial(host, path)) { return 'social'; }
  if (isSearch(host, parsed)) { return 'search'; }
  return 'page';
}
```

- [ ] **Step 4: Rodar e ver passar** — mesmo comando → PASS (27 casos).

- [ ] **Step 5: Lint, tipos e commit**

```bash
docker compose run --rm app sh -c "npx eslint src/lib/link-kind.ts src/test/lib/link-kind.test.ts; npx tsc --noEmit 2>&1 | grep -E '^src/(lib/link-kind|test/lib/link-kind)'"
git add src/lib/link-kind.ts src/test/lib/link-kind.test.ts
git commit -m "feat(search): derive the content type of a link from its URL"
```

---

### Task 2: Normalização de texto e leitura da consulta

**Files:**
- Create: `src/lib/search/text.ts`
- Test: `src/test/lib/search/text.test.ts`

**Interfaces:**
- Consumes: `LinkKind` (Task 1).
- Produces: `interface Token { norm: string; stem: string }`; `normalizeWords(text: string): string[]`; `stem(word: string): string`; `tokenize(text: string): Token[]`; `interface ParsedQuery { terms: Token[]; kinds: LinkKind[] }`; `parseQuery(query: string): ParsedQuery`.

- [ ] **Step 1: Teste que falha**

```ts
/**
 * Search text: accents, case, plurals, stopwords and kind words.
 */
import { describe, it, expect } from 'vitest';
import { normalizeWords, stem, parseQuery } from '@/lib/search/text';

describe('normalizeWords', () => {
  it.each([
    ['Busca Híbrida', ['busca', 'hibrida']],
    ['Query-Adaptive Hybrid Search (PDF)', ['query', 'adaptive', 'hybrid', 'search', 'pdf']],
    ['node.js & C++', ['node', 'js', 'c']],
    ['   ', []],
  ])('%j', (text, words) => {
    expect(normalizeWords(text)).toEqual(words);
  });
});

describe('stem', () => {
  it.each([
    ['agentes', 'agent'],
    ['agents', 'agent'],
    ['processos', 'processo'],
    ['process', 'process'],
    ['notes', 'note'],
    ['classes', 'class'],
    ['bus', 'bus'],
  ])('%s -> %s', (word, expected) => {
    expect(stem(word)).toBe(expected);
  });
});

describe('parseQuery', () => {
  it.each([
    ['vídeo agentes ', ['agent'], ['video']],
    ['vídeo', [], ['video']],
    ['paper de busca híbrida ', ['busca', 'hibrida'], ['paper']],
    ['de', ['de'], []],
    ['de ', [], []],
    ['github', ['github'], []],
    ['!!!', [], []],
  ])('%j', (query, stems, kinds) => {
    const parsed = parseQuery(query);
    expect(parsed.terms.map((term) => term.stem)).toEqual(stems);
    expect(parsed.kinds).toEqual(kinds);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar** — `docker compose run --rm app npx vitest run src/test/lib/search/text.test.ts` → FAIL (módulo não existe).

- [ ] **Step 3: Implementar**

```ts
/**
 * Search text: accent- and case-insensitive words, a light singular/plural
 * folding, and the query grammar (stopwords and kind words).
 */
import type { LinkKind } from '@/lib/link-kind';

/** A word in two forms: `norm` for prefix matching, `stem` for equality and typos. */
export interface Token {
  norm: string;
  stem: string;
}

export function normalizeWords(text: string): string[] {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word !== '');
}

/** Folds plurals on both sides: agentes, agents -> agent; processos -> processo. */
export function stem(word: string): string {
  if (word.length >= 6 && word.endsWith('es')) {
    return word.slice(0, -2);
  }
  if (word.length >= 4 && word.endsWith('s') && !word.endsWith('ss')) {
    return word.slice(0, -1);
  }
  return word;
}

export function tokenize(text: string): Token[] {
  return normalizeWords(text).map((norm) => ({ norm, stem: stem(norm) }));
}

const STOPWORDS: ReadonlySet<string> = new Set([
  'a', 'o', 'as', 'os', 'de', 'da', 'do', 'das', 'dos', 'e', 'em', 'no', 'na',
  'sobre', 'aquele', 'aquela', 'que', 'um', 'uma', 'para', 'com',
  'the', 'of', 'about', 'an', 'and', 'for', 'on', 'in', 'to', 'with',
]);

/** Site names (github, youtube) are not kind words: they match the domain field. */
const KIND_WORDS: Readonly<Partial<Record<string, LinkKind>>> = {
  video: 'video', videos: 'video',
  paper: 'paper', papers: 'paper', pdf: 'paper', pdfs: 'paper',
  repo: 'repo', repos: 'repo', repositorio: 'repo', repositorios: 'repo',
  issue: 'code-change', issues: 'code-change', pull: 'code-change',
  docs: 'docs', documentacao: 'docs', documentation: 'docs',
  exercicio: 'exercise', exercicios: 'exercise', exercise: 'exercise', exercises: 'exercise',
};

export interface ParsedQuery {
  terms: Token[];
  kinds: LinkKind[];
}

/**
 * Splits a query into search terms and kind filters. The last word, while
 * still being typed (no trailing space), is never dropped as a stopword:
 * "de" on its way to "desafio" already searches by prefix.
 */
export function parseQuery(query: string): ParsedQuery {
  const words = normalizeWords(query);
  const stillTyping = !/\s$/.test(query);
  const terms: Token[] = [];
  const kinds = new Set<LinkKind>();

  words.forEach((word, i) => {
    const kind = KIND_WORDS[word];
    if (kind !== undefined) {
      kinds.add(kind);
      return;
    }
    const isLastTyped = stillTyping && i === words.length - 1;
    if (STOPWORDS.has(word) && !isLastTyped) {
      return;
    }
    terms.push({ norm: word, stem: stem(word) });
  });

  return { terms, kinds: [...kinds] };
}
```

- [ ] **Step 4: Rodar e ver passar** — mesmo comando → PASS.

- [ ] **Step 5: Lint, tipos e commit**

```bash
docker compose run --rm app sh -c "npx eslint src/lib/search src/test/lib/search; npx tsc --noEmit 2>&1 | grep -E '^src/(lib|test/lib)/search'"
git add src/lib/search/text.ts src/test/lib/search/text.test.ts
git commit -m "feat(search): normalize words, fold plurals and read kind words from the query"
```

---

### Task 3: Motor de busca

**Files:**
- Create: `src/lib/search/engine.ts`
- Modify: `src/lib/types.ts` (campo `tags` em `Link`)
- Test: `src/test/lib/search/engine.test.ts`

**Interfaces:**
- Consumes: `linkKind`, `LinkKind` (Task 1); `tokenize`, `parseQuery`, `Token` (Task 2).
- Produces:
  - `Link.tags?: string[]` em `src/lib/types.ts`.
  - `interface IndexNames { collection: (c: Collection) => string; workspace: (w: Workspace) => string }`
  - `interface SearchIndex` (opaco)
  - `interface SearchHit { link: Link; kind: LinkKind; score: number; collectionName: string; workspaceId?: string; workspaceName?: string; matchedTags: string[] }`
  - `interface SearchResult { results: SearchHit[]; partial: SearchHit[]; kinds: LinkKind[]; kindCounts: Partial<Record<LinkKind, number>> }`
  - `interface SearchOptions { kinds?: LinkKind[]; limit?: number }`
  - `buildIndex(links: Link[], collections: Collection[], workspaces: Workspace[], names?: IndexNames): SearchIndex`
  - `search(index: SearchIndex, query: string, options?: SearchOptions): SearchResult`
  - `withinOneEdit(a: string, b: string): boolean`

- [ ] **Step 1: Adicionar o campo em `src/lib/types.ts`** — dentro de `interface Link`, depois de `order?: number;`:

```ts
  /** Subject tags. Absent: not tagged yet. []: tagged, without tags. */
  tags?: string[];
```

- [ ] **Step 2: Teste que falha**

```ts
/**
 * Ranked local search across every workspace.
 */
import { describe, it, expect } from 'vitest';
import { buildIndex, search, withinOneEdit } from '@/lib/search/engine';
import { createMockLink, createMockCollection, createMockWorkspace } from '../../factories';

const workspaces = [
  createMockWorkspace({ id: 'general', name: 'Geral', isDefault: true }),
  createMockWorkspace({ id: 'ws-agents', name: 'Agentes & Coding', order: 1 }),
  createMockWorkspace({ id: 'ws-ml', name: 'IA & ML', order: 2 }),
];
const collections = [
  createMockCollection({ id: 'inbox', name: 'Inbox', order: 0, isDefault: true }),
  createMockCollection({ id: 'hermes', name: 'Hermes Agent', order: 1, workspaceId: 'ws-agents' }),
  createMockCollection({ id: 'classics', name: 'Clássicos & história', order: 2, workspaceId: 'ws-ml' }),
  createMockCollection({ id: 'tools', name: 'Ferramentas', order: 3, workspaceId: 'general' }),
];
const links = [
  createMockLink({ id: 'hermes-video', title: 'Hermes: building a harness', url: 'https://www.youtube.com/watch?v=aaa', collectionId: 'hermes', createdAt: 5 }),
  createMockLink({ id: 'hermes-repo', title: 'NousResearch/hermes-agent', url: 'https://github.com/NousResearch/hermes-agent', collectionId: 'hermes', createdAt: 4 }),
  createMockLink({ id: 'bitter', title: 'The Bitter Lesson', url: 'http://www.incompleteideas.net/IncIdeas/BitterLesson.html', collectionId: 'classics', createdAt: 3, tags: ['história da ia', 'escala', 'ai history'] }),
  createMockLink({ id: 'hybrid', title: 'Query-Adaptive Hybrid Search (PDF)', url: 'https://arxiv.org/pdf/2401.00001', collectionId: 'classics', createdAt: 2 }),
  createMockLink({ id: 'mckinsey', title: 'McKinsey Academy', url: 'https://www.mckinsey.com/academy', collectionId: 'inbox', createdAt: 1 }),
  createMockLink({ id: 'untitled', title: '', url: 'file:///Users/me/tools/index.html', collectionId: 'tools', createdAt: 0 }),
];
const index = buildIndex(links, collections, workspaces);
const ids = (hits: { link: { id: string } }[]): string[] => hits.map((hit) => hit.link.id);

describe('search', () => {
  it('finds links by a title word in any workspace, newest first on a tie', () => {
    expect(ids(search(index, 'hermes').results)).toEqual(['hermes-video', 'hermes-repo']);
  });

  it('tolerates one typo in longer words', () => {
    expect(ids(search(index, 'mckinsy').results)).toEqual(['mckinsey']);
  });

  it('ranks a tag match above a collection match, ignoring accents', () => {
    expect(ids(search(index, 'historia ').results)).toEqual(['bitter', 'hybrid']);
  });

  it('finds a link by its tags and reports which tags matched', () => {
    const [hit] = search(index, 'ai history ').results;
    expect(hit.link.id).toBe('bitter');
    expect(hit.matchedTags).toEqual(['ai history']);
  });

  it('turns kind words into a filter', () => {
    const result = search(index, 'video hermes ');
    expect(ids(result.results)).toEqual(['hermes-video']);
    expect(result.kinds).toEqual(['video']);
  });

  it('lists every link of a kind when the query is only a kind word', () => {
    expect(ids(search(index, 'paper').results)).toEqual(['hybrid']);
    expect(ids(search(index, 'repo').results)).toEqual(['hermes-repo']);
  });

  it('requires every term, falling back to partial matches', () => {
    const result = search(index, 'hermes lesson ');
    expect(result.results).toEqual([]);
    expect(ids(result.partial)).toEqual(['hermes-video', 'hermes-repo', 'bitter']);
  });

  it('matches the site and the collection, even for a link without title', () => {
    expect(ids(search(index, 'arxiv').results)).toEqual(['hybrid']);
    expect(ids(search(index, 'ferramentas').results)).toEqual(['untitled']);
  });

  it('combines kind chips from the options with the query', () => {
    expect(ids(search(index, 'hermes', { kinds: ['repo'] }).results)).toEqual(['hermes-repo']);
  });

  it('counts text matches per kind before the kind filter', () => {
    expect(search(index, 'hermes ', { kinds: ['repo'] }).kindCounts).toEqual({ video: 1, repo: 1 });
  });

  it('returns nothing for an empty or punctuation-only query', () => {
    expect(search(index, '').results).toEqual([]);
    expect(search(index, '!!!').results).toEqual([]);
    expect(search(index, '!!!').partial).toEqual([]);
  });

  it('reports the path of each hit, with no workspace for Inbox links', () => {
    const [inboxHit] = search(index, 'mckinsey ').results;
    expect(inboxHit.workspaceId).toBeUndefined();
    expect(inboxHit.collectionName).toBe('Inbox');
    const [paperHit] = search(index, 'arxiv ').results;
    expect(paperHit.workspaceId).toBe('ws-ml');
    expect(paperHit.workspaceName).toBe('IA & ML');
    expect(paperHit.collectionName).toBe('Clássicos & história');
  });

  it('uses the display names it is given', () => {
    const translated = buildIndex(links, collections, workspaces, {
      collection: (c) => (c.id === 'inbox' ? 'Caixa de entrada' : c.name),
      workspace: (w) => w.name,
    });
    expect(ids(search(translated, 'caixa').results)).toEqual(['mckinsey']);
  });

  it('limits the number of results', () => {
    expect(search(index, 'hermes', { limit: 1 }).results).toHaveLength(1);
  });
});

describe('withinOneEdit', () => {
  it.each([
    ['mckinsy', 'mckinsey', true],
    ['kitten', 'sitten', true],
    ['same', 'same', true],
    ['agent', 'agnet', false],
    ['abc', 'abcde', false],
  ])('%s ~ %s is %s', (a, b, expected) => {
    expect(withinOneEdit(a, b)).toBe(expected);
  });
});
```

- [ ] **Step 3: Rodar e ver falhar** — `docker compose run --rm app npx vitest run src/test/lib/search/engine.test.ts` → FAIL (módulo não existe).

- [ ] **Step 4: Implementar**

```ts
/**
 * Local ranked search over every workspace. Pure (no chrome APIs), so the
 * dashboard, the popup and the offline evaluation share it.
 */
import type { Collection, Link, Workspace } from '@/lib/types';
import { linkKind, type LinkKind } from '@/lib/link-kind';
import { parseQuery, tokenize, type Token } from './text';

type Field = 'title' | 'tags' | 'domain' | 'collection' | 'workspace' | 'path';

const FIELD_WEIGHTS: Record<Field, number> = {
  title: 3,
  tags: 2.5,
  domain: 2,
  collection: 1.5,
  workspace: 1,
  path: 1,
};
const FIELDS = Object.keys(FIELD_WEIGHTS) as Field[];

export interface IndexNames {
  collection: (collection: Collection) => string;
  workspace: (workspace: Workspace) => string;
}

const STORED_NAMES: IndexNames = {
  collection: (collection) => collection.name,
  workspace: (workspace) => workspace.name,
};

interface Entry {
  link: Link;
  kind: LinkKind;
  collectionName: string;
  workspaceId?: string;
  workspaceName?: string;
  tags: { tag: string; tokens: Token[] }[];
  fields: Record<Field, Token[]>;
}

export interface SearchIndex {
  entries: Entry[];
}

export interface SearchHit {
  link: Link;
  kind: LinkKind;
  score: number;
  collectionName: string;
  /** Undefined for Inbox links, which show in every workspace. */
  workspaceId?: string;
  workspaceName?: string;
  matchedTags: string[];
}

export interface SearchResult {
  /** Links matching every term, best first. */
  results: SearchHit[];
  /** Filled only when `results` is empty: links matching some of the terms. */
  partial: SearchHit[];
  /** Kind filters in effect (query words plus options). */
  kinds: LinkKind[];
  /** Text matches per kind, before kind filters (all links when there are no terms). */
  kindCounts: Partial<Record<LinkKind, number>>;
}

export interface SearchOptions {
  kinds?: LinkKind[];
  limit?: number;
}

interface Scored {
  entry: Entry;
  score: number;
  matched: number;
  matchedTags: string[];
}

/** Domain without "www" and without the top-level label; path words. */
function urlTokens(url: string): { domain: Token[]; path: Token[] } {
  try {
    const parsed = new URL(url);
    const labels = parsed.hostname.replace(/^www\./, '').split('.');
    const withoutTld = labels.length > 1 ? labels.slice(0, -1) : labels;
    return { domain: tokenize(withoutTld.join(' ')), path: tokenize(parsed.pathname) };
  } catch {
    return { domain: [], path: tokenize(url) };
  }
}

export function buildIndex(
  links: Link[],
  collections: Collection[],
  workspaces: Workspace[],
  names: IndexNames = STORED_NAMES
): SearchIndex {
  const collectionById = new Map(collections.map((c) => [c.id, c]));
  const workspaceById = new Map(workspaces.map((w) => [w.id, w]));

  const entries = links.map((link): Entry => {
    const collection = collectionById.get(link.collectionId);
    const workspace = collection?.workspaceId !== undefined
      ? workspaceById.get(collection.workspaceId)
      : undefined;
    const collectionName = collection !== undefined ? names.collection(collection) : '';
    const workspaceName = workspace !== undefined ? names.workspace(workspace) : undefined;
    const tags = (link.tags ?? []).map((tag) => ({ tag, tokens: tokenize(tag) }));
    const { domain, path } = urlTokens(link.url);

    return {
      link,
      kind: linkKind(link.url),
      collectionName,
      workspaceId: workspace?.id,
      workspaceName,
      tags,
      fields: {
        title: tokenize(link.title),
        tags: tags.flatMap((t) => t.tokens),
        domain,
        collection: tokenize(collectionName),
        workspace: tokenize(workspaceName ?? ''),
        path,
      },
    };
  });

  return { entries };
}

/** True when a and b differ by at most one insertion, deletion or substitution. */
export function withinOneEdit(a: string, b: string): boolean {
  if (Math.abs(a.length - b.length) > 1) {
    return false;
  }
  let i = 0;
  let j = 0;
  let edits = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      i += 1;
      j += 1;
      continue;
    }
    edits += 1;
    if (edits > 1) {
      return false;
    }
    if (a.length > b.length) {
      i += 1;
    } else if (a.length < b.length) {
      j += 1;
    } else {
      i += 1;
      j += 1;
    }
  }
  return edits + (a.length - i) + (b.length - j) <= 1;
}

function termScore(term: Token, token: Token): number {
  if (term.stem === token.stem) {
    return 1;
  }
  if (term.norm.length >= 2 && token.norm.startsWith(term.norm)) {
    return 0.8;
  }
  if (term.stem.length >= 5 && withinOneEdit(term.stem, token.stem)) {
    return 0.5;
  }
  return 0;
}

function scoreEntry(entry: Entry, terms: Token[]): Scored {
  let score = 0;
  let matched = 0;
  const matchedTags = new Set<string>();

  for (const term of terms) {
    let best = 0;
    for (const field of FIELDS) {
      for (const token of entry.fields[field]) {
        best = Math.max(best, FIELD_WEIGHTS[field] * termScore(term, token));
      }
    }
    for (const { tag, tokens } of entry.tags) {
      if (tokens.some((token) => termScore(term, token) > 0)) {
        matchedTags.add(tag);
      }
    }
    if (best > 0) {
      score += best;
      matched += 1;
    }
  }

  return { entry, score, matched, matchedTags: [...matchedTags] };
}

function toHit({ entry, score, matchedTags }: Scored): SearchHit {
  return {
    link: entry.link,
    kind: entry.kind,
    score,
    collectionName: entry.collectionName,
    workspaceId: entry.workspaceId,
    workspaceName: entry.workspaceName,
    matchedTags,
  };
}

function newestFirst(a: Scored, b: Scored): number {
  return b.entry.link.createdAt - a.entry.link.createdAt;
}

function countKinds(items: Scored[]): Partial<Record<LinkKind, number>> {
  const counts: Partial<Record<LinkKind, number>> = {};
  for (const { entry } of items) {
    counts[entry.kind] = (counts[entry.kind] ?? 0) + 1;
  }
  return counts;
}

export function search(index: SearchIndex, query: string, options: SearchOptions = {}): SearchResult {
  const parsed = parseQuery(query);
  const kinds = [...new Set([...parsed.kinds, ...(options.kinds ?? [])])];
  const limit = options.limit ?? 50;
  const passesKinds = (s: Scored): boolean => kinds.length === 0 || kinds.includes(s.entry.kind);

  if (parsed.terms.length === 0) {
    const all: Scored[] = index.entries.map((entry) => ({ entry, score: 0, matched: 0, matchedTags: [] }));
    const results = kinds.length === 0
      ? []
      : all.filter(passesKinds).sort(newestFirst).slice(0, limit).map(toHit);
    return { results, partial: [], kinds, kindCounts: countKinds(all) };
  }

  const scored = index.entries.map((entry) => scoreEntry(entry, parsed.terms));
  const full = scored.filter((s) => s.matched === parsed.terms.length);
  const results = full
    .filter(passesKinds)
    .sort((a, b) => b.score - a.score || newestFirst(a, b))
    .slice(0, limit)
    .map(toHit);
  const some = scored.filter((s) => s.matched > 0);
  const partial = results.length > 0
    ? []
    : some
      .filter(passesKinds)
      .sort((a, b) => b.matched - a.matched || b.score - a.score || newestFirst(a, b))
      .slice(0, limit)
      .map(toHit);

  return { results, partial, kinds, kindCounts: countKinds(full.length > 0 ? full : some) };
}
```

- [ ] **Step 5: Rodar e ver passar** — mesmo comando → PASS. Depois `make test` (a suíte inteira continua verde; `tags` é opcional).

- [ ] **Step 6: Lint, tipos e commit**

```bash
docker compose run --rm app sh -c "npx eslint src/lib/search src/lib/types.ts src/test/lib/search; npx tsc --noEmit 2>&1 | grep -E '^src/(lib/search|lib/types|test/lib/search)'"
git add src/lib/search/engine.ts src/lib/types.ts src/test/lib/search/engine.test.ts
git commit -m "feat(search): rank links by title, tags, site, collection and workspace"
```

---

### Task 4: Medição com gabarito e decisão

**Files:**
- Create: `src/test/eval/search.eval.test.ts` (pulado sem `TABALA_EVAL_DIR`)
- Modify: `.gitignore` (linha `.eval/`)
- Create (no caderno, fora do repo): `<caderno>/anexos/tabala/gabarito-busca-2026-09.json`

**Interfaces:**
- Consumes: `buildIndex`, `search` (Task 3); `TabAlaExportFile` de `@/lib/storage`.
- Produces: tabela de acerto@5 por modo e categoria; decisão registrada no caderno.

- [ ] **Step 1: Montar o gabarito, ANTES de abrir o arquivo de tags do spike** — ler `<caderno>/anexos/tabala/tabala-organizado-2026-09-24.json` e escrever `gabarito-busca-2026-09.json` com a forma:

```json
[
  { "consulta": "história da IA", "idsEsperados": ["<id>"], "categoria": "assunto" },
  { "consulta": "mckinsy", "idsEsperados": ["<id>"], "categoria": "titulo" }
]
```

Regras: ~20 itens `assunto` descrevem o tema sem usar palavras marcantes do título (é como o usuário lembraria: "paper de busca híbrida", "vídeo sobre agentes", "como virar engenheiro de IA"); ~10 itens `titulo` usam uma palavra do título ou do site, 3 deles com um erro de digitação. Cada item lista de 1 a 3 ids aceitos. Cobrir pelo menos 6 workspaces. Commit no repo `caderno` (`anexos/tabala/gabarito-busca-2026-09.json`).

- [ ] **Step 2: Escrever o harness**

```ts
/**
 * Offline evaluation of the search: hit@5 with and without tags, by category.
 * Skipped unless TABALA_EVAL_DIR points to a folder with export.json,
 * tags.json (spike output) and gabarito.json. Those files hold personal data
 * and never enter the repository (.eval/ is gitignored).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildIndex, search, type SearchIndex } from '@/lib/search/engine';
import type { TabAlaExportFile } from '@/lib/storage';

interface GabaritoItem {
  consulta: string;
  idsEsperados: string[];
  categoria: 'assunto' | 'titulo';
}

const dir = process.env.TABALA_EVAL_DIR;

function read<T>(name: string): T {
  return JSON.parse(readFileSync(join(dir ?? '', name), 'utf8')) as T;
}

function top5(index: SearchIndex, query: string): string[] {
  const result = search(index, `${query} `);
  const hits = result.results.length > 0 ? result.results : result.partial;
  return hits.slice(0, 5).map((hit) => hit.link.id);
}

describe.skipIf(dir === undefined)('search evaluation', () => {
  it('prints hit@5 with and without tags', () => {
    const data = read<TabAlaExportFile>('export.json');
    const { tags } = read<{ tags: Record<string, string[]> }>('tags.json');
    const gabarito = read<GabaritoItem[]>('gabarito.json');

    const untagged = data.links.map(({ tags: _tags, ...link }) => link);
    const tagged = untagged.map((link) => (tags[link.id] === undefined ? link : { ...link, tags: tags[link.id] }));
    const coverage = tagged.filter((link) => link.tags !== undefined).length;
    console.log(`links com tags: ${coverage}/${tagged.length}`);

    const modes: Record<string, SearchIndex> = {
      semTags: buildIndex(untagged, data.collections, data.workspaces),
      comTags: buildIndex(tagged, data.collections, data.workspaces),
    };
    const rows: { modo: string; categoria: string; acerto5: string; pct: number }[] = [];
    for (const [modo, index] of Object.entries(modes)) {
      for (const categoria of ['assunto', 'titulo'] as const) {
        const items = gabarito.filter((g) => g.categoria === categoria);
        const misses = items.filter((g) => !g.idsEsperados.some((id) => top5(index, g.consulta).includes(id)));
        const hits = items.length - misses.length;
        rows.push({ modo, categoria, acerto5: `${hits}/${items.length}`, pct: Math.round((100 * hits) / items.length) });
        for (const miss of misses) {
          console.log(`[${modo}] errou "${miss.consulta}" -> ${top5(index, miss.consulta).join(', ')}`);
        }
      }
    }
    console.table(rows);
    expect(rows).toHaveLength(4);
  });
});
```

- [ ] **Step 3: Confirmar que a suíte normal pula o harness** — `docker compose run --rm app npx vitest run src/test/eval` → `1 skipped`.

- [ ] **Step 4: Rodar a medição**

```bash
echo ".eval/" >> .gitignore
mkdir -p .eval
cp <caderno>/anexos/tabala/tabala-organizado-2026-09-24.json .eval/export.json
cp <caderno>/anexos/tabala/tags-spike-2026-09.json .eval/tags.json
cp <caderno>/anexos/tabala/gabarito-busca-2026-09.json .eval/gabarito.json
docker compose run --rm -e TABALA_EVAL_DIR=/app/.eval app npx vitest run src/test/eval
```

Se a linha `links com tags` mostrar menos de 90% de cobertura, os ids do storage divergem do arquivo do caderno: pedir ao usuário um export novo (Configurações → Dados → Exportar), copiá-lo para `.eval/export.json`, refazer os ids do gabarito a partir dele e rodar de novo.

- [ ] **Step 5: Commit do harness** (sem os dados)

```bash
git status --short .eval   # não pode listar nada
git add src/test/eval/search.eval.test.ts .gitignore
git commit -m "test(search): offline hit@5 evaluation, with and without tags"
```

- [ ] **Step 6: CHECKPOINT — decisão com o usuário.** Critério da spec §9: `pct(comTags, assunto) − pct(semTags, assunto) ≥ 20` **e** `pct(comTags, titulo) ≥ pct(semTags, titulo)`. Registrar os números e a decisão no log de `caderno/projetos/tabAla.md` e commitar no caderno. Mostrar ao usuário a tabela e os erros impressos. **Se o critério falhar, parar aqui**: as Tasks 5–7 continuam válidas (o motor funciona sem tags), mas as Tasks 8–11 dão lugar a um plano B (IA interpretando a pergunta), que precisa de spec e plano próprios.

---

### Task 5: Painel de busca no dashboard

**Files:**
- Create: `src/lib/search/labels.ts`, `src/newtab/shortcuts.ts`, `src/newtab/reveal.ts`, `src/newtab/components/SearchPanel.svelte`
- Modify: `src/newtab/App.svelte`, `src/newtab/components/LinkCard.svelte`, `public/_locales/en/messages.json`, `public/_locales/pt_BR/messages.json`
- Test: `src/test/newtab/shortcuts.test.ts`, `src/test/newtab/reveal.test.ts`, `src/test/components/SearchPanel.test.ts`

**Interfaces:**
- Consumes: `buildIndex`, `search`, `SearchHit`, `IndexNames` (Task 3); `LINK_KINDS`, `LinkKind` (Task 1); `openLinkInCurrentTab`, `openLinkInNewTab`, `extractDomain` de `@/lib/tabs`; `workspacesStore.setActiveWorkspace(id: string)`.
- Produces:
  - `displayNames: IndexNames`, `KIND_LABEL_KEYS: Record<LinkKind, string>`, `hitPath(hit: SearchHit): string` em `src/lib/search/labels.ts` (o popup usa na Task 7).
  - `opensSearch(event: KeyboardEvent): boolean` e `isEditable(target: EventTarget | null): boolean` em `src/newtab/shortcuts.ts`.
  - `workspaceForLink(link: Link, collections: Collection[], activeWorkspaceId: string): string` e `revealLink(linkId: string, root?: ParentNode): Promise<boolean>` em `src/newtab/reveal.ts`.
  - `SearchPanel.svelte`: props `links: Link[]`, `collections: Collection[]`, `workspaces: Workspace[]`, `topicSearchHint = false`; eventos `open: Link`, `openInNewTab: Link`, `reveal: Link`, `close: void`.
  - `LinkCard` com atributo `data-link-id`.

- [ ] **Step 1: Chaves de texto** — nos dois arquivos de locale, antes do `}` final (atenção à vírgula na entrada anterior):

en:
```json
  "search_placeholder": { "message": "Search every workspace…" },
  "search_dialog_label": { "message": "Search links" },
  "search_partial": { "message": "Partial matches" },
  "search_empty": { "message": "Nothing found" },
  "search_hint_keys": { "message": "↑↓ move · Enter opens · ⌘Enter new tab · ⇧Enter show in board · Esc closes" },
  "search_enable_topic_hint": { "message": "Turn on topic search in Settings to find links by subject" },
  "kind_video": { "message": "Video" },
  "kind_paper": { "message": "Paper" },
  "kind_repo": { "message": "Repository" },
  "kind_code_change": { "message": "PR/Issue" },
  "kind_docs": { "message": "Docs" },
  "kind_exercise": { "message": "Exercise" },
  "kind_social": { "message": "Post" },
  "kind_search": { "message": "Search" },
  "kind_file": { "message": "Local file" },
  "kind_page": { "message": "Page" }
```

pt_BR:
```json
  "search_placeholder": { "message": "Buscar em todos os workspaces…" },
  "search_dialog_label": { "message": "Buscar links" },
  "search_partial": { "message": "Parciais" },
  "search_empty": { "message": "Nada encontrado" },
  "search_hint_keys": { "message": "↑↓ navega · Enter abre · ⌘Enter aba nova · ⇧Enter mostra no quadro · Esc fecha" },
  "search_enable_topic_hint": { "message": "Ative a busca por assunto em Configurações para achar links pelo tema" },
  "kind_video": { "message": "Vídeo" },
  "kind_paper": { "message": "Paper" },
  "kind_repo": { "message": "Repositório" },
  "kind_code_change": { "message": "PR/Issue" },
  "kind_docs": { "message": "Docs" },
  "kind_exercise": { "message": "Exercício" },
  "kind_social": { "message": "Post" },
  "kind_search": { "message": "Busca" },
  "kind_file": { "message": "Arquivo local" },
  "kind_page": { "message": "Página" }
```

Validar: `python3 -c "import json; [json.load(open(f'public/_locales/{l}/messages.json')) for l in ('en','pt_BR')]"`.

- [ ] **Step 2: Rótulos** — criar `src/lib/search/labels.ts`:

```ts
/** Translated names and labels for search results (uses chrome.i18n). */
import { getCollectionDisplayName, getWorkspaceDisplayName } from '@/lib/i18n';
import type { LinkKind } from '@/lib/link-kind';
import type { IndexNames, SearchHit } from './engine';

export const displayNames: IndexNames = {
  collection: getCollectionDisplayName,
  workspace: getWorkspaceDisplayName,
};

export const KIND_LABEL_KEYS: Record<LinkKind, string> = {
  video: 'kind_video',
  paper: 'kind_paper',
  repo: 'kind_repo',
  'code-change': 'kind_code_change',
  docs: 'kind_docs',
  exercise: 'kind_exercise',
  social: 'kind_social',
  search: 'kind_search',
  file: 'kind_file',
  page: 'kind_page',
};

/** "Workspace › Collection"; Inbox links show only the collection. */
export function hitPath(hit: SearchHit): string {
  return hit.workspaceName === undefined
    ? hit.collectionName
    : `${hit.workspaceName} › ${hit.collectionName}`;
}
```

- [ ] **Step 3: Testes que falham — atalhos e "mostrar no quadro"**

`src/test/newtab/shortcuts.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { opensSearch } from '@/newtab/shortcuts';

function keydown(init: KeyboardEventInit, target: EventTarget = document.body): KeyboardEvent {
  const event = new KeyboardEvent('keydown', init);
  Object.defineProperty(event, 'target', { value: target });
  return event;
}

describe('opensSearch', () => {
  const input = document.createElement('input');
  const textarea = document.createElement('textarea');

  it.each([
    ['Cmd+K', keydown({ key: 'k', metaKey: true }), true],
    ['Ctrl+K', keydown({ key: 'k', ctrlKey: true }), true],
    ['Ctrl+K while typing in a field', keydown({ key: 'k', ctrlKey: true }, input), true],
    ['/ on the page', keydown({ key: '/' }), true],
    ['/ typed in a field', keydown({ key: '/' }, input), false],
    ['/ typed in a textarea', keydown({ key: '/' }, textarea), false],
    ['k alone', keydown({ key: 'k' }), false],
  ])('%s -> %s', (_label, event, expected) => {
    expect(opensSearch(event)).toBe(expected);
  });
});
```

`src/test/newtab/reveal.test.ts`:
```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { revealLink, workspaceForLink, REVEAL_MS } from '@/newtab/reveal';
import { createMockCollection, createMockLink } from '../factories';

describe('workspaceForLink', () => {
  const collections = [
    createMockCollection({ id: 'inbox', name: 'Inbox', isDefault: true }),
    createMockCollection({ id: 'cp', name: 'ICPC', workspaceId: 'ws-study' }),
  ];

  it('switches to the workspace of the link collection', () => {
    expect(workspaceForLink(createMockLink({ collectionId: 'cp' }), collections, 'general')).toBe('ws-study');
  });

  it('keeps the current workspace for Inbox links, which show everywhere', () => {
    expect(workspaceForLink(createMockLink({ collectionId: 'inbox' }), collections, 'ws-other')).toBe('ws-other');
  });
});

describe('revealLink', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    Element.prototype.scrollIntoView = vi.fn();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('scrolls to the card and highlights it for a while', async () => {
    const root = document.createElement('div');
    root.innerHTML = '<div data-link-id="a" tabindex="0"></div><div data-link-id="b" tabindex="0"></div>';
    const card = root.querySelector<HTMLElement>('[data-link-id="b"]')!;

    const promise = revealLink('b', root);
    await vi.runAllTicks();
    expect(await promise).toBe(true);
    expect(card.scrollIntoView).toHaveBeenCalled();
    expect(card.classList.contains('revealed')).toBe(true);

    vi.advanceTimersByTime(REVEAL_MS);
    expect(card.classList.contains('revealed')).toBe(false);
  });

  it('reports a card that is not on screen', async () => {
    const promise = revealLink('missing', document.createElement('div'));
    await vi.runAllTicks();
    expect(await promise).toBe(false);
  });
});
```

Rodar: `docker compose run --rm app npx vitest run src/test/newtab` → FAIL (módulos não existem).

- [ ] **Step 4: Implementar atalhos e "mostrar no quadro"**

`src/newtab/shortcuts.ts`:
```ts
export function isEditable(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
}

/** ⌘K / Ctrl+K open the search anywhere; "/" only outside text fields. */
export function opensSearch(event: KeyboardEvent): boolean {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
    return true;
  }
  return event.key === '/' && !event.metaKey && !event.ctrlKey && !isEditable(event.target);
}
```

`src/newtab/reveal.ts`:
```ts
import { tick } from 'svelte';
import type { Collection, Link } from '@/lib/types';

export const REVEAL_MS = 2000;

/** Workspace that shows the link; Inbox links show in every workspace. */
export function workspaceForLink(link: Link, collections: Collection[], activeWorkspaceId: string): string {
  const collection = collections.find((c) => c.id === link.collectionId);
  return collection?.workspaceId ?? activeWorkspaceId;
}

/** Scrolls to a link card and highlights it. False when the card is not rendered. */
export async function revealLink(linkId: string, root: ParentNode = document): Promise<boolean> {
  await tick();
  const card = Array.from(root.querySelectorAll<HTMLElement>('[data-link-id]'))
    .find((element) => element.dataset.linkId === linkId);
  if (card === undefined) {
    return false;
  }
  card.scrollIntoView({ block: 'center', behavior: 'smooth' });
  card.focus({ preventScroll: true });
  card.classList.add('revealed');
  setTimeout(() => card.classList.remove('revealed'), REVEAL_MS);
  return true;
}
```

Rodar `docker compose run --rm app npx vitest run src/test/newtab` → PASS.

- [ ] **Step 5: Teste que falha — painel**

`src/test/components/SearchPanel.test.ts`:
```ts
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import SearchPanel from '@/newtab/components/SearchPanel.svelte';
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

function setup(props: Record<string, unknown> = {}) {
  const handlers = { open: vi.fn(), openInNewTab: vi.fn(), reveal: vi.fn(), close: vi.fn() };
  render(SearchPanel, { props: { links, collections, workspaces, ...props }, events: handlers });
  return { handlers, input: screen.getByPlaceholderText('search_placeholder') };
}

async function type(input: HTMLElement, value: string): Promise<void> {
  await fireEvent.input(input, { target: { value } });
}

describe('SearchPanel', () => {
  it('lists matches from any workspace with their path', async () => {
    const { input } = setup();
    await type(input, 'hermes');

    const options = screen.getAllByRole('option');
    expect(options.map((o) => o.textContent)).toEqual([
      expect.stringContaining('Hermes harness talk'),
      expect.stringContaining('hermes-agent'),
    ]);
    expect(screen.getAllByText('Agentes › Hermes Agent')).toHaveLength(2);
  });

  it('moves with the arrows and opens the highlighted result with Enter', async () => {
    const { input, handlers } = setup();
    await type(input, 'hermes');
    await fireEvent.keyDown(input, { key: 'ArrowDown' });
    await fireEvent.keyDown(input, { key: 'Enter' });

    expect(handlers.open).toHaveBeenCalledTimes(1);
    expect(handlers.open.mock.calls[0][0].detail.id).toBe('repo');
  });

  it('opens in a new tab with Cmd+Enter and shows in the board with Shift+Enter', async () => {
    const { input, handlers } = setup();
    await type(input, 'hermes');
    await fireEvent.keyDown(input, { key: 'Enter', metaKey: true });
    await fireEvent.keyDown(input, { key: 'Enter', shiftKey: true });

    expect(handlers.openInNewTab.mock.calls[0][0].detail.id).toBe('video');
    expect(handlers.reveal.mock.calls[0][0].detail.id).toBe('video');
    expect(handlers.open).not.toHaveBeenCalled();
  });

  it('closes with Escape', async () => {
    const { input, handlers } = setup();
    await fireEvent.keyDown(input, { key: 'Escape' });
    expect(handlers.close).toHaveBeenCalledTimes(1);
  });

  it('filters by a kind chip', async () => {
    const { input } = setup();
    await type(input, 'hermes');
    await fireEvent.click(screen.getByRole('button', { name: /kind_video/ }));

    expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual([
      expect.stringContaining('Hermes harness talk'),
    ]);
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

    expect(screen.getByText('search_empty')).toBeInTheDocument();
    expect(screen.getByText('search_enable_topic_hint')).toBeInTheDocument();
  });
});
```

Rodar `docker compose run --rm app npx vitest run src/test/components/SearchPanel.test.ts` → FAIL (componente não existe).

- [ ] **Step 6: Implementar o painel** — `src/newtab/components/SearchPanel.svelte`:

```svelte
<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import { t } from '@/lib/i18n';
  import type { Collection, Link, Workspace } from '@/lib/types';
  import { LINK_KINDS, type LinkKind } from '@/lib/link-kind';
  import { buildIndex, search, type SearchHit } from '@/lib/search/engine';
  import { displayNames, hitPath, KIND_LABEL_KEYS } from '@/lib/search/labels';
  import { extractDomain } from '@/lib/tabs';

  export let links: Link[] = [];
  export let collections: Collection[] = [];
  export let workspaces: Workspace[] = [];
  /** Shown with "nothing found" when topic search is off but available. */
  export let topicSearchHint = false;

  const dispatch = createEventDispatcher<{
    open: Link;
    openInNewTab: Link;
    reveal: Link;
    close: void;
  }>();

  let query = '';
  let selectedKinds: LinkKind[] = [];
  let activeIndex = 0;
  let input: HTMLInputElement;

  $: index = buildIndex(links, collections, workspaces, displayNames);
  $: result = search(index, query, { kinds: selectedKinds });
  $: showingPartial = result.results.length === 0 && result.partial.length > 0;
  $: hits = showingPartial ? result.partial : result.results;
  $: chipKinds = LINK_KINDS.filter(
    (kind) => (result.kindCounts[kind] ?? 0) > 0 || selectedKinds.includes(kind)
  );
  $: if (activeIndex > Math.max(hits.length - 1, 0)) {
    activeIndex = Math.max(hits.length - 1, 0);
  }
  $: searching = query.trim() !== '' || selectedKinds.length > 0;

  onMount(() => {
    input.focus();
  });

  function toggleKind(kind: LinkKind): void {
    selectedKinds = selectedKinds.includes(kind)
      ? selectedKinds.filter((k) => k !== kind)
      : [...selectedKinds, kind];
    activeIndex = 0;
  }

  function choose(hit: SearchHit | undefined, modifiers: { metaKey: boolean; ctrlKey: boolean; shiftKey: boolean }): void {
    if (hit === undefined) {
      return;
    }
    if (modifiers.shiftKey) {
      dispatch('reveal', hit.link);
    } else if (modifiers.metaKey || modifiers.ctrlKey) {
      dispatch('openInNewTab', hit.link);
    } else {
      dispatch('open', hit.link);
    }
  }

  function handleKeydown(event: KeyboardEvent): void {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      activeIndex = Math.min(activeIndex + 1, Math.max(hits.length - 1, 0));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      activeIndex = Math.max(activeIndex - 1, 0);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      choose(hits[activeIndex], event);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      dispatch('close');
    }
  }
</script>

<div class="search-overlay">
  <button
    type="button"
    class="search-backdrop"
    tabindex="-1"
    aria-label={t('common_close')}
    on:click={() => dispatch('close')}
  ></button>

  <div class="search-panel" role="dialog" aria-modal="true" aria-label={t('search_dialog_label')}>
    <input
      bind:this={input}
      bind:value={query}
      on:input={() => (activeIndex = 0)}
      on:keydown={handleKeydown}
      class="search-field"
      type="text"
      placeholder={t('search_placeholder')}
      aria-controls="search-results"
    />

    {#if chipKinds.length > 0}
      <div class="kind-chips">
        {#each chipKinds as kind (kind)}
          <button
            type="button"
            class="kind-chip"
            class:active={selectedKinds.includes(kind)}
            aria-pressed={selectedKinds.includes(kind)}
            on:click={() => toggleKind(kind)}
          >
            {t(KIND_LABEL_KEYS[kind])}
            <span class="chip-count">{result.kindCounts[kind] ?? 0}</span>
          </button>
        {/each}
      </div>
    {/if}

    {#if showingPartial}
      <p class="section-label">{t('search_partial')}</p>
    {/if}

    <ul id="search-results" class="results" role="listbox">
      {#each hits as hit, i (hit.link.id)}
        <li role="option" aria-selected={i === activeIndex} class:active={i === activeIndex}>
          <button
            type="button"
            class="hit"
            tabindex="-1"
            on:click={(event) => choose(hit, event)}
            on:mousemove={() => (activeIndex = i)}
          >
            <span class="hit-favicon">
              {#if hit.link.favicon}
                <img src={hit.link.favicon} alt="" width="16" height="16" loading="lazy" />
              {/if}
            </span>
            <span class="hit-body">
              <span class="hit-title">{hit.link.title || hit.link.url}</span>
              <span class="hit-meta">
                <span class="hit-path">{hitPath(hit)}</span>
                <span class="hit-kind">{t(KIND_LABEL_KEYS[hit.kind])}</span>
                <span class="hit-domain">{extractDomain(hit.link.url).replace(/^www\./, '')}</span>
              </span>
              {#if hit.link.tags !== undefined && hit.link.tags.length > 0}
                <span class="hit-tags">
                  {#each hit.link.tags as tag (tag)}
                    <span class="hit-tag" class:matched={hit.matchedTags.includes(tag)}>{tag}</span>
                  {/each}
                </span>
              {/if}
            </span>
          </button>
        </li>
      {/each}
    </ul>

    {#if hits.length === 0 && searching}
      <p class="empty">{t('search_empty')}</p>
      {#if topicSearchHint}
        <p class="empty-hint">{t('search_enable_topic_hint')}</p>
      {/if}
    {/if}

    <p class="keys-hint">{t('search_hint_keys')}</p>
  </div>
</div>

<style>
  .search-overlay {
    position: fixed;
    inset: 0;
    z-index: 100;
    display: flex;
    justify-content: center;
    align-items: flex-start;
    padding-top: 12vh;
  }

  .search-backdrop {
    position: absolute;
    inset: 0;
    border: none;
    background: rgba(0, 0, 0, 0.45);
    cursor: default;
  }

  .search-panel {
    position: relative;
    width: min(640px, 92vw);
    max-height: 70vh;
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    padding: var(--space-4);
    background: var(--surface-elevated);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-xl);
    box-shadow: var(--shadow-card-hover);
  }

  .search-field {
    width: 100%;
    height: 48px;
    padding: 0 var(--space-4);
    background: var(--surface-overlay);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-lg);
    color: var(--text-primary);
    font-family: var(--font-body);
    font-size: var(--text-md);
  }

  .search-field:focus {
    outline: none;
    border-color: var(--accent-primary);
    box-shadow: 0 0 0 3px var(--accent-soft);
  }

  .kind-chips {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
  }

  .kind-chip {
    display: inline-flex;
    align-items: center;
    gap: var(--space-1);
    padding: 4px 10px;
    background: var(--surface-overlay);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-full);
    color: var(--text-secondary);
    font-family: var(--font-body);
    font-size: var(--text-xs);
    cursor: pointer;
  }

  .kind-chip.active {
    border-color: var(--accent-primary);
    color: var(--text-primary);
    background: var(--accent-soft);
  }

  .chip-count {
    color: var(--text-tertiary);
  }

  .section-label,
  .empty,
  .empty-hint,
  .keys-hint {
    margin: 0;
    font-family: var(--font-body);
    font-size: var(--text-xs);
    color: var(--text-tertiary);
  }

  .empty {
    font-size: var(--text-sm);
    color: var(--text-secondary);
  }

  .results {
    list-style: none;
    margin: 0;
    padding: 0;
    overflow-y: auto;
  }

  .results li.active .hit {
    background: var(--surface-overlay);
    border-color: var(--border-default);
  }

  .hit {
    width: 100%;
    display: flex;
    gap: var(--space-3);
    padding: var(--space-2) var(--space-3);
    background: transparent;
    border: 1px solid transparent;
    border-radius: var(--radius-md);
    color: inherit;
    font: inherit;
    text-align: left;
    cursor: pointer;
  }

  .hit-favicon {
    flex-shrink: 0;
    width: 16px;
    height: 16px;
    margin-top: 2px;
  }

  .hit-body {
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .hit-title {
    font-family: var(--font-body);
    font-size: var(--text-sm);
    color: var(--text-primary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .hit-meta,
  .hit-tags {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
    font-family: var(--font-body);
    font-size: var(--text-xs);
    color: var(--text-tertiary);
  }

  .hit-tag {
    padding: 0 6px;
    border-radius: var(--radius-full);
    background: var(--surface-overlay);
  }

  .hit-tag.matched {
    color: var(--text-primary);
    background: var(--accent-soft);
  }
</style>
```

(`common_close` já existe nos dois locales; os tokens de CSS usados existem em `src/shared/styles/` e `src/newtab/app.css`.)

Rodar `docker compose run --rm app npx vitest run src/test/components/SearchPanel.test.ts` → PASS.

- [ ] **Step 7: Card com `data-link-id` e destaque** — em `src/newtab/components/LinkCard.svelte`, na `<div class="link-card" …>` acrescentar o atributo `data-link-id={link.id}`, e no `<style>`:

```css
  .link-card:global(.revealed) {
    border-color: var(--accent-primary);
    box-shadow: 0 0 0 2px var(--accent-soft);
  }
```

- [ ] **Step 8: Ligar no dashboard** — em `src/newtab/App.svelte`:

Imports novos (junto dos existentes):
```ts
  import type { Link } from '@/lib/types';
  import { openLinkInCurrentTab, openLinkInNewTab } from '@/lib/tabs';
  import SearchPanel from './components/SearchPanel.svelte';
  import { opensSearch } from './shortcuts';
  import { revealLink, workspaceForLink } from './reveal';
```

Estado: `let showSearch = false;`

Em `handleKeydown`, substituir o bloco

```ts
    if (event.key === '/' || (event.ctrlKey && event.key === 'k')) {
      event.preventDefault();
      document.querySelector<HTMLInputElement>('[data-search-input]')?.focus();
      return;
    }
```

por

```ts
    if (opensSearch(event)) {
      event.preventDefault();
      showSearch = true;
      return;
    }
```

Handlers novos:
```ts
  async function handleSearchOpen(event: CustomEvent<Link>): Promise<void> {
    showSearch = false;
    const result = await openLinkInCurrentTab(event.detail.url);
    if (!result.success) {
      errorMessage = result.error ?? t('error_open_link_failed');
    }
  }

  async function handleSearchOpenInNewTab(event: CustomEvent<Link>): Promise<void> {
    const result = await openLinkInNewTab(event.detail.url);
    if (!result.success) {
      errorMessage = result.error ?? t('error_open_link_failed');
    }
  }

  async function handleSearchReveal(event: CustomEvent<Link>): Promise<void> {
    showSearch = false;
    const link = event.detail;
    workspacesStore.setActiveWorkspace(
      workspaceForLink(link, $linksStore.collections, $workspacesStore.activeWorkspaceId)
    );
    await revealLink(link.id);
  }
```

Markup, depois do bloco `{#if showOnboarding}…{/if}`:
```svelte
{#if showSearch}
  <SearchPanel
    links={$linksStore.links}
    collections={$linksStore.collections}
    workspaces={$workspacesStore.workspaces}
    on:open={handleSearchOpen}
    on:openInNewTab={handleSearchOpenInNewTab}
    on:reveal={handleSearchReveal}
    on:close={() => (showSearch = false)}
  />
{/if}
```

- [ ] **Step 9: Suíte, lint, tipos e commit**

```bash
make test
docker compose run --rm app sh -c "npx eslint src/lib/search src/newtab/shortcuts.ts src/newtab/reveal.ts src/newtab/components/SearchPanel.svelte src/newtab/components/LinkCard.svelte src/newtab/App.svelte src/test/newtab src/test/components/SearchPanel.test.ts; npx tsc --noEmit 2>&1 | grep -E '^src/(lib/search|newtab/(shortcuts|reveal|App|components/(SearchPanel|LinkCard))|test/newtab|test/components/SearchPanel)'"
git add src/lib/search/labels.ts src/newtab/shortcuts.ts src/newtab/reveal.ts src/newtab/components/SearchPanel.svelte src/newtab/components/LinkCard.svelte src/newtab/App.svelte public/_locales/en/messages.json public/_locales/pt_BR/messages.json src/test/newtab/shortcuts.test.ts src/test/newtab/reveal.test.ts src/test/components/SearchPanel.test.ts
git commit -m "feat(search): search panel in the dashboard (Cmd+K), across every workspace"
```

---

### Task 6: Saída do filtro do quadro

**Files:**
- Modify: `src/newtab/components/Column.svelte`, `src/newtab/components/KanbanBoard.svelte`, `src/newtab/components/QuickActionsBar.svelte`, `src/newtab/App.svelte`, os dois locales
- Test: `src/test/components/QuickActionsBar.test.ts`, `src/test/components/Column.test.ts`

**Interfaces:**
- Consumes: `showSearch` do `App.svelte` (Task 5).
- Produces: `QuickActionsBar` sem prop `searchQuery`, com evento `openSearch: void`; `Column`/`KanbanBoard` sem `searchQuery`.

- [ ] **Step 1: Testes que falham**

`src/test/components/QuickActionsBar.test.ts`:
```ts
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import QuickActionsBar from '@/newtab/components/QuickActionsBar.svelte';

describe('QuickActionsBar', () => {
  it('opens the search panel from the search field', async () => {
    const openSearch = vi.fn();
    render(QuickActionsBar, { events: { openSearch } });

    await fireEvent.click(screen.getByRole('button', { name: /search_open_placeholder/ }));

    expect(openSearch).toHaveBeenCalledTimes(1);
  });
});
```

Em `src/test/components/Column.test.ts`, acrescentar:
```ts
  it('always shows every link of the collection', () => {
    render(Column, { props: { collection: workCollection, links: mockLinks } });

    expect(screen.getByText('Link 1')).toBeInTheDocument();
    expect(screen.getByText('Link 2')).toBeInTheDocument();
  });
```

Rodar `docker compose run --rm app npx vitest run src/test/components/QuickActionsBar.test.ts src/test/components/Column.test.ts` → QuickActionsBar FAIL (não há botão com esse nome); o de Column já passa (é guarda contra filtro remanescente).

- [ ] **Step 2: Chave de texto** — en `"search_open_placeholder": { "message": "Search all links" }`; pt_BR `"search_open_placeholder": { "message": "Buscar em todos os links" }`.

- [ ] **Step 3: `QuickActionsBar.svelte`**

No `<script>`: apagar `export let searchQuery`, `handleSearchInput` e `clearSearch`; o dispatcher passa a ser:
```ts
  const dispatch = createEventDispatcher<{
    openSearch: void;
    openSettings: void;
    newCollection: void;
  }>();
```

No markup, trocar todo o `<div class="search-container">…</div>` por:
```svelte
  <button type="button" class="search-container search-trigger" on:click={() => dispatch('openSearch')}>
    <svg class="search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="11" cy="11" r="8"/>
      <path d="M21 21l-4.35-4.35"/>
    </svg>
    <span class="search-placeholder">{t('search_open_placeholder')}</span>
    <kbd class="search-kbd">⌘K</kbd>
  </button>
```

No `<style>`: apagar as regras `.search-input`, `.search-input::placeholder`, `.search-input:focus`, `.search-container:focus-within .search-icon`, `.clear-search`, `.clear-search:hover`, `.clear-search:focus-visible`; acrescentar:
```css
  .search-trigger {
    width: 100%;
    height: 48px;
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: 0 var(--space-4);
    padding-left: calc(var(--space-4) + 20px + var(--space-2));
    background: var(--surface-overlay);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-lg);
    color: var(--text-tertiary);
    font-family: var(--font-body);
    font-size: var(--text-sm);
    text-align: left;
    cursor: text;
    transition: all var(--duration-fast) var(--ease-out);
  }

  .search-trigger:hover,
  .search-trigger:focus-visible {
    outline: none;
    border-color: var(--accent-primary);
    box-shadow: 0 0 0 3px var(--accent-soft);
  }

  .search-placeholder {
    flex: 1;
  }

  .search-kbd {
    padding: 2px 6px;
    border: 1px solid var(--border-default);
    border-radius: var(--radius-sm);
    font-family: var(--font-body);
    font-size: var(--text-xs);
  }
```

- [ ] **Step 4: `Column.svelte`**
  1. Apagar `export let searchQuery: string = '';`.
  2. Apagar os dois reativos `$: filteredLinks = …` e `$: hasMatches = …`.
  3. Trocar toda ocorrência de `filteredLinks` por `links` (em `handleOpenAll`, no contador `.link-count`, no `disabled` do menu, no `items:` do `dndzone` e no `{#each}`).
  4. Apagar a linha `{#if searchQuery === '' || hasMatches}` e o `{/if}` correspondente logo antes de `<style>`.
  5. No `{:else}` do `{#each}`, deixar só:
     ```svelte
        <div class="empty-column">
          <span>{t('newtab_drag_links_here')}</span>
        </div>
     ```

- [ ] **Step 5: `KanbanBoard.svelte`** — apagar `export let searchQuery`, o reativo `$: visibleColumns = …`, a prop `{searchQuery}` passada ao `<Column>`, o bloco `{#if searchQuery && visibleColumns.length === 0}…{/if}` e a regra CSS `.no-results` (e variantes) se ficar sem uso; apagar o import `INBOX_COLLECTION_ID` se não restar uso (`grep -n INBOX_COLLECTION_ID src/newtab/components/KanbanBoard.svelte`).

- [ ] **Step 6: `App.svelte`** — apagar `let searchQuery = '';`, a função `handleSearch` e a linha `searchQuery = '';` do ramo `Escape`; no `<QuickActionsBar>`, trocar `{searchQuery}` e `on:search={handleSearch}` por `on:openSearch={() => (showSearch = true)}`; no `<KanbanBoard>`, apagar `{searchQuery}`.

- [ ] **Step 7: Rodar** — `make test` → PASS; `grep -rn "searchQuery" src/newtab` → nada.

- [ ] **Step 8: Lint, tipos e commit**

```bash
docker compose run --rm app sh -c "npx eslint src/newtab/components/Column.svelte src/newtab/components/KanbanBoard.svelte src/newtab/components/QuickActionsBar.svelte src/newtab/App.svelte src/test/components/QuickActionsBar.test.ts src/test/components/Column.test.ts; npx tsc --noEmit 2>&1 | grep -E '^src/(newtab/(App|components/(Column|KanbanBoard|QuickActionsBar))|test/components/(QuickActionsBar|Column))'"
git add src/newtab/components/Column.svelte src/newtab/components/KanbanBoard.svelte src/newtab/components/QuickActionsBar.svelte src/newtab/App.svelte public/_locales/en/messages.json public/_locales/pt_BR/messages.json src/test/components/QuickActionsBar.test.ts src/test/components/Column.test.ts
git commit -m "feat(search): the search field opens the panel; the board filter goes away"
```

---

### Task 7: Busca no popup

**Files:**
- Modify: `src/popup/App.svelte`, os dois locales
- Test: `src/test/components/App.test.ts` (é o teste do popup)

**Interfaces:**
- Consumes: `buildIndex`, `search` (Task 3); `displayNames`, `hitPath` (Task 5); `handleOpenLink(link)` existente no popup.

- [ ] **Step 1: Teste que falha** — em `src/test/components/App.test.ts`, trocar o import do testing-library para incluir `fireEvent` e acrescentar dentro de `describe('App Component')`:

```ts
  it('searches every workspace and opens the first result with Enter', async () => {
    setStoreState({});
    render(App);
    await waitFor(() => {
      expect(screen.getByText('TabAla')).toBeInTheDocument();
    });

    const study = createMockWorkspace({ id: 'ws-study', name: 'Estudos', order: 1 });
    linksStore.set({
      ...DEFAULT_LINKS_STATE,
      collections: [
        { id: 'inbox', name: 'Inbox', order: 0 },
        { id: 'icpc', name: 'ICPC', order: 1, workspaceId: 'ws-study' },
      ],
      links: [createMockLink({ id: 'dij', title: 'Dijkstra notes', url: 'https://cp.example/dijkstra', collectionId: 'icpc' })],
    });
    workspacesStore.set({ ...DEFAULT_WORKSPACES_STATE, workspaces: [defaultWorkspace, study] });

    const input = screen.getByPlaceholderText('popup_search_placeholder');
    await fireEvent.input(input, { target: { value: 'dijkstra' } });

    expect(await screen.findByText('Dijkstra notes')).toBeInTheDocument();
    expect(screen.getByText('Estudos › ICPC')).toBeInTheDocument();

    await fireEvent.keyDown(input, { key: 'Enter' });
    expect(chrome.tabs.create).toHaveBeenCalledWith({ url: 'https://cp.example/dijkstra', active: true });
  });
```

Rodar `docker compose run --rm app npx vitest run src/test/components/App.test.ts` → FAIL (campo não existe).

- [ ] **Step 2: Chave de texto** — en `"popup_search_placeholder": { "message": "Search links" }`; pt_BR `"popup_search_placeholder": { "message": "Buscar links" }`.

- [ ] **Step 3: Implementar** — em `src/popup/App.svelte`:

Imports:
```ts
  import { buildIndex, search } from '@/lib/search/engine';
  import { displayNames, hitPath } from '@/lib/search/labels';
```

Estado e reativos:
```ts
  let query = '';
  $: searchIndex = buildIndex($linksStore.links, $linksStore.collections, $workspacesStore.workspaces, displayNames);
  $: found = query.trim() === '' ? null : search(searchIndex, query, { limit: 8 });
  $: searchHits = found === null ? [] : (found.results.length > 0 ? found.results : found.partial);

  function handleSearchKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && searchHits.length > 0) {
      event.preventDefault();
      void handleOpenLink(searchHits[0].link);
    } else if (event.key === 'Escape' && query !== '') {
      event.preventDefault();
      query = '';
    }
  }
```

Markup: logo depois de `</header>`:
```svelte
    <div class="popup-search">
      <input
        type="search"
        class="popup-search-input"
        bind:value={query}
        on:keydown={handleSearchKeydown}
        placeholder={t('popup_search_placeholder')}
        aria-label={t('popup_search_placeholder')}
      />
    </div>
```

Envolver a `<section class="collections">…</section>` existente assim:
```svelte
    {#if found !== null}
      <section class="search-results">
        {#each searchHits as hit (hit.link.id)}
          <button type="button" class="search-hit" on:click={() => handleOpenLink(hit.link)} title={hit.link.url}>
            {#if hit.link.favicon}
              <img src={hit.link.favicon} alt="" width="14" height="14" class="link-favicon" />
            {:else}
              <span class="link-favicon-placeholder"></span>
            {/if}
            <span class="search-hit-text">
              <span class="search-hit-title">{hit.link.title || hit.link.url}</span>
              <span class="search-hit-path">{hitPath(hit)}</span>
            </span>
          </button>
        {:else}
          <span class="empty-hint">{t('search_empty')}</span>
        {/each}
      </section>
    {:else}
      <!-- a <section class="collections"> existente, sem mudanças -->
    {/if}
```

CSS:
```css
  .popup-search {
    padding: 0 var(--space-4) var(--space-3);
  }

  .popup-search-input {
    width: 100%;
    height: 34px;
    padding: 0 var(--space-3);
    background: var(--surface-overlay);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-md);
    color: var(--text-primary);
    font-family: var(--font-body);
    font-size: var(--text-sm);
  }

  .popup-search-input:focus {
    outline: none;
    border-color: var(--accent-primary);
  }

  .search-results {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 0 var(--space-2) var(--space-3);
  }

  .search-hit {
    display: flex;
    align-items: flex-start;
    gap: var(--space-2);
    padding: var(--space-2);
    background: transparent;
    border: none;
    border-radius: var(--radius-md);
    color: inherit;
    font: inherit;
    text-align: left;
    cursor: pointer;
  }

  .search-hit:hover {
    background: var(--surface-overlay);
  }

  .search-hit-text {
    min-width: 0;
    display: flex;
    flex-direction: column;
  }

  .search-hit-title {
    font-size: var(--text-sm);
    color: var(--text-primary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .search-hit-path {
    font-size: var(--text-xs);
    color: var(--text-tertiary);
  }
```

- [ ] **Step 4: Rodar** — `docker compose run --rm app npx vitest run src/test/components/App.test.ts` → PASS; `make test` → PASS.

- [ ] **Step 5: Lint, tipos e commit**

```bash
docker compose run --rm app sh -c "npx eslint src/popup/App.svelte src/test/components/App.test.ts; npx tsc --noEmit 2>&1 | grep -E '^src/(popup/App|test/components/App)'"
git add src/popup/App.svelte public/_locales/en/messages.json public/_locales/pt_BR/messages.json src/test/components/App.test.ts
git commit -m "feat(search): search every workspace from the popup"
```

---

### Task 8: Tags nos dados

**Files:**
- Create: `src/lib/tags.ts`
- Modify: `src/lib/storage/links.ts`, `src/lib/storage/index.ts`, `src/lib/storage/import-export.ts`, `src/lib/stores/links.ts`, `src/test/mocks/storage.ts`, os dois locales
- Test: `src/test/lib/tags.test.ts`, `src/test/lib/storage.test.ts`, `src/test/lib/storage/import-export.test.ts`, `src/test/stores/links.test.ts`

**Interfaces:**
- Consumes: `withDataLock`, `getLinks`, `saveLinks` (storage).
- Produces:
  - `MAX_TAGS = 6`, `MAX_TAG_LENGTH = 40`, `sanitizeTags(input: unknown): string[]`, `parseTagInput(text: string): string[]` em `src/lib/tags.ts`.
  - `setLinkTags(updates: Record<string, string[]>, options: { onlyIfUntagged: boolean }): Promise<string[]>` (ids gravados) em `src/lib/storage/links.ts`, exportado pelo barrel.
  - `linksStore.setTags(linkId: string, tags: string[]): Promise<void>`.

- [ ] **Step 1: Testes que falham**

`src/test/lib/tags.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { sanitizeTags, parseTagInput } from '@/lib/tags';

describe('sanitizeTags', () => {
  it('lowercases, trims, drops empty, long and repeated tags, and keeps at most six', () => {
    expect(sanitizeTags([
      '  História da IA ', 'história  da ia', 'Escala', '', 42, 'x'.repeat(41), 'a', 'b', 'c', 'd', 'e',
    ])).toEqual(['história da ia', 'escala', 'a', 'b', 'c', 'd']);
  });

  it('returns an empty list for anything that is not a list', () => {
    expect(sanitizeTags('ia')).toEqual([]);
    expect(sanitizeTags(undefined)).toEqual([]);
  });
});

describe('parseTagInput', () => {
  it('splits on commas and cleans each tag', () => {
    expect(parseTagInput('ia, agentes,, IA ')).toEqual(['ia', 'agentes']);
  });
});
```

Em `src/test/lib/storage.test.ts` (importar `setLinkTags` do barrel junto dos outros):
```ts
describe('setLinkTags', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    clearMockStorage();
    await saveLinks([
      createMockLink({ id: 'untagged' }),
      createMockLink({ id: 'tagged', tags: ['minha tag'] }),
    ]);
  });

  const tagsOf = async (id: string): Promise<string[] | undefined> =>
    (await getLinks()).find((l) => l.id === id)?.tags;

  it('fills only untagged links when asked to, skipping missing ones', async () => {
    const written = await setLinkTags(
      { untagged: ['IA'], tagged: ['outra'], gone: ['x'] },
      { onlyIfUntagged: true }
    );

    expect(written).toEqual(['untagged']);
    expect(await tagsOf('untagged')).toEqual(['ia']);
    expect(await tagsOf('tagged')).toEqual(['minha tag']);
    expect((await getLinks()).map((l) => l.id)).toEqual(['untagged', 'tagged']);
  });

  it('overwrites tags on a manual edit', async () => {
    const written = await setLinkTags({ tagged: ['nova'] }, { onlyIfUntagged: false });

    expect(written).toEqual(['tagged']);
    expect(await tagsOf('tagged')).toEqual(['nova']);
  });
});
```

Em `src/test/lib/storage/import-export.test.ts`, no `describe('validateExportFile')`:
```ts
  it('rejects tags that are not a list of texts', () => {
    const notList = exportFile({ links: [{ ...createMockLink({ id: 'l1' }), tags: 'ia' as unknown as string[] }] });
    const notTexts = exportFile({ links: [{ ...createMockLink({ id: 'l1' }), tags: [1] as unknown as string[] }] });

    expect(() => validateExportFile(notList)).toThrow('Invalid link at index 0');
    expect(() => validateExportFile(notTexts)).toThrow('Invalid link at index 0');
  });
```
e no `describe('executeImport')`:
```ts
  it('cleans imported tags', async () => {
    mockExisting({ collections: [createMockCollection({ id: 'col-1' })] });

    await executeImport(exportFile({
      links: [createMockLink({ id: 'l1', collectionId: 'col-1', tags: ['  IA ', 'ia', 'Escala'] })],
    }));

    const saved = vi.mocked(dataAccess.saveLinks).mock.calls[0][0];
    expect(saved[0].tags).toEqual(['ia', 'escala']);
  });
```

Em `src/test/stores/links.test.ts`, novo `describe`:
```ts
describe('setTags', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    linksStore.set(INITIAL_STORE_STATE);
    mockStorageWith([createMockLink({ id: 'l1', collectionId: 'inbox' })]);
    await linksStore.load();
  });

  it('shows the cleaned tags right away', async () => {
    vi.mocked(storage.setLinkTags).mockResolvedValue(['l1']);

    await linksStore.setTags('l1', ['  IA ', 'ia']);

    expect(get(linksStore).links[0].tags).toEqual(['ia']);
  });

  it('rolls back when the tags could not be saved', async () => {
    vi.mocked(storage.setLinkTags).mockResolvedValue([]);

    await linksStore.setTags('l1', ['ia']);

    expect(get(linksStore).links[0].tags).toBeUndefined();
    expect(get(linksStore).error).toBe('error_save_tags_failed');
  });
});
```
e em `src/test/mocks/storage.ts` acrescentar `setLinkTags: vi.fn(() => Promise.resolve([])),`.

Rodar os quatro arquivos → FAIL (módulos e funções não existem).

- [ ] **Step 2: Implementar `src/lib/tags.ts`**

```ts
/** Subject tags: lowercase, trimmed, unique, at most MAX_TAGS of MAX_TAG_LENGTH chars. */
export const MAX_TAGS = 6;
export const MAX_TAG_LENGTH = 40;

export function sanitizeTags(input: unknown): string[] {
  if (!Array.isArray(input)) {
    return [];
  }
  const tags: string[] = [];
  for (const raw of input) {
    if (typeof raw !== 'string') {
      continue;
    }
    const tag = raw.trim().toLowerCase().replace(/\s+/g, ' ');
    if (tag === '' || tag.length > MAX_TAG_LENGTH || tags.includes(tag)) {
      continue;
    }
    tags.push(tag);
    if (tags.length === MAX_TAGS) {
      break;
    }
  }
  return tags;
}

/** Tags typed by the user, separated by commas. */
export function parseTagInput(text: string): string[] {
  return sanitizeTags(text.split(','));
}
```

- [ ] **Step 3: `setLinkTags` em `src/lib/storage/links.ts`** (import `sanitizeTags` de `'../tags'`), e exportar no barrel `src/lib/storage/index.ts` junto de `reorderLinks`:

```ts
/**
 * Writes tags for several links in one locked write. With onlyIfUntagged,
 * links that already have tags (e.g. edited by the user meanwhile) are left
 * alone. Missing links are skipped, never recreated. Returns the ids written.
 */
export async function setLinkTags(
  updates: Record<string, string[]>,
  options: { onlyIfUntagged: boolean }
): Promise<string[]> {
  return withDataLock(async () => {
    const links = await getLinks();
    const written: string[] = [];
    const updatedLinks = links.map((link) => {
      const tags = updates[link.id];
      if (tags === undefined || (options.onlyIfUntagged && link.tags !== undefined)) {
        return link;
      }
      written.push(link.id);
      return { ...link, tags: sanitizeTags(tags) };
    });
    if (written.length > 0) {
      await saveLinks(updatedLinks);
    }
    return written;
  });
}
```

(`updates[link.id]` tem tipo `string[]` sem `noUncheckedIndexedAccess`; se o ESLint reclamar de condição desnecessária, declarar o parâmetro como `Partial<Record<string, string[]>>`.)

- [ ] **Step 4: Import** — em `src/lib/storage/import-export.ts`:

No laço de validação de links, depois da checagem de `order`:
```ts
    if (l.tags !== undefined && (!Array.isArray(l.tags) || !l.tags.every((tag) => typeof tag === 'string'))) {
      throw new Error(`Invalid link at index ${i}: invalid tags`);
    }
```

Em `executeImport`, trocar `newLinks.push({ ...link, collectionId });` por:
```ts
        newLinks.push(
          link.tags === undefined
            ? { ...link, collectionId }
            : { ...link, collectionId, tags: sanitizeTags(link.tags) }
        );
```
(import `sanitizeTags` de `'../tags'`).

- [ ] **Step 5: Store** — em `src/lib/stores/links.ts`: importar `setLinkTags as storageSetLinkTags` do storage e `sanitizeTags` de `'@/lib/tags'`; declarar `setTags: (linkId: string, tags: string[]) => Promise<void>;` no tipo de retorno de `createLinksStore`; implementar e devolver `setTags`:

```ts
  async function setTags(linkId: string, tags: string[]): Promise<void> {
    const clean = sanitizeTags(tags);
    await optimisticUpdate(
      store,
      (state) => ({
        updated: {
          ...state,
          links: state.links.map((link) => (link.id === linkId ? { ...link, tags: clean } : link)),
        },
        rollback: { links: state.links } as Partial<LinksState>,
      }),
      async () => {
        const written = await storageSetLinkTags({ [linkId]: clean }, { onlyIfUntagged: false });
        return written.length === 1 ? null : t('error_save_tags_failed');
      },
      t('error_save_tags_failed')
    );
  }
```

Chave: en `"error_save_tags_failed": { "message": "Could not save the tags" }`; pt_BR `"error_save_tags_failed": { "message": "Não foi possível salvar as tags" }`.

- [ ] **Step 6: Rodar** — os quatro arquivos → PASS; `make test` → PASS.

- [ ] **Step 7: Lint, tipos e commit**

```bash
docker compose run --rm app sh -c "npx eslint src/lib/tags.ts src/lib/storage src/lib/stores/links.ts src/test/lib/tags.test.ts src/test/lib/storage.test.ts src/test/lib/storage/import-export.test.ts src/test/stores/links.test.ts src/test/mocks/storage.ts; npx tsc --noEmit 2>&1 | grep -E '^src/(lib/(tags|storage|stores/links)|test/(lib/tags|lib/storage|stores/links|mocks))'"
git add src/lib/tags.ts src/lib/storage/links.ts src/lib/storage/index.ts src/lib/storage/import-export.ts src/lib/stores/links.ts src/test/mocks/storage.ts public/_locales/en/messages.json public/_locales/pt_BR/messages.json src/test/lib/tags.test.ts src/test/lib/storage.test.ts src/test/lib/storage/import-export.test.ts src/test/stores/links.test.ts
git commit -m "feat(tags): store subject tags on links, with cleaning and locked writes"
```

---

### Task 9: Modelo do Chrome e etiquetador

**Files:**
- Create: `src/lib/ai/language-model.ts`, `src/lib/ai/tagger.ts`
- Test: `src/test/lib/ai/language-model.test.ts`, `src/test/lib/ai/tagger.test.ts`

**Interfaces:**
- Consumes: `setLinkTags` (Task 8), `sanitizeTags` (Task 8), `getLinks`/`getCollections`/`getWorkspaces`, `removeLink` (testes).
- Produces:
  - `type ModelAvailability = 'unavailable' | 'downloadable' | 'downloading' | 'available'`
  - `interface PromptSession { prompt(input: string, options?: { responseConstraint?: unknown }): Promise<string>; destroy(): void }`
  - `MODEL_LANGUAGES: string[]`, `getModelAvailability(): Promise<ModelAvailability>`, `createSession(systemPrompt: string, onDownloadProgress?: (fraction: number) => void): Promise<PromptSession>` em `language-model.ts`.
  - `TAG_BATCH_SIZE = 5`, `MAX_CONSECUTIVE_FAILURES = 3`, `TAG_RESPONSE_SCHEMA`, `taggerSystemPrompt(languages: string[]): string`, `interface TaggerDeps { readLibrary; createSession; saveTags; withLock; shouldContinue? }` (tipos no código da Step 3), `interface TaggerReport { tagged: number; failedBatches: number; skipped: boolean }`, `withTaggerLock<T>(task: () => Promise<T>): Promise<T | null>`, `runTagger(deps: TaggerDeps): Promise<TaggerReport>` em `tagger.ts`.

- [ ] **Step 1: Testes que falham**

`src/test/lib/ai/language-model.test.ts`:
```ts
import { describe, it, expect, vi, afterEach } from 'vitest';
import { getModelAvailability, createSession } from '@/lib/ai/language-model';

afterEach(() => {
  delete (globalThis as Record<string, unknown>).LanguageModel;
});

describe('getModelAvailability', () => {
  it('is unavailable when Chrome has no built-in model', async () => {
    expect(await getModelAvailability()).toBe('unavailable');
  });

  it('reports what Chrome says', async () => {
    (globalThis as Record<string, unknown>).LanguageModel = { availability: vi.fn(async () => 'downloadable') };
    expect(await getModelAvailability()).toBe('downloadable');
  });

  it('is unavailable when Chrome refuses the request', async () => {
    (globalThis as Record<string, unknown>).LanguageModel = { availability: vi.fn(async () => { throw new Error('no'); }) };
    expect(await getModelAvailability()).toBe('unavailable');
  });
});

describe('createSession', () => {
  it('starts a session with the system prompt and reports download progress', async () => {
    const progress: number[] = [];
    const create = vi.fn(async (options: { initialPrompts: { content: string }[]; monitor: (m: { addEventListener: (t: string, l: (e: { loaded: number }) => void) => void }) => void }) => {
      options.monitor({ addEventListener: (_type, listener) => listener({ loaded: 0.5 }) });
      return { prompt: vi.fn(), destroy: vi.fn() };
    });
    (globalThis as Record<string, unknown>).LanguageModel = { create };

    await createSession('tag links', (fraction) => progress.push(fraction));

    expect(create.mock.calls[0][0].initialPrompts[0].content).toBe('tag links');
    expect(progress).toEqual([0.5]);
  });
});
```

`src/test/lib/ai/tagger.test.ts`:
```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { clearMockStorage } from '../../setup';
import { getLinks, getCollections, getWorkspaces, saveLinks, saveCollections, setLinkTags, removeLink } from '@/lib/storage';
import { runTagger, withTaggerLock, type TaggerDeps } from '@/lib/ai/tagger';
import type { PromptSession } from '@/lib/ai/language-model';
import { createMockCollection, createMockLink } from '../../factories';

/** Answers each prompt line with a tag equal to the title on that line. */
function tagWithTitle(prompt: string): string {
  return JSON.stringify(prompt.split('\n').map((line) => {
    const match = /^(\d+)\. title: (.*?) \| /.exec(line);
    return { i: Number(match?.[1]), tags: [match?.[2] ?? ''] };
  }));
}

function fakeSession(reply: (prompt: string) => Promise<string>): { session: PromptSession; prompts: string[] } {
  const prompts: string[] = [];
  const session: PromptSession = {
    prompt: vi.fn(async (input: string) => {
      prompts.push(input);
      return reply(input);
    }),
    destroy: vi.fn(),
  };
  return { session, prompts };
}

function deps(session: PromptSession, overrides: Partial<TaggerDeps> = {}): TaggerDeps {
  return {
    readLibrary: async () => ({
      links: await getLinks(),
      collections: await getCollections(),
      workspaces: await getWorkspaces(),
    }),
    createSession: vi.fn(async () => session),
    saveTags: (updates) => setLinkTags(updates, { onlyIfUntagged: true }),
    withLock: (task) => task(),
    ...overrides,
  };
}

const tagsOf = async (id: string): Promise<string[] | undefined> =>
  (await getLinks()).find((l) => l.id === id)?.tags;

describe('runTagger', () => {
  beforeEach(async () => {
    clearMockStorage();
    await saveCollections([createMockCollection({ id: 'inbox', name: 'Inbox', isDefault: true })]);
  });

  async function seed(count: number, extra: Parameters<typeof createMockLink>[0][] = []): Promise<void> {
    const links = Array.from({ length: count }, (_, i) =>
      createMockLink({ id: `l${i + 1}`, title: `Title ${i + 1}`, collectionId: 'inbox', createdAt: i + 1 })
    );
    await saveLinks([...links, ...extra.map((o) => createMockLink(o))]);
  }

  it('tags every untagged link, newest first, in batches of five', async () => {
    await seed(7, [{ id: 'done', title: 'Done', collectionId: 'inbox', createdAt: 100, tags: ['kept'] }]);
    const { session, prompts } = fakeSession(async (p) => tagWithTitle(p));

    const report = await runTagger(deps(session));

    expect(prompts).toHaveLength(2);
    expect(prompts[0].split('\n').map((line) => /title: (.*?) \|/.exec(line)?.[1]))
      .toEqual(['Title 7', 'Title 6', 'Title 5', 'Title 4', 'Title 3']);
    expect(await tagsOf('l1')).toEqual(['title 1']);
    expect(await tagsOf('done')).toEqual(['kept']);
    expect(report).toEqual({ tagged: 7, failedBatches: 0, skipped: false });
    expect(session.destroy).toHaveBeenCalledTimes(1);
  });

  it('keeps tags the user edited while the batch was running', async () => {
    await seed(1);
    const { session } = fakeSession(async (p) => {
      await setLinkTags({ l1: ['minha'] }, { onlyIfUntagged: false });
      return tagWithTitle(p);
    });

    await runTagger(deps(session));

    expect(await tagsOf('l1')).toEqual(['minha']);
  });

  it('never brings back a link deleted while its batch was running', async () => {
    await seed(2);
    const { session } = fakeSession(async (p) => {
      await removeLink('l2');
      return tagWithTitle(p);
    });

    await runTagger(deps(session));

    expect((await getLinks()).map((l) => l.id)).toEqual(['l1']);
  });

  it('skips a batch the model answers badly and goes on', async () => {
    await seed(10);
    let call = 0;
    const { session } = fakeSession(async (p) => {
      call += 1;
      return call === 1 ? 'not json' : tagWithTitle(p);
    });

    const report = await runTagger(deps(session));

    expect(await tagsOf('l10')).toBeUndefined();
    expect(await tagsOf('l1')).toEqual(['title 1']);
    expect(report.failedBatches).toBe(1);
  });

  it('stops after three failures in a row', async () => {
    await seed(20);
    const { session, prompts } = fakeSession(async () => { throw new Error('model error'); });

    const report = await runTagger(deps(session));

    expect(prompts).toHaveLength(3);
    expect(report.failedBatches).toBe(3);
    expect(session.destroy).toHaveBeenCalledTimes(1);
  });

  it('ignores unknown and repeated indexes', async () => {
    await seed(2);
    const { session } = fakeSession(async () =>
      JSON.stringify([{ i: 1, tags: ['a'] }, { i: 1, tags: ['b'] }, { i: 9, tags: ['c'] }])
    );

    await runTagger(deps(session));

    expect(await tagsOf('l2')).toEqual(['a']);
    expect(await tagsOf('l1')).toBeUndefined();
  });

  it('cleans the tags the model returns', async () => {
    await seed(1);
    const { session } = fakeSession(async () => JSON.stringify([{ i: 1, tags: ['  IA ', 'ia', ''] }]));

    await runTagger(deps(session));

    expect(await tagsOf('l1')).toEqual(['ia']);
  });

  it('stops when topic search is turned off in the middle of a run', async () => {
    await seed(10);
    const { session, prompts } = fakeSession(async (p) => tagWithTitle(p));
    let checks = 0;

    await runTagger(deps(session, { shouldContinue: async () => (checks += 1) === 1 }));

    expect(prompts).toHaveLength(1);
    expect(await tagsOf('l10')).toEqual(['title 10']);
    expect(await tagsOf('l1')).toBeUndefined();
  });

  it('gives up without loading the model when another tab is tagging', async () => {
    await seed(1);
    const { session } = fakeSession(async (p) => tagWithTitle(p));
    const d = deps(session, { withLock: async () => null });

    expect(await runTagger(d)).toEqual({ tagged: 0, failedBatches: 0, skipped: true });
    expect(d.createSession).not.toHaveBeenCalled();
  });

  it('does not load the model when every link is tagged', async () => {
    await seed(0, [{ id: 'done', title: 'Done', collectionId: 'inbox', tags: [] }]);
    const { session } = fakeSession(async (p) => tagWithTitle(p));
    const d = deps(session);

    await runTagger(d);

    expect(d.createSession).not.toHaveBeenCalled();
  });
});

describe('withTaggerLock', () => {
  it('skips the task when the lock is taken', async () => {
    Object.defineProperty(navigator, 'locks', {
      configurable: true,
      value: { request: async (_n: string, _o: unknown, cb: (lock: null) => unknown) => cb(null) },
    });
    const task = vi.fn(async () => 'ran');

    expect(await withTaggerLock(task)).toBeNull();
    expect(task).not.toHaveBeenCalled();
    delete (navigator as unknown as Record<string, unknown>).locks;
  });
});
```

Rodar `docker compose run --rm app npx vitest run src/test/lib/ai` → FAIL (módulos não existem).

- [ ] **Step 2: Implementar `src/lib/ai/language-model.ts`** — usar em `MODEL_LANGUAGES` o `langs` registrado na Task 0 (`['en', 'pt']` ou `['en']`):

```ts
/**
 * Thin wrapper over Chrome's built-in Prompt API (Gemini Nano). Runs on the
 * device; nothing leaves the browser. The TS DOM lib has no types for it.
 */
export type ModelAvailability = 'unavailable' | 'downloadable' | 'downloading' | 'available';

export interface PromptSession {
  prompt(input: string, options?: { responseConstraint?: unknown }): Promise<string>;
  destroy(): void;
}

interface LanguageOptions {
  expectedInputs: { type: 'text'; languages: string[] }[];
  expectedOutputs: { type: 'text'; languages: string[] }[];
}

interface DownloadMonitor {
  addEventListener(type: 'downloadprogress', listener: (event: { loaded: number }) => void): void;
}

interface LanguageModelApi {
  availability(options: LanguageOptions): Promise<ModelAvailability>;
  create(options: LanguageOptions & {
    initialPrompts: { role: 'system'; content: string }[];
    monitor: (monitor: DownloadMonitor) => void;
  }): Promise<PromptSession>;
}

/** Languages this Chrome build accepts for the model, measured in the spike. */
export const MODEL_LANGUAGES: string[] = ['en', 'pt'];

function languageOptions(): LanguageOptions {
  return {
    expectedInputs: [{ type: 'text', languages: MODEL_LANGUAGES }],
    expectedOutputs: [{ type: 'text', languages: MODEL_LANGUAGES }],
  };
}

function languageModel(): LanguageModelApi | undefined {
  return (globalThis as { LanguageModel?: LanguageModelApi }).LanguageModel;
}

export async function getModelAvailability(): Promise<ModelAvailability> {
  const api = languageModel();
  if (api === undefined) {
    return 'unavailable';
  }
  try {
    return await api.availability(languageOptions());
  } catch {
    return 'unavailable';
  }
}

/** Needs a user click when the model still has to be downloaded. */
export async function createSession(
  systemPrompt: string,
  onDownloadProgress?: (fraction: number) => void
): Promise<PromptSession> {
  const api = languageModel();
  if (api === undefined) {
    throw new Error("Chrome's built-in AI is not available");
  }
  return api.create({
    ...languageOptions(),
    initialPrompts: [{ role: 'system', content: systemPrompt }],
    monitor(monitor) {
      monitor.addEventListener('downloadprogress', (event) => onDownloadProgress?.(event.loaded));
    },
  });
}
```

- [ ] **Step 3: Implementar `src/lib/ai/tagger.ts`**

```ts
/**
 * Background tagger: asks the on-device model for subject tags of untagged
 * links, a batch at a time, from one dashboard tab at a time.
 */
import type { Collection, Link, Workspace } from '@/lib/types';
import { sanitizeTags } from '@/lib/tags';
import type { PromptSession } from './language-model';

export const TAG_BATCH_SIZE = 5;
export const MAX_CONSECUTIVE_FAILURES = 3;
const TAGGER_LOCK = 'tabala-tagger';

export const TAG_RESPONSE_SCHEMA = {
  type: 'array',
  items: {
    type: 'object',
    properties: {
      i: { type: 'integer' },
      tags: { type: 'array', items: { type: 'string' }, maxItems: 6 },
    },
    required: ['i', 'tags'],
  },
};

export function taggerSystemPrompt(languages: string[]): string {
  const inLanguages = languages.includes('pt') ? 'in Portuguese and in English' : 'in English';
  return 'You tag saved links in a tab organizer. For each link (title, site, collection and workspace), '
    + `return 3 to 6 short subject tags, ${inLanguages}, lowercase. `
    + 'Do not use the site name or generic words like link, page, article, video.';
}

export interface TaggerDeps {
  readLibrary: () => Promise<{ links: Link[]; collections: Collection[]; workspaces: Workspace[] }>;
  createSession: () => Promise<PromptSession>;
  /** Persists tags only for links still untagged; returns the ids written. */
  saveTags: (updates: Record<string, string[]>) => Promise<string[]>;
  /** Runs the task holding the tagger lock, or returns null when another tab holds it. */
  withLock: <T>(task: () => Promise<T>) => Promise<T | null>;
  /** Checked before each batch; false stops the run (topic search turned off). */
  shouldContinue?: () => Promise<boolean>;
}

export interface TaggerReport {
  tagged: number;
  failedBatches: number;
  skipped: boolean;
}

export async function withTaggerLock<T>(task: () => Promise<T>): Promise<T | null> {
  if (typeof navigator === 'undefined' || !('locks' in navigator)) {
    return await task();
  }
  return await navigator.locks.request(TAGGER_LOCK, { ifAvailable: true }, async (lock) =>
    lock === null ? null : await task()
  );
}

function batchPrompt(batch: Link[], collections: Collection[], workspaces: Workspace[]): string {
  return batch.map((link, n) => {
    const collection = collections.find((c) => c.id === link.collectionId);
    const workspace = workspaces.find((w) => w.id === collection?.workspaceId);
    let site = '';
    try {
      site = new URL(link.url).hostname.replace(/^www\./, '');
    } catch {
      site = '';
    }
    const where = collection === undefined ? 'Inbox' : collection.name;
    const workspaceName = workspace === undefined ? '' : ` (${workspace.name})`;
    return `${n + 1}. title: ${link.title} | site: ${site} | collection: ${where}${workspaceName}`;
  }).join('\n');
}

/** Maps 1-based indexes to tags; throws when nothing usable came back. */
function parseBatchResponse(text: string, size: number): Map<number, string[]> {
  const parsed: unknown = JSON.parse(text);
  if (!Array.isArray(parsed)) {
    throw new Error('Model answer is not a list');
  }
  const byIndex = new Map<number, string[]>();
  for (const item of parsed as { i?: unknown; tags?: unknown }[]) {
    const index = item.i;
    if (typeof index === 'number' && Number.isInteger(index) && index >= 1 && index <= size && !byIndex.has(index)) {
      byIndex.set(index, sanitizeTags(item.tags));
    }
  }
  if (byIndex.size === 0) {
    throw new Error('Model answer has no usable item');
  }
  return byIndex;
}

export async function runTagger(deps: TaggerDeps): Promise<TaggerReport> {
  const outcome = await deps.withLock(async (): Promise<TaggerReport> => {
    const { links, collections, workspaces } = await deps.readLibrary();
    const queue = links
      .filter((link) => link.tags === undefined)
      .sort((a, b) => b.createdAt - a.createdAt);
    if (queue.length === 0) {
      return { tagged: 0, failedBatches: 0, skipped: false };
    }

    const session = await deps.createSession();
    let tagged = 0;
    let failedBatches = 0;
    let failuresInARow = 0;
    try {
      for (let start = 0; start < queue.length; start += TAG_BATCH_SIZE) {
        if (deps.shouldContinue !== undefined && !(await deps.shouldContinue())) {
          break;
        }
        const batch = queue.slice(start, start + TAG_BATCH_SIZE);
        try {
          const answer = await session.prompt(batchPrompt(batch, collections, workspaces), {
            responseConstraint: TAG_RESPONSE_SCHEMA,
          });
          const updates: Record<string, string[]> = {};
          parseBatchResponse(answer, batch.length).forEach((tags, index) => {
            updates[batch[index - 1].id] = tags;
          });
          tagged += (await deps.saveTags(updates)).length;
          failuresInARow = 0;
        } catch (error) {
          console.warn('[TabAla] Tagging batch failed:', error);
          failedBatches += 1;
          failuresInARow += 1;
          if (failuresInARow >= MAX_CONSECUTIVE_FAILURES) {
            break;
          }
        }
      }
    } finally {
      session.destroy();
    }
    return { tagged, failedBatches, skipped: false };
  });

  return outcome ?? { tagged: 0, failedBatches: 0, skipped: true };
}
```

- [ ] **Step 4: Rodar** — `docker compose run --rm app npx vitest run src/test/lib/ai` → PASS; `make test` → PASS.

- [ ] **Step 5: Lint, tipos e commit**

```bash
docker compose run --rm app sh -c "npx eslint src/lib/ai src/test/lib/ai; npx tsc --noEmit 2>&1 | grep -E '^src/(lib|test/lib)/ai'"
git add src/lib/ai/language-model.ts src/lib/ai/tagger.ts src/test/lib/ai/language-model.test.ts src/test/lib/ai/tagger.test.ts
git commit -m "feat(tags): tag links in the background with Chrome's on-device model"
```

---

### Task 10: Ativação nas Configurações e etiquetagem no dashboard

**Files:**
- Create: `src/lib/ai/topic-search.ts`
- Modify: `src/lib/types.ts` (`Settings.topicSearch`), `src/lib/stores/settings.ts`, `src/newtab/components/SettingsModal.svelte`, `src/newtab/App.svelte`, os dois locales
- Test: `src/test/lib/ai/topic-search.test.ts`, `src/test/stores/settings.test.ts`

**Interfaces:**
- Consumes: `getModelAvailability`, `createSession`, `MODEL_LANGUAGES` (Task 9); `runTagger`, `withTaggerLock`, `taggerSystemPrompt`, `TaggerDeps`, `TaggerReport` (Task 9); `setLinkTags` (Task 8); `getSettings`, `getLinks`, `getCollections`, `getWorkspaces`.
- Produces: `Settings.topicSearch: boolean` (padrão `false`); `settingsStore.setTopicSearch(enabled: boolean): Promise<void>`; em `topic-search.ts`: `type TopicSearchView = 'unavailable' | 'enable' | 'downloading' | 'toggle'`, `topicSearchView(availability: ModelAvailability, progress: number | null): TopicSearchView`, `downloadModel(onProgress: (fraction: number) => void): Promise<void>`, `startBackgroundTagging(): Promise<TaggerReport | null>`.

- [ ] **Step 1: Testes que falham**

`src/test/lib/ai/topic-search.test.ts`:
```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { clearMockStorage } from '../../setup';
import { getLinks, saveCollections, saveLinks, saveSettings } from '@/lib/storage';
import { DEFAULT_SETTINGS } from '@/lib/types';
import { startBackgroundTagging, topicSearchView } from '@/lib/ai/topic-search';
import { createMockCollection, createMockLink } from '../../factories';

describe('topicSearchView', () => {
  it.each([
    ['unavailable', null, 'unavailable'],
    ['downloadable', null, 'enable'],
    ['downloadable', 0.4, 'downloading'],
    ['downloading', null, 'downloading'],
    ['available', null, 'toggle'],
  ] as const)('%s with progress %s shows %s', (availability, progress, view) => {
    expect(topicSearchView(availability, progress)).toBe(view);
  });
});

describe('startBackgroundTagging', () => {
  beforeEach(async () => {
    clearMockStorage();
    await saveCollections([createMockCollection({ id: 'inbox', name: 'Inbox', isDefault: true })]);
    await saveLinks([createMockLink({ id: 'l1', title: 'Title 1', collectionId: 'inbox' })]);
  });

  afterEach(() => {
    delete (globalThis as Record<string, unknown>).LanguageModel;
  });

  function installModel(availability: string): void {
    (globalThis as Record<string, unknown>).LanguageModel = {
      availability: vi.fn(async () => availability),
      create: vi.fn(async () => ({
        prompt: vi.fn(async () => JSON.stringify([{ i: 1, tags: ['assunto'] }])),
        destroy: vi.fn(),
      })),
    };
  }

  it('is off on a fresh install', async () => {
    installModel('available');

    expect(await startBackgroundTagging()).toBeNull();
  });

  it('does nothing while topic search is off', async () => {
    installModel('available');
    await saveSettings({ ...DEFAULT_SETTINGS, topicSearch: false });

    expect(await startBackgroundTagging()).toBeNull();
    expect((await getLinks())[0].tags).toBeUndefined();
  });

  it('does nothing when the model is not ready', async () => {
    installModel('downloadable');
    await saveSettings({ ...DEFAULT_SETTINGS, topicSearch: true });

    expect(await startBackgroundTagging()).toBeNull();
  });

  it('tags the library when topic search is on and the model is ready', async () => {
    installModel('available');
    await saveSettings({ ...DEFAULT_SETTINGS, topicSearch: true });

    const report = await startBackgroundTagging();

    expect(report?.tagged).toBe(1);
    expect((await getLinks())[0].tags).toEqual(['assunto']);
  });
});
```

Em `src/test/stores/settings.test.ts`, dentro de `describe('settingsStore')`:
```ts
  describe('setTopicSearch', () => {
    it('saves the choice and shows it', async () => {
      await settingsStore.setTopicSearch(true);

      expect(vi.mocked(storage.updateSettings)).toHaveBeenCalledWith({ topicSearch: true });
      expect(get(settingsStore).settings.topicSearch).toBe(true);
    });
  });
```

Rodar → FAIL.

- [ ] **Step 2: Configuração** — em `src/lib/types.ts`, na interface `Settings`:
```ts
  /** Tag links with Chrome's on-device AI so they can be found by subject. */
  topicSearch: boolean;
```
e em `DEFAULT_SETTINGS`: `topicSearch: false,`.

Em `src/lib/stores/settings.ts`: declarar `setTopicSearch: (enabled: boolean) => Promise<void>;` no tipo de retorno, implementar e devolver:
```ts
  async function setTopicSearch(enabled: boolean): Promise<void> {
    await updateSettingsStore({ topicSearch: enabled });
  }
```

- [ ] **Step 3: `src/lib/ai/topic-search.ts`**

```ts
/** Glue between settings, the on-device model and the background tagger. */
import { getCollections, getLinks, getSettings, getWorkspaces, setLinkTags } from '@/lib/storage';
import { createSession, getModelAvailability, MODEL_LANGUAGES, type ModelAvailability } from './language-model';
import { runTagger, taggerSystemPrompt, withTaggerLock, type TaggerReport } from './tagger';

export type TopicSearchView = 'unavailable' | 'enable' | 'downloading' | 'toggle';

export function topicSearchView(availability: ModelAvailability, progress: number | null): TopicSearchView {
  if (progress !== null || availability === 'downloading') {
    return 'downloading';
  }
  if (availability === 'unavailable') {
    return 'unavailable';
  }
  return availability === 'downloadable' ? 'enable' : 'toggle';
}

/** Must run from a click: Chrome downloads the model only after a user gesture. */
export async function downloadModel(onProgress: (fraction: number) => void): Promise<void> {
  const session = await createSession(taggerSystemPrompt(MODEL_LANGUAGES), onProgress);
  session.destroy();
}

/** Tags untagged links when topic search is on and the model is ready. */
export async function startBackgroundTagging(): Promise<TaggerReport | null> {
  const settings = await getSettings();
  if (!settings.topicSearch || (await getModelAvailability()) !== 'available') {
    return null;
  }
  return runTagger({
    readLibrary: async () => {
      const [links, collections, workspaces] = await Promise.all([getLinks(), getCollections(), getWorkspaces()]);
      return { links, collections, workspaces };
    },
    createSession: () => createSession(taggerSystemPrompt(MODEL_LANGUAGES)),
    saveTags: (updates) => setLinkTags(updates, { onlyIfUntagged: true }),
    withLock: withTaggerLock,
    shouldContinue: async () => (await getSettings()).topicSearch,
  });
}
```

- [ ] **Step 4: Chaves de texto**

en:
```json
  "topic_search_title": { "message": "Topic search" },
  "topic_search_description": { "message": "Uses Chrome's built-in AI, on this computer, to tag each link by subject. Nothing leaves your browser." },
  "topic_search_unavailable": { "message": "Not available on this computer" },
  "topic_search_enable": { "message": "Enable" },
  "topic_search_enable_failed": { "message": "Could not enable topic search" },
  "topic_search_downloading": { "message": "Downloading the model… $1%", "placeholders": { "percent": { "content": "$1" } } },
  "topic_search_downloading_wait": { "message": "Downloading the model…" },
  "topic_search_progress": { "message": "$1 of $2 links tagged", "placeholders": { "tagged": { "content": "$1" }, "total": { "content": "$2" } } },
  "topic_search_toggle_label": { "message": "Turn topic search on or off" }
```

pt_BR:
```json
  "topic_search_title": { "message": "Busca por assunto" },
  "topic_search_description": { "message": "Usa a IA embutida do Chrome, neste computador, para etiquetar cada link por assunto. Nada sai do seu navegador." },
  "topic_search_unavailable": { "message": "Indisponível neste computador" },
  "topic_search_enable": { "message": "Ativar" },
  "topic_search_enable_failed": { "message": "Não foi possível ativar a busca por assunto" },
  "topic_search_downloading": { "message": "Baixando o modelo… $1%", "placeholders": { "percent": { "content": "$1" } } },
  "topic_search_downloading_wait": { "message": "Baixando o modelo…" },
  "topic_search_progress": { "message": "$1 de $2 links etiquetados", "placeholders": { "tagged": { "content": "$1" }, "total": { "content": "$2" } } },
  "topic_search_toggle_label": { "message": "Ligar ou desligar a busca por assunto" }
```

- [ ] **Step 5: Seção nas Configurações** — em `src/newtab/components/SettingsModal.svelte`:

Script (imports e lógica):
```ts
  import { onMount } from 'svelte';
  import { linksStore } from '@/lib/stores/links';
  import { getModelAvailability, type ModelAvailability } from '@/lib/ai/language-model';
  import { downloadModel, startBackgroundTagging, topicSearchView } from '@/lib/ai/topic-search';

  let availability: ModelAvailability = 'unavailable';
  let downloadProgress: number | null = null;

  onMount(async () => {
    availability = await getModelAvailability();
  });

  $: topicView = topicSearchView(availability, downloadProgress);
  $: totalLinks = $linksStore.links.length;
  $: taggedLinks = $linksStore.links.filter((link) => link.tags !== undefined).length;

  async function handleEnableTopicSearch(): Promise<void> {
    downloadProgress = 0;
    try {
      await downloadModel((fraction) => {
        downloadProgress = fraction;
      });
      availability = 'available';
      await settingsStore.setTopicSearch(true);
      void startBackgroundTagging();
    } catch (error) {
      console.error('Could not enable topic search:', error);
      showToastMessage(t('topic_search_enable_failed'), 'error');
    } finally {
      downloadProgress = null;
    }
  }

  async function toggleTopicSearch(): Promise<void> {
    const enabling = !settings.topicSearch;
    await settingsStore.setTopicSearch(enabling);
    if (enabling) {
      void startBackgroundTagging();
    }
  }
```
(Se `svelte` já estiver importado no arquivo, juntar `onMount` ao import existente.)

Markup, logo depois do `setting-item` do "Usar como nova aba" (antes do `setting-divider` seguinte):
```svelte
      <div class="setting-divider"></div>

      <div class="setting-item">
        <div class="setting-info">
          <span class="setting-label">{t('topic_search_title')}</span>
          <span class="setting-description">{t('topic_search_description')}</span>
          {#if topicView === 'toggle' && settings.topicSearch}
            <span class="setting-description">{t('topic_search_progress', taggedLinks, totalLinks)}</span>
          {/if}
        </div>
        {#if topicView === 'unavailable'}
          <span class="setting-status">{t('topic_search_unavailable')}</span>
        {:else if topicView === 'downloading'}
          <span class="setting-status">
            {downloadProgress === null
              ? t('topic_search_downloading_wait')
              : t('topic_search_downloading', Math.round(downloadProgress * 100))}
          </span>
        {:else if topicView === 'enable'}
          <button type="button" class="btn-action" on:click={handleEnableTopicSearch}>
            {t('topic_search_enable')}
          </button>
        {:else}
          <button
            type="button"
            class="toggle"
            class:active={settings.topicSearch}
            on:click={toggleTopicSearch}
            aria-pressed={settings.topicSearch}
            aria-label={t('topic_search_toggle_label')}
          >
            <span class="toggle-track">
              <span class="toggle-thumb"></span>
            </span>
          </button>
        {/if}
      </div>
```

CSS:
```css
  .setting-status {
    flex-shrink: 0;
    font-family: var(--font-body);
    font-size: var(--text-xs);
    color: var(--text-tertiary);
  }
```

- [ ] **Step 6: Dashboard** — em `src/newtab/App.svelte`:

```ts
  import { settingsStore } from '@/lib/stores/settings';   // já existe
  import { getModelAvailability } from '@/lib/ai/language-model';
  import { startBackgroundTagging } from '@/lib/ai/topic-search';

  let modelAvailable = false;
```

No fim do `onMount`, depois do `Promise.all` e do `setTimeout` existentes:
```ts
    modelAvailable = (await getModelAvailability()) !== 'unavailable';
    setTimeout(() => {
      void startBackgroundTagging();
    }, 1500);
```

No `<SearchPanel>`, acrescentar a prop:
```svelte
    topicSearchHint={modelAvailable && !$settingsStore.settings.topicSearch}
```

- [ ] **Step 7: Rodar** — os testes novos → PASS; `make test` → PASS. O `tsc` vai apontar `src/test/lib/storage.test.ts` (literal de `Settings` sem `topicSearch`, perto da linha 334): acrescentar `topicSearch: false` ao objeto.

- [ ] **Step 8: Lint, tipos e commit**

```bash
docker compose run --rm app sh -c "npx eslint src/lib/ai src/lib/types.ts src/lib/stores/settings.ts src/newtab/components/SettingsModal.svelte src/newtab/App.svelte src/test/lib/ai src/test/stores/settings.test.ts; npx tsc --noEmit 2>&1 | grep -E '^src/(lib/(ai|types|stores/settings)|newtab/(App|components/SettingsModal)|test/(lib/ai|stores/settings))'"
git add src/lib/ai/topic-search.ts src/lib/types.ts src/lib/stores/settings.ts src/newtab/components/SettingsModal.svelte src/newtab/App.svelte public/_locales/en/messages.json public/_locales/pt_BR/messages.json src/test/lib/ai/topic-search.test.ts src/test/stores/settings.test.ts src/test/lib/storage.test.ts
git commit -m "feat(tags): turn on topic search in Settings; the dashboard tags in the background"
```

---

### Task 11: Editar tags no card

**Files:**
- Modify: `src/newtab/components/LinkCard.svelte`, `src/newtab/components/Column.svelte`, `src/newtab/components/KanbanBoard.svelte`, os dois locales
- Test: `src/test/components/LinkCard.test.ts`

**Interfaces:**
- Consumes: `parseTagInput` (Task 8); `linksStore.setTags` (Task 8).
- Produces: evento `editTags: { id: string; tags: string[] }` em `LinkCard` e `Column`.

- [ ] **Step 1: Teste que falha** — em `src/test/components/LinkCard.test.ts` (importar `fireEvent` se ainda não estiver):

```ts
  describe('editing tags', () => {
    const tagged = createMockLink({ id: 'l1', title: 'Tagged', tags: ['ia', 'agentes'] });

    it('edits the tags in place and reports the cleaned list with Enter', async () => {
      const editTags = vi.fn();
      const open = vi.fn();
      render(LinkCard, { props: { link: tagged }, events: { editTags, open } });

      await fireEvent.click(screen.getByRole('button', { name: 'linkcard_edit_tags' }));
      const field = screen.getByRole('textbox', { name: 'linkcard_edit_tags' });
      expect(field).toHaveValue('ia, agentes');

      await fireEvent.input(field, { target: { value: 'IA, agentes, Novo' } });
      await fireEvent.keyDown(field, { key: 'Enter' });

      expect(editTags.mock.calls[0][0].detail).toEqual({ id: 'l1', tags: ['ia', 'agentes', 'novo'] });
      expect(open).not.toHaveBeenCalled();
      expect(screen.queryByRole('textbox')).toBeNull();
    });

    it('cancels with Escape', async () => {
      const editTags = vi.fn();
      render(LinkCard, { props: { link: tagged }, events: { editTags } });

      await fireEvent.click(screen.getByRole('button', { name: 'linkcard_edit_tags' }));
      await fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Escape' });

      expect(editTags).not.toHaveBeenCalled();
      expect(screen.queryByRole('textbox')).toBeNull();
    });
  });
```

Rodar → FAIL.

- [ ] **Step 2: Chaves** — en `"linkcard_edit_tags": { "message": "Edit tags" }`, `"linkcard_tags_placeholder": { "message": "tags, separated by commas" }`; pt_BR `"linkcard_edit_tags": { "message": "Editar tags" }`, `"linkcard_tags_placeholder": { "message": "tags separadas por vírgula" }`.

- [ ] **Step 3: `LinkCard.svelte`**

Script: importar `parseTagInput` de `'@/lib/tags'`; acrescentar `editTags: { id: string; tags: string[] };` ao dispatcher; e:
```ts
  let editingTags = false;
  let tagText = '';

  function startEditingTags(event: MouseEvent): void {
    event.stopPropagation();
    tagText = (link.tags ?? []).join(', ');
    editingTags = true;
  }

  function handleTagsKeydown(event: KeyboardEvent): void {
    event.stopPropagation();
    if (event.key === 'Enter') {
      event.preventDefault();
      dispatch('editTags', { id: link.id, tags: parseTagInput(tagText) });
      editingTags = false;
    } else if (event.key === 'Escape') {
      event.preventDefault();
      editingTags = false;
    }
  }

  function focusOnMount(node: HTMLInputElement): void {
    node.focus();
  }
```

Markup: dentro de `.link-content`, depois do `<span class="link-domain">`:
```svelte
    {#if editingTags}
      <input
        class="tags-input"
        type="text"
        bind:value={tagText}
        placeholder={t('linkcard_tags_placeholder')}
        aria-label={t('linkcard_edit_tags')}
        on:click|stopPropagation
        on:keydown={handleTagsKeydown}
        on:blur={() => (editingTags = false)}
        use:focusOnMount
      />
    {/if}
```
Em `.link-actions`, antes do botão de abrir em nova aba:
```svelte
    <button
      type="button"
      class="btn-action btn-tags"
      on:click={startEditingTags}
      aria-label={t('linkcard_edit_tags')}
      title={t('linkcard_edit_tags')}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
        <line x1="7" y1="7" x2="7.01" y2="7"/>
      </svg>
    </button>
```
CSS:
```css
  .tags-input {
    margin-top: var(--space-1);
    padding: 4px 8px;
    background: var(--surface-base);
    border: 1px solid var(--accent-primary);
    border-radius: var(--radius-md);
    color: var(--text-primary);
    font-family: var(--font-body);
    font-size: var(--text-xs);
  }
```

- [ ] **Step 4: Repassar o evento** — em `Column.svelte`: acrescentar `editTags: { id: string; tags: string[] };` ao dispatcher e `on:editTags={(e) => dispatch('editTags', e.detail)}` no `<LinkCard>`. Em `KanbanBoard.svelte`:
```ts
  async function handleEditTags(event: CustomEvent<{ id: string; tags: string[] }>): Promise<void> {
    try {
      await linksStore.setTags(event.detail.id, event.detail.tags);
    } catch (_err) {
      dispatch('error', t('error_save_tags_failed'));
    }
  }
```
e `on:editTags={handleEditTags}` no `<Column>`.

- [ ] **Step 5: Rodar** — `docker compose run --rm app npx vitest run src/test/components/LinkCard.test.ts` → PASS; `make test` → PASS.

- [ ] **Step 6: Lint, tipos e commit**

```bash
docker compose run --rm app sh -c "npx eslint src/newtab/components/LinkCard.svelte src/newtab/components/Column.svelte src/newtab/components/KanbanBoard.svelte src/test/components/LinkCard.test.ts; npx tsc --noEmit 2>&1 | grep -E '^src/(newtab/components/(LinkCard|Column|KanbanBoard)|test/components/LinkCard)'"
git add src/newtab/components/LinkCard.svelte src/newtab/components/Column.svelte src/newtab/components/KanbanBoard.svelte public/_locales/en/messages.json public/_locales/pt_BR/messages.json src/test/components/LinkCard.test.ts
git commit -m "feat(tags): edit the tags of a link on its card"
```

---

### Task 12: Privacidade, documentação e verificação final

**Files:**
- Modify: `docs/privacy-policy.md`, `docs/privacy-policy.pt.md`, `CLAUDE.md` (só o trecho próprio)

- [ ] **Step 1: Política de privacidade** — acrescentar uma seção em cada idioma, depois de "Dados armazenados":

pt:
```markdown
## Busca por assunto (IA no próprio computador)

Quando o usuário ativa a busca por assunto, o TabAla usa o modelo de IA embutido no Chrome (Gemini Nano), que roda no próprio computador. O título, o site e os nomes de coleção e workspace de cada link salvo vão apenas para esse modelo local, que devolve tags de assunto. As tags ficam no `chrome.storage.local`, como os demais dados. Nada é enviado para servidores externos. A opção vem desligada e pode ser desligada a qualquer momento em Configurações.
```

en:
```markdown
## Topic search (on-device AI)

When the user turns on topic search, TabAla uses Chrome's built-in AI model (Gemini Nano), which runs on the user's own computer. The title, site, and collection and workspace names of each saved link go only to that local model, which returns subject tags. Tags are stored in `chrome.storage.local` like all other data. Nothing is sent to external servers. The option is off by default and can be turned off at any time in Settings.
```

- [ ] **Step 2: `CLAUDE.md` do app, só o trecho próprio** — o arquivo tem mudanças de outra sessão no working tree. Aplicar a edição nos dois lugares e colocar no índice só a versão `HEAD` + esta edição:

Edição: na entidade `Link`, depois de `order?: number;   // posição manual na coleção (arrastar)`, acrescentar `tags?: string[];   // assunto (IA local ou edição manual)`; em "Regras de Negócio", acrescentar a linha `- **Busca**: painel ⌘K em todos os workspaces (src/lib/search); tags de assunto geradas pelo Gemini Nano no dashboard (src/lib/ai), nunca sobrescrevem tag editada à mão`.

```bash
S=<scratchpad>
git show HEAD:CLAUDE.md > "$S/CLAUDE.head.md"
# aplicar a mesma edição em "$S/CLAUDE.head.md" e em CLAUDE.md (python3 com replace exato, uma ocorrência cada)
blob=$(git hash-object -w "$S/CLAUDE.head.md") && git update-index --cacheinfo 100644,"$blob",CLAUDE.md
git diff --cached CLAUDE.md   # só as duas linhas novas
```

- [ ] **Step 3: Verificação completa**

```bash
make test
make lint 2>&1 | tail -3          # só os erros antigos conhecidos (a11y em modais); nenhum em arquivo tocado
make build && du -sh dist         # abaixo de 500K
```

- [ ] **Step 4: Commit**

```bash
git add docs/privacy-policy.md docs/privacy-policy.pt.md
git commit -m "docs: privacy policy and project notes for topic search"
```

- [ ] **Step 5: Teste manual no Chrome (com o usuário)** — recarregar a extensão em `chrome://extensions` e conferir:
  1. ⌘K, Ctrl+K e "/" abrem o painel; "/" dentro do campo de renomear coleção escreve a barra.
  2. "vídeo agentes" lista vídeos; "mckinsy" acha a McKinsey; ⇧Enter troca de workspace e destaca o card; Esc fecha.
  3. O campo do topo abre o painel; o quadro não filtra mais.
  4. Popup: buscar um link de outro workspace e abrir com Enter.
  5. Configurações → Busca por assunto → Ativar (ou ligar); a contagem "N de M links etiquetados" sobe enquanto a nova aba fica aberta.
  6. Uma busca por assunto do gabarito acha o link pela tag; "Editar tags" no card troca as tags e a busca reflete.

- [ ] **Step 6: Registrar** — log em `caderno/projetos/tabAla.md` (o que entrou, números da medição, tempo real de etiquetagem da biblioteca) e commit no caderno.
