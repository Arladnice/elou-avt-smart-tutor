"""
Тесты-критерии приёмки для этапа 2: целостность журналов и разграничение доступа.

Покрывают дефекты ревью:
  7.  Хэш целостности склеивает поля без разделителя и не является HMAC.
  8.  Актор в журнале аудита захардкожен ("INSTRUCTOR" / "ADMIN").
  9.  SSRF через произвольный URL вебхука.
  10. Захват чужой сессии и неограниченное создание сессий.
"""

import os
import sys
import sqlite3
import unittest

TEST_DB_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "tutor_test.db"))
os.environ["DATABASE_PATH"] = TEST_DB_PATH

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

from fastapi.testclient import TestClient

from backend.db.database import init_db, DB_PATH
from backend.main import app


def _token(client, username, role):
    resp = client.post(
        "/api/auth/login",
        json={"username": username, "password": "Ktk_2026!", "role": role},
    )
    assert resp.status_code == 200, resp.text
    return resp.json()["token"]


class TestIntegrityHash(unittest.TestCase):
    """Хэш целостности должен однозначно покрывать границы полей."""

    def setUp(self):
        from backend.utils.security import calculate_integrity_hash
        self.hash = calculate_integrity_hash

    def test_field_boundaries_are_unambiguous(self):
        """('ab','c') и ('a','bc') — разные данные и обязаны давать разные хэши."""
        self.assertNotEqual(self.hash("ab", "c"), self.hash("a", "bc"))

    def test_detects_tampered_field(self):
        original = self.hash("operator_1", "startup", 100)
        self.assertNotEqual(original, self.hash("operator_1", "startup", 95))

    def test_stable_for_same_input(self):
        self.assertEqual(self.hash("a", 1, True), self.hash("a", 1, True))


class TestSessionIntegrityVerification(unittest.TestCase):
    """Записи сессий проверяются новым алгоритмом, но старые остаются валидными."""

    def setUp(self):
        init_db()
        from backend.db.queries import clear_all_sessions
        clear_all_sessions()

    def _insert_raw(self, integrity_hash, op_name="Legacy_Op"):
        conn = sqlite3.connect(DB_PATH)
        conn.execute(
            "INSERT INTO training_sessions (operator_name, role, scenario_id, start_time, "
            "duration_sec, score, status, violations_json, integrity_hash, session_logs_json) "
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (op_name, "operator", "startup", "2026-07-09 12:00:00", 120, 90,
             "success", "[]", integrity_hash, "[]"),
        )
        conn.commit()
        conn.close()

    def test_legacy_sha256_records_stay_valid(self):
        """Записи, созданные до перехода на HMAC, не должны помечаться подделкой."""
        import hashlib
        from elou_tutor.domain.integrity import SECRET_SALT

        fields = ("Legacy_Op", "operator", "startup", "2026-07-09 12:00:00", 120, 90, "success", "[]", "[]")
        legacy = hashlib.sha256(
            ("".join(str(f) for f in fields) + SECRET_SALT).encode("utf-8")
        ).hexdigest()
        self._insert_raw(legacy)

        from backend.db.queries import get_all_sessions
        record = next(s for s in get_all_sessions() if s["operator_name"] == "Legacy_Op")
        self.assertTrue(record["integrity_valid"])

    def test_tampered_record_is_flagged(self):
        self._insert_raw("0" * 64, op_name="Tampered_Op")

        from backend.db.queries import get_all_sessions
        record = next(s for s in get_all_sessions() if s["operator_name"] == "Tampered_Op")
        self.assertFalse(record["integrity_valid"])


class TestAuditChain(unittest.TestCase):
    """Журнал аудита сцеплен в цепочку: удаление строки обнаруживается."""

    def setUp(self):
        init_db()
        conn = sqlite3.connect(DB_PATH)
        conn.execute("DELETE FROM audit_logs")
        conn.commit()
        conn.close()

    def test_intact_chain_verifies(self):
        from backend.utils.security import log_audit_event, verify_audit_chain

        for i in range(5):
            log_audit_event("operator_1", "PROBE", f"событие {i}")

        ok, broken_at = verify_audit_chain()
        self.assertTrue(ok, f"Целая цепочка признана нарушенной на записи {broken_at}")

    def test_deleted_row_breaks_chain(self):
        from backend.utils.security import log_audit_event, verify_audit_chain

        for i in range(5):
            log_audit_event("operator_1", "PROBE", f"событие {i}")

        conn = sqlite3.connect(DB_PATH)
        victim = conn.execute(
            "SELECT id FROM audit_logs ORDER BY id LIMIT 1 OFFSET 2"
        ).fetchone()[0]
        conn.execute("DELETE FROM audit_logs WHERE id = ?", (victim,))
        conn.commit()
        conn.close()

        ok, _ = verify_audit_chain()
        self.assertFalse(ok, "Удаление строки журнала осталось незамеченным")

    def test_edited_row_breaks_chain(self):
        from backend.utils.security import log_audit_event, verify_audit_chain

        for i in range(3):
            log_audit_event("operator_1", "PROBE", f"событие {i}")

        conn = sqlite3.connect(DB_PATH)
        conn.execute("UPDATE audit_logs SET details = 'подменено' WHERE id = (SELECT MIN(id) FROM audit_logs)")
        conn.commit()
        conn.close()

        ok, _ = verify_audit_chain()
        self.assertFalse(ok, "Правка строки журнала осталась незамеченной")


