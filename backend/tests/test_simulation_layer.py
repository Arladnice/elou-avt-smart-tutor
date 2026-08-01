"""Слой simulation: модель и реестр сценариев без обходных импортов."""

import inspect
import os


def test_model_and_scenarios_importable():
    from elou_tutor.simulation.model import ELOUAVTSimulator
    from elou_tutor.simulation.scenarios import get_scenario_by_id

    sim = ELOUAVTSimulator()
    sim.reset("startup")
    assert sim.sensors["T_1"] == 20.0
    assert get_scenario_by_id("startup")["id"] == "startup"


def test_scenario_import_is_module_level():
    """Цикл разорван: импорт реестра стоит в шапке модуля, а не внутри reset()."""
    from elou_tutor.simulation import model

    source = inspect.getsource(model)
    assert "from elou_tutor.simulation.scenarios import" in source
    assert "from backend." not in source, "остался импорт веб-слоя"


def test_package_data_scenarios_resolvable():
    """scenarios.json лежит внутри пакета и находится без переменной окружения."""
    from elou_tutor.simulation import scenarios

    assert os.path.isfile(scenarios.SCENARIOS_FILE_PATH)
