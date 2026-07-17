import logging
from fastapi import APIRouter

from backend.models.schemas import ChatRequest, ChatResponse
from backend.services.ai_chat_service import process_ai_chat

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/ai", tags=["ai_chat"])

@router.post("/chat", response_model=ChatResponse)
def ai_chat_endpoint(req: ChatRequest):
    """
    Эндпоинт для ведения интерактивного диалога с ИИ-ассистентом.
    Принимает историю диалога и текущую телеметрию, возвращает ответ ИИ.
    """
    logger.info("Получен запрос к ИИ-ассистенту")
    messages_dict = [{"role": m.role, "content": m.content} for m in req.messages]
    response_text = process_ai_chat(messages_dict, req.telemetry)
    return ChatResponse(content=response_text)
