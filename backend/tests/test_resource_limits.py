"""
Тесты-критерии приёмки для этапа 3: ресурсы и устойчивость.

Покрывают дефекты ревью:
  11. Неограниченный рост logs/actions_taken — каждая рассылка тащит весь массив.
  12. Запись scenarios.json неатомарна: сбой оставляет обрезанный файл.
  13. Блокирующие обращения к SQLite в event loop, нет timeout и WAL.
  6.  Пустой messages в чате роняет эндпоинт, таймаут LLM держит поток 5 минут.
"""

import os
import sys
import json
import asyncio
import sqlite3
import unittest

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

from fastapi.testclient import TestClient

from elou_tutor.db.database import init_db, DB_PATH
from backend.main import app


def _token(client, username, role):
    resp = client.post(
        "/api/auth/login",
        json={"username": username, "password": "Ktk_2026!", "role": role},
    )
    assert resp.status_code == 200, resp.text
    return resp.json()["token"]


class TestSessionStateIsBounded(unittest.TestCase):
    """Состояние сессии не должно расти неограниченно за время тренировки."""

    def setUp(self):
        from backend.services.connection_manager import SimulationSession
        self.session = SimulationSession("bounded_probe")

    def test_logs_are_capped(self):
        from backend.services.connection_manager import MAX_SESSION_LOGS

        for i in range(MAX_SESSION_LOGS * 3):
            self.session.add_log("info", f"Событие номер {i}")

        self.assertLessEqual(len(self.session.logs), MAX_SESSION_LOGS)

    def test_newest_logs_are_kept(self):
        """Обрезать нужно старые записи: оператору важны последние события."""
        from backend.services.connection_manager import MAX_SESSION_LOGS

        for i in range(MAX_SESSION_LOGS + 50):
            self.session.add_log("info", f"Событие номер {i}")

        messages = [entry["message"] for entry in self.session.logs]
        self.assertIn(f"Событие номер {MAX_SESSION_LOGS + 49}", messages)
        self.assertNotIn("Событие номер 0", messages)

    def test_actions_are_capped(self):
        from backend.services.connection_manager import MAX_SESSION_ACTIONS

        for _ in range(MAX_SESSION_ACTIONS * 3):
            self.session.record_action("SP_UP")

        self.assertLessEqual(len(self.session.actions_taken), MAX_SESSION_ACTIONS)

    def test_broadcast_payload_stays_bounded(self):
        """Рассылка идёт раз в секунду каждому клиенту — её размер критичен."""
        for i in range(5000):
            self.session.add_log("info", f"Длинное сообщение оператора номер {i} по регламенту установки")
            self.session.record_action("SP_UP")

        payload_kb = len(json.dumps(self.session.get_full_state(), ensure_ascii=False)) / 1024
        self.assertLess(
            payload_kb, 120,
            f"Полезная нагрузка рассылки выросла до {payload_kb:.0f} КБ"
        )


class TestDatabaseConfiguration(unittest.TestCase):
    """Настройки SQLite под конкурентную запись."""

    def setUp(self):
        init_db()

    def test_wal_mode_is_enabled(self):
        """WAL позволяет читать во время записи и снимает часть блокировок."""
        from elou_tutor.db.database import get_db_connection

        with get_db_connection() as conn:
            mode = conn.execute("PRAGMA journal_mode").fetchone()[0]
        self.assertEqual(mode.lower(), "wal")

    def test_connection_has_busy_timeout(self):
        """Без таймаута конкурентная запись сразу падает с 'database is locked'."""
        from elou_tutor.db.database import get_db_connection

        with get_db_connection() as conn:
            timeout_ms = conn.execute("PRAGMA busy_timeout").fetchone()[0]
        self.assertGreater(timeout_ms, 0)


class TestAsyncAuditLogging(unittest.TestCase):
    """Запись в журнал из асинхронного кода не должна блокировать event loop."""

    def setUp(self):
        init_db()

    def test_async_audit_event_is_persisted(self):
        from elou_tutor.db.audit import log_audit_event_async

        async def scenario():
            await log_audit_event_async("operator_1", "ASYNC_PROBE", "проверка записи")

        asyncio.run(scenario())

        conn = sqlite3.connect(DB_PATH)
        row = conn.execute(
            "SELECT actor FROM audit_logs WHERE action = 'ASYNC_PROBE' ORDER BY id DESC LIMIT 1"
        ).fetchone()
        conn.close()
        self.assertIsNotNone(row)
        self.assertEqual(row[0], "operator_1")

    def test_async_audit_keeps_loop_responsive(self):
        from elou_tutor.db.audit import log_audit_event_async

        async def scenario():
            ticks = 0
            stop = False

            async def heartbeat():
                nonlocal ticks
                while not stop:
                    ticks += 1
                    await asyncio.sleep(0.001)

            hb = asyncio.create_task(heartbeat())
            await asyncio.sleep(0.01)
            for i in range(100):
                await log_audit_event_async("operator_1", "LOOP_PROBE", f"запись {i}")
            stop = True
            hb.cancel()
            return ticks

        ticks = asyncio.run(scenario())
        self.assertGreater(
            ticks, 20,
            "Event loop простаивал во время записи журнала — запись идёт в его потоке"
        )


