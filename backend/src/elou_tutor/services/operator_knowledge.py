"""Единая актуальная база знаний для RAG и контекста локальной LLM.

Сценарии не копируются вручную в markdown: карточки строятся из активного
реестра сценариев. Поэтому правка сценария в конструкторе сразу доступна
помощнику при следующем вопросе оператора.
"""

from __future__ import annotations

import re
from typing import Any, Dict, Iterable, List

from elou_tutor.simulation.scenarios import load_scenarios


UNKNOWN_ANSWER = (
    "Информация по данному запросу не найдена в базе знаний тренажёра "
    "ЭЛОУ-АВТ. Уточните оборудование, сценарий или обратитесь к инструктору."
)

_FUEL_SHUTOFF_GUIDE = (
    "Чтобы отсечь топливо обеих печей, на мнемосхеме нажмите два зелёных вертикальных "
    "клапана под печами: «ТОПЛ. П-1» и «ТОПЛ. П-3». Альтернатива: во вкладке "
    "«Управление» выключите переключатели «Топливо П-1» и «Топливо П-3». "
    "После закрытия оба клапана серые, а под T-1 и T-3 отображается «ПЛАМЯ: НЕТ»."
)

_HOT_CIRCULATION_GUIDE = (
    "Для горячей циркуляции откройте вкладку «Управление» и в блоке «Горячая "
    "циркуляция» включите оба переключателя: «Печь П-1» и «Печь П-3». Н-2 и "
    "Н-3 оставьте в положении «ПУСК». Клапан V-2 для этого шага "
    "не открывайте."
)


_EQUIPMENT = {
    "н-20": (
        "Н-20 — сырьевой насос. Его пускают перед открытием V-1; при аварийном "
        "останове или изоляции ЭЛОУ насос останавливают и закрывают V-1."
    ),
    "н-2": (
        "Н-2 — насос циркуляции/откачки куба К-1 в контуре П-1. Для пуска "
        "откройте V-3 и вход П-1 (V-П1), затем включите Н-2. Показание L-2 "
        "начнёт расти после транспортного запаздывания около 12 с. При останове "
        "насос оставляют в работе до требуемого охлаждения, после чего останавливают."
    ),
    "н-3": "Н-3 — насос циркуляции контура П-3. Используется вместе с Н-2 при горячей циркуляции.",
    "н-4": "Н-4 — рабочий насос откачки куба К-2. После заполнения К-2 выше 15% откройте V-Н4 и пустите Н-4, чтобы удерживать уровень.",
    "н-32": "Н-32 — резервный насос откачки куба К-2. Его используют при отказе Н-4 или по указанию сценария.",
    "п-1": "П-1 — печь атмосферного блока. Управление: отдельная уставка Т-1, топливо П-1 и горячая циркуляция П-1.",
    "п-3": "П-3 — печь вакуумного блока. Управление: отдельная уставка Т-3, топливо П-3 и горячая циркуляция П-3.",
    "к-1": "К-1 — атмосферная колонна; контролируются давление P-1, уровень куба L-1, V-2 (сброс) и V-3 (дренаж).",
    "к-2": "К-2 — вакуумная колонна; учитываются вакуум, подача пара К-2, Н-4/Н-32 и газовый сброс К-2.",
    "элоу": "ЭЛОУ — электрообессоливание. При проскоке солей и воды закрывают V-ЭЛОУ, останавливают Н-20 и изолируют подачу V-1.",
    "вт": "ВТ — вакуумный блок. При срыве вакуума снижают нагрев обеих печей и прекращают подачу пара К-2.",
    "паз": (
        "ПАЗ и деблокировки: Е-1 — 2oo2, ≤20%/авария <15%; К1 — 1oo1, сигнал ≥4,5 кгс/см², "
        "авария >4,8 кгс/см²; К1 (куб) — 2oo3, ≤20%/<15%; Е-2 — 2oo2, ≤20%/<15%; "
        "К2 — 1oo1, сигнал ≥1,0 кгс/см², авария >1,5 кгс/см²; К2 (куб) — 2oo3, ≤20%/<15%. "
        "Деблокировку нельзя включать при активном ПАЗ; действие разрешает дежурный инженер и оно фиксируется в журнале."
    ),
}

