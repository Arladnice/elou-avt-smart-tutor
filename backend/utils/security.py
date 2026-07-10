import time
import hashlib
from backend.db.database import get_db_connection

SECRET_SALT = "GPNA_IT_CHAMPIONSHIP_2026_SECURITY_SALT"

def calculate_integrity_hash(*args) -> str:
    """Вычисляет SHA-256 хэш переданных полей с добавлением секретной соли для защиты от подмены."""
    payload = "".join(str(arg) for arg in args) + SECRET_SALT
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()

def log_audit_event(actor: str, action: str, details: str):
    """Записывает событие ИБ в журнал с хэшем целостности."""
    timestamp = time.strftime("%Y-%m-%d %H:%M:%S")
    h = calculate_integrity_hash(timestamp, actor, action, details)
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO audit_logs (timestamp, actor, action, details, integrity_hash) VALUES (?, ?, ?, ?, ?)",
            (timestamp, actor, action, details, h)
        )
        conn.commit()
