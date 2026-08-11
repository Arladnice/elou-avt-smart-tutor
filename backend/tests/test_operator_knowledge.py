"""Проверки общей базы знаний ассистента."""

from elou_tutor.services.operator_knowledge import build_knowledge_context, rag_answer


def test_rag_knows_hyphen_and_latin_alias_for_pump_n2():
    answer = rag_answer("как пустить h-2?", {"sensors": {}})

    assert "Н-2" in answer
    assert "V-3" in answer
    assert "V-П1" in answer


def test_rag_knows_new_vacuum_and_k2_defect_scenarios():
    vacuum = rag_answer("Что делать при срыве вакуума ВТ?", {"sensors": {}})
    pumps = rag_answer("Отказ насосов Н-4/Н-32", {"sensors": {}})

    assert "К-2" in vacuum
    assert "Н-4/Н-32" in pumps
    assert "рециркуляцию" in pumps


def test_rag_explains_fuel_shutoff_using_visible_controls():
    answer = rag_answer("Как закрыть обе топливные линии?", {"sensors": {}})
    context = build_knowledge_context("Как закрыть обе топливные линии?")

    for text in ("ТОПЛ. П-1", "ТОПЛ. П-3", "ПЛАМЯ: НЕТ"):
        assert text in answer
        assert text in context


def test_rag_explains_shutdown_hot_circulation_without_v2():
    answer = rag_answer(
        "Что надо сделать чтобы пункт 3 выполнить?",
        {"scenarioId": "shutdown", "sensors": {}},
    )
    context = build_knowledge_context("Что надо сделать чтобы пункт 3 выполнить?", active_scenario_id="shutdown")

    for text in ("Печь П-1", "Печь П-3"):
        assert text in answer
        assert text in context
    assert "Клапан V-2 для этого шага не открывайте" in answer
    assert "V-2 для этого шага не открывайте" in context


def test_llm_context_contains_current_scenarios_and_updated_requirements():
    context = build_knowledge_context("пуск", include_all_scenarios=True)

    assert "Пуск установки ЭЛОУ-АВТ" in context
    assert "обеих печей" in context
    assert "Перевод на рециркуляцию" in context
    assert "Срыв вакуума вакуумного блока ВТ" in context


def test_generic_procedure_uses_selected_scenario_and_active_defect():
    answer = rag_answer(
        "Порядок действий по сценарию",
        {"scenarioId": "recirculation", "sensors": {}, "defects": {"k2_pump_fail": True}},
    )

    assert "Отказ Н-4/Н-32" in answer
    assert "Перевод на рециркуляцию" in answer


def test_llm_receives_relevant_current_knowledge(monkeypatch):
    from elou_tutor.services import ai_chat_service

    captured = {}

    def fake_query(messages):
        captured["system"] = messages[0]["content"]
        return "Проверочный ответ"

    monkeypatch.setattr(ai_chat_service, "query_local_llm", fake_query)
    response, mode = ai_chat_service.process_ai_chat(
        [{"role": "user", "content": "как пустить Н-2?"}],
        {"sensors": {}, "valves": {}, "setpoints": {}, "pumps": {}, "defects": {}},
        mode="llm",
    )

    assert mode == "llm"
    assert response == "Проверочный ответ"
    assert "Н-2" in captured["system"]
    assert "Пуск установки ЭЛОУ-АВТ" in captured["system"]
