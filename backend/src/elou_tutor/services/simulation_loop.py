import asyncio
import logging
from elou_tutor.services.connection_manager import manager
from elou_tutor.domain.process_limits import (
    FURNACE_TEMP_WARNING, COLUMN_PRES_WARNING, COLUMN_LEVEL_HIGH, COLUMN_LEVEL_LOW,
    SESSION_MAX_TIME_SEC, STARTUP_FILLING_TIME_LIMIT_SEC,
    FURNACE_TEMP_CRITICAL_LEVEL, COLUMN_PRES_CRITICAL_LEVEL,
    COLUMN_LEVEL_HIGH_CRITICAL_LEVEL, COLUMN_LEVEL_LOW_CRITICAL_LEVEL,
    ESCALATION_WARNING_DELAY_SEC, ESCALATION_CRITICAL_DELAY_SEC,
    K2_LEVEL_HIGH, K2_LEVEL_HIGH_CRITICAL,
    K2_LEVEL_LOW, K2_LEVEL_LOW_CRITICAL,
    K2_PRESSURE_WARNING, K2_PRESSURE_CRITICAL,
    K2_TEMP_WARNING, K2_TEMP_CRITICAL,
)

logger = logging.getLogger(__name__)


async def simulation_loop():
    """Фоновый цикл симуляции физического процесса для всех активных сессий."""
    while True:
        # Проходим по всем зарегистрированным сессиям
        # Используем list(manager.sessions.values()) чтобы избежать RuntimeError: dictionary changed size during iteration
        for session in list(manager.sessions.values()):
            try:
                await step_session(session)
            except asyncio.CancelledError:
                raise
            except Exception:
                # Сбой одной сессии не должен останавливать симуляцию у остальных
                logger.exception(
                    "Сбой такта симуляции сессии %s; сессия пропущена в этом такте",
                    session.session_id,
                )

        await asyncio.sleep(1.0)


async def step_session(session):
    """
    Выполняет один такт цикла для одной сессии.

    Множитель скорости ускоряет сам техпроцесс: за такт выполняется несколько
    секунд физики, а рассылка состояния остаётся раз в секунду. Уменьшать паузу
    цикла нельзя — это нагружало бы event loop и клиентов пропорционально скорости.
    """
    if session.simulator.status != "running" or session.is_paused:
        return
    if not session.operator_sockets and not session.instructor_sockets:
        return

    substeps = max(1, round(session.speed_multiplier or 1.0))
    for _ in range(substeps):
        if session.simulator.status != "running":
            break
        await _advance_one_second(session)

    await session.broadcast_state()


