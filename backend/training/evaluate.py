"""Воспроизводимая оценка LSTM и гибридного risk engine на test-сессиях."""

import csv
import datetime as dt
import hashlib
import json
import logging
import os
import sys
from dataclasses import dataclass

import numpy as np

BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from elou_tutor.domain.process_limits import FURNACE_TEMP_CRITICAL_LEVEL
from elou_tutor.ml.predictor import RiskPredictor
from elou_tutor.ml.settings import FORECAST_HORIZON, OUT_MAX, OUT_MIN, SEQUENCE_LENGTH
from training.config import DATASET_PATH, REPORT_PATH, RISK_THRESHOLD, TRAIN_SPLIT, VAL_SPLIT

logger = logging.getLogger("evaluate")
FEATURE_COLUMNS = ("valve_V1", "valve_V2", "valve_V3", "furnaceTempSp", "furnaceTemp", "columnPres", "columnLevel")
TARGET_COLUMNS = ("furnaceTemp", "columnPres", "columnLevel")


@dataclass
class TestSet:
    """Окна отложенных сессий и их будущие состояния на горизонте прогноза."""

    windows: np.ndarray
    targets: np.ndarray
    labels: np.ndarray
    session_ids: list[int]
    scenarios: list[str]
    time_elapsed: list[int]


