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
- **Ordenação**: Links ordenados por data (mais recente primeiro)

## Comandos

Todos os comandos são executados via Docker através do Makefile:

```bash
make dev             # Build com watch mode
make build           # Build de produção
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
- **Evitar** bundle grande - manter extensão leve (<500KB)
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
