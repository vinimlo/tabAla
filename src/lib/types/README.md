# Tipos TypeScript

Esta pasta contém definições de tipos TypeScript específicos.

## Propósito

Armazena interfaces, tipos e enums que são específicos de domínios ou funcionalidades.

## Convenções

- **Nomenclatura**: PascalCase para interfaces e types (ex: `Link`, `Collection`)
- **Arquivos**: Agrupar tipos relacionados no mesmo arquivo
- **Documentação**: Usar JSDoc para documentar interfaces principais

## Nota

Os tipos principais (`Link`, `Collection`) estão definidos em `src/lib/types.ts`.
Esta pasta é para tipos adicionais ou específicos de funcionalidades.

## Exemplos de uso

```
types/
├── api.ts        # Tipos de API
├── events.ts     # Tipos de eventos
└── storage.ts    # Tipos de storage
```
