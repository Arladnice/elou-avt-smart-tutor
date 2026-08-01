"""Слой domain: пороги доступны из пакета и не тянут за собой верхние слои."""

import inspect


def test_process_limits_importable_from_package():
    from elou_tutor.domain import process_limits

    assert process_limits.COLUMN_PRES_ESD == 0.48
    assert process_limits.FURNACE_TEMP_CRITICAL == 365.0
    assert process_limits.COLUMN_LEVEL_LOW_INTERLOCK == 12.0
    assert process_limits.SESSION_MAX_TIME_SEC == 300


def test_domain_does_not_import_upper_layers():
    from elou_tutor.domain import process_limits

    source = inspect.getsource(process_limits)
    for forbidden in ("elou_tutor.api", "elou_tutor.services", "elou_tutor.db", "backend."):
        assert forbidden not in source, f"domain не должен зависеть от {forbidden}"
