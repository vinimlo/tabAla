# Próximos passos e Foco: design

**Data:** 2026-09-24 · **Estado:** aprovado em conversa; aguarda revisão da spec escrita · **Branch:** `feat/proximos-passos` (a partir de `main` e2dd237)

## 1. Contexto e objetivo

Os links se acumulam no tabAla mesmo com uso diário. Salvar é fácil, mas nada ajuda a decidir o que abrir, ler, assistir ou resolver em seguida. O quadro também não distingue um link já consumido de um que ainda espera. Na limpeza de 18/09, cerca de 20% das abas eram descartáveis e outros 20% eram contexto de trabalho em andamento, não leitura.

O objetivo é um espaço que recomende, de forma explicável, o próximo passo concreto para cada link salvo e que tire do caminho o que já foi feito. Cada link deve terminar num destes estados:

- **concluído:** lido, assistido ou resolvido;
- **referência:** fica, mas não é tarefa;
- **descartado:** não vale mais.

**Sucesso.** Depois de 2 semanas de uso:

- a fila de pendentes cai semana a semana;
- existe uma taxa de aceitação medida, que serve de régua para decidir se a IA do Chrome entra depois (§10).

**Dados reais que moldam o desenho** (export canônico de 24/09, 170 links):

- 96 links (56%) são página genérica, seguidos de 23 repos, 18 docs, 15 vídeos e 10 papers. O tipo sozinho diz pouco sobre o esforço.
- 22 são conversas de IA salvas: claude.ai, ChatGPT, Gemini e NotebookLM.
- 91 links ficaram datados de setembro por causa da reconstrução, então a idade sozinha também diz pouco. Hoje 79 têm mais de 60 dias.

## 2. Decisões tomadas

| Decisão | Escolha | Por quê |
|---|---|---|
| Presença no dia a dia | **Faixa "Próximos passos" em toda nova aba + espaço Foco** | A faixa lembra sem exigir que a pessoa vá atrás, e o Foco serve para sentar e atacar uma fila com tempo marcado |
| Destino de um link feito | **Arquivar** como concluído (sai do quadro e da fila, vai para o histórico, desfazer devolve) | Mantém o histórico, mede o progresso e é reversível |
| Nome do estado | **Concluído** (en: *Completed*), nunca "vencido" | "Vencido" soa como validade expirada |
| Fonte da inteligência | **Frentes + sinais de uso**: recomenda por coleção, seguindo a ordem da coluna, e aprende com o que a pessoa abre e por quanto tempo | É explicável, mantém a continuidade de assunto e roda local, sem IA e sem permissão nova |
| Descartadas | Fila única com nota por link, e Gemini Nano classificando as páginas | A fila única pula de assunto a cada aba e ignora a ordem que a pessoa dá. O Nano aceita só inglês no Chrome 153, leva ~13 s por lote de 5 e rendeu +16 pp na busca, abaixo do critério |
| Público | Chrome Web Store | en + pt_BR, **nenhuma permissão nova** e tudo funciona sem IA |

## 3. Escopo e fases

A entrega tem duas fases. Cada uma tem plano próprio e funciona sozinha.

- **Fase 1:** ciclo de vida do link, motor de recomendação, faixa, espaço Foco, ações no quadro, no popup e na busca, e o tipo `chat`. O aprendizado vem só do que a pessoa faz dentro do tabAla.
- **Fase 2:** sinais de uso no service worker. Eles cobrem visitas por qualquer caminho, tempo ativo, a pergunta "concluído?" automática, o esforço aprendido e o ponto no ícone da aba.

**Fora do escopo:**

- IA (Nano, Summarizer), que fica para uma avaliação futura com a régua da §10;
- notificações do sistema, porque exigem permissão nova;
- detecção de ociosidade, porque a permissão `idle` também seria nova;
- prazos por coleção;
- sequência de dias e outras formas de gamificação;
- conclusão automática sem confirmação;
- sincronização entre aparelhos.

## 4. Ciclo de vida do link

| Estado | Condição nos dados | Quadro | Fila (faixa, Foco) | Busca |
|---|---|---|---|---|
| **Pendente** | nenhum dos abaixo | sim | sim, se não estiver em triagem (§6.4) | sim |
| **Adiado** | `snoozedUntil` > início do dia de hoje | sim, com "até 30/09" discreto | não, até a data | sim |
| **Referência** | `link.reference === true`, ou coleção com `reference === true` e `link.reference !== false` | sim, com ícone de marcador | nunca | sim |
| **Concluído** | `completedAt` presente | não | não | sim, com selo "concluído" |
| **Descartado** | link apagado (o remover de hoje) | não | não | não |

