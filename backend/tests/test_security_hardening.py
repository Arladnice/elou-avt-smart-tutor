"""
Тесты-критерии приёмки для устранения критических дефектов бэкенда.

Каждый тест воспроизводит конкретный дефект, найденный при ревью:
  1. REST-эндпоинты доступны без аутентификации.
  2. Path traversal в SPA-роуте раздачи статики.
  3. Сбой одной сессии останавливает цикл симуляции у всех.
  4. Некорректная WS-команда роняет обработчик и оставляет сессию-призрак.
"""

import os
import sys
import asyncio
import unittest

# Изолируем тестовую базу данных от рабочей базы разработчика
TEST_DB_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "tutor_test.db"))
os.environ["DATABASE_PATH"] = TEST_DB_PATH

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

from fastapi.testclient import TestClient

from backend.db.database import init_db
from backend.main import app


def _token(client: TestClient, username: str, role: str) -> str:
    resp = client.post(
        "/api/auth/login",
        json={"username": username, "password": "Ktk_2026!", "role": role},
    )
    assert resp.status_code == 200, resp.text
    return resp.json()["token"]


class TestRestAuthentication(unittest.TestCase):
    """REST-эндпоинты обязаны требовать валидный JWT и корректную роль."""

    @classmethod
    def setUpClass(cls):
        init_db()
        cls.client = TestClient(app)
        cls.operator_token = _token(cls.client, "operator_1", "operator")
        cls.instructor_token = _token(cls.client, "instructor_1", "instructor")

    def _auth(self, token):
        return {"Authorization": f"Bearer {token}"}

    def test_sessions_history_rejects_anonymous(self):
        """История тренировок содержит ФИО и оценки — анонимный доступ запрещён."""
        self.assertEqual(self.client.get("/api/sessions").status_code, 401)

    def test_sessions_history_allows_authenticated(self):
        resp = self.client.get("/api/sessions", headers=self._auth(self.operator_token))
        self.assertEqual(resp.status_code, 200)

    def test_clear_history_rejects_anonymous(self):
        """Полное стирание истории — самая разрушительная операция в API."""
        self.assertEqual(self.client.post("/api/sessions/clear").status_code, 401)

    def test_clear_history_rejects_operator(self):
        """Оператор не может стереть историю собственных оценок."""
        resp = self.client.post("/api/sessions/clear", headers=self._auth(self.operator_token))
        self.assertEqual(resp.status_code, 403)

    def test_clear_history_allows_instructor(self):
        resp = self.client.post("/api/sessions/clear", headers=self._auth(self.instructor_token))
        self.assertEqual(resp.status_code, 200)

    def test_scenario_import_rejects_anonymous(self):
        """Сценарий задаёт эталон оценки — аноним не должен его подменять."""
        resp = self.client.post(
            "/api/scenarios/import", json={"id": "anon_injected", "title": "anon"}
        )
        self.assertEqual(resp.status_code, 401)

    def test_scenario_delete_rejects_operator(self):
        resp = self.client.delete(
            "/api/scenarios/startup", headers=self._auth(self.operator_token)
        )
        self.assertEqual(resp.status_code, 403)

    def test_scenario_list_allows_authenticated_operator(self):
        """Оператору нужен список сценариев для работы — чтение ему разрешено."""
        resp = self.client.get("/api/scenarios", headers=self._auth(self.operator_token))
        self.assertEqual(resp.status_code, 200)

    def test_rejects_malformed_token(self):
        resp = self.client.get("/api/sessions", headers=self._auth("not.a.real.token"))
        self.assertEqual(resp.status_code, 401)

    def test_rejects_token_signed_with_other_key(self):
        """Подделка токена чужим ключом не должна давать доступ."""
        import jwt
        forged = jwt.encode({"sub": "hacker", "role": "instructor"}, "wrong-key", algorithm="HS256")
        resp = self.client.post("/api/sessions/clear", headers=self._auth(forged))
        self.assertEqual(resp.status_code, 401)

    def test_health_stays_public(self):
        """Health-check используется как keep-alive и должен остаться открытым."""
        self.assertEqual(self.client.get("/api/health").status_code, 200)


