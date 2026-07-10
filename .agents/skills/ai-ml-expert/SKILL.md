---
name: ai-ml-expert
description: |
  Use when working with files in ai_core/ directory: neural networks, LSTM model, ONNX export, DTW comparison,
  error analysis, risk prediction, synthetic data generation, telemetry dataset.
  Covers: PyTorch training, ONNX inference, reproducibility, hyperparameter management, metrics logging.
---

# AI/ML Expert — ЭЛОУ-АВТ Smart Tutor

Specialized skill for working with the project's AI/ML module (`ai_core/` directory).

## 🎯 Tech Stack

| Technology | Usage |
|---|---|
| PyTorch | LSTM model training |
| ONNX Runtime | Lightweight inference without PyTorch dependency |
| NumPy | Data processing, normalization, DTW |
| Python 3.11+ | Runtime |

---

## 📂 Module Structure

```
ai_core/
├── config.py               # Hyperparameters, normalization constants, thresholds
├── predictive_engine.py     # INFERENCE ONLY: RiskPredictor class, ONNX/PyTorch loading
├── error_analyzer.py        # ErrorAnalyzer: DTW comparison, regulation checks
├── data_generator.py        # Synthetic telemetry dataset generation
├── train.py                 # TRAINING ONLY: training loop, validation, checkpointing
├── export_onnx.py           # ONNX export with smoke-test validation
├── model.onnx               # Exported ONNX model
├── model.onnx.data          # ONNX model weights
├── lstm_model.pth           # PyTorch checkpoint (training only)
└── telemetry_dataset.csv    # Generated synthetic telemetry dataset
```

### Separation of Concerns
| File | Contains | Must NOT contain |
|---|---|---|
| `predictive_engine.py` | Model loading, inference, predict_risk() | Training loop, optimizer, DataLoader |
| `train.py` | Training loop, loss calculation, checkpointing | Inference API, risk calculation |
| `error_analyzer.py` | DTW analysis, regulation checks, scoring | Model training, raw inference |
| `config.py` | All constants, hyperparams, thresholds | Business logic, model code |

---

## 📋 Checklist: Before Editing AI/ML Code

```markdown
- [ ] Training and inference code are in SEPARATE files
- [ ] All hyperparameters defined in config.py (not hardcoded in functions)
- [ ] Normalization constants (SCALER_MIN/MAX) in config.py
- [ ] Random seeds set at start of training: random.seed(), np.random.seed(), torch.manual_seed()
- [ ] Training loop logs: epoch, train_loss, val_loss, MAE per epoch
- [ ] ONNX export includes smoke-test (load + dummy inference)
- [ ] All physical thresholds use named constants, not magic numbers
- [ ] Every class and public method has a docstring
- [ ] predict_risk() returns risk in range [0, 100]
```

---

## 🧠 LSTM Architecture

The project uses a 2-layer LSTM for predicting furnace temperature, column pressure, and column level:

```
Input: 7 features × 30 timesteps (sliding window)
┌──────────────────────────────────────────┐
│ Features:                                │
│  [V1, V2, V3,           ← valve states   │
│   furnaceTempSp,        ← setpoint       │
│   furnaceTemp,          ← T-1 sensor     │
│   columnPres,           ← P-1 sensor     │
│   columnLevel]          ← L-1 sensor     │
└──────────────────────────────────────────┘
         ↓
   LSTM(input=7, hidden=64, layers=2, dropout=0.2)
         ↓
   Linear(64 → 3)
         ↓
┌──────────────────────────────────────────┐
│ Output: 3 predicted values               │
│  [furnaceTemp_next,                      │
│   columnPres_next,                       │
│   columnLevel_next]                      │
└──────────────────────────────────────────┘
```

---

## 🔧 Pattern: config.py

