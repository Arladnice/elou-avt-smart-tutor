"""Физическая динамика вакуумной колонны К-2 для учебного симулятора."""

from dataclasses import dataclass

from elou_tutor.domain.process_limits import (
    K2_COOLING_FULL_C_PER_SEC,
    K2_LEVEL_LOW_INTERLOCK,
    K2_LEVEL_RESPONSE_DELAY_SEC,
    K2_LEVEL_RISE_PCT_PER_SEC,
    K2_PRESSURE_MAX_LIMIT,
    K2_PRESSURE_NORMAL,
    K2_PRESSURE_RISE_MPA_PER_SEC,
    K2_TEMP_MAX_LIMIT,
    K2_TEMP_MIN_LIMIT,
    K2_TEMP_NORMAL,
)


@dataclass
class K2Dynamics:
    """Рассчитывает уровень (%), давление (МПа) и температуру (°C) К-2.

    Базовые скорости взяты из расчёта инженера АСУ ТП Андрея. Ускорение
    учебного процесса выполняется общим ``speed_multiplier`` сессии, поэтому
    внутри модели физические соотношения не искажаются отдельными множителями.
    """

    outflow_failure_seconds: int = 0

    def reset(self) -> None:
        """Сбрасывает транспортное запаздывание уровня К-2, секунд."""
        self.outflow_failure_seconds = 0

    def step(
        self,
        *,
        level: float,
        pressure: float,
        temperature: float,
        feed_open: bool,
        outflow_available: bool,
        vacuum_available: bool,
        heat_available: bool,
    ) -> tuple[float, float, float]:
        """Выполняет одну физическую секунду модели К-2.

        Уровень задаётся в процентах шкалы 4000 мм, давление — в МПа,
        температура — в °C. При низком уровне откачка блокируется согласно
        HAZOP, а при потере откачки рост уровня появляется через 45 секунд.
        """
        inflow = K2_LEVEL_RISE_PCT_PER_SEC if feed_open else 0.0
        pumps_permitted = outflow_available and level > K2_LEVEL_LOW_INTERLOCK
        outflow = K2_LEVEL_RISE_PCT_PER_SEC if pumps_permitted else 0.0

        if feed_open and not outflow_available:
            self.outflow_failure_seconds += 1
            if self.outflow_failure_seconds <= K2_LEVEL_RESPONSE_DELAY_SEC:
                inflow = 0.0
        else:
            self.outflow_failure_seconds = 0

        next_level = max(0.0, min(100.0, level + inflow - outflow))

        if vacuum_available:
            recovery_rate = K2_PRESSURE_RISE_MPA_PER_SEC * 2.0
            next_pressure = max(K2_PRESSURE_NORMAL, pressure - recovery_rate)
        else:
            next_pressure = min(
                K2_PRESSURE_MAX_LIMIT,
                pressure + K2_PRESSURE_RISE_MPA_PER_SEC,
            )

        if not heat_available:
            # При половине куба скорость охлаждения вдвое выше, чем при полном.
            inventory_fraction = max(0.5, next_level / 100.0)
            cooling_rate = K2_COOLING_FULL_C_PER_SEC / inventory_fraction
            next_temperature = temperature - cooling_rate
        elif not vacuum_available:
            # Потеря вакуума ухудшает испарение и медленно перегревает мазут.
            next_temperature = temperature + 0.02
        else:
            correction = max(-0.02, min(0.02, K2_TEMP_NORMAL - temperature))
            next_temperature = temperature + correction

        next_temperature = max(
            K2_TEMP_MIN_LIMIT,
            min(K2_TEMP_MAX_LIMIT, next_temperature),
        )
        return next_level, next_pressure, next_temperature

    def get_snapshot(self) -> dict[str, int]:
        """Возвращает внутреннее состояние транспортного запаздывания."""
        return {"outflow_failure_seconds": self.outflow_failure_seconds}

    def load_snapshot(self, snapshot: dict[str, int]) -> None:
        """Восстанавливает внутреннее состояние из снапшота сессии."""
        self.outflow_failure_seconds = max(
            0,
            int(snapshot.get("outflow_failure_seconds", 0)),
        )
