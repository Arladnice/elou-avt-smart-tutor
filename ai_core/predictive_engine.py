import os
import sys
import numpy as np

# Пытаемся импортировать torch для обучения и инференса нейросети
try:
    import torch
    import torch.nn as nn
    import torch.optim as optim
    HAS_TORCH = True
except ImportError:
    HAS_TORCH = False

# Пытаемся импортировать onnxruntime для легкого инференса
try:
    import onnxruntime as ort
    HAS_ONNX = True
except ImportError:
    HAS_ONNX = False

MODEL_PATH = os.path.join(os.path.dirname(__file__), "lstm_model.pth")
ONNX_PATH = os.path.join(os.path.dirname(__file__), "model.onnx")
DATASET_PATH = os.path.join(os.path.dirname(__file__), "telemetry_dataset.csv")

# Константы нормирования для 7 фичей:
# [valve_V1, valve_V2, valve_V3, furnaceTempSp, furnaceTemp, columnPres, columnLevel]
INPUT_DIM = 7
SCALER_MIN = np.array([0.0,  0.0,  0.0,  100.0, 20.0,  0.02, 0.0  ])
SCALER_MAX = np.array([1.0,  1.0,  1.0,  400.0, 600.0, 1.5,  100.0])

# Нормирование для выхода (только 3 прогнозируемых параметра)
OUT_MIN = np.array([20.0, 0.02, 0.0  ])
OUT_MAX = np.array([600.0, 1.5, 100.0])

def normalize(data):
    """Нормализует входные данные (7 фичей) в диапазон [0, 1]."""
    return (data - SCALER_MIN) / (SCALER_MAX - SCALER_MIN + 1e-8)

def denormalize_output(data_norm):
    """Денормализует выходные данные (3 параметра прогноза)."""
    return data_norm * (OUT_MAX - OUT_MIN) + OUT_MIN

# -------------------------------------------------------------
# Архитектура модели LSTM в PyTorch
# -------------------------------------------------------------
if HAS_TORCH:
    class RiskLSTM(nn.Module):
        """
        Двухслойная LSTM для прогнозирования телеметрии ЭЛОУ-АВТ.
        Вход: 7 фичей (клапаны + уставка + temp/pres/level).
        Выход: 3 параметра через 15 секунд (temp, pres, level).
        """
        def __init__(self, input_dim=INPUT_DIM, hidden_dim=64, seq_len=30, output_dim=3, num_layers=2, dropout=0.2):
            super(RiskLSTM, self).__init__()
            self.hidden_dim = hidden_dim
            self.seq_len = seq_len
            
            # 2-слойный LSTM с Dropout для регуляризации
            self.lstm = nn.LSTM(
                input_dim, hidden_dim,
                batch_first=True,
                num_layers=num_layers,
                dropout=dropout if num_layers > 1 else 0.0
            )
            self.dropout = nn.Dropout(dropout)
            # Полносвязный слой: прогноз [temp, pres, level] на t+15с
            self.fc = nn.Linear(hidden_dim, output_dim)
            
        def forward(self, x):
            # x shape: (batch, seq_len, input_dim)
            lstm_out, _ = self.lstm(x)
            # Берем последний временной шаг
            last_out = lstm_out[:, -1, :]
            last_out = self.dropout(last_out)
            out = self.fc(last_out)
            return out
else:
    class RiskLSTM:
        def __init__(self, *args, **kwargs):
            pass

