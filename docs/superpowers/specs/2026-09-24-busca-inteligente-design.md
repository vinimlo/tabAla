# Busca inteligente — design

**Data:** 2026-09-24 · **Estado:** aprovado em conversa, aguardando revisão da spec · **Branch:** `feat/busca-inteligente` (a partir de `fix/varredura`)

## 1. Contexto e objetivo

Quem usa o tabAla todo dia acumula centenas de links em vários workspaces. A busca atual procura substring no título e na URL, só no workspace ativo e só na nova aba. Ela não acha um link quando a pessoa lembra do assunto e não das palavras do título, não atravessa português e inglês e não filtra por tipo de conteúdo.

Objetivo: achar qualquer link salvo, em qualquer workspace, a partir de três lembranças:

1. **Assunto** ("aquele vídeo sobre agentes", "o paper de busca híbrida");
2. **Parte do título ou do site** ("hermes", "mckinsey", com erro de digitação);
3. **Tipo de conteúdo** (vídeo, paper, repositório, PR, docs).

Sucesso: nas buscas por assunto de um gabarito real, o link certo aparece no top 5 bem mais vezes com tags do que sem (critério em §9), sem piorar as buscas por título ou site.

## 2. Decisões tomadas

| Decisão | Escolha | Por quê |
|---|---|---|
| Fonte da inteligência | Regras locais + IA embutida do Chrome (Gemini Nano, Prompt API) | Roda na máquina, sem chave, sem custo; nada sai do navegador |
| Público | Versão da Chrome Web Store | en + pt_BR, nenhuma permissão obrigatória nova, tudo funciona sem IA |
| Busca por assunto | **Tags geradas pela IA para cada link, antes da busca** | Busca instantânea, funciona sem o modelo carregado, e as tags servem ao futuro espaço de recomendação |
| Alternativa descartada | IA interpretando cada pergunta | ~1 s por busca e falha quando o tema não está no título; vira o plano B se a medição reprovar as tags |
| Filtro do quadro | Sai; o painel de busca substitui | Olhava só o workspace ativo; duas buscas com resultados diferentes confundem |

## 3. Escopo

**Dentro:** tipo do link derivado da URL; motor de busca local ranqueado; tags por IA (etiquetador, ativação, edição manual); painel de busca no dashboard; busca no popup; medição com gabarito; política de privacidade atualizada.

**Fora:** ler o conteúdo das páginas; IA na hora da busca; histórico de buscas; operadores (`site:`, `tipo:`); busca vetorial ou embeddings (exigiria embutir um modelo e estourar o limite de 500 KB do bundle).

## 4. Modelo de dados

### 4.1 `Link.tags`

```ts
interface Link {
  // ...campos atuais
  /** Assunto do link. Ausente: ainda não etiquetado. []: etiquetado, sem tags. */
  tags?: string[];
}
```

- Opcional: exports antigos continuam válidos, nenhuma migração.
- O export leva as tags. O import rejeita `tags` que não seja lista de textos.
- Limpeza (em toda gravação): minúsculas, `trim`, sem vazias, sem repetidas, no máximo 6 tags de até 40 caracteres.

### 4.2 Tipo do link

Calculado da URL a cada uso, sem gravar: `linkKind(url): LinkKind` em `src/lib/link-kind.ts`. Regras em ordem (a primeira que casa vence):

| Tipo | Regra |
|---|---|
| `file` | protocolo `file:` |
| `video` | `youtube.com/watch`, `youtube.com/shorts/`, `youtu.be/`, `vimeo.com/<número>` |
| `code-change` | `github.com/<dono>/<repo>/(pull\|issues)/<número>`, `gitlab.com/.../-/(merge_requests\|issues)/<número>` |
| `paper` | `arxiv.org`, `openreview.net`, `aclanthology.org`, `dl.acm.org`, `ieeexplore.ieee.org`, caminho terminado em `.pdf` |
| `repo` | `github.com/<dono>/<repo>` (e subcaminhos que não sejam PR/issue), `gitlab.com/<dono>/<repo>` |
| `exercise` | `codeforces.com/.../problem/...`, `atcoder.jp/contests/*/tasks/*`, `cses.fi/problemset/task/*`, `leetcode.com/problems/*`, `vjudge.net/problem/*`, `judge.beecrowd.com/.../problems/view/*` |
| `docs` | host começando com `docs.`, `developer.` ou `learn.`; `readthedocs.io`; caminho com `/docs/` ou `/documentation/` |
| `social` | `x.com`, `twitter.com`, `linkedin.com/posts/`, `reddit.com/r/`, `news.ycombinator.com/item`, `bsky.app` |
| `search` | `google.*/search`, `bing.com/search`, `duckduckgo.com/?q=` |
| `page` | todo o resto |

