import asyncio
import os
import time
import hmac
import jwt
from fastapi import HTTPException
from dotenv import load_dotenv

from backend.db.database import get_db_connection

from elou_tutor.domain.credentials import get_password_hash, verify_password  # noqa: F401
from elou_tutor.domain.integrity import calculate_integrity_hash, verify_integrity_hash  # noqa: F401

load_dotenv()

JWT_SECRET_KEY = os.environ.get("SECRET_KEY")
if not JWT_SECRET_KEY:
    raise ValueError("Критическая ошибка: переменная окружения SECRET_KEY не задана!")
JWT_ALGORITHM = "HS256"


def create_jwt_token(data: dict) -> str:
    """Создает JWT токен для пользователя."""
    to_encode = data.copy()
    to_encode.update({"iat": time.time(), "exp": time.time() + 7200}) # 2 часа
    return jwt.encode(to_encode, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)

def verify_jwt_token(token: str) -> dict:
    """Проверяет JWT токен."""
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Срок действия токена истек")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Невалидный токен")

def log_audit_event(actor: str, action: str, details: str):
    """
    Записывает событие ИБ в журнал.

    Каждая запись включает хэш предыдущей, поэтому удаление или правка строки
    разрывает цепочку и обнаруживается verify_audit_chain().
    """
    timestamp = time.strftime("%Y-%m-%d %H:%M:%S")
    with get_db_connection() as conn:
        cursor = conn.cursor()
        row = cursor.execute(
            "SELECT integrity_hash FROM audit_logs ORDER BY id DESC LIMIT 1"
        ).fetchone()
        prev_hash = row[0] if row else ""
        h = calculate_integrity_hash(timestamp, actor, action, details, prev_hash)
        cursor.execute(
            "INSERT INTO audit_logs (timestamp, actor, action, details, integrity_hash, prev_hash) "
            "VALUES (?, ?, ?, ?, ?, ?)",
            (timestamp, actor, action, details, h, prev_hash)
        )
        conn.commit()


async def log_audit_event_async(actor: str, action: str, details: str):
    """
    Асинхронная обёртка записи в журнал.

    Обработчик WebSocket и цикл симуляции пишут аудит на каждую команду и на
    каждое событие; синхронная запись в SQLite блокировала бы event loop и
    задерживала рассылку телеметрии всем подключённым клиентам.
    """
    await asyncio.to_thread(log_audit_event, actor, action, details)


def verify_audit_chain():
    """
    Проверяет непрерывность журнала аудита.

    Возвращает (True, None), если цепочка цела, иначе (False, id_записи),
    где id_записи — первая строка, на которой цепочка разошлась.
    Записи, созданные до внедрения цепочки (prev_hash IS NULL), пропускаются.
    """
    with get_db_connection() as conn:
        rows = conn.execute(
            "SELECT id, timestamp, actor, action, details, integrity_hash, prev_hash "
            "FROM audit_logs ORDER BY id"
        ).fetchall()

    expected_prev = None
    for row_id, timestamp, actor, action, details, stored_hash, prev_hash in rows:
        if prev_hash is None:
            # Устаревшая запись без цепочки — проверяем только собственный хэш
            if not verify_integrity_hash(stored_hash, timestamp, actor, action, details):
                return False, row_id
            continue

        if expected_prev is not None and prev_hash != expected_prev:
            return False, row_id

        expected = calculate_integrity_hash(timestamp, actor, action, details, prev_hash)
        if not hmac.compare_digest(stored_hash or "", expected):
            return False, row_id

        expected_prev = stored_hash

    return True, None

def check_fail_to_ban(username: str):
    """Проверяет не заблокирован ли пользователь по механизму Fail-to-Ban."""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT attempts, lockout_until FROM login_attempts WHERE username = ?", (username,))
        row = cursor.fetchone()
        if row:
            attempts, lockout_until = row
            if lockout_until > time.time():
                raise HTTPException(status_code=429, detail="Слишком много попыток входа. Учетная запись временно заблокирована.")
            # Если время блокировки прошло, сбрасываем счетчик
            if lockout_until > 0 and lockout_until <= time.time():
                cursor.execute("UPDATE login_attempts SET attempts = 0, lockout_until = 0 WHERE username = ?", (username,))
                conn.commit()

def record_failed_login(username: str):
    """Увеличивает счетчик неудачных попыток входа (Fail-to-Ban)."""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT attempts FROM login_attempts WHERE username = ?", (username,))
        row = cursor.fetchone()
        
        if row:
            attempts = row[0] + 1
            lockout_until = time.time() + 300 if attempts >= 5 else 0 # 5 минут блокировки после 5 неудачных попыток
            cursor.execute("UPDATE login_attempts SET attempts = ?, lockout_until = ? WHERE username = ?", (attempts, lockout_until, username))
        else:
            cursor.execute("INSERT INTO login_attempts (username, attempts, lockout_until) VALUES (?, 1, 0)", (username,))
        conn.commit()

def reset_failed_login(username: str):
    """Сбрасывает счетчик неудачных попыток входа."""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("UPDATE login_attempts SET attempts = 0, lockout_until = 0 WHERE username = ?", (username,))
        conn.commit()