Regras:

- "Adiar até amanhã" grava o início do dia seguinte no horário local. "Adiar até a próxima semana" grava o início da próxima segunda-feira.
- Concluir limpa `snoozedUntil`. Desfazer um concluído apaga `completedAt`, e o link volta à coluna na posição que tinha (`order` é preservado).
- Um link concluído numa coleção apagada vai para o Inbox, como qualquer link, e continua concluído.
- O tipo do link nunca decide sozinho se ele é referência. Nos dados há docs que são estudo e repos que são "dar uma olhada".

## 5. Modelo de dados

Todos os campos novos são opcionais. Exports antigos continuam válidos.

```ts
interface Link {
  // ...campos atuais
  /** Unix ms. Presente: concluído — fora do quadro e da fila, listado em Concluídos. */
  completedAt?: number;
  /** Unix ms (início de dia local). Até lá o link fica fora da fila. */
  snoozedUntil?: number;
  /** Unix ms da última resposta "ainda vale" na triagem. */
  keptAt?: number;
  /** true: referência. false: pendente mesmo numa coleção de referência. Ausente: herda da coleção. */
  reference?: boolean;
}

interface Collection {
  // ...campos atuais
  /** Todos os links contam como referência, salvo `link.reference === false`. */
  reference?: boolean;
  /** Frente fixada como foco pela pessoa. */
  focus?: boolean;
}
```

**Chave nova `activity`**, separada de `links` para que registrar uma abertura não dispare o `storage.watch` de `links` nem redesenhe o quadro:

```ts
type Activity = Record<string /* linkId */, LinkActivity>;

interface LinkActivity {
  /** Aberturas: pelo tabAla (fase 1) ou por qualquer caminho (fase 2). */
  opens: number;
  lastOpenedAt?: number;
  /** Dias locais distintos (AAAA-MM-DD) em que o link foi aberto; guarda os 10 últimos. */
  openDays: string[];
  /** Dias locais distintos em que a faixa mostrou o link sem ação desde então; qualquer ação zera. */
  shownDays: string[];
  /** Quantas vezes foi adiado; zera ao concluir ou ao responder "ainda vale". */
  snoozes: number;
  /** Fase 2: tempo ativo acumulado, em ms. */
  activeMs: number;
  /** Fase 2: presente quando uma visita terminou longa o bastante para perguntar "concluído?". */
  askCompleteAt?: number;
}
```

**Chave nova `recoStats`**, com contadores por semana ISO (`AAAA-Www`). Guarda as últimas 12 semanas e fica só no aparelho:

```ts
type RecoStats = Record<string, {
  shown: number;     // link × dia mostrado na faixa
  acted: number;     // abrir ou concluir um link mostrado (shownDays não vazio); a ação zera shownDays, então cada exibição conta no máximo uma vez
  snoozed: number;
  discarded: number;
  skipped: number;   // links que saíram da faixa por 3 dias sem ação
  queue: number;     // último tamanho da fila visto na semana
}>;
```

Os concluídos por semana não precisam de contador, porque saem de `completedAt`.

**Export e import.**

- `completedAt`, `snoozedUntil`, `keptAt`, `reference` e os `reference` e `focus` da coleção entram no export.
- `activity` e `recoStats` não entram, porque são dado de comportamento e podem ser perdidos sem dano.
- O import valida os campos novos com a regra que já vale para `order`: número finito ou booleano, e um valor inválido recusa o arquivo com a mensagem do índice.

Toda gravação nova passa por `withDataLock`, e isso inclui `activity` e `recoStats`. A trava usa Web Locks, que também existem no service worker.

## 6. Motor de recomendação

Módulo puro, `src/lib/recommend/`, sem acesso a `chrome.*`. Entradas: links, coleções, workspaces, `activity`, `now`. Saída: vagas da faixa, fila de triagem, frentes ranqueadas e sessão.

**Estável no dia.** Tudo que depende de tempo usa o início do dia local de `now`. Um link mostrado hoje só conta para a regra dos 3 dias a partir de amanhã. A faixa não embaralha entre uma nova aba e outra, e só muda quando os dados mudam: um link concluído, adiado, aberto e assim por diante.

