# Componentes Svelte

Esta pasta contém componentes Svelte reutilizáveis da extensão TabAla.

## Propósito

Armazena componentes de UI que são compartilhados entre diferentes partes da aplicação.

## Convenções

- **Nomenclatura**: PascalCase (ex: `LinkItem.svelte`, `CollectionList.svelte`)
- **Estrutura**: Um arquivo `.svelte` por componente
- **TypeScript**: Usar `<script lang="ts">` em todos os componentes

## Exemplos de uso

```
components/
├── LinkItem.svelte      # Item individual de link
├── CollectionList.svelte # Lista de coleções
└── Button.svelte        # Botão reutilizável
```
