FROM python:3.12-slim

WORKDIR /app

COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Пакет ставится из исходников: pyproject объявляет package data
# (scenarios.json, knowledge_base, model.onnx) — без установки их не будет в образе.
# Каталог backend/training намеренно не копируется: обучение в прод-образе не нужно.
# rm -rf build в том же слое: setuptools оставляет каталог сборки с копией
# исходников, и без уборки он остаётся в финальном образе мёртвым грузом.
COPY backend/pyproject.toml ./
COPY backend/src ./src
RUN pip install --no-cache-dir --no-deps . && rm -rf build

# Обязательные секреты. Значений по умолчанию нет намеренно: приложение падает
# на импорте, если INTEGRITY_SALT или SECRET_KEY не переданы при запуске
# (docker run -e INTEGRITY_SALT=... -e SECRET_KEY=...).
ENV INTEGRITY_SALT="" \
    SECRET_KEY="" \
    DATABASE_PATH=/app/data/tutor.db \
    ALLOWED_ORIGINS=http://localhost:5173

# Непривилегированный пользователь; каталог данных отдаём ему во владение
RUN useradd --create-home --uid 10001 appuser \
    && mkdir -p /app/data \
    && chown -R appuser:appuser /app/data
USER appuser

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD python -c "import urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:8000/api/health', timeout=2).status==200 else 1)"

CMD ["uvicorn", "elou_tutor.api.main:app", "--host", "0.0.0.0", "--port", "8000"]
