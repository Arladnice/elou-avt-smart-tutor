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
from elou_tutor.simulation.model import ELOUAVTSimulator
from elou_tutor.simulation.scenarios import get_scenario_by_id
from elou_tutor.tutor.analyzer import ErrorAnalyzer


def test_startup_scenario_uses_n20_route_and_temperature_tolerance():
    scenario = get_scenario_by_id("startup")

    assert "Н-20" in scenario["description"]
    heating = next(item for item in scenario["checklist"] if item["id"] == "furnaces_working")
    temperatures = [
        condition for condition in heating["condition"]["conditions"]
        if condition.get("target") in {"T_1", "T_3"}
    ]
    assert all(condition["expected"] == 300.0 for condition in temperatures)
    assert all(condition["tolerance"] == SETPOINT_ACCEPTANCE_TOLERANCE for condition in temperatures)


def test_furnaces_have_independent_setpoints_and_temperatures():
    simulator = ELOUAVTSimulator()
    simulator.reset("startup")

    simulator.set_setpoint("T_1_Sp", 300.0)
    simulator.set_setpoint("T_3_Sp", 320.0)
    simulator.set_valve("FUEL_P1", True)
    simulator.set_valve("FUEL_P3", True)
    for _ in range(5):
        simulator.step()

    assert simulator.setpoints["T_1_Sp"] == 300.0
    assert simulator.setpoints["T_3_Sp"] == 320.0
    assert simulator.sensors["T_3"] > simulator.sensors["T_1"]


def test_fuel_valves_drive_flame_indication():
    simulator = ELOUAVTSimulator()

    simulator.set_valve("FUEL_P1", False)
    simulator.step()

    assert simulator.sensors["Flame_P1"] is False
    assert simulator.sensors["Flame_P3"] is True


def test_shutdown_starts_above_first_cooling_threshold():
    """Этап охлаждения до 300°C нельзя засчитывать при старте останова."""
    simulator = ELOUAVTSimulator()
    simulator.reset("shutdown")

    assert simulator.sensors["T_1"] > 300.0
    assert simulator.sensors["T_3"] > 300.0


def test_recirculation_starts_above_first_cooling_threshold():
    """Рециркуляция должна требовать реального охлаждения до 300°C."""
    simulator = ELOUAVTSimulator()
    simulator.reset("recirculation")

    assert simulator.sensors["T_1"] > 300.0
    assert simulator.sensors["T_3"] > 300.0


def test_elou_salt_breakthrough_requires_operator_to_isolate_elou():
    """Изоляция ЭЛОУ должна быть действием оператора, а не исходным состоянием."""
    simulator = ELOUAVTSimulator()
    simulator.reset("elou_salt_breakthrough")

    assert simulator.valves["V_ELOU"] is True


def test_k2_pump_command_respects_low_level_interlock():
    simulator = ELOUAVTSimulator()
    simulator.sensors["L_2"] = 10.0
    simulator.pumps["N_4"] = False

    simulator.set_pump("N_4", True)

    assert simulator.pumps["N_4"] is False


def test_training_acceleration_is_exposed_to_operator():
    state = ELOUAVTSimulator().get_state()

    assert state["trainingAcceleration"] == {
        "Заполнение и уровень К-2": 4.0,
        "Давление К-2": 10.0,
        "Охлаждение К-2": 5.0,
    }


def test_scenarios_do_not_reference_p2():
    for scenario_id in (
        "startup", "shutdown", "column_shutdown", "overpressure_relief",
        "recirculation", "elou_salt_breakthrough", "vt_vacuum_failure",
    ):
        scenario = get_scenario_by_id(scenario_id)
        executable_part = {
            "initial_state": scenario["initial_state"],
            "checklist": scenario["checklist"],
            "golden_sequence": scenario["golden_sequence"],
        }
        assert "П-2" not in str(executable_part)


def test_extra_actions_are_marked_and_reduce_score():
    score, errors, recommendations, _ = ErrorAnalyzer().evaluate_session(
        ["V1_OPEN", "SP_UP", "V2_OPEN", "V2_CLOSE", "V3_OPEN"],
        "startup",
    )

    assert score < 100
    assert any(error["title"] == "Лишние действия оператора" for error in errors)
    assert any("снижают процент" in item for item in recommendations)


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
    actions = list(get_scenario_by_id("startup")["golden_sequence"])
    actions.insert(actions.index("SP_UP") + 1, "SETPOINT_OVERLIMIT")
    score, errors, _, _ = ErrorAnalyzer().evaluate_session(
        actions,
        "startup",
    )

    assert score == 60
    assert any("Завышенная уставка" in error["title"] for error in errors)


def test_interlock_operation_requires_fresh_engineer_authorization():
    controller = InterlockController()

    with pytest.raises(PermissionError):
        controller.set_bypass("LRCA 602", True)

    controller.authorize_operation()
    controller.set_bypass("LRCA 602", True)
    assert controller.bypasses["LRCA 602"] is True
    assert controller.operation_authorized is False

    with pytest.raises(PermissionError):
        controller.set_bypass("LRCA 602", False)


def test_only_regulation_trip_channels_are_marked_primary():
    rows = InterlockController().rows({"L_1": 50, "L_2": 50, "P_1": 0.25, "T_1": 280, "P_vac": 0.04, "T_2": 350})

    assert {row["tag"] for row in rows if row["primary"]} == {
        "LRCSA 603", "LRSA 603B", "PRSA 204", "LRSA 609В", "PRSA 213", "LRSA 604А",
    }
    assert len(rows) == 12


def test_prsa_213_trips_at_interlock_pressure_not_at_alarm():
    """
    Строка ПАЗ обязана зажигаться по порогу блокировки, а не сигнализации.

    По регламенту PRSA 213 сигнализирует при 1,0 кгс/см², а блокировка идёт
    при 1,5 кгс/см². Панель ПАЗ показывает именно блокировки — остальные
    её строки (PRSA 204, TR 55-1, PRSA 204/II) так и устроены. Срабатывание
    по сигнализации учит оператора, что ПАЗ сработал там, где он ещё не сработал.
    """
    base = {"L_1": 50, "L_2": 50, "P_1": 0.25, "T_1": 280, "T_2": 350}

    at_alarm = InterlockController().rows({**base, "P_vac": K2_PRESSURE_WARNING})
    assert next(r for r in at_alarm if r["tag"] == "PRSA 213")["alarm"] is False

    at_trip = InterlockController().rows({**base, "P_vac": K2_PRESSURE_CRITICAL})
    assert next(r for r in at_trip if r["tag"] == "PRSA 213")["alarm"] is True


def test_lrsa_604a_tracks_low_level_in_k2():
    rows = InterlockController().rows({"L_1": 50, "L_2": 7, "P_1": 0.25, "T_1": 280, "P_vac": 0.04, "T_2": 350})

    lrsa_604a = next(row for row in rows if row["tag"] == "LRSA 604А")
    assert lrsa_604a["alarm"] is True


def test_k2_low_level_interlocks_are_quiet_while_startup_prefills():
    rows = InterlockController().rows(
        {"L_1": 0, "L_2": 0, "P_1": 0.05, "P_vac": 0.04},
        startup_k2_prefill=True,
    )

    assert not next(row for row in rows if row["tag"] == "LRCA 604")["alarm"]
    assert not next(row for row in rows if row["tag"] == "LRSA 604А")["alarm"]