_DEFECTS = {
    "pump_fail": "Отказ сырьевого насоса Н-1: снизьте уставки П-1 и П-3, затем закройте V-1.",
    "coil_overheat": "Прогар змеевика П-1: перекройте топливо П-1, закройте вход П-1 (V-П1) и V-3, затем снизьте нагрев и выполните сброс по сценарию.",
    "air_fail": "Отказ воздуха КИПиА: снизьте уставки обеих печей; V-1 и V-3 удерживаются закрытыми в безопасном положении.",
    "elou_desalt_fail": "Нарушение обессоливания ЭЛОУ: закройте V-ЭЛОУ, остановите Н-20, закройте V-1, включите горячую циркуляцию и снизьте нагрев обеих печей.",
    "vt_vacuum_loss": "Срыв вакуума ВТ: снизьте уставки П-1 и П-3 до 200°C, остановите Н-20 и закройте V-1. Затем закройте только пар К-2; пар К-1 и V-VT не трогайте, газовый сброс К-2 не открывайте. Включите горячую циркуляцию и оставьте Н-2, Н-3 и один насос К-2 в работе.",
    "k2_pump_fail": "Отказ Н-4/Н-32: насосы К-2 останавливаются; выполните перевод на рециркуляцию по одноимённому сценарию.",
}

_DEFECT_ALIASES = {
    "pump_fail": ("отказ насоса", "н-1", "н1", "сырьев", "pump_fail"),
    "coil_overheat": ("прогар", "змеевик", "перегрев п-1", "coil_overheat"),
    "air_fail": ("воздуха кипиа", "кипиа", "air_fail"),
    "elou_desalt_fail": ("обессолив", "проскок сол", "elou_desalt_fail"),
    "vt_vacuum_loss": ("срыв вакуум", "вакуумного блока", "vt_vacuum_loss"),
    "k2_pump_fail": ("н-4", "н-32", "насосов к-2", "k2_pump_fail"),
}

_ALIASES = {
    "н-2": ("н-2", "н2", "h-2", "h2", "n-2", "n2"),
    "н-20": ("н-20", "н20", "h-20", "h20", "n-20", "n20"),
    "н-3": ("н-3", "н3", "h-3", "h3", "n-3", "n3"),
    "н-4": ("н-4", "н4", "h-4", "h4", "n-4", "n4"),
    "н-32": ("н-32", "н32", "h-32", "h32", "n-32", "n32"),
    "п-1": ("п-1", "п1", "p-1", "p1"),
    "п-3": ("п-3", "п3", "p-3", "p3"),
    "к-1": ("к-1", "к1", "k-1", "k1", "колонн"),
    "к-2": ("к-2", "к2", "k-2", "k2"),
}


def _normalise(text: str) -> str:
    return re.sub(r"\s+", " ", text.lower().replace("ё", "е")).strip()


def _matches(text: str, terms: Iterable[str]) -> bool:
    normalized = _normalise(text)
    return any(term in normalized for term in terms)


def _is_fuel_shutoff_question(text: str) -> bool:
    """Определяет запрос оператора о закрытии топливных линий печей."""
    normalized = _normalise(text)
    return "топлив" in normalized and any(term in normalized for term in ("закры", "перекры", "отсеч"))


def _is_hot_circulation_question(text: str) -> bool:
    """Определяет запрос об управлении горячей циркуляцией печей."""
    normalized = _normalise(text)
    return "горяч" in normalized or "циркуляц" in normalized


def scenario_cards() -> List[Dict[str, str]]:
    """Возвращает актуальные карточки встроенных и пользовательских сценариев."""
    cards: List[Dict[str, str]] = []
    for scenario in load_scenarios():
        steps = []
        for item in scenario.get("checklist", []):
            steps.append(item.get("hint_training") or item.get("title", ""))
        body = "\n".join(f"{index}. {step}" for index, step in enumerate(steps, 1) if step)
        cards.append({
            "id": scenario.get("id", ""),
            "title": scenario.get("title", "Сценарий"),
            "text": f"Сценарий «{scenario.get('title', 'Сценарий')}». {scenario.get('description', '')}\nШаги:\n{body}",
        })
    return cards


