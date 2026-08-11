"""
Рассылка не должна повторять неизменные поля каждую секунду.

Состояние уходит клиенту раз в секунду целиком. При заполненных лимитах
сессии это 87 КБ, из которых 52 КБ — журнал и 28 КБ — карточка оценки,
причём оба поля обычно не меняются между тактами: журнал пополняется по
событию, а карточка после завершения сессии статична. За пятиминутную
тренировку набегало около 25 МБ на клиента, и фронтенд на каждый пакет
заменял весь массив журнала целиком.

Поле actions (до 500 строк) не читает ни один потребитель — оно уходило
в каждый пакет впустую.
"""

import json
import os
import tempfile

os.environ.setdefault("DATABASE_PATH", os.path.join(tempfile.mkdtemp(), "broadcast.db"))

import asyncio  # noqa: E402

from elou_tutor.db.database import init_db  # noqa: E402
from elou_tutor.services.connection_manager import SimulationSession  # noqa: E402

init_db()


class RecordingWS:
    """Сокет, запоминающий отправленные пакеты."""

    def __init__(self):
        self.packets = []

    async def send_json(self, data):
        self.packets.append(data)

    def last(self):
        return self.packets[-1]


def _session(name):
    session = SimulationSession(name)
    session.reset_session(username="probe", scenario="startup")
    return session


def _connected(name):
    session = _session(name)
    ws = RecordingWS()
    session.operator_sockets.add(ws)
    return session, ws


def _broadcast(session):
    asyncio.run(session.broadcast_state())


def test_first_broadcast_carries_full_log():
    session, ws = _connected("payload_first")

    _broadcast(session)

    assert "logs" in ws.last(), "первый пакет обязан нести журнал целиком"
    assert ws.last()["logs"] == session.logs


def test_unchanged_log_is_not_resent():
    """Между тактами без событий журнал не должен повторяться."""
    session, ws = _connected("payload_unchanged")

    _broadcast(session)
    _broadcast(session)

    assert "logs" not in ws.last(), "неизменный журнал ушёл повторно"


def test_new_log_entry_is_delivered():
    session, ws = _connected("payload_new_entry")
    _broadcast(session)
    _broadcast(session)

    session.add_log("warning", "Новое событие процесса")
    _broadcast(session)

    assert "logs" in ws.last()
    assert ws.last()["logs"][-1]["message"] == "Новое событие процесса"


def test_repeat_counter_update_is_delivered():
    """
    Повтор по fingerprint правит запись на месте, не удлиняя журнал.

    Счётчик длины такое изменение не заметил бы, и клиент показывал бы
    устаревшее число повторов.
    """
    session, ws = _connected("payload_repeat")
    session.add_log("warning", "Давление растёт", fingerprint="pres_high")
    _broadcast(session)
    _broadcast(session)

    session.add_log("warning", "Давление растёт", fingerprint="pres_high")
    _broadcast(session)

    assert "logs" in ws.last(), "правка записи на месте не доехала до клиента"
    assert ws.last()["logs"][-1]["repeat_count"] == 2


def test_reset_resends_full_log():
    """После сброса сессии журнал другой — клиент обязан получить его целиком."""
    session, ws = _connected("payload_reset")
    _broadcast(session)
    _broadcast(session)

    session.reset_session(scenario="shutdown")
    _broadcast(session)

    assert "logs" in ws.last()
    assert ws.last()["logs"] == session.logs


def test_new_client_receives_full_state_on_connect():
    """Подключившийся в середине сессии получает полный снимок, а не дельту."""
    session, _ = _connected("payload_late_join")
    session.add_log("info", "Событие до подключения второго клиента")
    _broadcast(session)
    _broadcast(session)

    latecomer = RecordingWS()
    asyncio.run(session.send_state_to(latecomer))

    assert "logs" in latecomer.last()
    assert latecomer.last()["logs"] == session.logs


def test_unchanged_score_card_is_not_resent():
    session, ws = _connected("payload_card")
    session.simulator.status = "success"

    _broadcast(session)
    assert "scoreCard" in ws.last(), "карточка оценки не доехала при завершении"

    _broadcast(session)
    assert "scoreCard" not in ws.last(), "неизменная карточка ушла повторно"


def test_actions_are_not_broadcast():
    """Поле не читает ни один потребитель — в пакете ему не место."""
    session, ws = _connected("payload_actions")
    for _ in range(50):
        session.record_action("SP_UP")

    _broadcast(session)

    assert "actions" not in ws.last()


def test_completed_checklist_step_is_latched_on_server_and_reset_with_session():
    """Шаг сценария остаётся выполненным после штатного изменения режима."""
    session = SimulationSession("payload_checklist_latch")
    session.reset_session(username="probe", scenario="shutdown")

    session.simulator.set_valve("HC_P1", True)
    session.simulator.set_valve("HC_P3", True)
    completed = session.get_full_state()["completedChecklistSteps"]
    assert "hot_circulation" in completed

    # На последнем шаге останова Н-2/Н-3 штатно выключаются. Это не должно
    # отменять факт ранее выполненной горячей циркуляции.
    session.simulator.set_pump("N_2", False)
    session.simulator.set_pump("N_3", False)
    assert "hot_circulation" in session.get_full_state()["completedChecklistSteps"]

    session.reset_session(scenario="shutdown")
    assert session.get_full_state()["completedChecklistSteps"] == []


def test_steady_state_packet_is_small():
    """
    Такт без событий обязан быть на порядок легче полного снимка.

    Это и есть смысл правки: телеметрия идёт каждую секунду, а журнал и
    карточка меняются редко.
    """
    session, ws = _connected("payload_size")
    for i in range(200):
        session.add_log("info", f"Событие журнала номер {i} с типовой длиной сообщения")
    session.simulator.status = "success"

    _broadcast(session)
    full = len(json.dumps(ws.last(), ensure_ascii=False).encode("utf-8"))

    _broadcast(session)
    steady = len(json.dumps(ws.last(), ensure_ascii=False).encode("utf-8"))

    assert steady < full / 10, f"такт покоя {steady} Б против полного снимка {full} Б"
