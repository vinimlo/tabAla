# Busca inteligente — design

**Data:** 2026-09-24 · **Estado:** aprovado; **revisado em 2026-09-24 depois da medição** (busca por assunto por tradução da consulta, não por tags) · **Branch:** `feat/busca-inteligente` (a partir de `fix/varredura`)

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
| Fonte da inteligência | Regras locais + IA embutida do Chrome | Roda na máquina, sem chave, sem custo; nada sai do navegador |
| Público | Versão da Chrome Web Store | en + pt_BR, nenhuma permissão obrigatória nova, tudo funciona sem IA |
| Busca por assunto | **Traduzir a consulta para o inglês com o Translator do Chrome e buscar a original e a traduzida juntas** | Medido (§9): 24% → 44% no gabarito, 2 ms por busca, sem etiquetar nada |
| Descartado depois da medição | Tags geradas pelo Gemini Nano | +16 pontos (abaixo do critério), ~6 min por 170 links, só em inglês (o Nano recusa português no Chrome 153) |
| Filtro do quadro | Sai; o painel de busca substitui | Olhava só o workspace ativo; duas buscas com resultados diferentes confundem |

## 3. Escopo

**Dentro:** tipo do link derivado da URL; motor de busca local ranqueado que aceita várias formas da mesma consulta; tradução da consulta com o Translator do Chrome (ativação em Configurações); painel de busca no dashboard; busca no popup; medição com gabarito; política de privacidade atualizada.

**Fora:** tags geradas por IA e edição de tags; ler o conteúdo das páginas; histórico de buscas; operadores (`site:`, `tipo:`); busca vetorial ou embeddings (estouraria o limite de 500 KB do bundle).

## 4. Modelo de dados

### 4.1 `Link.tags`

```ts
interface Link {
  // ...campos atuais
  /** Assunto do link. Ausente: sem tags. */
  tags?: string[];
}
```

Campo opcional que o motor já pontua (peso 2,5), sem nenhum código que o preencha nesta versão. O import aceita `tags` só como lista de textos, e o motor ignora qualquer outro valor que já esteja gravado. Fica porque não custa nada e é o caminho medido para 56% (§9) se um dia valer somar tags.

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

## 5. Tradução da consulta

### 5.1 O que faz

A consulta digitada na língua da interface (`chrome.i18n.getUILanguage()`, sem região: `pt-BR` → `pt`) é traduzida para o inglês pelo Translator embutido do Chrome, no próprio computador. O motor busca a original e a traduzida juntas (§6.5). Com a interface em inglês, não há tradução.

### 5.2 Como roda

- Um tradutor por página, criado na primeira consulta com texto, só se a opção estiver ligada e o Translator estiver `available`.
- O resultado aparece na hora com a consulta original e se completa quando a tradução chega (medido: 2 ms por consulta, 5,6 s para criar o tradutor uma vez).
- Tradução igual ao texto original (nomes próprios, termos já em inglês) é descartada. O espaço final da consulta é preservado, para a regra da palavra em digitação (§6.1) valer igual nas duas formas.
- Falha do tradutor: a consulta segue só com a forma original.

### 5.3 Ativação e configuração

- `Settings.topicSearch: boolean`, padrão `false`.
- Em Configurações, seção "Busca por assunto", com o estado vindo de `Translator.availability({ sourceLanguage, targetLanguage: 'en' })`:
  - `unavailable` (ou interface em inglês): "Indisponível neste computador";
  - `downloadable`: botão "Ativar" — o clique é o gesto que o Chrome exige para baixar o pacote de idioma; progresso via `monitor` / `downloadprogress`;
  - `downloading`: progresso;
  - `available`: interruptor ligado/desligado.

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

Se as palavras de tipo da consulta deixarem a busca sem resultado nem parcial, elas voltam a valer como palavras comuns: "video compression" acha o post com esse título, mesmo fora do YouTube. Os chips continuam estritos.

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