class TestHotPathsDoNotBlockLoop(unittest.TestCase):
    """
    Правило: в асинхронных горячих путях запись в БД идёт через to_thread.

    Проверяется статически по исходникам — замер времени в event loop даёт
    плавающий результат, а нарушение правила видно однозначно.
    """

    _BACKEND = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    HOT_PATH_FILES = [
        os.path.join(_BACKEND, "routes", "ws.py"),
        os.path.join(_BACKEND, "services", "simulation_loop.py"),
    ]

    def test_session_save_is_offloaded_from_the_loop(self):
        """Сохранение сессии тянет инференс модели и запись в БД — не в event loop."""
        import re

        for path in self.HOT_PATH_FILES:
            with open(path, encoding="utf-8") as f:
                source = f.read()
            offenders = [
                line.strip()
                for line in source.splitlines()
                if re.search(r"(?<!to_thread\()\bsession\.save_completed_session\(\)", line)
            ]
            with self.subTest(file=os.path.basename(path)):
                self.assertEqual(
                    offenders, [],
                    f"Блокирующее сохранение сессии в асинхронном коде: {offenders}"
                )

    def test_async_handlers_use_async_audit_logging(self):
        import re

        for path in self.HOT_PATH_FILES:
            with open(path, encoding="utf-8") as f:
                source = f.read()
            offenders = [
                line.strip()
                for line in source.splitlines()
                if re.search(r"(?<!await )(?<!async )\blog_audit_event\(", line)
                and "import" not in line
            ]
            with self.subTest(file=os.path.basename(path)):
                self.assertEqual(
                    offenders, [],
                    f"Синхронная запись аудита в асинхронном обработчике: {offenders}"
                )


class TestAtomicScenarioWrite(unittest.TestCase):
    """Сбой в момент записи не должен разрушать реестр сценариев."""

    def test_failed_write_leaves_file_intact(self):
        from elou_tutor.simulation import scenarios as scenario_manager

        original = scenario_manager.load_scenarios()
        self.assertTrue(original, "Тест бессмыслен на пустом реестре")

        real_dump = json.dump

        def exploding_dump(obj, fp, *args, **kwargs):
            # Обрыв ровно на середине: часть данных уже в файле, дальше сбой
            fp.write('{"scenarios": [{"id": "обрез')
            raise OSError("диск закончился на середине записи")

        json.dump = exploding_dump
        try:
            scenario_manager.save_scenarios(original)
        except Exception:
            pass
        finally:
            json.dump = real_dump

        recovered = scenario_manager.load_scenarios()
        self.assertEqual(
            len(recovered), len(original),
            "Реестр сценариев повреждён прерванной записью"
        )


class TestChatInputLimits(unittest.TestCase):
    """Чат-эндпоинт не должен падать и не должен занимать поток надолго."""

    @classmethod
    def setUpClass(cls):
        init_db()
        cls.client = TestClient(app)
        cls.token = _token(cls.client, "operator_1", "operator")

    def _post(self, payload):
        return self.client.post(
            "/api/ai/chat",
            json=payload,
            headers={"Authorization": f"Bearer {self.token}"},
        )

    def test_empty_messages_is_rejected_not_crashed(self):
        resp = self._post({"messages": [], "telemetry": {}, "mode": "rag"})
        self.assertEqual(resp.status_code, 422)

    def test_oversized_message_is_rejected(self):
        resp = self._post({
            "messages": [{"role": "user", "content": "а" * 20000}],
            "telemetry": {},
            "mode": "rag",
        })
        self.assertEqual(resp.status_code, 422)

    def test_normal_message_still_works(self):
        resp = self._post({
            "messages": [{"role": "user", "content": "Какое давление в колонне?"}],
            "telemetry": {"sensors": {"P_1": 0.25}},
            "mode": "rag",
        })
        self.assertEqual(resp.status_code, 200)
        self.assertTrue(resp.json()["content"])


if __name__ == "__main__":
    unittest.main()
