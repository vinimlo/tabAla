# TabAla

> Extensão de navegador minimalista para organização temporária de links - uma "sala de espera" para processar abas depois.

## Stack

- **Linguagem**: TypeScript
- **Framework**: Svelte
- **Plataforma**: Chrome Extension (Manifest V3)
- **Build**: Vite
- **Armazenamento**: chrome.storage.local
- **Testes**: Vitest

## Estrutura de Pastas

```
tabAla/
├── src/
│   ├── popup/           # UI do popup (Svelte)
│   │   ├── App.svelte
│   │   ├── components/
│   │   └── stores/
│   ├── background/      # Service worker
│   │   └── index.ts
│   ├── lib/             # Lógica compartilhada
│   │   ├── storage.ts   # Wrapper chrome.storage
│   │   └── types.ts     # Tipos TypeScript
│   └── manifest.json    # Manifest V3
├── public/              # Assets estáticos (icons)
├── tests/               # Testes unitários
├── docs/                # Documentação
│   └── mvp.md
├── dist/                # Build output (gitignore)
├── Dockerfile           # Imagem de desenvolvimento
├── docker-compose.yml   # Orquestração dos containers
└── Makefile             # Comandos de automação
```

## Arquitetura

### Componentes Principais

- **Popup**: Interface Svelte renderizada ao clicar no ícone da extensão
- **Service Worker**: Background script para comandos e atalhos
- **Storage Layer**: Abstração sobre chrome.storage.local

### Fluxo de Dados

```
[Usuário] → [Popup/Atalho] → [Storage Layer] → [chrome.storage.local]
                                    ↓
                              [State Store (Svelte)]
                                    ↓
                              [UI atualizada]
```

### Entidades

```typescript
interface Link {
  id: string;
  url: string;
  title: string;
  favicon?: string;
  collectionId: string;
  createdAt: number;
  order?: number;   // posição manual na coleção (arrastar)
  tags?: string[];   // assunto (opcional; o motor pontua, nada preenche por enquanto)
  completedAt?: number; // concluído: sai do quadro, fica em Foco › Concluídos
  snoozedUntil?: number; // adiado até o início deste dia
  keptAt?: number;   // "ainda vale" na triagem
  reference?: boolean; // referência; false = pendente numa coleção de referência
}

interface Collection {
  id: string;
  name: string;
  order: number;
}
```

## Regras de Negócio

- **Inbox**: Coleção padrão que sempre existe e não pode ser excluída
- **Links órfãos**: Links de coleções excluídas vão para Inbox
- **Unicidade**: Mesmo URL pode existir em múltiplas coleções
- **Ordenação**: posição manual na coleção (arrastar grava `order`); links sem posição, como os recém-salvos, ficam no topo por data. Mover sem arrastar (`moveLink`) tira a posição
- **Busca**: paleta ⌘K em todos os workspaces (src/newtab/components/CommandPalette.svelte sobre src/lib/search). Antes de digitar mostra Agora, abertos recentemente e ações; `>` lista só comandos (src/newtab/commands.ts); com um resultado selecionado dá para abrir, concluir (⌥↵), adiar, mover, mostrar no quadro e descartar. A busca por assunto traduz a consulta para o inglês com o Translator do Chrome (src/lib/ai/translator.ts)
- **Próximos passos e Foco**: motor puro em src/lib/recommend (frentes = coleções, próximo link pela ordem da coluna, vagas continuar/avançar/retomar, triagem, sessão). Um link feito é **concluído** (nunca "vencido"). Comportamento em `activity` e números em `recoStats`, chaves separadas de `links` e fora do export; botões chamam src/lib/stores/progress.ts. Fase 2: o service worker (src/background/activity.ts, visita em `storage.session`) registra aberturas por qualquer caminho, tempo ativo (teto de 30 min por visita) e a pergunta "concluído?"; casamento de URL em src/lib/url-match.ts. A seção da nova aba chama-se **Agora** (um cartão principal + Depois). A sessão de Foco iniciada fica em `focusSession` (src/lib/storage/session.ts) e é seguida em toda aba; expira em 12 h e sai com "Apagar dados de uso".
- **Interface**: tokens em src/shared/styles/tokens.css (cor por papel: coral = ação principal, verde = concluído, âmbar = triagem); fonte Instrument Sans local em public/fonts (recorte por scripts/fonts/subset-instrument-sans.sh); primitivas em src/shared/components/ui (Button, IconButton, Icon, Kbd, Menu, LinkTile, Segmented, ProgressRing). Cor literal em componente não passa em src/test/styles/literal-colors.test.ts. Para ver telas fora do Chrome: `make preview` (nunca `vite preview`/`vite dev`, que apagam o dist/)

## Comandos

Todos os comandos são executados via Docker através do Makefile:

```bash
make dev             # Build com watch mode
make build           # Build de produção
make preview         # Builda em .preview/ e serve as telas na porta 4173 (ver scripts/preview/README.md)
make test            # Rodar testes
make lint            # Lint + type check
make shell           # Abre shell no container

# Carregar extensão no Chrome
# 1. chrome://extensions
# 2. Ativar "Modo desenvolvedor"
# 3. "Carregar sem compactação" → pasta dist/
```

> **Nota:** Não execute comandos npm diretamente. Use sempre os comandos make.

## Anti-Patterns

- **Não usar** APIs síncronas do chrome.storage (deprecated)
- **Não armazenar** dados sensíveis (senhas, tokens)
- **Não usar** Manifest V2 - sempre V3
- **Evitar** bundle grande - manter extensão leve (<560KB; `du -sb dist` ≤ 573440)
- **Não bloquear** UI durante operações de storage
- **Nunca** hardcodar credenciais ou API keys

## Convenções de Código

- Componentes Svelte: PascalCase (`LinkItem.svelte`)
- Funções/variáveis: camelCase
- Constantes: UPPER_SNAKE_CASE
- Tipos/Interfaces: PascalCase
- Preferir `const` sobre `let`
- Usar async/await (nunca callbacks para storage)

## Referências

- [Chrome Extensions Docs](https://developer.chrome.com/docs/extensions/)
- [Svelte Docs](https://svelte.dev/docs)
- [docs/mvp.md](./docs/mvp.md) - Especificação completa do MVP
