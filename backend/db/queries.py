import json
from backend.db.database import get_db_connection
from backend.utils.security import calculate_integrity_hash

def get_all_sessions():
    """Возвращает историю тренировок и проверяет целостность данных."""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT id, operator_name, role, scenario_id, start_time, "
            "duration_sec, score, status, violations_json, integrity_hash, "
            "session_logs_json FROM training_sessions ORDER BY id DESC"
        )
        rows = cursor.fetchall()
        
    sessions = []
    for r in rows:
        session_id, op_name, role, scen_id, start_time, duration, score, status, viol_json, db_hash, session_logs_json = r
        
        if not session_logs_json:
            session_logs_json = "[]"
            
        # Проверка ИБ-целостности (двойная проверка хэша для совместимости со старыми записями)
        hash_with_logs = calculate_integrity_hash(op_name, role, scen_id, start_time, duration, score, status, viol_json, session_logs_json)
        hash_without_logs = calculate_integrity_hash(op_name, role, scen_id, start_time, duration, score, status, viol_json)
        is_valid = (db_hash == hash_with_logs or db_hash == hash_without_logs)
        
        try:
            parsed_logs = json.loads(session_logs_json)
        except Exception:
            parsed_logs = []
        
        sessions.append({
            "id": session_id,
            "operator_name": op_name,
            "role": role,
            "scenario_id": scen_id,
            "start_time": start_time,
            "duration_sec": duration,
            "score": score,
            "status": status,
            "violations": json.loads(viol_json),
            "session_logs": parsed_logs,
            "integrity_valid": is_valid
        })
        
    return sessions

def clear_all_sessions():
    """Удаляет все записи учебных сессий из БД."""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM training_sessions")
        conn.commit()

def save_session_db(op_name: str, role: str, scen_id: str, start_time: str, duration: int, score: int, status: str, violations: str, h: str, session_logs: str):
    """Вставляет новую учебную сессию в базу данных."""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO training_sessions (operator_name, role, scenario_id, start_time, duration_sec, score, status, violations_json, integrity_hash, session_logs_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (op_name, role, scen_id, start_time, duration, score, status, violations, h, session_logs)
        )
        conn.commit()
