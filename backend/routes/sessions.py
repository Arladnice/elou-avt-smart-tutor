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

@router.get("/active")
def get_active_sessions():
    """
    Возвращает список текущих активных сессий операторов в реальном времени.
    Используется инструктором для выбора отслеживаемой сессии.
    """
    from backend.services.connection_manager import manager
    
    # Удаляем пустые сессии
    dead_sids = [sid for sid, s in manager.sessions.items() if len(s.operator_sockets) == 0 and len(s.instructor_sockets) == 0]
    for sid in dead_sids:
        del manager.sessions[sid]

    result = []
    for sid, s in manager.sessions.items():
        if len(s.operator_sockets) > 0:
            sim_state = s.simulator.get_state()
            result.append({
                "session_id": sid,
                "operator_name": s.active_operator_name,
                "scenario_id": s.active_scenario,
                "connected_operators": len(s.operator_sockets),
                "connected_instructors": len(s.instructor_sockets),
                "status": sim_state.get("status", "running"),
                "time_elapsed": sim_state.get("timeElapsed", 0)
            })
    return result

@router.post("/clear")
def clear_sessions():
    """
    Очищает всю историю сессий в БД.
    Записывает аудит-лог о сбросе БД администратором.
    """
    clear_all_sessions()
    log_audit_event("ADMIN", "DB_CLEAR", "Очищена история учебных сессий")
    return {"message": "История очищена"}
