import os
import sys
import asyncio
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from starlette.middleware.cors import CORSMiddleware
from starlette.responses import FileResponse
from dotenv import load_dotenv

# Загружаем переменные окружения
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

from backend.db.database import init_db
from backend.services.simulation_loop import simulation_loop
from backend.utils.security import log_audit_event
from backend.routes import auth, sessions, ws, health, ai_chat, alarm_feedback, scenarios

# Setup logger
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

def _report_simulation_task_exit(task: asyncio.Task):
    """Фоновый цикл симуляции не должен умирать молча."""
    if task.cancelled():
        return
    exc = task.exception()
    if exc is not None:
        logger.critical("Фоновый цикл симуляции аварийно завершился: %s", exc, exc_info=exc)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Жизненный цикл FastAPI приложения: инициализация БД и запуск симуляции."""
    # Инициализация БД
    init_db()
    
    # Запуск циклического фонового потока симуляции техпроцесса
    sim_task = asyncio.create_task(simulation_loop())
    sim_task.add_done_callback(_report_simulation_task_exit)
    log_audit_event("SYSTEM", "STARTUP", "Сервер КТК ЭЛОУ-АВТ Smart Tutor запущен.")
    logger.info("Сервер КТК ЭЛОУ-АВТ Smart Tutor успешно запущен.")
    
    yield
    
    # Завершение симуляции
    sim_task.cancel()
    try:
        await sim_task
    except asyncio.CancelledError:
        pass
    logger.info("Сервер КТК ЭЛОУ-АВТ Smart Tutor остановлен.")

app = FastAPI(
    title="КТК ЭЛОУ-АВТ Smart Tutor API",
    lifespan=lifespan
)

# Подключение CORS.
# В Docker и на PaaS (Render/HF Spaces) фронтенд и API живут на одном origin,
# CORS нужен только для дев-режима Vite; дополнительные origins — через ALLOWED_ORIGINS.
# Wildcard несовместим с allow_credentials по спецификации CORS, поэтому список явный.
ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.environ.get(
        "ALLOWED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173"
    ).split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)

# Подключение роутеров
app.include_router(auth.router)
app.include_router(sessions.router)
app.include_router(ws.router)
app.include_router(health.router)
app.include_router(ai_chat.router)
app.include_router(alarm_feedback.router)
app.include_router(scenarios.router)



ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
STATIC_DIR = os.path.join(ROOT_DIR, "frontend", "dist")


def resolve_static_file(static_dir: str, path: str):
    """
    Разрешает путь запроса в файл внутри каталога статики.

    Возвращает абсолютный путь к существующему файлу либо None, если файла нет
    или он лежит за пределами static_dir (защита от path traversal).
    """
    if not path or path.startswith("/") or "\x00" in path:
        return None

    root = os.path.realpath(static_dir)
    candidate = os.path.realpath(os.path.join(root, path))

    if candidate != root and not candidate.startswith(root + os.sep):
        return None
    if not os.path.isfile(candidate):
        return None
    return candidate


if os.path.isdir(STATIC_DIR):
    assets_dir = os.path.join(STATIC_DIR, "assets")
    if os.path.isdir(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    @app.get("/{path:path}")
    async def serve_spa(path: str):
        """Раздача SPA: любой маршрут, не начинающийся с /api или /ws, отдаёт index.html."""
        file_path = resolve_static_file(STATIC_DIR, path)
        if file_path:
            return FileResponse(file_path)
        return FileResponse(os.path.join(STATIC_DIR, "index.html"))

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("backend.main:app", host="0.0.0.0", port=port, reload=True)
