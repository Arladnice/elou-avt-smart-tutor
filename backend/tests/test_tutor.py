import sys
import os
import unittest

# Изолируем тестовую базу данных от рабочей базы разработчика
TEST_DB_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "tutor_test.db"))
os.environ["DATABASE_PATH"] = TEST_DB_PATH

# Добавляем корневой путь в sys.path для импорта модулей
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

from simulator.elou_avt_model import ELOUAVTSimulator
from ai_core.predictive_engine import RiskPredictor
from ai_core.error_analyzer import ErrorAnalyzer

class TestKTKComponents(unittest.TestCase):
    def setUp(self):
        self.simulator = ELOUAVTSimulator()
        self.predictor = RiskPredictor()
        self.analyzer = ErrorAnalyzer()

    def test_simulator_step(self):
        """Проверяет корректность обновления параметров симулятора на одном шаге."""
        initial_state = self.simulator.get_state()
        self.assertEqual(initial_state["timeElapsed"], 0)
        self.assertEqual(initial_state["status"], "running")

        # Делаем шаг
        state = self.simulator.step()
        self.assertEqual(state["timeElapsed"], 1)
        # Температура должна измениться (или остаться близко к уставке)
        self.assertGreater(state["sensors"]["furnaceTemp"], 100.0)
        self.assertLess(state["sensors"]["furnaceTemp"], 400.0)

    def test_risk_predictor(self):
        """Проверяет корректность расчета рисков и прогноза параметров."""
        # Генерируем стабильный временной ряд (30 отчетов по 7 фичей)
        dummy_window = [[1.0, 0.0, 1.0, 280.0, 278.0, 0.24, 50.0] for _ in range(30)]
        pred_vals, risk = self.predictor.predict_risk(dummy_window)
        
        # Проверяем размерности и типы
        self.assertEqual(len(pred_vals), 3)
        self.assertIsInstance(risk, float)
        self.assertGreaterEqual(risk, 0.0)
        self.assertLessEqual(risk, 100.0)

    def test_error_analyzer_startup_success(self):
        """Проверяет оценку идеального сценария пуска."""
        # Идеальная последовательность действий для пуска
        actions = ["V1_OPEN", "SP_UP", "V3_OPEN"]
        score, errors, recs = self.analyzer.evaluate_session(actions, "startup")
        
        self.assertEqual(score, 100)
        self.assertEqual(len(errors), 0)

    def test_error_analyzer_dry_heat_violation(self):
        """Проверяет выявление нагрева печи всухую (нарушение техрегламента)."""
        # Оператор поднял уставку нагрева, но перекрыл сырье
        actions = ["V1_CLOSE", "SP_UP"]
        score, errors, recs = self.analyzer.evaluate_session(actions, "startup")
        
        # Оценка должна быть снижена, и должна быть зафиксирована ошибка сухого нагрева
        self.assertLess(score, 80)
        self.assertGreater(len(errors), 0)
        
        # Проверяем, что в ошибках есть ссылка на пункт техрегламента
        has_dry_heat_clause = any("7.9.1" in err["clause"] for err in errors)
        self.assertTrue(has_dry_heat_clause)

    def test_error_analyzer_no_actions(self):
        """Проверяет оценку сессии без совершенных действий."""
        score, errors, recs = self.analyzer.evaluate_session([], "startup")
        self.assertEqual(score, 0)
        self.assertEqual(len(errors), 1)
        self.assertEqual(errors[0]["title"], "Регламентные операции не начаты")

    def test_integration_testcase_1_startup_and_balance(self):
        """Интеграционный тест: Тест-кейс 1 (Пуск и баланс колонны)"""
        # Повышаем уставку, сбрасываем давление через V-2, возвращаем уставку,
        # закрываем V-2, перекрываем дренаж V-3 и открываем его обратно
        actions = ["SP_UP", "V2_OPEN", "V2_CLOSE", "V3_CLOSE", "V3_OPEN"]
        score, errors, recs = self.analyzer.evaluate_session(actions, "startup")
        self.assertEqual(score, 100)
        self.assertEqual(len(errors), 0)

    def test_integration_testcase_2_pump_fail_recovery(self):
        """Интеграционный тест: Тест-кейс 2 (Парирование отказа сырьевого насоса)"""
        # Инструктор активировал отказ насоса, оператор снизил уставку (SP_DOWN)
        actions = ["SP_DOWN"]
        score, errors, recs = self.analyzer.evaluate_session(actions, "startup", defects_triggered={"pump_fail"})
        self.assertEqual(score, 100)
        self.assertEqual(len(errors), 0)
        self.assertTrue(any("отказ сырьевого насоса" in r.lower() for r in recs))

    def test_integration_testcase_3_jammed_vent_esd(self):
        """Интеграционный тест: Тест-кейс 3 (Заклинивание клапана V-2 и ESD)"""
        # Инструктор активировал заклинивание V-2, оператор поднял уставку, попытался сдуть,
        # и вручную заглушил установку через ESD
        actions = ["SP_UP", "V2_OPEN", "ESD"]
        score, errors, recs = self.analyzer.evaluate_session(actions, "startup", defects_triggered={"valve_jam"})
        self.assertEqual(score, 100)
        self.assertEqual(len(errors), 0)

    def test_integration_testcase_4_column_overflow(self):
        """Интеграционный тест: Тест-кейс 4 (Блокировка дренажа колонны)"""
        # Оператор просто закрыл дренаж V-3 при работающей подаче
        actions = ["V3_CLOSE"]
        score, errors, recs = self.analyzer.evaluate_session(actions, "startup")
        self.assertLess(score, 100)
        self.assertTrue(any("блокировка дренажа" in err["title"].lower() for err in errors))

    def test_integration_testcase_5_coil_overheat_recovery(self):
        """Интеграционный тест: Тест-кейс 5 (Парирование прогара змеевика печи)"""
        # Инструктор активировал прогар, оператор снизил уставку (SP_DOWN) и открыл сброс V-2
        actions = ["SP_DOWN", "V2_OPEN"]
        score, errors, recs = self.analyzer.evaluate_session(actions, "startup", defects_triggered={"coil_overheat"})
        self.assertEqual(score, 100)
        self.assertEqual(len(errors), 0)
        self.assertTrue(any("прогар змеевика" in r.lower() for r in recs))

