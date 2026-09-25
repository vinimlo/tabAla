# Nova interface: design

**Data:** 2026-09-25 · **Estado:** direção aprovada em conversa sobre a prévia v2; aguarda revisão da spec escrita · **Branch:** `feat/nova-interface` (a partir de `main` 7ecc933)

## 1. Contexto e objetivo

A busca inteligente e o espaço de recomendação (Próximos passos e Foco, fases 1 e 2) entraram no `main` em 24 e 25/09. Funcionam, mas a interface não acompanhou:

- o CSS pede Inter e General Sans, que não vêm na extensão, então cada máquina mostra uma fonte diferente;
- o coral marca quase tudo (papel do cartão, motivo, links, bordas, botões, barras) e deixou de indicar alguma coisa;
- a faixa mostra três cartões iguais, sem favicon, com rótulos em caixa alta e ✓ e ⋯ digitados como texto;
- o Foco ocupa metade da tela e dá o mesmo peso a cinco seções;
- a busca não destaca o termo, fica vazia antes de digitar e só abre ou revela o link: para concluir, é preciso achar o cartão no quadro;
- o plano da sessão se perde ao recarregar a página;
- os dados da fase 2 (tempo ativo, esforço aprendido) quase não aparecem.

**Objetivo.** A nova aba responde "o que eu faço agora?" em um segundo. Qualquer link aceita as mesmas ações em qualquer lugar onde apareça (Agora, quadro, busca, triagem). A interface segue um sistema visual único, com poucos tokens e primitivas compartilhadas.

**Sucesso.**

- Nenhum texto de interface usa fonte que não vem na extensão.
- Todo botão, tecla, menu e ícone novo ou alterado vem das primitivas (§4.6).
- Concluir, adiar, mover e mostrar no quadro funcionam a partir da busca, sem passar pelo quadro.
- A sessão de Foco sobrevive a recarregar a página e aparece em toda aba nova.
- `make build` continua com no máximo 500 KB.

**Referência visual:** prévias em HTML revisadas em conversa (`mockup.html` e `mockup-v2.html`, geradas no scratchpad). As medidas desta spec vêm da v2.

## 2. Decisões tomadas

| Decisão | Escolha | Por quê |
|---|---|---|
| Profundidade | **Nova experiência, não só polimento** | Pedido explícito: "subir mais um patamar" depois da primeira prévia |
| Recomendação na página inicial | **Um cartão principal (Agora) + duas alternativas (Depois)** | Três cartões iguais pedem escolha; um principal já responde |
| Cor | **Paleta atual mantida; papéis redefinidos** | O coral é a marca (ícone, badge). Coral = a ação principal de cada área; verde = concluído; âmbar = triagem; o resto neutro |
| Fonte | **Instrument Sans local e recortada: variável no peso + uma instância estreita fixa** | Licença OFL; a versão estreita faz as instruções ("Assistir", "Foco") sem trazer outra família, e os dois arquivos somam ~41 KB |
| Busca | **Vira central de comando (⌘K)** | Vazia, mostra o que fazer; com resultados, age sobre o link; aceita comandos |
| Triagem | **Camada própria, acionável de qualquer tela** | Decidir um link por vez, pelo teclado, sem ir até o Foco |
| Sessão | **Persiste entre abas** | Toda aba nova é o tabAla; a sessão deve seguir a pessoa |
| Estrutura | **Sai a coluna das abas abertas e a barra de status** | A coluna vira item da barra lateral; as contagens sobem para o cabeçalho |
| Atalho T | **Continua abrindo as abas abertas** | Atalho existente não muda; a triagem vem pelo ⌘K e pelos botões |
| Código interno | **Componentes novos com nomes da interface (`Now*`, `CommandPalette`, `TriageOverlay`)** | Os nomes `nextup_*` somem da interface; chaves de configuração continuam as mesmas |

## 3. Escopo e etapas

**Dentro:** sistema visual, primitivas, estrutura da página, Agora, cartão do quadro, ⌘K, triagem em camada, Foco, sessão persistente, alinhamento dos modais, do toast e do popup às primitivas, política de privacidade, harness de prévia.

**Fora:** mudar o motor de recomendação ou o de busca (só helpers novos em cima deles); miniaturas de páginas (exigiriam permissão de host); tema novo; reorganizar o quadro (arrastar, colunas e workspaces continuam como estão); IA.

**Etapas**, cada uma com testes verdes e antes e depois em imagem (§14):

