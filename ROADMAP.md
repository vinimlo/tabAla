# Product Roadmap

> Last updated: 2026-02-02 by atena

## Milestones

### [M1] Sprint M1
**Target:** TBD | **Status:** Planejado

**Epics:**
- Configurar ambiente de desenvolvimento dockerizado
  - Criar Dockerfile para ambiente Node.js
  - Criar docker-compose.yml para orquestração
  - Criar Makefile com targets dev, build, test, lint, shell
  - Atualizar .gitignore para Node.js
- Configurar base do projeto (package.json, TypeScript, Vite)
  - Criar package.json com Svelte, TypeScript, Vite e @crxjs/vite-plugin
  - Configurar tsconfig.json
  - Configurar vite.config.ts para extensão Chrome
  - Configurar ESLint (.eslintrc.json)
  - Configurar Vitest (vitest.config.ts)
- Criar estrutura de pastas e arquivos base
  - Criar estrutura src/ (popup, background, lib)
  - Criar src/manifest.json (Manifest V3)
  - Criar ícones placeholder em public/icons/
  - Criar popup Hello TabAla (App.svelte + main.ts)
  - Verificar build e carregamento da extensão no Chrome
- Implementar funcionalidade de salvar e listar links
  - Criar tipos TypeScript (Link, Collection) em lib/types.ts
  - Criar wrapper chrome.storage em lib/storage.ts
  - Implementar botão salvar aba atual no popup
  - Implementar lista de links salvos no popup
  - Implementar ação de abrir link em nova aba
  - Implementar ação de remover link
- Implementar sistema de coleções
  - Criar coleção Inbox padrão
  - Implementar criar nova coleção
  - Implementar salvar link em coleção específica
  - Implementar visualização filtrada por coleção
  - Implementar renomear coleção
  - Implementar excluir coleção (mover links para Inbox)
- Refinar interface e experiência do usuário
  - Implementar exibição de favicon dos links
  - Implementar contador de links por coleção

---
