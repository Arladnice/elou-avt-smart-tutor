import os
import json
import urllib.request
import urllib.error
import logging
from typing import List, Dict, Any
from backend.services.vector_store import get_relevant_context

logger = logging.getLogger(__name__)

# Путь к базе знаний регламента
KB_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "knowledge_base"))

def load_kb_file(filename: str) -> str:
    """Загружает файл из базы знаний регламентов."""
    path = os.path.join(KB_DIR, filename)
    if os.path.exists(path):
        try:
            with open(path, "r", encoding="utf-8") as f:
                return f.read()
        except Exception as e:
            logger.error("Ошибка чтения файла БЗ %s: %s", filename, e)
    return ""

def get_telemetry_summary(telemetry: Dict[str, Any]) -> str:
    """Формирует текстовое описание текущего состояния установки."""
    sensors = telemetry.get("sensors", {})
    valves = telemetry.get("valves", {})
    setpoints = telemetry.get("setpoints", {})
    defects = telemetry.get("defects", {})
    status = telemetry.get("status", "running")
    risk = telemetry.get("riskLevel", 0)
    
    valves_str = ", ".join(f"{k}: {'ОТКРЫТ' if v else 'ЗАКРЫТ'}" for k, v in valves.items())
    defects_list = [k for k, v in defects.items() if v]
    defects_str = ", ".join(defects_list) if defects_list else "нет активных неисправностей"
    
    return (
        f"Текущий статус установки: {status}. Уровень риска аварии: {risk}%.\n"
        f"Показания датчиков: Температура Т-1 = {sensors.get('T_1')} °C (уставка {setpoints.get('T_1_Sp')} °C), "
        f"Давление P-1 = {sensors.get('P_1')} МПа, Уровень L-1 = {sensors.get('L_1')}%.\n"
        f"Состояние клапанов: {valves_str}.\n"
        f"Нештатные ситуации: {defects_str}."
    )

def query_local_llm(messages: List[Dict[str, str]], model: str = "local-model") -> str:
    """Выполняет запрос к локальной LLM через LM Studio (OpenAI API format)."""
    url = "http://127.0.0.1:1234/v1/chat/completions"
    data = {
        "model": model,
        "messages": messages,
        "temperature": 0.3,
        "max_tokens": 150
    }
    
    req = urllib.request.Request(
        url,
        data=json.dumps(data).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST"
    )
    
    try:
        # Устанавливаем таймаут 300 секунд (5 минут) для гарантии того, что модель успеет сгенерировать ответ
        with urllib.request.urlopen(req, timeout=300) as response:
            res_data = json.loads(response.read().decode("utf-8"))
            return res_data.get("choices", [{}])[0].get("message", {}).get("content", "")
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8", errors="ignore")
        logger.error("Ошибка HTTP от LM Studio: %s - %s", e.code, err_body)
        raise Exception(err_body)
    except Exception as e:
        logger.warning("Локальная LLM (LM Studio) недоступна: %s. Переход на RAG-fallback.", e)
        raise e