### 6.1 Elegibilidade

Um link é **elegível** para a fila quando cumpre todas estas condições:

- está pendente (§4): não concluído, não referência e não adiado;
- não está em triagem (§6.4).

Uma **frente** é uma coleção com pelo menos um link elegível. O **próximo link** de uma frente é o primeiro elegível na ordem da coluna (`sortCollectionLinks`), que é a prioridade que a pessoa dá ao arrastar.

### 6.2 Vagas da faixa

A faixa mostra até 3 cards, cada um de uma frente diferente, preenchidos nesta ordem:

1. **Continuar** (0 ou 1 card). É o link elegível aberto nos últimos 14 dias com `lastOpenedAt` mais recente; na fase 2 entra também o que tiver `askCompleteAt`. Sem nenhum desses, vale o próximo link de uma frente com `focus`, e entre várias frentes com foco ganha a de maior momento. Motivo exibido: "Você abriu há 2 dias", "Foco fixado" ou, na fase 2, "Você passou 12 min aqui".
2. **Avançar**, que ocupa as vagas que sobrarem além de Retomar. A ordem é:
   1. `focus` primeiro;
   2. depois **momento**, o número de concluídos da coleção nos últimos 7 dias, em ordem decrescente;
   3. depois as que têm **mais** elegíveis, onde os links se acumulam (decidido em 2026-09-25 depois do ensaio com os dados reais: com "menos elegíveis", as três vagas eram coleções de um link só e as sessões ficavam curtas);
   4. por fim a menor `order` de coleção.

   Motivo exibido, pelo primeiro que se aplicar: "Foco fixado"; "3 concluídos esta semana", se o momento for maior que 0; "Faltam 2 para zerar", com 3 elegíveis ou menos; senão, "Próximo da coluna".
3. **Retomar** (0 ou 1 card). É a frente com o **último toque** mais antigo entre as que ainda não estão na faixa. O último toque é o maior valor, entre os links da coleção, de `createdAt`, `completedAt`, `keptAt` e `lastOpenedAt`. A vaga só aparece se esse toque tiver mais de 14 dias. Motivo exibido: "Parada há 3 semanas".

Se Continuar ou Retomar ficarem vazias, Avançar preenche o lugar. Sem nenhuma frente, a faixa diz que não há nada pendente.

**Pulado.** Quando `shownDays` tem 3 dias anteriores a hoje, o link sai das vagas, entra na triagem com o motivo "você pulou isso 3 vezes" e conta como `skipped` em `recoStats`. Qualquer ação sobre o link zera `shownDays`: abrir, concluir, adiar, "ainda vale" ou marcar referência.

### 6.3 Ação e esforço

`linkKind` define o verbo e o esforço padrão (em minutos):

| Tipo | Ação (pt / en) | Esforço |
|---|---|---|
| `video` | Assistir / Watch | 20 |
| `paper` | Ler / Read | 40 |
| `page` | Ler / Read | 10 |
| `docs` | Ler / Read | 15 |
| `repo` | Explorar / Explore | 15 |
| `exercise` | Resolver / Solve | 30 |
| `code-change` | Revisar / Review | 15 |
| `chat` (novo) | Retomar / Resume | 10 |
| `social` | Ler / Read | 3 |
| `search` | Refazer a busca / Search again | 3 |
| `file` | Abrir / Open | 10 |

**Tipo novo `chat`**, definido em `linkKind` antes de `docs` e `page`:

- `claude.ai` com caminho que começa em `/chat/` ou `/project/`;
- `chatgpt.com` ou `chat.openai.com` com caminho que começa em `/c/` ou `/g/`;
- `gemini.google.com` com caminho que começa em `/app`;
- `notebooklm.google.com` e `notebook.google.com` com caminho que começa em `/notebook/`.

A busca ganha o chip "Conversa" (en *Chat*), e as palavras `conversa`, `conversas`, `chat` e `chats` passam a funcionar como filtro de tipo.

**Esforço aprendido (fase 2).** O esforço de um link é calculado nesta ordem:

1. a mediana do `activeMs` dos concluídos da mesma coleção e do mesmo tipo, se houver pelo menos 3;
2. senão, a mediana dos concluídos do mesmo tipo, com a mesma condição de pelo menos 3;
3. senão, o esforço padrão da tabela.