```python
# ai_core/config.py
import numpy as np

# === Reproducibility ===
RANDOM_SEED = 42

# === Model Architecture ===
INPUT_DIM = 7       # Number of input features
HIDDEN_DIM = 64     # LSTM hidden state size
NUM_LAYERS = 2      # Number of LSTM layers
OUTPUT_DIM = 3      # Predicted parameters: T, P, L
DROPOUT = 0.2       # Dropout rate

# === Training ===
LEARNING_RATE = 0.001
EPOCHS = 150
BATCH_SIZE = 32
SEQUENCE_LENGTH = 30  # Sliding window size (seconds)
TRAIN_VAL_SPLIT = 0.8

# === Normalization (7 input features) ===
# [V1, V2, V3, furnaceTempSp, furnaceTemp, columnPres, columnLevel]
SCALER_MIN = np.array([0.0,  0.0,  0.0,  100.0, 20.0,  0.02, 0.0])
SCALER_MAX = np.array([1.0,  1.0,  1.0,  400.0, 600.0, 1.5,  100.0])

# Output normalization (3 predicted values)
OUT_MIN = np.array([20.0, 0.02, 0.0])
OUT_MAX = np.array([600.0, 1.5, 100.0])

# === Physical Thresholds (from tech regulations) ===
FURNACE_TEMP_CRITICAL = 380.0   # °C — аварийный останов
FURNACE_TEMP_WARNING = 310.0    # °C — предупреждение (коксование)
FURNACE_TEMP_NORMAL = 280.0     # °C — рабочий режим
COLUMN_PRES_CRITICAL = 0.6      # МПа — аварийный останов
COLUMN_PRES_WARNING = 0.4       # МПа — предупреждение
COLUMN_PRES_ESD = 0.48          # МПа — автоматическая блокировка ПАЗ
COLUMN_LEVEL_HIGH = 90.0        # % — предел переполнения
COLUMN_LEVEL_LOW = 10.0         # % — предел осушения
```

---

## 🔧 Pattern: Training with Metrics Logging

```python
# ai_core/train.py
import logging
import random
import numpy as np
import torch
from config import RANDOM_SEED, LEARNING_RATE, EPOCHS, BATCH_SIZE

logger = logging.getLogger(__name__)

def set_seeds(seed: int = RANDOM_SEED):
    """Фиксирует все генераторы для воспроизводимости обучения."""
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    if torch.cuda.is_available():
        torch.cuda.manual_seed_all(seed)

def train():
    set_seeds()
    # ... model, optimizer, dataloader setup ...
    
    for epoch in range(EPOCHS):
        train_loss = 0.0
        # ... training step ...
        
        logger.info(
            "Epoch %03d/%03d | Train Loss: %.6f | Val Loss: %.6f | MAE: %.4f",
            epoch + 1, EPOCHS, train_loss, val_loss, mae
        )
    
    torch.save(model.state_dict(), "lstm_model.pth")
    logger.info("Model saved. Final train loss: %.6f", train_loss)
```

---

## 🔧 Pattern: ONNX Export with Smoke-Test

```python
# ai_core/export_onnx.py
import logging
import os
import numpy as np
import torch
import onnxruntime as ort

logger = logging.getLogger(__name__)

def export_and_validate(model, onnx_path: str):
    """Экспортирует модель в ONNX и выполняет smoke-test."""
    dummy_input = torch.randn(1, 30, 7)  # batch=1, seq=30, features=7
    torch.onnx.export(model, dummy_input, onnx_path, input_names=["input"], output_names=["output"])
    
    file_size_mb = os.path.getsize(onnx_path) / (1024 * 1024)
    logger.info("ONNX model exported: %s (%.2f MB)", onnx_path, file_size_mb)
    
    # Smoke-test: загрузка и инференс на dummy-данных
    session = ort.InferenceSession(onnx_path)
    dummy_np = np.random.randn(1, 30, 7).astype(np.float32)
    result = session.run(None, {"input": dummy_np})
    
    assert result[0].shape == (1, 3), f"Unexpected output shape: {result[0].shape}"
    logger.info("ONNX smoke-test PASSED. Output shape: %s", result[0].shape)
```

---

## 📊 DTW (Dynamic Time Warping) in ErrorAnalyzer

The `ErrorAnalyzer` compares operator's action sequence against golden reference sequences using DTW:

### Golden Sequences (from tech regulations)
| Scenario | Reference Action Sequence |
|---|---|
| `startup` | `V1_OPEN → SP_UP → V3_OPEN` |
| `shutdown` | `SP_DOWN → V2_OPEN → V1_CLOSE` |
| `column_shutdown` | `SP_DOWN → V1_CLOSE → V3_CLOSE` |
| `overpressure_relief` | `V2_OPEN → SP_DOWN` |
| `recirculation` | `SP_DOWN → V3_CLOSE → V2_OPEN` |

### Scoring Formula
- **DTW distance** measures how far the operator's actions deviate from the reference.
- **Regulatory violations** (e.g., dry heating, overpressure) deduct fixed penalty points.
- **Final score** = max(0, 100 - dtw_penalty - violation_penalties).

---

## 🚫 Anti-Patterns

1. **No training code in inference modules** — Keep `train.py` and `predictive_engine.py` separate.
2. **No hardcoded hyperparameters** — All values in `config.py`.
3. **No magic numbers** — Use named constants for ALL thresholds.
4. **No silent training** — Every epoch MUST log metrics.
5. **No ONNX export without smoke-test** — Always validate after export.
6. **No `print()`** — Use `logging.getLogger(__name__)`.