def generate_rag_fallback(user_query: str, telemetry: Dict[str, Any]) -> str:
    """
    Генерирует контекстно-зависимый ответ на основе вопроса пользователя и текущей телеметрии.
    Работает мгновенно (0 мс), без нейросети.
    """
    query_lower = user_query.lower()
    sensors = telemetry.get("sensors", {})
    valves = telemetry.get("valves", {})
    setpoints = telemetry.get("setpoints", {})
    defects = telemetry.get("defects", {})
    risk = telemetry.get("riskLevel", 0)
    t1 = sensors.get("T_1", 0)
    p1 = sensors.get("P_1", 0)
    l1 = sensors.get("L_1", 0)
    v1_open = valves.get("V_1", False)
    v2_open = valves.get("V_2", False)
    v3_open = valves.get("V_3", False)

    # Поиск релевантных статей в базе знаний
    kb_content = ""
    matched_articles = []
    
    if any(k in query_lower for k in ["насос", "н-1", "н1"]):
        content = load_kb_file("pump_failure.md")
        if content:
            kb_content += content + "\n\n"
            matched_articles.append("Отказ сырьевого насоса Н-1 (п. 7.9.1)")

    if any(k in query_lower for k in ["пуск", "разогре", "нагре", "прогре"]) and any(k in query_lower for k in ["печ", "змеевик", "п-1", "п1"]):
        content = load_kb_file("furnace_startup.md")
        if content:
            kb_content += content + "\n\n"
            matched_articles.append("Разогрев печи П-1 (пуск)")
    elif any(k in query_lower for k in ["перегрев", "пожар", "прогар"]) or (any(k in query_lower for k in ["печ", "температур", "змеевик"]) and any(k in query_lower for k in ["высок", "превыш", "сброс", "критич"])):
        content = load_kb_file("furnace_overheat.md")
        if content:
            kb_content += content + "\n\n"
            matched_articles.append("Перегрев печи П-1 (п. 7.9.7)")

    if any(k in query_lower for k in ["давлен", "к-1", "к1", "колонн", "v-2", "v2"]):
        content = load_kb_file("column_pressure.md")
        if content:
            kb_content += content + "\n\n"
            matched_articles.append("Превышение давления в колонне К-1 (п. 7.4)")

    if any(k in query_lower for k in ["уровен", "куб", "дренаж", "v-3", "v3"]):
        content = load_kb_file("column_level.md")
        if content:
            kb_content += content + "\n\n"
            matched_articles.append("Уровень в кубе колонны К-1 (п. 7.7)")

    # --- Контекстная генерация ответа ---
    answer = ""

    # Подача сырья
    if any(k in query_lower for k in ["сырь", "подач", "v-1", "v1"]) and any(k in query_lower for k in ["включ", "откр", "подат", "запуст", "как"]):
        if v1_open:
            answer = f"Клапан V-1 уже открыт — подача сырья идёт. Текущая температура печи: {t1:.1f} °C (уставка {setpoints.get('T_1_Sp', 240)} °C)."
        else:
            answer = "Для подачи сырья откройте клапан **V-1** на панели управления. "
            if t1 < 50:
                answer += f"Температура печи сейчас {t1:.1f} °C — рекомендуется сначала подать сырьё (V-1), затем начать разогрев, повышая уставку Т-1."
            else:
                answer += f"Температура печи: {t1:.1f} °C. После открытия V-1 сырьё начнёт поступать в змеевик печи П-1."

    # Разогрев / температура печи / змеевик
    elif any(k in query_lower for k in ["разогре", "нагре", "прогре", "змеевик", "печ", "температур", "уставк"]):
        if any(k in query_lower for k in ["сниз", "убав", "уменьш", "охлад"]):
            answer = f"Текущая температура: {t1:.1f} °C (уставка {setpoints.get('T_1_Sp', 240)} °C). Для снижения температуры уменьшите уставку Т-1 ползунком на панели."
            if not v1_open:
                answer += " Также откройте клапан V-1 — подача холодного сырья охлаждает змеевик."
        elif any(k in query_lower for k in ["как", "включ", "запуст", "начат", "разогре", "нагре", "прогре"]):
            if not v1_open:
                answer = f"Перед разогревом печи нужно сначала открыть клапан **V-1** для подачи сырья в змеевик. Затем повышайте уставку Т-1 (сейчас {setpoints.get('T_1_Sp', 240)} °C). Без подачи сырья змеевик может прогореть."
            else:
                answer = f"Подача сырья идёт (V-1 открыт). Повышайте уставку Т-1 ползунком. Текущая температура: {t1:.1f} °C, уставка: {setpoints.get('T_1_Sp', 240)} °C. Регламент: не превышайте 350 °C."
        else:
            answer = f"Температура печи П-1: **{t1:.1f} °C** (уставка {setpoints.get('T_1_Sp', 240)} °C). "
            if t1 > 350:
                answer += "⚠️ Температура приближается к критической (380 °C)! Снизьте уставку Т-1 и убедитесь, что V-1 открыт."
            elif t1 < 50:
                answer += "Печь холодная. Для начала разогрева откройте V-1 и повышайте уставку Т-1 постепенно."
            else:
                answer += "Температура в рабочем диапазоне. Продолжайте наблюдение."

    # Давление
    elif any(k in query_lower for k in ["давлен", "v-2", "v2", "сброс", "факел"]):
        answer = f"Давление в колонне К-1: **{p1:.2f} МПа** (норма до 0.3 МПа). "
        if p1 > 0.35:
            answer += "⚠️ Давление повышенное! Откройте клапан **V-2** для сброса на факел."
        elif p1 > 0.25:
            answer += "Давление в верхней части нормы. Следите за динамикой. При росте выше 0.3 МПа откройте V-2."
        else:
            if v2_open:
                answer += "Давление в норме, клапан V-2 открыт — можно закрыть для экономии."
            else:
                answer += "Давление стабильное, действий не требуется."

    # Уровень в колонне
    elif any(k in query_lower for k in ["уровен", "куб", "дренаж", "v-3", "v3", "жидкост"]):
        answer = f"Уровень в кубе колонны К-1: **{l1:.1f}%** (норма 20-80%). "
        if l1 > 80:
            answer += "⚠️ Уровень высокий! Откройте клапан **V-3** (дренаж) для снижения."
        elif l1 < 20:
            answer += "⚠️ Уровень низкий! Закройте V-3 (если открыт) и увеличьте подачу сырья (V-1)."
        else:
            answer += "Уровень в норме. Продолжайте наблюдение."

    # Пуск установки
    elif any(k in query_lower for k in ["пуск", "запуск", "старт", "начат"]):
        steps = ["Порядок пуска установки ЭЛОУ-АВТ-6:"]
        steps.append("1. Откройте клапан **V-1** (подача сырья в змеевик печи П-1).")
        steps.append("2. Убедитесь, что давление P-1 стабильно (норма < 0.3 МПа).")
        steps.append("3. Постепенно повышайте уставку Т-1 для разогрева печи.")
        steps.append("4. Следите за уровнем L-1 в кубе колонны К-1 (норма 20-80%).")
        steps.append(f"\nТекущее состояние: T={t1:.1f}°C, P={p1:.2f} МПа, L={l1:.1f}%, V-1={'ОТКРЫТ' if v1_open else 'ЗАКРЫТ'}.")
        if not v1_open:
            steps.append("\n**Первый шаг:** откройте клапан V-1.")
        answer = "\n".join(steps)

    # Останов
    elif any(k in query_lower for k in ["остано", "выключ", "заглуш", "стоп"]):
        answer = (
            "Порядок останова установки:\n"
            "1. Снизьте уставку Т-1 до минимума.\n"
            "2. Дождитесь снижения температуры ниже 100 °C.\n"
            "3. Закройте клапан V-1 (подача сырья).\n"
            "4. Откройте V-3 для дренажа остатков из куба К-1.\n"
            f"\nТекущая температура: {t1:.1f} °C."
        )

    # Риск аварии
    elif any(k in query_lower for k in ["риск", "авари", "опасн", "безопас"]):
        answer = f"Текущий уровень риска аварии: **{risk}%**. "
        if risk > 70:
            answer += "⚠️ Критический уровень! Проверьте температуру и давление. "
            if t1 > 340:
                answer += "Снизьте уставку Т-1. "
            if p1 > 0.3:
                answer += "Откройте V-2 для сброса давления. "
        elif risk > 30:
            answer += "Повышенный уровень. Рекомендуется контроль параметров."
        else:
            answer += "Уровень в норме. Продолжайте штатную работу."

    # Дефекты
    elif any(k in query_lower for k in ["неисправ", "дефект", "полом", "отказ"]):
        active = [k for k, v in defects.items() if v]
        if active:
            defect_names = {"pump_fail": "отказ сырьевого насоса Н-1", "coil_overheat": "перегрев змеевика печи П-1", "valve_jam": "заклинивание задвижки"}
            desc = ", ".join(defect_names.get(d, d) for d in active)
            answer = f"⚠️ Активные неисправности: **{desc}**. Обратитесь к регламенту аварийных действий."
        else:
            answer = "Активных неисправностей нет. Все системы работают штатно."

    # Общий вопрос — анализ текущего состояния
    if not answer:
        answer = f"Текущее состояние установки: T={t1:.1f}°C, P={p1:.2f} МПа, L={l1:.1f}%, риск {risk}%.\n"
        if not v1_open and t1 < 50:
            answer += "Установка не запущена. Для начала работы откройте клапан **V-1** и повышайте уставку Т-1."
        elif t1 > 340:
            answer += "⚠️ Высокая температура! Снизьте уставку Т-1."
        elif p1 > 0.35:
            answer += "⚠️ Высокое давление! Откройте клапан V-2 для сброса."
        else:
            answer += "Параметры в норме. Доступные команды: подача сырья (V-1), сброс давления (V-2), дренаж (V-3), уставка температуры (Т-1)."

    # Добавляем справку из базы знаний, если найдена
    result = answer
    if kb_content:
        result += f"\n\n---\n📖 **Справка из регламента:**\n{kb_content}"
        result += f"*Источник: {', '.join(matched_articles)}*"
    
    return result