O valor é arredondado para múltiplos de 5 min, com mínimo de 5.

### 6.4 Triagem

Um link pendente entra na triagem quando atende a qualquer uma destas condições:

- **parado:** max(`createdAt`, `keptAt`, `lastOpenedAt`) tem mais de 60 dias;
- **pulado:** 3 dias em `shownDays`, conforme a §6.2;
- **adiado demais:** `snoozes` ≥ 3;
- **visita sem conclusão:** aberto em 3 ou mais dias distintos nos últimos 30 dias (`openDays`) e ainda pendente. Neste caso a sugestão principal é "virar referência?". Na fase 1 contam só as aberturas pelo tabAla; na fase 2, as de qualquer caminho.

As decisões possíveis são quatro:

| Tecla | Decisão | Efeito |
|---|---|---|
| 1 | Ainda vale | grava `keptAt`, zera `snoozes` e `shownDays` |
| 2 | Descartar | apaga o link e conta `discarded` |
| 3 | Referência | grava `reference = true` |
| 4 | Já concluí | grava `completedAt` |

A fila de triagem vem ordenada assim: primeiro os pulados, depois os adiados demais, depois os de visita sem conclusão e por fim os parados, do mais antigo para o mais novo.

### 6.5 Sessão

A pessoa escolhe 15, 30 ou 60 min, e o motor monta a sequência:

1. Se houver triagem, o primeiro item é "Triar N links", com N = min(5, tamanho da triagem) e custo de 1 min.
2. Se houver card Continuar, esse link vem em seguida.
3. Depois o motor percorre as 2 primeiras frentes na ordem de Avançar e, dentro de cada uma, os elegíveis na ordem da coluna. Um link entra se couber no tempo restante; se não couber, é pulado e o motor tenta o seguinte. A montagem para quando sobram menos de 5 min.
4. Se nenhum link couber, entra o próximo da primeira frente, marcado como "passa do tempo".

A sessão não é guardada. Como o motor é determinístico, recarregar a página refaz a mesma sequência sem os links já concluídos.

## 7. Interface

Nomes: faixa **"Próximos passos"** (en *Next up*) e espaço **"Foco"** (en *Focus*). Todos os textos entram em `en` e `pt_BR`.

### 7.1 Faixa Próximos passos (dashboard)

- Fica entre a `QuickActionsBar` e o quadro, em todo workspace. As recomendações valem para todos os workspaces.
- Cada card mostra, em cima, o papel, a coleção e o motivo; embaixo, o verbo, o título e o esforço (~10 min). As ações são:
  - **Abrir:** abre na aba atual e ⌘/Ctrl+clique abre em nova aba; chama `recordOpen`, que grava `opens`, `lastOpenedAt` e `openDays`, soma `acted` se o link tinha `shownDays` e zera `shownDays`.
  - **✓ Concluir**.
  - **Adiar ▾:** amanhã ou próxima semana.
  - **⋯:** Referência, Descartar ou Ver na coluna, que reaproveita o `revealLink` da busca.
- À direita ficam o atalho "N para triar", que abre a triagem no Foco, e o link "Foco".
- A faixa pode ser recolhida; `settings.nextUpCollapsed` guarda essa escolha. `settings.showNextUp`, ligado por padrão, a esconde de vez.
- Cada link mostrado grava o dia de hoje em `shownDays` e soma `shown` uma vez por link por dia.
- **Fase 2:** um link com `askCompleteAt` ocupa a primeira vaga como pergunta: "Você passou 25 min em *título*. Concluído?". "Sim" conclui; "Ainda não" limpa `askCompleteAt`.

### 7.2 Espaço Foco (dashboard)

- É um item fixo no topo do `WorkspaceRail`, antes dos workspaces. Não é workspace e não conta no limite de 12. Selecionado, ele troca o quadro pela view Foco e mantém a `QuickActionsBar`.
- A view tem cinco seções:
  - **Progresso:** barras com os concluídos por semana nas últimas 8 semanas, e o tamanho da fila (elegíveis + triagem) comparado com a semana anterior (`recoStats.queue`).
  - **Sessão:** botões 15, 30 e 60 min; a sequência numerada, com Abrir e ✓ em cada item; o botão "Próximo".
  - **Frentes:** todas as frentes ranqueadas (ordem de Avançar), com motivo, número de elegíveis e as opções fixar foco e marcar a coleção como referência.
  - **Triagem:** um link por vez, com as quatro decisões (teclas 1–4), a contagem restante e o motivo de o link estar ali.
  - **Concluídos:** agrupados por semana, com a data e o botão desfazer.