class TestBackendRoutesAndIntegrity(unittest.TestCase):
    def test_scenario_1_authorization_and_roles(self):
        """Тест сценария 1: Авторизация и разделение ролей"""
        from fastapi import HTTPException
        from backend.main import login, LoginRequest
        
        # Успешный вход под оператором
        req = LoginRequest(username="Test_Operator", role="operator")
        res = login(req)
        self.assertEqual(res["username"], "Test_Operator")
        self.assertEqual(res["role"], "operator")
        self.assertIn("token", res)

        # Ошибка при пустом имени
        with self.assertRaises(HTTPException) as ctx:
            login(LoginRequest(username="", role="operator"))
        self.assertEqual(ctx.exception.status_code, 400)

        # Ошибка при некорректной роли
        with self.assertRaises(HTTPException) as ctx:
            login(LoginRequest(username="User", role="admin"))
        self.assertEqual(ctx.exception.status_code, 400)

    def test_scenario_6_security_integrity_sha256(self):
        """Тест сценария 6: Проверка ИБ-контроля целостности логов по SHA-256"""
        from backend.main import get_sessions, clear_sessions, calculate_integrity_hash, DB_PATH
        import sqlite3
        
        # Сначала очистим историю
        clear_sessions()

        # Создаем тестовую запись напрямую в БД с корректным хэшем
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        op_name = "Secure_Op"
        role = "operator"
        scen_id = "startup"
        start_time = "2026-07-09 12:00:00"
        duration = 120
        score = 85
        status = "finished"
        viol_json = "[]"
        session_logs_json = "[]"
        
        h = calculate_integrity_hash(op_name, role, scen_id, start_time, duration, score, status, viol_json, session_logs_json)
        
        cursor.execute(
            "INSERT INTO training_sessions (operator_name, role, scenario_id, start_time, duration_sec, score, status, violations_json, integrity_hash, session_logs_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (op_name, role, scen_id, start_time, duration, score, status, viol_json, h, session_logs_json)
        )
        conn.commit()
        
        # Запрашиваем сессии и проверяем валидность
        sessions = get_sessions()
        self.assertGreater(len(sessions), 0)
        self.assertTrue(sessions[0]["integrity_valid"])

        # Компрометируем запись (меняем оценку без пересчета хэша)
        cursor.execute("UPDATE training_sessions SET score = 100 WHERE id = ?", (sessions[0]["id"],))
        conn.commit()
        conn.close()

        # Запрашиваем снова и проверяем, что статус целостности изменился на False (нарушено!)
        sessions = get_sessions()
        self.assertFalse(sessions[0]["integrity_valid"])

    @classmethod
    def tearDownClass(cls):
        # Удаляем тестовую БД после завершения тестов
        from backend.main import DB_PATH
        if os.path.exists(DB_PATH) and "tutor_test.db" in DB_PATH:
            try:
                os.remove(DB_PATH)
            except Exception:
                pass

if __name__ == "__main__":
    unittest.main()
