import os
import time
import hashlib
import jwt
from fastapi import HTTPException
from dotenv import load_dotenv
from passlib.context import CryptContext

from backend.db.database import get_db_connection

load_dotenv()

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

SECRET_SALT = os.environ.get("INTEGRITY_SALT")
if not SECRET_SALT:
    raise ValueError("Критическая ошибка: переменная окружения INTEGRITY_SALT не задана!")

JWT_SECRET_KEY = os.environ.get("SECRET_KEY")
if not JWT_SECRET_KEY:
    raise ValueError("Критическая ошибка: переменная окружения SECRET_KEY не задана!")
JWT_ALGORITHM = "HS256"

def calculate_integrity_hash(*args) -> str:
    """Вычисляет SHA-256 хэш переданных полей с добавлением секретной соли для защиты от подмены."""
    payload = "".join(str(arg) for arg in args) + SECRET_SALT
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()

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

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

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
