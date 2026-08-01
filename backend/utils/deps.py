"""
Зависимости FastAPI для аутентификации и разграничения доступа (RBAC).

Токен выдаётся эндпоинтом /api/auth/login и передаётся в заголовке
Authorization: Bearer <token>.
"""

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from backend.utils.security import verify_jwt_token

# auto_error=False, чтобы на отсутствующий заголовок отвечать 401, а не 403
_bearer = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer),
) -> dict:
    """Проверяет JWT и возвращает полезную нагрузку токена."""
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Требуется авторизация",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = verify_jwt_token(credentials.credentials)

    if not payload.get("sub") or payload.get("role") not in ("operator", "instructor"):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Невалидный токен")

    return payload


def require_instructor(user: dict = Depends(get_current_user)) -> dict:
    """Допускает только роль инструктора: управление сценариями и очистка истории."""
    if user.get("role") != "instructor":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Недостаточно прав: требуется роль инструктора",
        )
    return user