# -------------------------------------------------------------
# Функция обучения модели
# -------------------------------------------------------------
def train_lstm_model(epochs=15, batch_size=128):
    if not HAS_TORCH:
        print("Ошибка: PyTorch не установлен в системе. Обучение нейросети невозможно.")
        return False
        
    if not os.path.exists(DATASET_PATH):
        print(f"Ошибка: файл датасета {DATASET_PATH} не найден. Сначала сгенерируйте данные.")
        return False
        
    print("Подготовка данных для обучения LSTM (7 фичей)...")
    
    # Чтение 7 фичей из датасета:
    # [valve_V1, valve_V2, valve_V3, furnaceTempSp, furnaceTemp, columnPres, columnLevel]
    # Индексы в CSV: 1, 2, 3, 4, 5, 6, 7
    FEATURE_INDICES = [1, 2, 3, 4, 5, 6, 7]  # все 7 входных признаков
    OUTPUT_INDICES  = [4, 5, 6]              # выход: furnaceTemp(5), columnPres(6), columnLevel(7)
    # Примечание: OUTPUT_INDICES в data — это колонки 4,5,6 (furnaceTemp=4, pres=5, level=6)
    # поскольку data строится только из FEATURE_INDICES (7 колонок, 0-индекс)
    # furnaceTemp -> позиция 4, columnPres -> 5, columnLevel -> 6
    
    data = []
    with open(DATASET_PATH, "r", encoding="utf-8") as f:
        lines = f.readlines()
        for line in lines[1:]:  # пропускаем заголовок
            parts = line.strip().split(",")
            row = [float(parts[idx]) for idx in FEATURE_INDICES]
            data.append(row)
            
    data = np.array(data, dtype=np.float32)
    print(f"Прочитано строк: {len(data)}. Фичей: {data.shape[1]}")
    
    # Нормализуем всю матрицу данных (7 фичей)
    data_norm = normalize(data)
    
    # Нормализуем целевые значения (только 3 выходных: temp, pres, level)
    # Позиции в нормализованной data: furnaceTemp=4, columnPres=5, columnLevel=6
    TARGET_COLS = [4, 5, 6]  # позиции furnaceTemp, columnPres, columnLevel в data_norm
    
    # Формируем выборку: X — окно 30 шагов (7 фичей), y — 3 параметра через 15 шагов
    seq_len = 30
    forecast_horizon = 15
    
    X_list, y_list = [], []
    for i in range(len(data_norm) - seq_len - forecast_horizon):
        X_list.append(data_norm[i : i + seq_len])                            # (30, 7)
        y_list.append(data_norm[i + seq_len + forecast_horizon - 1, TARGET_COLS])  # (3,)
        
    X_all = np.array(X_list, dtype=np.float32)
    y_all = np.array(y_list, dtype=np.float32)
    
    # Train/Val split: 80% обучение, 20% валидация
    split_idx = int(len(X_all) * 0.8)
    X_train = torch.tensor(X_all[:split_idx], dtype=torch.float32)
    y_train = torch.tensor(y_all[:split_idx], dtype=torch.float32)
    X_val   = torch.tensor(X_all[split_idx:], dtype=torch.float32)
    y_val   = torch.tensor(y_all[split_idx:], dtype=torch.float32)
    
    print(f"Обучающая выборка: {X_train.shape[0]} окон | Валидационная: {X_val.shape[0]} окон")
    
    # Создание модели
    model = RiskLSTM(input_dim=INPUT_DIM, hidden_dim=64, seq_len=seq_len, output_dim=3, num_layers=2, dropout=0.2)
    criterion = nn.MSELoss()
    optimizer = optim.Adam(model.parameters(), lr=0.001, weight_decay=1e-5)
    scheduler = optim.lr_scheduler.StepLR(optimizer, step_size=5, gamma=0.5)
    
    train_size = X_train.shape[0]
    print("Запуск обучения модели RiskLSTM (2 слоя, hidden=64, 7 фичей)...")
    
    for epoch in range(epochs):
        # --- Обучение ---
        model.train()
        permutation = torch.randperm(train_size)
        epoch_loss = 0.0
        
        for i in range(0, train_size, batch_size):
            indices = permutation[i : i + batch_size]
            batch_x, batch_y = X_train[indices], y_train[indices]
            optimizer.zero_grad()
            preds = model(batch_x)
            loss = criterion(preds, batch_y)
            loss.backward()
            optimizer.step()
            epoch_loss += loss.item() * batch_x.size(0)
            
        scheduler.step()
        train_mse = epoch_loss / train_size
        
        # --- Валидация ---
        model.eval()
        with torch.no_grad():
            val_preds = model(X_val)
            val_mse = criterion(val_preds, y_val).item()
            # MAE в реальных единицах (денормализуем)
            val_pred_real = denormalize_output(val_preds.numpy())
            val_true_real = denormalize_output(y_val.numpy())
            mae_temp  = np.mean(np.abs(val_pred_real[:, 0] - val_true_real[:, 0]))
            mae_pres  = np.mean(np.abs(val_pred_real[:, 1] - val_true_real[:, 1]))
            mae_level = np.mean(np.abs(val_pred_real[:, 2] - val_true_real[:, 2]))
            
        print(
            f"Эпоха {epoch+1:02d}/{epochs} | "
            f"Train MSE: {train_mse:.6f} | Val MSE: {val_mse:.6f} | "
            f"MAE: Temp={mae_temp:.2f}°C, Pres={mae_pres:.4f}МПа, Level={mae_level:.2f}%"
        )
        
    # Сохраняем модель
    torch.save(model.state_dict(), MODEL_PATH)
    print(f"\nМодель сохранена: {MODEL_PATH}")
    return True

