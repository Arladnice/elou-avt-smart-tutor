import asyncio
from backend.services.connection_manager import manager
from ai_core.config import (
    FURNACE_TEMP_WARNING, COLUMN_PRES_WARNING, COLUMN_LEVEL_HIGH, COLUMN_LEVEL_LOW,
    SESSION_MAX_TIME_SEC
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
                manager.add_log("info", f"ТРЕНИРОВКА ЗАВЕРШЕНА: Достигнут лимит времени сессии ({SESSION_MAX_TIME_SEC // 60} минут).")
                manager.save_completed_session()
            
            # Проверяем нештатные ситуации
            temp = manager.simulator.sensors["T_1"]
            pres = manager.simulator.sensors["P_1"]
            level = manager.simulator.sensors["L_1"]
            
            # Формируем автоматические предупреждения по техрегламенту
            if temp > FURNACE_TEMP_WARNING:
                manager.add_log("warning", f"Предупреждение: Температура печи П-1 ({temp:.1f}°C) выше нормы ({FURNACE_TEMP_WARNING}°C). Опасность коксования труб!")
            if pres > COLUMN_PRES_WARNING:
                manager.add_log("warning", f"Предупреждение: Давление в колонне К-1 ({pres:.3f} МПа) приближается к предельному! Откройте клапан сброса V_2.")
            if level > COLUMN_LEVEL_HIGH:
                manager.add_log("warning", f"Предупреждение: Уровень куба К-1 ({level:.1f}%) выше нормы! Откройте дренаж V_3.")
            elif level < COLUMN_LEVEL_LOW:
                manager.add_log("warning", f"Предупреждение: Уровень куба К-1 ({level:.1f}%) опасно низок! Риск срыва печных насосов.")
                
            # Если произошел аварийный останов (ПАЗ) или авария
            if new_status == "accident":
                manager.add_log("error", f"АВАРИЯ: {manager.simulator.accident_reason}")
                manager.save_completed_session()
            elif old_status == "running" and new_status == "esd":
                manager.add_log("error", "БЛОКИРОВКА ПАЗ: Система переведена в безопасный режим.")
                manager.save_completed_session()
                
            await manager.broadcast_state()
            
        sleep_time = max(0.01, 1.0 / manager.speed_multiplier)
        await asyncio.sleep(sleep_time)
