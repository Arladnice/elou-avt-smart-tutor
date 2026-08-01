import os
import json
import logging
import tempfile
from typing import List, Dict, Any, Optional

logger = logging.getLogger(__name__)

# Путь переопределяется переменной SCENARIOS_PATH: тесты работают с копией,
# чтобы прогон набора не изменял боевой реестр сценариев.
_PACKAGE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SCENARIOS_FILE_PATH = os.environ.get(
    "SCENARIOS_PATH", os.path.join(_PACKAGE_DIR, "data", "scenarios.json")
)


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
    """
    Атомарно сохраняет список сценариев.

    Запись идёт во временный файл рядом с целевым и завершается os.replace:
    прямая запись в открытый на "w" файл при сбое оставляла бы обрезанный
    JSON, то есть уничтожала весь реестр сценариев.
    """
    target_dir = os.path.dirname(os.path.abspath(SCENARIOS_FILE_PATH))
    tmp_path = None
    try:
        os.makedirs(target_dir, exist_ok=True)
        fd, tmp_path = tempfile.mkstemp(dir=target_dir, prefix=".scenarios-", suffix=".tmp")
        with os.fdopen(fd, "w", encoding="utf-8") as f:
            json.dump({"scenarios": scenarios}, f, ensure_ascii=False, indent=2)
            f.flush()
            os.fsync(f.fileno())
        os.replace(tmp_path, SCENARIOS_FILE_PATH)
        return True
    except Exception as e:
        logger.error(f"Ошибка записи в файл сценариев: {e}")
        if tmp_path and os.path.exists(tmp_path):
            try:
                os.remove(tmp_path)
            except OSError:
                pass
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