### 7.3 Quadro, popup e busca

- **Card do quadro:** ganha **✓ Concluir** no hover, ao lado do remover. O menu do card ganha Adiar e Referência. Um link de referência mostra um ícone de marcador, e um adiado mostra "até 30/09". Os links concluídos saem de `linksByCollection` e das contagens do quadro, da `StatusBar` e do popup.
- **Menu da coluna:** ganha "Marcar como referência" e "Fixar como foco", ambos com opção de desfazer.
- **Popup:** quando a URL da aba atual casa com um link salvo, o casamento é exato na fase 1 e normalizado na fase 2 (§8.2). Para um link pendente, o popup mostra "Salvo em *Coleção* · Concluir"; para um concluído, "Concluído em 12/09 · Desfazer". Abrir um link pelo popup conta `recordOpen`.
- **Busca:** os concluídos aparecem com o selo "concluído" e com a mesma pontuação dos demais. Enter abre o link; ⇧Enter leva ao Foco › Concluídos com o link destacado.

### 7.4 Configurações

A seção "Próximos passos" tem:

- **Mostrar na nova aba:** `showNextUp`.
- **Aprender com o que eu abro**, que só existe na fase 2: `learnFromBrowsing`, ligado por padrão, com uma frase explicando que tudo fica no aparelho.
- **Apagar dados de uso:** remove `activity` e `recoStats` sem tocar nos links.

## 8. Sinais de uso (fase 2)

### 8.1 Eventos

O service worker registra `tabs.onUpdated`, `tabs.onActivated`, `tabs.onRemoved` e `windows.onFocusChanged`. A lógica fica em `src/background/activity.ts`, com `chrome` injetado para poder ser testada; o `service-worker.ts` só conecta os eventos.

- **Abertura:** quando uma aba não anônima carrega uma URL que casa com um link salvo, o service worker registra `opens`, `lastOpenedAt` e `openDays`. Isso conta uma vez por carregamento.
- **Visita:** começa quando a aba de um link fica ativa numa janela em foco. Termina quando a pessoa troca de aba, a janela perde o foco, a aba fecha ou navega para uma URL que não casa. A visita em curso fica em `chrome.storage.session`, porque o service worker pode ser encerrado a qualquer momento.
- **Tempo:** cada visita soma min(duração, 30 min) a `activeMs`. O teto existe porque, sem a permissão `idle`, uma aba esquecida aberta contaria horas.
- **Pergunta:** se a visita termina por fechamento ou navegação e o `activeMs` acumulado é pelo menos max(2 min, 50% do esforço estimado), o service worker grava `askCompleteAt`.
- **Ponto no ícone:** a aba de um link pendente recebe `chrome.action.setBadgeText({ tabId, text: '•' })`, e as outras abas ficam sem texto.
- **Desligado:** com `learnFromBrowsing` desligado, os eventos retornam sem gravar nada e sem badge. Desligar limpa os `askCompleteAt` pendentes. O resto do histórico só sai com "Apagar dados de uso" (§7.4), e o texto da configuração diz isso.

### 8.2 Casamento de URL

A função `normalizeUrl(url): string | null` fica em `src/lib/url-match.ts` e é usada pelo service worker e pelo popup:

- aceita só `http:`, `https:` e `file:`;
- no host, usa minúsculas e remove o `www.` inicial;
- remove o `#fragmento` e a barra final do caminho, exceto na raiz;
- remove os parâmetros `utm_*`, `fbclid`, `gclid`, `si`, `ref` e `ref_src`, e remove `s` só em `x.com` e `twitter.com`;
- ordena os parâmetros que sobrarem;
- no YouTube, `youtube.com/watch?v=ID&t=…` e `youtu.be/ID` viram `youtube.com/watch?v=ID`.

O mapa URL normalizada → ids fica em memória e é refeito quando `links` muda e quando o service worker acorda. Se dois links casarem com a mesma URL, os dois recebem o sinal.

## 9. Privacidade e loja

