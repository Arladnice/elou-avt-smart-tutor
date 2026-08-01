"""
Тесты-критерии приёмки для этапа 4: валидация входа и эксплуатационная гигиена.

Покрывают дефекты ревью:
  15. Импорт сценария принимает произвольный Dict без схемы и лимита размера;
      уставка температуры принимается без границ.
  18. requirements.txt: дубли строк, нет psutil (используется health) и httpx (нужен тестам).
  19. Dockerfile не задаёт обязательные переменные окружения, работает от root.
  20. Метрики health возвращают выдуманные значения и проверяют не тот сервис.
"""

import os
import sys
import unittest

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

from fastapi.testclient import TestClient

from elou_tutor.db.database import init_db
from backend.main import app

REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '../..'))
BACKEND_DIR = os.path.join(REPO_ROOT, "backend")


def _token(client, username, role):
    resp = client.post(
        "/api/auth/login",
        json={"username": username, "password": "Ktk_2026!", "role": role},
    )
    assert resp.status_code == 200, resp.text
    return resp.json()["token"]


class TestScenarioImportValidation(unittest.TestCase):
    """Импортируемый сценарий задаёт эталон оценки — его структура должна быть строгой."""

    @classmethod
    def setUpClass(cls):
        init_db()
        cls.client = TestClient(app)
        cls.token = _token(cls.client, "instructor_1", "instructor")

    def _import(self, payload):
        return self.client.post(
            "/api/scenarios/import",
            json=payload,
            headers={"Authorization": f"Bearer {self.token}"},
        )

    def test_rejects_unsafe_identifier(self):
        for bad_id in ["../../etc/passwd", "id with spaces", "", "a" * 200, "id/with/slash"]:
            with self.subTest(bad_id=bad_id):
                resp = self._import({"id": bad_id, "title": "Проверка"})
                self.assertIn(resp.status_code, (400, 422))

    def test_rejects_oversized_payload(self):
        resp = self._import({
            "id": "huge_scenario",
            "title": "Огромный",
            "description": "я" * 100000,
        })
        self.assertIn(resp.status_code, (400, 413, 422))

    def test_rejects_golden_sequence_with_unknown_action(self):
        """Эталон из несуществующих действий делает сценарий неоцениваемым."""
        resp = self._import({
            "id": "bad_golden",
            "title": "Плохой эталон",
            "golden_sequence": ["ЧТО_ТО_НЕПОНЯТНОЕ"],
        })
        self.assertIn(resp.status_code, (400, 422))

    def test_accepts_valid_scenario(self):
        resp = self._import({
            "id": "valid_probe_scenario",
            "title": "Корректный сценарий",
            "short_name": "Проверка",
            "golden_sequence": ["V1_OPEN", "SP_UP"],
        })
        self.assertEqual(resp.status_code, 201, resp.text)


class TestSetpointBounds(unittest.TestCase):
    """Уставка температуры печи ограничена физическим диапазоном КИПиА."""

    @classmethod
    def setUpClass(cls):
        init_db()
        cls.client = TestClient(app)
        cls.token = _token(cls.client, "operator_1", "operator")

    def _send_setpoint(self, value, session_id):
        url = f"/ws?role=operator&token={self.token}&session_id={session_id}"
        with self.client.websocket_connect(url) as ws:
            ws.receive_json()
            ws.send_json({"type": "change_setpoint", "value": value})
            return ws.receive_json()

    def test_absurd_setpoint_is_rejected(self):
        reply = self._send_setpoint(1e9, "sp_absurd")
        self.assertEqual(reply.get("type"), "error")

    def test_negative_setpoint_is_rejected(self):
        reply = self._send_setpoint(-500.0, "sp_negative")
        self.assertEqual(reply.get("type"), "error")

    def test_valid_setpoint_is_applied(self):
        reply = self._send_setpoint(320.0, "sp_valid")
        self.assertEqual(reply["setpoints"]["T_1_Sp"], 320.0)


class TestHealthMetricsAreHonest(unittest.TestCase):
    """Метрики мониторинга не должны содержать выдуманных чисел."""

    @classmethod
    def setUpClass(cls):
        init_db()
        cls.client = TestClient(app)
        cls.token = _token(cls.client, "operator_1", "operator")

    def test_ping_latency_is_measured_not_hardcoded(self):
        import backend.routes.health as health_module
        source = open(health_module.__file__, encoding="utf-8").read()
        self.assertNotIn(
            "avg_ping_latency_ms=15.0", source,
            "Задержка захардкожена константой вместо реального измерения"
        )

    def test_reports_whether_metrics_are_available(self):
        """Если psutil недоступен, это должно быть видно, а не замаскировано числами."""
        resp = self.client.get("/api/health/metrics")
        self.assertEqual(resp.status_code, 200)
        self.assertIn("is_metrics_available", resp.json())

    def test_checks_the_llm_actually_used_by_chat(self):
        """Чат ходит в LM Studio (порт 1234), значит и проверять надо его."""
        import backend.routes.health as health_module
        source = open(health_module.__file__, encoding="utf-8").read()
        self.assertIn("1234", source)


class TestPackagingHygiene(unittest.TestCase):
    """Зависимости и образ должны быть воспроизводимыми."""

    def setUp(self):
        self.requirements = self._read("requirements.txt")
        self.dev_requirements = self._read("requirements-dev.txt")

    @staticmethod
    def _read(filename):
        path = os.path.join(BACKEND_DIR, filename)
        if not os.path.isfile(path):
            return []
        with open(path, encoding="utf-8") as f:
            return [
                line.strip() for line in f
                if line.strip()
                and not line.strip().startswith("#")
                and not line.strip().startswith("-r ")
            ]

    @staticmethod
    def _names(requirements):
        import re
        return [re.split(r"[<>=!]", r)[0].strip().lower() for r in requirements]

    def test_no_duplicate_dependencies(self):
        names = self._names(self.requirements)
        duplicates = {n for n in names if names.count(n) > 1}
        self.assertEqual(duplicates, set(), f"Дублирующиеся зависимости: {duplicates}")

    def test_runtime_declares_what_the_service_imports(self):
        """psutil импортируется в health.py — без него метрики молча нулевые."""
        self.assertIn("psutil", self._names(self.requirements))

    def test_test_only_dependencies_stay_out_of_runtime(self):
        """
        httpx нужен только TestClient. В рантайм-списке ему не место:
        иначе тестовая зависимость едет в production-образ.
        """
        self.assertIn("httpx", self._names(self.dev_requirements))
        self.assertNotIn("httpx", self._names(self.requirements))

    def test_dockerfile_declares_required_secrets(self):
        """Без INTEGRITY_SALT и SECRET_KEY контейнер падает на импорте."""
        with open(os.path.join(BACKEND_DIR, "Dockerfile"), encoding="utf-8") as f:
            dockerfile = f.read()
        for var in ("INTEGRITY_SALT", "SECRET_KEY"):
            with self.subTest(var=var):
                self.assertIn(var, dockerfile)

    def test_dockerfile_does_not_run_as_root(self):
        with open(os.path.join(BACKEND_DIR, "Dockerfile"), encoding="utf-8") as f:
            dockerfile = f.read()
        self.assertIn("USER ", dockerfile)


if __name__ == "__main__":
    unittest.main()
