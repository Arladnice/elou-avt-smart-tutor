"""
Параметры рантайм-инференса модели риска.

Гиперпараметры архитектуры и нормировка должны совпадать с использованными
при обучении: офлайн-пайплайн импортирует этот же модуль.
"""

import os

import numpy as np

_ARTIFACTS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "artifacts")
ONNX_PATH = os.path.join(_ARTIFACTS_DIR, "model.onnx")

# Архитектура сети
INPUT_DIM = 7        # [V_1, V_2, V_3, T_1_Sp, T_1, P_1, L_1]
HIDDEN_DIM = 64
NUM_LAYERS = 2
OUTPUT_DIM = 3       # [T_1, P_1, L_1]
DROPOUT = 0.2
SEQUENCE_LENGTH = 30
FORECAST_HORIZON = 15

# Нормировка входа и выхода
SCALER_MIN = np.array([0.0, 0.0, 0.0, 100.0, 20.0, 0.02, 0.0], dtype=np.float32)
SCALER_MAX = np.array([1.0, 1.0, 1.0, 400.0, 600.0, 1.5, 100.0], dtype=np.float32)
OUT_MIN = np.array([20.0, 0.02, 0.0], dtype=np.float32)
OUT_MAX = np.array([600.0, 1.5, 100.0], dtype=np.float32)

# Веса риск-движка
RISK_WEIGHT_TEMP = 45.0
RISK_WEIGHT_PRES = 55.0
RISK_WEIGHT_LEVEL = 20.0
RISK_PENALTY_NO_FEED = 12.5
