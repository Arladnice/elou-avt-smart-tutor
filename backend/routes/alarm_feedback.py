"""
Роутер обратной связи для алармов ИИ (GAP-6: Обратная связь в замкнутом контуре).
Записывает оценку работы аларма инструктором в журнал аудита ИБ.
"""

from fastapi import APIRouter, HTTPException, status
from backend.models.schemas import AlarmFeedbackRequest
from backend.utils.security import log_audit_event

router = APIRouter(prefix="/api", tags=["Alarm Feedback"])

@router.post("/alarm-feedback")
async def process_alarm_feedback(req: AlarmFeedbackRequest):
    """
    Принимает фидбек инструктора по аларму ИИ ('confirmed' или 'false_alarm')
    и скрепляет событие хэшем целостности в журнале аудита ИБ.
    """
    try:
        feedback_type_ru = "Подтвержден" if req.feedback == "confirmed" else "Ложная тревога"
        details_msg = f"Аларм: {req.alarm_id} | Статус: {feedback_type_ru} | Примечание: {req.details or 'без примечаний'}"
        
        # Фиксация ИБ события в аудит лог
        log_audit_event(
            actor=req.instructor_name,
            action="ALARM_FEEDBACK",
            details=details_msg
        )
        return {
            "status": "success",
            "message": f"Фидбек '{feedback_type_ru}' успешно зафиксирован в журнале аудита.",
            "alarm_id": req.alarm_id
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ошибка сохранения обратной связи: {str(e)}"
        )
