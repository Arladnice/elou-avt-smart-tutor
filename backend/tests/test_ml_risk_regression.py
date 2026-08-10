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


def test_startup_low_level_has_no_fixed_risk_while_feed_is_open():
    """Штатное заполнение К-1 до 120 с не должно давать фиксированные 15%."""
    from elou_tutor.ml.predictor import RiskPredictor

    predictor = RiskPredictor()
    predictor.predict_parameters = lambda _window: ([240.0, 0.05, 0.0], True)
    window = np.tile(np.array([1.0, 0.0, 0.0, 240.0, 240.0, 0.05, 0.0]), (30, 1))

    _, risk = predictor.predict_risk(window, time_elapsed=120, scenario_id="startup")

    assert risk == 0.0


def test_startup_low_level_risk_grows_only_after_filling_deadline():
    """Незаполненная К-1 после 120 с должна начать повышать оценку риска."""
    from elou_tutor.ml.predictor import RiskPredictor

    predictor = RiskPredictor()
    predictor.predict_parameters = lambda _window: ([240.0, 0.05, 0.0], True)
    window = np.tile(np.array([1.0, 0.0, 0.0, 240.0, 240.0, 0.05, 0.0]), (30, 1))

    _, risk = predictor.predict_risk(window, time_elapsed=121, scenario_id="startup")

    assert risk > 15.0