O espaço de recomendação (spec futura) reaproveita `linkKind`.

## 5. Etiquetador

### 5.1 Onde e quando roda

- **No dashboard (nova aba)**, em segundo plano, depois que a página montou, se `settings.topicSearch === true` e o modelo estiver `available`.
- **Uma aba por vez:** `navigator.locks.request('tabala-tagger', { ifAvailable: true }, ...)`. Se outra aba já etiqueta, esta desiste na hora (lock `null`).
- **Fila:** links com `tags === undefined`, mais novos primeiro. Um link salvo pelo popup é etiquetado na próxima nova aba.
- **Service worker fora:** não está confirmado que a Prompt API existe em service worker de extensão; o dashboard basta porque a nova aba abre o tempo todo.
- Para ao fechar a aba (nada a limpar: o que foi gravado fica, o resto continua na fila).

### 5.2 Prompt

Uma sessão por execução (`LanguageModel.create`) com instrução de sistema e lotes de **5 links** por `prompt()`:

- **Sistema** (~80 tokens, em inglês, que o modelo aceita em qualquer configuração de idioma): "You tag saved links in a tab organizer. For each link (title, site, collection and workspace), return 3 to 6 short subject tags, in Portuguese and in English, lowercase. Do not use the site name or generic words like link, page, article, video." Sem suporte a português, o trecho vira "in English".
- **Usuário** (~30 tokens por link): `1. título: <título> | site: <domínio> | coleção: <coleção> (<workspace>)`.
- **Saída** restrita por JSON Schema (`responseConstraint`), ~25 tokens por link:

```json
{ "type": "array", "items": { "type": "object",
  "properties": { "i": { "type": "integer" },
                  "tags": { "type": "array", "items": { "type": "string" }, "maxItems": 6 } },
  "required": ["i", "tags"] } }
```

- Conta para uma biblioteca de 170 links: 34 lotes de ~230 tokens de entrada e ~125 de saída. Estimativa de 1 a 2 minutos no total, uma única vez; o spike (§10) mede o tempo real.
- Idiomas declarados em `expectedInputs`/`expectedOutputs`: `['en', 'pt']`. Se o Chrome recusar `pt`, a sessão sobe com `['en']` e as tags saem em inglês (o spike decide).

### 5.3 Gravação

`setLinkTags(updates: { [linkId]: tags }, { onlyIfUntagged })` em `storage/links.ts`: um lote inteiro numa única gravação dentro de `withDataLock`, lendo o storage na hora e devolvendo os ids gravados. Link que não existe mais é ignorado, nunca recriado.

- Etiquetador: `onlyIfUntagged: true` — grava só se o link ainda existir e continuar sem tags. Uma edição manual feita no meio do lote nunca é sobrescrita.
- Edição manual: `onlyIfUntagged: false`.

### 5.4 Ativação e configuração

- `Settings.topicSearch: boolean`, padrão `false` (quem instala da loja decide).
- Em Configurações, seção "Busca por assunto", com o estado vindo de `LanguageModel.availability()`:
  - `unavailable`: "Indisponível neste computador" (sem botão);
  - `downloadable`: botão "Ativar" — o clique é o gesto que o Chrome exige para baixar; mostra progresso via `monitor` / `downloadprogress`;
  - `downloading`: progresso;
  - `available`: interruptor ligado/desligado e "N de M links etiquetados".