### 6.5 Várias formas da mesma consulta

`search(index, consultas: string[])` junta formas da mesma consulta (original e traduzida): um link é resultado se casar com todos os termos de **alguma** forma, com a maior pontuação entre elas; as palavras de tipo valem só da forma digitada (a tradução nunca cria filtro: "papel" → "paper" não esconde o link de papel de parede); "Parciais" só aparecem quando nenhuma forma tem resultado completo.

## 7. Interface

### 7.1 Painel de busca (dashboard)

- Abre ao clicar no campo de busca do topo, com ⌘K, Ctrl+K ou `/` (fora de campo de texto).
- Resultados de todos os workspaces (até 50). Cada um: favicon, título, `Workspace › Coleção`, tipo, domínio e as tags do link, se houver.
- Chips de tipo com contagem no topo do painel.
- Teclado: ↑↓ navega; Enter abre na aba atual; ⌘Enter / Ctrl+Enter abre em aba nova; ⇧Enter "mostrar no quadro" (troca para o workspace do link — link da Inbox fica no workspace atual —, fecha o painel, rola até o card e o destaca por 2 s); Esc fecha.
- Vazio: "Nada encontrado". Se a busca por assunto estiver desligada e o Translator existir, uma linha convida a ativar em Configurações.
- O filtro do quadro sai; `LinkCard` ganha `data-link-id` para o "mostrar no quadro".

### 7.2 Popup

Campo de busca no topo. Enquanto há texto, os 8 melhores resultados substituem a lista de coleções; Enter abre em aba nova; Esc limpa. Usa a mesma tradução quando ligada.

## 8. Privacidade e textos

- Política de privacidade (en e pt): com a busca por assunto ligada, o texto digitado na busca vai só para o tradutor embutido do Chrome, que roda no computador; nada é enviado para fora.
- Todos os textos novos em `en` e `pt_BR`.

## 9. Testes e medição

- **Motor:** testes em tabela com resultados escritos à mão — acento, plural, erro de digitação, palavras de tipo, pesos, parciais, empate, várias formas da consulta.
- **`linkKind`:** uma URL real por regra e as fronteiras.
- **Tradutor:** o único mock é o `Translator` do Chrome: língua da interface, disponibilidade, um tradutor por página, tradução igual descartada, falha.
- **Componentes:** teclado do painel, "mostrar no quadro", busca no popup, tradução chegando depois da consulta.
- **Medição:** harness versionado lê um export, um mapa de tags, as traduções e o gabarito (fora do repositório) e imprime o acerto@5.
- **Resultado (2026-09-24, 25 buscas por assunto, 11 por título ou site):** sem IA, 24% / 100%; tags do Nano, 40% / 100%; original + traduzida, **44% / 100%**; tags + original + traduzida, 56% / 100%. Critério (+20 pontos por assunto sem cair em título): atingido pela tradução.

## 10. Riscos

| Risco | Como tratamos |
|---|---|
| Tradução literal de termo técnico ("problema da mochila" → "backpack problem") | A forma original continua valendo; o caminho de 56% com tags segue medido |
| Tradução estraga nome próprio ("openrouter" → "opener") | Busca sempre original + traduzida, nunca só a traduzida (medido: título cairia de 100% para 91%) |
| Translator indisponível em muitas máquinas da loja | Tudo funciona sem ele; a opção vem desligada |

## 11. Fases

0. Spikes no Chrome real (descartáveis): Nano (tags) e Translator (tradução) — feitos.
1. `linkKind` e motor de busca (puros), com testes — feitos.
2. Medição com o gabarito → decisão: tradução — feita.
3. Painel no dashboard, busca no popup, saída do filtro do quadro — feitos.
4. Motor com várias formas da consulta; tradutor; ativação em Configurações e ligação no painel e no popup.
5. Política de privacidade, textos, build.
