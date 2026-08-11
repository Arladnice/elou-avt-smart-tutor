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

    simulator.set_setpoint("T_1_Sp", 260.0)
    simulator.set_setpoint("T_3_Sp", 400.0)
    simulator.set_valve("FUEL_P1", True)
    simulator.set_valve("FUEL_P3", True)
    simulator.set_pump("N_3", True)
    for _ in range(5):
        simulator.step()

    assert simulator.setpoints["T_1_Sp"] == 260.0
    assert simulator.setpoints["T_3_Sp"] == 400.0
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


def test_elou_salt_breakthrough_scenario_includes_isolation_and_actual_cooling():
    """Чек-лист и эталон не должны штрафовать за первую обязательную операцию."""
    scenario = get_scenario_by_id("elou_salt_breakthrough")
    assert scenario is not None
    assert scenario["golden_sequence"][0] == "V_ELOU_CLOSE"

    cooling = next(item for item in scenario["checklist"] if item["id"] == "reduce_heat")
    conditions = cooling["condition"]["conditions"]
    assert {("sensor_lte", "T_1"), ("sensor_lte", "T_3")} <= {
        (condition["type"], condition["target"]) for condition in conditions
    }


def test_vacuum_loss_stops_feed_before_waiting_for_cooling():
    """При срыве вакуума нельзя ждать охлаждения с продолжающейся подачей сырья."""
    scenario = get_scenario_by_id("vt_vacuum_failure")
    assert scenario is not None

    heat_reduction = next(item for item in scenario["checklist"] if item["id"] == "reduce_all_heat")
    conditions = heat_reduction["condition"]["conditions"]
    assert {("pump_is", "N_20", False), ("valve_is", "V_1", False)} <= {
        (condition["type"], condition["target"], condition["expected"])
        for condition in conditions
    }


def test_elou_salt_breakthrough_first_required_action_is_not_scored_as_extra():
    """V-ELOU — обязательный первый шаг, а не ложное «лишнее действие»."""
    scenario = get_scenario_by_id("elou_salt_breakthrough")
    assert scenario is not None

    score, errors, _, _ = ErrorAnalyzer().evaluate_session(
        scenario["golden_sequence"],
        "elou_salt_breakthrough",
        time_elapsed=60,
    )

    assert score == 100
    assert not any(error["title"] == "Лишние действия оператора" for error in errors)


def test_vacuum_loss_requires_actual_furnace_cooling_before_step_is_complete():
    """Смена уставки не означает, что печи уже успели остыть."""
    scenario = get_scenario_by_id("vt_vacuum_failure")
    assert scenario is not None

    heat_reduction = next(item for item in scenario["checklist"] if item["id"] == "reduce_all_heat")
    conditions = heat_reduction["condition"]["conditions"]
    assert {("sensor_lte", "T_1"), ("sensor_lte", "T_3")} <= {
        (condition["type"], condition["target"]) for condition in conditions
    }


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


def test_extra_valve_actions_are_marked_and_reduce_score():
    score, errors, recommendations, _ = ErrorAnalyzer().evaluate_session(
        ["V1_OPEN", "SP_UP", "V2_OPEN", "V2_CLOSE", "V3_OPEN"],
        "startup",
    )

    assert score < 100
    assert any(error["title"] == "Лишние действия оператора" for error in errors)
    assert any("снижают процент" in item for item in recommendations)


def test_repeated_setpoint_clicks_do_not_reduce_score():
    """Подбор уставки не должен наказываться как лишнее действие."""
    actions = list(get_scenario_by_id("startup")["golden_sequence"])
    actions.extend(["SP_UP", "SP_UP", "SP3_UP", "SP3_UP"])

    score, errors, _, _ = ErrorAnalyzer().evaluate_session(actions, "startup")

    assert score == 100
    assert not any(error["title"] == "Лишние действия оператора" for error in errors)


