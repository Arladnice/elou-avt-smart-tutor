"""
Тьютор обязан разбирать неисправности вакуумного блока К-2.

В ws.py объявлено девять неисправностей, а _evaluate_defect_handling знает
шесть. Для vt_vacuum_loss и k2_pump_fail разбор возвращал None, сессия падала
в обычную LCS-оценку по эталону базового сценария, и оператор, правильно
отработавший срыв вакуума, получал ровно тот же балл, что и полностью его
проигнорировавший.
"""

from elou_tutor.tutor.analyzer import ErrorAnalyzer


def _evaluate(actions, defect, scenario_id="shutdown", final_sensors=None):
    return ErrorAnalyzer().evaluate_session(
        list(actions),
        scenario_id,
        defects_triggered={defect},
        final_sensors=final_sensors,
        time_elapsed=120,
    )


def _mentions(errors, *keywords):
    """
    Разбор относится именно к К-2, а не достался от LCS-фолбэка.

    Без этой проверки тесты на штраф проходили бы и до реализации: оценка по
    эталону базового сценария и так низкая, а ошибки в списке и так есть —
    только они про печь и К-1, а не про вакуумный блок.
    """
    blob = " ".join(
        f"{e.get('title', '')} {e.get('text', '')} {e.get('clause', '')}" for e in errors
    ).lower()
    return any(word.lower() in blob for word in keywords)


class TestVacuumLossParry:
    """Срыв вакуума ВТ: последствие по HAZOP — коксование и крекинг мазута."""

    def test_heat_reduction_is_credited(self):
        score, errors, recs, _ = _evaluate([
            "SP_DOWN", "SP3_DOWN", "N_20_STOP", "V1_CLOSE", "V_STEAM_K2_CLOSE",
            "HC_P1_OPEN", "HC_P3_OPEN",
        ], "vt_vacuum_loss")

        assert score == 100
        assert errors == []
        assert recs

    def test_emergency_stop_is_credited(self):
        """Аварийный останов — допустимая более сильная реакция."""
        score, errors, _, _ = _evaluate(["ESD"], "vt_vacuum_loss")

        assert score == 100
        assert errors == []

    def test_ignoring_vacuum_loss_is_penalised(self):
        score, errors, recs, next_id = _evaluate(["V2_OPEN"], "vt_vacuum_loss")

        assert score <= 40
        assert _mentions(errors, "вакуум"), "Разбор обязан говорить о срыве вакуума"
        assert recs
        assert next_id

    def test_error_cites_regulation_clause(self):
        _, errors, _, _ = _evaluate(["V2_OPEN"], "vt_vacuum_loss")

        assert _mentions(errors, "вакуум")
        assert errors[0]["clause"]
        assert errors[0]["title"]
        assert errors[0]["text"]

    def test_restoring_ejector_steam_alone_is_not_enough(self):
        """
        Дефект моделирует отказ эжекторов, а не прекращение подачи пара.

        Открытие V-VT вакуум при этом не восстанавливает (см. model.py:
        vacuum_available = V_VT and not defects[vt_vacuum_loss]), поэтому
        без снижения нагрева мазут продолжает коксоваться.
        """
        score, errors, _, _ = _evaluate(["V_VT_OPEN"], "vt_vacuum_loss")

        assert score <= 40
        assert _mentions(errors, "вакуум")


class TestK2PumpFailParry:
    """Отказ насосов откачки куба К-2 Н-4/Н-32: куб заполняется, идёт захлёбывание."""

    def test_cutting_feed_to_k2_is_credited(self):
        """V-3, Н-20 и V-1 останавливают поступление продукта в К-2."""
        score, errors, recs, _ = _evaluate(
            ["V3_CLOSE", "N_20_STOP", "V1_CLOSE"], "k2_pump_fail"
        )

        assert score == 100
        assert errors == []
        assert recs

    def test_raw_feed_shutdown_is_required(self):
        """Одна отсечка V-3 без остановки Н-20 и V-1 не засчитывается."""
        score, errors, _, _ = _evaluate(["V3_CLOSE"], "k2_pump_fail")

        assert score < 100
        assert errors

    def test_emergency_stop_is_credited(self):
        score, errors, _, _ = _evaluate(["ESD"], "k2_pump_fail")

        assert score == 100
        assert errors == []

    def test_leaving_feed_open_is_penalised(self):
        score, errors, recs, next_id = _evaluate(["V3_OPEN", "SP_UP"], "k2_pump_fail")

        assert score <= 40
        assert _mentions(errors, "К-2"), "Разбор обязан говорить о кубе К-2"
        assert recs
        assert next_id

    def test_error_cites_regulation_clause(self):
        _, errors, _, _ = _evaluate(["V3_OPEN"], "k2_pump_fail")

        assert _mentions(errors, "К-2")
        assert errors[0]["clause"]
        assert errors[0]["title"]
        assert errors[0]["text"]


def test_k2_defects_are_localised_in_time():
    """Ошибки разбора обязаны получать отметку времени, как у прочих дефектов."""
    _, errors, _, _ = _evaluate(["V2_OPEN"], "vt_vacuum_loss")

    assert _mentions(errors, "вакуум")
    assert errors[0]["at_second"] == 120
