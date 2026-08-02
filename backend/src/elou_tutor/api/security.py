import os
import time
import jwt
from fastapi import HTTPException
from dotenv import load_dotenv

from elou_tutor.db.database import get_db_connection

from elou_tutor.domain.credentials import get_password_hash, verify_password  # noqa: F401
from elou_tutor.domain.integrity import calculate_integrity_hash, verify_integrity_hash  # noqa: F401

# Явный путь, а не поиск от текущего каталога: модуль импортируется и тестами,
# и офлайн-скриптами из разных cwd, а секреты лежат ровно в backend/.env.
_BACKEND_DIR = os.path.abspath(
    os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "..")
)
load_dotenv(os.path.join(_BACKEND_DIR, ".env"))

JWT_SECRET_KEY = os.environ.get("SECRET_KEY", "elou_avt_dev_jwt_secret_key_2026")
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
