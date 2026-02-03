# TabAla Newtab Dashboard - Design Document

> Substituição da nova aba do Chrome por um dashboard visual Kanban para gerenciar links salvos.

## Visão Geral

### Objetivo

Transformar a nova aba do Chrome em um dashboard visual estilo Kanban, permitindo visualização simultânea de todas as coleções e seus links, com drag & drop para organização.

### Duas Interfaces, Um Sistema

| Interface | Propósito | Quando usar |
|-----------|-----------|-------------|
| **Newtab** | Dashboard visual, organização, "big picture" | Abrir nova aba, revisar/organizar links |
| **Popup** | Ações rápidas, salvar link atual | Durante navegação, captura rápida |

### Comportamento Adaptativo

```
Primeiro acesso → Pergunta: "Substituir nova aba?"
       ↓                              ↓
     [SIM]                          [NÃO]
       ↓                              ↓
Newtab = Dashboard            Popup = Interface completa
Popup = Mini-dashboard         (comportamento atual)
       ↓
  Configurável depois em Settings
```

---

## Layout do Newtab

### Estrutura da Tela

```
┌─────────────────────────────────────────────────────────────────┐
│  🔍 Buscar links...                    [+ Nova Coleção] [⚙️]   │  ← Quick Actions Bar
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌───────┐│
│  │  INBOX  │  │ Trabalho│  │ Estudos │  │ Compras │  │   +   ││
│  │─────────│  │─────────│  │─────────│  │─────────│  │ Nova  ││
│  │ 🌐 link │  │ 🌐 link │  │ 🌐 link │  │ 🌐 link │  │Coluna ││
│  │ 🌐 link │  │ 🌐 link │  │ 🌐 link │  │         │  │       ││
│  │ 🌐 link │  │ 🌐 link │  │         │  │         │  │       ││
│  │ 🌐 link │  │         │  │         │  │         │  │       ││
│  │   ...   │  │         │  │         │  │         │  │       ││
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘  └───────┘│
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│  📊 42 links  •  5 coleções  •  Último salvo: há 2 min         │  ← Status Bar
└─────────────────────────────────────────────────────────────────┘
```

### Componentes Principais

| Componente | Descrição |
|------------|-----------|
| **Quick Actions Bar** | Busca global + botão nova coleção + settings |
| **Kanban Board** | Área central com colunas arrastáveis |
| **Coluna/Coleção** | Header com nome + lista de links + scroll interno |
| **Card de Link** | Favicon + título + domínio |
| **Botão "+ Nova Coluna"** | Última posição, cria nova coleção |
| **Status Bar** | Estatísticas (total links, coleções, último salvo) |

### Responsividade

- **Desktop (>1200px)**: 4-6 colunas visíveis
- **Tablet (768-1200px)**: 3-4 colunas, scroll horizontal
- **Menor (<768px)**: 2 colunas ou lista vertical

### Tema Visual

Herda do popup atual:
- Background: #0D0D0F (dark)
- Accent: #FF6B4A (coral)
- Typography: Satoshi/SF Pro Display
- Motion: Ease-out curves

---

## Interações

### Drag & Drop

| Ação | Comportamento |
|------|---------------|
| **Arrastar link** | Solta em outra coluna → move para essa coleção |
| **Arrastar coluna** | Reordena posição das coleções |
| **Visual feedback** | Coluna destino destacada, placeholder mostra posição |

### Ações nos Links

**Hover** (visível):
- Ícone abrir (abre em nova aba)
- Ícone deletar (com confirmação)

**Right-click** (menu contextual):
- Abrir link
- Abrir em nova janela
- Copiar URL
- Mover para → [submenu com coleções]
- Deletar

### Ações nas Colunas

**Header da coluna**:
- Clique no nome → renomear inline
- Drag handle → arrastar coluna
- Menu (⋮) → Abrir todos, Deletar coleção

**Regra especial**: Inbox não pode ser deletado nem renomeado

### Atalhos de Teclado

| Atalho | Ação |
|--------|------|
| `/` ou `Ctrl+K` | Focar na busca |
| `Esc` | Fechar modal/menu, limpar busca |
| `N` | Nova coleção |

---

## Popup Adaptativo

### Modo Completo (newtab desativado)

Comportamento atual, sem mudanças.

### Modo Mini-Dashboard (newtab ativado)

```
┌─────────────────────────────────┐
│  TabAla                    [⚙️] │
├─────────────────────────────────┤
│  ┌─────────────────────────────┐│
│  │ 💾 Salvar aba atual         ││
│  │    [Selecionar coleção ▼]   ││
│  └─────────────────────────────┘│
├─────────────────────────────────┤
│  📂 Inbox (12)      ▸          ││
│  📂 Trabalho (5)    ▸          ││
│  📂 Estudos (8)     ▸          ││
├─────────────────────────────────┤
│  [🔲 Abrir Dashboard]          ││
└─────────────────────────────────┘
```

