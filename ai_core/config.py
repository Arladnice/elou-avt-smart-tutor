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

# === Physical Thresholds (from tech regulations) ===
FURNACE_TEMP_CRITICAL = 365.0     # °C (Прогар змеевика П-2, авария)
FURNACE_TEMP_WARNING = 340.0      # °C (Максимум для П-3)
COLUMN_TEMP_CRITICAL = 150.0      # °C (Максимум верха К-1)
FURNACE_TEMP_MIN_STARTUP = 280.0  # °C (Минимум при пуске)
FURNACE_TEMP_MAX_SHUTDOWN = 245.0 # °C (Максимум при останове)

COLUMN_PRES_CRITICAL = 0.60       # МПа (Разгерметизация)
COLUMN_PRES_ESD = 0.48            # МПа (Автоматическая блокировка ПАЗ)
COLUMN_PRES_WARNING = 0.40        # МПа (Предупреждение)
COLUMN_PRES_NORMAL_MAX = 0.45     # МПа
COLUMN_PRES_NORMAL_MIN = 0.10     # МПа

COLUMN_LEVEL_HIGH_CRITICAL = 98.0 # % (Полное переполнение)
COLUMN_LEVEL_HIGH = 85.0          # % (Предупреждение)
COLUMN_LEVEL_LOW = 18.0           # % (Предупреждение по низкому уровню)
COLUMN_LEVEL_LOW_INTERLOCK = 12.0 # % (3500 мм: Сработка ПАЗ / Блокировка насосов куба)
COLUMN_LEVEL_LOW_CRITICAL = 5.0   # % (Полное опустошение, сухой ход и авария)
COLUMN_LEVEL_LOW_CRITICAL_LEVEL = 8.0  # % (Критический уровень для эскалации алертов)
COLUMN_LEVEL_BALANCE_MIN = 20.0   # %
COLUMN_LEVEL_BALANCE_MAX = 80.0   # %

# === Timeouts & Duration Thresholds ===
STARTUP_MIN_TIME_SEC = 45         # Минимальное время сессии для стабилизации пуска
SESSION_MAX_TIME_SEC = 300        # Максимальное время сессии (5 минут)

# === Alert Escalation Thresholds ===
FURNACE_TEMP_CRITICAL_LEVEL = 350.0        # °C (Критический порог температуры печи для эскалации)
COLUMN_PRES_CRITICAL_LEVEL = 0.43          # МПа (Критический порог давления колонны для эскалации)
COLUMN_LEVEL_HIGH_CRITICAL_LEVEL = 90.0    # % (Критический верхний порог уровня куба для эскалации)
COLUMN_LEVEL_LOW_CRITICAL_LEVEL = 18.0     # % (Критический нижний порог уровня куба для эскалации)
ESCALATION_WARNING_DELAY_SEC = 30.0        # секунд (Время до предупреждения о бездействии оператора)
ESCALATION_CRITICAL_DELAY_SEC = 60.0       # секунд (Время до критической ошибки при бездействии оператора)

# === Physical Limits (Clamping & Bounds) ===
FURNACE_TEMP_MIN_LIMIT = 20.0       # °C (Холодная печь, абсолютный минимум)
FURNACE_TEMP_MAX_LIMIT = 600.0      # °C (Максимальная температура по шкале КИПиА)
COLUMN_PRES_MIN_LIMIT = 0.05        # МПа (Атмосферное давление)
COLUMN_PRES_MAX_LIMIT = 2.0         # МПа (Предельное давление по шкале датчиков)
COLUMN_LEVEL_MIN_LIMIT = 0.0        # % (Пустой куб)
COLUMN_LEVEL_MAX_LIMIT = 100.0      # % (Полный куб)

# === Initial State Physics Defaults ===
STARTUP_INITIAL_TEMP = 20.0         # °C
STARTUP_INITIAL_PRES = 0.05         # МПа
STARTUP_INITIAL_LEVEL = 0.0         # %
STARTUP_SETPOINT_TEMP = 240.0       # °C

NORMAL_INITIAL_TEMP = 280.0          # °C
NORMAL_INITIAL_PRES = 0.25          # МПа
NORMAL_INITIAL_LEVEL = 50.0         # %
NORMAL_SETPOINT_TEMP = 280.0        # °C

# === Process Timing & Dynamic Thresholds ===
STARTUP_HEATING_THRESHOLD_TEMP = 290.0   # °C (Выход печи на рабочий режим при пуске)
STARTUP_FILLING_TIME_LIMIT_SEC = 120     # с (Первичное заполнение колонны при пуске)
VALVE_ACTION_TIMEOUT_SEC = 15            # с (Время выдержки после открытия клапана)
ACCIDENT_NON_STARTUP_MIN_TIME_SEC = 40   # с (Защита от ложной аварии при запуске обычных сценариев)
ACCIDENT_STARTUP_MAX_TIME_SEC = 180      # с (Предельное время для заполнения куба при пуске)

# === Risk Engine Weights ===
RISK_WEIGHT_TEMP = 45.0             # % вклад температуры в риск
RISK_WEIGHT_PRES = 55.0             # % вклад давления в риск
RISK_WEIGHT_LEVEL = 20.0            # % вклад уровня в риск
RISK_PENALTY_NO_FEED = 12.5         # % штраф при закрытом V-1