- **Permissões:** nenhuma nova. `tabs` já existe; `storage.session` faz parte de `storage`; o badge não pede permissão.
- **Abas anônimas:** nunca são lidas. Uma URL que não está salva é comparada em memória e descartada. Nada sai do aparelho.
- **Política de privacidade:** `docs/privacy-policy.md` e `docs/privacy-policy.pt.md` ganham a seção "Atividade dos links salvos" (fase 2), explicando o que é gravado, onde fica e como desligar e apagar.
- **Loja:** o formulário de práticas de privacidade da Chrome Web Store precisa ser revisto antes de publicar a fase 2. Isso é tarefa de publicação, não do código.

## 10. Medição

- `recoStats` alimenta o Progresso do Foco e é a régua do produto.
- A **aceitação** da semana é `acted` / `shown`. Ela mede se o que a faixa mostra é aberto ou concluído, por qualquer caminho (faixa, Foco, quadro, popup ou, na fase 2, navegação).
- A decisão de levar IA do Chrome para a recomendação só é tomada depois de 2 semanas de uso, comparando essa aceitação com a de uma variante. Nada disso sai do aparelho.

## 11. Testes e validação

- **Motor (unitário, puro):**
  - quais links são elegíveis;
  - a ordem da coluna como próximo link;
  - cada vaga e o preenchimento de uma vaga vazia;
  - a regra dos 3 dias e a estabilidade no mesmo dia;
  - as quatro regras de triagem;
  - a montagem da sessão para 15, 30 e 60 min, incluindo o "passa do tempo";
  - a referência por coleção e a exceção `link.reference === false`;
  - o adiado voltando na data;
  - o tipo `chat`.
- **Storage:**
  - concluir, desfazer, adiar, "ainda vale", referência (link e coleção) e foco, todos sob `withDataLock`;
  - `recordShown` com no máximo uma gravação por link por dia, e `recordOpen` somando `acted` só quando o link tinha `shownDays`;
  - o limite de 10 dias nas listas e de 12 semanas em `recoStats`;
  - no import e export, os campos novos válidos e inválidos, o export antigo aceito e `activity` fora do export.
- **Integração:**
  - o quadro, as contagens e o popup sem os concluídos;
  - a busca com o selo;
  - o link concluído numa coleção apagada indo para o Inbox.
- **Componentes:**
  - a faixa: vagas, ações, recolher e pergunta da fase 2;
  - o Foco: sessão, triagem com teclas, frentes e desfazer nos concluídos;
  - o ✓ no card;
  - o aviso no popup.
- **Fase 2:**
  - tabela de casos de `normalizeUrl`;
  - contabilidade de visita com relógio falso e eventos simulados de `chrome.tabs` e `chrome.windows`;
  - o teto de 30 min;
  - o limiar da pergunta;
  - abas anônimas ignoradas;
  - o comportamento com o aprendizado desligado;
  - o badge.
- **Ensaio com dados reais:** um teste de avaliação em `src/test/eval/`, que só roda com `TABALA_EVAL_DIR`, como o da busca. Ele aplica o motor ao export real que fica em `.eval/`, fora do git, e imprime a faixa, a triagem, as frentes e as sessões de 15, 30 e 60 min. Ele roda antes da interface, para que a pessoa revise os pesos com os próprios dados.
- **Portões de cada fase:**
  - `make test` verde;
  - nenhum erro novo em `make lint`;
  - `make build` com no máximo 500 KB;
  - teste manual no Chrome.

## 12. Riscos

| Risco | Mitigação |
|---|---|
| A faixa vira ruído e é ignorada | Os 3 dias sem ação mandam o link para a triagem; a faixa pode ser recolhida ou desligada; `recoStats` mostra se isso acontece |
| 79 links parados lotam a triagem no começo | A sessão pede só 5 por vez (~1 min); o atalho mostra a contagem sem bloquear a faixa |
| Tempo ativo inflado por aba esquecida | Teto de 30 min por visita; a pergunta "concluído?" confirma antes de concluir |
| Service worker encerrado no meio de uma visita | A visita em curso fica em `storage.session`; se o navegador fechar, perde-se só essa visita |
| Um link concluído some de onde a pessoa procura | Ele continua na busca com selo e no histórico com desfazer |
| O bundle cresce | O portão de 500 KB vale em cada fase; o build hoje tem 400 KB |
| Datas da reconstrução distorcem a idade | A triagem pede uma decisão explícita e grava `keptAt`, e dali em diante a idade volta a valer |
