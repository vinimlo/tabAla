# TabAla

> Uma "sala de espera" para links — salve abas para processar depois sem poluir o navegador.

## O Problema

- Dezenas de abas abertas geram ansiedade e perda de foco
- Bookmarks tradicionais viram cemitério de links esquecidos
- Soluções existentes são pagas ou complexas demais

## A Solução

Extensão leve que permite salvar abas em coleções temporárias, com experiência clutter-free focada em produtividade.

## Features

- Salvar aba atual com um clique
- Organizar links em coleções
- Coleção "Inbox" para links sem categoria
- Reabrir e remover links facilmente
- Dados persistem localmente (sem conta)

## Stack

- **Svelte** — UI reativa e leve
- **TypeScript** — Tipagem estática
- **Vite** — Build rápido
- **Chrome Extension Manifest V3**
- **Docker** — Ambiente de desenvolvimento containerizado

## Desenvolvimento com Docker

O projeto utiliza Docker para garantir consistência entre ambientes de desenvolvimento.

### Comandos Básicos

```bash
# Iniciar ambiente de desenvolvimento
docker-compose up

# Iniciar em background
docker-compose up -d

# Parar containers
docker-compose down

# Ver logs
docker-compose logs -f

# Abrir shell no container
docker-compose exec app sh
```

Após iniciar, acesse o Vite dev server em: http://localhost:5173

### Hot-Reload

O ambiente está configurado para hot-reload automático. Edite arquivos `.svelte` ou `.ts` e as mudanças serão refletidas instantaneamente no navegador.

## Contribuindo

Contribuições são bem-vindas! Veja o [docs/mvp.md](./docs/mvp.md) para entender o escopo atual.

1. Fork o projeto
2. Crie uma branch (`git checkout -b feature/nova-feature`)
3. Commit suas mudanças (`git commit -m 'Adiciona nova feature'`)
4. Push para a branch (`git push origin feature/nova-feature`)
5. Abra um Pull Request

## Licença

[Apache 2.0](./LICENSE)
