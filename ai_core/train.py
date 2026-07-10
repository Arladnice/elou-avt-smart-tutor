import os
import sys
import random
import logging
import numpy as np
import torch
import torch.nn as nn
import torch.optim as optim

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
if ROOT_DIR not in sys.path:
    sys.path.append(ROOT_DIR)

from ai_core.config import (
    RANDOM_SEED, INPUT_DIM, HIDDEN_DIM, NUM_LAYERS, OUTPUT_DIM, DROPOUT,
    LEARNING_RATE, EPOCHS, BATCH_SIZE, SEQUENCE_LENGTH, FORECAST_HORIZON,
    TRAIN_VAL_SPLIT, DATASET_PATH, MODEL_PATH, SCALER_MIN, SCALER_MAX,
    OUT_MIN, OUT_MAX
)
from ai_core.predictive_engine import RiskLSTM

# Setup logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

def set_seeds(seed: int = RANDOM_SEED):
    """Фиксирует все генераторы для воспроизводимости обучения."""
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    if torch.cuda.is_available():
        torch.cuda.manual_seed_all(seed)

def normalize(data):
    """Нормализует входные данные (7 фичей) в диапазон [0, 1]."""
    return (data - SCALER_MIN) / (SCALER_MAX - SCALER_MIN + 1e-8)

def denormalize_output(data_norm):
    """Денормализует выходные данные (3 параметра прогноза)."""
    return data_norm * (OUT_MAX - OUT_MIN) + OUT_MIN

def train_lstm_model():
    """Выполняет обучение модели RiskLSTM."""
    set_seeds()

    if not os.path.exists(DATASET_PATH):
        logger.error("Файл датасета %s не найден. Сначала сгенерируйте данные.", DATASET_PATH)
        return False
        
    logger.info("Подготовка данных для обучения LSTM из %s...", DATASET_PATH)
    
    # Чтение 7 фичей из датасета
    FEATURE_INDICES = [1, 2, 3, 4, 5, 6, 7]
    
    data = []
    with open(DATASET_PATH, "r", encoding="utf-8") as f:
        lines = f.readlines()
        for line in lines[1:]:  # пропускаем заголовок
            parts = line.strip().split(",")
            row = [float(parts[idx]) for idx in FEATURE_INDICES]
            data.append(row)
            
    data = np.array(data, dtype=np.float32)
    logger.info("Прочитано строк: %d. Число фичей: %d", len(data), data.shape[1])
    
    # Нормализуем данные
    data_norm = normalize(data)
    
    # Позиции furnaceTemp, columnPres, columnLevel в data_norm
    TARGET_COLS = [4, 5, 6]
    
    X_list, y_list = [], []
    for i in range(len(data_norm) - SEQUENCE_LENGTH - FORECAST_HORIZON):
        X_list.append(data_norm[i : i + SEQUENCE_LENGTH])
        y_list.append(data_norm[i + SEQUENCE_LENGTH + FORECAST_HORIZON - 1, TARGET_COLS])
        
    X_all = np.array(X_list, dtype=np.float32)
    y_all = np.array(y_list, dtype=np.float32)
    
    # Разделение выборки
    split_idx = int(len(X_all) * TRAIN_VAL_SPLIT)
    X_train = torch.tensor(X_all[:split_idx], dtype=torch.float32)
    y_train = torch.tensor(y_all[:split_idx], dtype=torch.float32)
    X_val   = torch.tensor(X_all[split_idx:], dtype=torch.float32)
    y_val   = torch.tensor(y_all[split_idx:], dtype=torch.float32)
    
    logger.info("Обучающая выборка: %d окон | Валидационная: %d окон", X_train.shape[0], X_val.shape[0])
    
    # Создание модели
    model = RiskLSTM(
        input_dim=INPUT_DIM,
        hidden_dim=HIDDEN_DIM,
        seq_len=SEQUENCE_LENGTH,
        output_dim=OUTPUT_DIM,
        num_layers=NUM_LAYERS,
        dropout=DROPOUT
    )
    
    criterion = nn.MSELoss()
    optimizer = optim.Adam(model.parameters(), lr=LEARNING_RATE, weight_decay=1e-5)
    scheduler = optim.lr_scheduler.StepLR(optimizer, step_size=5, gamma=0.5)
    
    train_size = X_train.shape[0]
    logger.info("Запуск обучения модели RiskLSTM (hidden=%d, layers=%d)...", HIDDEN_DIM, NUM_LAYERS)
    
    for epoch in range(EPOCHS):
        model.train()
        permutation = torch.randperm(train_size)
        epoch_loss = 0.0
        
        for i in range(0, train_size, BATCH_SIZE):
            indices = permutation[i : i + BATCH_SIZE]
            batch_x, batch_y = X_train[indices], y_train[indices]
            optimizer.zero_grad()
            preds = model(batch_x)
            loss = criterion(preds, batch_y)
            loss.backward()
            optimizer.step()
            epoch_loss += loss.item() * batch_x.size(0)
            
        scheduler.step()
        train_mse = epoch_loss / train_size
        
        # Валидация
        model.eval()
        with torch.no_grad():
            val_preds = model(X_val)
            val_mse = criterion(val_preds, y_val).item()
            # MAE в реальных единицах
            val_pred_real = denormalize_output(val_preds.numpy())
            val_true_real = denormalize_output(y_val.numpy())
            mae_temp  = np.mean(np.abs(val_pred_real[:, 0] - val_true_real[:, 0]))
            mae_pres  = np.mean(np.abs(val_pred_real[:, 1] - val_true_real[:, 1]))
            mae_level = np.mean(np.abs(val_pred_real[:, 2] - val_true_real[:, 2]))
            
        logger.info(
            "Эпоха %02d/%02d | Train MSE: %.6f | Val MSE: %.6f | MAE: Temp=%.2f°C, Pres=%.4fМПа, Level=%.2f%%",
            epoch + 1, EPOCHS, train_mse, val_mse, mae_temp, mae_pres, mae_level
        )
        
    torch.save(model.state_dict(), MODEL_PATH)
    logger.info("Обучение завершено. Веса сохранены в: %s", MODEL_PATH)
    return True

if __name__ == "__main__":
    train_lstm_model()