| Elemento | Ação |
|----------|------|
| **Salvar aba** | Salva link na coleção selecionada |
| **Coleção colapsada** | Clique → expande mostrando últimos 3 links |
| **Seta (▸)** | Abre newtab já filtrado nessa coleção |
| **Abrir Dashboard** | Abre nova aba com newtab completo |

### Fluxo de Onboarding

```
Primeira instalação → Popup abre com modal:
"Quer usar TabAla como sua nova aba?"
    ↓
[Sim, substituir]     [Não, só o popup]
    ↓                       ↓
Ativa newtab +         Mantém popup completo
popup mini-dashboard   (comportamento atual)
```

---

## Busca e Estatísticas

### Busca Global

- Filtra links em tempo real (título e URL)
- Mínimo 2 caracteres
- Mostra só colunas com matches
- Exibe contador de resultados

### Status Bar

```typescript
interface Stats {
  totalLinks: number;
  totalCollections: number;
  lastSavedAt: number | null;
}
```

**Formatação do tempo:**
| Intervalo | Exibição |
|-----------|----------|
| < 1 min | "agora" |
| < 60 min | "há X min" |
| < 24h | "há X horas" |
| >= 24h | "há X dias" |

---

## Implementação Técnica

### Mudanças no Manifest V3

```json
{
  "chrome_url_overrides": {
    "newtab": "src/newtab/index.html"
  }
}
```

### Nova Estrutura de Pastas

```
src/
├── popup/                    # Existente (adaptado)
│   ├── App.svelte           # Detecta modo e renderiza adequado
│   ├── components/
│   │   ├── MiniDashboard.svelte    # NOVO
│   │   └── ... (existentes)
│   └── stores/
│
├── newtab/                   # NOVO
│   ├── index.html
│   ├── main.ts
│   ├── App.svelte
│   └── components/
│       ├── KanbanBoard.svelte
│       ├── Column.svelte
│       ├── LinkCard.svelte
│       ├── QuickActionsBar.svelte
│       ├── SearchInput.svelte
│       ├── StatusBar.svelte
│       └── ContextMenu.svelte
│
├── lib/                      # Compartilhado (expandido)
│   ├── storage.ts           # + settings
│   ├── types.ts             # + Settings interface
│   ├── stores/              # NOVO: stores compartilhadas
│   │   ├── links.ts
│   │   ├── collections.ts
│   │   └── settings.ts
│   └── ...
│
└── shared/                   # NOVO: componentes compartilhados
    └── components/
        ├── ConfirmDialog.svelte
        └── Toast.svelte
```

### Novos Tipos

```typescript
interface Settings {
  newtabEnabled: boolean;
}
```

### Novas Funções no Storage

```typescript
moveLink(linkId: string, toCollectionId: string): Promise<void>
updateCollectionOrder(collections: Collection[]): Promise<void>
getSettings(): Promise<Settings>
saveSettings(settings: Settings): Promise<void>
```

### Biblioteca de Drag & Drop

**svelte-dnd-action** (~8KB gzipped)
- Nativa para Svelte (usa actions)
- Touch support
- Keyboard drag built-in
- Bem mantida (1.5k+ stars)

```typescript
import { dndzone } from 'svelte-dnd-action';

// Arrastar links
<div use:dndzone={{ items: links, type: 'link' }}
     on:consider={handleSort}
     on:finalize={handleDrop}>

// Arrastar colunas
<div use:dndzone={{ items: collections, type: 'column' }}
     on:finalize={handleReorder}>
```

---

## Verificação

### Testes Manuais

1. `make build` → carregar extensão no Chrome
2. Abrir nova aba → deve mostrar dashboard Kanban
3. Testar drag & drop de links entre colunas
4. Testar reordenação de colunas
5. Testar busca global
6. Testar popup em modo mini-dashboard
7. Desativar newtab nas settings → popup volta ao modo completo

### Testes Automatizados

| Área | Testes |
|------|--------|
| **storage.ts** | moveLink, updateCollectionOrder, settings |
| **stores** | Derived stores de stats, filtro de busca |
| **componentes** | Renderização do KanbanBoard, Column, LinkCard |
| **integração** | Fluxo completo: salvar → mover → deletar |

### Casos de Borda

- Coleção vazia → placeholder "Arraste links aqui"
- Muitos links → scroll interno na coluna
- Muitas coleções → scroll horizontal no board
- Busca sem resultados → "Nenhum link encontrado"
- Primeiro acesso → onboarding modal
- Links órfãos → vão para Inbox ao deletar coleção

---

## Resumo de Entregas

1. **Newtab Dashboard** - Interface Kanban em tela cheia
2. **Popup Mini-Dashboard** - Modo compacto quando newtab ativo
3. **Drag & Drop** - Links entre colunas + reordenação de colunas
4. **Busca Global** - Filtro em tempo real
5. **Estatísticas** - Status bar com contadores
6. **Settings** - Toggle para ativar/desativar newtab
7. **Onboarding** - Modal de primeira execução
