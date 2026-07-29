import os
import json
import logging
from typing import List, Dict, Any, Optional

logger = logging.getLogger(__name__)

SCENARIOS_FILE_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "scenarios.json")


def load_scenarios() -> List[Dict[str, Any]]:
    """Загружает список всех активных сценариев из файла конфигурации."""
    if not os.path.exists(SCENARIOS_FILE_PATH):
        logger.error(f"Файл сценариев не найден: {SCENARIOS_FILE_PATH}")
        return []
    try:
        with open(SCENARIOS_FILE_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
            return data.get("scenarios", [])
    except Exception as e:
        logger.error(f"Ошибка чтения файла сценариев: {e}")
        return []


def get_scenario_by_id(scenario_id: str) -> Optional[Dict[str, Any]]:
    """Возвращает данные конкретного сценария по его ID."""
    scenarios = load_scenarios()
    for s in scenarios:
        if s.get("id") == scenario_id:
            return s
    return None


def save_scenarios(scenarios: List[Dict[str, Any]]) -> bool:
    """Сохраняет обновленный список сценариев в JSON-файл."""
    try:
        with open(SCENARIOS_FILE_PATH, "w", encoding="utf-8") as f:
            json.dump({"scenarios": scenarios}, f, ensure_ascii=False, indent=2)
        return True
    except Exception as e:
        logger.error(f"Ошибка записи в файл сценариев: {e}")
        return False


def add_custom_scenario(scenario_data: Dict[str, Any]) -> tuple[bool, str]:
    """Валидирует и добавляет новый пользовательский сценарий инструктора."""
    scenario_id = scenario_data.get("id", "").strip()
    if not scenario_id:
        return False, "Идентификатор сценария (id) не может быть пустым."

    title = scenario_data.get("title", "").strip()
    if not title:
        return False, "Название сценария не может быть пустым."

    scenarios = load_scenarios()
    for s in scenarios:
        if s.get("id") == scenario_id:
            return False, f"Сценарий с id '{scenario_id}' уже существует."

    scenario_data["is_custom"] = True
    scenarios.append(scenario_data)

    if save_scenarios(scenarios):
        return True, "Сценарий успешно добавлен."
    return False, "Не удалось сохранить сценарий на диске."


def delete_scenario(scenario_id: str) -> tuple[bool, str]:
    """Удаляет пользовательский сценарий."""
    scenarios = load_scenarios()
    target = None
    for s in scenarios:
        if s.get("id") == scenario_id:
            target = s
            break

    if not target:
        return False, "Сценарий не найден."

    if not target.get("is_custom", False):
        return False, "Запрещено удалять встроенные сценарии техрегламента."

    updated = [s for s in scenarios if s.get("id") != scenario_id]
    if save_scenarios(updated):
        return True, "Сценарий успешно удален."
    return False, "Ошибка при удалении сценария."