- Desligar para o etiquetador antes do próximo lote; as tags existentes ficam e continuam valendo na busca.

### 5.5 Falhas

- Modelo indisponível ou `create()` falhando: não etiqueta; a busca segue local.
- `prompt()` falhando ou JSON fora do schema: o lote é descartado e fica na fila para a próxima execução. Depois de 3 falhas seguidas na mesma execução, o etiquetador para até a próxima nova aba.
- Índice `i` desconhecido ou repetido na resposta: ignorado; o link sem resposta volta para a fila.

## 6. Motor de busca

Código puro em `src/lib/search/`, sem dependência nova.

### 6.1 Normalização

- `normalize(texto)`: NFD, remove diacríticos, minúsculas, quebra em tudo que não é `[a-z0-9]`.
- `stem(token)` dos dois lados: termina em `es` e tem 6+ letras → tira `es`; senão termina em `s` (não `ss`) e tem 4+ letras → tira `s`. Ex.: `agentes`→`agent`, `agents`→`agent`, `processos`→`processo`.
- Cada token guarda duas formas: a normalizada (para o prefixo) e o radical (para igualdade e erro de digitação).
- Palavras vazias (pt/en) saem da consulta: `a, o, as, os, de, da, do, das, dos, e, em, no, na, sobre, aquele, aquela, que, um, uma, para, com, the, of, about, an, and, for, on, in, to, with`.
- **Palavra em digitação:** o último token da consulta, sem espaço depois, nunca é descartado como palavra vazia. Assim "de" a caminho de "desafio" já busca por prefixo. Palavras de tipo (§6.2) valem mesmo na última posição: "vídeo" sozinho lista os vídeos, e as colisões durante a digitação caem quase sempre no mesmo tipo ("repo" a caminho de "repositorio", "video" a caminho de "videos").

### 6.2 Palavras de tipo

Na consulta, viram filtro de tipo e saem dos termos. São comparadas depois da normalização e antes do radical, só como palavra inteira:

| Palavras | Tipo |
|---|---|
| video, videos | `video` |
| paper, papers, pdf, pdfs | `paper` |
| repo, repos, repositorio, repositorios | `repo` |
| issue, issues, pull | `code-change` |
| docs, documentacao, documentation | `docs` |
| exercicio, exercicios, exercise, exercises | `exercise` |

Nomes de site (github, youtube) **não** são palavras de tipo: casam pelo campo domínio, então "github" traz repositórios e PRs.

Chips no painel também ligam filtros de tipo. Vários tipos selecionados combinam por OU.

### 6.3 Pontuação

Campos e pesos: título 3 · tags 2,5 · domínio 2 · coleção 1,5 · workspace 1 · caminho da URL 1.

Para cada termo `q` da consulta, a melhor combinação `peso(campo) × casamento(q, token)` entre todos os tokens do link:

- radicais iguais: 1,0;
- a forma normalizada do token começa com a forma normalizada de `q`, e `q` tem 2+ letras: 0,8 (sem radical, para "agente" casar com "agentes" durante a digitação);
- radical de `q` com 5+ letras e distância de edição ≤ 1 do radical do token: 0,5.

Pontuação do link = soma dos termos. **Resultados:** links em que todos os termos casam, por pontuação e, no empate, o mais novo. **Parciais:** se não houver resultados, links em que ao menos um termo casa, por número de termos casados e depois pontuação. Consulta vazia com tipo selecionado: todos os links do tipo, mais novos primeiro.

### 6.4 Índice e custo

Índice derivado de links, coleções e workspaces (tokens por campo, pré-normalizados), recalculado quando os dados mudam. Varredura linear: menos de 1 ms para centenas de links, poucos ms para milhares.

## 7. Interface

### 7.1 Painel de busca (dashboard)

