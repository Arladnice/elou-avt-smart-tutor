"""Слой domain: пороги доступны из пакета и не тянут за собой верхние слои."""

import inspect


def test_process_limits_importable_from_package():
    from elou_tutor.domain import process_limits

    # Значения дублируют регламент; их соответствие первоисточнику проверяет
    # test_regulation_conformance.py, здесь важен сам факт импорта из пакета
    assert process_limits.COLUMN_PRES_ESD == 0.4707
    assert process_limits.FURNACE_TEMP_CRITICAL == 365.0
    assert process_limits.COLUMN_LEVEL_LOW_INTERLOCK == 15.0
    assert process_limits.SESSION_MAX_TIME_SEC == 300


def test_domain_does_not_import_upper_layers():
    from elou_tutor.domain import process_limits

    source = inspect.getsource(process_limits)
    for forbidden in ("elou_tutor.api", "elou_tutor.services", "elou_tutor.db", "backend."):
        assert forbidden not in source, f"domain не должен зависеть от {forbidden}"
