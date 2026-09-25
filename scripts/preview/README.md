# Prévia das telas fora do Chrome

Para ver e capturar as telas sem carregar a extensão, com dados fictícios.

```bash
make preview        # builda em .preview/ (nunca no dist/) e serve em http://localhost:4173
make preview-stop   # para o servidor
```

No Playwright (MCP), injete o stub antes de abrir a página:

```js
async (page) => {
  await page.context().addInitScript({ path: '<caminho absoluto>/scripts/preview/chrome-stub.js' });
  await page.goto('http://localhost:4173/src/newtab/index.html?theme=dark');
}
```

Parâmetros: `theme=dark|light`, `session=1` (sessão de Foco em andamento), `empty=1` (nada salvo).

Nunca rode `vite preview` nem `vite dev`: com o crxjs eles esvaziam o `dist/`, de onde o Chrome carrega a extensão.
