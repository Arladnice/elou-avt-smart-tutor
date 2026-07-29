import time
from fastapi import APIRouter, HTTPException
from backend.models.schemas import LoginRequest
from backend.utils.security import (
    log_audit_event, 
    create_jwt_token, 
    check_fail_to_ban, 
    record_failed_login, 
    reset_failed_login, 
    verify_password
)
from backend.db.database import get_db_connection

router = APIRouter(prefix="/api/auth", tags=["auth"])

@router.post("/login")
def login(req: LoginRequest):
    """
    Выполняет аутентификацию пользователя (оператор / инструктор).
    Записывает событие LOGIN в ИБ-журнал. Включает защиту Fail-to-Ban.
    """
    if not req.username.strip():
        raise HTTPException(status_code=400, detail="Имя пользователя не может быть пустым")
        
    username = req.username.strip()
    
    # 1. Проверяем, не заблокирован ли пользователь (Fail-to-Ban)
    check_fail_to_ban(username)

    # 2. Ищем пользователя в БД
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id, role, password_hash, is_active FROM users WHERE username = ?", (username,))
        row = cursor.fetchone()

    # 3. Валидация
    if not row or not verify_password(req.password, row[2]):
        log_audit_event(username, "LOGIN_FAILED", "Неверный логин или пароль")
        record_failed_login(username)
        raise HTTPException(status_code=401, detail="Неверный логин или пароль")

    if not row[3]: # is_active
        raise HTTPException(status_code=403, detail="Учетная запись отключена")

    if req.role and req.role != row[1]:
        # Если клиент запросил конкретную роль, проверяем, совпадает ли она с базой
        log_audit_event(username, "LOGIN_FAILED", f"Попытка входа с неверной ролью: {req.role} (ожидалось: {row[1]})")
        raise HTTPException(status_code=403, detail="Недостаточно прав для выбранной роли")
    
    role = row[1]

    # 4. Сброс счетчика неудачных попыток при успешном входе
    reset_failed_login(username)

    token = create_jwt_token({"sub": username, "role": role})
    log_audit_event(username, "LOGIN", f"Пользователь вошел с ролью {role}")
    
    return {
        "username": username,
        "role": role,
        "token": token
    }