- Abre ao focar ou digitar no campo de busca do topo, com ⌘K, Ctrl+K ou `/`.
- Resultados de todos os workspaces (até 50). Cada um: favicon, título, `Workspace › Coleção`, tipo, domínio e as tags que casaram, em destaque.
- Chips de tipo com contagem no topo do painel.
- Teclado: ↑↓ navega; Enter abre na aba atual (como o clique no card); ⌘Enter / Ctrl+Enter abre em aba nova; ⇧Enter "mostrar no quadro" (troca para o workspace do link — link da Inbox fica no workspace atual, porque a Inbox aparece em todos —, fecha o painel, rola até o card e o destaca por 2 s); Esc fecha.
- Caminho do resultado: `Workspace › Coleção`; para a Inbox, só "Inbox".
- Vazio: "Nada encontrado". Se a busca por assunto estiver desligada e o modelo existir, uma linha convida a ativar em Configurações.
- **O filtro do quadro sai:** `searchQuery` deixa de existir em `KanbanBoard` e `Column`; o campo do topo só abre o painel.
- `LinkCard` ganha `data-link-id` para o "mostrar no quadro".

### 7.2 Popup

Campo de busca no topo. Enquanto há texto, os 8 melhores resultados substituem a lista de coleções; Enter abre em aba nova; Esc limpa.

### 7.3 Editar tags

Botão com ícone de etiqueta no card, ao lado de "abrir em nova aba" e "remover": abre um campo de texto no próprio card com as tags separadas por vírgula; Enter grava com `onlyIfUntagged: false` (vazio grava `[]`); Esc cancela. As tags do link aparecem também no resultado do painel.

## 8. Privacidade e textos

- Política de privacidade (en e pt): a busca por assunto usa o modelo embutido do Chrome, que roda no computador; títulos, sites e nomes de coleção vão só para esse modelo local; nada é enviado para fora.
- Todos os textos novos em `en` e `pt_BR`.

## 9. Testes e medição

- **Motor:** testes em tabela com resultados escritos à mão — acento, plural, erro de digitação, palavras de tipo, pesos, parciais, empate.
- **`linkKind`:** uma URL real por regra e as fronteiras (PR vs repositório, `.pdf` vs página).
- **Etiquetador:** o único mock é o `LanguageModel`. Cobre lotes, `onlyIfUntagged`, a trava `ifAvailable`, a limpeza das tags, as falhas de §5.5.
- **Componentes:** teclado do painel, "mostrar no quadro", busca no popup, edição de tags.
- **Medição (decide a abordagem):** harness versionado no repositório lê três arquivos passados por caminho — um export do tabAla, um mapa de tags `{ [linkId]: string[] }` e um gabarito `{ consulta, idsEsperados, categoria }` — e imprime o acerto@5 por categoria, com e sem tags. O gabarito tem ~20 buscas por assunto e ~10 por título ou site, montadas a partir de dados reais, e fica fora do repositório.
- **Critério:** as tags ficam se o acerto@5 nas buscas por assunto subir **pelo menos 20 pontos percentuais** sobre a busca sem tags, sem cair nas buscas por título ou site. Se não, a busca por assunto passa para o plano B (IA interpretando a pergunta), reaproveitando o motor.

## 10. Riscos

| Risco | Como tratamos |
|---|---|
| O Nano não aceitar português | Spike antes de tudo; tags em inglês se necessário, e a medição diz se basta |
| Tags genéricas vindas só do título | Coleção e workspace entram no prompt; a medição decide |
| Modelo indisponível em muitas máquinas da loja | Tudo funciona sem ele; a opção vem desligada |
| Download grande do modelo | Só com clique explícito, com progresso visível |
| Prompt API diferente do documentado | Spike valida `availability`, `create`, `responseConstraint` e o tempo por lote antes do plano detalhado |

## 11. Fases

0. **Spike (descartável)** no Chrome real: disponibilidade, português, tempo por lote de 5, `responseConstraint`; gera o mapa de tags de uma biblioteca real num arquivo à parte, **sem gravar nada no storage** da extensão.
1. `linkKind` e motor de busca (puros), com testes.
2. Medição com o gabarito → decisão tags vs. plano B.
3. Painel no dashboard, busca no popup, saída do filtro do quadro.
4. `Link.tags` nos dados e no import/export, `setLinkTags`, etiquetador, ativação em Configurações, edição de tags.
5. Política de privacidade, textos, build.
