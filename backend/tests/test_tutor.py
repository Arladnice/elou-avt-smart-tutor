import sys
import os
import unittest

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
        # Генерируем стабильный временной ряд (30 отчетов)
        dummy_window = [[280.0, 0.25, 50.0] for _ in range(30)]
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

if __name__ == "__main__":
    unittest.main()
