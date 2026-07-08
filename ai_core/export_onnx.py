import os
import sys
import torch

# Add root directory to sys.path
ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
sys.path.append(ROOT_DIR)

from ai_core.predictive_engine import RiskLSTM, MODEL_PATH

def export_to_onnx():
    # Load model
    print("Loading PyTorch model...")
    model = RiskLSTM(input_dim=3, hidden_dim=16, seq_len=30, output_dim=3)
    if not os.path.exists(MODEL_PATH):
        print(f"Error: {MODEL_PATH} not found!")
        return False
        
    model.load_state_dict(torch.load(MODEL_PATH, map_location=torch.device('cpu')))
    model.eval()

    # Create dummy input
    dummy_input = torch.randn(1, 30, 3, dtype=torch.float32)

    # Export path
    onnx_path = os.path.join(os.path.dirname(MODEL_PATH), "model.onnx")

    # Export
    print(f"Exporting model to ONNX at {onnx_path}...")
    torch.onnx.export(
        model,
        dummy_input,
        onnx_path,
        input_names=["input"],
        output_names=["output"],
        dynamic_axes={"input": {0: "batch_size"}, "output": {0: "batch_size"}},
        opset_version=11
    )
    print("Export successful!")
    return True

if __name__ == "__main__":
    export_to_onnx()
