import os
import sys
import numpy as np

# Импортируем конфигурационные параметры
from ai_core.config import (
    MODEL_PATH, ONNX_PATH, INPUT_DIM, HIDDEN_DIM, NUM_LAYERS, OUTPUT_DIM, DROPOUT,
    SCALER_MIN, SCALER_MAX, OUT_MIN, OUT_MAX,
    FURNACE_TEMP_CRITICAL, FURNACE_TEMP_WARNING, COLUMN_PRES_CRITICAL, COLUMN_PRES_WARNING,
    COLUMN_PRES_ESD, COLUMN_LEVEL_HIGH, COLUMN_LEVEL_LOW, COLUMN_LEVEL_HIGH_CRITICAL, COLUMN_LEVEL_LOW_CRITICAL
)

# Пытаемся импортировать torch для инференса нейросети
try:
    import torch
    import torch.nn as nn
    HAS_TORCH = True
except ImportError:
    HAS_TORCH = False

# Пытаемся импортировать onnxruntime для легкого инференса
try:
    import onnxruntime as ort
    HAS_ONNX = True
except ImportError:
    HAS_ONNX = False

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
        def __init__(self, input_dim=INPUT_DIM, hidden_dim=HIDDEN_DIM, seq_len=30, output_dim=OUTPUT_DIM, num_layers=NUM_LAYERS, dropout=DROPOUT):
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

# Класс инференса (Прогнозирование рисков на лету)
# -------------------------------------------------------------
class RiskPredictor:
    """
    Класс инференса для расчета уровня рисков на основе 30-секундного окна телеметрии.
    Использует ONNX Runtime или PyTorch с математическим fallback.
    """
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
                self.model = RiskLSTM(
                    input_dim=INPUT_DIM,
                    hidden_dim=HIDDEN_DIM,
                    seq_len=30,
                    output_dim=OUTPUT_DIM,
                    num_layers=NUM_LAYERS,
                    dropout=DROPOUT
                )
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

    def predict_risk(self, window_data, time_elapsed: int = 100, scenario_id: str = "shutdown"):
        """
        Принимает window_data: список или numpy array размерности (30, 7):
        каждая строка — [valve_V1, valve_V2, valve_V3, furnaceTempSp,
                          furnaceTemp, columnPres, columnLevel].
        scenario_id: используется для подавления ложных рисков на фазе пуска.
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

        # Физические пределы
        pred_temp = np.clip(pred_temp, 20.0, 500.0)
        pred_pres = np.clip(pred_pres, 0.02, 1.8)
        pred_level = np.clip(pred_level, 0.0, 100.0)

        # Вычисляем риск аварии (%) по прогнозируемым параметрам
        risk = 0.0
        
        # Фактическая температура печи из последней точки окна
        actual_temp = float(window[-1, 4])
        
        # При пуске (startup) рост температуры — это ОЖИДАЕМОЕ поведение.
        # Пока печь ещё не вышла на рабочий режим (< 290°C), не учитываем
        # риск по температуре.
        is_startup_heating = (scenario_id == "startup" and actual_temp < 290.0)
        
        # 1. По температуре печи (уставка аварии: 380°C, предупреждение: 310°C)
        if pred_temp > FURNACE_TEMP_WARNING and not is_startup_heating:
            risk += (pred_temp - FURNACE_TEMP_WARNING) / (FURNACE_TEMP_CRITICAL - FURNACE_TEMP_WARNING) * 45
            
        # 2. По давлению в колонне (авария: 0.48 МПа, предупреждение: 0.3 МПа)
        if pred_pres > 0.3:
            risk += (pred_pres - 0.3) / (0.48 - 0.3) * 55
            
        # 3. По уровню в колонне (пределы: < 15% или > 85%)
        if pred_level > COLUMN_LEVEL_HIGH:
            risk += (pred_level - COLUMN_LEVEL_HIGH) / 15.0 * 20
        elif pred_level < COLUMN_LEVEL_LOW:
            risk += (COLUMN_LEVEL_LOW - pred_level) / COLUMN_LEVEL_LOW * 20
            
        # Корректируем итоговый процент риска
        risk = np.clip(risk, 0.0, 100.0)
        
        # Если последнее фактическое состояние уже критическое, риск сразу 100%
        # Учитываем защитный интервал времени (40 секунд) для уровня при пуске
        last_temp = float(window[-1, 4])
        last_pres = float(window[-1, 5])
        last_level = float(window[-1, 6])
        
        is_critical = (
            last_pres >= COLUMN_PRES_ESD or 
            last_temp >= FURNACE_TEMP_CRITICAL or 
            (last_level <= COLUMN_LEVEL_LOW_CRITICAL and time_elapsed > 40) or 
            last_level >= COLUMN_LEVEL_HIGH_CRITICAL
        )
        if is_critical:
            risk = 100.0

        return [round(float(pred_temp), 2), round(float(pred_pres), 3), round(float(pred_level), 2)], round(float(risk), 1)

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
