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

## Desenvolvimento com Docker

O projeto utiliza Docker para garantir ambiente de desenvolvimento consistente.

### Requisitos

- Docker 20.10+
- Docker Compose (opcional, para orquestração)

### Build e Execução

```bash
# Build da imagem
docker build -t tabala-dev .

# Executar container com hot-reload
docker run -p 5173:5173 -v $(pwd):/app -v /app/node_modules tabala-dev

# Acessar: http://localhost:5173
```

### Comandos Make (recomendado)

```bash
make dev      # Build + dev server com hot-reload
make build    # Build de produção
make test     # Executar testes
make lint     # Lint + type check
make shell    # Shell interativo no container
```

### Verificar Status do Container

```bash
docker ps                    # Ver containers rodando
docker logs <container_id>   # Ver logs do Vite
docker inspect --format='{{.State.Health.Status}}' <container_id>  # Status do healthcheck
```

### Troubleshooting

**Container não inicia:**
- Verifique se a porta 5173 não está em uso: `lsof -i :5173`
- Confirme que o Docker está rodando: `docker info`

**Hot-reload não funciona:**
- Certifique-se de que o volume está montado corretamente
- Em macOS/Windows, habilite file sharing para o diretório do projeto

**Erros de permissão:**
- O container executa como usuário `node` (uid 1000)
- Se necessário, ajuste permissões: `chmod -R 755 .`

## Contribuindo

Contribuições são bem-vindas! Veja o [docs/mvp.md](./docs/mvp.md) para entender o escopo atual.

1. Fork o projeto
2. Crie uma branch (`git checkout -b feature/nova-feature`)
3. Commit suas mudanças (`git commit -m 'Adiciona nova feature'`)
4. Push para a branch (`git push origin feature/nova-feature`)
5. Abra um Pull Request

## Licença

[Apache 2.0](./LICENSE)
