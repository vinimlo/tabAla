# Tabala

> Extensão de navegador minimalista para organização temporária de links.

## Visão

Uma "sala de espera" para links — não é bookmark permanente, é um buffer organizado para processar depois sem poluir o navegador.

## Problema

- Acúmulo de abas abertas gera ansiedade e perda de foco
- Soluções existentes são pagas ou limitadas
- Bookmarks tradicionais viram cemitério de links

## Solução

Extensão leve que permite salvar abas em coleções temporárias, com experiência clutter-free focada em estudantes e profissionais de tecnologia.

## Princípios

- Minimalismo radical na interface
- Zero fricção para salvar
- Organização sem burocracia
- Sensação de alívio e controle

---

## Status do Projeto

**Fase atual:** 0 - Fundação (em andamento)

### Concluído
- [x] Repositório GitHub criado
- [x] Licença Apache 2.0 configurada
- [x] Documentação base (MVP, CLAUDE.md, README.md)
- [x] Integração Jira configurada (Atena + Hefesto)
- [x] Code review configurado (CodeRabbit)
- [x] `.gitignore` configurado

### Pendente (Fase 0)
- [ ] Criar `package.json` com dependências
- [ ] Configurar TypeScript (`tsconfig.json`)
- [ ] Configurar Vite (`vite.config.ts`)
- [ ] Criar `src/manifest.json` (Manifest V3)
- [ ] Estrutura `src/` (popup, background, lib)
- [ ] Ícones placeholder em `public/`
- [ ] "Hello TabAla" funcionando no popup

---

## MVP - Escopo

### Funcionalidades incluídas

- Salvar aba atual com um clique
- Criar e nomear coleções
- Visualizar links organizados por coleção
- Reabrir link salvo
- Remover link da lista
- Coleção padrão "Inbox" para links sem categoria
- Persistência local no navegador
- Toda a aplicação deve ser dockerizada e contar com comandos make para facilitar interações

### Fora do MVP (futuro)

- Compartilhamento de coleções
- Sincronização entre dispositivos
- Busca por links
- Sistema de tags
- Sugestões com IA

---

## Fases de Desenvolvimento

### Fase 0: Fundação

**Objetivo:** Estrutura base funcionando

**Tarefas:**
- [x] Criar repositório no GitHub
- [x] Configurar licença Apache 2.0
- [x] Configurar `.gitignore`
- [ ] Configurar `package.json`:
  - Svelte, TypeScript, Vite
  - @crxjs/vite-plugin (para extensões Chrome)
  - Vitest para testes
- [ ] Configurar `tsconfig.json`
- [ ] Configurar `vite.config.ts`
- [ ] Criar estrutura de pastas:
  - `src/popup/`
  - `src/background/`
  - `src/lib/`
  - `public/icons/`
- [ ] Criar `src/manifest.json` (Manifest V3)
- [ ] Build pipeline funcionando
- [ ] Extensão carregando no Chrome (modo dev)
- [ ] Criar `Dockerfile` (ambiente de desenvolvimento Node.js)
- [ ] Criar `docker-compose.yml` (orquestração)
- [ ] Criar `Makefile` com targets: `dev`, `build`, `test`, `lint`, `shell`
- [ ] Configurar ESLint (`.eslintrc.json`)
- [ ] Configurar Vitest (`vitest.config.ts`)
- [ ] Atualizar `.gitignore` para Node.js (node_modules, dist, .env)

**Entregável:** "Hello TabAla" aparecendo no popup

**Verificação:**
- [ ] `make build` executa sem erros e gera output em `dist/`
- [ ] `make dev` inicia watch mode no container
- [ ] `make lint` passa sem erros
- [ ] `make test` executa (mesmo sem testes ainda)
- [ ] Extensão carrega em `chrome://extensions` (modo dev)
- [ ] Popup exibe "Hello TabAla"

---

### Fase 1: Fluxo principal

**Objetivo:** Salvar e recuperar links funciona

- Botão para salvar aba atual
- Armazenamento local dos links
- Lista de links salvos no popup
- Ação de abrir link ✓
- Ação de remover link

**Entregável:** Ciclo completo salvar → visualizar → abrir → remover

