"""Учебная панель блокировок ПАЗ и контроль операций деблокировки."""

import os

from elou_tutor.domain.process_limits import (
    COLUMN_LEVEL_HIGH_CRITICAL_LEVEL,
    COLUMN_LEVEL_LOW_CRITICAL_LEVEL,
    COLUMN_PRES_ESD,
    COLUMN_PRES_CRITICAL,
    FURNACE_TEMP_CRITICAL,
    K2_LEVEL_LOW_CRITICAL,
    K2_PRESSURE_CRITICAL,
    K2_TEMP_CRITICAL,
)


DUTY_ENGINEER_PHONE = os.environ.get("DUTY_ENGINEER_PHONE", "24-45")

INTERLOCK_DEFINITIONS = (
    {"tag": "LIRSA 1a", "logic": "1oo1", "mechanism": "Контактор КМ-2", "primary": True},
    {"tag": "LIRSA 2a", "logic": "2oo2", "mechanism": "Контактор КМ-2", "primary": True},
    {"tag": "LIRSA 2д", "logic": "2oo2", "mechanism": "Контактор КМ-2", "primary": True},
    {"tag": "LIRSA 3a", "logic": "1oo1", "mechanism": "Контактор КМ-2", "primary": True},
    {"tag": "PIRSA 9a", "logic": "1oo1", "mechanism": "Контактор КМ-2", "primary": False},
    {"tag": "TIRSA 10a", "logic": "1oo1", "mechanism": "Контактор КМ-2", "primary": False},
    {"tag": "PIRSA 11a", "logic": "1oo1", "mechanism": "Контактор КМ-2", "primary": False},
    {"tag": "TIRSA 12a", "logic": "1oo1", "mechanism": "Контактор КМ-2", "primary": False},
    {"tag": "PIRSA 13a", "logic": "1oo1", "mechanism": "Контактор КМ-2", "primary": False},
)


class InterlockController:
    """Хранит учебное состояние деблокировок и разрешение дежурного инженера."""

    def __init__(self) -> None:
        self.reset()

    def reset(self) -> None:
        """Снимает все деблокировки и аннулирует разрешение на операцию."""
        self.bypasses = {definition["tag"]: False for definition in INTERLOCK_DEFINITIONS}
        self.operation_authorized = False

    def authorize_operation(self) -> None:
        """Разрешает одну операцию после учебного звонка дежурному инженеру."""
        self.operation_authorized = True

    def set_bypass(self, tag: str, state: bool) -> None:
        """Меняет деблокировку; каждое разрешение расходуется ровно на одну операцию."""
        if tag not in self.bypasses:
            raise KeyError(f"Неизвестная позиция ПАЗ: {tag}")
        if not self.operation_authorized:
            raise PermissionError("Перед изменением деблокировки требуется звонок дежурному инженеру")
        self.bypasses[tag] = state
        self.operation_authorized = False

    def rows(self, sensors: dict) -> list[dict]:
        """Формирует строки панели ПАЗ с текущим аварийным статусом."""
        level = float(sensors.get("L_1", 0.0))
        pressure = float(sensors.get("P_1", 0.0))
        furnace_temp = float(sensors.get("T_1", 0.0))
        vacuum_pressure = float(sensors.get("P_vac", 0.0))
        vacuum_temp = float(sensors.get("T_2", 0.0))
        vacuum_level = float(sensors.get("L_2", 50.0))

        alarms = {
            "LIRSA 1a": level >= COLUMN_LEVEL_HIGH_CRITICAL_LEVEL,
            "LIRSA 2a": level <= COLUMN_LEVEL_LOW_CRITICAL_LEVEL,
            "LIRSA 2д": level <= COLUMN_LEVEL_LOW_CRITICAL_LEVEL,
            "LIRSA 3a": vacuum_level <= K2_LEVEL_LOW_CRITICAL,
            "PIRSA 9a": pressure >= COLUMN_PRES_ESD,
            "TIRSA 10a": furnace_temp >= FURNACE_TEMP_CRITICAL,
            # Порог блокировки, а не сигнализации: панель показывает сработавшие
            # ПАЗ. Сигнализация по ≥1,0 кгс/см² идёт отдельным аларм-сообщением.
            "PIRSA 11a": vacuum_pressure >= K2_PRESSURE_CRITICAL,
            "TIRSA 12a": vacuum_temp >= K2_TEMP_CRITICAL,
            "PIRSA 13a": pressure >= COLUMN_PRES_CRITICAL,
        }

        return [
            {
                **definition,
                "bypassed": self.bypasses[definition["tag"]],
                "alarm": alarms[definition["tag"]],
            }
            for definition in INTERLOCK_DEFINITIONS
        ]
