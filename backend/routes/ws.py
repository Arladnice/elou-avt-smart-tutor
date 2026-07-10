import json
import logging
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from backend.services.connection_manager import manager
from backend.utils.security import log_audit_event

logger = logging.getLogger(__name__)
router = APIRouter(tags=["websocket"])

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
    
    if role == "operator":
        manager.active_operator_name = username
        manager.active_scenario = scenario
        manager.simulator.reset(scenario)
        manager.actions_taken.clear()
        manager.telemetry_history.clear()
        manager.logs.clear()
        if scenario == "startup":
            manager.add_log("info", "Система инициализирована в холодном состоянии. Требуется пуск.")
            manager.add_log("warning", "ВНИМАНИЕ: Все задвижки перекрыты, печь холодная. Начните технологический пуск.")
        else:
            manager.add_log("info", "Система перезапущена. Режим работы: Стабильный.")
            manager.add_log("info", "Входной клапан V-1 открыт. Подача сырья в норме.")
        
    await manager.connect(websocket, role)
    
    try:
        while True:
            # Ожидаем команды управления от клиента
            data = await websocket.receive_text()
            cmd = json.loads(data)
            action_type = cmd.get("type")
            
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
                old_temp = manager.simulator.setpoints["furnaceTempSp"]
                manager.simulator.set_setpoint("furnaceTempSp", temp)
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
                
            elif action_type == "trigger_defect":
                # Команда поступает от экрана Инструктора
                defect_id = cmd.get("defect_id")
                state = cmd.get("state")
                manager.simulator.set_defect(defect_id, state)
                if state:
                    manager.defects_triggered.add(defect_id)
                defect_names_ru = {
                    "pump_fail": "Отказ сырьевого насоса",
                    "coil_overheat": "Прогар змеевика печи П-1",
                    "valve_jam": "Заедание клапана сброса V-2"
                }
                status_ru = "АКТИВИРОВАНА" if state else "ДЕАКТИВИРОВАНА"
                manager.add_log("error" if state else "info", f"ИНСТРУКТОР: Неисправность '{defect_names_ru.get(defect_id, defect_id)}' {status_ru}!")
                log_audit_event("INSTRUCTOR", "DEFECT_TRIGGER", f"Неисправность {defect_id} -> {state}")
                
            elif action_type == "complete":
                if manager.simulator.status == "running":
                    manager.simulator.status = "success"
                    manager.add_log("info", "ТРЕНИРОВКА ЗАВЕРШЕНА: Оператор успешно сдал отчет о сессии.")
                    manager.save_completed_session()
                    log_audit_event(manager.active_operator_name, "SESSION_COMPLETE", "Оператор успешно завершил тренировку вручную")
                
            elif action_type == "ping":
                await websocket.send_json({"type": "pong", "timestamp": cmd.get("timestamp")})
                continue
                
            elif action_type == "reset":
                manager.simulator.reset(manager.active_scenario)
                manager.actions_taken.clear()
                manager.defects_triggered.clear()
                manager.telemetry_history.clear()
                manager.logs.clear()
                if manager.active_scenario == "startup":
                    manager.add_log("info", "Система инициализирована в холодном состоянии. Требуется пуск.")
                    manager.add_log("warning", "ВНИМАНИЕ: Все задвижки перекрыты, печь холодная. Начните технологический пуск.")
                else:
                    manager.add_log("info", "Система перезапущена. Режим работы: Стабильный.")
                    manager.add_log("info", "Входной клапан V-1 открыт. Подача сырья в норме.")
                log_audit_event(manager.active_operator_name, "SESSION_RESET", "Перезапуск тренировочной сессии")
                
            await manager.broadcast_state()
            
    except WebSocketDisconnect:
        manager.disconnect(websocket, role)
        log_audit_event(username, "WS_DISCONNECT", f"WebSocket соединение закрыто для роли {role}")
