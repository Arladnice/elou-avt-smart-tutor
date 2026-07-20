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
        self.assertGreater(state["sensors"]["T_1"], 100.0)
        self.assertLess(state["sensors"]["T_1"], 400.0)

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

    def test_simulator_scenario_initial_conditions(self):
        """Проверяет начальные физические условия для сценариев пуска и останова."""
        # Проверяем "startup"
        self.simulator.reset("startup")
        self.assertEqual(self.simulator.valves["V_1"], False)
        self.assertEqual(self.simulator.valves["V_2"], False)
        self.assertEqual(self.simulator.valves["V_3"], False)
        self.assertEqual(self.simulator.sensors["T_1"], 20.0)
        self.assertEqual(self.simulator.sensors["L_1"], 0.0)

        # Проверяем "shutdown"
        self.simulator.reset("shutdown")
        self.assertEqual(self.simulator.valves["V_1"], True)
        self.assertEqual(self.simulator.valves["V_2"], False)
        self.assertEqual(self.simulator.valves["V_3"], True)
        self.assertEqual(self.simulator.sensors["T_1"], 280.0)
        self.assertEqual(self.simulator.sensors["L_1"], 50.0)

    def test_simulator_startup_physics(self):
        """Проверяет корректное заполнение уровня и рост давления при технологическом пуске."""
        self.simulator.reset("startup")
        self.simulator.set_valve("V_1", True)
        self.simulator.set_setpoint("T_1_Sp", 280.0)
        
        # Моделируем 60 секунд пуска
        for _ in range(60):
            state = self.simulator.step()
            self.assertEqual(state["status"], "running")
            
        self.assertGreater(state["sensors"]["L_1"], 25.0)  # Уровень должен стабильно расти (>25% за 60 секунд)
        self.assertGreater(state["sensors"]["T_1"], 150.0) # Печь прогревается (>150°C)
        self.assertGreater(state["sensors"]["P_1"], 0.08)  # Давление растёт от атмосферного (0.05 МПа)

    def test_simulator_snapshots(self):
        """Проверяет создание снимка состояния симулятора и откат к нему."""
        self.simulator.reset("shutdown")
        initial_temp = self.simulator.sensors["T_1"]
        
        # Делаем снапшот
        snapshot = self.simulator.get_snapshot()
        self.assertEqual(snapshot["sensors"]["T_1"], initial_temp)
        
        # Меняем состояние симулятора
        self.simulator.sensors["T_1"] = 550.0
        self.simulator.valves["V_1"] = False
        self.simulator.time_elapsed = 150
        
        # Откатываемся
        self.simulator.load_snapshot(snapshot)
        self.assertEqual(self.simulator.sensors["T_1"], initial_temp)
        self.assertEqual(self.simulator.valves["V_1"], True)
        self.assertEqual(self.simulator.time_elapsed, 0)

    def test_error_analyzer_shutdown_success(self):
        """Проверяет оценку идеального сценария останова печи."""
        for actions in [["SP_DOWN", "V2_OPEN", "V1_CLOSE"], ["SP_DOWN", "V_2_OPEN", "V_1_CLOSE"]]:
            score, errors, recs = self.analyzer.evaluate_session(actions, "shutdown")
            self.assertEqual(score, 100)
            self.assertEqual(len(errors), 0)

    def test_error_analyzer_shutdown_with_sensor_temperatures(self):
        """Проверяет оценку останова печи в зависимости от температуры."""
        actions = ["SP_DOWN", "V2_OPEN", "V1_CLOSE"]
        
        # 1. Температура остыла до 150°C (нормальный останов)
        score, errors, recs = self.analyzer.evaluate_session(
            actions, "shutdown", final_sensors={"T_1": 150.0, "L_1": 50.0}
        )
        self.assertEqual(score, 100)
        self.assertEqual(len(errors), 0)
        
        # 2. Температура горячая - 280°C (превышает порог 245°C)
        score, errors, recs = self.analyzer.evaluate_session(
            actions, "shutdown", final_sensors={"T_1": 280.0, "L_1": 50.0}
        )
        self.assertLess(score, 100)
        self.assertTrue(any(e["title"] == "Температурный режим не достигнут" for e in errors))

    def test_error_analyzer_column_shutdown_success(self):
        """Проверяет оценку идеального сценария останова колонны."""
        actions = ["SP_DOWN", "V1_CLOSE", "V3_CLOSE"]
        score, errors, recs = self.analyzer.evaluate_session(actions, "column_shutdown")
        self.assertEqual(score, 100)
        self.assertEqual(len(errors), 0)

    def test_error_analyzer_overpressure_relief_success(self):
        """Проверяет оценку идеального сценария сброса избыточного давления."""
        actions = ["V2_OPEN", "SP_DOWN"]
        score, errors, recs = self.analyzer.evaluate_session(actions, "overpressure_relief")
        self.assertEqual(score, 100)
        self.assertEqual(len(errors), 0)

    def test_error_analyzer_recirculation_success(self):
        """Проверяет оценку идеального сценария перевода на рециркуляцию."""
        actions = ["SP_DOWN", "V3_CLOSE", "V2_OPEN"]
        score, errors, recs = self.analyzer.evaluate_session(actions, "recirculation")
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

    def test_integration_testcase_6_power_fail_recovery(self):
        """Интеграционный тест: Тест-кейс 6 (Парирование отказа электроснабжения power_fail)"""
        actions = ["SP_DOWN", "V1_CLOSE"]
        score, errors, recs = self.analyzer.evaluate_session(actions, "startup", defects_triggered={"power_fail"})
        self.assertEqual(score, 100)
        self.assertEqual(len(errors), 0)
        self.assertTrue(any("обесточиван" in r.lower() for r in recs))

    def test_integration_testcase_7_air_fail_recovery(self):
        """Интеграционный тест: Тест-кейс 7 (Парирование отказа воздуха КИПиА air_fail)"""
        actions = ["ESD"]
        score, errors, recs = self.analyzer.evaluate_session(actions, "startup", defects_triggered={"air_fail"})
        self.assertEqual(score, 100)
        self.assertEqual(len(errors), 0)
        self.assertTrue(any("воздух" in r.lower() for r in recs))

    def test_integration_testcase_8_steam_fail_recovery(self):
        """Интеграционный тест: Тест-кейс 8 (Парирование срыва отпарного пара steam_fail)"""
        actions = ["SP_DOWN", "V3_OPEN"]
        score, errors, recs = self.analyzer.evaluate_session(actions, "startup", defects_triggered={"steam_fail"})
        self.assertEqual(score, 100)
        self.assertEqual(len(errors), 0)
        self.assertTrue(any("пар" in r.lower() for r in recs))

