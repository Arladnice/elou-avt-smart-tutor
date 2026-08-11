"""
Двухступенчатая эскалация тревоги по низкому уровню куба К-1.

Регламент различает две ступени: предупреждение при снижении ниже 18 %
и критическую тревогу при снижении ниже 8 %. Дубль присвоения константы
COLUMN_LEVEL_LOW_CRITICAL_LEVEL обнулял различие — любая тревога по
низкому уровню сразу становилась CRITICAL, а ветка WARNING была
недостижима.
"""

import ast
import asyncio
import os
import pathlib
import sys
import unittest

TEST_DB_PATH = os.path.join(os.path.dirname(__file__), "tutor_test.db")
os.environ["DATABASE_PATH"] = TEST_DB_PATH

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

from elou_tutor.domain import process_limits  # noqa: E402


class _FakeWS:
    async def send_json(self, data):
        pass


class TestThresholdLadderIsConsistent(unittest.TestCase):
    """Пороги нижнего уровня обязаны образовывать строго убывающую лестницу."""

    def test_no_duplicate_assignments_in_process_limits(self):
        """Ни одна константа порога не должна присваиваться дважды.

        Дубль опасен именно тем, что тихо переопределяет значение:
        код читается как задуманный, а работает по последнему присвоению.
        """
        source = pathlib.Path(process_limits.__file__).read_text(encoding="utf-8")
        assigned = [
            target.id
            for node in ast.parse(source).body
            if isinstance(node, ast.Assign)
            for target in node.targets
            if isinstance(target, ast.Name)
        ]
        duplicates = sorted({name for name in assigned if assigned.count(name) > 1})
        self.assertEqual([], duplicates, f"константы присвоены повторно: {duplicates}")

    def test_low_level_thresholds_are_strictly_descending(self):
        """Предупреждение → эскалация → блокировка ПАЗ → авария."""
        ladder = [
            ("COLUMN_LEVEL_LOW", process_limits.COLUMN_LEVEL_LOW),
            ("COLUMN_LEVEL_LOW_INTERLOCK", process_limits.COLUMN_LEVEL_LOW_INTERLOCK),
            ("COLUMN_LEVEL_LOW_CRITICAL_LEVEL", process_limits.COLUMN_LEVEL_LOW_CRITICAL_LEVEL),
            ("COLUMN_LEVEL_LOW_CRITICAL", process_limits.COLUMN_LEVEL_LOW_CRITICAL),
        ]
        # Эскалация обязана срабатывать строго ниже порога предупреждения,
        # иначе ступень WARNING вырождается в пустой интервал.
        self.assertLess(
            process_limits.COLUMN_LEVEL_LOW_CRITICAL_LEVEL,
            process_limits.COLUMN_LEVEL_LOW,
            "порог эскалации не ниже порога предупреждения — ступень WARNING недостижима",
        )
        for (prev_name, prev), (name, cur) in zip(ladder, ladder[1:]):
            self.assertGreater(prev, cur, f"{prev_name} должен быть выше {name}")


class TestLowLevelAlertSeverity(unittest.TestCase):
    """Обе ступени тревоги должны реально порождаться циклом симуляции."""

    def _severity_for_level(self, level):
        from elou_tutor.services.connection_manager import SimulationSession
        from elou_tutor.services.simulation_loop import step_session

        session = SimulationSession(f"escalation_probe_{level}")
        session.operator_sockets.add(_FakeWS())
        session.active_scenario = "shutdown"
        # Уводим прочие параметры из зоны тревоги, чтобы поймать
        # запись именно по низкому уровню куба.
        session.simulator.sensors["T_1"] = 250.0
        session.simulator.sensors["P_1"] = 0.25
        session.simulator.sensors["L_1"] = level
        session.simulator.setpoints["T_1_Sp"] = 250.0
        session.simulator.valves["V_1"] = False
        session.simulator.valves["V_3"] = False

        asyncio.run(step_session(session))

        entries = [log for log in session.logs if log.get("fingerprint") == "column_level_low"]
        self.assertTrue(entries, f"тревога по низкому уровню не выдана при L_1={level}")
        return entries[-1]["severity"]

    def test_moderately_low_level_is_only_a_warning(self):
        """12 % — ниже порога предупреждения, но выше порога эскалации."""
        self.assertEqual("WARNING", self._severity_for_level(12.0))

    def test_critically_low_level_is_critical(self):
        """6 % — ниже порога эскалации: сухой ход уже близко."""
        self.assertEqual("CRITICAL", self._severity_for_level(6.0))

    def test_k2_low_level_interlock_explains_automatic_outflow_block(self):
        """На пороге ПАЗ К-2 подсказка не должна предлагать включить откачку."""
        from elou_tutor.services.connection_manager import SimulationSession
        from elou_tutor.services.simulation_loop import step_session

        session = SimulationSession("k2_low_interlock_message")
        session.operator_sockets.add(_FakeWS())
        session.active_scenario = "recirculation"
        session.simulator.sensors["L_2"] = 15.0
        session.simulator.valves["V_1"] = False
        session.simulator.valves["V_3"] = False

        asyncio.run(step_session(session))

        entries = [log for log in session.logs if log.get("fingerprint") == "k2_level_low"]
        self.assertTrue(entries)
        self.assertIn("автоматически заблокирована", entries[-1]["message"])


if __name__ == "__main__":
    unittest.main()
