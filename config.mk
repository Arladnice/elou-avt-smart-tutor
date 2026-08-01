# ============================================================
# Настройки сборки и запуска ЭЛОУ-АВТ Smart Tutor.
# Правьте этот файл, а не сам Makefile.
# Любую переменную можно переопределить на лету:
#   make start COMPOSE="podman compose"
# ============================================================

SHELL := /bin/bash

# --- Инструменты ---
COMPOSE ?= docker compose
PYTHON  ?= python3
NPM     ?= npm

# --- Файл с секретами ---
# Живёт рядом с бэкендом: секреты нужны только ему. Compose подключает этот
# же файл через env_file, поэтому копия в корне не нужна.
ENV_FILE    ?= backend/.env
ENV_EXAMPLE ?= backend/.env.example

# Подхватываем секреты: они нужны локальному запуску и тестам.
ifneq (,$(wildcard $(ENV_FILE)))
include $(ENV_FILE)
export
endif

# --- Порты ---
# Значения зашиты в docker-compose.yml; здесь они нужны только чтобы
# make start напечатал верные адреса. Меняете там — поправьте и тут.
BACKEND_PORT  ?= 8000
FRONTEND_PORT ?= 80

# --- Исходники ---
FRONTEND_DIR ?= frontend
PY_SOURCES   ?= backend/src backend/training

# Минимальная версия Node для фронтенда: её требует oxlint (^20.19 || >=22.12),
# Vite 7 и React 19. Под Node 16 установка молча пропускает бинарные пакеты
# линтера, и он падает с невнятной ошибкой ERR_UNKNOWN_FILE_EXTENSION.
NODE_CHECK ?= const [a,b]=process.versions.node.split('.').map(Number); \
	if (!((a===20 && b>=19) || a>=22)) { \
		console.error('\n✗ Node ' + process.versions.node + ' устарел: нужен ^20.19 или >=22.12.'); \
		console.error('  Например: nvm use 22 (затем переустановите зависимости: make init)\n'); \
		process.exit(1); \
	}

# --- Зависимости Python (dev-файл включает основной + тестовые пакеты) ---
PY_REQUIREMENTS ?= backend/requirements-dev.txt
