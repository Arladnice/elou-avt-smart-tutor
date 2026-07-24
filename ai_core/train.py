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
    TRAIN_SPLIT, VAL_SPLIT, TEST_SPLIT, DATASET_PATH, MODEL_PATH,
    SCALER_MIN, SCALER_MAX, OUT_MIN, OUT_MAX, BASE_DIR
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

def build_windows_from_sessions(session_dict, session_ids):
    """Строит окна X и y строго в пределах каждой сессии (без утечки данных)."""
    X_list, y_list = [], []
    TARGET_COLS = [4, 5, 6]  # [furnaceTemp, columnPres, columnLevel]
    
    for sid in session_ids:
        raw_rows = np.array(session_dict[sid], dtype=np.float32)
        if len(raw_rows) < SEQUENCE_LENGTH + FORECAST_HORIZON:
            continue
        norm_rows = normalize(raw_rows)
        for i in range(len(norm_rows) - SEQUENCE_LENGTH - FORECAST_HORIZON + 1):
            X_list.append(norm_rows[i : i + SEQUENCE_LENGTH])
            y_list.append(norm_rows[i + SEQUENCE_LENGTH + FORECAST_HORIZON - 1, TARGET_COLS])
            
    if not X_list:
        return np.empty((0, SEQUENCE_LENGTH, INPUT_DIM), dtype=np.float32), np.empty((0, OUTPUT_DIM), dtype=np.float32)
    return np.array(X_list, dtype=np.float32), np.array(y_list, dtype=np.float32)

def train_lstm_model():
    """Выполняет обучение модели RiskLSTM с разделением на Train/Val/Test по сессиям."""
    set_seeds()

    if not os.path.exists(DATASET_PATH):
        logger.error("Файл датасета %s не найден. Сначала сгенерируйте данные.", DATASET_PATH)
        return False
        
    logger.info("Подготовка сессионных данных для обучения из %s...", DATASET_PATH)
    
    # Чтение сессий из датасета (session_id=0, фичи 2..8)
    FEATURE_INDICES = [2, 3, 4, 5, 6, 7, 8]
    session_dict = {}
    
    with open(DATASET_PATH, "r", encoding="utf-8") as f:
        lines = f.readlines()
        for line in lines[1:]:  # пропускаем заголовок
            parts = line.strip().split(",")
            sid = int(parts[0])
            row = [float(parts[idx]) for idx in FEATURE_INDICES]
            if sid not in session_dict:
                session_dict[sid] = []
            session_dict[sid].append(row)
            
    session_ids = list(session_dict.keys())
    logger.info("Всего прочитано сессий: %d, строк: %d", len(session_ids), sum(len(v) for v in session_dict.values()))
    
    # Разделение по session_id (70% Train / 15% Val / 15% Test)
    n_sessions = len(session_ids)
    train_end = int(n_sessions * TRAIN_SPLIT)
    val_end = int(n_sessions * (TRAIN_SPLIT + VAL_SPLIT))
    
    train_sids = session_ids[:train_end]
    val_sids   = session_ids[train_end:val_end]
    test_sids  = session_ids[val_end:]
    
    X_train_np, y_train_np = build_windows_from_sessions(session_dict, train_sids)
    X_val_np, y_val_np     = build_windows_from_sessions(session_dict, val_sids)
    X_test_np, y_test_np   = build_windows_from_sessions(session_dict, test_sids)
    
    logger.info("Окна — Train: %d | Val: %d | Test: %d", X_train_np.shape[0], X_val_np.shape[0], X_test_np.shape[0])
    
    # Сохраняем непересекающийся Test Set для модуля evaluate.py (GAP-3)
    test_path = os.path.join(BASE_DIR, "test_data.npz")
    np.savez_compressed(test_path, X_test=X_test_np, y_test=y_test_np)
    logger.info("Тестовая выборка сохранена в: %s", test_path)
    
    X_train = torch.tensor(X_train_np, dtype=torch.float32)
    y_train = torch.tensor(y_train_np, dtype=torch.float32)
    X_val   = torch.tensor(X_val_np, dtype=torch.float32)
    y_val   = torch.tensor(y_val_np, dtype=torch.float32)
    
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
        
        model.eval()
        with torch.no_grad():
            val_preds = model(X_val)
            val_mse = criterion(val_preds, y_val).item()
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
