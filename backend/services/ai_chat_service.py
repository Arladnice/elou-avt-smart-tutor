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
        "temperature": 0.3
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
    except Exception as e:
        logger.warning("Локальная LLM (LM Studio) недоступна: %s. Переход на RAG-fallback.", e)
        raise e

def generate_rag_fallback(user_query: str, telemetry: Dict[str, Any]) -> str:
    """Генерирует интеллектуальный ответ на основе правил и локальной базы знаний."""
    query_lower = user_query.lower()
    
    # 1. Поиск релевантных статей в базе знаний
    kb_content = ""
    matched_articles = []
    
    if any(k in query_lower for k in ["насос", "н-1", "н1", "сырь", "подач"]):
        content = load_kb_file("pump_failure.md")
        if content:
            kb_content += content + "\n\n"
            matched_articles.append("Отказ сырьевого насоса Н-1 (п. 7.9.1)")
            
    if any(k in query_lower for k in ["пуск", "разогре", "нагре", "прогре", "включ"]) and any(k in query_lower for k in ["печ", "змеевик", "п-1", "п1"]):
        content = load_kb_file("furnace_startup.md")
        if content:
            kb_content += content + "\n\n"
            matched_articles.append("Разогрев печи П-1 (пуск)")
            
    elif any(k in query_lower for k in ["перегрев", "пожар", "прогар", "авари"]) or (any(k in query_lower for k in ["печ", "пек", "температур", "змеевик"]) and any(k in query_lower for k in ["высок", "превыш", "сброс", "убав", "критич"])):
        content = load_kb_file("furnace_overheat.md")
        if content:
            kb_content += content + "\n\n"
            matched_articles.append("Перегрев печи П-1 (п. 7.9.7)")
            
    if any(k in query_lower for k in ["давлен", "превышен", "к-1", "к1", "колонн", "сброс", "v-2", "v2"]):
        content = load_kb_file("column_pressure.md")
        if content:
            kb_content += content + "\n\n"
            matched_articles.append("Превышение давления в колонне К-1 (п. 7.4)")
            
    if any(k in query_lower for k in ["уровен", "куб", "дренаж", "v-3", "v3", "жидкост"]):
        content = load_kb_file("column_level.md")
        if content:
            kb_content += content + "\n\n"
            matched_articles.append("Уровень в кубе колонны К-1 (п. 7.7)")

    # Сводка телеметрии
    telemetry_summary = get_telemetry_summary(telemetry)
    
    # Сборка финального ответа
    response = "🤖 **ИИ-Ассистент ЭЛОУ-АВТ (Локальный RAG)**\n\n"
    response += f"### 📊 Состояние установки:\n{telemetry_summary}\n\n"
    
    if kb_content:
        response += f"### 📖 Справка из регламента ЭЛОУ-АВТ:\n{kb_content}"
        response += f"*Найдено соответствие в статьях: {', '.join(matched_articles)}*"
    else:
        # Если совпадений в базе знаний нет, даем общие рекомендации по текущему состоянию
        risk = telemetry.get("riskLevel", 0)
        sensors = telemetry.get("sensors", {})
        
        response += "### ⚡ Рекомендации по ведению процесса:\n"
        if risk > 70:
            response += (
                "⚠️ **ВНИМАНИЕ! Высокий риск аварии.**\n"
                "- Если температура Т-1 выше 350 °C, снизьте уставку температуры П-1.\n"
                "- Если давление P-1 выше 0.35 МПа, откройте клапан сброса V-2 на факел.\n"
                "- Если уровень L-1 выходит за пределы 20-80%, отрегулируйте подачу сырья V-1 или дренаж V-3.\n"
            )
        elif sensors.get("T_1", 0) > 310 and not telemetry.get("valves", {}).get("V_1", True):
            response += (
                "⚠️ **Обнаружена опасная ситуация:** печь нагрета, но подача сырья (клапан V-1) перекрыта.\n"
                "Срочно откройте подачу сырья V-1 для охлаждения змеевиков или снизьте нагрев печи!\n"
            )
        else:
            response += (
                "Процесс протекает в рамках технологических нормативов.\n"
                "- Поддерживайте температуру печи в пределах уставки.\n"
                "- Следите за давлением колонны (норма до 0.3 МПа).\n"
                "- Держите уровень куба К-1 в диапазоне 40-60%.\n"
            )
            
        response += "\n*Примечание: Вы можете спросить меня конкретно про 'отказ насоса', 'перегрев печи', 'давление' или 'уровень', чтобы получить цитаты из технологического регламента.*"
        
    return response

def process_ai_chat(messages: List[Dict[str, str]], telemetry: Dict[str, Any]) -> str:
    """
    Основная точка входа для чата.
    Сначала пытается вызвать локальную LLM (LM Studio) с векторным контекстом, при ошибке переходит к RAG.
    """
    user_query = messages[-1].get("content", "")
    
    # 1. Получаем контекст из базы знаний
    rag_context = get_relevant_context(user_query)
    context_instruction = f"\nНайденный контекст из регламента:\n{rag_context}\n" if rag_context else ""
    
    # Формируем системный промпт для LLM
    system_prompt = (
        "Ты — эксперт-технолог и ИИ-ассистент оператора технологической установки ЭЛОУ-АВТ-6.\n"
        "Отвечай строго на русском языке. Будь краток и давай практические инструкции по регламенту.\n"
        f"Текущее состояние установки:\n{get_telemetry_summary(telemetry)}\n"
        f"{context_instruction}"
        "Используй найденный контекст для ответа на вопрос пользователя, если он релевантен."
    )
    
    # Оставляем только последние 2 сообщения, чтобы огромная история чата не вызывала перегрузку контекста и таймаут
    llm_messages = [{"role": "system", "content": system_prompt}] + messages[-2:]
    
    try:
        # Пробуем сделать запрос к LM Studio
        return query_local_llm(llm_messages)
    except Exception:
        # Если LM Studio недоступна, возвращаем fallback-ответ
        return generate_rag_fallback(user_query, telemetry)
