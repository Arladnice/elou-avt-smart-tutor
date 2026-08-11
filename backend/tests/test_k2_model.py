"""Регрессии физической модели вакуумной колонны К-2 и останова К-1."""

import random

import pytest

from elou_tutor.domain.process_limits import (
    K2_COOLING_FULL_C_PER_SEC,
    K2_COOLING_TRAINING_ACCELERATION,
    K2_LEVEL_RESPONSE_DELAY_SEC,
    K2_LEVEL_RISE_PCT_PER_SEC,
    K2_LEVEL_TRAINING_ACCELERATION,
    K2_PRESSURE_RISE_MPA_PER_SEC,
    K2_PRESSURE_TRAINING_ACCELERATION,
)
from elou_tutor.simulation.k2 import K2Dynamics
from elou_tutor.simulation.model import ELOUAVTSimulator


def test_k2_rates_match_andrey_calculation():
    assert K2_LEVEL_RISE_PCT_PER_SEC == pytest.approx(0.248756, rel=1e-5)
    assert K2_PRESSURE_RISE_MPA_PER_SEC == pytest.approx(0.0000404)
    assert K2_COOLING_FULL_C_PER_SEC == pytest.approx(0.0582)


def test_k2_level_is_balanced_with_feed_and_outflow():
    model = K2Dynamics()

    level, _, _ = model.step(
        level=50.0,
        pressure=0.04,
        temperature=350.0,
        feed_open=True,
        outflow_available=True,
        vacuum_available=True,
        heat_available=True,
    )

    assert level == pytest.approx(50.0)


def test_k2_level_rises_after_outflow_failure_delay():
    model = K2Dynamics()
    level = 50.0

    accelerated_delay = int(K2_LEVEL_RESPONSE_DELAY_SEC / K2_LEVEL_TRAINING_ACCELERATION)
    for _ in range(accelerated_delay):
        level, _, _ = model.step(
            level=level,
            pressure=0.04,
            temperature=350.0,
            feed_open=True,
            outflow_available=False,
            vacuum_available=True,
            heat_available=True,
        )
    assert level == pytest.approx(50.0)

    level, _, _ = model.step(
        level=level,
        pressure=0.04,
        temperature=350.0,
        feed_open=True,
        outflow_available=False,
        vacuum_available=True,
        heat_available=True,
    )
    assert level == pytest.approx(50.0 + K2_LEVEL_RISE_PCT_PER_SEC * K2_LEVEL_TRAINING_ACCELERATION)


def test_k2_vacuum_loss_uses_physical_pressure_rate():
    pressure = 0.07
    _, next_pressure, _ = K2Dynamics().step(
        level=50.0,
        pressure=pressure,
        temperature=350.0,
        feed_open=True,
        outflow_available=True,
        vacuum_available=False,
        heat_available=True,
    )

    assert next_pressure == pytest.approx(
        pressure + K2_PRESSURE_RISE_MPA_PER_SEC * K2_PRESSURE_TRAINING_ACCELERATION
    )


def test_k2_cooling_depends_on_liquid_inventory():
    _, _, full_temp = K2Dynamics().step(
        level=100.0,
        pressure=0.04,
        temperature=350.0,
        feed_open=False,
        outflow_available=False,
        vacuum_available=True,
        heat_available=False,
    )
    _, _, half_temp = K2Dynamics().step(
        level=50.0,
        pressure=0.04,
        temperature=350.0,
        feed_open=False,
        outflow_available=False,
        vacuum_available=True,
        heat_available=False,
    )

    assert 350.0 - full_temp == pytest.approx(
        K2_COOLING_FULL_C_PER_SEC * K2_COOLING_TRAINING_ACCELERATION
    )
    assert 350.0 - half_temp == pytest.approx(
        K2_COOLING_FULL_C_PER_SEC * K2_COOLING_TRAINING_ACCELERATION * 2.0
    )


def test_simulator_exposes_k2_level_in_telemetry():
    simulator = ELOUAVTSimulator()

    assert simulator.get_state()["sensors"]["L_2"] == 50.0


def test_simulator_preserves_small_k2_pressure_and_temperature_changes():
    simulator = ELOUAVTSimulator()
    simulator.valves["V_VT"] = False
    initial_pressure = simulator.sensors["P_vac"]
    initial_temperature = simulator.sensors["T_2"]

    simulator.step()

    assert simulator.sensors["P_vac"] > initial_pressure
    assert simulator.sensors["T_2"] > initial_temperature


def test_k2_pump_failure_drives_level_after_transport_delay():
    simulator = ELOUAVTSimulator()
    simulator.set_defect("k2_pump_fail", True)
    initial_level = simulator.sensors["L_2"]

    accelerated_delay = int(K2_LEVEL_RESPONSE_DELAY_SEC / K2_LEVEL_TRAINING_ACCELERATION)
    for _ in range(accelerated_delay):
        simulator.step()
    assert simulator.sensors["L_2"] == pytest.approx(initial_level)

    simulator.step()
    assert simulator.sensors["L_2"] > initial_level