1. **Base e estrutura.** Tokens, fonte, ícones, primitivas, barra lateral nova, cabeçalho, fim da barra de status, cartão do quadro, harness de prévia.
2. **Agora e triagem.** Seção Agora (principal + Depois) e a camada de triagem.
3. **⌘K.** Estado vazio, comandos, destaque do termo, painel de ações, mover.
4. **Foco e sessão.** Novo layout do Foco e a sessão persistente.
5. **Consistência.** Modais (configurações, coleção, workspace, confirmação, onboarding), toast e popup passam a usar as primitivas; política de privacidade.

## 4. Sistema visual

### 4.1 Cor por papel

A paleta de `tokens.css` continua. Os tokens abaixo são adicionados ou renomeados em `src/shared/styles/tokens.css`, com valores para escuro e claro:

| Papel | Token | Escuro | Claro | Uso |
|---|---|---|---|---|
| Ação principal | `--accent-primary` | `#E85D42` | `#D14E35` | Um botão principal por área, anel de andamento, item ativo |
| Texto sobre coral claro | `--accent-ink` | `#FF8A70` | `#C2432B` | Pílula da sessão, tempo em andamento no cartão |
| Linha coral | `--accent-line` | `rgba(232,93,66,.42)` | `rgba(209,78,53,.35)` | Borda da pílula e da pergunta "Já terminou?" |
| Concluído | `--semantic-success` | `#7CB890` | `#3D8A5A` | ✓, barras de progresso, histórico |
| Fundo de concluído | `--success-soft` | `rgba(124,184,144,.15)` | `rgba(61,138,90,.1)` | Selos e barras antigas |
| Triagem | `--semantic-warning` | `#D4A85A` | `#A67C1E` | Motivo de triagem, "parado há" |
| Fundo de triagem | `--warning-soft` | `rgba(212,168,90,.14)` | `rgba(166,124,30,.1)` | Selo do motivo |
| Poço | `--surface-well` | `#0B0A0D` | `#EFECE7` | Fundo de controle segmentado e barras |
| Ladrilho | `--surface-tile` | `#232228` | `#F1EEE9` | Fundo do favicon |
| Hover | `--state-hover` | `rgba(255,255,255,.04)` | `rgba(30,20,10,.035)` | Linhas e itens de menu |
| Véu | `--scrim` | `rgba(7,6,9,.66)` | `rgba(60,50,40,.28)` | Atrás de camadas, com `backdrop-filter: blur(6px)` |

`--semantic-warning` sai de `newtab/app.css` e passa para `tokens.css`. Cores literais em componentes (`#F8F6F3`, `#0F0E11`, `#E85D42`, `#d4563f`, `#D14E35`) viram tokens. `rgba(...)` em componente só é aceito para sombra.

**Regra do coral:** no máximo um elemento coral preenchido por área visível (cartão Agora, painel da sessão, camada). Links e rótulos não usam coral; usam `--text-secondary` com sublinhado no hover.

### 4.2 Tipografia

- **Família única, dois arquivos locais** (medidos em 25/09; a fonte variável com os dois eixos recortada dava 54 KB):
  - `public/fonts/instrument-sans.woff2`: Instrument Sans variável só no peso (`wght` 400–700, largura normal), ~27 KB; família CSS `"Instrument Sans"`;
  - `public/fonts/instrument-sans-condensed.woff2`: instância fixa com largura 80% e peso 620, ~14 KB; família CSS `"Instrument Sans Condensed"`, usada só pelo `--font-display`;
  - licença em `public/fonts/OFL.txt`; `@font-face` em `tokens.css`, `font-display: block` (os arquivos são locais).
- **Recorte:** latim básico e Latin-1 (U+0020–007E, U+00A0–00FF), mais `– — ‘ ’ “ ” … •`, feito por `scripts/fonts/subset-instrument-sans.sh` num container. Meta: ≤ 42 KB somando os dois. Setas e símbolos de tecla (⌘ ⇧ ⌥ ↵ ↑ ↓) caem na fonte do sistema.
- **Se o portão de 500 KB estourar:** primeiro a instância estreita passa a ter só letras (A–Z, a–z e acentuadas); depois ela sai, e as instruções usam o peso 650 da família normal. A fonte nunca volta a ser remota.
- `--font-body` = `"Instrument Sans"`; `--font-display` = `"Instrument Sans Condensed"`, com o normal como reserva. `--font-mono` fica só para código, nunca para domínio ou rótulo.

**Escala** (substitui a atual; os nomes existentes continuam válidos):

| Token | px | Uso |
|---|---|---|
| `--text-2xs` | 11 | Teclas, contagens |
| `--text-xs` | 12 | Metadados, domínio |
| `--text-sm` | 13 | Texto secundário, botões |
| `--text-base` | 14 | Corpo, títulos de link |
| `--text-md` | 16 | Título de seção, título de painel |
| `--text-lg` | 20 | Título da triagem, título do Foco em telas estreitas |
| `--text-xl` | 26 | Título do workspace |
| `--text-display` | 46 | Verbo do cartão Agora e "Foco" (estreito, 600–650, `letter-spacing: -0.025em`, `line-height: .9`) |

