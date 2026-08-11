# ============================================================
# КТК ЭЛОУ-АВТ — инициализация, запуск, остановка, линтинг.
# Настройки (инструменты, порты, пути) вынесены в config.mk.
# Список команд: make
# ============================================================

include config.mk

.DEFAULT_GOAL := help

.PHONY: help init start-dev start stop reset reset-hard snapshot lint check-node

help: ## Показать список команд
	@echo ""
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / \
		{printf "  \033[36m%-10s\033[0m %s\n", $$1, $$2}' $(MAKEFILE_LIST)
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
	@# Ставим из каталога с файлом требований: строка `-e .` внутри него
	@# разрешается относительно текущего каталога, а не каталога файла.
	cd $(dir $(PY_REQUIREMENTS)) && $(PYTHON) -m pip install --user -r $(notdir $(PY_REQUIREMENTS))
	$(NPM) install --prefix $(FRONTEND_DIR)
	@echo ""
	@echo "✓ Проект готов к работе. Запуск — make start"

start-dev: check-node ## Запустить бэкенд и фронтенд локально, без Docker
	@test -f $(ENV_FILE) || { echo "✗ Нет $(ENV_FILE) — сначала выполните make init"; exit 1; }
	@echo "Фронтенд: http://localhost:5173   API: http://127.0.0.1:$(BACKEND_PORT)"
	@# concurrently даёт --kill-others: Ctrl+C гасит оба процесса разом.
	@# На голом shell это потребовало бы возни с trap и группами процессов.
	npx -y concurrently --kill-others \
		"$(PYTHON) -m uvicorn elou_tutor.api.main:app --host 127.0.0.1 --port $(BACKEND_PORT) --reload" \
		"$(NPM) run dev --prefix $(FRONTEND_DIR)"

start: ## Собрать и запустить стек в Docker, дождаться готовности
	@test -f $(ENV_FILE) || { echo "✗ Нет $(ENV_FILE) — сначала выполните make init"; exit 1; }
	$(COMPOSE) up -d --build --wait
	@echo ""
	@echo "✓ Интерфейс тренажёра: http://localhost:$(FRONTEND_PORT)"
	@echo "✓ API бэкенда:         http://localhost:$(BACKEND_PORT)"

stop: ## Остановить стек (база в томе tutor_data сохраняется)
	$(COMPOSE) down

reset: stop ## Сбросить стек до чистой копии: удаляет БД и поднимает заново
	@echo "⚠  Удаляем том tutor_data (все учебные сессии будут потеряны)..."
	$(COMPOSE) down -v
	@echo "✓ Том удалён. Поднимаем чистый стек..."
	$(COMPOSE) up -d --build --wait
	@echo ""
	@echo "✓ Чистый стенд готов: http://localhost:$(FRONTEND_PORT)"

reset-hard: ## Жёсткий сброс: удаляет тома + пересобирает образы с нуля (--no-cache)
	@echo "⚠  Полная очистка: тома, сети, образы — начинаем пересборку с нуля..."
	$(COMPOSE) down -v --rmi local
	$(COMPOSE) build --no-cache
	$(COMPOSE) up -d --wait
	@echo ""
	@echo "✓ Стенд пересобран с нуля: http://localhost:$(FRONTEND_PORT)"

snapshot: ## Сохранить резервную копию БД перед сбросом (./backups/tutor_<timestamp>.db)
	@mkdir -p backups
	@TS=$$(date +%Y%m%d_%H%M%S); \
	  docker run --rm \
	    -v tutor_data:/data \
	    -v $$(pwd)/backups:/out \
	    alpine sh -c "cp /data/tutor.db /out/tutor_$${TS}.db && echo \"✓ Снапшот: backups/tutor_$${TS}.db\""

lint: check-node ## Проверить код: oxlint во фронтенде + синтаксис Python
	$(NPM) run lint --prefix $(FRONTEND_DIR)
	$(PYTHON) -m compileall -q $(PY_SOURCES)
	@echo "✓ Проверка кода пройдена"
