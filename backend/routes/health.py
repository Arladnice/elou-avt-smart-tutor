import os
import logging
import urllib.request
from fastapi import APIRouter

try:
    import psutil
    HAS_PSUTIL = True
except ImportError:
    HAS_PSUTIL = False

# cpu_percent(interval=None) возвращает загрузку за время с предыдущего вызова,
# поэтому самый первый замер всегда нулевой. Первый раз меряем с коротким
# интервалом, дальше — без блокировки.
_cpu_measured_once = False


def _read_cpu_percent() -> float:
    global _cpu_measured_once
    if not _cpu_measured_once:
        _cpu_measured_once = True
        return psutil.cpu_percent(interval=0.1)
    return psutil.cpu_percent(interval=None)

from backend.models.schemas import HealthResponse, SystemMetrics
from backend.services.connection_manager import manager, average_broadcast_latency_ms
from backend.db.database import DB_PATH

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/health", tags=["health"])

# Чат-ассистент обращается к LM Studio (OpenAI-совместимый API на порту 1234),
# поэтому и проверять надо именно его: прежняя проверка Ollama на 11434
# показывала недоступность сервиса, который в работе не участвует.
LLM_HEALTH_URL = os.environ.get("LLM_HEALTH_URL", "http://127.0.0.1:1234/v1/models")


def check_llm_status() -> bool:
    """Проверяет доступность локального сервера LLM, используемого чатом."""
    try:
        with urllib.request.urlopen(LLM_HEALTH_URL, timeout=0.2) as response:
            return response.status == 200
    except Exception:
        return False

@router.get("", response_model=HealthResponse)
def health_check():
    """
    Возвращает статус работоспособности сервиса.
    Используется в качестве keep-alive (прогрева) инстанса Render с минимальным размером трафика.
    """
    logger.info("Получен запрос на проверку здоровья (health check)")
    return {"status": "ok"}

@router.get("/metrics", response_model=SystemMetrics)
def health_metrics():
    """
    Возвращает системные метрики производительности и мониторинга КТК (USE-метрики).
    """
    logger.info("Получен запрос на детальные USE-метрики системы")
    
    cpu = 0.0
    mem_used = 0.0
    mem_percent = 0.0
    metrics_available = False

    if HAS_PSUTIL:
        try:
            cpu = _read_cpu_percent()
            mem = psutil.virtual_memory()
            mem_used = mem.used / (1024 * 1024)
            mem_percent = mem.percent
            metrics_available = True
        except Exception as e:
            logger.error("Ошибка сбора метрик через psutil: %s", e)
    else:
        # Ранее здесь возвращались выдуманные значения, из-за чего панель
        # мониторинга показывала правдоподобную, но несуществующую нагрузку.
        logger.warning("psutil недоступен: метрики ресурсов не собираются")


    db_size = 0.0
    if os.path.exists(DB_PATH):
        try:
            db_size = os.path.getsize(DB_PATH) / 1024.0
        except Exception as e:
            logger.error("Ошибка определения размера БД: %s", e)
            
    ws_connections = sum(len(s.operator_sockets) + len(s.instructor_sockets) for s in manager.sessions.values())
    total_events = sum(s.processed_events_total for s in manager.sessions.values())

    return SystemMetrics(
        cpu_percent=cpu,
        memory_used_mb=round(mem_used, 1),
        memory_percent=round(mem_percent, 1),
        db_size_kb=round(db_size, 1),
        active_ws_connections=ws_connections,
        processed_events_total=total_events,
        avg_ping_latency_ms=round(average_broadcast_latency_ms(), 1),
        is_ollama_available=check_llm_status(),
        is_metrics_available=metrics_available
    )
