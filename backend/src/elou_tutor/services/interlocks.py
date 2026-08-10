"""Учебная панель блокировок ПАЗ и контроль операций деблокировки."""

import os

from elou_tutor.domain.process_limits import (
    COLUMN_LEVEL_HIGH,
    COLUMN_LEVEL_LOW,
    COLUMN_PRES_ESD,
    K2_LEVEL_HIGH,
    K2_LEVEL_LOW,
    K2_LEVEL_LOW_INTERLOCK,
    K2_PRESSURE_CRITICAL,
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
# Температурных блокировок и голосования 2oo2/2oo3 в регламенте нет. Панель
# показывает основные и дублирующие каналы Е-1, К-1, Е-2 и К-2 без выдуманной
# логики объединения.
INTERLOCK_DEFINITIONS = (
    {
        "tag": "LRCSA 603", "logic": "совместно", "mechanism": "Останов Н-6/Н-6А", "primary": True,
        "parameter": "Уровень Е-1", "basis": "регламент",
        "note": "Менее 15% — запрет пуска насосов Н-6/Н-6А",
    },
    {
        "tag": "LRSA 603B", "logic": "совместно", "mechanism": "Останов Н-6/Н-6А", "primary": True,
        "parameter": "Уровень Е-1, дублёр", "basis": "регламент",
        "note": "Дублирующий канал минимального уровня Е-1",
    },
    {
        "tag": "PRSA 204", "logic": "1oo1", "mechanism": "Отсечка топлива и пара К-1", "primary": True,
        "parameter": "Давление в колонне К-1", "basis": "регламент",
        "note": "4,5 кгс/см² — сигнализация, 4,8 кгс/см² — отсечение топлива и пара",
    },
    {
        "tag": "LRCA 602", "logic": "контроль", "mechanism": "Сигнализация уровня К-1", "primary": False,
        "parameter": "Уровень куба К-1", "basis": "регламент",
        "note": "Регистрация и сигнализация по минимуму и максимуму; блокировки нет",
    },
    {
        "tag": "LR 602А", "logic": "контроль", "mechanism": "Дублирующий контроль К-1", "primary": False,
        "parameter": "Уровень куба К-1, дублёр А", "basis": "регламент",
        "note": "Дублирующий уровнемер без отдельной блокировки",
    },
    {
        "tag": "LR 602В", "logic": "контроль", "mechanism": "Дублирующий контроль К-1", "primary": False,
        "parameter": "Уровень куба К-1, дублёр В", "basis": "регламент",
        "note": "Дублирующий уровнемер без отдельной блокировки",
    },
    {
        "tag": "LRCA 609", "logic": "контроль", "mechanism": "Сигнализация уровня Е-2", "primary": False,
        "parameter": "Уровень Е-2", "basis": "регламент",
        "note": "Регистрация и сигнализация по минимуму и максимуму",
    },
    {
        "tag": "LRSA 609В", "logic": "1oo1", "mechanism": "Запрет Н-7/Н-7А", "primary": True,
        "parameter": "Уровень Е-2, дублёр", "basis": "регламент",
        "note": "Менее 15% — запрет пуска насосов Н-7/Н-7А",
    },
    {
        "tag": "PRSA 213", "logic": "1oo1", "mechanism": "Отсечка топлива и пара К-2", "primary": True,
        "parameter": "Давление в колонне К-2", "basis": "регламент",
        "note": "1,0 кгс/см² — сигнализация, 1,5 кгс/см² — отсечение топлива и перегретого пара",
    },
    {
        "tag": "LRCA 604", "logic": "контроль", "mechanism": "Сигнализация уровня К-2", "primary": False,
        "parameter": "Уровень куба К-2", "basis": "регламент",
        "note": "Основной канал регистрации и сигнализации",
    },
    {
        "tag": "LRSA 604А", "logic": "1oo1", "mechanism": "Запрет Н-4/Н-32", "primary": True,
        "parameter": "Уровень куба К-2, дублёр А", "basis": "регламент",
        "note": "Менее 15% — запрет пуска насосов Н-4, Н-4А, Н-32, Н-32А",
    },
    {
        "tag": "LR 604В", "logic": "контроль", "mechanism": "Дублирующий контроль К-2", "primary": False,
        "parameter": "Уровень куба К-2, дублёр В", "basis": "регламент",
        "note": "Дублирующий уровнемер без отдельной блокировки",
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

    def rows(self, sensors: dict, startup_k2_prefill: bool = False) -> list[dict]:
        """Формирует строки панели ПАЗ с текущим аварийным статусом."""
        level = float(sensors.get("L_1", 0.0))
        pressure = float(sensors.get("P_1", 0.0))
        vacuum_pressure = float(sensors.get("P_vac", 0.0))
        vacuum_level = float(sensors.get("L_2", 50.0))
        e1_level = float(sensors.get("L_E1", 50.0))
        e2_level = float(sensors.get("L_E2", 50.0))

        alarms = {
            "LRCSA 603": e1_level < 15.0,
            "LRSA 603B": e1_level < 15.0,
            "PRSA 204": pressure >= COLUMN_PRES_ESD,
            "LRCA 602": level <= COLUMN_LEVEL_LOW or level >= COLUMN_LEVEL_HIGH,
            "LR 602А": level <= COLUMN_LEVEL_LOW or level >= COLUMN_LEVEL_HIGH,
            "LR 602В": level <= COLUMN_LEVEL_LOW or level >= COLUMN_LEVEL_HIGH,
            "LRCA 609": e2_level <= COLUMN_LEVEL_LOW or e2_level >= COLUMN_LEVEL_HIGH,
            "LRSA 609В": e2_level < 15.0,
            "PRSA 213": vacuum_pressure >= K2_PRESSURE_CRITICAL,
            "LRCA 604": (not startup_k2_prefill and vacuum_level <= K2_LEVEL_LOW) or vacuum_level >= K2_LEVEL_HIGH,
            "LRSA 604А": not startup_k2_prefill and vacuum_level < K2_LEVEL_LOW_INTERLOCK,
            "LR 604В": (not startup_k2_prefill and vacuum_level <= K2_LEVEL_LOW) or vacuum_level >= K2_LEVEL_HIGH,
        }

        return [
            {
                **definition,
                "bypassed": self.bypasses[definition["tag"]],
                "alarm": alarms[definition["tag"]],
            }
            for definition in INTERLOCK_DEFINITIONS
        ]
