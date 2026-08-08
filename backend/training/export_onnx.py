import os
import sys
import hashlib
import json
import logging
import numpy as np
import torch
import onnxruntime as ort

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')

# Каталог backend/ — родитель training/. Установленный пакет кладёт в sys.path
# только backend/src, поэтому «training» приходится добавлять самим.
BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from elou_tutor.ml.settings import ONNX_PATH, MODEL_MANIFEST_PATH
from training.config import DATASET_VERSION, MODEL_PATH
from training.train import RiskLSTM

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)


def _sha256(path: str) -> str:
    """Возвращает SHA-256 артефакта ONNX."""
    digest = hashlib.sha256()
    with open(path, "rb") as artifact_file:
        for chunk in iter(lambda: artifact_file.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _write_model_manifest(onnx_path: str) -> None:
    """Создаёт manifest с хэшами ONNX-графа и внешних весов."""
    artifact_dir = os.path.dirname(onnx_path)
    filenames = [os.path.basename(onnx_path)]
    external_data = f"{os.path.basename(onnx_path)}.data"
    if os.path.isfile(os.path.join(artifact_dir, external_data)):
        filenames.append(external_data)
    manifest = {
        "model_version": f"risk-lstm-{DATASET_VERSION}",
        "forecast_horizon_sec": 15,
        "files": {filename: _sha256(os.path.join(artifact_dir, filename)) for filename in filenames},
    }
    with open(MODEL_MANIFEST_PATH, "w", encoding="utf-8") as manifest_file:
        json.dump(manifest, manifest_file, ensure_ascii=False, indent=2)
        manifest_file.write("\n")
    logger.info("Manifest ONNX сохранён: %s", MODEL_MANIFEST_PATH)

def export_to_onnx():
    # Load model
    logger.info("Loading PyTorch model...")
    model = RiskLSTM(input_dim=7, hidden_dim=64, seq_len=30, output_dim=3, num_layers=2)
    if not os.path.exists(MODEL_PATH):
        logger.error("Error: %s not found!", MODEL_PATH)
        return False
        
    model.load_state_dict(torch.load(MODEL_PATH, map_location=torch.device('cpu')))
    model.eval()

    # Create dummy input
    dummy_input = torch.randn(1, 30, 7, dtype=torch.float32)

    # Путь выгрузки — артефакты рантайм-пакета: инференс читает модель оттуда
    onnx_path = ONNX_PATH

    # Export
    logger.info("Exporting model to ONNX at %s...", onnx_path)
    export_kwargs = {
        "input_names": ["input"],
        "output_names": ["output"],
        "dynamic_axes": {"input": {0: "batch_size"}, "output": {0: "batch_size"}},
        "opset_version": 11
    }
    # Для совместимости с PyTorch 2.6+ отключаем dynamo (или используем если доступно без ошибок)
    try:
        torch.onnx.export(model, dummy_input, onnx_path, dynamo=False, **export_kwargs)
    except TypeError:
        torch.onnx.export(model, dummy_input, onnx_path, **export_kwargs)
    
    file_size_mb = os.path.getsize(onnx_path) / (1024 * 1024)
    logger.info("ONNX model exported: %s (%.2f MB)", onnx_path, file_size_mb)
    
    # Smoke-test: загрузка и инференс на dummy-данных
    session = ort.InferenceSession(onnx_path)
    dummy_np = np.random.randn(1, 30, 7).astype(np.float32)
    result = session.run(None, {"input": dummy_np})
    
    assert result[0].shape == (1, 3), f"Unexpected output shape: {result[0].shape}"
    logger.info("ONNX smoke-test PASSED. Output shape: %s", result[0].shape)
    _write_model_manifest(onnx_path)
    return True

if __name__ == "__main__":
    export_to_onnx()
