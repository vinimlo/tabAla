# TabAla

[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](./LICENSE)
[![Chrome Extension](https://img.shields.io/badge/Platform-Chrome%20Extension-green.svg)](https://developer.chrome.com/docs/extensions/)
[![Manifest](https://img.shields.io/badge/Manifest-V3-orange.svg)](https://developer.chrome.com/docs/extensions/mv3/intro/)

> Uma "sala de espera" para links — salve abas para processar depois sem poluir o navegador.

## Sobre o Projeto

### O Problema

- Dezenas de abas abertas geram ansiedade e perda de foco
- Bookmarks tradicionais viram cemitério de links esquecidos
- Soluções existentes são pagas ou complexas demais

### A Solução

Extensão leve que permite salvar abas em coleções temporárias, com experiência clutter-free focada em produtividade.

### Princípios de Design

- **Minimalista**: Interface limpa, sem distrações
- **Temporário por natureza**: Links são para processar, não acumular
- **Local-first**: Dados persistem apenas no navegador, sem necessidade de conta

## Features

**MVP Atual:**
- Salvar aba atual com um clique
- Organizar links em coleções
- Coleção "Inbox" para links sem categoria
- Abrir link salvo em nova aba
- Feedback visual durante ações (loading spinner)
- Tratamento de erros com mensagens amigáveis
- Remover links facilmente
- Dados persistem localmente

## Screenshots

> Screenshots serão adicionados em breve.

## Começando

### Pré-requisitos

- [Docker](https://docs.docker.com/get-docker/) 20.10+
- [Docker Compose](https://docs.docker.com/compose/install/)
- [Make](https://www.gnu.org/software/make/)
- Google Chrome ou Chromium

### Instalação do Ambiente de Desenvolvimento

```bash
# Clone o repositório
git clone https://github.com/vinimlo/tabAla.git
cd tabAla

# Inicie o ambiente de desenvolvimento
make dev
```

### Instalando a Extensão no Chrome

Siga este passo a passo para carregar a extensão no navegador:

#### 1. Gerar o build da extensão

```bash
make build
```

Aguarde a mensagem de sucesso. A extensão será gerada na pasta `dist/`.

#### 2. Acessar a página de extensões do Chrome

- Abra o Google Chrome
- Digite na barra de endereço: `chrome://extensions`
- Pressione Enter

#### 3. Ativar o Modo Desenvolvedor

```
┌─────────────────────────────────────────────────────────────────────┐
│ chrome://extensions                                                 │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Extensões                          [Modo do desenvolvedor] ○ → ●  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

- No canto superior direito da página, localize o toggle "Modo do desenvolvedor"
- Clique para ativar (o toggle deve ficar azul/ativo)

#### 4. Carregar a extensão

Após ativar o modo desenvolvedor, novos botões aparecerão:

```
┌─────────────────────────────────────────────────────────────────────┐
│ [Carregar sem compactação] [Fazer pacote de extensão] [Atualizar]  │
└─────────────────────────────────────────────────────────────────────┘
```

- Clique em **"Carregar sem compactação"** (ou "Load unpacked" em inglês)
- Na janela de seleção de pasta, navegue até a pasta do projeto TabAla
- Selecione a pasta `dist/` (dentro do projeto)
- Clique em "Selecionar pasta" (ou "Select Folder")

#### 5. Verificar a instalação

A extensão "TabAla" deve aparecer na lista de extensões:

```
┌─────────────────────────────────────────────────────────────────────┐
│ TabAla                                                     [🔄] [X] │
│ ID: abc123...                                                       │
│ Origem: Carregada sem compactação de /caminho/para/tabAla/dist      │
└─────────────────────────────────────────────────────────────────────┘
```

Se o ícone não aparecer na barra de ferramentas:
- Clique no ícone de extensões (quebra-cabeça 🧩) na barra do Chrome
- Localize "TabAla" na lista
- Clique no ícone de fixar (📌) para manter o ícone visível

#### 6. Recarregar após mudanças

Após fazer alterações no código e rodar `make build` novamente:

1. Volte para `chrome://extensions`
2. Localize o card da extensão TabAla
3. Clique no ícone de reload (🔄) no canto do card

**Dica:** Durante o desenvolvimento com `make dev`, o build é atualizado automaticamente. Você só precisa clicar no reload da extensão para ver as mudanças.

## Comandos de Desenvolvimento

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

## Arquitetura

### Estrutura de Pastas

```
tabAla/
├── src/
│   ├── popup/           # UI do popup (Svelte)
│   │   ├── App.svelte
│   │   ├── components/
│   │   └── stores/
│   ├── background/      # Service worker
│   ├── lib/             # Lógica compartilhada
│   └── manifest.json    # Manifest V3
├── public/              # Assets estáticos (icons)
├── tests/               # Testes unitários
├── docs/                # Documentação
├── dist/                # Build output (gitignore)
├── Dockerfile           # Imagem de desenvolvimento
├── docker-compose.yml   # Orquestração dos containers
└── Makefile             # Comandos de automação
```

### Fluxo de Dados

```
[Usuário] → [Popup/Atalho] → [Storage Layer] → [chrome.storage.local]
                                    ↓
                              [State Store (Svelte)]
                                    ↓
                              [UI atualizada]
```

### Entidades Principais

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

## Stack Tecnológica

| Tecnologia | Uso |
|------------|-----|
| [Svelte](https://svelte.dev/) | UI reativa e leve |
| [TypeScript](https://www.typescriptlang.org/) | Tipagem estática |
| [Vite](https://vitejs.dev/) | Build rápido |
| [Vitest](https://vitest.dev/) | Testes unitários |
| [Docker](https://www.docker.com/) | Ambiente de desenvolvimento |
| [Chrome Extension Manifest V3](https://developer.chrome.com/docs/extensions/mv3/) | Plataforma |

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

## Contribuindo

Contribuições são bem-vindas! Veja o [docs/mvp.md](./docs/mvp.md) para entender o escopo atual.

### Padrões de Código

- Componentes Svelte: PascalCase (`LinkItem.svelte`)
- Funções/variáveis: camelCase
- Constantes: UPPER_SNAKE_CASE
- Tipos/Interfaces: PascalCase
- Preferir `const` sobre `let`
- Usar async/await (nunca callbacks para storage)

### Fluxo de Contribuição

1. Fork o projeto
2. Crie uma branch (`git checkout -b feature/nova-feature`)
3. Faça suas alterações
4. Execute os testes (`make test`)
5. Valide o código (`make lint`)
6. Commit suas mudanças (`git commit -m 'Adiciona nova feature'`)
7. Push para a branch (`git push origin feature/nova-feature`)
8. Abra um Pull Request

## Roadmap

Veja [docs/mvp.md](./docs/mvp.md) para o escopo completo do MVP e funcionalidades planejadas.

## Licença

Este projeto está licenciado sob a [Apache License 2.0](./LICENSE).

## Links Úteis

- [Chrome Extensions Docs](https://developer.chrome.com/docs/extensions/)
- [Svelte Docs](https://svelte.dev/docs)
- [docs/mvp.md](./docs/mvp.md) — Especificação do MVP
- [docs/development.md](./docs/development.md) — Guia de build e troubleshooting
- [Issues](https://github.com/vinimlo/tabAla/issues) — Reportar bugs ou sugerir features