# Класс инференса (Прогнозирование рисков на лету)
# -------------------------------------------------------------
class RiskPredictor:
    def __init__(self):
        self.model = None
        self.ort_session = None
        self.use_onnx = False
        self.use_fallback = True
        
        # 1. Проверяем наличие ONNX (предпочтительный легкий инференс)
        if HAS_ONNX and os.path.exists(ONNX_PATH):
            try:
                self.ort_session = ort.InferenceSession(ONNX_PATH, providers=['CPUExecutionProvider'])
                self.use_onnx = True
                self.use_fallback = False
                print("Модель LSTM успешно загружена через ONNX Runtime (7 фичей).")
            except Exception as e:
                print(f"Ошибка загрузки ONNX модели: {e}. Пробуем PyTorch.")
                
        # 2. Если ONNX не загружен, но есть PyTorch и веса
        if self.use_fallback and HAS_TORCH:
            try:
                self.model = RiskLSTM(input_dim=INPUT_DIM, hidden_dim=64, seq_len=30, output_dim=3, num_layers=2)
                if os.path.exists(MODEL_PATH):
                    self.model.load_state_dict(torch.load(MODEL_PATH, map_location=torch.device('cpu')))
                    self.model.eval()
                    self.use_fallback = False
                    print("Модель RiskLSTM успешно загружена через PyTorch.")
                else:
                    print("Файл lstm_model.pth не найден. Включается математический fallback.")
            except Exception as e:
                print(f"Ошибка загрузки PyTorch модели: {e}. Переход на fallback.")
                
        if self.use_fallback:
            print("Нейросети недоступны. Исполняется резервный математический экстраполятор (polyfit).")

    def predict_risk(self, window_data):
        """
        Принимает window_data: список или numpy array размерности (30, 7):
        каждая строка — [valve_V1, valve_V2, valve_V3, furnaceTempSp,
                          furnaceTemp, columnPres, columnLevel].
        Возвращает:
          predicted_values: [temp_15s, pres_15s, level_15s]
          risk_level: уровень риска аварии в %
        """
        # Превращаем вход в numpy array
        window = np.array(window_data, dtype=np.float32)
        n_features = INPUT_DIM
        if window.shape != (30, n_features):
            # Если окно неполное, дополняем последними значениями
            if len(window) > 0:
                last_row = window[-1]
                padded = np.zeros((30, n_features), dtype=np.float32)
                padded[30 - len(window):] = window
                padded[:30 - len(window)] = last_row
                window = padded
            else:
                return [280.0, 0.25, 50.0], 5.0
                
        # Рассчитываем математический прогноз по умолчанию (fallback)
        pred_temp_math, pred_pres_math, pred_level_math = self._run_mathematical_fallback(window)

        # -------------------------------------------------------------
        # А. Использование нейросети (ONNX или PyTorch)
        # -------------------------------------------------------------
        if not self.use_fallback:
            try:
                # Нормализуем окно
                window_norm = normalize(window)
                
                if self.use_onnx:
                    # Инференс через ONNX Runtime
                    x_input = window_norm.astype(np.float32)[np.newaxis, :, :]
                    ort_outs = self.ort_session.run(None, {"input": x_input})
                    pred_norm = ort_outs[0][0]
                else:
                    # Инференс через PyTorch
                    with torch.no_grad():
                        x_tensor = torch.tensor(window_norm, dtype=torch.float32).unsqueeze(0)
                        pred_norm = self.model(x_tensor).squeeze(0).numpy()
                        
                # Денормируем предсказанные значения на t + 15 с (только 3 выходных)
                pred = denormalize_output(pred_norm)
                pred_temp_nn, pred_pres_nn, pred_level_nn = float(pred[0]), float(pred[1]), float(pred[2])
                
                # Объединяем предсказания ИИ и физико-математической экстраполяции:
                # Берём наиболее консервативный (опасный) сценарий для раннего предупреждения
                pred_temp = max(pred_temp_nn, pred_temp_math)
                pred_pres = max(pred_pres_nn, pred_pres_math)
                
                dev_nn = abs(pred_level_nn - 50.0)
                dev_math = abs(pred_level_math - 50.0)
                pred_level = pred_level_nn if dev_nn > dev_math else pred_level_math
            except Exception as e:
                # В случае сбоя при инференсе, задействуем резервный метод
                print(f"Ошибка инференса нейросети: {e}. Переходим на fallback.")
                pred_temp, pred_pres, pred_level = pred_temp_math, pred_pres_math, pred_level_math
        else:
            # -------------------------------------------------------------
            # Б. Резервный метод: Полиномиальная экстраполяция (NumPy)
            # -------------------------------------------------------------
            pred_temp, pred_pres, pred_level = pred_temp_math, pred_pres_math, pred_level_math

        # Ограничения предсказанных значений
        pred_temp = max(20.0, min(500.0, pred_temp))
        pred_pres = max(0.02, min(1.8, pred_pres))
        pred_level = max(0.0, min(100.0, pred_level))

        # Вычисляем риск аварии (%) по прогнозируемым параметрам
        risk = 0.0
        # 1. По температуре печи (уставка аварии: 380°C, предупреждение: 310°C)
        if pred_temp > 310.0:
            risk += (pred_temp - 310.0) / (380.0 - 310.0) * 45
            
        # 2. По давлению в колонне (авария: 0.48 МПа, предупреждение: 0.3 МПа)
        if pred_pres > 0.3:
            risk += (pred_pres - 0.3) / (0.48 - 0.3) * 55
            
        # 3. По уровню в колонне (пределы: < 15% или > 85%)
        if pred_level > 85.0:
            risk += (pred_level - 85.0) / 15.0 * 20
        elif pred_level < 15.0:
            risk += (15.0 - pred_level) / 15.0 * 20
            
        # Корректируем итоговый процент риска
        risk = min(100.0, max(0.0, risk))
        
        # Если последнее фактическое состояние уже критическое, риск сразу 100%
        last_temp = float(window[-1, 4])
        last_pres = float(window[-1, 5])
        last_level = float(window[-1, 6])
        if last_pres >= 0.48 or last_temp >= 380.0 or last_level <= 5.0 or last_level >= 98.0:
            risk = 100.0

        return [round(pred_temp, 2), round(pred_pres, 3), round(pred_level, 2)], round(risk, 1)

    def _run_mathematical_fallback(self, window):
        """
        Математическая экстраполяция тренда методом наименьших квадратов (линейная регрессия)
        по последним 10 точкам для прогнозирования на 15 шагов вперед.
        Работает с 7-фичевым окном; прогнозирует только furnaceTemp, columnPres, columnLevel
        (позиции 4, 5, 6 в window).
        """
        subset = window[-10:]  # (10, 7)
        x = np.arange(10)
        
        predictions = []
        for feature_idx in [4, 5, 6]:  # furnaceTemp, columnPres, columnLevel
            y = subset[:, feature_idx]
            slope, intercept = np.polyfit(x, y, 1)
            pred_val = slope * 24.0 + intercept  # t+15 -> x_target=24
            predictions.append(pred_val)
            
        return predictions[0], predictions[1], predictions[2]

if __name__ == "__main__":
    # Если запущен напрямую, обучаем модель и тестируем инференс
    success = train_lstm_model(epochs=15)
    if success:
        print("\nТестовый запуск инференса...")
        predictor = RiskPredictor()
        # Имитируем стабильное 7-фичевое окно:
        # [valve_V1, valve_V2, valve_V3, furnaceTempSp, furnaceTemp, columnPres, columnLevel]
        dummy_window = [[1.0, 0.0, 1.0, 280.0, 278.0, 0.24, 50.0] for _ in range(30)]
        pred_vals, risk = predictor.predict_risk(dummy_window)
        print(f"Прогноз (t+15с): temp={pred_vals[0]}°C, pres={pred_vals[1]}МПа, level={pred_vals[2]}% | Риск аварии: {risk}%")
