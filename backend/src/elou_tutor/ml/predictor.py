import os
import logging
import numpy as np

logger = logging.getLogger(__name__)

# Импортируем конфигурационные параметры
from elou_tutor.ml.settings import (
    ONNX_PATH, INPUT_DIM, SEQUENCE_LENGTH,
    SCALER_MIN, SCALER_MAX, OUT_MIN, OUT_MAX,
    RISK_WEIGHT_TEMP, RISK_WEIGHT_PRES, RISK_WEIGHT_LEVEL, RISK_PENALTY_NO_FEED,
)
from elou_tutor.domain.process_limits import (
    FURNACE_TEMP_CRITICAL, FURNACE_TEMP_WARNING, COLUMN_PRES_WARNING, COLUMN_PRES_ESD,
    COLUMN_LEVEL_HIGH, COLUMN_LEVEL_LOW, COLUMN_LEVEL_LOW_INTERLOCK,
    COLUMN_LEVEL_HIGH_CRITICAL, COLUMN_LEVEL_LOW_CRITICAL,
    STARTUP_HEATING_THRESHOLD_TEMP, STARTUP_FILLING_TIME_LIMIT_SEC, VALVE_ACTION_TIMEOUT_SEC,
)

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
# Класс инференса (Прогнозирование рисков на лету)
# -------------------------------------------------------------
class RiskPredictor:
    """
    Класс инференса для расчета уровня рисков на основе 30-секундного окна телеметрии.
    Использует ONNX Runtime с математическим fallback.
    """
    def __init__(self):
        self.ort_session = None
        self.use_onnx = False
        self.use_fallback = True

        # Проверяем наличие ONNX (единственный поддерживаемый рантайм-инференс)
        if HAS_ONNX and os.path.exists(ONNX_PATH):
            try:
                self.ort_session = ort.InferenceSession(ONNX_PATH, providers=['CPUExecutionProvider'])
                self.use_onnx = True
                self.use_fallback = False
                logger.info("Модель LSTM успешно загружена через ONNX Runtime (7 фичей).")
            except Exception as e:
                logger.warning("Ошибка загрузки ONNX модели: %s. Переход на fallback.", e)

        if self.use_fallback:
            logger.info("Нейросети недоступны. Исполняется резервный математический экстраполятор (polyfit).")

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
        if window.shape != (SEQUENCE_LENGTH, n_features):
            # Если окно неполное, дополняем последними значениями
            if len(window) > 0:
                last_row = window[-1]
                padded = np.zeros((SEQUENCE_LENGTH, n_features), dtype=np.float32)
                padded[SEQUENCE_LENGTH - len(window):] = window
                padded[:SEQUENCE_LENGTH - len(window)] = last_row
                window = padded
            else:
                return [280.0, 0.25, 50.0], 5.0
                
        # Рассчитываем математический прогноз по умолчанию (fallback)
        pred_temp_math, pred_pres_math, pred_level_math = self._run_mathematical_fallback(window)

        # -------------------------------------------------------------
        # А. Использование нейросети (ONNX Runtime)
        # -------------------------------------------------------------
        if not self.use_fallback:
            try:
                # Нормализуем окно
                window_norm = normalize(window)

                # Инференс через ONNX Runtime
                x_input = window_norm.astype(np.float32)[np.newaxis, :, :]
                ort_outs = self.ort_session.run(None, {"input": x_input})
                pred_norm = ort_outs[0][0]

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
                logger.error("Ошибка инференса нейросети: %s. Переходим на fallback.", e)
                pred_temp, pred_pres, pred_level = pred_temp_math, pred_pres_math, pred_level_math
        else:
            # -------------------------------------------------------------
            # Б. Резервный метод: Полиномиальная экстраполяция (NumPy)
            # -------------------------------------------------------------
            pred_temp, pred_pres, pred_level = pred_temp_math, pred_pres_math, pred_level_math

        # Фактическая температура печи и уставка из последней точки окна
        actual_temp = float(window[-1, 4])
        setpoint_temp = float(window[-1, 3])
        
        # Защита от линейного "вылета" экстраполяции выше уставки при штатном разогреве:
        # Если нет дефекта прогара, температура не может бесконечно расти выше уставки + 10°C.
        if pred_temp > setpoint_temp + 10.0:
            pred_temp = min(pred_temp, max(actual_temp, setpoint_temp + 10.0))

        # Физические пределы
        pred_temp = np.clip(pred_temp, 20.0, 500.0)
        pred_pres = np.clip(pred_pres, 0.02, 1.8)
        pred_level = np.clip(pred_level, 0.0, 100.0)

        # Вычисляем риск аварии (%) по прогнозируемым параметрам
        risk = 0.0
        
        # При пуске (startup) или при штатном разогреве до уставки рост температуры — это ОЖИДАЕМОЕ поведение.
        # Не считаем температуру критической, если она не превышает уставку + 15°C
        is_startup_heating = (scenario_id == "startup" and actual_temp < STARTUP_HEATING_THRESHOLD_TEMP)
        is_normal_heating = (actual_temp <= setpoint_temp + 5.0 and setpoint_temp <= FURNACE_TEMP_WARNING)
        
        # 1. По температуре печи (предупреждение: FURNACE_TEMP_WARNING=340°C, авария: FURNACE_TEMP_CRITICAL=365°C)
        if pred_temp > FURNACE_TEMP_WARNING and not is_startup_heating and not is_normal_heating:
            risk += (pred_temp - FURNACE_TEMP_WARNING) / (FURNACE_TEMP_CRITICAL - FURNACE_TEMP_WARNING) * RISK_WEIGHT_TEMP
            
        # 2. По давлению в колонне (предупреждение: COLUMN_PRES_WARNING=0.40 МПа, ПАЗ: COLUMN_PRES_ESD=0.48 МПа)
        if pred_pres > COLUMN_PRES_WARNING:
            risk += (pred_pres - COLUMN_PRES_WARNING) / (COLUMN_PRES_ESD - COLUMN_PRES_WARNING) * RISK_WEIGHT_PRES
            
        # 3. По уровню в колонне (пределы: < COLUMN_LEVEL_LOW=25% или > COLUMN_LEVEL_HIGH=85%)
        # При пуске (startup) на первых двух минутах колонна естественно пуста и заполняется сырьем
        is_startup_filling = (scenario_id == "startup" and time_elapsed <= STARTUP_FILLING_TIME_LIMIT_SEC)
        
        if pred_level > COLUMN_LEVEL_HIGH:
            risk += (pred_level - COLUMN_LEVEL_HIGH) / (COLUMN_LEVEL_HIGH_CRITICAL - COLUMN_LEVEL_HIGH) * RISK_WEIGHT_LEVEL
        elif pred_level < COLUMN_LEVEL_LOW:
            if not is_startup_filling:
                if pred_level <= COLUMN_LEVEL_LOW_INTERLOCK:
                    risk += 75.0 + (COLUMN_LEVEL_LOW_INTERLOCK - pred_level) / (COLUMN_LEVEL_LOW_INTERLOCK - COLUMN_LEVEL_LOW_CRITICAL) * 25.0
                else:
                    risk += (COLUMN_LEVEL_LOW - pred_level) / (COLUMN_LEVEL_LOW - COLUMN_LEVEL_LOW_INTERLOCK) * 75.0
            elif time_elapsed > VALVE_ACTION_TIMEOUT_SEC and window[-1, 0] < 0.5:  # V-1 закрыт > 15с
                risk += RISK_PENALTY_NO_FEED
            
        # Корректируем итоговый процент риска
        risk = np.clip(risk, 0.0, 100.0)
        
        # Если последнее фактическое состояние уже критическое, риск сразу 100%
        last_temp = float(window[-1, 4])
        last_pres = float(window[-1, 5])
        last_level = float(window[-1, 6])
        
        is_critical = (
            last_pres >= COLUMN_PRES_ESD or 
            last_temp >= FURNACE_TEMP_CRITICAL or 
            (last_level <= COLUMN_LEVEL_LOW_CRITICAL and not is_startup_filling) or 
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