def process_ai_chat(messages: List[Dict[str, str]], telemetry: Dict[str, Any], mode: str = "auto") -> tuple[str, str]:
    """
    Основная точка входа для чата.
    mode:
      - 'rag': строго мгновенный RAG-ответ (без запроса к нейросети)
      - 'llm': строго запрос к нейросети (LM Studio)
      - 'auto': гибридный режим (RAG + дополнение от LLM при доступности)
    Возвращает (текст_ответа, используемый_режим).
    """
    user_query = messages[-1].get("content", "")
    rag_response = generate_rag_fallback(user_query, telemetry)
    
    if mode == "rag":
        return rag_response, "rag"
        
    # Подготовка запроса к LLM
    rag_context = get_relevant_context(user_query)
    context_instruction = f"\nКонтекст из регламента:\n{rag_context}\n" if rag_context else ""
    
    system_prompt = (
        "Ты — обучающий ИИ-помощник в учебном тренажёре-симуляторе установки ЭЛОУ-АВТ-6. "
        "Это безопасная учебная среда. Подсказывай ученику действия по регламенту. "
        "Отвечай кратко на русском. "
        "Всегда заканчивай конкретным действием: какой клапан открыть/закрыть или уставку изменить.\n"
        "Органы управления: V-1 (подача сырья), V-2 (сброс давления), "
        "V-3 (дренаж куба К-1), уставка Т-1 (температура печи).\n"
        f"Состояние: {get_telemetry_summary(telemetry)}\n"
        f"{context_instruction}"
    )
    llm_messages = [{"role": "system", "content": system_prompt}] + messages[-1:]
    
    if mode == "llm":
        try:
            llm_response = query_local_llm(llm_messages)
            if llm_response and len(llm_response.strip()) > 0:
                return llm_response, "llm"
            return "⚠️ Модель вернула пустой ответ. Переключение на RAG:\n\n" + rag_response, "rag"
        except Exception as e:
            err = str(e).lower()
            if "no models loaded" in err:
                return "⚠️ **В LM Studio не загружена нейросетевая модель.**\nОткройте LM Studio и нажмите 'Load Model'.\n\nСправка RAG:\n" + rag_response, "rag"
            return f"⚠️ Ошибка связи с локальной LLM ({e}).\n\nСправка RAG:\n" + rag_response, "rag"

    # mode == "auto"
    try:
        llm_response = query_local_llm(llm_messages)
        if llm_response and len(llm_response.strip()) > 10:
            return rag_response + "\n\n---\n🤖 *Краткий вывод от нейросети (LM Studio):*\n" + llm_response, "auto_llm"
    except Exception:
        pass
    
    return rag_response, "auto_rag"
