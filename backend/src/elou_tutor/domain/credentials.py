"""
Хэширование и проверка паролей.

Чистая криптография без предметной логики, поэтому живёт в domain: нужна
и слою db (первичное сидирование пользователей), и слою api (проверка входа).
Если бы функции остались в api, возникла бы восходящая зависимость db → api.
"""

from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def get_password_hash(password: str) -> str:
    """Возвращает bcrypt-хэш пароля."""
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Сверяет пароль с сохранённым хэшем."""
    return pwd_context.verify(plain_password, hashed_password)
