"""Сквозное покрытие встроенных сценариев и физических эффектов дефектов."""

import random

import pytest

from elou_tutor.simulation.model import ELOUAVTSimulator
from elou_tutor.simulation.scenarios import get_scenario_by_id
from elou_tutor.tutor.analyzer import ErrorAnalyzer


BUILTIN_SCENARIO_IDS = (
    "startup",
    "shutdown",
    "column_shutdown",
    "overpressure_relief",
    "recirculation",
    "elou_salt_breakthrough",
    "vt_vacuum_failure",
)


@pytest.mark.parametrize("scenario_id", BUILTIN_SCENARIO_IDS)
def test_every_builtin_scenario_accepts_its_golden_sequence(scenario_id: str) -> None:
    """Каждый встроенный сценарий должен давать 100 баллов за эталонные действия."""
    scenario = get_scenario_by_id(scenario_id)
    assert scenario is not None

    score, errors, _, _ = ErrorAnalyzer().evaluate_session(
        scenario["golden_sequence"],
        scenario_id,
    )

    assert score == 100
    assert errors == []


@pytest.mark.parametrize("scenario_id", BUILTIN_SCENARIO_IDS)
def test_every_builtin_scenario_loads_its_initial_state(scenario_id: str) -> None:
    """Сброс симулятора должен воспроизводить начальные условия сценария."""
    scenario = get_scenario_by_id(scenario_id)
    assert scenario is not None

    simulator = ELOUAVTSimulator()
    simulator.reset(scenario_id)
    state = simulator.get_state()

    for key, expected in scenario["initial_state"].items():
        if key in state["valves"]:
            assert state["valves"][key] == expected
        elif key in state["setpoints"]:
            assert state["setpoints"][key] == expected
        else:
            assert state["sensors"][key] == expected


def _step_pair(control: ELOUAVTSimulator, defective: ELOUAVTSimulator) -> None:
    """Выполняет шаг двух моделей с одинаковой случайной составляющей."""
    random.seed(2026)
    control.step()
    random.seed(2026)
    defective.step()


def test_pump_failure_removes_k1_feed() -> None:
    control = ELOUAVTSimulator()
    defective = ELOUAVTSimulator()
    defective.set_defect("pump_fail", True)

    _step_pair(control, defective)

    assert defective.sensors["L_1"] < control.sensors["L_1"]


def test_coil_overheat_increases_furnace_temperature() -> None:
    control = ELOUAVTSimulator()
    defective = ELOUAVTSimulator()
    defective.set_defect("coil_overheat", True)

    _step_pair(control, defective)

    assert defective.sensors["T_1"] > control.sensors["T_1"]


def test_valve_jam_blocks_v2_pressure_relief() -> None:
    control = ELOUAVTSimulator()
    defective = ELOUAVTSimulator()
    control.valves["V_2"] = True
    defective.valves["V_2"] = True
    defective.set_defect("valve_jam", True)

    _step_pair(control, defective)

    assert defective.sensors["P_1"] > control.sensors["P_1"]


def test_steam_failure_raises_k1_pressure_and_level() -> None:
    control = ELOUAVTSimulator()
    defective = ELOUAVTSimulator()
    defective.set_defect("steam_fail", True)

    _step_pair(control, defective)

    assert defective.sensors["P_1"] > control.sensors["P_1"]
    assert defective.sensors["L_1"] > control.sensors["L_1"]


def test_elou_desalting_failure_worsens_salt_and_water_quality() -> None:
    simulator = ELOUAVTSimulator()
    initial_salt = simulator.sensors["Sal_1"]
    initial_water = simulator.sensors["W_1"]
    simulator.set_defect("elou_desalt_fail", True)

    for _ in range(10):
        simulator.step()

    assert simulator.sensors["Sal_1"] > initial_salt
    assert simulator.sensors["W_1"] > initial_water


def test_vacuum_failure_raises_k2_pressure_and_temperature() -> None:
    simulator = ELOUAVTSimulator()
    initial_pressure = simulator.sensors["P_vac"]
    initial_temperature = simulator.sensors["T_2"]
    simulator.set_defect("vt_vacuum_loss", True)

    simulator.step()

    assert simulator.sensors["P_vac"] > initial_pressure
    assert simulator.sensors["T_2"] > initial_temperature