Pesos: 400, 500, 600, 650. Sem caixa alta em rótulos e sem `letter-spacing` positivo. Números em contagem usam `font-variant-numeric: tabular-nums`.

### 4.3 Espaço, raio, controle

- Espaço: a escala `--space-1` a `--space-8` continua (4, 8, 12, 16, 24, 32, 48).
- Raio por hierarquia: `--radius-sm` 8 (botão pequeno, tecla, chip), `--radius-md` 11 (botão, campo, item de menu), `--radius-lg` 16 (cartão do quadro, painel), `--radius-xl` 22 (cartão Agora, camadas).
- Altura de controle: `--control-sm` 28, `--control-md` 34, `--control-lg` 42 (campo de busca do cabeçalho).
- Sombra: `--shadow-lift` (cartões e painéis: 1 px interno claro + 1–2 px de sombra) e `--shadow-float` (camadas). As sombras atuais (`--shadow-sm` a `--shadow-xl`) viram apelidos dessas duas.

### 4.4 Movimento

- `--duration-fast` 150 ms, `--duration-normal` 220 ms, `--ease-out` atual.
- Movimento só responde a ação: concluir, abrir camada, trocar de cartão na triagem. Nada anima sozinho ao carregar a página.
- Com `prefers-reduced-motion`, a regra global já zera durações; nenhum componente depende da animação para funcionar.

### 4.5 Ícones

`src/shared/components/ui/Icon.svelte` desenha ícones 24×24, traço 2, pontas arredondadas, pelo nome: `check`, `clock`, `more`, `chevron-down`, `chevron-right`, `target`, `search`, `board`, `tabs`, `gear`, `plus`, `external`, `play`, `paper`, `chat`, `page`, `code`, `docs`, `pin`, `pin-filled`, `trash`, `keep`, `reference`, `move`, `eye`, `alert`, `sun`, `moon`, `folder`, `enter`, `undo`, `globe`. Os caracteres ✓, ⋯, ▸ e ▾ usados como ícone saem de todos os componentes. SVGs inline já existentes migram quando o componente for tocado.

### 4.6 Primitivas

Em `src/shared/components/ui/`, usadas pela nova aba e pelo popup:

| Componente | API | Notas |
|---|---|---|
| `Button` | `variant: 'primary' \| 'secondary' \| 'quiet' \| 'danger'`, `size: 'sm' \| 'md'`, `icon?` | `primary` = coral preenchido. Repassa `on:click` e atributos |
| `IconButton` | `icon`, `label` (obrigatório, vira `aria-label` e `title`), `size` | |
| `Kbd` | slot | Tecla com borda inferior de 2 px |
| `Menu` + `MenuItem` | `open`, `anchor`; itens com `icon`, `danger`, `on:select` | Fecha no clique fora e no Esc; ↑↓ e ↵ navegam; `role="menu"` |
| `LinkTile` | `link`, `size: 32 \| 36 \| 56`, `tint?` | Favicon num ladrilho; sem favicon, ícone `globe` |
| `Segmented` | `options`, `value`, `on:change` | `role="radiogroup"` |
| `ProgressRing` | `value` 0–1, `size`, `stroke` | SVG; `aria-hidden` (o texto ao lado diz o valor) |

As classes de botão hoje repetidas nos componentes (`card-btn`, `card-dropdown`, `front-actions button`, `triage-decisions button`, `session-options button`, `completed-undo`) somem para essas primitivas.

## 5. Estrutura da página

```
┌────┬──────────────────────────────────────────────────────────────────────────┐
│ ▤  │ Geral                     [🔍 Buscar links ou digitar um comando ⌘K]      │
│    │ 17 pendentes em 5 coleções                       + Nova coleção  (Sessão)│
│ ▥  │ Agora ▾                                        ●○●○◉○○ 2 concluídos      │
│ ◎  │ ┌──────────────── Agora ──────────────────┐ ┌──────── Depois ─────────┐  │
│ ⧉7 │ │                                          │ │                         │  │
│ ── │ └──────────────────────────────────────────┘ └─────────────────────────┘  │
│ G  │ Inbox 3        Machine learning 4 📌   Web platform 5   Talks para ver 2  │
│ S  │ [cartões]      [cartões]                [cartões]        [cartões]         │
│ +  │                                                                            │
│ ⚙  │                                                                            │
└────┴──────────────────────────────────────────────────────────────────────────┘
```

