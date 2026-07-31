import json
import time
import logging
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from backend.services.connection_manager import manager
from backend.utils.security import log_audit_event, verify_jwt_token

logger = logging.getLogger(__name__)
router = APIRouter(tags=["websocket"])

INSTRUCTOR_ONLY_COMMANDS = {
    "trigger_defect", "change_speed", "toggle_pause", "save_state",
    "load_state", "configure_webhook", "toggle_mute", "change_mode"
}

@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """
    WebSocket-обработчик реального времени для обмена данными между
    оператором / инструктором и симулятором КТК ЭЛОУ-АВТ.
    """
    query_params = websocket.query_params
    role = query_params.get("role", "operator")
    username = query_params.get("username", "Оператор")
    scenario = query_params.get("scenario", "startup")
    token = query_params.get("token", "")
    session_id = query_params.get("session_id", "default_session")

    # Минимальная валидация роли и токена (К8: RBAC)
    if role not in ["operator", "instructor"]:
        logger.warning("Отклонено WS-подключение с недействительной ролью: %s", role)
        await websocket.accept()
        await websocket.close(code=4003, reason="Недопустимая роль пользователя")
        return

    if not token:
        logger.warning("Отклонено WS-подключение без токена для %s", username)
        await websocket.accept()
        await websocket.close(code=4003, reason="Токен авторизации отсутствует")
        return
        
    try:
        payload = verify_jwt_token(token)
    except Exception:
        payload = None

    if not payload or payload.get("role") != role:
        logger.warning("Отклонено WS-подключение с некорректным токеном для %s", username)
        await websocket.accept()
        await websocket.close(code=4003, reason="Недействительный токен авторизации")
        return
    
    # Из токена берём настоящее имя пользователя, чтобы исключить спуфинг
    username = payload.get("sub", username)

    session = manager.get_session(session_id)
    if role == "operator":
        session.reset_session(username=username, scenario=scenario)
        
    await manager.connect(websocket, session_id, role, username)
    
    # Контроль частоты сообщений (Rate Limiting: макс 30 сообщений в секунду)
    msg_timestamps = []

    try:
        while True:
            # Ожидаем команды управления от клиента
            data = await websocket.receive_text()
            
            # Проверка Rate Limiting
            now = time.time()
            msg_timestamps.append(now)
            msg_timestamps = [t for t in msg_timestamps if now - t <= 1.0]
            if len(msg_timestamps) > 30:
                logger.warning("Превышен лимит частоты сообщений (Rate Limit Exceeded) от %s", username)
                session.add_log("warning", f"ВНИМАНИЕ: Зафиксирована аномальная частота команд от {username} (Rate Limit).")
                log_audit_event(username, "RATE_LIMIT_EXCEEDED", "Превышена частота отправителя WS команд (>30/сек)")
                await websocket.send_json({"type": "error", "message": "Too many requests. Rate limit exceeded."})
                continue

            cmd = json.loads(data)
            action_type = cmd.get("type")

            # Проверка прав доступа к командам инструктора (RBAC)
            if role == "operator" and action_type in INSTRUCTOR_ONLY_COMMANDS:
                logger.warning("Оператор %s попытался выполнить команду инструктора: %s", username, action_type)
                session.add_log("warning", f"ИБ: Оператор '{username}' заблокирован при попытке выполнить команду '{action_type}'.")
                log_audit_event(username, "UNAUTHORIZED_COMMAND", f"Попытка выполнения команды {action_type} без прав")
                await websocket.send_json({"type": "error", "message": "Access denied: Instructor rights required."})
                continue
            
            if role == "operator" and action_type in ["toggle_valve", "change_setpoint", "trigger_esd", "call_dispatcher"]:
                session.operator_reacted_to_critical = True
                
            if action_type == "toggle_valve":
                valve_id = cmd.get("valve_id")
                state = cmd.get("state")
                session.simulator.set_valve(valve_id, state)
                action_name = f"{valve_id}_{'OPEN' if state else 'CLOSE'}"
                session.actions_taken.append(action_name)
                session.add_log("info", f"Оператор переключил клапан {valve_id} в состояние: {'ОТКРЫТ' if state else 'ЗАКРЫТ'}")
                log_audit_event(session.active_operator_name, "VALVE_TOGGLE", f"Клапан {valve_id} -> {state}")
                
            elif action_type == "change_setpoint":
                temp = float(cmd.get("value"))
                old_temp = session.simulator.setpoints["T_1_Sp"]
                session.simulator.set_setpoint("T_1_Sp", temp)
                action_name = "SP_UP" if temp > old_temp else "SP_DOWN"
                session.actions_taken.append(action_name)
                session.add_log("info", f"Оператор изменил уставку температуры П-1 на: {temp}°C")
                log_audit_event(session.active_operator_name, "SETPOINT_CHANGE", f"Уставка T-1 -> {temp}")
                
            elif action_type == "trigger_esd":
                session.simulator.status = "esd"
                session.actions_taken.append("ESD")
                session.add_log("error", "АВАРИЙНЫЙ ОСТАНОВ (ESD) запущен вручную оператором!")
                log_audit_event(session.active_operator_name, "ESD_TRIGGER", "Ручной запуск ESD")
                session.save_completed_session()
                
            elif action_type == "call_dispatcher":
                session.actions_taken.append("CALL_DISPATCHER")
                session.add_log("warning", "Звонок 'Руководитель подразделения / Диспетчер ЦУП: тел. 24-45'")
                log_audit_event(session.active_operator_name, "DISPATCHER_CALL", "Регламентный звонок в Диспетчерскую ЦУП")

            elif action_type == "trigger_defect":
                defect_id = cmd.get("defect_id")
                state = cmd.get("state")
                session.simulator.set_defect(defect_id, state)
                if state:
                    session.defects_triggered.add(defect_id)
                defect_names_ru = {
                    "pump_fail": "Отказ сырьевого насоса",
                    "coil_overheat": "Прогар змеевика печи П-1",
                    "valve_jam": "Заедание клапана сброса V-2",
                    "power_fail": "Отказ электроснабжения",
                    "air_fail": "Отказ воздуха КИПиА",
                    "steam_fail": "Срыв подачи отпарного пара"
                }
                status_ru = "АКТИВИРОВАНА" if state else "ДЕАКТИВИРОВАНА"
                session.add_log("error" if state else "info", f"ИНСТРУКТОР: Неисправность '{defect_names_ru.get(defect_id, defect_id)}' {status_ru}!")
                log_audit_event("INSTRUCTOR", "DEFECT_TRIGGER", f"Неисправность {defect_id} -> {state}")
                
            elif action_type == "change_speed":
                multiplier = float(cmd.get("multiplier", 1.0))
                session.speed_multiplier = multiplier
                session.add_log("info", f"ИНСТРУКТОР: Скорость симуляции изменена на {multiplier}x.")
                log_audit_event("INSTRUCTOR", "CHANGE_SPEED", f"Скорость -> {multiplier}x")

            elif action_type == "toggle_pause":
                paused = bool(cmd.get("paused", False))
                session.is_paused = paused
                session.add_log("warning" if paused else "info", f"ИНСТРУКТОР: Симуляция {'ПРИОСТАНОВЛЕНА' if paused else 'ВОЗОБНОВЛЕНА'}.")
                log_audit_event("INSTRUCTOR", "TOGGLE_PAUSE", f"Пауза -> {paused}")

            elif action_type == "save_state":
                session.snapshot_data = session.simulator.get_snapshot()
                session.add_log("info", "ИНСТРУКТОР: Сделан снимок состояния процесса (снапшот).")
                log_audit_event("INSTRUCTOR", "SAVE_STATE", "Создан снапшот")

            elif action_type == "load_state":
                if session.snapshot_data:
                    session.simulator.load_snapshot(session.snapshot_data)
                    session.add_log("warning", "ИНСТРУКТОР: Произведен откат состояния процесса к снапшоту.")
                    log_audit_event("INSTRUCTOR", "LOAD_STATE", "Откат к снапшоту")
                else:
                    session.add_log("warning", "ИНСТРУКТОР: Невозможно выполнить откат (снапшот не найден).")

            elif action_type == "configure_webhook":
                url = cmd.get("url", "")
                active = bool(cmd.get("active", False))
                session.webhook_url = url
                session.webhook_active = active
                session.add_log("info", f"ИНСТРУКТОР: Настроен внешний вебхук: {url} ({'АКТИВЕН' if active else 'НЕАКТИВЕН'})")
                log_audit_event("INSTRUCTOR", "WEBHOOK_CONFIG", f"URL: {url}, Active: {active}")

            elif action_type == "toggle_mute":
                fingerprint = cmd.get("fingerprint", "")
                state = bool(cmd.get("state", False))
                if state:
                    session.mutes.add(fingerprint)
                    session.add_log("warning", f"ИНСТРУКТОР: Сигнал '{fingerprint}' заглушен (Downtime).")
                else:
                    session.mutes.discard(fingerprint)
                    session.add_log("info", f"ИНСТРУКТОР: Сигнал '{fingerprint}' разблокирован.")
                log_audit_event("INSTRUCTOR", "TOGGLE_MUTE", f"Fingerprint: {fingerprint}, State: {state}")

            elif action_type == "complete":
                if session.simulator.status == "running":
                    session.simulator.status = "success"
                    session.add_log("info", "ТРЕНИРОВКА ЗАВЕРШЕНА: Оператор успешно сдал отчет о сессии.")
                    session.save_completed_session()
                    log_audit_event(session.active_operator_name, "SESSION_COMPLETE", "Оператор успешно завершил тренировку вручную")
                
            elif action_type == "ping":
                await websocket.send_json({"type": "pong", "timestamp": cmd.get("timestamp")})
                continue
                
            elif action_type == "change_mode":
                new_mode = cmd.get("mode", "training")
                session.mode = new_mode
                session.add_log("info", f"Инструктор переключил режим тренажера на: {'ЭКЗАМЕН / АТТЕСТАЦИЯ' if new_mode == 'exam' else 'ОБУЧЕНИЕ'}")
                log_audit_event("INSTRUCTOR", "CHANGE_MODE", f"Переключен режим сессии {session_id} на {new_mode}")
                
            elif action_type == "change_scenario":
                scen_id = cmd.get("scenario_id")
                session.reset_session(scenario=scen_id)
                log_audit_event("INSTRUCTOR" if role == "instructor" else session.active_operator_name, "SCENARIO_CHANGE", f"Смена сценария на {scen_id}")

            elif action_type == "reset":
                session.reset_session()
                log_audit_event(session.active_operator_name, "SESSION_RESET", "Перезапуск тренировочной сессии")
                
            await session.broadcast_state()
            
    except WebSocketDisconnect:
        manager.disconnect(websocket, session_id, role)
        log_audit_event(username, "WS_DISCONNECT", f"WebSocket соединение закрыто для роли {role}")