class TestAuditActorIsReal(unittest.TestCase):
    """В журнале должно оставаться настоящее имя пользователя, а не роль."""

    @classmethod
    def setUpClass(cls):
        init_db()
        cls.client = TestClient(app)
        cls.instructor_token = _token(cls.client, "instructor_1", "instructor")

    def _actors_for(self, action):
        conn = sqlite3.connect(DB_PATH)
        rows = conn.execute(
            "SELECT actor FROM audit_logs WHERE action = ? ORDER BY id DESC LIMIT 5", (action,)
        ).fetchall()
        conn.close()
        return [r[0] for r in rows]

    def test_clear_history_records_real_instructor(self):
        self.client.post(
            "/api/sessions/clear",
            headers={"Authorization": f"Bearer {self.instructor_token}"},
        )
        self.assertIn("instructor_1", self._actors_for("DB_CLEAR"))

    def test_defect_injection_records_real_instructor(self):
        url = f"/ws?role=instructor&token={self.instructor_token}&session_id=audit_actor_probe"
        with self.client.websocket_connect(url) as ws:
            ws.receive_json()
            ws.send_json({"type": "trigger_defect", "defect_id": "pump_fail", "state": True})
            ws.receive_json()

        self.assertIn("instructor_1", self._actors_for("DEFECT_TRIGGER"))


class TestWebhookSsrf(unittest.TestCase):
    """Вебхук инструктора не должен доставать до внутренней сети и локальных файлов."""

    def setUp(self):
        from backend.utils.net import is_webhook_url_allowed
        self.allowed = is_webhook_url_allowed

    def test_rejects_non_http_schemes(self):
        for url in ["file:///etc/passwd", "ftp://example.com/x", "gopher://example.com"]:
            with self.subTest(url=url):
                self.assertFalse(self.allowed(url))

    def test_rejects_loopback_and_link_local(self):
        for url in ["http://127.0.0.1:8000/hook",
                    "http://localhost/hook",
                    "http://169.254.169.254/latest/meta-data/",
                    "http://[::1]/hook"]:
            with self.subTest(url=url):
                self.assertFalse(self.allowed(url))

    def test_rejects_private_ranges(self):
        for url in ["http://10.0.0.5/hook", "http://192.168.1.10/hook", "http://172.16.0.3/hook"]:
            with self.subTest(url=url):
                self.assertFalse(self.allowed(url))

    def test_allows_public_endpoint(self):
        """Публичный адрес пропускается. IP-литерал, чтобы тест не зависел от DNS."""
        self.assertTrue(self.allowed("https://93.184.216.34/services/abc"))


class TestSessionOwnership(unittest.TestCase):
    """Оператор не может сбросить чужую тренировку, подключившись к её session_id."""

    @classmethod
    def setUpClass(cls):
        init_db()
        cls.client = TestClient(app)
        cls.op1 = _token(cls.client, "operator_1", "operator")
        cls.op2 = _token(cls.client, "operator_2", "operator")

    def test_foreign_operator_is_rejected(self):
        from backend.services.connection_manager import manager
        manager.sessions.pop("owned_session", None)

        url1 = f"/ws?role=operator&token={self.op1}&session_id=owned_session"
        with self.client.websocket_connect(url1) as ws1:
            ws1.receive_json()
            ws1.send_json({"type": "change_setpoint", "value": 333.0})
            state = ws1.receive_json()
            self.assertEqual(state["setpoints"]["T_1_Sp"], 333.0)

            url2 = f"/ws?role=operator&token={self.op2}&session_id=owned_session"
            with self.assertRaises(Exception):
                with self.client.websocket_connect(url2) as ws2:
                    ws2.receive_json()

            # Состояние первой сессии не тронуто
            ws1.send_json({"type": "ping", "timestamp": 1})
            ws1.receive_json()
            self.assertEqual(
                manager.sessions["owned_session"].simulator.setpoints["T_1_Sp"], 333.0
            )

    def test_instructor_may_observe_any_session(self):
        """Наблюдение инструктора за чужой сессией — штатный сценарий."""
        from backend.services.connection_manager import manager
        manager.sessions.pop("observed_session", None)

        instructor = _token(self.client, "instructor_1", "instructor")
        url1 = f"/ws?role=operator&token={self.op1}&session_id=observed_session"
        with self.client.websocket_connect(url1) as ws1:
            ws1.receive_json()
            url2 = f"/ws?role=instructor&token={instructor}&session_id=observed_session"
            with self.client.websocket_connect(url2) as ws2:
                self.assertIn("sensors", ws2.receive_json())


class TestPredictorIsShared(unittest.TestCase):
    """Модель прогноза загружается один раз, а не на каждую сессию."""

    def test_sessions_share_predictor_instance(self):
        from backend.services.connection_manager import SimulationSession
        a = SimulationSession("shared_a")
        b = SimulationSession("shared_b")
        self.assertIs(a.predictor, b.predictor)


if __name__ == "__main__":
    unittest.main()
