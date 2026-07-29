from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional

from backend.services.scenario_manager import (
    load_scenarios, add_custom_scenario, delete_scenario, get_scenario_by_id
)
from backend.utils.security import log_audit_event

router = APIRouter(prefix="/api/scenarios", tags=["Scenarios"])


class ConditionModel(BaseModel):
    type: str  # valve_is, sensor_gte, sensor_lte, composite_and
    target: Optional[str] = None
    expected: Optional[Any] = None
    conditions: Optional[List[Dict[str, Any]]] = None


class ChecklistItemModel(BaseModel):
    id: str
    title: str
    hint_training: str
    hint_exam: str
    condition: Dict[str, Any]


class InitialStateModel(BaseModel):
    T_1: float = 280.0
    P_1: float = 0.35
    L_1: float = 50.0
    T_1_Sp: float = 280.0
    V_1: bool = True
    V_2: bool = False
    V_3: bool = True


class CreateScenarioModel(BaseModel):
    id: str = Field(..., description="Уникальный ID сценария")
    title: str = Field(..., description="Название сценария")
    short_name: str = Field(..., description="Короткое название для меню")
    description: str = Field("", description="Описание сценария")
    initial_state: InitialStateModel
    checklist: List[ChecklistItemModel]
    golden_sequence: List[str]


@router.get("", response_model=List[Dict[str, Any]])
async def get_all_scenarios():
    """Возвращает полный список всех доступных учебных сценариев."""
    return load_scenarios()


@router.get("/{scenario_id}", response_model=Dict[str, Any])
async def get_scenario(scenario_id: str):
    """Возвращает информацию о конкретном сценарии по его ID."""
    sc = get_scenario_by_id(scenario_id)
    if not sc:
        raise HTTPException(status_code=404, detail=f"Сценарий '{scenario_id}' не найден.")
    return sc


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_scenario(payload: CreateScenarioModel):
    """Создаёт новый пользовательский сценарий инструктора."""
    success, message = add_custom_scenario(payload.model_dump())
    if not success:
        raise HTTPException(status_code=400, detail=message)
    log_audit_event("INSTRUCTOR", "CREATE_SCENARIO", f"Создан новый сценарий '{payload.id}': {payload.title}")
    return {"status": "success", "message": message, "scenario_id": payload.id}


@router.post("/import", status_code=status.HTTP_201_CREATED)
async def import_scenario(payload: Dict[str, Any]):
    """Импортирует сценарий из загруженного JSON-файла."""
    scenario_data = payload.get("scenario") or payload
    if not isinstance(scenario_data, dict) or "id" not in scenario_data or "title" not in scenario_data:
        raise HTTPException(status_code=400, detail="Неверный формат JSON. Требуются поля 'id' и 'title'.")

    success, message = add_custom_scenario(scenario_data)
    if not success:
        raise HTTPException(status_code=400, detail=message)
    log_audit_event("INSTRUCTOR", "IMPORT_SCENARIO", f"Импортирован сценарий '{scenario_data['id']}' из JSON")
    return {"status": "success", "message": message, "scenario_id": scenario_data["id"]}


@router.delete("/{scenario_id}")
async def remove_scenario(scenario_id: str):
    """Удаляет пользовательский сценарий инструктора."""
    success, message = delete_scenario(scenario_id)
    if not success:
        raise HTTPException(status_code=400, detail=message)
    log_audit_event("INSTRUCTOR", "DELETE_SCENARIO", f"Удален сценарий '{scenario_id}'")
    return {"status": "success", "message": message}