@pytest.mark.parametrize(
    ("scenario_id", "sensors"),
    [
        ("startup", {"T_1": 305.0, "T_3": 250.0, "L_1": 50.0}),
        ("shutdown", {"T_1": 200.0, "T_3": 280.0, "L_1": 50.0}),
        ("column_shutdown", {"T_1": 140.0, "T_3": 180.0, "L_1": 15.0}),
    ],
)
def test_scenario_completion_requires_both_furnace_temperatures(scenario_id, sensors):
    actions = get_scenario_by_id(scenario_id)["golden_sequence"]

    score, errors, _, _ = ErrorAnalyzer().evaluate_session(
        actions, scenario_id, final_sensors=sensors, time_elapsed=60,
    )

    assert score < 100
    assert any(error["title"] == "Температурный режим не достигнут" for error in errors)


def test_shutdown_has_explicit_furnace_route_isolation_step():
    scenario = get_scenario_by_id("shutdown")
    route_step = next(item for item in scenario["checklist"] if item["id"] == "close_furnace_routes")

    assert [condition["target"] for condition in route_step["condition"]["conditions"]] == [
        "V_1", "V_3", "V_P1_IN", "V_P3_OUT", "V_P3_RETURN",
    ]


def test_overpressure_reduces_p3_not_p1_and_recirculation_stops_p1_feed():
    overpressure = get_scenario_by_id("overpressure_relief")
    recirculation = get_scenario_by_id("recirculation")

    assert "SP3_DOWN" in overpressure["golden_sequence"]
    assert "SP_DOWN" not in overpressure["golden_sequence"]
    feed_stop = next(item for item in recirculation["checklist"] if item["id"] == "stop_feed_and_p1")
    assert [condition["target"] for condition in feed_stop["condition"]["conditions"]] == ["V_1", "V_3", "FUEL_P1"]


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


@pytest.mark.parametrize(
    ("defect", "correct_actions", "incomplete_actions"),
    [
        (
            "pump_fail",
            ["SP_DOWN", "SP3_DOWN", "V1_CLOSE"],
            ["SP_DOWN", "V1_CLOSE"],
        ),
        (
            "coil_overheat",
            ["SP_DOWN", "V2_OPEN", "FUEL_P1_CLOSE", "V_P1_IN_CLOSE", "V3_CLOSE"],
            ["SP_DOWN", "V2_OPEN", "FUEL_P1_CLOSE"],
        ),
        (
            "air_fail",
            ["SP_DOWN", "SP3_DOWN"],
            ["SP_DOWN"],
        ),
    ],
)
def test_defect_responses_require_all_requested_furnace_actions(
    defect, correct_actions, incomplete_actions,
):
    analyzer = ErrorAnalyzer()

    complete_score, complete_errors, _, _ = analyzer.evaluate_session(
        correct_actions, "shutdown", defects_triggered={defect}, time_elapsed=60,
    )
    incomplete_score, incomplete_errors, _, _ = analyzer.evaluate_session(
        incomplete_actions, "shutdown", defects_triggered={defect}, time_elapsed=60,
    )

    assert complete_score == 100
    assert complete_errors == []
    assert incomplete_score < complete_score
    assert incomplete_errors


def test_elou_isolation_stops_salt_breakthrough_dynamics():
    simulator = ELOUAVTSimulator()
    simulator.reset("elou_salt_breakthrough")
    simulator.set_defect("elou_desalt_fail", True)
    simulator.step()
    contaminated_salinity = simulator.sensors["Sal_1"]

    simulator.set_valve("V_ELOU", False)
    simulator.step()

    assert contaminated_salinity > 4.2
    assert simulator.sensors["Sal_1"] < contaminated_salinity


def test_k2_pump_failure_stops_both_outflow_pumps():
    simulator = ELOUAVTSimulator()
    simulator.set_defect("k2_pump_fail", True)

    assert simulator.pumps["N_4"] is False
    assert simulator.pumps["N_32"] is False

    simulator.sensors["L_2"] = 50.0
    simulator.set_pump("N_4", True)
    simulator.set_pump("N_32", True)

    assert simulator.pumps["N_4"] is False
    assert simulator.pumps["N_32"] is False


