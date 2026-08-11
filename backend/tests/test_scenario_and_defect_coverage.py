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


def test_shutdown_does_not_penalize_order_of_independent_operations() -> None:
    """Чек-лист аварийного останова допускает обратный порядок парных операций."""
    actions = [
        "FUEL_P3_CLOSE", "FUEL_P1_CLOSE", "V_1_CLOSE", "V_3_CLOSE",
        "V_P1_IN_CLOSE", "V_P3_OUT_CLOSE", "V_P3_RETURN_CLOSE",
        "HC_P1_OPEN", "HC_P3_OPEN", "V_STEAM_K1_CLOSE",
        "V_STEAM_K2_CLOSE", "N_3_STOP", "N_2_STOP",
    ]

    score, errors, _, _ = ErrorAnalyzer().evaluate_session(actions, "shutdown")

    assert score == 100
    assert errors == []


def test_column_shutdown_does_not_require_hidden_call_or_pump_stop_order() -> None:
    """Останов К-1 принимает полную последовательность из чек-листа оператора."""
    actions = [
        "SP_DOWN", "SP3_DOWN", "SP_DOWN", "SP3_DOWN", "N_20_STOP", "V_1_CLOSE",
        "HC_P1_OPEN", "HC_P3_OPEN", "V_STEAM_K1_CLOSE",
        "FUEL_P1_CLOSE", "FUEL_P3_CLOSE", "N_3_STOP", "N_2_STOP", "V_3_CLOSE",
    ]

    score, errors, _, _ = ErrorAnalyzer().evaluate_session(actions, "column_shutdown")

    assert score == 100
    assert errors == []


def test_overpressure_relief_feed_stop_does_not_overheat_p1() -> None:
    """Снижение нагрузки П-3 не требует скрытого снижения уставки П-1."""
    random.seed(20260811)
    simulator = ELOUAVTSimulator()
    simulator.reset("overpressure_relief")
    simulator.set_valve("V_E1_DRAIN", True)
    simulator.set_setpoint("T_3_Sp", 140.0)
    simulator.sensors["T_3"] = 250.0
    simulator.set_pump("N_20", False)
    simulator.set_valve("V_1", False)
    simulator.set_valve("V_2", True)

    for _ in range(20):
        simulator.step()

    assert simulator.status == "running"
    assert simulator.sensors["T_1"] < 340.0


@pytest.mark.parametrize(
    "actions",
    (
        ["V_E1_DRAIN_OPEN", "SP3_DOWN", "N_20_STOP", "V1_CLOSE"],
        ["V_E1_DRAIN_OPEN", "SP3_DOWN", "N_20_STOP", "V1_CLOSE", "V2_OPEN"],
    ),
)
def test_overpressure_relief_accepts_v2_only_when_needed(actions: list[str]) -> None:
    """Сброс V-2 в сценарии является допустимой, но не обязательной реакцией."""
    score, errors, _, _ = ErrorAnalyzer().evaluate_session(actions, "overpressure_relief")

    assert score == 100
    assert errors == []


def test_recirculation_does_not_penalize_intermediate_feed_adjustment() -> None:
    """Промежуточные движения ползунка Н-20 не являются лишними действиями."""
    actions = [
        "FEED_DOWN", "FEED_UP", "SP_DOWN", "SP3_DOWN", "FUEL_P1_CLOSE", "V1_CLOSE",
        "V3_CLOSE", "HC_P1_OPEN", "HC_P3_OPEN", "FUEL_P3_CLOSE",
    ]

    score, errors, _, _ = ErrorAnalyzer().evaluate_session(actions, "recirculation")

    assert score == 100
    assert errors == []


def test_recirculation_does_not_overheat_p1_after_feed_isolation() -> None:
    """Закрытие V-1 после снижения уставки должно охлаждать П-1, а не разгонять её."""
    random.seed(20260811)
    simulator = ELOUAVTSimulator()
    simulator.reset("recirculation")
    simulator.set_setpoint("T_1_Sp", 298.0)
    simulator.set_setpoint("T_3_Sp", 299.0)
    simulator.set_valve("V_1", False)
    simulator.set_valve("V_3", False)

    for _ in range(20):
        simulator.step()

    assert simulator.status == "running"
    assert simulator.sensors["T_1"] < 320.0


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
        elif key in state["pumps"]:
            assert state["pumps"][key] == expected
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


