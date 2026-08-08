"""Проверка целостности поставляемых ONNX-артефактов."""

import hashlib
import json
import os
from typing import Tuple

from elou_tutor.ml.settings import MODEL_MANIFEST_PATH


def _sha256(path: str) -> str:
    """Возвращает SHA-256 файла без загрузки всего содержимого в память."""
    digest = hashlib.sha256()
    with open(path, "rb") as artifact_file:
        for chunk in iter(lambda: artifact_file.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def verify_model_artifacts() -> Tuple[bool, str]:
    """Проверяет manifest и хэши ONNX-графа с внешним файлом весов."""
    if not os.path.isfile(MODEL_MANIFEST_PATH):
        return False, "Не найден manifest ONNX-модели"
    try:
        with open(MODEL_MANIFEST_PATH, encoding="utf-8") as manifest_file:
            manifest = json.load(manifest_file)
        files = manifest.get("files", {})
        if not files:
            return False, "Manifest ONNX-модели не содержит файлов"
        artifact_dir = os.path.dirname(MODEL_MANIFEST_PATH)
        for filename, expected_hash in files.items():
            if os.path.basename(filename) != filename:
                return False, "Manifest ONNX-модели содержит небезопасный путь"
            artifact_path = os.path.join(artifact_dir, filename)
            if not os.path.isfile(artifact_path):
                return False, f"Не найден артефакт модели: {filename}"
            if _sha256(artifact_path).lower() != str(expected_hash).lower():
                return False, f"Не совпал SHA-256 артефакта: {filename}"
        return True, str(manifest.get("model_version", "unknown"))
    except (OSError, ValueError, TypeError) as exc:
        return False, f"Не удалось проверить ONNX-артефакты: {exc}"
