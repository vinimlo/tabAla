# TabAla - Guia de Desenvolvimento

Este documento descreve o processo completo de build e carregamento da extensão TabAla no Chrome.

## Requisitos

- Docker 20.10+
- Docker Compose v2+
- Make
- Google Chrome 88+

## Build da Extensão

### Comando de Build

```bash
make build
```

Este comando executa o build via Docker, garantindo consistência de ambiente. O Vite processa os arquivos TypeScript/Svelte e gera a extensão na pasta `dist/`.

### Saída Esperada

```
>>> Compilando extensão para produção...
vite v5.x.x building for production...
✓ 31 modules transformed.
dist/icons/icon-16.png                     0.08 kB
dist/icons/icon-48.png                     0.11 kB
dist/icons/icon-128.png                    0.26 kB
dist/service-worker-loader.js              0.05 kB
dist/src/popup/index.html                  0.40 kB
dist/manifest.json                         0.60 kB
dist/assets/index-xxxxx.css                0.17 kB
dist/assets/service-worker.ts-xxxxx.js     0.15 kB
dist/assets/index.html-xxxxx.js            5.80 kB
✓ built in xxxms
>>> Build concluído! Artefatos em dist/
```

### Estrutura do `dist/`

Após o build, a pasta `dist/` deve conter:

```
dist/
├── manifest.json              # Manifest V3 da extensão
├── service-worker-loader.js   # Loader do service worker
├── assets/
│   ├── index-xxxxx.css        # Estilos compilados
│   ├── index.html-xxxxx.js    # JavaScript do popup
│   └── service-worker.ts-xxxxx.js
├── icons/
│   ├── icon-16.png            # Ícone 16x16
│   ├── icon-48.png            # Ícone 48x48
│   └── icon-128.png           # Ícone 128x128
├── src/
│   └── popup/
│       └── index.html         # HTML do popup
└── .vite/
    └── manifest.json          # Manifest do Vite (interno)
```

## Carregando a Extensão no Chrome

### Passo a Passo

1. **Execute o build**
   ```bash
   make build
   ```

2. **Abra o Chrome e acesse a página de extensões**
   - Digite `chrome://extensions` na barra de endereços
   - Ou vá em Menu (⋮) → Mais ferramentas → Extensões

3. **Ative o Modo Desenvolvedor**
   - Toggle no canto superior direito da página

4. **Carregue a extensão**
   - Clique em "Carregar sem compactação" (ou "Load unpacked")
   - Navegue até a pasta `dist/` do projeto
   - Selecione a pasta e confirme

5. **Verifique o carregamento**
   - A extensão "TabAla" deve aparecer na lista
   - Status deve mostrar "Ativada"
   - Não deve haver erros vermelhos ou avisos críticos

6. **Teste o ícone**
   - O ícone TabAla deve aparecer na barra de ferramentas
   - Passe o mouse para ver o tooltip "TabAla"

7. **Teste o popup**
   - Clique no ícone da extensão
   - O popup deve abrir mostrando "Hello TabAla"

### Atualizando a Extensão

Após modificar o código:

```bash
# Rebuild
make build

# No Chrome:
# 1. Vá para chrome://extensions
# 2. Clique no botão de refresh (↻) no card da extensão TabAla
# 3. Ou clique em "Atualizar" no topo da página
```

Para desenvolvimento com hot-reload, use `make dev` ao invés de `make build`.

## Inspecionando a Extensão

### DevTools do Popup

1. Clique com o botão direito no popup aberto
2. Selecione "Inspecionar" (ou "Inspect")
3. O DevTools abrirá para o contexto do popup
4. Verifique a aba "Console" para erros

### DevTools do Service Worker

1. Em `chrome://extensions`, localize TabAla
2. Clique em "Service Worker" (link azul)
3. O DevTools do background script abrirá

## Troubleshooting

### 1. Build falha com erro de Docker

**Sintoma:** Erro ao executar `make build`
```
Cannot connect to the Docker daemon
```

**Solução:**
- Verifique se o Docker está rodando: `docker info`
- Inicie o Docker Desktop (macOS/Windows)
- Linux: `sudo systemctl start docker`

### 2. Extensão não carrega - Erro de Manifest

**Sintoma:** Erro vermelho ao carregar: "Manifest file is invalid"

**Soluções:**
- Verifique se o build foi executado: `ls dist/manifest.json`
- Confirme que o `manifest.json` é JSON válido
- Certifique-se de selecionar a pasta `dist/`, não a raiz do projeto

### 3. Ícones não aparecem ou mostram placeholder genérico

**Sintoma:** Ícone padrão do Chrome ao invés do ícone TabAla

**Soluções:**
- Verifique se os ícones existem: `ls -la dist/icons/`
- Confirme que os arquivos não estão vazios (devem ter > 0 bytes)
- Recarregue a extensão em chrome://extensions

### 4. Popup não abre ou mostra página em branco

**Sintoma:** Clicar no ícone não faz nada ou mostra popup vazio

**Soluções:**
1. Abra o DevTools do popup (botão direito → Inspecionar)
2. Verifique erros no Console
3. Erros comuns:
   - `net::ERR_FILE_NOT_FOUND` → Caminhos incorretos no HTML
   - `Refused to load script` → Problemas de CSP (verifique manifest.json)
4. Confirme que `dist/src/popup/index.html` existe e referencia os assets corretamente

### 5. Hot-reload não funciona no modo dev

**Sintoma:** Alterações no código não refletem na extensão

**Soluções:**
- Verifique se `make dev` está rodando
- Confirme que o container está ativo: `docker ps`
- macOS/Windows: Habilite file sharing no Docker Desktop
- Recarregue manualmente a extensão

### 6. Porta 5173 ocupada

**Sintoma:** Erro ao iniciar dev server
```
Port 5173 is already in use
```

**Soluções:**
- Identifique o processo: `lsof -i :5173`
- Mate o processo: `kill -9 <PID>`
- Ou pare o container antigo: `make stop`

### 7. Erros de permissão no volume Docker

**Sintoma:** `EACCES: permission denied`

**Soluções:**
- Linux: Ajuste permissões: `chmod -R 755 .`
- Container roda como user `node` (uid 1000)
- Verifique ownership: `ls -la package.json`

### 8. Service Worker não registra

**Sintoma:** Console do background mostra erro de registro

**Soluções:**
- Verifique se `dist/service-worker-loader.js` existe
- Confirme a configuração em `manifest.json`:
  ```json
  "background": {
    "service_worker": "service-worker-loader.js",
    "type": "module"
  }
  ```
- Recarregue completamente a extensão (remova e adicione novamente)

## Comandos Úteis

```bash
# Build de produção
make build

# Desenvolvimento com hot-reload
make dev

# Executar testes
make test

# Linting
make lint

# Limpar dist/
make clean

# Shell no container
make shell

# Parar containers
make stop
```

## Referências

- [Chrome Extensions Documentation](https://developer.chrome.com/docs/extensions/)
- [Manifest V3 Overview](https://developer.chrome.com/docs/extensions/mv3/intro/)
- [Debugging Extensions](https://developer.chrome.com/docs/extensions/mv3/tut_debugging/)
- [Vite Build](https://vitejs.dev/guide/build.html)
- [@crxjs/vite-plugin](https://crxjs.dev/vite-plugin/)
