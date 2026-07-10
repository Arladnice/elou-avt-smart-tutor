import time
from fastapi import APIRouter, HTTPException
from backend.models.schemas import LoginRequest
from backend.utils.security import log_audit_event

router = APIRouter(prefix="/api/auth", tags=["auth"])

@router.post("/login")
def login(req: LoginRequest):
    """
    Выполняет аутентификацию пользователя (оператор / инструктор).
    Записывает событие LOGIN в ИБ-журнал.
    """
    if not req.username.strip():
        raise HTTPException(status_code=400, detail="Имя пользователя не может быть пустым")
    if req.role not in ["operator", "instructor"]:
        raise HTTPException(status_code=400, detail="Неверная роль пользователя")
        
    token = f"jwt-mock-token-for-{req.username}-{req.role}-{int(time.time())}"
    log_audit_event(req.username, "LOGIN", f"Пользователь вошел с ролью {req.role}")
    
    return {
        "username": req.username,
        "role": req.role,
        "token": token
    }
