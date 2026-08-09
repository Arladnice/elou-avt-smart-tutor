"""
Параметры обучения. Только для офлайн-пайплайна — в рантайм не импортируется.

Гиперпараметры архитектуры и нормировку берём из установленного пакета
(elou_tutor.ml.settings), чтобы обучение и инференс не разъезжались.
"""

import os

_TRAINING_DIR = os.path.dirname(os.path.abspath(__file__))

DATASET_PATH = os.path.join(_TRAINING_DIR, "data", "telemetry_dataset.csv")
TEST_DATA_PATH = os.path.join(_TRAINING_DIR, "data", "test_data.npz")
MODEL_PATH = os.path.join(_TRAINING_DIR, "checkpoints", "lstm_model.pth")
REPORT_PATH = os.path.join(_TRAINING_DIR, "reports", "evaluation_report.md")

RANDOM_SEED = 42
DATASET_VERSION = "2026-08-08-v2"
GENERATOR_VERSION = "2.0"
LEARNING_RATE = 0.001
EPOCHS = 30
BATCH_SIZE = 128
TRAIN_SPLIT = 0.7
VAL_SPLIT = 0.15
TEST_SPLIT = 0.15
RISK_THRESHOLD = 50.0  # Порог бинаризации риска для метрик классификации

# Вес редких опасных состояний при обучении регрессии T/P/L. Модель остаётся
# регрессионной, но не «усредняет» критические хвосты из-за дисбаланса классов.
HAZARD_SAMPLE_WEIGHT = 6.0
