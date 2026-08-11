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


def test_startup_heating_does_not_flash_critical_risk_from_single_forecast():
    """Резкий штатный разогрев до уставки не является аварией сам по себе."""
    from elou_tutor.domain.process_limits import FURNACE_TEMP_CRITICAL_LEVEL
    from elou_tutor.ml.predictor import RiskPredictor

    predictor = RiskPredictor()
    predictor.use_fallback = False
    predictor.use_onnx = True
    predictor.predict_parameters = lambda _window: ([FURNACE_TEMP_CRITICAL_LEVEL + 15.0, 0.14, 33.0], True)
    window = np.tile(np.array([1.0, 0.0, 1.0, 303.0, 298.0, 0.14, 33.0]), (30, 1))

    _, risk = predictor.predict_risk(window, time_elapsed=195, scenario_id="startup")

    assert risk < 30.0


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


def test_column_shutdown_target_level_does_not_raise_artificial_risk():
    """L-1 16–20% — штатная контрольная точка останова, не предавария."""
    from elou_tutor.ml.predictor import RiskPredictor

    predictor = RiskPredictor()
    predictor.predict_parameters = lambda _window: ([140.0, 0.05, 17.5], True)
    window = np.tile(np.array([0.0, 0.0, 1.0, 140.0, 140.0, 0.05, 17.5]), (30, 1))

    _, risk = predictor.predict_risk(window, time_elapsed=120, scenario_id="column_shutdown")

    assert risk == 0.0