class TestStaticPathTraversal(unittest.TestCase):
    """Раздача SPA не должна отдавать файлы за пределами каталога статики."""

    def setUp(self):
        import tempfile
        from backend.main import resolve_static_file
        self.resolve = resolve_static_file
        self.static_dir = tempfile.mkdtemp()
        with open(os.path.join(self.static_dir, "index.html"), "w") as f:
            f.write("<html>spa</html>")

    def test_traversal_outside_root_is_rejected(self):
        for attack in ["../backend/utils/security.py",
                       "../../etc/passwd",
                       "assets/../../backend/main.py"]:
            with self.subTest(attack=attack):
                self.assertIsNone(self.resolve(self.static_dir, attack))

    def test_absolute_path_is_rejected(self):
        self.assertIsNone(self.resolve(self.static_dir, "/etc/passwd"))

    def test_existing_file_inside_root_is_served(self):
        resolved = self.resolve(self.static_dir, "index.html")
        self.assertEqual(
            resolved, os.path.realpath(os.path.join(self.static_dir, "index.html"))
        )

    def test_unknown_route_falls_back_to_index(self):
        """Неизвестный маршрут SPA — это не файл, обработчик отдаёт index.html сам."""
        self.assertIsNone(self.resolve(self.static_dir, "dashboard/sessions"))


class TestSimulationLoopResilience(unittest.TestCase):
    """Сбой в одной сессии не должен останавливать симуляцию у остальных."""

    def test_broken_session_does_not_stop_others(self):
        from backend.services.connection_manager import manager
        from backend.services.simulation_loop import simulation_loop

        class FakeWS:
            async def send_json(self, data):
                pass

        async def scenario():
            manager.sessions.clear()
            broken = manager.get_session("broken_session")
            broken.operator_sockets.add(FakeWS())
            healthy = manager.get_session("healthy_session")
            healthy.operator_sockets.add(FakeWS())

            # Повреждаем состояние одной сессии так, как это может произойти
            # при битом снапшоте или неполном пользовательском сценарии.
            del broken.simulator.sensors["L_1"]

            task = asyncio.create_task(simulation_loop())
            await asyncio.sleep(2.5)
            still_running = not task.done()
            task.cancel()
            return still_running, healthy.simulator.time_elapsed

        still_running, healthy_ticks = asyncio.run(scenario())

        self.assertTrue(still_running, "Цикл симуляции упал из-за одной сбойной сессии")
        self.assertGreater(healthy_ticks, 0, "Здоровая сессия не получила ни одного тика")


class TestWebSocketRobustness(unittest.TestCase):
    """Некорректная команда не должна ронять соединение и оставлять сессию-призрак."""

    @classmethod
    def setUpClass(cls):
        init_db()
        cls.client = TestClient(app)
        cls.token = _token(cls.client, "operator_1", "operator")

    def _send_and_expect_error(self, session_id, payload, as_text=False):
        url = f"/ws?role=operator&token={self.token}&session_id={session_id}"
        with self.client.websocket_connect(url) as ws:
            ws.receive_json()
            if as_text:
                ws.send_text(payload)
            else:
                ws.send_json(payload)
            return ws.receive_json()

    def test_malformed_json_returns_error_and_keeps_connection(self):
        reply = self._send_and_expect_error("ws_bad_json", "not-a-json{", as_text=True)
        self.assertEqual(reply.get("type"), "error")

    def test_non_numeric_setpoint_returns_error(self):
        reply = self._send_and_expect_error(
            "ws_bad_setpoint", {"type": "change_setpoint", "value": "abc"}
        )
        self.assertEqual(reply.get("type"), "error")

    def test_missing_setpoint_value_returns_error(self):
        reply = self._send_and_expect_error(
            "ws_missing_setpoint", {"type": "change_setpoint"}
        )
        self.assertEqual(reply.get("type"), "error")

    def test_session_is_released_after_invalid_command(self):
        """Главный симптом дефекта: сессии-призраки копятся в менеджере."""
        from backend.services.connection_manager import manager

        url = f"/ws?role=operator&token={self.token}&session_id=ws_leak_probe"
        try:
            with self.client.websocket_connect(url) as ws:
                ws.receive_json()
                ws.send_text("{сломанный json")
        except Exception:
            pass

        self.assertNotIn("ws_leak_probe", manager.sessions)


if __name__ == "__main__":
    unittest.main()
