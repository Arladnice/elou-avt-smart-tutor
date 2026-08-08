"""Регрессии по замечаниям инженера АСУ ТП к сценариям и ПАЗ."""

import pytest

from elou_tutor.domain.process_limits import (
    K1_LEVEL_FULL_SCALE_MM,
    K2_LEVEL_FULL_SCALE_MM,
    K2_LEVEL_LOW,
    K2_LEVEL_LOW_CRITICAL,
    K2_LEVEL_LOW_INTERLOCK,
    K2_PRESSURE_CRITICAL,
    K2_PRESSURE_WARNING,
    SETPOINT_ACCEPTANCE_TOLERANCE,
)
from elou_tutor.services.interlocks import InterlockController
from elou_tutor.simulation.scenarios import get_scenario_by_id
from elou_tutor.tutor.analyzer import ErrorAnalyzer


def test_startup_scenario_uses_n20_route_and_temperature_tolerance():
    scenario = get_scenario_by_id("startup")

    assert "Н-20" in scenario["description"]
    heating = next(item for item in scenario["checklist"] if item["id"] == "sp_up")
    assert heating["condition"]["expected"] == 300.0
    assert heating["condition"]["tolerance"] == SETPOINT_ACCEPTANCE_TOLERANCE


def test_level_scales_are_bound_to_column_bottoms():
    assert K1_LEVEL_FULL_SCALE_MM == 2000.0
    assert K2_LEVEL_FULL_SCALE_MM == 4000.0


# 1 кгс/см² = 98066,5 Па. Пороги ПАЗ в диаграмме заданы в кгс/см², в коде — в МПа.
KGF_CM2_TO_MPA = 0.0980665


def test_k2_thresholds_match_hazop_interlock_table():
    """
    Пороги К-2 обязаны совпадать с ПАЗ-таблицей из docs/mini_hazop_andrey.md.

    Диаграмма инженера АСУ ТП — нормативный источник для учебного контура:
    К-2 (куб) сигнализация ≤20%, блокировка <15%; К-2 давление сигнализация
    ≥1,0 кгс/см², блокировка >1,5 кгс/см². Расхождение кода и документа
    означает, что тренажёр учит операторов не тем уставкам, которые команда
    защищает в пояснительной записке.
    """
    assert K2_LEVEL_LOW == 20.0
    assert K2_LEVEL_LOW_INTERLOCK == 15.0
    assert K2_PRESSURE_WARNING == pytest.approx(1.0 * KGF_CM2_TO_MPA, abs=1e-4)
    assert K2_PRESSURE_CRITICAL == pytest.approx(1.5 * KGF_CM2_TO_MPA, abs=1e-3)


def test_k2_alarm_ladder_keeps_warning_band_non_empty():
    """
    Между ступенью предупреждения и критической ступенью обязан остаться зазор.

    simulation_loop выбирает severity сравнением с двумя порогами подряд:
    если ступени сойдутся, ветка WARNING выродится в пустой интервал и
    оператор будет получать сразу CRITICAL.
    """
    assert K2_LEVEL_LOW_CRITICAL < K2_LEVEL_LOW_INTERLOCK < K2_LEVEL_LOW
    assert K2_PRESSURE_WARNING < K2_PRESSURE_CRITICAL


def test_pump_running_cut_forces_failed_score():
    score, errors, recommendations, _ = ErrorAnalyzer().evaluate_session(
        ["V1_OPEN", "PUMP_RUNNING_CUT", "SP_UP", "V3_OPEN"],
        "startup",
    )

    assert score == 0
    assert any("работающем насосе Н-20" in error["title"] for error in errors)
    assert any("закрытую задвижку" in item for item in recommendations)


def test_overlimit_setpoint_reduces_score():
    score, errors, _, _ = ErrorAnalyzer().evaluate_session(
        ["V1_OPEN", "SP_UP", "SETPOINT_OVERLIMIT", "V3_OPEN"],
        "startup",
    )

    assert score == 60
    assert any("Завышенная уставка" in error["title"] for error in errors)


def test_interlock_operation_requires_fresh_engineer_authorization():
    controller = InterlockController()

    with pytest.raises(PermissionError):
        controller.set_bypass("LIRSA 1a", True)

    controller.authorize_operation()
    controller.set_bypass("LIRSA 1a", True)
    assert controller.bypasses["LIRSA 1a"] is True
    assert controller.operation_authorized is False

    with pytest.raises(PermissionError):
        controller.set_bypass("LIRSA 1a", False)


def test_first_four_interlocks_are_marked_primary():
    rows = InterlockController().rows({"L_1": 50, "L_2": 50, "P_1": 0.25, "T_1": 280, "P_vac": 0.04, "T_2": 350})

    assert [row["tag"] for row in rows[:4]] == ["LIRSA 1a", "LIRSA 2a", "LIRSA 2д", "LIRSA 3a"]
    assert all(row["primary"] for row in rows[:4])
    assert not any(row["primary"] for row in rows[4:])


def test_pirsa_11a_trips_at_interlock_pressure_not_at_alarm():
    """
    Строка ПАЗ обязана зажигаться по порогу блокировки, а не сигнализации.

    По диаграмме PRSA 213 сигнализирует при ≥1,0 кгс/см², а блокировка идёт
    при >1,5 кгс/см². Панель ПАЗ показывает именно блокировки — остальные
    её строки (PIRSA 9a, TIRSA 10a, PIRSA 13a) так и устроены. Срабатывание
    по сигнализации учит оператора, что ПАЗ сработал там, где он ещё не сработал.
    """
    base = {"L_1": 50, "L_2": 50, "P_1": 0.25, "T_1": 280, "T_2": 350}

    at_alarm = InterlockController().rows({**base, "P_vac": K2_PRESSURE_WARNING})
    assert next(r for r in at_alarm if r["tag"] == "PIRSA 11a")["alarm"] is False

    at_trip = InterlockController().rows({**base, "P_vac": K2_PRESSURE_CRITICAL})
    assert next(r for r in at_trip if r["tag"] == "PIRSA 11a")["alarm"] is True


def test_lirsa_3a_tracks_low_level_in_k2():
    rows = InterlockController().rows({"L_1": 50, "L_2": 7, "P_1": 0.25, "T_1": 280, "P_vac": 0.04, "T_2": 350})

    lirsa_3a = next(row for row in rows if row["tag"] == "LIRSA 3a")
    assert lirsa_3a["alarm"] is True
