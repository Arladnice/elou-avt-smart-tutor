"""
Разбор нарушения электрообессоливания в ЭЛОУ.

Последняя из девяти неисправностей, для которой _evaluate_defect_handling
возвращал None: сессия падала в общую LCS-оценку, и оператор, отработавший
проскок солей, получал тот же балл, что и не заметивший его.

Физика дефекта (simulation/model.py): при elou_desalt_fail и открытом V_ELOU
солесодержание уходит с 4,2 до 42 мг/л, обводнённость с 0,15 до 3,2%.
Закрытие V_ELOU изолирует неисправный поток. Последствие по мини-HAZOP — унос воды вверх
колонн и коррозия, по описанию сценария elou_salt_breakthrough — вскипание
воды и бросок давления в К-1. Отсюда и эталонная реакция: сброс давления
на факел либо аварийный останов.
"""

from elou_tutor.tutor.analyzer import ErrorAnalyzer


def _evaluate(actions, scenario_id="shutdown"):
    return ErrorAnalyzer().evaluate_session(
        list(actions),
        scenario_id,
        defects_triggered={"elou_desalt_fail"},
        time_elapsed=120,
    )


def _mentions(errors, *keywords):
    """Разбор относится к ЭЛОУ, а не достался от LCS-фолбэка."""
    blob = " ".join(
        f"{e.get('title', '')} {e.get('text', '')} {e.get('clause', '')}" for e in errors
    ).lower()
    return any(word.lower() in blob for word in keywords)


def test_regulation_sequence_is_credited():
    """Изоляция ЭЛОУ, останов подачи и горячая циркуляция парируют проскок."""
    score, errors, recs, _ = _evaluate([
        "V_ELOU_CLOSE", "N_20_STOP", "V1_CLOSE", "HC_P1_OPEN", "HC_P3_OPEN", "SP_DOWN", "SP3_DOWN",
    ])

    assert score == 100
    assert errors == []
    assert recs


def test_regulation_sequence_requires_actual_furnace_cooling():
    """Сниженные уставки не дают зачёт, пока фактические печи горячие."""
    actions = [
        "V_ELOU_CLOSE", "N_20_STOP", "V1_CLOSE", "HC_P1_OPEN", "HC_P3_OPEN",
        "SP_DOWN", "SP3_DOWN",
    ]
    analyzer = ErrorAnalyzer()

    hot_score, hot_errors, _, _ = analyzer.evaluate_session(
        actions,
        "elou_salt_breakthrough",
        defects_triggered={"elou_desalt_fail"},
        final_sensors={"T_1": 260.0, "T_3": 240.0},
    )
    cooled_score, cooled_errors, _, _ = analyzer.evaluate_session(
        actions,
        "elou_salt_breakthrough",
        defects_triggered={"elou_desalt_fail"},
        final_sensors={"T_1": 200.0, "T_3": 200.0},
    )

    assert hot_score < 100
    assert hot_errors
    assert cooled_score == 100
    assert cooled_errors == []


def test_emergency_stop_is_credited():
    score, errors, _, _ = _evaluate(["ESD"])

    assert score == 100
    assert errors == []


def test_ignoring_salt_breakthrough_is_penalised():
    score, errors, recs, next_id = _evaluate(["V3_OPEN"])

    assert score <= 40
    assert _mentions(errors, "обессолив", "солей", "ЭЛОУ")
    assert recs
    assert next_id


def test_opening_elou_valve_alone_is_not_enough():
    """
    Открытый V-ELOU не изолирует неисправный поток, поэтому требуется полный
    набор действий: изоляция ЭЛОУ, останов подачи, циркуляция и снижение нагрева.
    """
    score, errors, _, _ = _evaluate(["V_ELOU_OPEN"])

    assert score <= 40
    assert _mentions(errors, "обессолив", "солей", "ЭЛОУ")


def test_error_cites_regulation_clause():
    _, errors, _, _ = _evaluate(["V3_OPEN"])

    assert errors[0]["clause"]
    assert errors[0]["title"]
    assert errors[0]["text"]


def test_error_is_localised_in_time():
    _, errors, _, _ = _evaluate(["V3_OPEN"])

    assert errors[0]["at_second"] == 120


# ---------------------------------------------------------------
# Регрессии разбора отказа электроснабжения
# ---------------------------------------------------------------

def _power_fail(actions, scenario_id="startup"):
    return ErrorAnalyzer().evaluate_session(
        list(actions),
        scenario_id,
        defects_triggered={"power_fail"},
        time_elapsed=120,
    )


def test_power_fail_inaction_is_not_credited_at_startup():
    """
    Бездействие при обесточивании не должно давать зачёт.

    Условие «подача перекрыта» проверялось как «V1_OPEN нет в списке
    действий». Пока в разбор попадал дополненный список, нормализатор пуска
    сам дописывал туда V1_OPEN, и условие не срабатывало. После перехода на
    реальные действия оператора отсутствие V1_OPEN стало означать «подача
    перекрыта», и оператор, не тронувший арматуру, получал 100 баллов.
    """
    score, errors, _, _ = _power_fail(["SP_UP"])

    assert score < 100, "зачёт выдан за бездействие при обесточивании"
    assert errors


def test_power_fail_does_not_require_duplicate_heat_reduction():
    """При power_fail модель уже сняла нагрев, достаточно отсечь подачу."""
    score, errors, _, _ = _power_fail(["V1_OPEN", "V1_CLOSE"])

    assert score == 100
    assert errors == []


def test_power_fail_correct_response_still_scores_full():
    """Эталонная реакция из тест-кейса 6 обязана остаться стопроцентной."""
    score, errors, _, _ = _power_fail(["SP_DOWN", "V1_CLOSE"])

    assert score == 100
    assert errors == []


def test_air_fail_requires_actual_furnace_cooling():
    """Уставки снижены, но горячие печи ещё не означают успешную ликвидацию."""
    analyzer = ErrorAnalyzer()
    actions = ["SP_DOWN", "SP3_DOWN"]

    hot_score, hot_errors, _, _ = analyzer.evaluate_session(
        actions,
        "shutdown",
        defects_triggered={"air_fail"},
        final_sensors={"T_1": 280.0, "T_3": 275.0},
    )
    cooled_score, cooled_errors, _, _ = analyzer.evaluate_session(
        actions,
        "shutdown",
        defects_triggered={"air_fail"},
        final_sensors={"T_1": 245.0, "T_3": 245.0},
    )

    assert hot_score < 100
    assert hot_errors
    assert cooled_score == 100
    assert cooled_errors == []