class TestBackendRoutesAndIntegrity(unittest.TestCase):
    def setUp(self):
        from backend.db.database import init_db
        init_db()

    def test_health_endpoint(self):
        """Тест эндпоинта /api/health для проверки работоспособности (health check)."""
        from backend.routes.health import health_check
        res = health_check()
        self.assertEqual(res, {"status": "ok"})

    def test_scenario_1_authorization_and_roles(self):
        """Тест сценария 1: Авторизация и разделение ролей"""
        from fastapi import HTTPException
        from backend.routes.auth import login
        from backend.models.schemas import LoginRequest
        
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

    def test_simulation_time_and_speed_control(self):
        """Проверяет логику паузы и изменения скорости в ConnectionManager."""
        from backend.services.connection_manager import manager
        
        # По умолчанию симуляция идет с нормальной скоростью и не на паузе
        self.assertEqual(manager.speed_multiplier, 1.0)
        self.assertFalse(manager.is_paused)
        
        # Меняем параметры
        manager.is_paused = True
        manager.speed_multiplier = 2.0
        self.assertEqual(manager.speed_multiplier, 2.0)
        self.assertTrue(manager.is_paused)
        
        # Сбрасываем назад
        manager.is_paused = False
        manager.speed_multiplier = 1.0

    def test_scenario_6_security_integrity_sha256(self):
        """Тест сценария 6: Проверка ИБ-контроля целостности логов по SHA-256"""
        from backend.routes.sessions import get_sessions, clear_sessions
        from backend.utils.security import calculate_integrity_hash
        from backend.db.database import DB_PATH
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

    def test_defect_power_fail(self):
        """Тест-01: Проверка эффекта неисправности power_fail (отказ электроснабжения)."""
        sim = ELOUAVTSimulator()
        sim.reset("shutdown")  # В shutdown V-1 открыт, T_sp = 280
        self.assertEqual(sim.setpoints["T_1_Sp"], 280.0)
        
        # Активируем отказ электроснабжения
        sim.set_defect("power_fail", True)
        self.assertEqual(sim.setpoints["T_1_Sp"], 20.0, "Уставка температуры должна упасть до 20°C при отключении питания")
        
        # Делаем шаг и проверяем, что сырье не подается и начинается остывание
        state = sim.step()
        self.assertLess(state["sensors"]["T_1"], 280.0, "Температура должна снижаться из-за остановки горелок")

    def test_defect_air_fail(self):
        """Тест-02: Проверка эффекта неисправности air_fail (отказ воздуха КИПиА)."""
        sim = ELOUAVTSimulator()
        sim.reset("shutdown")  # В shutdown V_1 и V_3 открыты, V_2 закрыт
        self.assertTrue(sim.valves["V_1"])
        self.assertTrue(sim.valves["V_3"])
        
        # Активируем отказ воздуха КИПиА
        sim.set_defect("air_fail", True)
        self.assertFalse(sim.valves["V_1"], "Клапан V-1 должен закрыться в безопасное положение при air_fail")
        self.assertFalse(sim.valves["V_3"], "Клапан V-3 должен закрыться в безопасное положение при air_fail")
        
        # Попытка открыть V-1 и V-3 или изменить V-2 блокируется при air_fail
        sim.set_valve("V_1", True)
        sim.set_valve("V_2", True)
        self.assertFalse(sim.valves["V_1"], "Клапан V-1 не должен открываться без воздуха КИПиА")
        self.assertFalse(sim.valves["V_2"], "Клапан V-2 должен быть заблокирован при air_fail")

    def test_defect_pump_interlock_low_level(self):
        """Тест-03: Проверка блокировки сухого хода насосов при уровне L-1 < 15%."""
        sim = ELOUAVTSimulator()
        sim.reset("shutdown")
        sim.sensors["L_1"] = 14.0  # Уровень ниже порога 15%
        
        # Делаем шаг симуляции и проверяем, что расход сырья F_in = 0 и кубовый насос V-3 остановлен (защита от сухого хода)
        prev_L = sim.sensors["L_1"]
        state = sim.step()
        # При сработке блокировки сухого хода (L < 15%) насосы остановлены (dL = 0), уровень изменяется только в пределах случайного шума (+-0.05%) и не растет от V_1 (+0.5%)
        self.assertLessEqual(state["sensors"]["L_1"], prev_L + 0.1, "При L-1 < 15% блокируется подача сырья (F_in = 0), поэтому уровень не растет от V_1")

    @classmethod
    def tearDownClass(cls):
        # Удаляем тестовую БД после завершения тестов
        from backend.db.database import DB_PATH
        if os.path.exists(DB_PATH) and "tutor_test.db" in DB_PATH:
            try:
                os.remove(DB_PATH)
            except Exception:
                pass

if __name__ == "__main__":
    unittest.main()
