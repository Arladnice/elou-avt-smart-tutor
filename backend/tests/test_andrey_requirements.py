"""Регрессии по замечаниям инженера АСУ ТП к сценариям и ПАЗ."""

import pytest

from elou_tutor.domain.process_limits import (
    K1_LEVEL_FULL_SCALE_MM,
    K2_LEVEL_FULL_SCALE_MM,
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
    rows = InterlockController().rows({"L_1": 50, "P_1": 0.25, "T_1": 280, "P_vac": 0.04, "T_2": 340})

    assert [row["tag"] for row in rows[:4]] == ["LIRSA 1a", "LIRSA 2a", "LIRSA 2д", "LIRSA 3a"]
    assert all(row["primary"] for row in rows[:4])
    assert not any(row["primary"] for row in rows[4:])