**Verificação:**
- [ ] Salvar aba atual adiciona link à lista
- [ ] Lista exibe links salvos com título e favicon
- [x] Clicar em link abre em nova aba (TAB-26 implementado)
- [ ] Botão remover deleta link
- [ ] Dados persistem após fechar/abrir popup

---

### Fase 2: Coleções

**Objetivo:** Organização por categorias

- Criar nova coleção
- Salvar link em coleção específica
- Visualização filtrada por coleção
- Coleção "Inbox" como padrão
- Renomear coleção
- Excluir coleção

**Entregável:** Organização básica funcional

---

### Fase 3: Refinamento

**Objetivo:** Experiência polida e minimalista

- Interface visual minimalista
- Exibição de favicon dos links
- Contador de links por coleção
- Estados vazios bem resolvidos
- Atalho de teclado para salvar

**Entregável:** MVP com UX refinada

---

### Fase 4: Lançamento

**Objetivo:** Disponibilizar publicamente

- Documentação no README
- Screenshots para divulgação
- Publicação na Chrome Web Store

**Entregável:** Extensão disponível para instalação

---

## Especificações Técnicas

- **Plataforma:** Chrome (Manifest V3)
- **Framework:** Svelte
- **Armazenamento:** Local (chrome.storage)
- **Licença:** Apache 2.0
- **Repositório:** GitHub (público)

---

## Entidades de Dados

### Link
```typescript
interface Link {
  id: string;           // UUID único
  url: string;          // URL completa
  title: string;        // Título da página
  favicon?: string;     // URL do favicon (opcional)
  collectionId: string; // ID da coleção
  createdAt: number;    // Timestamp de criação
}
```

### Collection
```typescript
interface Collection {
  id: string;      // UUID único
  name: string;    // Nome da coleção
  order: number;   // Ordem de exibição
}
```

---

## Regras de Negócio

- **Inbox obrigatória:** Coleção "Inbox" sempre existe e não pode ser excluída
- **Links órfãos:** Quando uma coleção é deletada, seus links vão para Inbox
- **Múltiplas cópias:** Mesmo URL pode existir em coleções diferentes
- **Ordenação:** Links exibidos por data de criação (mais recentes primeiro)
- **Armazenamento:** Dados persistidos em `chrome.storage.local` (limite ~5MB)

---

## Estrutura de Arquivos

```
tabAla/
├── src/
│   ├── popup/              # UI do popup (Svelte)
│   │   ├── App.svelte      # Componente principal
│   │   ├── main.ts         # Entry point
│   │   ├── components/     # Componentes reutilizáveis
│   │   └── stores/         # Svelte stores
│   ├── background/         # Service worker
│   │   └── index.ts
│   ├── lib/                # Lógica compartilhada
│   │   ├── storage.ts      # Wrapper chrome.storage
│   │   └── types.ts        # Tipos TypeScript
│   └── manifest.json       # Manifest V3
├── public/                 # Assets estáticos
│   └── icons/              # Ícones (16, 48, 128px)
├── tests/                  # Testes unitários (Vitest)
├── dist/                   # Build output (gitignore)
├── Dockerfile              # Imagem de desenvolvimento
├── docker-compose.yml      # Orquestração dos containers
├── Makefile                # Comandos de automação
├── package.json
├── tsconfig.json
├── vite.config.ts
├── vitest.config.ts
└── .eslintrc.json
```

---

## Comandos de Desenvolvimento

Todos os comandos são executados via Docker através do Makefile:

```bash
make dev             # Inicia ambiente de desenvolvimento (watch mode)
make build           # Build de produção
make test            # Rodar testes
make lint            # Lint do código
make shell           # Abre shell no container

# Carregar extensão no Chrome
# 1. Acesse chrome://extensions
# 2. Ative "Modo desenvolvedor"
# 3. Clique "Carregar sem compactação"
# 4. Selecione a pasta dist/
```

> **Nota:** Não execute comandos npm diretamente. Use sempre os comandos make.

---

## Público-alvo

- Estudantes universitários
- Profissionais de tecnologia
- Autodidatas
- Qualquer pessoa que acumula abas para "ver depois"
