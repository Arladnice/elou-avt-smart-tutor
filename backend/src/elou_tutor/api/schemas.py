from pydantic import BaseModel, Field, field_validator
from typing import List, Dict, Any, Literal, Optional

# Действия, которые реально порождает обработчик WS-команд. Эталон сценария
# (golden_sequence) может состоять только из них: шаг, которого оператор не
# способен выполнить, делает сценарий принципиально неоцениваемым.
_VALVE_IDS = (
    "V1", "V2", "V3", "V_ELOU", "V_VT", "V_P3_OUT", "V_P3_RETURN",
    "V_P1_IN", "V_K2_OUT_32", "V_K2_OUT_4", "HC_P1", "HC_P3",
    "FUEL_P1", "FUEL_P3", "V_STEAM_K1", "V_STEAM_K2", "V_K2_RELIEF",
    "V_E1_DRAIN", "V_E2_DRAIN",
)
_PUMP_IDS = ("N_20", "N_2", "N_3", "N_4", "N_32")
PRODUCIBLE_ACTIONS = frozenset(
    [f"{v}_OPEN" for v in _VALVE_IDS]
    + [f"{v}_CLOSE" for v in _VALVE_IDS]
    + [f"{pump}_START" for pump in _PUMP_IDS]
    + [f"{pump}_STOP" for pump in _PUMP_IDS]
    + ["SP_UP", "SP_DOWN", "SP3_UP", "SP3_DOWN", "FEED_UP", "FEED_DOWN", "ESD", "CALL_DISPATCHER"]
)

class LoginRequest(BaseModel):
    username: str
    password: str
    role: str # "operator" | "instructor"

class SessionSaveRequest(BaseModel):
    operator_name: str
    role: str
    scenario_id: str
    duration_sec: int
    score: int
    status: str
    violations: List[Dict[str, Any]]
    mode: str = "training"

class HealthResponse(BaseModel):
    status: str

class ChatMessage(BaseModel):
    """Отдельное сообщение в чате."""
    role: Literal["user", "assistant", "system"]
    content: str = Field(..., max_length=4000)

class ChatRequest(BaseModel):
    """Запрос к ИИ-чату с контекстом телеметрии."""
    # min_length=1: обработчик читает messages[-1], на пустом списке падал с 500.
    # max_length ограничивает объём запроса к локальной LLM.
    messages: List[ChatMessage] = Field(..., min_length=1, max_length=50)
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
    # Реально измеренная средняя длительность рассылки состояния, мс
    avg_ping_latency_ms: float
    is_ollama_available: bool
    # False, если psutil недоступен: значения нагрузки в этом случае нулевые,
    # а не выдуманные, и панель мониторинга может показать это честно
    is_metrics_available: bool = True

class ImportScenarioModel(BaseModel):
    """
    Схема импортируемого сценария.

    Сценарий задаёт начальное состояние установки и эталон оценки, поэтому
    принимается только строго описанная структура, а не произвольный JSON.
    """
    model_config = {"extra": "forbid"}

    # Идентификатор попадает в имена и сравнения — только безопасные символы
    id: str = Field(..., pattern=r"^[A-Za-z0-9_-]{1,64}$")
    title: str = Field(..., min_length=1, max_length=200)
    short_name: str = Field("", max_length=100)
    description: str = Field("", max_length=2000)
    initial_state: Optional[Dict[str, Any]] = None
    checklist: List[Dict[str, Any]] = Field(default_factory=list, max_length=50)
    golden_sequence: List[str] = Field(default_factory=list, max_length=50)
    is_custom: bool = True

    @field_validator("golden_sequence")
    @classmethod
    def _known_actions_only(cls, value: List[str]) -> List[str]:
        unknown = [step for step in value if step not in PRODUCIBLE_ACTIONS]
        if unknown:
            raise ValueError(
                f"Эталонная последовательность содержит действия, которые оператор "
                f"не может выполнить: {', '.join(unknown)}"
            )
        return value


class AlarmFeedbackRequest(BaseModel):
    """Запрос на фидбек к аларму ИИ (GAP-6: Обратная связь для замкнутого контура)."""
    alarm_id: str = Field(..., description="Идентификатор аларма")
    feedback: Literal["confirmed", "false_alarm"] = Field(..., description="Оценка аларма: подтвержден или ложная тревога")
    instructor_name: str = Field(default="Инструктор", description="Имя инструктора")
    details: str = Field(default="", description="Дополнительное примечание")
