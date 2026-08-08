import os
import logging
import numpy as np

logger = logging.getLogger(__name__)

# Импортируем конфигурационные параметры
from elou_tutor.ml.settings import (
    ONNX_PATH, INPUT_DIM, SEQUENCE_LENGTH,
    SCALER_MIN, SCALER_MAX, OUT_MIN, OUT_MAX,
    RISK_WEIGHT_TEMP, RISK_WEIGHT_PRES, RISK_WEIGHT_LEVEL, RISK_PENALTY_NO_FEED,
    RISK_WEIGHT_K2_PRESSURE, RISK_WEIGHT_K2_TEMP, RISK_WEIGHT_K2_LEVEL,
)
from elou_tutor.domain.process_limits import (
    FURNACE_TEMP_CRITICAL, FURNACE_TEMP_CRITICAL_LEVEL, FURNACE_TEMP_WARNING, COLUMN_PRES_WARNING, COLUMN_PRES_ESD,
    COLUMN_LEVEL_HIGH, COLUMN_LEVEL_LOW, COLUMN_LEVEL_LOW_INTERLOCK,
    COLUMN_LEVEL_HIGH_CRITICAL, COLUMN_LEVEL_LOW_CRITICAL,
    STARTUP_HEATING_THRESHOLD_TEMP, STARTUP_FILLING_TIME_LIMIT_SEC, VALVE_ACTION_TIMEOUT_SEC,
    K2_PRESSURE_NORMAL, K2_PRESSURE_WARNING, K2_PRESSURE_CRITICAL,
    K2_TEMP_WARNING, K2_TEMP_CRITICAL,
    K2_LEVEL_LOW, K2_LEVEL_LOW_INTERLOCK, K2_LEVEL_LOW_CRITICAL,
    K2_LEVEL_HIGH, K2_LEVEL_HIGH_CRITICAL,
)
from elou_tutor.ml.artifact_integrity import verify_model_artifacts

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
        self.model_integrity_valid = False
        self.model_version = "unverified"

        # Проверяем наличие ONNX (единственный поддерживаемый рантайм-инференс)
        self.model_integrity_valid, self.model_version = verify_model_artifacts()
        if HAS_ONNX and os.path.exists(ONNX_PATH) and self.model_integrity_valid:
            try:
                self.ort_session = ort.InferenceSession(ONNX_PATH, providers=['CPUExecutionProvider'])
                self.use_onnx = True
                self.use_fallback = False
                logger.info("Модель LSTM успешно загружена через ONNX Runtime (7 фичей).")
            except Exception as e:
                logger.warning("Ошибка загрузки ONNX модели: %s. Переход на fallback.", e)

        if not self.model_integrity_valid:
            logger.error("Проверка целостности ONNX не пройдена: %s", self.model_version)

        if self.use_fallback:
            logger.info("Нейросети недоступны. Исполняется резервный математический экстраполятор (polyfit).")

    def predict_parameters(self, window_data):
        """Возвращает чистый ONNX-прогноз T/P/L и признак использования модели.

        Аргумент — окно телеметрии `(30, 7)` в физических единицах. Результат
        содержит прогноз `[°C, МПа, %]`; fallback намеренно не смешивается с
        этим методом, чтобы качество LSTM оценивалось отдельно.
        """
        window = np.array(window_data, dtype=np.float32)
        if window.shape != (SEQUENCE_LENGTH, INPUT_DIM) or not self.use_onnx:
            return None, False
        try:
            x_input = normalize(window).astype(np.float32)[np.newaxis, :, :]
            pred_norm = self.ort_session.run(None, {"input": x_input})[0][0]
            pred = denormalize_output(pred_norm)
            return [float(pred[0]), float(pred[1]), float(pred[2])], True
        except Exception as exc:
            logger.error("Ошибка чистого ONNX-инференса: %s", exc)
            return None, False

    def predict_risk(self, window_data, time_elapsed: int = 100, scenario_id: str = "shutdown",
                     k2_sensors: dict = None):
        """
        Принимает window_data: список или numpy array размерности (30, 7):
        каждая строка — [valve_V1, valve_V2, valve_V3, furnaceTempSp,
                          furnaceTemp, columnPres, columnLevel].
        scenario_id: используется для подавления ложных рисков на фазе пуска.
        k2_sensors: фактические показания вакуумного блока {L_2, P_vac, T_2}.
            Необязателен: сеть эти параметры не прогнозирует, поэтому вклад К-2
            считается по факту и добавляется к риску контура К-1. Без аргумента
            поведение полностью совпадает с прежним — на этом держатся офлайн-
            пайплайн и метрики качества LSTM.
        Возвращает:
          predicted_values: [temp_15s, pres_15s, level_15s]
          risk_level: уровень риска аварии в %
        """
        # Превращаем вход в numpy array
        window = np.array(window_data, dtype=np.float32)
        n_features = INPUT_DIM
        if window.shape != (SEQUENCE_LENGTH, n_features):
            if len(window) > SEQUENCE_LENGTH:
                # Окно длиннее нужного: оставляем последние точки. Прогноз строится
                # по самой свежей телеметрии, устаревший хвост только шумит.
                # Обрезка обязана быть здесь: раньше защита держалась на том, что
                # simulation_loop режет историю, и любой другой вызывающий ронял предиктор.
                window = window[-SEQUENCE_LENGTH:]
            elif len(window) > 0:
                # Если окно неполное, дополняем последними значениями
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
                prediction, used_onnx = self.predict_parameters(window)
                if not used_onnx or prediction is None:
                    raise RuntimeError("ONNX-прогноз недоступен")
                pred_temp_nn, pred_pres_nn, pred_level_nn = prediction
                
                # При доступной ONNX используем именно её прогноз. Fallback не
                # смешивается с моделью: иначе его ложные тренды ухудшают
                # качество risk engine и делают метрики LSTM непроверяемыми.
                pred_temp, pred_pres, pred_level = pred_temp_nn, pred_pres_nn, pred_level_nn
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
        actual_pres = float(window[-1, 5])
        actual_level = float(window[-1, 6])
        setpoint_temp = float(window[-1, 3])
        
        # Ограничение нужно только математическому fallback: линейная экстраполяция
        # может «улететь» при штатном разогреве. Нельзя применять его к ONNX —
        # иначе корректный прогноз перегрева скрывается текущей уставкой T_sp.
        if self.use_fallback and pred_temp > setpoint_temp + 10.0:
            pred_temp = min(pred_temp, max(actual_temp, setpoint_temp + 10.0))

        # Физические пределы
        pred_temp = np.clip(pred_temp, 20.0, 500.0)
        pred_pres = np.clip(pred_pres, 0.02, 1.8)
        pred_level = np.clip(pred_level, 0.0, 100.0)
        risk_pres = max(float(pred_pres), actual_pres)
        risk_level = pred_level if abs(pred_level - 50.0) >= abs(actual_level - 50.0) else actual_level

        # Вычисляем риск аварии (%) по прогнозируемым параметрам
        risk = 0.0
        
        # При пуске (startup) или при штатном разогреве до уставки рост температуры — это ОЖИДАЕМОЕ поведение.
        # Не считаем температуру критической, если она не превышает уставку + 15°C
        is_startup_heating = (scenario_id == "startup" and actual_temp < STARTUP_HEATING_THRESHOLD_TEMP)
        is_normal_heating = (actual_temp <= setpoint_temp + 5.0 and setpoint_temp <= FURNACE_TEMP_WARNING)
        
        # 1. По температуре печи (предупреждение: FURNACE_TEMP_WARNING=340°C, авария: FURNACE_TEMP_CRITICAL=365°C)
        if pred_temp >= FURNACE_TEMP_CRITICAL_LEVEL:
            risk = 100.0
        elif pred_temp > FURNACE_TEMP_WARNING and not is_startup_heating and not is_normal_heating:
            risk += (pred_temp - FURNACE_TEMP_WARNING) / (FURNACE_TEMP_CRITICAL - FURNACE_TEMP_WARNING) * RISK_WEIGHT_TEMP
            
        # 2. По давлению в колонне (предупреждение: COLUMN_PRES_WARNING=0.40 МПа, ПАЗ: COLUMN_PRES_ESD=0.48 МПа)
        if risk_pres > COLUMN_PRES_WARNING:
            risk += (risk_pres - COLUMN_PRES_WARNING) / (COLUMN_PRES_ESD - COLUMN_PRES_WARNING) * RISK_WEIGHT_PRES
            
        # 3. По уровню в колонне (пределы: < COLUMN_LEVEL_LOW=25% или > COLUMN_LEVEL_HIGH=85%)
        # При пуске (startup) на первых двух минутах колонна естественно пуста и заполняется сырьем
        is_startup_filling = (scenario_id == "startup" and time_elapsed <= STARTUP_FILLING_TIME_LIMIT_SEC)
        
        if risk_level > COLUMN_LEVEL_HIGH:
            risk += (risk_level - COLUMN_LEVEL_HIGH) / (COLUMN_LEVEL_HIGH_CRITICAL - COLUMN_LEVEL_HIGH) * RISK_WEIGHT_LEVEL
        elif risk_level < COLUMN_LEVEL_LOW:
            if not is_startup_filling:
                if risk_level <= COLUMN_LEVEL_LOW_INTERLOCK:
                    risk += 75.0 + (COLUMN_LEVEL_LOW_INTERLOCK - risk_level) / (COLUMN_LEVEL_LOW_INTERLOCK - COLUMN_LEVEL_LOW_CRITICAL) * 25.0
                else:
                    risk += (COLUMN_LEVEL_LOW - risk_level) / (COLUMN_LEVEL_LOW - COLUMN_LEVEL_LOW_INTERLOCK) * 75.0
            elif time_elapsed > VALVE_ACTION_TIMEOUT_SEC and window[-1, 0] < 0.5:  # V-1 закрыт > 15с
                risk += RISK_PENALTY_NO_FEED

        # 4. Вакуумный блок К-2 по фактическим показаниям
        k2_risk, k2_is_critical = self._evaluate_k2_risk(k2_sensors)
        risk += k2_risk

        # Корректируем итоговый процент риска
        risk = np.clip(risk, 0.0, 100.0)
        
        # Если последнее фактическое состояние уже критическое, риск сразу 100%
        last_temp = actual_temp
        last_pres = actual_pres
        last_level = actual_level
        
        is_critical = (
            last_pres >= COLUMN_PRES_ESD or
            last_temp >= FURNACE_TEMP_CRITICAL or
            (last_level <= COLUMN_LEVEL_LOW_CRITICAL and not is_startup_filling) or
            last_level >= COLUMN_LEVEL_HIGH_CRITICAL or
            k2_is_critical
        )
        if is_critical:
            risk = 100.0

        return [round(float(pred_temp), 2), round(float(pred_pres), 3), round(float(pred_level), 2)], round(float(risk), 1)

    @staticmethod
    def _evaluate_k2_risk(k2_sensors):
        """
        Вклад вакуумного блока К-2 в общий риск по фактическим показаниям.

        Возвращает (вклад в %, признак критического состояния). Критическое
        состояние поднимает итоговый риск до 100% так же, как и по контуру К-1:
        достижение порога блокировки ПАЗ — это уже авария, а не тренд к ней.

        Прогноза здесь нет намеренно: LSTM обучена на семи фичах контура К-1
        и параметры К-2 не предсказывает. Смешивать её выход с фактическими
        значениями К-2 было бы выдачей факта за прогноз.
        """
        if not k2_sensors:
            return 0.0, False

        level = float(k2_sensors.get("L_2", 50.0))
        pressure = float(k2_sensors.get("P_vac", K2_PRESSURE_NORMAL))
        temp = float(k2_sensors.get("T_2", K2_TEMP_WARNING))

        risk = 0.0

        # Срыв вакуума: рост остаточного давления от сигнализации к блокировке
        if pressure > K2_PRESSURE_WARNING:
            span = K2_PRESSURE_CRITICAL - K2_PRESSURE_WARNING
            risk += (pressure - K2_PRESSURE_WARNING) / span * RISK_WEIGHT_K2_PRESSURE

        # Перегрев куба: риск коксования и крекинга мазута
        if temp > K2_TEMP_WARNING:
            span = K2_TEMP_CRITICAL - K2_TEMP_WARNING
            risk += (temp - K2_TEMP_WARNING) / span * RISK_WEIGHT_K2_TEMP

        # Уровень куба. Ниже блокировки насосов Н-4/Н-32 шкала резко круче:
        # это уже кавитация и обнажение змеевиков, а не отклонение от нормы.
        if level > K2_LEVEL_HIGH:
            span = K2_LEVEL_HIGH_CRITICAL - K2_LEVEL_HIGH
            risk += (level - K2_LEVEL_HIGH) / span * RISK_WEIGHT_K2_LEVEL
        elif level < K2_LEVEL_LOW:
            if level <= K2_LEVEL_LOW_INTERLOCK:
                span = K2_LEVEL_LOW_INTERLOCK - K2_LEVEL_LOW_CRITICAL
                risk += 75.0 + (K2_LEVEL_LOW_INTERLOCK - level) / span * 25.0
            else:
                span = K2_LEVEL_LOW - K2_LEVEL_LOW_INTERLOCK
                risk += (K2_LEVEL_LOW - level) / span * 75.0

        is_critical = (
            pressure >= K2_PRESSURE_CRITICAL
            or temp >= K2_TEMP_CRITICAL
            or level <= K2_LEVEL_LOW_CRITICAL
            or level >= K2_LEVEL_HIGH_CRITICAL
        )
        return risk, is_critical

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
