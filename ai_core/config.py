import os
import numpy as np

# === Paths ===
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, "lstm_model.pth")
ONNX_PATH = os.path.join(BASE_DIR, "model.onnx")
DATASET_PATH = os.path.join(BASE_DIR, "telemetry_dataset.csv")

# === Reproducibility ===
RANDOM_SEED = 42

# === Model Architecture ===
INPUT_DIM = 7        # [valve_V1, valve_V2, valve_V3, furnaceTempSp, furnaceTemp, columnPres, columnLevel]
HIDDEN_DIM = 64
NUM_LAYERS = 2
OUTPUT_DIM = 3       # [furnaceTemp, columnPres, columnLevel]
DROPOUT = 0.2
SEQUENCE_LENGTH = 30
FORECAST_HORIZON = 15

# === Training Parameters ===
LEARNING_RATE = 0.001
EPOCHS = 15
BATCH_SIZE = 128
TRAIN_SPLIT = 0.7
VAL_SPLIT = 0.15
TEST_SPLIT = 0.15
RISK_THRESHOLD = 50.0  # Порог бинаризации риска для метрик классификации (>=50% = аварийная ситуация)

# === Normalization Constants ===
# [valve_V1, valve_V2, valve_V3, furnaceTempSp, furnaceTemp, columnPres, columnLevel]
SCALER_MIN = np.array([0.0,  0.0,  0.0,  100.0, 20.0,  0.02, 0.0  ], dtype=np.float32)
SCALER_MAX = np.array([1.0,  1.0,  1.0,  400.0, 600.0, 1.5,  100.0], dtype=np.float32)

# Output normalization (3 predicted parameters: furnaceTemp, columnPres, columnLevel)
OUT_MIN = np.array([20.0, 0.02, 0.0  ], dtype=np.float32)
OUT_MAX = np.array([600.0, 1.5, 100.0], dtype=np.float32)

# === Risk Engine Weights ===
RISK_WEIGHT_TEMP = 45.0             # % вклад температуры в риск
RISK_WEIGHT_PRES = 55.0             # % вклад давления в риск
RISK_WEIGHT_LEVEL = 20.0            # % вклад уровня в риск
RISK_PENALTY_NO_FEED = 12.5         # % штраф при закрытом V-1


