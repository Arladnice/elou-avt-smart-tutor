"""
Криптографический контроль целостности записей.

Чистая функция над полями записи: зависит только от stdlib и секретной соли
из окружения. Потребители — слой db (сверка при чтении) и services (подпись
при сохранении сессии).
"""

import hashlib
import hmac
import os

SECRET_SALT = os.environ.get("INTEGRITY_SALT")
if not SECRET_SALT:
    raise ValueError("Критическая ошибка: переменная окружения INTEGRITY_SALT не задана!")

# Разделитель полей: без него ("ab", "c") и ("a", "bc") дали бы одинаковый хэш
_FIELD_SEPARATOR = "\x1f"


def calculate_integrity_hash(*args) -> str:
    """Вычисляет HMAC-SHA256 переданных полей на секретной соли."""
    payload = _FIELD_SEPARATOR.join(str(arg) for arg in args)
    return hmac.new(
        SECRET_SALT.encode("utf-8"), payload.encode("utf-8"), hashlib.sha256
    ).hexdigest()


def _legacy_integrity_hash(*args) -> str:
    """Прежний алгоритм (SHA-256 от конкатенации с солью-суффиксом).

    Нужен только для проверки записей, созданных до перехода на HMAC.
    """
    payload = "".join(str(arg) for arg in args) + SECRET_SALT
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def verify_integrity_hash(stored_hash: str, *args) -> bool:
    """Проверяет хэш записи, принимая как новый (HMAC), так и устаревший формат."""
    if not stored_hash:
        return False
    if hmac.compare_digest(stored_hash, calculate_integrity_hash(*args)):
        return True
    return hmac.compare_digest(stored_hash, _legacy_integrity_hash(*args))