async def _advance_one_second(session):
    """Одна секунда техпроцесса: физика, телеметрия, алармы, эскалация."""
    # Шаг физики симулятора
    old_status = session.simulator.status
    session.simulator.step()

    # Записываем 7-фичевую телеметрию в историю
    sensors = session.simulator.sensors
    valves = session.simulator.valves
    setpts = session.simulator.setpoints

    session.telemetry_history.append([
        1.0 if valves["V_1"] else 0.0,
        1.0 if valves["V_2"] else 0.0,
        1.0 if valves["V_3"] else 0.0,
        setpts["T_1_Sp"],
        sensors["T_1"],
        sensors["P_1"],
        sensors["L_1"]
    ])
    if len(session.telemetry_history) > 30:
        session.telemetry_history.pop(0)

    new_status = session.simulator.status

    # Проверяем тайм-аут сессии (лимит 5 минут / 300 секунд)
    if session.simulator.time_elapsed >= SESSION_MAX_TIME_SEC:
        session.simulator.status = "success"
        new_status = "success"
        session.add_log("info", f"ТРЕНИРОВКА ЗАВЕРШЕНА: Достигнут лимит времени сессии ({SESSION_MAX_TIME_SEC // 60} минут).", severity="INFO", fingerprint="session_timeout")
        await asyncio.to_thread(session.save_completed_session)

    # Проверяем нештатные ситуации
    temp = session.simulator.sensors["T_1"]
    pres = session.simulator.sensors["P_1"]
    level = session.simulator.sensors["L_1"]
    k2_level = session.simulator.sensors["L_2"]
    k2_pressure = session.simulator.sensors["P_vac"]
    k2_temp = session.simulator.sensors["T_2"]
    startup_k2_prefill = session.simulator.get_state()["startupK2Prefill"]

    # Формируем автоматические предупреждения по техрегламенту
    if temp > FURNACE_TEMP_WARNING:
        sev = "CRITICAL" if temp > FURNACE_TEMP_CRITICAL_LEVEL else "WARNING"
        session.add_log("warning" if sev == "WARNING" else "error", f"Предупреждение: Температура печи П-1 ({temp:.1f}°C) выше нормы ({FURNACE_TEMP_WARNING}°C). Опасность коксования труб!", severity=sev, fingerprint="furnace_temp_high")
    if pres > COLUMN_PRES_WARNING:
        sev = "CRITICAL" if pres > COLUMN_PRES_CRITICAL_LEVEL else "WARNING"
        session.add_log("warning" if sev == "WARNING" else "error", f"Предупреждение: Давление в колонне К-1 ({pres:.3f} МПа) приближается к предельному! Откройте клапан сброса V_2.", severity=sev, fingerprint="column_pres_high")

    is_startup_filling = (session.active_scenario == "startup" and session.simulator.time_elapsed <= STARTUP_FILLING_TIME_LIMIT_SEC)

    if level > COLUMN_LEVEL_HIGH:
        sev = "CRITICAL" if level > COLUMN_LEVEL_HIGH_CRITICAL_LEVEL else "WARNING"
        session.add_log("warning" if sev == "WARNING" else "error", f"Предупреждение: Уровень куба К-1 ({level:.1f}%) выше нормы! Откройте дренаж V_3.", severity=sev, fingerprint="column_level_high")
    elif level < COLUMN_LEVEL_LOW and not is_startup_filling:
        sev = "CRITICAL" if level < COLUMN_LEVEL_LOW_CRITICAL_LEVEL else "WARNING"
        session.add_log("warning" if sev == "WARNING" else "error", f"Предупреждение: Уровень куба К-1 ({level:.1f}%) опасно низок! Риск срыва печных насосов.", severity=sev, fingerprint="column_level_low")

    if k2_level > K2_LEVEL_HIGH:
        sev = "CRITICAL" if k2_level > K2_LEVEL_HIGH_CRITICAL else "WARNING"
        session.add_log("warning" if sev == "WARNING" else "error", f"Предупреждение: Уровень куба К-2 ({k2_level:.1f}%) выше нормы! Проверьте откачку насосами Н-4/Н-32.", severity=sev, fingerprint="k2_level_high")
    elif k2_level < K2_LEVEL_LOW and not startup_k2_prefill:
        sev = "CRITICAL" if k2_level < K2_LEVEL_LOW_CRITICAL else "WARNING"
        session.add_log("warning" if sev == "WARNING" else "error", f"Предупреждение: Уровень куба К-2 ({k2_level:.1f}%) опасно низок! Риск кавитации насосов и обнажения змеевиков.", severity=sev, fingerprint="k2_level_low")

    if k2_pressure > K2_PRESSURE_WARNING:
        sev = "CRITICAL" if k2_pressure >= K2_PRESSURE_CRITICAL else "WARNING"
        session.add_log("warning" if sev == "WARNING" else "error", f"Предупреждение: Остаточное давление в К-2 растёт ({k2_pressure:.3f} МПа). Проверьте эжекторы и подачу пара.", severity=sev, fingerprint="k2_pressure_high")

    if k2_temp > K2_TEMP_WARNING:
        sev = "CRITICAL" if k2_temp >= K2_TEMP_CRITICAL else "WARNING"
        session.add_log("warning" if sev == "WARNING" else "error", f"Предупреждение: Температура куба К-2 ({k2_temp:.1f}°C) выше нормы. Риск коксования и крекинга мазута.", severity=sev, fingerprint="k2_temp_high")

    # Логика эскалации алертов
    is_currently_critical = (
        temp > FURNACE_TEMP_CRITICAL_LEVEL
        or pres > COLUMN_PRES_CRITICAL_LEVEL
        or level > COLUMN_LEVEL_HIGH_CRITICAL_LEVEL
        or (level < COLUMN_LEVEL_LOW_CRITICAL_LEVEL and not is_startup_filling)
        or k2_level > K2_LEVEL_HIGH_CRITICAL
        or (k2_level < K2_LEVEL_LOW_CRITICAL and not startup_k2_prefill)
        or k2_pressure >= K2_PRESSURE_CRITICAL
        or k2_temp >= K2_TEMP_CRITICAL
    )
    if is_currently_critical:
        if not session.critical_alert_active:
            session.critical_alert_active = True
            # Отсчёт идёт по времени техпроцесса, а не по настенным часам:
            # процесс умеет стоять на паузе и идти с множителем скорости.
            # На time.time() пауза дольше минуты давала ложную эскалацию сразу
            # после возобновления, а ускорение сдвигало учебную норму реакции.
            session.critical_alert_start_time = session.simulator.time_elapsed
            session.operator_reacted_to_critical = False
            session.escalation_warning_sent = False
        elif not session.operator_reacted_to_critical:
            elapsed = session.simulator.time_elapsed - session.critical_alert_start_time
            if elapsed >= ESCALATION_CRITICAL_DELAY_SEC:
                session.add_log("error", f"ЭСКАЛАЦИЯ: Оператор не предпринял действий в течение {int(ESCALATION_CRITICAL_DELAY_SEC)} секунд после критического отклонения!", severity="CRITICAL", fingerprint="escalation_alert_60")
                session.operator_reacted_to_critical = True
            elif elapsed >= ESCALATION_WARNING_DELAY_SEC and not session.escalation_warning_sent:
                session.add_log("warning", "ЭСКАЛАЦИЯ: Дежурный оператор не отвечает! Требуется немедленная реакция на критическое отклонение!", severity="WARNING", fingerprint="escalation_alert_30")
                session.escalation_warning_sent = True
    else:
        session.critical_alert_active = False

    if new_status == "accident":
        session.add_log("error", f"АВАРИЯ: {session.simulator.accident_reason}", severity="CRITICAL", fingerprint="accident")
        await asyncio.to_thread(session.save_completed_session)
    elif old_status == "running" and new_status == "esd":
        session.add_log("error", "БЛОКИРОВКА ПАЗ: Система переведена в безопасный режим.", severity="CRITICAL", fingerprint="esd")
        await asyncio.to_thread(session.save_completed_session)