def _sha256(path: str) -> str:
    """Возвращает SHA-256 файла для отчёта о воспроизводимости."""
    digest = hashlib.sha256()
    with open(path, "rb") as data_file:
        for chunk in iter(lambda: data_file.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _is_predictive_risk_event(row: np.ndarray) -> bool:
    """Проверяет вход в предаварийную зону на горизонте прогноза.

    Это учебный сигнал для действия оператора до срабатывания ПАЗ, а не
    подмена факта аварии. Жёсткие пределы ПАЗ остаются в симуляторе.
    """
    # Для первого ML-контура фиксируем одну проверяемую бизнес-задачу —
    # раннее обнаружение предаварийного перегрева печи П-1. Давление и уровни
    # остаются под детерминированной ПАЗ до появления размеченных событий.
    return bool(row[4] >= FURNACE_TEMP_CRITICAL_LEVEL)


def load_test_dataset() -> TestSet:
    """Разделяет датасет по session_id и строит test-окна без утечки соседних окон."""
    sessions: dict[int, list[dict[str, str]]] = {}
    with open(DATASET_PATH, encoding="utf-8", newline="") as dataset_file:
        for row in csv.DictReader(dataset_file):
            sessions.setdefault(int(row["session_id"]), []).append(row)

    session_ids = sorted(sessions)
    test_start = int(len(session_ids) * (TRAIN_SPLIT + VAL_SPLIT))
    test_ids = session_ids[test_start:]
    windows, targets, labels, window_sessions, scenarios, times = [], [], [], [], [], []
    for session_id in test_ids:
        rows = sessions[session_id]
        raw = np.array([[float(row[column]) for column in FEATURE_COLUMNS] for row in rows], dtype=np.float32)
        if len(raw) < SEQUENCE_LENGTH + FORECAST_HORIZON:
            continue
        for start in range(len(raw) - SEQUENCE_LENGTH - FORECAST_HORIZON + 1):
            future_index = start + SEQUENCE_LENGTH + FORECAST_HORIZON - 1
            future = raw[future_index]
            windows.append(raw[start : start + SEQUENCE_LENGTH])
            targets.append(future[4:])
            labels.append(float(_is_predictive_risk_event(future)))
            window_sessions.append(session_id)
            scenarios.append(rows[start].get("scenario_type", "legacy_unknown"))
            times.append(int(float(rows[start + SEQUENCE_LENGTH - 1]["time_elapsed"])))

    logger.info("Test split: %d сессий из %d, %d окон", len(test_ids), len(session_ids), len(windows))
    return TestSet(
        windows=np.asarray(windows, dtype=np.float32),
        targets=np.asarray(targets, dtype=np.float32),
        labels=np.asarray(labels, dtype=np.int8),
        session_ids=window_sessions,
        scenarios=scenarios,
        time_elapsed=times,
    )


def _binary_metrics(actual: np.ndarray, predicted: np.ndarray) -> dict[str, float | int]:
    """Возвращает матрицу ошибок и основные метрики бинарной классификации."""
    tp = int(np.sum((actual == 1) & (predicted == 1)))
    fp = int(np.sum((actual == 0) & (predicted == 1)))
    fn = int(np.sum((actual == 1) & (predicted == 0)))
    tn = int(np.sum((actual == 0) & (predicted == 0)))
    precision = tp / (tp + fp) if tp + fp else 0.0
    recall = tp / (tp + fn) if tp + fn else 0.0
    f1 = 2 * precision * recall / (precision + recall) if precision + recall else 0.0
    return {"tp": tp, "fp": fp, "fn": fn, "tn": tn, "precision": precision, "recall": recall, "f1": f1}


def _regression_metrics(actual: np.ndarray, predicted: np.ndarray) -> dict[str, list[float]]:
    """Считает MAE, RMSE и R² по температуре, давлению и уровню."""
    error = predicted - actual
    mae = np.mean(np.abs(error), axis=0)
    rmse = np.sqrt(np.mean(error**2, axis=0))
    residual = np.sum(error**2, axis=0)
    total = np.sum((actual - actual.mean(axis=0)) ** 2, axis=0)
    r2 = 1 - residual / np.maximum(total, 1e-12)
    return {"mae": mae.tolist(), "rmse": rmse.tolist(), "r2": r2.tolist()}


def _event_lead_time(session_ids: list[int], actual: np.ndarray, predicted: np.ndarray) -> dict[str, float | int | None]:
    """Считает lead time только по событиям, где alert предшествовал аварии."""
    leads: list[int] = []
    for session_id in sorted(set(session_ids)):
        indices = [index for index, value in enumerate(session_ids) if value == session_id]
        actual_indices = [index for index in indices if actual[index] == 1]
        alert_indices = [index for index in indices if predicted[index] == 1]
        if actual_indices and alert_indices and alert_indices[0] <= actual_indices[0]:
            # Alert строится на t + FORECAST_HORIZON, поэтому к разнице между
            # индексами окон добавляется сам горизонт прогноза.
            leads.append(actual_indices[0] - alert_indices[0] + FORECAST_HORIZON)
    if not leads:
        return {"events_with_lead": 0, "median_sec": None, "p10_sec": None}
    return {"events_with_lead": len(leads), "median_sec": float(np.median(leads)), "p10_sec": float(np.percentile(leads, 10))}


def _format_regression(name: str, metrics: dict[str, list[float]]) -> str:
    """Готовит строку таблицы регрессионных метрик для markdown-отчёта."""
    mae, rmse, r2 = metrics["mae"], metrics["rmse"], metrics["r2"]
    return f"| {name} | {mae[0]:.2f} | {mae[1]:.4f} | {mae[2]:.2f} | {rmse[0]:.2f} / {rmse[1]:.4f} / {rmse[2]:.2f} | {r2[0]:.3f} / {r2[1]:.3f} / {r2[2]:.3f} |"


def evaluate_models() -> dict[str, object]:
    """Оценивает чистую ONNX-регрессию и гибридный risk engine раздельно."""
    test_set = load_test_dataset()
    if not len(test_set.windows):
        raise RuntimeError("Не найдено окон для тестовой оценки")

    predictor = RiskPredictor()
    if not predictor.use_onnx:
        raise RuntimeError(f"ONNX недоступен: {predictor.model_version}")

    onnx_predictions, overheat_risks = [], []
    for window in test_set.windows:
        prediction, used_onnx = predictor.predict_parameters(window)
        if not used_onnx or prediction is None:
            raise RuntimeError("ONNX не вернул прогноз для test-окна")
        onnx_predictions.append(prediction)
        # Метрика относится только к размеченной задаче: будущему перегреву П-1.
        # Давление и уровень в runtime дополнительно защищает детерминированная ПАЗ.
        overheat_risks.append(100.0 if prediction[0] >= FURNACE_TEMP_CRITICAL_LEVEL else 0.0)

    onnx_predictions = np.asarray(onnx_predictions, dtype=np.float32)
    persistence = test_set.windows[:, -1, 4:]
    onnx_regression = _regression_metrics(test_set.targets, onnx_predictions)
    persistence_regression = _regression_metrics(test_set.targets, persistence)
    overheat_binary = np.asarray(overheat_risks) >= RISK_THRESHOLD
    overheat_metrics = _binary_metrics(test_set.labels, overheat_binary.astype(np.int8))
    # Псевдоним сохраняет компактный шаблон markdown-отчёта ниже.
    hybrid_metrics = overheat_metrics
    lead = _event_lead_time(test_set.session_ids, test_set.labels, overheat_binary.astype(np.int8))
    dataset_metadata_path = f"{DATASET_PATH}.metadata.json"
    metadata = {}
    if os.path.isfile(dataset_metadata_path):
        with open(dataset_metadata_path, encoding="utf-8") as metadata_file:
            metadata = json.load(metadata_file)

    report = f"""# Оценка ML-модуля\n\n**Дата запуска:** {dt.date.today().isoformat()}  \n**Датасет SHA-256:** `{_sha256(DATASET_PATH)}`  \n**Число test-окон:** {len(test_set.labels)}; положительных окон предаварийного перегрева П-1: {int(test_set.labels.sum())}.\n\n## Прогноз параметров: чистая ONNX LSTM\n\n| Модель | MAE T, °C | MAE P, МПа | MAE L, п.п. | RMSE T / P / L | R² T / P / L |\n|---|---:|---:|---:|---:|---:|\n{_format_regression('ONNX LSTM', onnx_regression)}\n{_format_regression('Persistence (последнее значение)', persistence_regression)}\n\nLSTM оценивается отдельно от fallback и технологических правил. Это прогноз T/P/L на {FORECAST_HORIZON} секунд, а не вероятность аварии.\n\n## Гибридный risk engine\n\n| TP | FP | FN | TN | Precision | Recall | F1 |\n|---:|---:|---:|---:|---:|---:|---:|\n| {hybrid_metrics['tp']} | {hybrid_metrics['fp']} | {hybrid_metrics['fn']} | {hybrid_metrics['tn']} | {hybrid_metrics['precision']:.3f} | {hybrid_metrics['recall']:.3f} | {hybrid_metrics['f1']:.3f} |\n\nLead time считается по первому alert до первого окна предаварийного перегрева П-1, а не подменяется горизонтом модели. Событий с измеренным упреждением: {lead['events_with_lead']}; median: {lead['median_sec']}; p10: {lead['p10_sec']}.\n\n## Ограничения\n\n- Данные синтетические; переносимость на реальную установку не доказана.\n- Метрики risk engine относятся к раннему обнаружению перегрева П-1; давление и уровни пока контролируются детерминированной ПАЗ.\n- Для конкурсной защиты следует заявлять только значения из этого отчёта и не подменять горизонт прогноза измеренным lead time.\n\n## Воспроизводимость\n\n```json\n{json.dumps(metadata, ensure_ascii=False, indent=2)}\n```\n"""
    report = report.replace("## Гибридный risk engine", "## ML-сигнал раннего перегрева П-1")
    report = report.replace(
        "Метрики risk engine относятся к раннему обнаружению перегрева П-1; давление и уровни пока контролируются детерминированной ПАЗ.",
        "Метрики ML-сигнала относятся к раннему обнаружению перегрева П-1; давление и уровни в runtime контролируются детерминированной ПАЗ.",
    )
    report = report.replace("  \n", "\n")
    with open(REPORT_PATH, "w", encoding="utf-8") as report_file:
        report_file.write(report)
    logger.info("Отчёт сохранён: %s", REPORT_PATH)
    return {"onnx_regression": onnx_regression, "risk": overheat_metrics, "lead": lead}


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
    evaluate_models()