**Barra lateral (68 px).** De cima para baixo: marca do tabAla; **Início** (quadro), **Foco**, **Abas abertas** (com a contagem de abas); divisor; workspaces (como hoje, com arrastar e menu de contexto) e "+"; espaço; **Configurações**. O item ativo tem fundo `--surface-overlay` e `--shadow-lift`; o workspace ativo tem uma barra de 3 px à esquerda.

**Abas abertas.** O painel `TabsSidebar` expandido continua igual (320 px, empurra o conteúdo). O estado recolhido de 52 px deixa de existir: o painel abre e fecha pelo item da barra lateral e pelo atalho T.

**Cabeçalho** (substitui `QuickActionsBar`):

- à esquerda, o nome do workspace (`--text-xl`, 650) e, abaixo, "N pendentes em M coleções" (§5.1);
- ao centro, o gatilho da busca: 520 px, `--control-lg`, "Buscar links ou digitar um comando" e as teclas ⌘ K (Ctrl K fora do Mac);
- à direita, "Nova coleção" (`Button quiet`) e, com sessão ativa, a pílula da sessão (§11). No Foco, o cabeçalho mostra só a busca.

**Barra de status.** `StatusBar.svelte` sai. "Último salvo" deixa de aparecer; links e coleções vão para o cabeçalho.

### 5.1 Contagem do cabeçalho

`pendingCount` = links do workspace ativo (Inbox inclusa) sem `completedAt` e que não são referência (`isReference`). Coleções = coleções do workspace ativo com ao menos um desses links. Sem pendentes: "Nada pendente".

## 6. Agora

Seção entre o cabeçalho e o quadro. Liga e desliga pela configuração existente `showNextUp` (rótulo novo: "Mostrar Agora"); recolhe pela `nextUpCollapsed`.

**Cabeçalho da seção:** "Agora" (`--text-md`, 650), botão de recolher (`chevron-down`) e, à direita, a semana em pontos: 7 pontos de segunda a domingo, preenchidos em verde nos dias com ao menos uma conclusão, o de hoje com anel; ao lado, "N concluídos esta semana" (N em verde). Recolhida, a seção vira uma linha: "Agora: {verbo} {título}" e o botão de expandir.

**Grade:** principal à esquerda (`1fr`), Depois à direita (400 px; 320 px entre 1024 e 1279 px de largura; abaixo de 1024 px, Depois vai para baixo do principal).

### 6.1 Cartão principal

É `queue.slots[0]` (ou o item da sessão, §11). Anatomia:

- **Orbe** (104 px): disco com o favicon a 38 px sobre a cor da coleção a 18% (`--surface-tile` para Inbox); em volta, `ProgressRing` coral quando há tempo ativo; abaixo, "18 de ~20 min" ou "~20 min".
- **Contexto:** ponto na cor da coleção + "{papel} em {coleção}" ("Continuar em Machine learning", "Avançar em Talks para ver", "Retomar em …"); à direita, o motivo em `--text-tertiary` ("aberto ontem", "1 concluído esta semana", "faltam 4 para zerar").
- **Instrução:** o verbo da ação em `--text-display` estreito ("Assistir", "Ler", "Resolver") e, na mesma linha de base, o tempo em 17 px `--text-secondary` (§6.3).
- **Título:** 19 px, 500, até duas linhas; clicar abre o link (⌘-clique em aba nova), com o ícone `external` ao lado.
- **Ações, na base do cartão:**

| Estado | Texto à esquerda | Principal | Secundário |
|---|---|---|---|
| Pergunta (`reason.type === 'ask'`) | "**Já terminou?** Você ficou N min nesta aba." | ✓ Sim, concluí | Ainda não |
| Continuar (sem pergunta) | nenhum | Continuar {verbo no gerúndio: assistindo, lendo, resolvendo} | ✓ Concluir |
| Avançar e Retomar | nenhum | {Verbo} agora | ✓ Concluir |

Sempre à direita: `IconButton clock` (Adiar, abre `Menu` com Amanhã e Próxima semana) e `IconButton more` (Marcar como referência, Mostrar no quadro, Descartar em vermelho).

Um brilho radial da cor da coleção a 16% no canto superior esquerdo é a única decoração.

### 6.2 Depois

Painel com "Depois" (ou "Depois, na sessão") e:

- até duas linhas de recomendação (`slots[1..2]`): `LinkTile 36`, "**{Verbo}** ~N min · {coleção}", título em uma linha; no hover, `IconButton check`;
- divisor;
- **Triar N links parados** (ícone `alert` âmbar, abre a camada de triagem), só com triagem pendente;
- **Planejar uma sessão** (ícone `target` coral, tecla F, abre o Foco); com sessão ativa, vira **Encerrar a sessão**;
- depois de uma conclusão feita no Agora, uma linha "{título curto}, concluído agora" com **Desfazer** até a próxima ação ou 10 s.

