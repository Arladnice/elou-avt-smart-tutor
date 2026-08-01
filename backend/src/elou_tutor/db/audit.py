"""
Журнал аудита с цепочкой блоков.

Каждая запись включает хэш предыдущей (prev_hash), поэтому удаление строки
обнаруживается так же, как её правка. Слой db: пишет в таблицу audit_logs.
"""

import asyncio
import hmac
import logging
import time

from elou_tutor.db.database import get_db_connection
from elou_tutor.domain.integrity import calculate_integrity_hash, verify_integrity_hash

logger = logging.getLogger(__name__)


def log_audit_event(actor: str, action: str, details: str):
    """
    Записывает событие ИБ в журнал.

    Каждая запись включает хэш предыдущей, поэтому удаление или правка строки
    разрывает цепочку и обнаруживается verify_audit_chain().
    """
    timestamp = time.strftime("%Y-%m-%d %H:%M:%S")
    with get_db_connection() as conn:
        cursor = conn.cursor()
        row = cursor.execute(
            "SELECT integrity_hash FROM audit_logs ORDER BY id DESC LIMIT 1"
        ).fetchone()
        prev_hash = row[0] if row else ""
        h = calculate_integrity_hash(timestamp, actor, action, details, prev_hash)
        cursor.execute(
            "INSERT INTO audit_logs (timestamp, actor, action, details, integrity_hash, prev_hash) "
            "VALUES (?, ?, ?, ?, ?, ?)",
            (timestamp, actor, action, details, h, prev_hash)
        )
        conn.commit()


async def log_audit_event_async(actor: str, action: str, details: str):
    """
    Асинхронная обёртка записи в журнал.

    Обработчик WebSocket и цикл симуляции пишут аудит на каждую команду и на
    каждое событие; синхронная запись в SQLite блокировала бы event loop и
    задерживала рассылку телеметрии всем подключённым клиентам.
    """
    await asyncio.to_thread(log_audit_event, actor, action, details)


def verify_audit_chain():
    """
    Проверяет непрерывность журнала аудита.

    Возвращает (True, None), если цепочка цела, иначе (False, id_записи),
    где id_записи — первая строка, на которой цепочка разошлась.
    Записи, созданные до внедрения цепочки (prev_hash IS NULL), пропускаются.
    """
    with get_db_connection() as conn:
        rows = conn.execute(
            "SELECT id, timestamp, actor, action, details, integrity_hash, prev_hash "
            "FROM audit_logs ORDER BY id"
        ).fetchall()

    expected_prev = None
    for row_id, timestamp, actor, action, details, stored_hash, prev_hash in rows:
        if prev_hash is None:
            # Устаревшая запись без цепочки — проверяем только собственный хэш
            if not verify_integrity_hash(stored_hash, timestamp, actor, action, details):
                return False, row_id
            continue

        if expected_prev is not None and prev_hash != expected_prev:
            return False, row_id

        expected = calculate_integrity_hash(timestamp, actor, action, details, prev_hash)
        if not hmac.compare_digest(stored_hash or "", expected):
            return False, row_id

        expected_prev = stored_hash

    return True, None
