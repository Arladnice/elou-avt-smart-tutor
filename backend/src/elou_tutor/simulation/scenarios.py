import os
import json
import logging
import tempfile
from typing import List, Dict, Any, Optional

logger = logging.getLogger(__name__)

_PACKAGE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Эталонная поставка сценариев техрегламента. Живёт внутри пакета, доступна
# только на чтение: в образе каталог принадлежит слою и пересоздаётся при
# каждой сборке.
PACKAGE_SCENARIOS_PATH = os.path.join(_PACKAGE_DIR, "data", "scenarios.json")

# Рабочий файл реестра. Инструктор пишет сюда через GUI-конструктор, поэтому
# путь обязан указывать в переживающий редеплой каталог данных (том
# tutor_data, там же лежит база). Значение по умолчанию оставлено внутри
# пакета ради запуска из исходников; образы и compose задают SCENARIOS_PATH
# явно. Тесты переопределяют его же, чтобы прогон не трогал боевой реестр.
SCENARIOS_FILE_PATH = os.environ.get("SCENARIOS_PATH", PACKAGE_SCENARIOS_PATH)


def _read_registry(path: str) -> Optional[List[Dict[str, Any]]]:
    """Читает файл реестра. Возвращает None, если файла нет или он повреждён."""
    if not os.path.exists(path):
        return None
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f).get("scenarios", [])
    except Exception as e:
        logger.error(f"Ошибка чтения файла сценариев {path}: {e}")
        return None


def load_scenarios() -> List[Dict[str, Any]]:
    """
    Загружает список всех активных сценариев.

    Если рабочего файла ещё нет — это первый запуск на чистом томе, и реестр
    переносится из поставки в пакете. Без переноса сервер после деплоя отдавал
    бы пустой список: у оператора не осталось бы ни одного учебного задания.
    """
    scenarios = _read_registry(SCENARIOS_FILE_PATH)
    if scenarios is not None:
        return scenarios

    if os.path.abspath(SCENARIOS_FILE_PATH) == os.path.abspath(PACKAGE_SCENARIOS_PATH):
        logger.error(f"Файл сценариев не найден: {SCENARIOS_FILE_PATH}")
        return []

    defaults = _read_registry(PACKAGE_SCENARIOS_PATH)
    if defaults is None:
        logger.error(f"Поставка сценариев недоступна: {PACKAGE_SCENARIOS_PATH}")
        return []

    logger.info(
        "Реестр сценариев не найден по пути %s — переносим поставку из пакета",
        SCENARIOS_FILE_PATH,
    )
    if not save_scenarios(defaults):
        # Перенос не удался (например, каталог только на чтение). Отдаём
        # поставку из памяти: тренажёр работает, но правки не сохранятся.
        logger.error("Не удалось создать рабочий реестр сценариев, работаем из поставки")
    return defaults


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