### 6.3 Tempo e andamento

Helper puro `timeLeft(activeMs, effort)` em `src/lib/recommend/time.ts`, com `spent = round(activeMs / 60000)`:

- `spent === 0` → "~{effort} min", anel ausente;
- `0 < spent < effort` → "faltam uns {effort − spent} min", anel = `spent / effort`, legenda "{spent} de ~{effort} min";
- `spent ≥ effort` → "{spent} min até agora", anel cheio.

### 6.4 Estados vazios

- **Fila vazia:** o cartão principal vira "Nada pendente." (`--text-display` estreito) e "Os links que você salvar aparecem aqui." O Depois some; a semana em pontos continua.
- **Só triagem:** o principal diz "Decida {N} links parados" com o botão principal "Triar agora".

### 6.5 Concluir pelo Agora

Ao concluir, o ✓ preenche em verde (150 ms), o cartão principal troca para a próxima recomendação por esmaecimento (220 ms) e o Depois reordena (`animate:flip`). O toast de desfazer continua valendo para descarte; a conclusão usa a linha de Desfazer do §6.2.

## 7. Cartão do quadro

`LinkCard` mantém comportamento, arrastar e menu. Muda a apresentação:

- `LinkTile 32`, título 13,5 px 500 até duas linhas;
- **linha de metadados** (12 px, `--text-tertiary`), na primeira regra que valer:
  1. referência → ícone `reference` + "Referência";
  2. adiado → ícone `clock` + "Adiado até {dia}" e o cartão a 60% de opacidade;
  3. em triagem → ícone `alert` âmbar + motivo curto: "Pulado 3 vezes", "Adiado 3 vezes", "Aberto e não concluído", "Parado há {N} dias";
  4. em andamento (`activeMs ≥ 60 000`) → ícone `clock` em `--accent-ink` + "{spent} de ~{effort} min";
  5. senão → ícone do tipo + "{Tipo} · {effort} min";
  e, em seguida, o domínio sem `www.`, na fonte da interface (sai o monoespaçado);
- **ações no hover e no foco do teclado:** grupo flutuante no canto superior direito com ✓ Concluir (verde no hover), abrir em nova aba e ⋯ (o menu atual);
- colunas: sem caixa em volta; cabeçalho com ponto quadrado na cor da coleção, nome (13,5 px 600), contagem, alfinete coral quando a coleção é foco e ⋯. Os cartões ficam sobre o fundo da página, com `--surface-elevated` e `--shadow-lift`.

O esforço vem de `queue.effortOf(link)`; o tipo de `linkKind`; a triagem de `queue.triage`.

## 8. ⌘K

`SearchPanel.svelte` dá lugar a `CommandPalette.svelte`: 820 px de largura, a 84 px do topo, `--radius-xl`, `--shadow-float`, sobre o véu.

**Campo:** 62 px de altura, ícone de busca, 19 px; à direita, o selo fixo "Todos os workspaces" (a busca já cobre todos). Placeholder: "Buscar links ou digitar um comando".

### 8.1 Antes de digitar

Três grupos, nesta ordem:

1. **Agora:** os links de `queue.slots` (até 3), com "{Verbo}, ~N min" ou "Continuar {gerúndio}, faltam uns N min" e a coleção;
2. **Abertos recentemente:** até 5 links não concluídos com `activity.lastOpenedAt`, do mais recente ao mais antigo, sem repetir os do Agora; metadado "hoje", "ontem" ou "há N dias" (`formatRelativeTime`);
3. **Ações:** a lista do §8.2 que se aplicar.

### 8.2 Comandos

| Comando | Quando aparece | Faz |
|---|---|---|
| Triar N links parados | triagem pendente | Abre a camada de triagem |
| Começar uma sessão de 15 / 30 / 60 min | sem sessão ativa | Monta e inicia a sessão (§11) e fecha a busca |
| Encerrar a sessão | sessão ativa | Encerra (§11.3) |
| Abrir o Foco / Voltar ao quadro | sempre | Troca a vista |
| Nova coleção | sempre | Abre o modal atual |
| Ir para {workspace} | um por workspace que não é o ativo | Ativa o workspace e mostra o quadro |
| Mudar para o tema claro / escuro | sempre | Troca `settings.theme` para o oposto do tema em uso |
| Mostrar / Ocultar Agora | sempre | Alterna `showNextUp` |
| Abrir configurações | sempre | Abre o modal atual |

