from pydantic import BaseModel, Field
from typing import List, Dict, Any, Literal

class LoginRequest(BaseModel):
    username: str
    role: str # "operator" | "instructor"

class SessionSaveRequest(BaseModel):
    operator_name: str
    role: str
    scenario_id: str
    duration_sec: int
    score: int
    status: str
    violations: List[Dict[str, Any]]

class HealthResponse(BaseModel):
    status: str

class ChatMessage(BaseModel):
    """Отдельное сообщение в чате."""
    role: Literal["user", "assistant", "system"]
    content: str

class ChatRequest(BaseModel):
    """Запрос к ИИ-чату с контекстом телеметрии."""
    messages: List[ChatMessage]
    telemetry: Dict[str, Any]
    mode: Literal["auto", "rag", "llm"] = "auto"

class ChatResponse(BaseModel):
    """Ответ ИИ-чата."""
    content: str
    mode_used: str = "auto"

class WebhookConfigRequest(BaseModel):
    """Запрос на настройку внешнего вебхука (К8: Зонтичные функции)."""
    url: str = Field(..., description="URL получателя вебхука (например, TrueConf)")
    is_active: bool = True

class SystemMetrics(BaseModel):
    """Системные метрики по USE методологии."""
    cpu_percent: float
    memory_used_mb: float
    memory_percent: float
    db_size_kb: float
    active_ws_connections: int
    processed_events_total: int
    avg_ping_latency_ms: float
    is_ollama_available: bool


