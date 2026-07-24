import os
import sys
import asyncio
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from starlette.middleware.cors import CORSMiddleware
from starlette.responses import FileResponse

# Добавляем пути в sys.path для импорта модулей всего проекта
ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
if ROOT_DIR not in sys.path:
    sys.path.append(ROOT_DIR)

from backend.db.database import init_db
from backend.services.simulation_loop import simulation_loop
from backend.utils.security import log_audit_event
from backend.routes import auth, sessions, ws, health, ai_chat, alarm_feedback

# Setup logger
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Жизненный цикл FastAPI приложения: инициализация БД и запуск симуляции."""
    # Инициализация БД
    init_db()
    
    # Запуск циклического фонового потока симуляции техпроцесса
    sim_task = asyncio.create_task(simulation_loop())
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

# Подключение CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Подключение роутеров
app.include_router(auth.router)
app.include_router(sessions.router)
app.include_router(ws.router)
app.include_router(health.router)
app.include_router(ai_chat.router)
app.include_router(alarm_feedback.router)



# Раздача собранного фронтенда (SPA) — для деплоя в одном контейнере (HF Spaces)
STATIC_DIR = os.path.join(ROOT_DIR, "frontend", "dist")
if os.path.isdir(STATIC_DIR):
    assets_dir = os.path.join(STATIC_DIR, "assets")
    if os.path.isdir(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    @app.get("/{path:path}")
    async def serve_spa(path: str):
        """Раздача SPA: любой маршрут, не начинающийся с /api или /ws, отдаёт index.html."""
        file_path = os.path.join(STATIC_DIR, path)
        if os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(STATIC_DIR, "index.html"))

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("backend.main:app", host="0.0.0.0", port=port, reload=True)
