"""Учебная панель блокировок ПАЗ и контроль операций деблокировки."""

import os

from elou_tutor.domain.process_limits import (
    COLUMN_LEVEL_LOW,
    COLUMN_PRES_ESD,
    COLUMN_PRES_WARNING,
    K2_LEVEL_LOW,
    K2_PRESSURE_CRITICAL,
    K2_PRESSURE_WARNING,
)


DUTY_ENGINEER_PHONE = os.environ.get("DUTY_ENGINEER_PHONE", "24-45")

# Согласованная таблица ПАЗ: одна строка соответствует одной функции защиты,
# а не отдельному датчику. Это позволяет оператору видеть конфигурацию
# голосования, порог сигнализации, порог ПАЗ и состояние деблокировки вместе.
# В учебной модели для каждой функции доступно одно измеренное значение уровня
# или давления; отдельные отказы измерительных каналов не моделируются.
INTERLOCK_DEFINITIONS = (
    {
        "tag": "Е-1", "sensors": ("LRCSA 603", "LRSA 603B"), "logic": "2oo2",
        "signalization": "≤20%", "trip_threshold": "<15%", "mechanism": "Останов Н-6/Н-6А",
    },
    {
        "tag": "К1", "sensors": ("PRSA 204",), "logic": "1oo1",
        "signalization": "≥4,5 кгс/см²", "trip_threshold": ">4,8 кгс/см²",
        "mechanism": "Отсечка топлива и пара К-1",
    },
    {
        "tag": "К1 (куб)", "sensors": ("LRCSA 602", "LRSA 602A", "LRSA 602B"), "logic": "2oo3",
        "signalization": "≤20%", "trip_threshold": "<15%", "mechanism": "ПАЗ по низкому уровню куба К-1",
    },
    {
        "tag": "Е-2", "sensors": ("LRCSA 609", "LRSA 609B"), "logic": "2oo2",
        "signalization": "≤20%", "trip_threshold": "<15%", "mechanism": "Запрет Н-7/Н-7А",
    },
    {
        "tag": "К2", "sensors": ("PRSA 213",), "logic": "1oo1",
        "signalization": "≥1,0 кгс/см²", "trip_threshold": ">1,5 кгс/см²",
        "mechanism": "Отсечка топлива и пара К-2",
    },
    {
        "tag": "К2 (куб)", "sensors": ("LRCSA 604", "LRSA 604A", "LRSA 604B"), "logic": "2oo3",
        "signalization": "≤20%", "trip_threshold": "<15%", "mechanism": "Запрет Н-4/Н-32",
    },
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

    def set_bypass(self, tag: str, state: bool, trip_active: bool = False) -> None:
        """Меняет деблокировку, не позволяя обойти уже активировавшийся ПАЗ."""
        if tag not in self.bypasses:
            raise KeyError(f"Неизвестная позиция ПАЗ: {tag}")
        if not self.operation_authorized:
            raise PermissionError("Перед изменением деблокировки требуется звонок дежурному инженеру")
        if state and trip_active:
            raise ValueError("Нельзя включить деблокировку при активном ПАЗ")
        self.bypasses[tag] = state
        self.operation_authorized = False

    @staticmethod
    def _states(sensors: dict) -> tuple[dict[str, bool], dict[str, bool]]:
        """Вычисляет состояния сигнализации и ПАЗ по согласованной таблице."""
        level = float(sensors.get("L_1", 0.0))
        pressure = float(sensors.get("P_1", 0.0))
        vacuum_pressure = float(sensors.get("P_vac", 0.0))
        vacuum_level = float(sensors.get("L_2", 50.0))
        e1_level = float(sensors.get("L_E1", 50.0))
        e2_level = float(sensors.get("L_E2", 50.0))

        signals = {
            "Е-1": e1_level <= COLUMN_LEVEL_LOW,
            "К1": pressure >= COLUMN_PRES_WARNING,
            "К1 (куб)": level <= COLUMN_LEVEL_LOW,
            "Е-2": e2_level <= COLUMN_LEVEL_LOW,
            "К2": vacuum_pressure >= K2_PRESSURE_WARNING,
            "К2 (куб)": vacuum_level <= K2_LEVEL_LOW,
        }
        trips = {
            "Е-1": e1_level < 15.0,
            "К1": pressure > COLUMN_PRES_ESD,
            "К1 (куб)": level < 15.0,
            "Е-2": e2_level < 15.0,
            "К2": vacuum_pressure > K2_PRESSURE_CRITICAL,
            "К2 (куб)": vacuum_level < 15.0,
        }
        return signals, trips

    def is_trip_active(self, tag: str, sensors: dict) -> bool:
        """Возвращает факт срабатывания ПАЗ для серверной проверки деблокировки."""
        if tag not in self.bypasses:
            raise KeyError(f"Неизвестная позиция ПАЗ: {tag}")
        _, trips = self._states(sensors)
        return trips[tag]

    def rows(self, sensors: dict, startup_k2_prefill: bool = False) -> list[dict]:
        """Формирует шесть строк таблицы ПАЗ с сигнализацией и срабатыванием."""
        signals, trips = self._states(sensors)

        return [
            {
                **definition,
                "bypassed": self.bypasses[definition["tag"]],
                "signal": signals[definition["tag"]],
                "trip": trips[definition["tag"]],
                "paz_active": trips[definition["tag"]] and not self.bypasses[definition["tag"]],
            }
            for definition in INTERLOCK_DEFINITIONS
        ]
