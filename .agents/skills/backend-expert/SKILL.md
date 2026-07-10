---
name: backend-expert
description: |
  Use when creating or editing Python files in the backend/ directory.
  Covers: FastAPI routers, Pydantic models, WebSocket handlers, SQLite database, security (integrity hashing, audit logs).
  Enforces modular structure, error handling, logging, and docstring standards.
---

# Backend Expert — ЭЛОУ-АВТ Smart Tutor

Specialized skill for working with the project's backend (`backend/` directory).

## 🎯 Tech Stack

| Technology | Usage |
|---|---|
| FastAPI | REST API + WebSocket server |
| Pydantic v2 | Request/Response validation |
| SQLite3 | Training session storage + audit logs |
| Uvicorn | ASGI server |
| Python 3.11+ | Runtime |

---

## 📂 Target Modular Structure

The backend MUST be organized into the following module structure. If `main.py` exceeds 300 lines, it must be split:

```
backend/
├── main.py                    # ONLY: app = FastAPI(), include_router(), lifespan events
├── routes/                    # FastAPI APIRouter modules
│   ├── __init__.py
│   ├── auth.py                # POST /api/auth/login
│   ├── sessions.py            # GET /api/sessions, POST /api/sessions/clear
│   └── ws.py                  # WebSocket /ws endpoint
├── services/                  # Business logic (no HTTP/WS awareness)
│   ├── __init__.py
│   ├── connection_manager.py  # ConnectionManager class
│   └── simulation_loop.py     # async simulation_loop() coroutine
├── models/                    # Pydantic schemas
│   ├── __init__.py
│   └── schemas.py             # LoginRequest, SessionSaveRequest, SessionResponse, etc.
├── db/                        # Database layer
│   ├── __init__.py
│   ├── database.py            # init_db(), get_connection() context manager
│   └── queries.py             # save_session(), get_sessions(), clear_sessions()
├── utils/                     # Shared utilities
│   ├── __init__.py
│   ├── security.py            # calculate_integrity_hash(), log_audit_event()
│   └── helpers.py             # random_id(), format helpers
├── tests/
│   └── test_tutor.py          # pytest tests for all endpoints
├── Dockerfile
├── requirements.txt
└── tutor.db                   # SQLite database (gitignored in production)
```

---

## 📋 Checklist: Before Creating/Editing Backend Code

```markdown
- [ ] File does NOT exceed 300 lines
- [ ] All request/response bodies use Pydantic BaseModel (no raw dict)
- [ ] Every @router endpoint has a docstring
- [ ] Errors use HTTPException(status_code=..., detail=...), not bare raise
- [ ] No print() — use logging.getLogger(__name__)
- [ ] No secrets hardcoded — use os.environ.get()
- [ ] No `import` inside functions — all imports at file top
- [ ] No sys.path.append() — use package installation
- [ ] SQL queries parameterized (? placeholders), no f-string SQL
- [ ] WebSocket handlers wrapped in try/except WebSocketDisconnect
```

---

## 🔧 Pattern: FastAPI Router Module

```python
# backend/routes/sessions.py
import logging
from fastapi import APIRouter, HTTPException

from models.schemas import SessionResponse
from db.queries import get_all_sessions, clear_all_sessions
from utils.security import log_audit_event

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/sessions", tags=["sessions"])


@router.get("/", response_model=list[SessionResponse])
def get_sessions():
    """Возвращает историю тренировок с проверкой целостности данных (ИБ)."""
    sessions = get_all_sessions()
    logger.info("Запрошена история сессий, найдено %d записей", len(sessions))
    return sessions


@router.post("/clear")
def clear_sessions():
    """Очищает историю учебных сессий. Записывает событие в ИБ-журнал."""
    clear_all_sessions()
    log_audit_event("ADMIN", "DB_CLEAR", "Очищена история учебных сессий")
    return {"message": "История очищена"}
```

---

## 🔧 Pattern: Pydantic Model

```python
# backend/models/schemas.py
from pydantic import BaseModel, Field
from typing import Literal


class LoginRequest(BaseModel):
    """Запрос авторизации оператора или инструктора."""
    username: str = Field(..., min_length=1, description="Имя пользователя")
    role: Literal["operator", "instructor"] = Field(..., description="Роль пользователя")


class LoginResponse(BaseModel):
    """Ответ после успешной авторизации."""
    username: str
    role: str
    token: str
```

---

## 🔧 Pattern: Database Access

```python
# backend/db/database.py
import os
import sqlite3
from contextlib import contextmanager

DB_PATH = os.environ.get("DATABASE_PATH", os.path.join(os.path.dirname(__file__), "..", "tutor.db"))


@contextmanager
def get_connection():
    """Контекстный менеджер для безопасного подключения к БД."""
    conn = sqlite3.connect(DB_PATH)
    try:
        yield conn
    finally:
        conn.close()
```

---

## 🔌 WebSocket Protocol

The backend serves a single WebSocket endpoint at `/ws` with query parameters:
- `role`: `"operator"` | `"instructor"`
- `username`: operator's display name
- `scenario`: scenario ID (`"startup"`, `"shutdown"`, etc.)

### Inbound Messages (client → server)
| `type` | Payload fields | Handler |
|---|---|---|
| `toggle_valve` | `valve_id`, `state` | ConnectionManager |
| `change_setpoint` | `value` | ConnectionManager |
| `trigger_esd` | — | ConnectionManager |
| `trigger_defect` | `defect_id`, `state` | ConnectionManager (instructor only) |
| `complete` | — | ConnectionManager |
| `reset` | — | ConnectionManager |
| `ping` | `timestamp` | Direct pong response |

### Outbound Messages (server → client)
Full simulator state JSON broadcast every 1 second (via `simulation_loop`).

---

## 🔒 Security Patterns

### Integrity Hashing (SHA-256)
```python
def calculate_integrity_hash(*args) -> str:
    """Вычисляет SHA-256 хэш с секретной солью для защиты от подмены данных."""
    salt = os.environ.get("INTEGRITY_SALT", "DEV_SALT_CHANGE_IN_PROD")
    payload = "".join(str(arg) for arg in args) + salt
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()
```

### Audit Logging
Every significant action MUST be logged via `log_audit_event(actor, action, details)`:
- `LOGIN`, `WS_CONNECT`, `WS_DISCONNECT`
- `VALVE_TOGGLE`, `SETPOINT_CHANGE`, `ESD_TRIGGER`
- `DEFECT_TRIGGER` (instructor actions)
- `SESSION_SAVE`, `SESSION_COMPLETE`, `SESSION_RESET`
- `DB_CLEAR`, `STARTUP`

---

## 🚫 Anti-Patterns

1. **No monolithic files** — Split any file > 300 lines into modules.
2. **No `print()`** — Use `logging.getLogger(__name__)`.
3. **No raw dict returns** — Use Pydantic `response_model`.
4. **No f-string SQL** — Use parameterized queries with `?` placeholders.
5. **No bare `except:`** — Always specify exception type.
6. **No `sys.path.append()`** — Use proper package structure.
7. **No `import` inside functions** — All imports at file top.
