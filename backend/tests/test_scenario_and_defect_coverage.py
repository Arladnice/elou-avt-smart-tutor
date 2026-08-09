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


# ---------------------------------------------------------------
# Разбор неисправностей
# ---------------------------------------------------------------

DECLARED_DEFECTS = tuple(ELOUAVTSimulator().defects.keys())


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
    # Набор со всеми штатными реакциями: какая-то из них верна для любого дефекта
    reacted_score, _, _, _ = analyzer.evaluate_session(
        ["V1_OPEN", "SP_DOWN", "V2_OPEN", "V3_OPEN", "V3_CLOSE", "V_ELOU_OPEN", "V_VT_OPEN", "ESD"],
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
