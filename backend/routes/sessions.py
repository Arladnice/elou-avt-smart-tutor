from fastapi import APIRouter
from backend.db.queries import get_all_sessions, clear_all_sessions
from backend.utils.security import log_audit_event

router = APIRouter(prefix="/api/sessions", tags=["sessions"])

@router.get("")
def get_sessions():
    """
    Возвращает историю тренировочных сессий.
    Выполняет проверку ИБ-целостности (SHA-256) для каждой записи.
    """
    return get_all_sessions()

@router.post("/clear")
def clear_sessions():
    """
    Очищает всю историю сессий в БД.
    Записывает аудит-лог о сбросе БД администратором.
    """
    clear_all_sessions()
    log_audit_event("ADMIN", "DB_CLEAR", "Очищена история учебных сессий")
    return {"message": "История очищена"}
