"""
Тесты-критерии для локализации ошибок во времени (критерий ИИ, 3-балльная ступень).

Каждое действие оператора получает отметку времени, а каждое нарушение —
привязку к моменту и к конкретному действию, которое его вызвало.
"""

import os
import sys
import unittest

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

from ai_core.error_analyzer import ErrorAnalyzer
from elou_tutor.domain.regulations import TECH_REGULATIONS


class TestActionTimeline(unittest.TestCase):
    """Каждое действие фиксируется вместе с секундой сессии."""

    def setUp(self):
        from backend.services.connection_manager import SimulationSession
        self.session = SimulationSession("timeline_probe")

    def test_action_is_recorded_with_timestamp(self):
        self.session.simulator.time_elapsed = 42
        self.session.record_action("V1_OPEN")

        entry = self.session.action_timeline[-1]
        self.assertEqual(entry["action"], "V1_OPEN")
        self.assertEqual(entry["at_second"], 42)

    def test_timeline_stays_aligned_with_actions(self):
        for second, action in [(5, "V1_OPEN"), (12, "SP_UP"), (30, "V3_OPEN")]:
            self.session.simulator.time_elapsed = second
            self.session.record_action(action)

        self.assertEqual(
            [e["action"] for e in self.session.action_timeline],
            self.session.actions_taken,
        )
        self.assertEqual([e["at_second"] for e in self.session.action_timeline], [5, 12, 30])

    def test_timeline_is_trimmed_together_with_actions(self):
        from backend.services.connection_manager import MAX_SESSION_ACTIONS

        for i in range(MAX_SESSION_ACTIONS + 100):
            self.session.simulator.time_elapsed = i
            self.session.record_action("SP_UP")

        self.assertEqual(len(self.session.action_timeline), len(self.session.actions_taken))
        self.assertLessEqual(len(self.session.action_timeline), MAX_SESSION_ACTIONS)

    def test_reset_clears_timeline(self):
        self.session.record_action("V1_OPEN")
        self.session.reset_session()
        self.assertEqual(self.session.action_timeline, [])

    def test_actions_taken_remains_a_list_of_strings(self):
        """Контракт анализатора: LCS и правила работают со строками."""
        self.session.record_action("V1_OPEN")
        self.assertTrue(all(isinstance(a, str) for a in self.session.actions_taken))


