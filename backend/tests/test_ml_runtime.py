"""Рантайм-инференс: ONNX внутри пакета, torch-ветки нет."""

import inspect
import os

import numpy as np


def test_predictor_importable_and_predicts():
    from elou_tutor.ml.predictor import RiskPredictor

    predictor = RiskPredictor()
    window = np.tile(np.array([1.0, 0.0, 1.0, 280.0, 280.0, 0.25, 50.0]), (30, 1))
    predictions, risk = predictor.predict_risk(window, time_elapsed=100, scenario_id="shutdown")

    assert len(predictions) == 3
    assert 0.0 <= risk <= 100.0


def test_short_window_is_padded():
    """Окно короче SEQUENCE_LENGTH дополняется, а не отвергается."""
    from elou_tutor.ml.predictor import RiskPredictor
    from elou_tutor.ml.settings import SEQUENCE_LENGTH

    predictor = RiskPredictor()
    window = np.tile(np.array([1.0, 0.0, 1.0, 280.0, 280.0, 0.25, 50.0]), (SEQUENCE_LENGTH // 3, 1))
    predictions, risk = predictor.predict_risk(window, time_elapsed=100, scenario_id="shutdown")

    assert len(predictions) == 3
    assert 0.0 <= risk <= 100.0


def test_oversized_window_uses_latest_points():
    """
    Окно длиннее SEQUENCE_LENGTH не должно ронять предиктор.

    Раньше добивка вычисляла отрицательный срез и падала с ValueError.
    В проде это не проявлялось только потому, что simulation_loop режет
    историю до 30 точек — то есть защита держалась на вызывающей стороне.
    """
    from elou_tutor.ml.predictor import RiskPredictor
    from elou_tutor.ml.settings import SEQUENCE_LENGTH

    predictor = RiskPredictor()
    long_window = np.tile(
        np.array([1.0, 0.0, 1.0, 280.0, 280.0, 0.25, 50.0]), (SEQUENCE_LENGTH + 14, 1))
    predictions, risk = predictor.predict_risk(long_window, time_elapsed=100, scenario_id="shutdown")

    assert len(predictions) == 3
    assert 0.0 <= risk <= 100.0


def test_oversized_window_ignores_stale_head():
    """Берутся именно последние точки: старый хвост не должен влиять на прогноз."""
    from elou_tutor.ml.predictor import RiskPredictor
    from elou_tutor.ml.settings import SEQUENCE_LENGTH

    predictor = RiskPredictor()
    recent = np.tile(np.array([1.0, 0.0, 1.0, 280.0, 280.0, 0.25, 50.0]), (SEQUENCE_LENGTH, 1))
    stale = np.tile(np.array([0.0, 1.0, 0.0, 120.0, 120.0, 0.05, 5.0]), (20, 1))

    from_exact = predictor.predict_risk(recent, time_elapsed=100, scenario_id="shutdown")
    from_padded = predictor.predict_risk(
        np.vstack([stale, recent]), time_elapsed=100, scenario_id="shutdown")

    assert from_exact == from_padded


def test_torch_branch_removed():
    """torch отсутствует в зависимостях, поэтому ветка недостижима и удалена."""
    from elou_tutor.ml import predictor

    source = inspect.getsource(predictor)
    assert "import torch" not in source
    assert "lstm_model.pth" not in source


def test_onnx_artifact_is_package_data():
    from elou_tutor.ml import settings

    assert os.path.isfile(settings.ONNX_PATH), "model.onnx должен лежать внутри пакета"


def test_tutor_returns_four_values():
    from elou_tutor.tutor.analyzer import ErrorAnalyzer

    result = ErrorAnalyzer().evaluate_session(["V1_OPEN", "SP_UP", "V3_OPEN"], "startup")
    assert len(result) == 4
