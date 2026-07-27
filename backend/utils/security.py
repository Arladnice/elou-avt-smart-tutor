import os
import time
import hashlib
import jwt
from fastapi import HTTPException
from dotenv import load_dotenv

from backend.db.database import get_db_connection

load_dotenv()

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
