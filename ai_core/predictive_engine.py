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

# Константы нормирования (мин/макс для нормализации данных датчиков)
# Для стабильности инференса
SCALER_MIN = np.array([20.0, 0.02, 0.0])   # Temp, Pres, Level
SCALER_MAX = np.array([600.0, 1.5, 100.0]) # Temp, Pres, Level

def normalize(data):
    return (data - SCALER_MIN) / (SCALER_MAX - SCALER_MIN + 1e-8)

def denormalize(data_norm):
    return data_norm * (SCALER_MAX - SCALER_MIN) + SCALER_MIN

# -------------------------------------------------------------
# Архитектура модели LSTM в PyTorch
# -------------------------------------------------------------
if HAS_TORCH:
    class RiskLSTM(nn.Module):
        def __init__(self, input_dim=3, hidden_dim=16, seq_len=30, output_dim=3):
            super(RiskLSTM, self).__init__()
            self.hidden_dim = hidden_dim
            self.seq_len = seq_len
            
            # LSTM слой для обработки временной последовательности
            self.lstm = nn.LSTM(input_dim, hidden_dim, batch_first=True, num_layers=1)
            
            # Полносвязный слой для прогнозирования значений на t+15 секунд
            self.fc = nn.Linear(hidden_dim, output_dim)
            
        def forward(self, x):
            # x shape: (batch, seq_len, input_dim)
            lstm_out, _ = self.lstm(x)
            # Берем последний временной шаг
            last_out = lstm_out[:, -1, :]
            out = self.fc(last_out)
            return out
else:
    class RiskLSTM:
        def __init__(self, *args, **kwargs):
            pass

