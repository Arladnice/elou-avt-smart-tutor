"""Регрессии физической модели вакуумной колонны К-2."""

import pytest

from elou_tutor.domain.process_limits import (
    K2_COOLING_FULL_C_PER_SEC,
    K2_LEVEL_RESPONSE_DELAY_SEC,
    K2_LEVEL_RISE_PCT_PER_SEC,
    K2_PRESSURE_RISE_MPA_PER_SEC,
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

    for _ in range(K2_LEVEL_RESPONSE_DELAY_SEC):
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
    assert level == pytest.approx(50.0 + K2_LEVEL_RISE_PCT_PER_SEC)


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

    assert next_pressure == pytest.approx(pressure + K2_PRESSURE_RISE_MPA_PER_SEC)


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

    assert 350.0 - full_temp == pytest.approx(K2_COOLING_FULL_C_PER_SEC)
    assert 350.0 - half_temp == pytest.approx(K2_COOLING_FULL_C_PER_SEC * 2.0)


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

    for _ in range(K2_LEVEL_RESPONSE_DELAY_SEC):
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
