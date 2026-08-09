"""Учебная панель блокировок ПАЗ и контроль операций деблокировки."""

import os

from elou_tutor.domain.process_limits import (
    COLUMN_LEVEL_HIGH_CRITICAL_LEVEL,
    COLUMN_LEVEL_LOW_CRITICAL_LEVEL,
    COLUMN_PRES_ESD,
    COLUMN_PRES_CRITICAL,
    FURNACE_TEMP_CRITICAL,
    K2_LEVEL_LOW_INTERLOCK,
    K2_PRESSURE_CRITICAL,
    K2_TEMP_CRITICAL,
)


DUTY_ENGINEER_PHONE = os.environ.get("DUTY_ENGINEER_PHONE", "24-45")

# Позиции названы так же, как в техрегламенте («3. Описание технологического
# процесса» из исходных данных кейса). Прежние обозначения LIRSA/PIRSA/TIRSA
# были собственной нотацией и в регламенте не встречались вовсе.
#
# basis разделяет два разных класса строк:
#   «регламент» — блокировка описана в регламенте числом, панель воспроизводит
#                 реальную защиту установки;
#   «учебная»   — защиты с таким срабатыванием на объекте нет, строка
#                 добавлена ради учебного эффекта.
# Реальных блокировок среди моделируемого оборудования ровно три: давление К-1,
# давление К-2 и уровень куба К-2. Блокировок по температуре регламент не
# содержит ни одной, по уровню куба К-1 — тоже.
INTERLOCK_DEFINITIONS = (
    {
        "tag": "LRCA 602", "logic": "1oo1", "mechanism": "Контактор КМ-2", "primary": True,
        "parameter": "Уровень куба К-1, верхний предел",
        "basis": "учебная",
        "note": "LRCA 602 регистрирует и сигнализирует; блокировки по уровню К-1 регламент не предусматривает",
    },
    {
        "tag": "LR 602А", "logic": "2oo2", "mechanism": "Контактор КМ-2", "primary": True,
        "parameter": "Уровень куба К-1, нижний предел",
        "basis": "учебная",
        "note": "Дублёр уровнемера К-1; защита насосов куба добавлена как учебная",
    },
    {
        "tag": "LR 602В", "logic": "2oo2", "mechanism": "Контактор КМ-2", "primary": True,
        "parameter": "Уровень куба К-1, нижний предел (дублёр)",
        "basis": "учебная",
        "note": "Второй дублёр уровнемера К-1; защита насосов куба добавлена как учебная",
    },
    {
        # Блокировка идёт по единственному каналу дублёра 604А, схем
        # голосования регламент не описывает
        "tag": "LRSA 604А", "logic": "1oo1", "mechanism": "Контактор КМ-2", "primary": True,
        "parameter": "Уровень куба К-2, нижний предел",
        "basis": "регламент",
        "note": "Менее 15% — запрет пуска насосов Н-4, Н-4А, Н-32, Н-32А",
    },
    {
        "tag": "PRSA 204", "logic": "1oo1", "mechanism": "Контактор КМ-2", "primary": False,
        "parameter": "Давление в колонне К-1",
        "basis": "регламент",
        "note": "4,5 кгс/см² — сигнализация, 4,8 кгс/см² — отсечение топлива и пара",
    },
    {
        "tag": "TR 55-1", "logic": "1oo1", "mechanism": "Контактор КМ-2", "primary": False,
        "parameter": "Температура на выходе печи П-1",
        "basis": "учебная",
        "note": "TR 55-1 — термопара без сигнализации; блокировок по температуре регламент не содержит",
    },
    {
        "tag": "PRSA 213", "logic": "1oo1", "mechanism": "Контактор КМ-2", "primary": False,
        "parameter": "Давление в колонне К-2",
        "basis": "регламент",
        "note": "1,0 кгс/см² — сигнализация, 1,5 кгс/см² — отсечение топлива и перегретого пара",
    },
    {
        "tag": "TR 43-9", "logic": "1oo1", "mechanism": "Контактор КМ-2", "primary": False,
        "parameter": "Температура низа колонны К-2",
        "basis": "учебная",
        "note": "TR 43-9 — термопара без сигнализации; блокировок по температуре регламент не содержит",
    },
    {
        "tag": "PRSA 204/II", "logic": "1oo1", "mechanism": "Контактор КМ-2", "primary": False,
        "parameter": "Давление в колонне К-1, порог разгерметизации",
        "basis": "учебная",
        "note": "Вторая ступень на той же позиции: в регламенте её нет, добавлена как учебная",
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
            "LRCA 602": level >= COLUMN_LEVEL_HIGH_CRITICAL_LEVEL,
            "LR 602А": level <= COLUMN_LEVEL_LOW_CRITICAL_LEVEL,
            "LR 602В": level <= COLUMN_LEVEL_LOW_CRITICAL_LEVEL,
            # Порог блокировки по регламенту — менее 15% (запрет пуска Н-4/Н-32)
            "LRSA 604А": vacuum_level <= K2_LEVEL_LOW_INTERLOCK,
            "PRSA 204": pressure >= COLUMN_PRES_ESD,
            "TR 55-1": furnace_temp >= FURNACE_TEMP_CRITICAL,
            # Порог блокировки, а не сигнализации: панель показывает сработавшие
            # ПАЗ. Сигнализация по ≥1,0 кгс/см² идёт отдельным аларм-сообщением.
            "PRSA 213": vacuum_pressure >= K2_PRESSURE_CRITICAL,
            "TR 43-9": vacuum_temp >= K2_TEMP_CRITICAL,
            "PRSA 204/II": pressure >= COLUMN_PRES_CRITICAL,
        }

        return [
            {
                **definition,
                "bypassed": self.bypasses[definition["tag"]],
                "alarm": alarms[definition["tag"]],
            }
            for definition in INTERLOCK_DEFINITIONS
        ]