def test_vacuum_loss_response_prevents_k1_overfill_during_cooling() -> None:
    """Ожидание охлаждения при срыве вакуума безопасно только после отсечки сырья."""
    simulator = ELOUAVTSimulator()
    simulator.reset("vt_vacuum_failure")
    initial_level = simulator.sensors["L_1"]
    simulator.set_defect("vt_vacuum_loss", True)
    simulator.set_setpoint("T_1_Sp", 200.0)
    simulator.set_setpoint("T_3_Sp", 200.0)
    simulator.set_pump("N_20", False)
    simulator.set_valve("V_1", False)
    simulator.set_valve("V_STEAM_K2", False)
    simulator.set_valve("HC_P1", True)
    simulator.set_valve("HC_P3", True)

    for _ in range(60):
        simulator.step()

    assert simulator.status == "running"
    assert simulator.sensors["L_1"] < initial_level
    assert simulator.sensors["T_1"] <= 200.0
    assert simulator.sensors["T_3"] <= 201.0
    assert simulator.sensors["P_vac"] < 0.098
    assert simulator.sensors["T_2"] < 360.0


# ---------------------------------------------------------------
# Разбор неисправностей
# ---------------------------------------------------------------

DECLARED_DEFECTS = tuple(ELOUAVTSimulator().defects.keys())

DEFECT_REACTIONS = {
    "pump_fail": ["SP_DOWN", "SP3_DOWN", "N_20_STOP", "V1_CLOSE"],
    "coil_overheat": ["SP_DOWN", "V2_OPEN", "FUEL_P1_CLOSE", "V_P1_IN_CLOSE", "V3_CLOSE"],
    "valve_jam": ["ESD"],
    "power_fail": ["SP_DOWN", "V1_CLOSE"],
    "air_fail": ["SP_DOWN", "SP3_DOWN"],
    "steam_fail": ["V3_OPEN"],
    "elou_desalt_fail": ["V_ELOU_CLOSE", "N_20_STOP", "V1_CLOSE", "HC_P1_OPEN", "HC_P3_OPEN", "SP_DOWN", "SP3_DOWN"],
    "vt_vacuum_loss": ["SP_DOWN", "SP3_DOWN", "N_20_STOP", "V1_CLOSE", "V_STEAM_K2_CLOSE", "HC_P1_OPEN", "HC_P3_OPEN"],
    "k2_pump_fail": ["V3_CLOSE", "N_20_STOP", "V1_CLOSE"],
}


@pytest.mark.parametrize("defect_id", DECLARED_DEFECTS)
def test_every_declared_defect_has_parry_analysis(defect_id: str) -> None:
    """
    Каждая объявленная неисправность обязана разбираться тьютором.

    _evaluate_defect_handling возвращает None для неизвестного дефекта, и тогда
    сессия молча падает в общую LCS-оценку по эталону базового сценария:
    оператор, правильно отработавший аварию, получает тот же балл, что и
    полностью её проигнорировавший. Проверяем именно приватный метод — он и
    есть контракт разбора, снаружи его подмена ничем не отличима.
    """
    result = ErrorAnalyzer()._evaluate_defect_handling(
        ["V1_OPEN"], {defect_id}, "startup", None,
    )

    assert result is not None, f"неисправность {defect_id} не разбирается тьютором"


@pytest.mark.parametrize("defect_id", DECLARED_DEFECTS)
def test_defect_parry_distinguishes_action_from_inaction(defect_id: str) -> None:
    """
    Разбор обязан различать реакцию и бездействие.

    Заглушка, возвращающая один и тот же балл на любой набор действий,
    формально прошла бы предыдущий тест, но ничему не учила бы.
    """
    analyzer = ErrorAnalyzer()
    idle_score, _, _, _ = analyzer.evaluate_session(
        ["V1_OPEN"], "startup", defects_triggered={defect_id}, time_elapsed=120,
    )
    # Для каждого дефекта используем его утверждённую реакцию, а не общий
    # «мешок» команд: требования к П-1/П-3 и арматуре различаются.
    reacted_score, _, _, _ = analyzer.evaluate_session(
        DEFECT_REACTIONS[defect_id],
        "startup", defects_triggered={defect_id}, time_elapsed=120,
    )

    assert reacted_score > idle_score, (
        f"разбор {defect_id} не отличает реакцию оператора от бездействия"
    )


def test_defect_parry_ignores_implicit_startup_actions() -> None:
    """
    Разбор аварии обязан смотреть на реальные действия оператора.

    При пуске _normalize_startup_actions дописывает в список неявные операции
    (V1_OPEN, V3_OPEN), чтобы LCS-выравнивание не штрафовало за изначально
    открытую арматуру. Если этот дополненный список попадёт в разбор
    неисправностей, оператор получит зачёт за действие, которого не совершал:
    при срыве отпарного пара засчитывается «открыл дренаж V-3», хотя дренаж
    дописал анализатор.
    """
    analyzer = ErrorAnalyzer()

    score, errors, _, _ = analyzer.evaluate_session(
        ["V1_OPEN", "SP_UP"], "startup", defects_triggered={"steam_fail"}, time_elapsed=120,
    )

    assert score < 100, "зачёт выдан за неявное действие, дописанное анализатором"
    assert errors, "бездействие при срыве пара обязано попасть в разбор"
