import asyncio
import json
import time
import logging
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from elou_tutor.services.connection_manager import (
    manager, SessionAccessDenied, SessionCapacityError
)
from elou_tutor.domain.process_limits import (
    FURNACE_TEMP_MAX_LIMIT,
    FURNACE_TEMP_MIN_LIMIT,
    FURNACE_TEMP_WARNING,
)
from elou_tutor.services.net import is_webhook_url_allowed
from elou_tutor.api.security import verify_jwt_token
from elou_tutor.db.audit import log_audit_event_async

logger = logging.getLogger(__name__)
router = APIRouter(tags=["websocket"])

INSTRUCTOR_ONLY_COMMANDS = {
    "trigger_defect", "change_speed", "toggle_pause", "save_state",
    "load_state", "configure_webhook", "toggle_mute", "change_mode"
}

DEFECT_NAMES_RU = {
    "pump_fail": "Отказ сырьевого насоса",
    "coil_overheat": "Прогар змеевика печи П-1",
    "valve_jam": "Заедание клапана сброса V-2",
    "power_fail": "Отказ электроснабжения",
    "air_fail": "Отказ воздуха КИПиА",
    "steam_fail": "Срыв подачи отпарного пара",
    "elou_desalt_fail": "Нарушение электрообессоливания ЭЛОУ",
    "vt_vacuum_loss": "Срыв вакуума вакуумного блока ВТ",
    "k2_pump_fail": "Отказ насосов откачки К-2 Н-4/Н-32",
}


