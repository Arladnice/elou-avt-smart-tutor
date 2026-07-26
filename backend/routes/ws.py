import json
import time
import logging
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from backend.services.connection_manager import manager
from backend.utils.security import log_audit_event

logger = logging.getLogger(__name__)
router = APIRouter(tags=["websocket"])

INSTRUCTOR_ONLY_COMMANDS = {
    "trigger_defect", "change_speed", "toggle_pause", "save_state",
    "load_state", "configure_webhook", "toggle_mute"
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

    # Минимальная валидация роли и токена (К8: RBAC)
    if role not in ["operator", "instructor"]:
        logger.warning("Отклонено WS-подключение с недействительной ролью: %s", role)
        await websocket.close(code=4003, reason="Недопустимая роль пользователя")
        return

    # В базовой модели проверяем соответствие токена роли, если токен передан
    if token and not token.startswith(f"jwt-mock-token-for-"):
        logger.warning("Отклонено WS-подключение с некорректным токеном для %s", username)
        await websocket.close(code=4003, reason="Недействительный токен авторизации")
        return
    
    if role == "operator":
        manager.reset_session(username=username, scenario=scenario)
        
    await manager.connect(websocket, role)
    
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
                manager.add_log("warning", f"ВНИМАНИЕ: Зафиксирована аномальная частота команд от {username} (Rate Limit).")
                log_audit_event(username, "RATE_LIMIT_EXCEEDED", "Превышена частота отправителя WS команд (>30/сек)")
                await websocket.send_json({"type": "error", "message": "Too many requests. Rate limit exceeded."})
                continue

            cmd = json.loads(data)
            action_type = cmd.get("type")

            # Проверка прав доступа к командам инструктора (RBAC)
            if role == "operator" and action_type in INSTRUCTOR_ONLY_COMMANDS:
                logger.warning("Оператор %s попытался выполнить команду инструктора: %s", username, action_type)
                manager.add_log("warning", f"ИБ: Оператор '{username}' заблокирован при попытке выполнить команду '{action_type}'.")
                log_audit_event(username, "UNAUTHORIZED_COMMAND", f"Попытка выполнения команды {action_type} без прав")
                await websocket.send_json({"type": "error", "message": "Access denied: Instructor rights required."})
                continue
            
            if role == "operator" and action_type in ["toggle_valve", "change_setpoint", "trigger_esd", "call_dispatcher"]:
                manager.operator_reacted_to_critical = True
                
            if action_type == "toggle_valve":
                valve_id = cmd.get("valve_id")
                state = cmd.get("state")
                manager.simulator.set_valve(valve_id, state)
                action_name = f"{valve_id}_{'OPEN' if state else 'CLOSE'}"
                manager.actions_taken.append(action_name)
                manager.add_log("info", f"Оператор переключил клапан {valve_id} в состояние: {'ОТКРЫТ' if state else 'ЗАКРЫТ'}")
                log_audit_event(manager.active_operator_name, "VALVE_TOGGLE", f"Клапан {valve_id} -> {state}")
                
            elif action_type == "change_setpoint":
                temp = float(cmd.get("value"))
                old_temp = manager.simulator.setpoints["T_1_Sp"]
                manager.simulator.set_setpoint("T_1_Sp", temp)
                action_name = "SP_UP" if temp > old_temp else "SP_DOWN"
                manager.actions_taken.append(action_name)
                manager.add_log("info", f"Оператор изменил уставку температуры П-1 на: {temp}°C")
                log_audit_event(manager.active_operator_name, "SETPOINT_CHANGE", f"Уставка T-1 -> {temp}")
                
            elif action_type == "trigger_esd":
                manager.simulator.status = "esd"
                manager.actions_taken.append("ESD")
                manager.add_log("error", "АВАРИЙНЫЙ ОСТАНОВ (ESD) запущен вручную оператором!")
                log_audit_event(manager.active_operator_name, "ESD_TRIGGER", "Ручной запуск ESD")
                manager.save_completed_session()
                
            elif action_type == "call_dispatcher":
                manager.actions_taken.append("CALL_DISPATCHER")
                manager.add_log("warning", "Звонок 'Руководитель подразделения / Диспетчер ЦУП: тел. 24-45'")
                log_audit_event(manager.active_operator_name, "DISPATCHER_CALL", "Регламентный звонок в Диспетчерскую ЦУП")

            elif action_type == "trigger_defect":
                defect_id = cmd.get("defect_id")
                state = cmd.get("state")
                manager.simulator.set_defect(defect_id, state)
                if state:
                    manager.defects_triggered.add(defect_id)
                defect_names_ru = {
                    "pump_fail": "Отказ сырьевого насоса",
                    "coil_overheat": "Прогар змеевика печи П-1",
                    "valve_jam": "Заедание клапана сброса V-2",
                    "power_fail": "Отказ электроснабжения",
                    "air_fail": "Отказ воздуха КИПиА",
                    "steam_fail": "Срыв подачи отпарного пара"
                }
                status_ru = "АКТИВИРОВАНА" if state else "ДЕАКТИВИРОВАНА"
                manager.add_log("error" if state else "info", f"ИНСТРУКТОР: Неисправность '{defect_names_ru.get(defect_id, defect_id)}' {status_ru}!")
                log_audit_event("INSTRUCTOR", "DEFECT_TRIGGER", f"Неисправность {defect_id} -> {state}")
                
            elif action_type == "change_speed":
                multiplier = float(cmd.get("multiplier", 1.0))
                manager.speed_multiplier = multiplier
                manager.add_log("info", f"ИНСТРУКТОР: Скорость симуляции изменена на {multiplier}x.")
                log_audit_event("INSTRUCTOR", "CHANGE_SPEED", f"Скорость -> {multiplier}x")

            elif action_type == "toggle_pause":
                paused = bool(cmd.get("paused", False))
                manager.is_paused = paused
                manager.add_log("warning" if paused else "info", f"ИНСТРУКТОР: Симуляция {'ПРИОСТАНОВЛЕНА' if paused else 'ВОЗОБНОВЛЕНА'}.")
                log_audit_event("INSTRUCTOR", "TOGGLE_PAUSE", f"Пауза -> {paused}")

            elif action_type == "save_state":
                manager.snapshot_data = manager.simulator.get_snapshot()
                manager.add_log("info", "ИНСТРУКТОР: Сделан снимок состояния процесса (снапшот).")
                log_audit_event("INSTRUCTOR", "SAVE_STATE", "Создан снапшот")

            elif action_type == "load_state":
                if manager.snapshot_data:
                    manager.simulator.load_snapshot(manager.snapshot_data)
                    manager.add_log("warning", "ИНСТРУКТОР: Произведен откат состояния процесса к снапшоту.")
                    log_audit_event("INSTRUCTOR", "LOAD_STATE", "Откат к снапшоту")
                else:
                    manager.add_log("warning", "ИНСТРУКТОР: Невозможно выполнить откат (снапшот не найден).")

            elif action_type == "configure_webhook":
                url = cmd.get("url", "")
                active = bool(cmd.get("active", False))
                manager.webhook_url = url
                manager.webhook_active = active
                manager.add_log("info", f"ИНСТРУКТОР: Настроен внешний вебхук: {url} ({'АКТИВЕН' if active else 'НЕАКТИВЕН'})")
                log_audit_event("INSTRUCTOR", "WEBHOOK_CONFIG", f"URL: {url}, Active: {active}")

            elif action_type == "toggle_mute":
                fingerprint = cmd.get("fingerprint", "")
                state = bool(cmd.get("state", False))
                if state:
                    manager.mutes.add(fingerprint)
                    manager.add_log("warning", f"ИНСТРУКТОР: Сигнал '{fingerprint}' заглушен (Downtime).")
                else:
                    manager.mutes.discard(fingerprint)
                    manager.add_log("info", f"ИНСТРУКТОР: Сигнал '{fingerprint}' разблокирован.")
                log_audit_event("INSTRUCTOR", "TOGGLE_MUTE", f"Fingerprint: {fingerprint}, State: {state}")

            elif action_type == "complete":
                if manager.simulator.status == "running":
                    manager.simulator.status = "success"
                    manager.add_log("info", "ТРЕНИРОВКА ЗАВЕРШЕНА: Оператор успешно сдал отчет о сессии.")
                    manager.save_completed_session()
                    log_audit_event(manager.active_operator_name, "SESSION_COMPLETE", "Оператор успешно завершил тренировку вручную")
                
            elif action_type == "ping":
                await websocket.send_json({"type": "pong", "timestamp": cmd.get("timestamp")})
                continue
                
            elif action_type == "change_scenario":
                scen_id = cmd.get("scenario_id")
                manager.reset_session(scenario=scen_id)
                log_audit_event("INSTRUCTOR" if role == "instructor" else manager.active_operator_name, "SCENARIO_CHANGE", f"Смена сценария на {scen_id}")

            elif action_type == "reset":
                manager.reset_session()
                log_audit_event(manager.active_operator_name, "SESSION_RESET", "Перезапуск тренировочной сессии")
                
            await manager.broadcast_state()
            
    except WebSocketDisconnect:
        manager.disconnect(websocket, role)
        log_audit_event(username, "WS_DISCONNECT", f"WebSocket соединение закрыто для роли {role}")
