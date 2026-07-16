import asyncio
import time
from backend.services.connection_manager import manager
from ai_core.config import (
    FURNACE_TEMP_WARNING, COLUMN_PRES_WARNING, COLUMN_LEVEL_HIGH, COLUMN_LEVEL_LOW,
    SESSION_MAX_TIME_SEC,
    FURNACE_TEMP_CRITICAL_LEVEL, COLUMN_PRES_CRITICAL_LEVEL,
    COLUMN_LEVEL_HIGH_CRITICAL_LEVEL, COLUMN_LEVEL_LOW_CRITICAL_LEVEL,
    ESCALATION_WARNING_DELAY_SEC, ESCALATION_CRITICAL_DELAY_SEC
)

async def simulation_loop():
    """Фоновый цикл симуляции физического процесса (шаг с учетом скорости и паузы)."""
    while True:
        if (
            manager.simulator.status == "running" 
            and len(manager.operator_sockets) > 0 
            and not manager.is_paused
        ):
            # Шаг физики симулятора
            old_status = manager.simulator.status
            manager.simulator.step()
            
            # Записываем 7-фичевую телеметрию в историю
            sensors = manager.simulator.sensors
            valves  = manager.simulator.valves
            setpts  = manager.simulator.setpoints
            
            manager.telemetry_history.append([
                1.0 if valves["V_1"] else 0.0,
                1.0 if valves["V_2"] else 0.0,
                1.0 if valves["V_3"] else 0.0,
                setpts["T_1_Sp"],
                sensors["T_1"],
                sensors["P_1"],
                sensors["L_1"]
            ])
            if len(manager.telemetry_history) > 30:
                manager.telemetry_history.pop(0)
                
            new_status = manager.simulator.status
            
            # Проверяем тайм-аут сессии (лимит 5 минут / 300 секунд)
            if manager.simulator.time_elapsed >= SESSION_MAX_TIME_SEC:
                manager.simulator.status = "success"
                new_status = "success"
                manager.add_log("info", f"ТРЕНИРОВКА ЗАВЕРШЕНА: Достигнут лимит времени сессии ({SESSION_MAX_TIME_SEC // 60} минут).", severity="INFO", fingerprint="session_timeout")
                manager.save_completed_session()
            
            # Проверяем нештатные ситуации
            temp = manager.simulator.sensors["T_1"]
            pres = manager.simulator.sensors["P_1"]
            level = manager.simulator.sensors["L_1"]
            
            # Формируем автоматические предупреждения по техрегламенту
            if temp > FURNACE_TEMP_WARNING:
                sev = "CRITICAL" if temp > FURNACE_TEMP_CRITICAL_LEVEL else "WARNING"
                manager.add_log("warning" if sev == "WARNING" else "error", f"Предупреждение: Температура печи П-1 ({temp:.1f}°C) выше нормы ({FURNACE_TEMP_WARNING}°C). Опасность коксования труб!", severity=sev, fingerprint="furnace_temp_high")
            if pres > COLUMN_PRES_WARNING:
                sev = "CRITICAL" if pres > COLUMN_PRES_CRITICAL_LEVEL else "WARNING"
                manager.add_log("warning" if sev == "WARNING" else "error", f"Предупреждение: Давление в колонне К-1 ({pres:.3f} МПа) приближается к предельному! Откройте клапан сброса V_2.", severity=sev, fingerprint="column_pres_high")
            if level > COLUMN_LEVEL_HIGH:
                sev = "CRITICAL" if level > COLUMN_LEVEL_HIGH_CRITICAL_LEVEL else "WARNING"
                manager.add_log("warning" if sev == "WARNING" else "error", f"Предупреждение: Уровень куба К-1 ({level:.1f}%) выше нормы! Откройте дренаж V_3.", severity=sev, fingerprint="column_level_high")
            elif level < COLUMN_LEVEL_LOW:
                sev = "CRITICAL" if level < COLUMN_LEVEL_LOW_CRITICAL_LEVEL else "WARNING"
                manager.add_log("warning" if sev == "WARNING" else "error", f"Предупреждение: Уровень куба К-1 ({level:.1f}%) опасно низок! Риск срыва печных насосов.", severity=sev, fingerprint="column_level_low")
                
            # Логика эскалации алертов (К8: Цепочки эскалации)
            is_currently_critical = (
                temp > FURNACE_TEMP_CRITICAL_LEVEL 
                or pres > COLUMN_PRES_CRITICAL_LEVEL 
                or level > COLUMN_LEVEL_HIGH_CRITICAL_LEVEL 
                or level < COLUMN_LEVEL_LOW_CRITICAL_LEVEL
            )
            if is_currently_critical:
                if not manager.critical_alert_active:
                    manager.critical_alert_active = True
                    manager.critical_alert_start_time = time.time()
                    manager.operator_reacted_to_critical = False
                elif not manager.operator_reacted_to_critical:
                    elapsed = time.time() - manager.critical_alert_start_time
                    if elapsed >= ESCALATION_CRITICAL_DELAY_SEC:
                        manager.add_log("error", f"ЭСКАЛАЦИЯ: Оператор не предпринял действий в течение {int(ESCALATION_CRITICAL_DELAY_SEC)} секунд после критического отклонения!", severity="CRITICAL", fingerprint="escalation_alert_60")
                        manager.operator_reacted_to_critical = True # Показать только один раз
                    elif elapsed >= ESCALATION_WARNING_DELAY_SEC:
                        manager.add_log("warning", "ЭСКАЛАЦИЯ: Дежурный оператор не отвечает! Требуется немедленная реакция на критическое отклонение!", severity="WARNING", fingerprint="escalation_alert_30")
            else:
                manager.critical_alert_active = False

            # Если произошел аварийный останов (ПАЗ) или авария
            if new_status == "accident":
                manager.add_log("error", f"АВАРИЯ: {manager.simulator.accident_reason}", severity="CRITICAL", fingerprint="accident")
                manager.save_completed_session()
            elif old_status == "running" and new_status == "esd":
                manager.add_log("error", "БЛОКИРОВКА ПАЗ: Система переведена в безопасный режим.", severity="CRITICAL", fingerprint="esd")
                manager.save_completed_session()
                
            await manager.broadcast_state()
            
        sleep_time = max(0.01, 1.0 / manager.speed_multiplier)
        await asyncio.sleep(sleep_time)
