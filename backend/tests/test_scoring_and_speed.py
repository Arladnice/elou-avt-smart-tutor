"""
Тесты-критерии для функциональных дефектов, найденных аудитом по ТЗ кейса.

  1. golden_sequence ссылается на id шагов чек-листа вместо реальных действий,
     из-за чего LCS-оценка сценария не может достичь 100%.
  2. evaluate_session возвращает кортеж из 3 элементов вместо 4, если у сценария
     нет golden_sequence — вызывающий код падает с ValueError.
  3. Множитель скорости симуляции записывается, но не влияет на ход процесса.
"""

import os
import sys
import asyncio
import unittest

TEST_DB_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "tutor_test.db"))
os.environ["DATABASE_PATH"] = TEST_DB_PATH

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

from ai_core.error_analyzer import ErrorAnalyzer
from elou_tutor.simulation.scenarios import load_scenarios

# Имена действий, которые реально порождает обработчик команд (backend/routes/ws.py)
# после нормализации в ErrorAnalyzer (V_1 -> V1, V_2 -> V2, V_3 -> V3).
VALVE_IDS = ["V1", "V2", "V3", "V_ELOU", "V_VT"]
PRODUCIBLE_ACTIONS = (
    {f"{v}_OPEN" for v in VALVE_IDS}
    | {f"{v}_CLOSE" for v in VALVE_IDS}
    | {"SP_UP", "SP_DOWN", "ESD", "CALL_DISPATCHER"}
)


class TestGoldenSequenceReferencesRealActions(unittest.TestCase):
    """Эталон сценария должен состоять из действий, которые оператор способен выполнить."""

    def test_every_golden_step_is_a_producible_action(self):
        for scenario in load_scenarios():
            golden = scenario.get("golden_sequence") or []
            for step in golden:
                with self.subTest(scenario=scenario["id"], step=step):
                    self.assertIn(
                        step, PRODUCIBLE_ACTIONS,
                        f"Сценарий '{scenario['id']}': шаг '{step}' не соответствует ни одному "
                        f"действию оператора, поэтому LCS никогда его не засчитает"
                    )

    def test_perfect_run_scores_100_for_every_scenario(self):
        """Прохождение ровно по эталону обязано давать 100% в любом сценарии."""
        analyzer = ErrorAnalyzer()
        for scenario in load_scenarios():
            golden = scenario.get("golden_sequence") or []
            if not golden:
                continue
            with self.subTest(scenario=scenario["id"]):
                score, _, _, _ = analyzer.evaluate_session(list(golden), scenario["id"])
                self.assertEqual(
                    score, 100,
                    f"Идеальное прохождение '{scenario['id']}' оценено в {score}%"
                )


class TestEvaluateSessionArity(unittest.TestCase):
    """evaluate_session обязана всегда возвращать 4 значения."""

    def test_scenario_without_golden_sequence_returns_four_values(self):
        analyzer = ErrorAnalyzer()
        result = analyzer.evaluate_session(["V1_OPEN"], "сценарий_без_эталона")
        self.assertEqual(len(result), 4)

    def test_session_state_survives_scenario_without_golden_sequence(self):
        """Главный симптом: сборка состояния падала с ValueError при распаковке."""
        from backend.services.connection_manager import SimulationSession
        session = SimulationSession("arity_probe")
        session.active_scenario = "сценарий_без_эталона"
        session.actions_taken.append("V1_OPEN")

        state = session.get_full_state()
        self.assertIn("riskLevel", state)


class TestSimulationSpeedMultiplier(unittest.TestCase):
    """Множитель скорости должен реально ускорять ход техпроцесса."""

    class _FakeWS:
        async def send_json(self, data):
            pass

    def _elapsed_after_one_tick(self, multiplier):
        from backend.services.connection_manager import SimulationSession
        from backend.services.simulation_loop import step_session

        session = SimulationSession(f"speed_{multiplier}")
        session.operator_sockets.add(self._FakeWS())
        session.speed_multiplier = multiplier
        asyncio.run(step_session(session))
        return session.simulator.time_elapsed

    def test_normal_speed_advances_one_second(self):
        self.assertEqual(self._elapsed_after_one_tick(1.0), 1)

    def test_double_speed_advances_two_seconds(self):
        self.assertEqual(self._elapsed_after_one_tick(2.0), 2)

    def test_quadruple_speed_advances_four_seconds(self):
        self.assertEqual(self._elapsed_after_one_tick(4.0), 4)

    def test_multiplier_below_one_still_advances(self):
        """Замедление не должно останавливать процесс совсем."""
        self.assertGreaterEqual(self._elapsed_after_one_tick(0.5), 1)


if __name__ == "__main__":
    unittest.main()
