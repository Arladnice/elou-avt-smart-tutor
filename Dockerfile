# ============================================================
# Multi-stage Dockerfile для КТК ЭЛОУ-АВТ Smart Tutor
# Деплой: Render.com (порт из переменной $PORT)
# ============================================================

# === Stage 1: Сборка React-фронтенда ===
FROM node:20-alpine AS frontend-build

WORKDIR /build

# Устанавливаем зависимости фронтенда
COPY frontend/package*.json ./
RUN npm ci --ignore-scripts

# Копируем исходники и собираем production-бандл
COPY frontend/ ./
RUN npm run build

# === Stage 2: Python-сервер + собранная статика ===
FROM python:3.10-slim

WORKDIR /app

# Python-зависимости
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Код проекта
COPY backend/ ./backend/
COPY simulator/ ./simulator/
COPY ai_core/ ./ai_core/

# Собранный фронтенд из Stage 1
COPY --from=frontend-build /build/dist ./frontend/dist

# Директория для SQLite БД
RUN mkdir -p /app/data

# Переменные окружения
ENV PORT=10000
ENV DATABASE_PATH=/app/data/tutor.db
ENV PYTHONUNBUFFERED=1

EXPOSE ${PORT}

# Render передаёт $PORT динамически — используем shell-форму CMD
CMD uvicorn backend.main:app --host 0.0.0.0 --port $PORT
