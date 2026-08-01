# ============================================================
# Multi-stage Dockerfile для КТК ЭЛОУ-АВТ Smart Tutor
# Деплой: Render.com (порт из переменной $PORT)
# ============================================================

# === Stage 1: Сборка React-фронтенда ===
FROM node:22-alpine AS frontend-build

WORKDIR /build

# Устанавливаем зависимости фронтенда
COPY frontend/package*.json ./
RUN npm ci --ignore-scripts

# Копируем исходники и собираем production-бандл
COPY frontend/ ./
RUN npm run build

# === Stage 2: Python-сервер + собранная статика ===
FROM python:3.12-slim

WORKDIR /app

# Python-зависимости
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Код проекта: ставим пакет; офлайн-пайплайн (backend/training) не копируем.
# rm -rf build в том же слое: setuptools оставляет каталог сборки с копией
# исходников, и без уборки он остаётся в финальном образе мёртвым грузом.
COPY backend/pyproject.toml ./
COPY backend/src ./src
RUN pip install --no-cache-dir --no-deps . && rm -rf build

# Собранный фронтенд из Stage 1
COPY --from=frontend-build /build/dist ./frontend/dist

# Директория для SQLite БД
RUN mkdir -p /app/data

# Переменные окружения.
# PORT по умолчанию = 7860 (app_port из docs/deploy/README_HF.md — HF Spaces
# сам $PORT не задаёт); Render прокидывает свой $PORT и переопределяет значение.
ENV PORT=7860
ENV DATABASE_PATH=/app/data/tutor.db
ENV STATIC_DIR=/app/frontend/dist
ENV PYTHONUNBUFFERED=1
# Адрес LLM объявлен явно, чтобы его было видно в docker inspect и можно было
# переопределить переменной окружения площадки. Значение по умолчанию указывает
# внутрь контейнера, то есть в облаке LLM заведомо недоступна: ИИ-чат корректно
# деградирует до RAG-ответов по базе знаний. Нужен полноценный чат — задайте
# адрес доступного OpenAI-совместимого сервера.
ENV LLM_BASE_URL=http://127.0.0.1:1234

EXPOSE ${PORT}

# Render передаёт $PORT динамически — используем shell-форму CMD
CMD uvicorn elou_tutor.api.main:app --host 0.0.0.0 --port $PORT