def _relevant_scenarios(query: str) -> List[Dict[str, str]]:
    normalized = _normalise(query)
    words = set(re.findall(r"[а-яa-z0-9_-]{3,}", normalized))
    scored = []
    for card in scenario_cards():
        text = _normalise(f"{card['title']} {card['text']}")
        score = sum(1 for word in words if word in text)
        if card["id"] in normalized or _normalise(card["title"]) in normalized:
            score += 5
        # Один общий термин («насос», «клапан») встречается почти в каждом
        # сценарии и не является достаточным основанием для подстановки.
        if score >= 2:
            scored.append((score, card))
    return [card for _, card in sorted(scored, key=lambda item: item[0], reverse=True)[:2]]


def build_knowledge_context(
    query: str,
    include_all_scenarios: bool = False,
    active_scenario_id: str | None = None,
) -> str:
    """Собирает проверяемый контекст для LLM из единого источника."""
    parts = ["Оборудование и ПАЗ:"]
    if _is_fuel_shutoff_question(query):
        parts.append(f"- {_FUEL_SHUTOFF_GUIDE}")
    if _is_hot_circulation_question(query):
        parts.append(f"- {_HOT_CIRCULATION_GUIDE}")
    for name, text in _EQUIPMENT.items():
        if include_all_scenarios or _matches(query, _ALIASES.get(name, (name,))) or (
            name == "паз" and any(word in _normalise(query) for word in ("паз", "деблок", "защит"))
        ):
            parts.append(f"- {text}")

    relevant = scenario_cards() if include_all_scenarios else _relevant_scenarios(query)
    if not include_all_scenarios and active_scenario_id:
        active_scenario = next((card for card in scenario_cards() if card["id"] == active_scenario_id), None)
        if active_scenario and active_scenario not in relevant:
            relevant.insert(0, active_scenario)
    # Н-2 — составная часть второго шага сценария пуска. Латинская раскладка
    # («h-2») не встречается в тексте сценария, поэтому добавляем карточку
    # явно, чтобы LLM получила точный порядок действий, а не только описание.
    if not include_all_scenarios and _matches(query, _ALIASES["н-2"]):
        startup = next((card for card in scenario_cards() if card["id"] == "startup"), None)
        if startup and startup not in relevant:
            relevant.insert(0, startup)
    if relevant:
        parts.append("Актуальные сценарии:")
        parts.extend(card["text"] for card in relevant)

    for defect_id, text in _DEFECTS.items():
        if include_all_scenarios or _matches(query, _DEFECT_ALIASES[defect_id]):
            parts.append(f"Нештатная ситуация: {text}")
    return "\n\n".join(parts)


def rag_answer(query: str, telemetry: Dict[str, Any]) -> str:
    """Даёт ответ только по известным данным тренажёра, без генерации фактов."""
    normalized = _normalise(query)
    matches = []
    if _is_fuel_shutoff_question(query):
        matches.append(_FUEL_SHUTOFF_GUIDE)
    active_scenario_id = telemetry.get("scenarioId")
    if _is_hot_circulation_question(query) or (active_scenario_id == "shutdown" and "пункт 3" in normalized):
        matches.append(_HOT_CIRCULATION_GUIDE)
    for name, description in _EQUIPMENT.items():
        aliases = _ALIASES.get(name, (name,))
        if _matches(normalized, aliases) or (name == "паз" and any(word in normalized for word in ("паз", "деблок", "защит"))):
            matches.append(description)

    for defect_id, description in _DEFECTS.items():
        if _matches(normalized, _DEFECT_ALIASES[defect_id]):
            matches.append(description)

    scenarios = _relevant_scenarios(query)
    generic_procedure = any(term in normalized for term in ("порядок", "сценар", "что делать", "действия", "пункт"))
    if generic_procedure and active_scenario_id:
        current = next((card for card in scenario_cards() if card["id"] == active_scenario_id), None)
        if current and current not in scenarios:
            scenarios.insert(0, current)
    if scenarios:
        matches.extend(card["text"] for card in scenarios)

    active_defects = telemetry.get("defects", {})
    if generic_procedure:
        for defect_id, is_active in active_defects.items():
            if is_active and defect_id in _DEFECTS:
                matches.insert(0, _DEFECTS[defect_id])

    if not matches:
        return UNKNOWN_ANSWER

    sensors = telemetry.get("sensors", {})
    state = (
        f"\n\nТекущее состояние: Т-1 {sensors.get('T_1', '—')}°C, "
        f"Т-3 {sensors.get('T_3', '—')}°C, P-1 {sensors.get('P_1', '—')} МПа, "
        f"L-1 {sensors.get('L_1', '—')}%."
    )
    return "\n\n".join(matches) + state