def test_cutting_p1_fuel_stops_extra_heat_from_coil_overheat():
    simulator = ELOUAVTSimulator()
    simulator.set_defect("coil_overheat", True)
    simulator.set_valve("FUEL_P1", False)
    start_temperature = simulator.sensors["T_1"]

    simulator.step()

    assert simulator.sensors["T_1"] < start_temperature


def test_interlock_operation_requires_fresh_engineer_authorization():
    controller = InterlockController()

    with pytest.raises(PermissionError):
        controller.set_bypass("К1 (куб)", True)

    controller.authorize_operation()
    controller.set_bypass("К1 (куб)", True)
    assert controller.bypasses["К1 (куб)"] is True
    assert controller.operation_authorized is False

    with pytest.raises(PermissionError):
        controller.set_bypass("К1 (куб)", False)


def test_bypass_cannot_be_enabled_after_paz_trip_but_can_be_removed():
    """Активный ПАЗ нельзя обойти, а снятие ранее включённой деблокировки допустимо."""
    controller = InterlockController()
    controller.authorize_operation()

    with pytest.raises(ValueError, match="Нельзя включить деблокировку"):
        controller.set_bypass("К2", True, trip_active=True)

    controller.set_bypass("К2", True)
    assert controller.bypasses["К2"] is True

    controller.authorize_operation()
    controller.set_bypass("К2", False, trip_active=True)
    assert controller.bypasses["К2"] is False


def test_interlock_panel_contains_six_rows_from_the_paz_table():
    rows = InterlockController().rows({"L_1": 50, "L_2": 50, "P_1": 0.25, "T_1": 280, "P_vac": 0.04, "T_2": 350})

    assert {row["tag"] for row in rows} == {
        "Е-1", "К1", "К1 (куб)", "Е-2", "К2", "К2 (куб)",
    }
    assert len(rows) == 6


def test_prsa_213_separates_signalization_from_paz_trip():
    """
    Строка ПАЗ обязана зажигаться по порогу блокировки, а не сигнализации.

    По регламенту PRSA 213 сигнализирует при 1,0 кгс/см², а блокировка идёт
    при 1,5 кгс/см². Панель ПАЗ показывает именно блокировки — остальные
    её строки (PRSA 204, TR 55-1, PRSA 204/II) так и устроены. Срабатывание
    по сигнализации учит оператора, что ПАЗ сработал там, где он ещё не сработал.
    """
    base = {"L_1": 50, "L_2": 50, "P_1": 0.25, "T_1": 280, "T_2": 350}

    at_alarm = InterlockController().rows({**base, "P_vac": K2_PRESSURE_WARNING})
    row_at_alarm = next(r for r in at_alarm if r["tag"] == "К2")
    assert row_at_alarm["signal"] is True
    assert row_at_alarm["trip"] is False

    at_trip = InterlockController().rows({**base, "P_vac": K2_PRESSURE_CRITICAL})
    assert next(r for r in at_trip if r["tag"] == "К2")["trip"] is False

    above_trip = InterlockController().rows({**base, "P_vac": K2_PRESSURE_CRITICAL + 0.001})
    assert next(r for r in above_trip if r["tag"] == "К2")["trip"] is True


def test_k2_cube_paz_trips_below_15_percent():
    rows = InterlockController().rows({"L_1": 50, "L_2": 7, "P_1": 0.25, "T_1": 280, "P_vac": 0.04, "T_2": 350})

    k2_cube = next(row for row in rows if row["tag"] == "К2 (куб)")
    assert k2_cube["signal"] is True
    assert k2_cube["trip"] is True


def test_k2_cube_paz_thresholds_do_not_change_during_startup_prefill():
    rows = InterlockController().rows(
        {"L_1": 0, "L_2": 0, "P_1": 0.05, "P_vac": 0.04},
        startup_k2_prefill=True,
    )

    k2_cube = next(row for row in rows if row["tag"] == "К2 (куб)")
    assert k2_cube["signal"] is True
    assert k2_cube["trip"] is True