def test_power_failure_stops_both_k2_feed_and_outflow():
    simulator = ELOUAVTSimulator()
    simulator.valves["V_3"] = True
    initial_level = simulator.sensors["L_2"]

    simulator.set_defect("power_fail", True)
    for _ in range(K2_LEVEL_RESPONSE_DELAY_SEC + 1):
        simulator.step()

    assert simulator.sensors["L_2"] == pytest.approx(initial_level)


def test_startup_k2_working_pump_stabilizes_level_after_filling():
    """После заполнения К-2 рабочая откачка Н-4 не даёт уровню уйти к 100%."""
    simulator = ELOUAVTSimulator()
    simulator.reset("startup")
    simulator.sensors["L_2"] = 20.0
    simulator.valves["V_3"] = True
    simulator.valves["V_P1_IN"] = True
    simulator.pumps["N_2"] = True
    simulator.valves["V_K2_OUT_4"] = True
    simulator.set_pump("N_4", True)

    for _ in range(90):
        simulator.step()

    assert simulator.sensors["L_2"] == pytest.approx(20.0)


def test_startup_transfer_keeps_k1_level_stable_with_n20_and_n2_running():
    """Штатная передача в К-2 не должна опустошать куб К-1 ниже 20%."""
    simulator = ELOUAVTSimulator()
    simulator.reset("startup")
    simulator.sensors["L_1"] = 20.0
    simulator.valves["V_1"] = True
    simulator.pumps["N_20"] = True
    simulator.valves["V_3"] = True
    simulator.valves["V_P1_IN"] = True
    simulator.pumps["N_2"] = True

    for _ in range(120):
        simulator.step()

    assert simulator.sensors["L_1"] >= 20.0


def test_shutdown_sequence_keeps_column_in_safe_range_until_pump_stop():
    """Корректный останов печей не должен сам приводить к переполнению К-1/К-2."""
    simulator = ELOUAVTSimulator()
    simulator.reset("shutdown")

    for valve_id in ("FUEL_P1", "FUEL_P3", "V_1", "V_3", "V_P1_IN", "V_P3_OUT", "V_P3_RETURN"):
        simulator.set_valve(valve_id, False)
    simulator.set_valve("HC_P1", True)
    simulator.set_valve("HC_P3", True)
    for valve_id in ("V_STEAM_K1", "V_STEAM_K2", "V_VT"):
        simulator.set_valve(valve_id, False)

    for _ in range(90):
        simulator.step()

    assert simulator.status == "running"
    assert simulator.sensors["L_1"] < 85.0
    assert simulator.sensors["L_2"] >= 20.0


def test_column_shutdown_final_isolation_holds_k1_level_in_target_range():
    """Финальный останов К-1 не должен самопроизвольно повышать L-1."""
    random.seed(20260811)
    simulator = ELOUAVTSimulator()
    simulator.reset("column_shutdown")
    simulator.sensors["L_1"] = 18.0

    for valve_id in ("V_1", "V_3", "FUEL_P1", "FUEL_P3", "V_STEAM_K1"):
        simulator.set_valve(valve_id, False)
    simulator.set_pump("N_2", False)
    simulator.set_pump("N_3", False)

    for _ in range(20):
        simulator.step()

    assert 16.0 <= simulator.sensors["L_1"] <= 20.0


def test_column_shutdown_circulation_keeps_draining_with_vacuum_steam_closed():
    """Закрытие V-VT не должно поднимать L-1 до финального закрытия V-3."""
    random.seed(20260811)
    simulator = ELOUAVTSimulator()
    simulator.reset("column_shutdown")
    simulator.sensors["L_1"] = 25.0
    simulator.sensors["P_vac"] = 0.08

    for valve_id in ("V_1", "FUEL_P1", "FUEL_P3", "V_STEAM_K1", "V_VT"):
        simulator.set_valve(valve_id, False)
    simulator.set_valve("V_3", True)
    simulator.set_pump("N_2", True)

    for _ in range(10):
        simulator.step()

    assert simulator.sensors["L_1"] < 22.0


def test_recirculation_isolates_k1_from_n2_drain():
    """После закрытия V-3 Н-2 не должен опустошать куб К-1 на рециркуляции."""
    random.seed(20260811)
    simulator = ELOUAVTSimulator()
    simulator.reset("recirculation")

    for valve_id in ("V_1", "V_3", "FUEL_P1", "FUEL_P3"):
        simulator.set_valve(valve_id, False)
    simulator.set_valve("HC_P1", True)
    simulator.set_valve("HC_P3", True)

    for _ in range(120):
        simulator.step()

    assert simulator.status == "running"
    assert simulator.sensors["L_1"] >= 45.0
