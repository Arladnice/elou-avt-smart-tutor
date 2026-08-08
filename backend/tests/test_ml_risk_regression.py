"""Регрессия дефекта: ONNX-прогноз перегрева не должен обрезаться уставкой."""

import numpy as np


def test_onnx_overheat_forecast_raises_risk_despite_lower_current_setpoint():
    """Упреждающий прогноз критического T-1 должен давать alarm до аварии."""
    from elou_tutor.domain.process_limits import FURNACE_TEMP_CRITICAL_LEVEL
    from elou_tutor.ml.predictor import RiskPredictor

    predictor = RiskPredictor()
    predictor.use_fallback = False
    predictor.use_onnx = True
    predictor.predict_parameters = lambda _window: ([FURNACE_TEMP_CRITICAL_LEVEL + 5.0, 0.25, 50.0], True)
    window = np.tile(np.array([1.0, 0.0, 1.0, 280.0, 300.0, 0.25, 50.0]), (30, 1))

    predictions, risk = predictor.predict_risk(window, time_elapsed=80, scenario_id="startup")

    assert predictions[0] >= FURNACE_TEMP_CRITICAL_LEVEL
    assert risk == 100.0
