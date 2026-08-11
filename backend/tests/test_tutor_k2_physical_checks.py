"""
Финальное состояние К-2 должно влиять на оценку штатной сессии.

_apply_physical_checks — это anti-cheat: он ловит оператора, который выполнил
последовательность формально верно, но оставил установку в опасном состоянии.
До сих пор метод смотрел только на печь и К-1, поэтому сессию можно было
завершить с сорванным вакуумом и перегретым кубом К-2 на оценку «A».
"""

import pytest

from elou_tutor.domain.process_limits import (
    K2_LEVEL_HIGH,
    K2_LEVEL_LOW,
    K2_PRESSURE_NORMAL,
    K2_PRESSURE_WARNING,
    K2_TEMP_NORMAL,
    K2_TEMP_WARNING,
)
from elou_tutor.tutor.analyzer import ErrorAnalyzer
from elou_tutor.simulation.scenarios import get_scenario_by_id

# Безупречный пуск: эталонная последовательность и здоровый контур К-1
PERFECT_STARTUP = get_scenario_by_id("startup")["golden_sequence"]


def _sensors(**overrides):
    base = {
        "T_1": 300.0,
        "P_1": 0.25,
        "L_1": 50.0,
        "L_2": 50.0,
        "P_vac": K2_PRESSURE_NORMAL,
        "T_2": K2_TEMP_NORMAL,
    }
    base.update(overrides)
    return base


def _score(sensors, actions=PERFECT_STARTUP, scenario_id="startup"):
    score, errors, recs, _ = ErrorAnalyzer().evaluate_session(
        list(actions), scenario_id, final_sensors=sensors, time_elapsed=120,
    )
    return score, errors, recs


@pytest.fixture
def baseline():
    score, _, _ = _score(_sensors())
    return score


def test_healthy_k2_does_not_reduce_score(baseline):
    assert baseline == 100


def test_vacuum_left_broken_is_penalised(baseline):
    """Завершение сессии с сорванным вакуумом — опасное состояние установки."""
    score, errors, recs = _score(_sensors(P_vac=K2_PRESSURE_WARNING + 0.01))

    assert score < baseline
    assert any("вакуум" in e.get("text", "").lower() for e in errors)
    assert recs


def test_overheated_k2_bottom_is_penalised(baseline):
    """Перегрев куба выше 360°C — риск коксования и крекинга мазута."""
    score, errors, recs = _score(_sensors(T_2=K2_TEMP_WARNING + 5.0))

    assert score < baseline
    assert any("К-2" in e.get("text", "") for e in errors)
    assert recs


def test_flooded_k2_bottom_is_penalised(baseline):
    """Уровень выше верхней сигнализации — захлёбывание и переброс продукта."""
    score, errors, recs = _score(_sensors(L_2=K2_LEVEL_HIGH + 2.0))

    assert score < baseline
    assert any("К-2" in e.get("text", "") for e in errors)
    assert recs


def test_low_k2_level_is_not_penalised_on_column_shutdown():
    """
    Низкий уровень куба К-2 при останове колонны — норма, а не нарушение.

    В сценарии column_shutdown оператор закрывает V-3, приток кубового остатка
    прекращается, а насосы Н-4/Н-32 продолжают откачку — уровень штатно падает.
    Штраф за это наказывал бы за правильно выполненный регламент.
    """
    perfect_shutdown = get_scenario_by_id("column_shutdown")["golden_sequence"]
    sensors = _sensors(T_1=150.0, T_3=150.0, L_2=K2_LEVEL_LOW - 5.0)

    score, errors, _ = _score(sensors, actions=perfect_shutdown, scenario_id="column_shutdown")

    assert score == 100
    assert not any("К-2" in e.get("text", "") for e in errors)


def test_k2_checks_are_skipped_when_sensors_absent():
    """Старые вызовы без показаний К-2 не должны падать и не должны штрафовать."""
    sensors = {"T_1": 300.0, "P_1": 0.25, "L_1": 50.0}

    score, errors, _ = _score(sensors)

    assert score == 100
    assert not any("К-2" in e.get("text", "") for e in errors)
