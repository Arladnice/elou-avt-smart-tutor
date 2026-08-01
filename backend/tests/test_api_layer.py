"""Слой api: приложение собирается из пакета, адрес LLM конфигурируем."""

import importlib
import importlib.util
import inspect


def test_app_importable_from_package():
    from elou_tutor.api.main import app

    # FastAPI >= 0.141 держит подключённые роутеры обёрнутыми в app.routes,
    # поэтому список маршрутов берём из схемы OpenAPI — она плоская.
    assert "/api/health" in app.openapi()["paths"]


def test_llm_address_is_not_hardcoded():
    from elou_tutor.services import ai_chat_service

    source = inspect.getsource(ai_chat_service)
    assert "LLM_BASE_URL" in source
    assert "http://127.0.0.1:1234/v1/chat/completions" not in source


def test_llm_base_url_respects_environment(monkeypatch):
    monkeypatch.setenv("LLM_BASE_URL", "http://example.invalid:9999")
    from elou_tutor.services import ai_chat_service

    importlib.reload(ai_chat_service)
    assert ai_chat_service.LLM_BASE_URL == "http://example.invalid:9999"


def test_helpers_module_dissolved():
    assert importlib.util.find_spec("elou_tutor.utils") is None