Comandos são uma lista pura em `src/newtab/commands.ts` (`buildCommands(context)`), filtrada pelo texto normalizado (sem acento, minúsculo, por palavra). Ao digitar, até 3 comandos que casam aparecem no grupo Ações, depois dos links. Com o texto começando por `>`, só comandos.

### 8.3 Resultados

- Filtros por tipo como hoje, com ícone e contagem; "Tudo" primeiro.
- Cada resultado: `LinkTile 36`, título com os termos destacados, e metadados: coleção, tipo, domínio; concluído mostra "✓ Concluído em {dia}" em verde; casamento por assunto mostra "assunto: {tag}".
- **Destaque:** helper puro `highlight(title, terms)` em `src/lib/search/highlight.ts` devolve trechos `{text, match}`. Casa sem diferenciar acento e caixa, pelo prefixo de cada termo da consulta (e da tradução, quando ligada). O trecho casado recebe `<mark>` com fundo coral a 22% e texto `--text-primary`.
- Sem resultados: "Nada encontrado para “{consulta}”." e, abaixo, a dica de busca por assunto quando ela se aplicar (como hoje).

### 8.4 Painel do link

Com a paleta a 760 px ou mais de largura, uma coluna de 300 px à direita mostra o link selecionado:

- `LinkTile 56` com a cor da coleção, título (17 px 600), URL sem esquema;
- fatos: Coleção (caminho), Tipo ("Página, uns 10 min"), Salvo (data), Aberto ("nunca", "ontem", "há N dias");
- ações, cada uma com a tecla: **Abrir** ↵, **Concluir** ⌥↵ (ou **Restaurar** para concluído), **Adiar para amanhã**, **Mover para…**, **Mostrar no quadro** ⇧↵, **Descartar** (vermelho, com o toast de desfazer atual).

**Mover para…** troca a lista da paleta pela lista de coleções de todos os workspaces ("{workspace} › {coleção}"), filtrável pelo campo; ↵ move (`linksStore.moveLink`), mostra "Movido para {coleção}" e volta aos resultados; Esc volta sem mover.

Abaixo de 760 px o painel some, e → abre as mesmas ações num `Menu` ancorado no resultado.

### 8.5 Teclado e acessibilidade

↑↓ navegam; ↵ abre; ⌘↵ abre em aba nova; ⇧↵ mostra no quadro; ⌥↵ conclui; → leva o foco às ações do painel (↑↓ e ↵ dentro; ← volta); Esc sai de "Mover para…" ou fecha. O campo é `role="combobox"` com `aria-activedescendant`; a lista é `role="listbox"`; cada grupo é `role="group"` com rótulo. O rodapé mostra as teclas com `Kbd`.

## 9. Triagem em camada

`TriageOverlay.svelte`: diálogo modal sobre o véu, 640 px, com foco preso e Esc para fechar. Abre pelo Depois, pelo painel de triagem do Foco, pelo ⌘K e pelo item de triagem da sessão.

- **Topo:** "Triagem", barra de progresso âmbar, "{i} de {total}" (total fixado ao abrir) e a tecla Esc.
- **Cartão:** pilha com dois cartões de fundo (deslocados 12 e 24 px, escala .96 e .92); na frente, o selo do motivo (âmbar) com o texto de `TRIAGE_KEYS`, `LinkTile 56`, título (26 px, 620, largura 88%), metadados (domínio, caminho da coleção, "salvo há N dias") e "Abrir para decidir" (abre em aba nova e fixa o cartão, como hoje).
- **Decisões:** quatro botões grandes com ícone e tecla: Ainda vale `keep` 1, Descartar `trash` 2, Referência `reference` 3, Já concluí `check` 4. As regras de teclado da fase 1 continuam (sem repetição, fora de campos, sem modificadores).
- **Transição:** o cartão da frente sai subindo e esmaecendo (180 ms); o próximo sobe da pilha.
- **Fim:** "Triagem feita." com a contagem por decisão ("3 mantidos, 1 descartado, 1 concluído") e Fechar.

O Foco deixa de ter a triagem embutida (§10).

## 10. Foco

```
Foco   2 concluídos esta semana. A fila caiu de 16 para 14.
┌──────────── Sessão ─────────────────┐ ┌── Semana a semana ─────┐
│ Quanto tempo você tem? [15|30|60]    │ │ ▁▃▂ ▅▆█▄               │
│ 0′  Triar 2 links parados     ~1 min │ │ No ritmo atual, a fila │
│ 1′  Terminar Let's build GPT  ~2 min │ │ zera em 4 semanas.     │
│ 3′  Assistir Simple Made Easy ~20 min│ ├── Frentes ─────────────┤
│ ████████░░  23 de 30 min [Começar]   │ │ ● Machine learning 3 📌 │
├──────────── Triagem ────────────────┤ ├── Concluídos ──────────┤
│ [pilha]  5 links esperando  [Triar]  │ │ ✓ Scaling Laws    qua  │
└─────────────────────────────────────┘ └────────────────────────┘
```

