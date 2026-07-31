# ============================================================
# ЭЛОУ-АВТ Smart Tutor — инициализация, запуск, остановка, линтинг.
# Настройки (инструменты, порты, пути) вынесены в config.mk.
# Список команд: make
# ============================================================

include config.mk

.DEFAULT_GOAL := help

.PHONY: help init start stop lint check-node

help: ## Показать список команд
	@echo ""
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / \
		{printf "  \033[36m%-8s\033[0m %s\n", $$1, $$2}' $(MAKEFILE_LIST)
	@echo ""

check-node:
	@node -e "$(NODE_CHECK)"

init: check-node ## Подготовить проект: создать .env и установить зависимости
	@if [ -f $(ENV_FILE) ]; then \
		echo "✓ $(ENV_FILE) уже существует — оставляю как есть"; \
	else \
		cp $(ENV_EXAMPLE) $(ENV_FILE); \
		echo "✓ $(ENV_FILE) создан из $(ENV_EXAMPLE) (dev-значения секретов)"; \
	fi
	$(PYTHON) -m pip install --user -r $(PY_REQUIREMENTS)
	$(NPM) install --prefix $(FRONTEND_DIR)
	@echo ""
	@echo "✓ Проект готов к работе. Запуск — make start"

start: ## Собрать и запустить стек в Docker, дождаться готовности
	@test -f $(ENV_FILE) || { echo "✗ Нет $(ENV_FILE) — сначала выполните make init"; exit 1; }
	$(COMPOSE) up -d --build --wait
	@echo ""
	@echo "✓ Интерфейс тренажёра: http://localhost:$(FRONTEND_PORT)"
	@echo "✓ API бэкенда:         http://localhost:$(BACKEND_PORT)"

stop: ## Остановить стек (база в томе tutor_data сохраняется)
	$(COMPOSE) down

lint: check-node ## Проверить код: oxlint во фронтенде + синтаксис Python
	$(NPM) run lint --prefix $(FRONTEND_DIR)
	$(PYTHON) -m compileall -q $(PY_SOURCES)
	@echo "✓ Проверка кода пройдена"
