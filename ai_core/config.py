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
TRAIN_VAL_SPLIT = 0.8

# === Normalization Constants ===
# [valve_V1, valve_V2, valve_V3, furnaceTempSp, furnaceTemp, columnPres, columnLevel]
SCALER_MIN = np.array([0.0,  0.0,  0.0,  100.0, 20.0,  0.02, 0.0  ], dtype=np.float32)
SCALER_MAX = np.array([1.0,  1.0,  1.0,  400.0, 600.0, 1.5,  100.0], dtype=np.float32)

# Output normalization (3 predicted parameters: furnaceTemp, columnPres, columnLevel)
OUT_MIN = np.array([20.0, 0.02, 0.0  ], dtype=np.float32)
OUT_MAX = np.array([600.0, 1.5, 100.0], dtype=np.float32)

# === Physical Thresholds (from tech regulations) ===
FURNACE_TEMP_CRITICAL = 380.0     # °C (Прогар змеевика, авария)
FURNACE_TEMP_WARNING = 310.0      # °C (Коксование)
FURNACE_TEMP_MIN_STARTUP = 280.0  # °C (Минимум при пуске)
FURNACE_TEMP_MAX_SHUTDOWN = 245.0 # °C (Максимум при останове)

COLUMN_PRES_CRITICAL = 0.60       # МПа (Разгерметизация)
COLUMN_PRES_ESD = 0.48            # МПа (Автоматическая блокировка ПАЗ)
COLUMN_PRES_WARNING = 0.40        # МПа (Предупреждение)
COLUMN_PRES_NORMAL_MAX = 0.45     # МПа
COLUMN_PRES_NORMAL_MIN = 0.10     # МПа

COLUMN_LEVEL_HIGH_CRITICAL = 98.0 # % (Полное переполнение)
COLUMN_LEVEL_HIGH = 85.0          # % (Предупреждение)
COLUMN_LEVEL_LOW = 15.0           # % (Предупреждение)
COLUMN_LEVEL_LOW_CRITICAL = 5.0   # % (Срыв насосов куба)
COLUMN_LEVEL_BALANCE_MIN = 20.0   # %
COLUMN_LEVEL_BALANCE_MAX = 80.0   # %

# Timeouts
STARTUP_MIN_TIME_SEC = 45         # Минимальное время сессии для стабилизации пуска
SESSION_MAX_TIME_SEC = 300        # Максимальное время сессии (5 минут)
