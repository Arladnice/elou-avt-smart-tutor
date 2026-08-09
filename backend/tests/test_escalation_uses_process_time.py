"""
Эскалация бездействия обязана считаться по времени техпроцесса.

Таймер жил на time.time(), тогда как процесс идёт с множителем скорости и
умеет вставать на паузу. Отсюда два расхождения:
  * инструктор ставит паузу на две минуты, снимает — и оператор мгновенно
    получает «не реагировал 60 секунд», хотя процесс всё это время стоял;
  * на ускорении 5x эскалация приходит впятеро позже по времени процесса,
    то есть учебная норма реакции зависит от настроек стенда.
"""

import asyncio
import os

TEST_DB_PATH = os.path.join(os.path.dirname(__file__), "tutor_test.db")
os.environ.setdefault("DATABASE_PATH", TEST_DB_PATH)

from elou_tutor.db.database import init_db  # noqa: E402
from elou_tutor.domain.process_limits import (  # noqa: E402
    ESCALATION_CRITICAL_DELAY_SEC,
    ESCALATION_WARNING_DELAY_SEC,
)
from elou_tutor.services.connection_manager import SimulationSession  # noqa: E402
from elou_tutor.services.simulation_loop import step_session  # noqa: E402

init_db()


class _FakeWS:
    async def send_json(self, data):
        pass


def _critical_session(name):
    """
    Сессия в устойчиво критическом состоянии, но без аварии.

    Уровень куба 6% — ниже порога эскалации (8%) и выше аварийного (5%),
    клапаны закрыты, печь холодная. Проверено: состояние держится больше
    80 секунд, статус остаётся running, поэтому выдержку эскалации можно
    прогнать целиком. Высокая температура печи для этого не годится —
    она разгоняет давление до аварии за 31 секунду.
    """
    session = SimulationSession(name)
    session.operator_sockets.add(_FakeWS())
    session.active_scenario = "shutdown"
    session.simulator.sensors["T_1"] = 250.0
    session.simulator.setpoints["T_1_Sp"] = 250.0
    session.simulator.sensors["P_1"] = 0.25
    session.simulator.sensors["L_1"] = 6.0
    session.simulator.valves["V_1"] = False
    session.simulator.valves["V_3"] = False
    return session


def _advance(session, seconds):
    """Прогоняет N секунд техпроцесса за нулевое настенное время."""
    for _ in range(seconds):
        asyncio.run(step_session(session))


def _fingerprints(session):
    return {log.get("fingerprint") for log in session.logs}


def test_warning_escalation_fires_after_process_seconds():
    """30 секунд техпроцесса без реакции — первая ступень эскалации."""
    session = _critical_session("escalation_warning")

    _advance(session, int(ESCALATION_WARNING_DELAY_SEC) + 2)

    assert "escalation_alert_30" in _fingerprints(session)


def test_critical_escalation_fires_after_process_seconds():
    """60 секунд техпроцесса без реакции — вторая ступень."""
    session = _critical_session("escalation_critical")

    _advance(session, int(ESCALATION_CRITICAL_DELAY_SEC) + 2)

    assert "escalation_alert_60" in _fingerprints(session)


def test_escalation_does_not_fire_before_the_delay():
    """До истечения выдержки эскалации быть не должно."""
    session = _critical_session("escalation_early")

    _advance(session, int(ESCALATION_WARNING_DELAY_SEC) - 5)

    assert "escalation_alert_30" not in _fingerprints(session)


def test_pause_does_not_consume_the_reaction_budget():
    """
    Пауза не расходует норму реакции оператора.

    Процесс во время паузы стоит, значит и выдержка не идёт. На настенных
    часах любая пауза дольше минуты приводила к ложной эскалации сразу
    после возобновления.
    """
    session = _critical_session("escalation_paused")

    _advance(session, 10)

    session.is_paused = True
    # Пауза произвольной длительности: тактов много, времени процесса ноль
    _advance(session, 500)
    session.is_paused = False

    assert "escalation_alert_60" not in _fingerprints(session), (
        "пауза израсходовала норму реакции — таймер идёт по настенным часам"
    )


def test_operator_reaction_cancels_escalation():
    """Реакция оператора снимает эскалацию — поведение не должно измениться."""
    session = _critical_session("escalation_reaction")

    _advance(session, 10)
    session.operator_reacted_to_critical = True
    _advance(session, int(ESCALATION_CRITICAL_DELAY_SEC) + 2)

    assert "escalation_alert_60" not in _fingerprints(session)
