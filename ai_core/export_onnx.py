import os
import sys
import logging
import numpy as np
import torch
import onnxruntime as ort

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')

# Add root directory to sys.path
ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
if ROOT_DIR not in sys.path:
    sys.path.append(ROOT_DIR)

from ai_core.predictive_engine import RiskLSTM, MODEL_PATH

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

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

    # Export path
    onnx_path = os.path.join(os.path.dirname(MODEL_PATH), "model.onnx")

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
    return True

if __name__ == "__main__":
    export_to_onnx()
