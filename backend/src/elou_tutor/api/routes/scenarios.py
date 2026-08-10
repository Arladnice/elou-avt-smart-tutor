from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field, ValidationError
from typing import List, Dict, Any, Optional

from elou_tutor.api.schemas import ImportScenarioModel

from elou_tutor.simulation.scenarios import (
    load_scenarios, add_custom_scenario, delete_scenario, get_scenario_by_id
)
from elou_tutor.api.deps import get_current_user, require_instructor
from elou_tutor.db.audit import log_audit_event

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
    T_3: float = 280.0
    P_1: float = 0.35
    L_1: float = 50.0
    L_2: float = 50.0
    T_1_Sp: float = 280.0
    T_3_Sp: float = 280.0
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
async def get_all_scenarios(user: dict = Depends(get_current_user)):
    """Возвращает полный список всех доступных учебных сценариев."""
    return load_scenarios()


@router.get("/{scenario_id}", response_model=Dict[str, Any])
async def get_scenario(scenario_id: str, user: dict = Depends(get_current_user)):
    """Возвращает информацию о конкретном сценарии по его ID."""
    sc = get_scenario_by_id(scenario_id)
    if not sc:
        raise HTTPException(status_code=404, detail=f"Сценарий '{scenario_id}' не найден.")
    return sc


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_scenario(payload: CreateScenarioModel, user: dict = Depends(require_instructor)):
    """Создаёт новый пользовательский сценарий инструктора."""
    success, message = add_custom_scenario(payload.model_dump())
    if not success:
        raise HTTPException(status_code=400, detail=message)
    log_audit_event(user["sub"], "CREATE_SCENARIO", f"Создан новый сценарий '{payload.id}': {payload.title}")
    return {"status": "success", "message": message, "scenario_id": payload.id}


@router.post("/import", status_code=status.HTTP_201_CREATED)
async def import_scenario(payload: Dict[str, Any], user: dict = Depends(require_instructor)):
    """Импортирует сценарий из загруженного JSON-файла."""
    raw = payload.get("scenario") or payload
    if not isinstance(raw, dict):
        raise HTTPException(status_code=400, detail="Неверный формат JSON: ожидается объект сценария.")

    try:
        scenario = ImportScenarioModel(**raw)
    except ValidationError as e:
        # ctx ошибок Pydantic содержит объект исключения и не сериализуется в JSON
        detail = [
            {"field": ".".join(str(p) for p in err["loc"]), "message": err["msg"]}
            for err in e.errors(include_url=False)
        ]
        raise HTTPException(status_code=422, detail=detail)

    scenario_data = scenario.model_dump()
    success, message = add_custom_scenario(scenario_data)
    if not success:
        raise HTTPException(status_code=400, detail=message)
    log_audit_event(user["sub"], "IMPORT_SCENARIO", f"Импортирован сценарий '{scenario_data['id']}' из JSON")
    return {"status": "success", "message": message, "scenario_id": scenario_data["id"]}


@router.delete("/{scenario_id}")
async def remove_scenario(scenario_id: str, user: dict = Depends(require_instructor)):
    """Удаляет пользовательский сценарий инструктора."""
    success, message = delete_scenario(scenario_id)
    if not success:
        raise HTTPException(status_code=400, detail=message)
    log_audit_event(user["sub"], "DELETE_SCENARIO", f"Удален сценарий '{scenario_id}'")
    return {"status": "success", "message": message}