- **Topo:** "Foco" em `--text-display` estreito e a frase: "{N concluídos} esta semana." + "A fila caiu de X para Y." / "A fila subiu de X para Y." (`previousQueue`, omitida quando igual ou ausente). N em verde.
- **Grade:** coluna principal `1fr` e lateral de 380 px, 16 px de intervalo; abaixo de 1200 px, uma coluna só.
- **Sessão:** `Segmented` 15/30/60; linha do tempo do plano (`buildSession`): minuto de início acumulado (0′, 1′, 3′…), `LinkTile 36` (ou ícone `alert` âmbar para triagem), "**{Verbo}** · {coleção}", título, "~N min" à direita; item acima do orçamento com "passa do tempo" em `--text-tertiary`. Barra de orçamento segmentada pela cor de cada item (âmbar triagem, coral continuar, `--text-secondary` o resto, `--border-strong` o excedente), "{soma} de {orçamento} min" e o botão principal **Começar sessão**. Com sessão ativa, o painel mostra o andamento (§11.2).
- **Triagem:** pilha em miniatura com o primeiro link, "N links esperando decisão" e **Triar agora**; vazio: "Nada para triar."
- **Semana a semana:** 8 barras (`completedByWeek`), a atual em verde cheio e as outras em verde a 28%; rótulo a cada duas semanas e "agora" na última; `title` com a contagem. Frase de projeção (§10.1).
- **Frentes:** ponto, nome e motivo em duas linhas, contagem de pendentes e alfinete (`pin` / `pin-filled` coral) que alterna o foco; ⋯ com "Marcar como referência" (fora da Inbox).
- **Concluídos:** esta semana e a anterior ("Esta semana", "Semana de {dia}"), com ✓ verde, título, dia da semana ou data, e Desfazer no hover. "Ver todos" expande o histórico completo no próprio painel.

### 10.1 Projeção da fila

Helper puro `queueForecast(bars, queueSize)` em `src/lib/recommend/progress.ts`: ritmo = média das 4 semanas completas mais recentes; sem conclusões nelas, não há frase. Semanas = `ceil(queueSize / ritmo)`. Frase: "Você conclui uns {ritmo arredondado} por semana. No ritmo atual, a fila zera em {N} semanas." Com N > 52, só a primeira frase; com fila 0, "A fila está zerada."

## 11. Sessão entre abas

### 11.1 Dados

Chave nova `focusSession` em `chrome.storage.local`, fora do export e apagada por "Apagar dados de uso":

```ts
interface FocusSession {
  minutes: SessionMinutes;
  startedAt: number;
  items: ({ type: 'triage'; count: number } | { type: 'link'; linkId: string })[];
  /** Links concluídos durante a sessão, para o resumo. */
  completedIds: string[];
}
```

Store `sessionStore` (carregar, iniciar, registrar conclusão, encerrar) sincronizado por `storage.onChanged`, como os demais. Funções de leitura puras em `src/lib/recommend/session.ts`: `sessionView(session, links, queue, now)` → `{ current?, next[], triageLeft, remainingMs, done, total }`.

### 11.2 Enquanto ativa

- **Pílula no cabeçalho:** `ProgressRing` coral (tempo decorrido / total) + "Sessão" + "{N} min restantes"; clicar abre o Foco.
- **Agora segue o plano:** o principal é o primeiro item de link ainda não concluído (aberto e não concluído continua como principal, no estado Continuar); o Depois vira "Depois, na sessão" com os itens seguintes; o item de triagem aparece como "Triar N links parados" enquanto houver triagem.
- **Cabeçalho do Agora:** "{i} de {total} na sessão".
- **Painel do Foco:** a linha do tempo marca concluídos (✓ verde) e o atual; botões **Abrir o próximo** e **Encerrar**.
- Itens cujo link foi concluído fora da sessão, descartado ou apagado saem do plano.

### 11.3 Fim

A sessão acaba quando todos os itens de link foram concluídos ou saíram, quando o tempo passa ou por **Encerrar**. A pílula vira "Sessão encerrada: {feitos} de {total}" com um botão de fechar; fechar apaga a chave. Uma sessão com mais de 12 h do início é apagada ao carregar, sem resumo.

## 12. Atalhos

