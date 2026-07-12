import logging
from fastapi import APIRouter
from backend.models.schemas import HealthResponse

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/health", tags=["health"])

@router.get("", response_model=HealthResponse)
def health_check():
    """
    Возвращает статус работоспособности сервиса.
    Используется в качестве keep-alive (прогрева) инстанса Render с минимальным размером трафика.
    """
    logger.info("Получен запрос на проверку здоровья (health check)")
    return {"status": "ok"}
