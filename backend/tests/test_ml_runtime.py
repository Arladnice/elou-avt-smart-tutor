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