| Tecla | Onde | Faz | Estado |
|---|---|---|---|
| ⌘K / Ctrl K, `/` | quadro e Foco | Abre o ⌘K | existente |
| N | quadro e Foco | Nova coleção | existente |
| T | quadro e Foco | Abre e fecha as abas abertas | existente |
| F | quadro e Foco | Alterna entre Foco e quadro | novo |
| Esc | camadas | Fecha a camada do topo | existente |
| 1–4 | triagem | Decide | existente (sai do Foco, vai para a camada) |
| ↑↓ ↵ ⌘↵ ⇧↵ | ⌘K | Navega, abre, aba nova, mostra no quadro | existente |
| ⌥↵, →, ← | ⌘K | Conclui, entra e sai das ações | novo |

Atalhos de uma letra continuam desligados em campos de texto, com modificadores e com camada aberta.

## 13. Popup, modais e toast

Sem mudança de layout: `ConfirmDialog`, `CreateCollectionModal`, `WorkspaceModal`, `SettingsModal`, `OnboardingWizard`, `Toast` e o popup passam a usar `Button`, `IconButton`, `Kbd`, `Icon` e os tokens; cores literais saem; modais usam `--radius-xl`, `--shadow-float` e o véu. O popup carrega a mesma fonte local e a escala reduzida que já tem em `popup/app.css`. Textos de configuração: "Mostrar Próximos passos" vira "Mostrar Agora".

## 14. Acessibilidade e responsividade

- Foco visível em todo controle (`:focus-visible`: anel de 2 px coral com afastamento de 2 px).
- Contraste AA para texto em ambos os temas; `--text-tertiary` só para texto não essencial ≥ 12 px.
- Toda camada é `role="dialog"` com `aria-modal`, foco inicial e retorno do foco ao fechar.
- Larguras verificadas: 1024, 1280, 1440 e 1920 px.

## 15. Privacidade

Nenhuma permissão nova e nada sai do navegador. A política (en e pt) ganha, na seção de Próximos passos e Foco, a sessão em andamento (duração, horário de início e os links do plano), guardada localmente, fora do export e apagada por "Apagar dados de uso". A seção passa a citar "Agora" no lugar da faixa. Data de vigência nova no merge.

## 16. Testes e verificação

- **Helpers puros com teste unitário:** `timeLeft`, `weekDots`, `queueForecast`, `highlight`, `buildCommands`, `recentlyOpened`, `pendingCount`, `sessionView`, `cardMeta` (regra do §7).
- **Componentes (Testing Library):** primitivas (Button, Menu com teclado, Segmented), cartão Agora nos três estados e nos vazios, Depois, cabeçalho com pílula, `LinkCard` (linha de metadados, ações no hover), `CommandPalette` (grupos vazios, comandos, `>`, destaque, painel, ⌥↵, →, Mover para…), `TriageOverlay` (teclas, progresso, fim, Esc, foco), Foco (começar sessão grava a chave; projeção), `sessionStore` (sincroniza entre instâncias, encerra, expira).
- Testes da faixa, da `SearchPanel`, da `StatusBar` e da `QuickActionsBar` são substituídos pelos novos, cobrindo o mesmo comportamento.
- **Portões por etapa:** `make test` verde; `make lint` sem erro novo (12 antigos); `make build` ≤ 500 KB; manifest sem permissão nova.
- **Verificação visual:** harness de prévia em `scripts/preview/` (stub de `chrome.*` com dados fictícios e sem dado pessoal, servidor estático num container com teto de CPU, alvo `make preview` que builda em `.preview/`, fora do `dist`, na porta 4173 registrada no port-map). Em cada etapa: capturas antes e depois de quadro, Agora, ⌘K, triagem e Foco, nos dois temas, a 1440 px e a 1024 px.
- **Teste manual no Chrome** (roteiro no fim da etapa 5): fonte carregada sem rede, sessão entre duas abas, mover pelo ⌘K, triagem pelo teclado.

## 17. Riscos

| Risco | Mitigação |
|---|---|
| Fonte + código novo estouram 500 KB (folga de ~64 KB; a fonte e a licença levam ~45) | Recorte da fonte (~41 KB); saem `StatusBar`, `QuickActionsBar`, `NextUpStrip`, `NextUpCard`, `SearchPanel` e `FocusTriage`; o tamanho é medido ao fim de cada etapa (`du -sb dist` ≤ 512 000); se estourar, a instância estreita encolhe e depois sai (§4.2) |
| Rodar o Vite com crxjs apaga o `dist` | O harness builda em `.preview/` com `--outDir`; nunca `vite preview` ou `vite dev` durante o trabalho |
| Muitas telas mudam de uma vez | Cinco etapas, cada uma com testes e imagens; o comportamento do motor não muda |
| Atalho F atrapalha quem digita | Mesmas guardas dos atalhos atuais (campo de texto, modificadores, camada aberta) |
| Sessão órfã depois de dias | Expira com 12 h |
