# =============================================================================
# TabAla - Makefile
# =============================================================================
# Centraliza comandos de desenvolvimento via Docker Compose.
# Execute 'make help' para ver todos os comandos disponíveis.
# =============================================================================

.DEFAULT_GOAL := help

# Evita conflitos com arquivos de mesmo nome
.PHONY: help dev dev-detached build test test-watch test-ui test-coverage lint lint-fix shell clean stop

# =============================================================================
# Help
# =============================================================================

## help: Lista todos os comandos disponíveis
help:
	@echo ""
	@echo "\033[1mTabAla - Comandos Disponíveis\033[0m"
	@echo ""
	@grep -E '^## [a-zA-Z_-]+:' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ": "}; {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}' | \
		sed 's/## //'
	@echo ""

# =============================================================================
# Desenvolvimento
# =============================================================================

## dev: Inicia servidor de desenvolvimento (modo interativo)
dev:
	@echo "\033[32m>>> Iniciando ambiente de desenvolvimento...\033[0m"
	docker compose up

## dev-detached: Inicia servidor de desenvolvimento (background)
dev-detached:
	@echo "\033[32m>>> Iniciando ambiente de desenvolvimento em background...\033[0m"
	docker compose up -d
	@echo "\033[32m>>> Servidor rodando em background. Use 'make stop' para parar.\033[0m"

# =============================================================================
# Build
# =============================================================================

## build: Compila a extensão para produção
build:
	@echo "\033[32m>>> Compilando extensão para produção...\033[0m"
	docker compose run --rm app npm run build
	@echo "\033[32m>>> Build concluído! Artefatos em dist/\033[0m"

# =============================================================================
# Testes
# =============================================================================

## test: Executa suite de testes com Vitest
test:
	@echo "\033[32m>>> Executando testes...\033[0m"
	docker compose run --rm app npm test

## test-watch: Executa testes em modo watch
test-watch:
	@echo "\033[32m>>> Executando testes em modo watch...\033[0m"
	docker compose run --rm app npm run test:watch

## test-ui: Abre interface visual do Vitest
test-ui:
	@echo "\033[32m>>> Abrindo Vitest UI na porta 51204...\033[0m"
	docker compose run --rm -p 51204:51204 app npm run test:ui -- --host 0.0.0.0

## test-coverage: Gera relatório de cobertura de testes
test-coverage:
	@echo "\033[32m>>> Gerando relatório de cobertura...\033[0m"
	docker compose run --rm app npm run test:coverage
	@echo "\033[32m>>> Relatório disponível em coverage/index.html\033[0m"

# =============================================================================
# Linting
# =============================================================================

## lint: Executa ESLint para validação de código
lint:
	@echo "\033[32m>>> Executando ESLint...\033[0m"
	docker compose run --rm app npm run lint

## lint-fix: Executa ESLint com auto-correção
lint-fix:
	@echo "\033[32m>>> Executando ESLint com auto-correção...\033[0m"
	docker compose run --rm app npm run lint:fix

# =============================================================================
# Utilitários
# =============================================================================

## shell: Abre shell interativo no container
shell:
	@echo "\033[32m>>> Abrindo shell no container...\033[0m"
	docker compose run --rm app sh

## clean: Remove artefatos de build (dist/)
clean:
	@echo "\033[32m>>> Removendo artefatos de build...\033[0m"
	rm -rf dist/
	@echo "\033[32m>>> Limpeza concluída!\033[0m"

## stop: Para todos os containers em execução
stop:
	@echo "\033[32m>>> Parando containers...\033[0m"
	docker compose down
	@echo "\033[32m>>> Containers parados.\033[0m"