async def dispatch_command(session, cmd: dict, action_type: str, role: str,
                           username: str, websocket: WebSocket) -> bool:
    """
    Исполняет одну управляющую команду.

    Возвращает True, если после команды нужно разослать обновлённое состояние.
    Некорректные параметры команды поднимают ValueError/TypeError/KeyError —
    вызывающий код превращает их в сообщение об ошибке, не разрывая соединение.
    """
    if role == "operator" and action_type in (
        "toggle_valve", "toggle_pump", "change_setpoint", "change_feed_rate", "trigger_esd", "call_dispatcher",
        "call_duty_engineer", "toggle_interlock_bypass",
    ):
        session.operator_reacted_to_critical = True

    if action_type == "toggle_valve":
        valve_id = cmd.get("valve_id")
        state = bool(cmd.get("state"))
        is_unsafe_feed_cut = (
            valve_id == "V_1"
            and not state
            and session.active_scenario == "startup"
            and session.simulator.valves.get("V_1", False)
            and session.simulator.pumps.get("N_20", False)
            and not session.simulator.defects.get("pump_fail", False)
            and not session.simulator.defects.get("power_fail", False)
        )
        session.simulator.set_valve(valve_id, state)
        session.record_action(f"{valve_id}_{'OPEN' if state else 'CLOSE'}")
        if is_unsafe_feed_cut:
            session.record_action("PUMP_RUNNING_CUT")
            session.add_log(
                "error",
                "КРИТИЧЕСКОЕ НАРУШЕНИЕ: закрытие V-1 при работающем насосе Н-20. Экзамен не сдан.",
                severity="CRITICAL",
            )
        session.add_log("info", f"Оператор переключил клапан {valve_id} в состояние: {'ОТКРЫТ' if state else 'ЗАКРЫТ'}")
        await log_audit_event_async(session.active_operator_name, "VALVE_TOGGLE", f"Клапан {valve_id} -> {state}")

    elif action_type == "toggle_pump":
        pump_id = str(cmd.get("pump_id", ""))
        if pump_id not in session.simulator.pumps:
            raise ValueError(f"неизвестный насос: {pump_id}")
        state = bool(cmd.get("state"))
        session.simulator.set_pump(pump_id, state)
        actual_state = session.simulator.pumps[pump_id]
        session.record_action(f"{pump_id}_{'START' if actual_state else 'STOP'}")
        session.add_log(
            "info",
            f"Оператор {'пустил' if actual_state else 'остановил'} насос {pump_id.replace('_', '-')}",
        )
        await log_audit_event_async(
            session.active_operator_name,
            "PUMP_TOGGLE",
            f"Насос {pump_id} -> {actual_state}",
        )

    elif action_type == "change_setpoint":
        temp = float(cmd["value"])
        setpoint_name = str(cmd.get("name", "T_1_Sp"))
        if setpoint_name not in {"T_1_Sp", "T_3_Sp"}:
            raise ValueError(f"неизвестная уставка: {setpoint_name}")
        if not (FURNACE_TEMP_MIN_LIMIT <= temp <= FURNACE_TEMP_MAX_LIMIT):
            raise ValueError(
                f"уставка {temp} вне диапазона шкалы КИПиА "
                f"{FURNACE_TEMP_MIN_LIMIT}..{FURNACE_TEMP_MAX_LIMIT} °C"
            )
        old_temp = session.simulator.setpoints[setpoint_name]
        session.simulator.set_setpoint(setpoint_name, temp)
        action_prefix = "SP3" if setpoint_name == "T_3_Sp" else "SP"
        session.record_action(f"{action_prefix}_{'UP' if temp > old_temp else 'DOWN'}")
        if temp > FURNACE_TEMP_WARNING:
            session.record_action("SETPOINT_OVERLIMIT")
        furnace = "П-1" if setpoint_name == "T_1_Sp" else "П-3"
        session.add_log("info", f"Оператор изменил уставку температуры {furnace} на: {temp}°C")
        await log_audit_event_async(session.active_operator_name, "SETPOINT_CHANGE", f"Уставка {setpoint_name} -> {temp}")

    elif action_type == "change_feed_rate":
        value = float(cmd["value"])
        if not 0.0 <= value <= 100.0:
            raise ValueError("уставка расхода должна быть в диапазоне 0..100%")
        old_value = session.simulator.setpoints["F_in_Sp"]
        session.simulator.set_setpoint("F_in_Sp", value)
        session.record_action(f"FEED_{'UP' if value > old_value else 'DOWN'}")
        session.add_log("info", f"Оператор изменил расход сырья на {value:.0f}%")
        await log_audit_event_async(session.active_operator_name, "FEED_RATE_CHANGE", f"Расход -> {value}%")

    elif action_type == "trigger_esd":
        session.simulator.status = "esd"
        session.record_action("ESD")
        session.add_log("error", "АВАРИЙНЫЙ ОСТАНОВ (ESD) запущен вручную оператором!")
        await log_audit_event_async(session.active_operator_name, "ESD_TRIGGER", "Ручной запуск ESD")
        await asyncio.to_thread(session.save_completed_session)

    elif action_type == "call_dispatcher":
        session.record_action("CALL_DISPATCHER")
        session.add_log("warning", "Звонок 'Руководитель подразделения / Диспетчер ЦУП: тел. 24-45'")
        await log_audit_event_async(session.active_operator_name, "DISPATCHER_CALL", "Регламентный звонок в Диспетчерскую ЦУП")

    elif action_type == "call_duty_engineer":
        session.interlocks.authorize_operation()
        session.record_action("CALL_DUTY_ENGINEER")
        session.add_log(
            "warning",
            "Связь с дежурным инженером установлена. Разрешена одна операция с деблокировкой ПАЗ.",
        )
        await log_audit_event_async(
            session.active_operator_name,
            "DUTY_ENGINEER_CALL",
            "Получено учебное разрешение на одну операцию деблокировки ПАЗ",
        )

    elif action_type == "toggle_interlock_bypass":
        tag = str(cmd.get("tag", ""))
        state = bool(cmd.get("state", False))
        try:
            session.interlocks.set_bypass(tag, state)
        except PermissionError:
            await websocket.send_json({
                "type": "error",
                "message": "Перед включением или снятием деблокировки позвоните дежурному инженеру.",
            })
            return False
        session.record_action(f"INTERLOCK_{tag}_{'BYPASS_ON' if state else 'BYPASS_OFF'}")
        session.add_log(
            "error" if state else "warning",
            f"Деблокировка {tag}: {'ВКЛЮЧЕНА' if state else 'СНЯТА'}.",
            severity="CRITICAL" if state else "WARNING",
        )
        await log_audit_event_async(
            session.active_operator_name,
            "INTERLOCK_BYPASS",
            f"{tag} -> {state}",
        )

    elif action_type == "trigger_defect":
        defect_id = cmd.get("defect_id")
        state = bool(cmd.get("state"))
        session.simulator.set_defect(defect_id, state)
        if state:
            session.defects_triggered.add(defect_id)
        status_ru = "АКТИВИРОВАНА" if state else "ДЕАКТИВИРОВАНА"
        session.add_log("error" if state else "info", f"ИНСТРУКТОР: Неисправность '{DEFECT_NAMES_RU.get(defect_id, defect_id)}' {status_ru}!")
        await log_audit_event_async(username, "DEFECT_TRIGGER", f"Неисправность {defect_id} -> {state}")

    elif action_type == "change_speed":
        multiplier = float(cmd.get("multiplier", 1.0))
        session.speed_multiplier = multiplier
        session.add_log("info", f"ИНСТРУКТОР: Скорость симуляции изменена на {multiplier}x.")
        await log_audit_event_async(username, "CHANGE_SPEED", f"Скорость -> {multiplier}x")

    elif action_type == "toggle_pause":
        paused = bool(cmd.get("paused", False))
        session.is_paused = paused
        session.add_log("warning" if paused else "info", f"ИНСТРУКТОР: Симуляция {'ПРИОСТАНОВЛЕНА' if paused else 'ВОЗОБНОВЛЕНА'}.")
        await log_audit_event_async(username, "TOGGLE_PAUSE", f"Пауза -> {paused}")

    elif action_type == "save_state":
        session.snapshot_data = session.simulator.get_snapshot()
        session.add_log("info", "ИНСТРУКТОР: Сделан снимок состояния процесса (снапшот).")
        await log_audit_event_async(username, "SAVE_STATE", "Создан снапшот")

    elif action_type == "load_state":
        if session.snapshot_data:
            session.simulator.load_snapshot(session.snapshot_data)
            session.add_log("warning", "ИНСТРУКТОР: Произведен откат состояния процесса к снапшоту.")
            await log_audit_event_async(username, "LOAD_STATE", "Откат к снапшоту")
        else:
            session.add_log("warning", "ИНСТРУКТОР: Невозможно выполнить откат (снапшот не найден).")

    elif action_type == "configure_webhook":
        url = cmd.get("url", "")
        active = bool(cmd.get("active", False))
        if active and not is_webhook_url_allowed(url):
            session.add_log("warning", f"ИБ: Адрес вебхука '{url}' отклонён — разрешены только публичные http(s)-адреса.")
            await log_audit_event_async(username, "WEBHOOK_REJECTED", f"Отклонён небезопасный адрес вебхука: {url}")
            await websocket.send_json({
                "type": "error",
                "message": "Webhook URL rejected: only public http(s) endpoints are allowed."
            })
            return False
        session.webhook_url = url
        session.webhook_active = active
        session.add_log("info", f"ИНСТРУКТОР: Настроен внешний вебхук: {url} ({'АКТИВЕН' if active else 'НЕАКТИВЕН'})")
        await log_audit_event_async(username, "WEBHOOK_CONFIG", f"URL: {url}, Active: {active}")

    elif action_type == "toggle_mute":
        fingerprint = cmd.get("fingerprint", "")
        state = bool(cmd.get("state", False))
        if state:
            session.mutes.add(fingerprint)
            session.add_log("warning", f"ИНСТРУКТОР: Сигнал '{fingerprint}' заглушен (Downtime).")
        else:
            session.mutes.discard(fingerprint)
            session.add_log("info", f"ИНСТРУКТОР: Сигнал '{fingerprint}' разблокирован.")
        await log_audit_event_async(username, "TOGGLE_MUTE", f"Fingerprint: {fingerprint}, State: {state}")

    elif action_type == "complete":
        if session.simulator.status == "running":
            session.simulator.status = "success"
            session.add_log("info", "ТРЕНИРОВКА ЗАВЕРШЕНА: Оператор успешно сдал отчет о сессии.")
            await asyncio.to_thread(session.save_completed_session)
            await log_audit_event_async(session.active_operator_name, "SESSION_COMPLETE", "Оператор успешно завершил тренировку вручную")

    elif action_type == "ping":
        await websocket.send_json({"type": "pong", "timestamp": cmd.get("timestamp")})
        return False

    elif action_type == "change_mode":
        new_mode = cmd.get("mode", "training")
        session.mode = new_mode
        session.add_log("info", f"Инструктор переключил режим тренажера на: {'ЭКЗАМЕН / АТТЕСТАЦИЯ' if new_mode == 'exam' else 'ОБУЧЕНИЕ'}")
        await log_audit_event_async(username, "CHANGE_MODE", f"Переключен режим сессии {session.session_id} на {new_mode}")

    elif action_type == "change_scenario":
        scen_id = cmd.get("scenario_id")
        session.reset_session(scenario=scen_id)
        await log_audit_event_async(username, "SCENARIO_CHANGE", f"Смена сценария на {scen_id}")

    elif action_type == "reset":
        session.reset_session()
        await log_audit_event_async(session.active_operator_name, "SESSION_RESET", "Перезапуск тренировочной сессии")

    return True


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

    try:
        session = manager.claim_session(session_id, role, username)
    except SessionAccessDenied:
        logger.warning("Оператор %s попытался войти в чужую сессию %s", username, session_id)
        await log_audit_event_async(username, "SESSION_ACCESS_DENIED", f"Попытка входа в чужую сессию {session_id}")
        await websocket.accept()
        await websocket.close(code=4003, reason="Сессия занята другим оператором")
        return
    except SessionCapacityError:
        logger.error("Отклонено подключение %s: достигнут предел числа сессий", username)
        await websocket.accept()
        await websocket.close(code=4003, reason="Достигнут предел числа учебных сессий")
        return

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
                await log_audit_event_async(username, "RATE_LIMIT_EXCEEDED", "Превышена частота отправителя WS команд (>30/сек)")
                await websocket.send_json({"type": "error", "message": "Too many requests. Rate limit exceeded."})
                continue

            try:
                cmd = json.loads(data)
            except json.JSONDecodeError:
                logger.warning("Получена некорректная JSON-команда от %s", username)
                await websocket.send_json({"type": "error", "message": "Malformed JSON command."})
                continue

            if not isinstance(cmd, dict):
                await websocket.send_json({"type": "error", "message": "Command must be a JSON object."})
                continue

            action_type = cmd.get("type")

            # Проверка прав доступа к командам инструктора (RBAC)
            if role == "operator" and action_type in INSTRUCTOR_ONLY_COMMANDS:
                logger.warning("Оператор %s попытался выполнить команду инструктора: %s", username, action_type)
                session.add_log("warning", f"ИБ: Оператор '{username}' заблокирован при попытке выполнить команду '{action_type}'.")
                await log_audit_event_async(username, "UNAUTHORIZED_COMMAND", f"Попытка выполнения команды {action_type} без прав")
                await websocket.send_json({"type": "error", "message": "Access denied: Instructor rights required."})
                continue

            try:
                should_broadcast = await dispatch_command(
                    session, cmd, action_type, role, username, websocket
                )
            except (ValueError, TypeError, KeyError) as e:
                logger.warning("Некорректные параметры команды %s от %s: %s", action_type, username, e)
                await websocket.send_json({
                    "type": "error",
                    "message": f"Invalid parameters for command '{action_type}'."
                })
                continue

            if should_broadcast:
                await session.broadcast_state()

    except WebSocketDisconnect:
        await log_audit_event_async(username, "WS_DISCONNECT", f"WebSocket соединение закрыто для роли {role}")
    except Exception:
        logger.exception("Непредвиденная ошибка WS-соединения %s (роль %s)", username, role)
    finally:
        # Освобождаем сокет и сессию при любом исходе, иначе в менеджере
        # накапливаются сессии-призраки с загруженной моделью внутри
        manager.disconnect(websocket, session_id, role)