class TestViolationLocalization(unittest.TestCase):
    """Нарушение указывает, когда и на каком действии оно произошло."""

    def setUp(self):
        self.analyzer = ErrorAnalyzer()

    def _timeline(self, pairs):
        return [
            {"index": i, "action": a, "at_second": t}
            for i, (a, t) in enumerate(pairs)
        ]

    def test_action_triggered_violation_carries_time_and_action(self):
        """Нагрев всухую: печь греют при перекрытой подаче сырья."""
        actions = ["V1_CLOSE", "SP_UP"]
        timeline = self._timeline([("V1_CLOSE", 10), ("SP_UP", 25)])

        _, errors, _, _ = self.analyzer.evaluate_session(
            actions, "startup", timeline=timeline, time_elapsed=120
        )

        dry_heat = [e for e in errors if e["clause"] == TECH_REGULATIONS["P1_DRY_HEAT"]["clause"]]
        self.assertTrue(dry_heat, "Нарушение 'нагрев всухую' не обнаружено")
        self.assertEqual(dry_heat[0]["at_second"], 25)
        self.assertEqual(dry_heat[0]["action"], "SP_UP")
        self.assertEqual(dry_heat[0]["action_index"], 1)

    def test_end_of_session_violation_is_tied_to_session_end(self):
        """Проверки финального состояния привязываются ко времени завершения."""
        actions = ["V1_OPEN", "SP_UP", "V3_OPEN"]
        timeline = self._timeline([("V1_OPEN", 3), ("SP_UP", 8), ("V3_OPEN", 15)])

        _, errors, _, _ = self.analyzer.evaluate_session(
            actions, "startup", final_sensors={"T_1": 100.0, "L_1": 50.0},
            time_elapsed=90, timeline=timeline
        )

        self.assertTrue(errors, "Ожидалось нарушение по недостигнутой температуре")
        for err in errors:
            with self.subTest(error=err["title"]):
                self.assertIn("at_second", err)
                self.assertEqual(err["at_second"], 90)

    def test_every_error_exposes_localization_fields(self):
        actions = ["V1_CLOSE", "SP_UP"]
        timeline = self._timeline([("V1_CLOSE", 10), ("SP_UP", 25)])

        _, errors, _, _ = self.analyzer.evaluate_session(
            actions, "startup", timeline=timeline, time_elapsed=60
        )

        for err in errors:
            with self.subTest(error=err["title"]):
                self.assertIn("at_second", err)
                self.assertIn("action_index", err)
                self.assertIn("action", err)

    def test_shared_regulation_dictionaries_are_not_mutated(self):
        """
        Объекты правил — общие константы модуля.

        Если обогащать их на месте, время из одной сессии протечёт в отчёты
        всех остальных.
        """
        before = dict(TECH_REGULATIONS["P1_DRY_HEAT"])

        self.analyzer.evaluate_session(
            ["V1_CLOSE", "SP_UP"], "startup",
            timeline=self._timeline([("V1_CLOSE", 10), ("SP_UP", 25)]),
            time_elapsed=60,
        )

        self.assertEqual(TECH_REGULATIONS["P1_DRY_HEAT"], before)
        self.assertNotIn("at_second", TECH_REGULATIONS["P1_DRY_HEAT"])

    def test_action_index_points_into_the_operator_timeline(self):
        """
        Анализ вставляет неявные действия (при пуске «клапан уже был открыт»),
        из-за чего его внутренние позиции смещаются относительно таймлайна.
        Наружу обязана уходить позиция реального действия оператора.
        """
        actions = ["SP_UP", "V1_CLOSE"]
        timeline = self._timeline([("SP_UP", 10), ("V1_CLOSE", 20)])

        _, errors, _, _ = self.analyzer.evaluate_session(
            actions, "startup", timeline=timeline, time_elapsed=100
        )

        hot_cut = [e for e in errors if e["clause"] == TECH_REGULATIONS["HOT_CUT"]["clause"]]
        self.assertTrue(hot_cut, "Нарушение 'перекрытие сырья на горячую' не обнаружено")
        self.assertEqual(hot_cut[0]["at_second"], 20)
        self.assertEqual(hot_cut[0]["action_index"], 1, "Индекс указывает не на действие оператора")
        self.assertEqual(timeline[hot_cut[0]["action_index"]]["action"], "V1_CLOSE")

    def test_action_name_matches_the_timeline_entry(self):
        """Имя действия в ошибке должно совпадать с записью таймлайна."""
        timeline = self._timeline([("V_1_CLOSE", 10), ("SP_UP", 25)])

        _, errors, _, _ = self.analyzer.evaluate_session(
            ["V_1_CLOSE", "SP_UP"], "startup", timeline=timeline, time_elapsed=60
        )

        localized = [e for e in errors if e["action_index"] is not None]
        self.assertTrue(localized)
        for err in localized:
            with self.subTest(error=err["title"]):
                self.assertEqual(err["action"], timeline[err["action_index"]]["action"])

    def test_works_without_timeline(self):
        """Без таймлайна оценка обязана работать по-прежнему."""
        score, errors, _, _ = self.analyzer.evaluate_session(["V1_CLOSE", "SP_UP"], "startup")
        self.assertIsInstance(score, int)
        for err in errors:
            self.assertIsNone(err.get("at_second"))


class TestScoreCardExposesTimeline(unittest.TestCase):
    """ScoreCard отдаёт таймлайн наружу — на нём строится разбор тренировки."""

    def test_score_card_contains_timeline_and_localized_errors(self):
        from backend.services.connection_manager import SimulationSession

        session = SimulationSession("scorecard_probe")
        session.active_scenario = "startup"
        for second, action in [(10, "V1_CLOSE"), (25, "SP_UP")]:
            session.simulator.time_elapsed = second
            session.record_action(action)

        session.simulator.status = "success"
        card = session.get_full_state()["scoreCard"]

        self.assertIsNotNone(card, "ScoreCard не сформирован")
        self.assertIn("timeline", card)
        self.assertEqual([e["action"] for e in card["timeline"]], ["V1_CLOSE", "SP_UP"])
        self.assertEqual([e["at_second"] for e in card["timeline"]], [10, 25])
        for err in card["errors"]:
            self.assertIn("at_second", err)


if __name__ == "__main__":
    unittest.main()
