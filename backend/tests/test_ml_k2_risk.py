"""
Риск-движок обязан видеть вакуумную колонну К-2.

LSTM прогнозирует только контур К-1 (7 фичей), и это осознанное ограничение
модели. Но детерминированная часть risk engine работает по фактическим
показаниям, и К-2 в ней обязана присутствовать: иначе срыв вакуума, перегрев
куба и опустошение К-2 не поднимают уровень риска на мнемосхеме вообще.
"""

import numpy as np
import pytest

from elou_tutor.domain.process_limits import (
    K2_LEVEL_HIGH_CRITICAL,
    K2_LEVEL_LOW_CRITICAL,
    K2_LEVEL_LOW_INTERLOCK,
    K2_PRESSURE_CRITICAL,
    K2_PRESSURE_NORMAL,
    K2_PRESSURE_WARNING,
    K2_TEMP_CRITICAL,
    K2_TEMP_NORMAL,
    K2_TEMP_WARNING,
)
from elou_tutor.ml.predictor import RiskPredictor


# Штатное окно К-1: клапаны открыты, температура и давление в норме.
def _calm_window():
    return np.tile(np.array([1.0, 0.0, 1.0, 280.0, 280.0, 0.25, 50.0]), (30, 1))


def _k2(level=50.0, pressure=K2_PRESSURE_NORMAL, temp=K2_TEMP_NORMAL):
    return {"L_2": level, "P_vac": pressure, "T_2": temp}


@pytest.fixture
def predictor():
    return RiskPredictor()


def test_calm_k2_does_not_add_risk(predictor):
    """Здоровая К-2 не должна сама по себе поднимать риск."""
    _, risk_without = predictor.predict_risk(_calm_window(), time_elapsed=150, scenario_id="shutdown")
    _, risk_with = predictor.predict_risk(
        _calm_window(), time_elapsed=150, scenario_id="shutdown", k2_sensors=_k2()
    )

    assert risk_with == risk_without


def test_vacuum_loss_raises_risk(predictor):
    """Срыв вакуума (рост остаточного давления) обязан поднимать риск."""
    _, calm_risk = predictor.predict_risk(
        _calm_window(), time_elapsed=150, scenario_id="shutdown", k2_sensors=_k2()
    )
    _, risk = predictor.predict_risk(
        _calm_window(), time_elapsed=150, scenario_id="shutdown",
        k2_sensors=_k2(pressure=(K2_PRESSURE_WARNING + K2_PRESSURE_CRITICAL) / 2),
    )

    assert risk > calm_risk


def test_vacuum_loss_at_interlock_pressure_is_maximum_risk(predictor):
    """Достижение порога блокировки PRSA 213 — это уже авария, а не тренд."""
    _, risk = predictor.predict_risk(
        _calm_window(), time_elapsed=150, scenario_id="shutdown",
        k2_sensors=_k2(pressure=K2_PRESSURE_CRITICAL),
    )

    assert risk == 100.0


def test_k2_bottom_draining_below_pump_interlock_raises_risk(predictor):
    """Уровень ниже блокировки насосов Н-4/Н-32 — кавитация и обнажение змеевиков."""
    _, calm_risk = predictor.predict_risk(
        _calm_window(), time_elapsed=150, scenario_id="shutdown", k2_sensors=_k2()
    )
    _, risk = predictor.predict_risk(
        _calm_window(), time_elapsed=150, scenario_id="shutdown",
        k2_sensors=_k2(level=K2_LEVEL_LOW_INTERLOCK - 1.0),
    )

    assert risk > calm_risk


def test_k2_critical_low_level_is_maximum_risk(predictor):
    _, risk = predictor.predict_risk(
        _calm_window(), time_elapsed=150, scenario_id="shutdown",
        k2_sensors=_k2(level=K2_LEVEL_LOW_CRITICAL - 1.0),
    )

    assert risk == 100.0


def test_empty_k2_is_safe_until_first_startup_fill(predictor):
    """Пустая К-2 — штатная фаза холодного пуска, а не авария."""
    _, risk = predictor.predict_risk(
        _calm_window(), time_elapsed=0, scenario_id="startup",
        k2_sensors=_k2(level=0.0), startup_k2_prefill=True,
    )

    assert risk < 100.0


def test_k2_flooding_is_maximum_risk(predictor):
    """Захлёбывание куба К-2 — переброс продукта, критическая ступень."""
    _, risk = predictor.predict_risk(
        _calm_window(), time_elapsed=150, scenario_id="shutdown",
        k2_sensors=_k2(level=K2_LEVEL_HIGH_CRITICAL + 1.0),
    )

    assert risk == 100.0


def test_k2_overheat_raises_risk(predictor):
    """Перегрев куба выше 360°C — риск коксования и крекинга мазута."""
    _, calm_risk = predictor.predict_risk(
        _calm_window(), time_elapsed=150, scenario_id="shutdown", k2_sensors=_k2()
    )
    _, risk = predictor.predict_risk(
        _calm_window(), time_elapsed=150, scenario_id="shutdown",
        k2_sensors=_k2(temp=(K2_TEMP_WARNING + K2_TEMP_CRITICAL) / 2),
    )

    assert risk > calm_risk


def test_k2_overheat_at_critical_is_maximum_risk(predictor):
    _, risk = predictor.predict_risk(
        _calm_window(), time_elapsed=150, scenario_id="shutdown",
        k2_sensors=_k2(temp=K2_TEMP_CRITICAL),
    )

    assert risk == 100.0


def test_session_state_feeds_k2_into_risk():
    """
    Рассылаемое состояние сессии обязано считать риск с учётом К-2.

    Движок, в который никто не передаёт показания, остаётся мёртвым кодом:
    на мнемосхеме оператор по-прежнему видел бы низкий риск при сорванном
    вакууме. Тест проверяет именно проводку, а не арифметику весов.
    """
    from elou_tutor.services.connection_manager import SimulationSession

    session = SimulationSession("k2-risk-probe")
    session.reset_session(username="probe", scenario="shutdown")

    session.simulator.sensors["P_vac"] = K2_PRESSURE_CRITICAL
    risk_with_vacuum_loss = session.get_full_state()["riskLevel"]

    session.simulator.sensors["P_vac"] = K2_PRESSURE_NORMAL
    risk_when_calm = session.get_full_state()["riskLevel"]

    assert risk_with_vacuum_loss > risk_when_calm


def test_missing_k2_sensors_keep_previous_behaviour(predictor):
    """
    Вызов без К-2 обязан работать как раньше.

    Офлайн-пайплайн и тесты качества LSTM зовут predict_risk без К-2, и их
    результаты не должны поехать от появления нового аргумента.
    """
    _, risk = predictor.predict_risk(_calm_window(), time_elapsed=150, scenario_id="shutdown")

    assert 0.0 <= risk <= 100.0
