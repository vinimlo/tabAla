# Contribuindo para o TabAla

Obrigado pelo interesse em contribuir! Este guia contém tudo que você precisa para começar.

## Pré-requisitos

- [Docker](https://docs.docker.com/get-docker/) 20.10+
- [Docker Compose](https://docs.docker.com/compose/install/)
- [Make](https://www.gnu.org/software/make/)
- Google Chrome ou Chromium

## Setup de Desenvolvimento

```bash
# Clone o repositório
git clone https://github.com/vinimlo/tabAla.git
cd tabAla

# Inicie o ambiente de desenvolvimento
make dev
```

### Comandos Disponíveis

Todos os comandos são executados via Docker através do Makefile:

| Comando | Descrição |
|---------|-----------|
| `make help` | Lista todos os comandos disponíveis |
| `make dev` | Inicia servidor de desenvolvimento (modo interativo) |
| `make dev-detached` | Inicia servidor de desenvolvimento (background) |
| `make build` | Compila a extensão para produção |
| `make test` | Executa suite de testes com Vitest |
| `make test-watch` | Executa testes em modo watch |
| `make test-ui` | Abre interface visual do Vitest |
| `make test-coverage` | Gera relatório de cobertura de testes |
| `make lint` | Executa ESLint para validação de código |
| `make lint-fix` | Executa ESLint com auto-correção |
| `make shell` | Abre shell interativo no container |
| `make lockfile` | Regenera package-lock.json |
| `make clean` | Remove artefatos de build (dist/) |
| `make stop` | Para todos os containers em execução |

> **Nota:** Não execute comandos npm diretamente. Use sempre os comandos make para garantir consistência de ambiente.

### Carregando a Extensão no Chrome

1. Execute `make build`
2. Acesse `chrome://extensions`
3. Ative "Modo desenvolvedor" no canto superior direito
4. Clique em "Carregar sem compactação"
5. Selecione a pasta `dist/`

Para recarregar após mudanças: clique no ícone de reload (🔄) no card da extensão.

## Arquitetura

### Stack Tecnológica

| Tecnologia | Uso |
|------------|-----|
| [Svelte](https://svelte.dev/) | UI reativa e leve |
| [TypeScript](https://www.typescriptlang.org/) | Tipagem estática |
| [Vite](https://vitejs.dev/) | Build rápido |
| [Vitest](https://vitest.dev/) | Testes unitários |
| [Docker](https://www.docker.com/) | Ambiente de desenvolvimento |
| [Chrome Extension Manifest V3](https://developer.chrome.com/docs/extensions/mv3/) | Plataforma |

### Estrutura de Pastas

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

### Regras de Negócio

- **Inbox**: Coleção padrão que sempre existe e não pode ser excluída
- **Links órfãos**: Links de coleções excluídas vão para Inbox
- **Unicidade**: Mesmo URL pode existir em múltiplas coleções
- **Ordenação**: Links ordenados por data (mais recente primeiro)

## Convenções de Código

- Componentes Svelte: PascalCase (`LinkItem.svelte`)
- Funções/variáveis: camelCase
- Constantes: UPPER_SNAKE_CASE
- Tipos/Interfaces: PascalCase
- Preferir `const` sobre `let`
- Usar async/await (nunca callbacks para storage)

### Anti-Patterns

- **Não usar** APIs síncronas do chrome.storage (deprecated)
- **Não armazenar** dados sensíveis (senhas, tokens)
- **Não usar** Manifest V2 - sempre V3
- **Evitar** bundle grande - manter extensão leve (<500KB)
- **Não bloquear** UI durante operações de storage
- **Nunca** hardcodar credenciais ou API keys

## Testes

```bash
# Executar todos os testes
make test

# Executar em modo watch (rerun ao salvar)
make test-watch

# Abrir interface visual do Vitest
make test-ui

# Gerar relatório de cobertura
make test-coverage
```

## Troubleshooting

### Container não inicia

- Verifique se a porta 5173 não está em uso: `lsof -i :5173`
- Confirme que o Docker está rodando: `docker info`

### Hot-reload não funciona

- Certifique-se de que o volume está montado corretamente
- Em macOS/Windows, habilite file sharing para o diretório do projeto
- Verifique os logs: `docker-compose logs -f`

### Erros de permissão

- O container executa como usuário `node` (uid 1000)
- Se necessário, ajuste permissões: `chmod -R 755 .`

### Extensão não aparece no Chrome

- Verifique se o `make build` executou sem erros
- Confirme que a pasta `dist/` existe e contém o `manifest.json`
- Tente remover a extensão e carregar novamente

### Mudanças não aparecem na extensão

- Rode `make build` para gerar o novo bundle
- Em `chrome://extensions`, clique no ícone de reload (🔄) da extensão
- Se persistir, remova a extensão e carregue novamente

## Fluxo de Contribuição

1. Fork o projeto
2. Crie uma branch (`git checkout -b feature/nova-feature`)
3. Faça suas alterações
4. Execute os testes (`make test`)
5. Valide o código (`make lint`)
6. Commit suas mudanças (`git commit -m 'Adiciona nova feature'`)
7. Push para a branch (`git push origin feature/nova-feature`)
8. Abra um Pull Request

## Links Úteis

- [Chrome Extensions Docs](https://developer.chrome.com/docs/extensions/)
- [Svelte Docs](https://svelte.dev/docs)
- [docs/mvp.md](./docs/mvp.md) - Especificação completa do MVP