# -------------------------------------------------------------
# Функция обучения модели
# -------------------------------------------------------------
def train_lstm_model(epochs=10, batch_size=64):
    if not HAS_TORCH:
        print("Ошибка: PyTorch не установлен в системе. Обучение нейросети невозможно.")
        return False
        
    if not os.path.exists(DATASET_PATH):
        print(f"Ошибка: файл датасета {DATASET_PATH} не найден. Сначала сгенерируйте данные.")
        return False
        
    print("Подготовка данных для обучения LSTM...")
    # Чтение данных
    data = []
    with open(DATASET_PATH, "r", encoding="utf-8") as f:
        reader = csv_reader = f.readlines()
        # Пропускаем заголовок
        for line in reader[1:]:
            parts = line.strip().split(",")
            # Индексы 5, 6, 7 - это furnaceTemp, columnPres, columnLevel
            temp = float(parts[5])
            pres = float(parts[6])
            level = float(parts[7])
            data.append([temp, pres, level])
            
    data = np.array(data, dtype=np.float32)
    # Нормализуем весь датасет
    data_norm = normalize(data)
    
    # Формируем выборку:
    # X - окно из 30 шагов
    # y - значения через 15 шагов вперед (t + 15)
    seq_len = 30
    forecast_horizon = 15
    
    X_list, y_list = [], []
    for i in range(len(data_norm) - seq_len - forecast_horizon):
        X_list.append(data_norm[i : i + seq_len])
        y_list.append(data_norm[i + seq_len + forecast_horizon - 1])
        
    X_train = torch.tensor(np.array(X_list), dtype=torch.float32)
    y_train = torch.tensor(np.array(y_list), dtype=torch.float32)
    
    print(f"Размер обучающей выборки: {X_train.shape[0]} окон.")
    
    # Создание модели и оптимизатора
    model = RiskLSTM(input_dim=3, hidden_dim=16, seq_len=30, output_dim=3)
    criterion = nn.MSELoss()
    optimizer = optim.Adam(model.parameters(), lr=0.01)
    
    # Цикл обучения
    model.train()
    dataset_size = X_train.shape[0]
    
    print("Запуск обучения модели RiskLSTM...")
    for epoch in range(epochs):
        permutation = torch.randperm(dataset_size)
        epoch_loss = 0.0
        
        for i in range(0, dataset_size, batch_size):
            indices = permutation[i : i + batch_size]
            batch_x, batch_y = X_train[indices], y_train[indices]
            
            optimizer.zero_grad()
            predictions = model(batch_x)
            loss = criterion(predictions, batch_y)
            loss.backward()
            optimizer.step()
            
            epoch_loss += loss.item() * batch_x.size(0)
            
        print(f"Эпоха {epoch+1}/{epochs} | Средняя ошибка (MSE Loss): {epoch_loss / dataset_size:.6f}")
        
    # Сохраняем модель
    torch.save(model.state_dict(), MODEL_PATH)
    print(f"Модель сохранена в файл {MODEL_PATH}")
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
                print("Модель LSTM успешно загружена через ONNX Runtime.")
            except Exception as e:
                print(f"Ошибка загрузки ONNX модели: {e}. Пробуем PyTorch.")
                
        # 2. Если ONNX не загружен, но есть PyTorch и веса
        if self.use_fallback and HAS_TORCH:
            try:
                self.model = RiskLSTM(input_dim=3, hidden_dim=16, seq_len=30, output_dim=3)
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
        Принимает window_data: список или numpy array размерности (30, 3):
        каждая строка - [furnaceTemp, columnPres, columnLevel].
        Возвращает:
          predicted_values: [temp_15s, pres_15s, level_15s]
          risk_level: уровень риска аварии в %
        """
        # Превращаем вход в numpy array
        window = np.array(window_data, dtype=np.float32)
        if window.shape != (30, 3):
            # Если окно неполное, дополняем последними значениями
            if len(window) > 0:
                last_row = window[-1]
                padded = np.zeros((30, 3), dtype=np.float32)
                padded[30 - len(window):] = window
                padded[:30 - len(window)] = last_row
                window = padded
            else:
                return [280.0, 0.25, 50.0], 5.0
                
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
                        
                # Денормируем предсказанные значения на t + 15 с
                pred = denormalize(pred_norm)
                pred_temp, pred_pres, pred_level = float(pred[0]), float(pred[1]), float(pred[2])
            except Exception as e:
                # В случае сбоя при инференсе, задействуем резервный метод
                print(f"Ошибка инференса нейросети: {e}. Переходим на fallback.")
                pred_temp, pred_pres, pred_level = self._run_mathematical_fallback(window)
        else:
            # -------------------------------------------------------------
            # Б. Резервный метод: Полиномиальная экстраполяция (NumPy)
            # -------------------------------------------------------------
            pred_temp, pred_pres, pred_level = self._run_mathematical_fallback(window)

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
        last_temp, last_pres, last_level = window[-1]
        if last_pres >= 0.48 or last_temp >= 380.0 or last_level <= 5.0 or last_level >= 98.0:
            risk = 100.0

        return [round(pred_temp, 2), round(pred_pres, 3), round(pred_level, 2)], round(risk, 1)

    def _run_mathematical_fallback(self, window):
        """
        Математическая экстраполяция тренда методом наименьших квадратов (линейная регрессия)
        по последним 10 точкам для прогнозирования на 15 шагов вперед.
        """
        # Берем последние 10 секунд
        subset = window[-10:]
        x = np.arange(10)
        
        predictions = []
        for feature_idx in range(3):
            y = subset[:, feature_idx]
            # Подгоняем прямую линию y = ax + b
            slope, intercept = np.polyfit(x, y, 1)
            # Прогнозируем значение на 15 шагов вперед (t + 15), x_target = 9 + 15 = 24
            pred_val = slope * 24.0 + intercept
            predictions.append(pred_val)
            
        return predictions[0], predictions[1], predictions[2]

if __name__ == "__main__":
    # Если запущен напрямую, пробуем обучить модель
    success = train_lstm_model(epochs=8)
    if success:
        print("Тестовый запуск инференса...")
        predictor = RiskPredictor()
        # Имитируем стабильное окно
        dummy_window = [[280.0, 0.25, 50.0] for _ in range(30)]
        pred_vals, risk = predictor.predict_risk(dummy_window)
        print(f"Прогноз: {pred_vals}, Риск аварии: {risk}%")
