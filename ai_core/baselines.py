"""
Baseline-модели для оценки эффективности ML-алгоритмов.
Использует пороговые правила из техрегламента (config.py) для прогнозирования аварийного риска.
"""

import numpy as np
from ai_core.config import (
    FURNACE_TEMP_WARNING, FURNACE_TEMP_CRITICAL,
    COLUMN_PRES_WARNING, COLUMN_PRES_ESD,
    COLUMN_LEVEL_HIGH, COLUMN_LEVEL_LOW,
    OUT_MIN, OUT_MAX
)

class ThresholdBaselinePredictor:
    """
    Пороговый baseline-предиктор на основе физико-химического регламента.
    Сравнивает последние известные значения параметров окна с аварийными уставками.
    """
    def __init__(self, risk_threshold: float = 50.0):
        self.risk_threshold = risk_threshold

    def predict_risk_from_denorm(self, denorm_values: np.ndarray) -> np.ndarray:
        """
        Принимает массивы истинных/прогнозируемых значений в реальных единицах:
        denorm_values shape: (N, 3) -> [temp, pres, level].
        Возвращает массив рисков в %: shape (N,).
        """
        temps  = denorm_values[:, 0]
        press  = denorm_values[:, 1]
        levels = denorm_values[:, 2]

        risks = np.zeros(len(denorm_values), dtype=np.float32)

        # 1. По температуре печи
        temp_mask = temps > FURNACE_TEMP_WARNING
        risks[temp_mask] += (temps[temp_mask] - FURNACE_TEMP_WARNING) / (FURNACE_TEMP_CRITICAL - FURNACE_TEMP_WARNING) * 45.0

        # 2. По давлению колонны
        pres_mask = press > 0.30
        risks[pres_mask] += (press[pres_mask] - 0.30) / (0.48 - 0.30) * 55.0

        # 3. По уровню колонны
        high_level = levels > COLUMN_LEVEL_HIGH
        risks[high_level] += (levels[high_level] - COLUMN_LEVEL_HIGH) / 15.0 * 20.0

        low_level = levels < COLUMN_LEVEL_LOW
        risks[low_level] += (COLUMN_LEVEL_LOW - levels[low_level]) / COLUMN_LEVEL_LOW * 20.0

        return np.clip(risks, 0.0, 100.0)

    def predict_binary(self, denorm_values: np.ndarray) -> np.ndarray:
        """Возвращает бинарную метку аварийности (1 - аварийный риск >= risk_threshold, 0 - норма)."""
        risks = self.predict_risk_from_denorm(denorm_values)
        return (risks >= self.risk_threshold).astype(int)
