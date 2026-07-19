import numpy as np
from ai_core.config import (
    FURNACE_TEMP_WARNING, FURNACE_TEMP_CRITICAL, FURNACE_TEMP_MIN_STARTUP, FURNACE_TEMP_MAX_SHUTDOWN,
    COLUMN_PRES_WARNING, COLUMN_PRES_CRITICAL, COLUMN_PRES_NORMAL_MIN, COLUMN_PRES_NORMAL_MAX,
    COLUMN_LEVEL_HIGH, COLUMN_LEVEL_LOW, COLUMN_LEVEL_BALANCE_MIN, COLUMN_LEVEL_BALANCE_MAX,
    STARTUP_MIN_TIME_SEC
)

# Технологический регламент ЭЛОУ-АВТ (База знаний ИИ-модуля)
TECH_REGULATIONS = {
    "P1_DRY_HEAT": {
        "clause": "Раздел 7.9.1 / п. 7.10.3",
        "title": "Опасность прекращения циркуляции / нагрева всухую",
        "text": f"Прекращение расхода сырья по змеевикам печей П-1 при работающих горелках ведет к критическому росту температуры стенок змеевика, коксованию труб, их прогару и возникновению пожара в топке печи."
    },
    "K1_OVERPRESSURE": {
        "clause": "Раздел 3.5 / п. 7.10.4",
        "title": "Рост давления в колонне К-1",
        "text": f"Рабочее давление верха колонны К-1 должно составлять от {COLUMN_PRES_NORMAL_MIN} до {COLUMN_PRES_NORMAL_MAX} МПа. Рост давления свыше 0.48 МПа приводит к автоматическому отсечению топлива (блокировка ПАЗ). Оператор обязан заблаговременно открыть регулирующий клапан сброса давления V-2 на факельную линию."
    },
    "K1_HIGH_LEVEL": {
        "clause": "Раздел 7.10.4",
        "title": "Высокий уровень в колонне К-1",
        "text": f"Высокий уровень жидкости в колонне К-1 (>{COLUMN_LEVEL_HIGH}%) создает риск уноса жидких фракций с парами в шлемовую линию, что вызывает гидроудары и деформацию конденсаторов-холодильников. Требуется открыть дренаж V-3."
    },
    "K1_LOW_LEVEL": {
        "clause": "Раздел 7.9.1 / п. 7.7.1.14",
        "title": "Низкий уровень в колонне К-1",
        "text": f"Снижение уровня нефтепродукта в колонне К-1 ниже {COLUMN_LEVEL_LOW}% может привести к срыву печных насосов, сухому ходу и повреждению их торцевых уплотнений."
    },
    "ORDER_VIOLATION": {
        "clause": "Раздел 7.7.1.1",
        "title": "Нарушение очередности технологических операций",
        "text": "Строгое выполнение всех операций, строгое соблюдение очередности выполнения операций, плавный и равномерный разогрев аппаратов и трубопроводов при выводе на режим установки..."
    },
    "V3_DRAIN_BLOCK": {
        "clause": "Раздел 7.10.4",
        "title": "Блокировка дренажа колонны К-1",
        "text": "Закрытие дренажного клапана V-3 при работающей подаче сырья V-1 ведет к росту уровня куба колонны К-1, сокращению свободного объема и росту давления."
    },
    "FORCED_HEATING": {
        "clause": "Раздел 7.7.1.1",
        "title": "Форсированный разогрев печи",
        "text": "Быстрое ступенчатое повышение уставки температуры печи П-1 без выдержки времени на стабилизацию параметров вызывает тепловые деформации змеевиков и риск их прогара."
    },
    "UNNECESSARY_VENT": {
        "clause": "Раздел 3.5",
        "title": "Необоснованный сброс газа на факел",
        "text": f"Открытие регулирующего клапана V-2 при нормальном давлении в системе ({COLUMN_PRES_NORMAL_MIN} - {COLUMN_PRES_NORMAL_MAX} МПа) приводит к сдувке ценных углеводородных газов на факел и экономическим потерям установки."
    },
    "PROCESS_NOT_STABILIZED": {
        "clause": "Раздел 7.7.1.1",
        "title": "Недостаточное время выдержки параметров",
        "text": f"Сессия завершена слишком быстро без выдержки стабилизации технологических параметров. Технологические процессы имеют инерционность и требуют времени для стабилизации физических параметров."
    },
    "TEMP_NOT_REACHED": {
        "clause": "Раздел 7.7.1 / п. 7.7.1.14",
        "title": "Температурный режим не достигнут",
        "text": "Фактическая температура печи П-1 не достигла нормального рабочего значения. Нагрев сырья не завершен, сепарация фракций не произошла."
    },
    "LEVEL_UNBALANCED": {
        "clause": "Раздел 7.9.1 / п. 7.7.1.14",
        "title": "Нарушение материального баланса колонны К-1",
        "text": f"Уровень в кубе колонны К-1 вышел за пределы рабочего диапазона. Уровень должен быть в диапазоне {COLUMN_LEVEL_BALANCE_MIN}-{COLUMN_LEVEL_BALANCE_MAX}% при завершении сессии пуска."
    },
    "TEMP_TOO_HIGH": {
        "clause": "Раздел 7.7.1 / п. 7.10.3",
        "title": "Превышение температуры предупреждения (опасность коксования)",
        "text": f"Фактическая температура печи П-1 превысила допустимый порог нормального режима ({FURNACE_TEMP_WARNING}°C). Работа в зоне предупреждения ведет к термическому разложению углеводородов и отложению кокса на трубках змеевика."
    }
}

class ErrorAnalyzer:
    def __init__(self):
        # Эталонные последовательности действий для различных сценариев
        # Действия кодируются как: V1_OPEN, V1_CLOSE, V2_OPEN, V2_CLOSE, V3_OPEN, V3_CLOSE, SP_UP, SP_DOWN, ESD
        self.golden_sequences = {
            "startup": ["V1_OPEN", "SP_UP", "V3_OPEN"],
            "shutdown": ["SP_DOWN", "V2_OPEN", "V1_CLOSE"],
            "column_shutdown": ["SP_DOWN", "V1_CLOSE", "V3_CLOSE"],
            "overpressure_relief": ["V2_OPEN", "SP_DOWN"],
            "recirculation": ["SP_DOWN", "V3_CLOSE", "V2_OPEN"],
            "pump_fail_recovery": ["SP_DOWN"],
            "coil_overheat_recovery": ["SP_DOWN", "V2_OPEN"],
            "valve_jam_recovery": ["ESD"],
            "power_fail_recovery": ["SP_DOWN", "V1_CLOSE"],
            "air_fail_recovery": ["ESD"],
            "steam_fail_recovery": ["SP_DOWN", "V3_OPEN"]
        }

    def evaluate_session(self, actions, scenario_id, defects_triggered=None, final_sensors=None, time_elapsed=0):
        """
        Оценивает сессию оператора.
        actions: список действий, совершенных оператором, например: ["V1_OPEN", "SP_UP", "V3_OPEN"]
        scenario_id: идентификатор сценария ("startup" или "shutdown")
        defects_triggered: список или множество дефектов, активированных во время сессии
        final_sensors: dict с финальными показаниями датчиков {furnaceTemp, columnLevel, columnPres}
        time_elapsed: продолжительность сессии в секундах
        
        Возвращает:
           score: оценка от 0 до 100%
           errors: список обнаруженных ошибок со ссылками на техрегламент
           recommendations: рекомендации по обучению
        """
        # Если действия вообще не совершались оператором (оригинальный список пуст)
        if not actions:
            errors = [{
                "clause": "Общие положения регламента",
                "title": "Регламентные операции не начаты",
                "text": "Вы завершили сессию, не выполнив ни одного управляющего воздействия. Сценарий пуска/останова не был реализован."
            }]
            recommendations = [
                "Ознакомьтесь с чек-листом пуска и выполните необходимые переключения арматуры.",
                "Рекомендуемый адаптивный сценарий: 'Базовые переключения арматуры КТК'"
            ]
            return 0, errors, recommendations

        # Создаем копию списка действий, чтобы не менять оригинальный
        actions = list(actions)
        
        # Нормализуем действия: заменяем V_1, V_2, V_3 на V1, V2, V3 для совместимости с физическим симулятором
        actions = [a.replace("V_1", "V1").replace("V_2", "V2").replace("V_3", "V3") for a in actions]
        
        # Динамический учет начального состояния клапанов для корректного LCS-выравнивания
        if scenario_id == "startup":
            # Если V-1 не закрывали в самом начале, считаем что он был открыт
            if "V1_OPEN" not in actions:
                if "V1_CLOSE" not in actions:
                    actions.insert(0, "V1_OPEN")
                else:
                    idx = actions.index("V1_CLOSE")
                    actions.insert(idx, "V1_OPEN")
            
            # Если V-3 не закрывали, значит он был открыт на протяжении всей сессии
            if "V3_OPEN" not in actions:
                if "V3_CLOSE" not in actions:
                    actions.append("V3_OPEN")

        errors = []
        recommendations = []
        
        # 0. Оценка действий при ликвидации аварийных ситуаций (К5: ИИ-Тьютор)
        if defects_triggered:
            # А. Парирование прогара змеевика печи П-1 (coil_overheat)
            if "coil_overheat" in defects_triggered:
                has_sp_down = "SP_DOWN" in actions
                has_v2_open = "V2_OPEN" in actions
                if has_sp_down and has_v2_open:
                    recommendations.append("Поздравляем! Вы успешно локализовали неисправность 'Прогар змеевика П-1'.")
                    recommendations.append("Вы своевременно снизили температурную нагрузку на печь и открыли сброс давления V-2 в факельную систему, предотвратив взрыв колонны.")
                    return 100, [], recommendations
                else:
                    if not has_sp_down:
                        errors.append({
                            "clause": "Раздел 7.7.1.14 / п. 7.9.1",
                            "title": "Опасность перегрева змеевика",
                            "text": "При прогаре змеевика печи П-1 оператор обязан немедленно снизить уставку температуры горелок печи (SP_DOWN) до минимума для тушения топки."
                        })
                        recommendations.append("При перегреве/прогаре змеевика немедленно снизьте уставку нагрева печи П-1.")
                    if not has_v2_open:
                        errors.append({
                            "clause": "Раздел 3.5 / п. 7.10.4",
                            "title": "Отсутствие сброса давления при аварии",
                            "text": "При угрозе роста давления свыше нормы (0.3 МПа) оператор обязан открыть регулирующий клапан V-2 на факельную линию."
                        })
                        recommendations.append("При росте давления откройте клапан аварийного сброса V-2.")
                    return 40, errors, recommendations

            # Б. Парирование отказа сырьевого насоса (pump_fail)
            if "pump_fail" in defects_triggered:
                has_sp_down = "SP_DOWN" in actions
                if has_sp_down:
                    recommendations.append("Поздравляем! Вы успешно локализовали отказ сырьевого насоса.")
                    recommendations.append("Вы своевременно снизили уставку температуры (SP_DOWN) при прекращении подачи холодного сырья, предотвратив сухой перегрев змеевиков.")
                    return 100, [], recommendations
                else:
                    errors.append(TECH_REGULATIONS["P1_DRY_HEAT"])
                    recommendations.append("При прекращении подачи сырья немедленно снизьте уставку температуры печи П-1, так как нагрев сухого змеевика приведет к его прогару.")
                    return 30, errors, recommendations

            # В. Парирование зависания клапана сброса V-2 (valve_jam)
            if "valve_jam" in defects_triggered:
                has_esd = "ESD" in actions
                if has_esd:
                    recommendations.append("Поздравляем! Вы успешно локализовали неисправность 'Зависание клапана сброса V-2'.")
                    recommendations.append("Вы своевременно задействовали систему аварийного останова (ESD) для предотвращения аварии.")
                    return 100, [], recommendations
                else:
                    errors.append({
                        "clause": "Раздел 3.5 / п. 7.10.4",
                        "title": "Угроза взрыва колонны К-1",
                        "text": "При зависании клапана сброса V-2 в закрытом состоянии оператор обязан немедленно активировать систему ручного аварийного останова (ESD)."
                    })
                    recommendations.append("При зависании клапана V-2 немедленно нажмите красную кнопку аварийного останова ESD.")
                    return 30, errors, recommendations

            # Г. Парирование отказа электроснабжения (power_fail)
            if "power_fail" in defects_triggered:
                has_sp_down = "SP_DOWN" in actions
                has_v1_close = "V1_CLOSE" in actions or "V1_OPEN" not in actions
                if has_sp_down and (has_v1_close or "V2_OPEN" in actions):
                    recommendations.append("Поздравляем! Вы успешно парировали последствия обесточивания установки (power_fail).")
                    recommendations.append("Вы снизили уставку печи П-1 и обезопасили колонну при остановке сырьевых насосов.")
                    return 100, [], recommendations
                else:
                    if not has_sp_down:
                        errors.append({
                            "clause": "Раздел 7.9.1 / п. 7.10.3",
                            "title": "Угроза термоудара при восстановлении питания",
                            "text": "При обесточивании и остановке насосов необходимо немедленно снизить уставку печи П-1 (SP_DOWN)."
                        })
                        recommendations.append("При обесточивании снизьте уставку температуры горелок П-1 до минимума.")
                    if not (has_v1_close or "V2_OPEN" in actions):
                        errors.append({
                            "clause": "Раздел 7.9.1",
                            "title": "Отсутствие герметизации/сброса при обесточивании",
                            "text": "Оператор обязан перекрыть подачу сырья (V1_CLOSE) или открыть сброс на факел (V2_OPEN)."
                        })
                        recommendations.append("При обесточивании перекройте сырьевую задвижку V-1 или откройте сброс V-2.")
                    return 40, errors, recommendations

            # Д. Парирование отказа воздуха КИПиА (air_fail)
            if "air_fail" in defects_triggered:
                has_esd = "ESD" in actions
                if has_esd or "SP_DOWN" in actions:
                    recommendations.append("Поздравляем! Вы успешно отреагировали на отказ воздуха КИПиА (air_fail).")
                    recommendations.append("При потере управления пневмоклапанами вы задействовали блокировки безопасности/аварийный останов.")
                    return 100, [], recommendations
                else:
                    errors.append({
                        "clause": "Раздел 7.10.4 / КИПиА",
                        "title": "Потеря управления арматурой при отказе воздуха КИПиА",
                        "text": "При падении давления воздуха КИПиА клапаны переходят в безопасное состояние, управление теряется. Необходимо снизить тепловую нагрузку (SP_DOWN) или активировать ESD."
                    })
                    recommendations.append("При отказе воздуха КИПиА снизьте нагрев или нажмите кнопку аварийного останова ESD.")
                    return 30, errors, recommendations

            # Е. Парирование срыва подачи отпарного пара (steam_fail)
            if "steam_fail" in defects_triggered:
                has_sp_down = "SP_DOWN" in actions
                has_v3_open = "V3_OPEN" in actions or "V2_OPEN" in actions
                if has_sp_down and has_v3_open:
                    recommendations.append("Поздравляем! Вы успешно локализовали срыв подачи отпарного пара в стриппинг-секции.")
                    recommendations.append("Вы снизили тепловую нагрузку печи и открыли дренаж куба/сброс для предотвращения переполнения и роста давления.")
                    return 100, [], recommendations
                else:
                    if not has_sp_down:
                        errors.append({
                            "clause": "Раздел 7.9.1 / п. 7.7.1.14",
                            "title": "Нарушение отпарки и перегрузка колонны",
                            "text": "При срыве подачи пара необходимо снизить уставку температуры печи П-1 (SP_DOWN) для стабилизации фракционного состава."
                        })
                        recommendations.append("При срыве отпарного пара снизьте уставку нагрева печи П-1.")
                    if not has_v3_open:
                        errors.append({
                            "clause": "Раздел 7.10.4",
                            "title": "Накопление жидкости и рост давления в колонне",
                            "text": "Срыв подачи пара приводит к накоплению неотпаренного остатка и росту давления. Требуется усилить вывод куба (V3_OPEN) или открыть сброс."
                        })
                        recommendations.append("При срыве отпарного пара откройте дренажный клапан V-3 для вывода кубового остатка.")
                    return 40, errors, recommendations
        
        # Получаем эталонную последовательность
        golden = self.golden_sequences.get(scenario_id, [])
        if not golden:
            return 100, [], ["Сценарий успешно выполнен."]

        # 1. Алгоритм сравнения последовательностей (упрощенный аналог DTW для дискретных шагов)
        dtw_score = self._calculate_dtw_alignment(actions, golden)
        
        # 2. Анализ критических ошибок в процессе
        has_dry_heat = False
        has_hot_cut = False
        has_drain_block = False
        has_forced_heating = False
        has_unnecessary_vent = False
        
        # Имитируем парсинг последовательности для выявления нарушений
        # а) Нагрев всухую (увеличили температуру без подачи сырья)
        if "SP_UP" in actions:
            sp_up_idx = actions.index("SP_UP")
            # Если до увеличения уставки не открыли V-1 (подача сырья)
            if "V1_OPEN" not in actions[:sp_up_idx] and "V1_CLOSE" in actions[:sp_up_idx]:
                has_dry_heat = True
                
        # б) Перекрыли сырье на горячую (закрыли V-1 до снижения температуры)
        if "V1_CLOSE" in actions:
            v1_close_idx = actions.index("V1_CLOSE")
            # Если закрыли подачу сырья до того, как снизили уставку печи
            if "SP_DOWN" not in actions[:v1_close_idx]:
                has_hot_cut = True

        # в) Перекрытие дренажа при открытой подаче сырья (если оставили закрытым)
        if "V3_CLOSE" in actions:
            # Находим индексы последнего закрытия и открытия
            last_close = max([i for i, a in enumerate(actions) if a == "V3_CLOSE"])
            last_open = max([i for i, a in enumerate(actions) if a == "V3_OPEN"]) if "V3_OPEN" in actions else -1
            
            # Если закрыли и оставили закрытым (или закрыли после открытия) при открытом входе сырья
            if last_close > last_open:
                if "V1_CLOSE" not in actions[:last_close] and "SP_DOWN" not in actions[:last_close]:
                    has_drain_block = True

        # г) Форсированный нагрев печи (слишком быстрое/частое дергание уставки без стабилизации времени)
        if actions.count("SP_UP") >= 15 and time_elapsed < 60:
            has_forced_heating = True

        # д) Открытие сброса V-2 без необходимости
        if "V2_OPEN" in actions:
            v2_open_idx = actions.index("V2_OPEN")
            # Если открыли V-2 без повышения уставки температуры печи и это не сценарии сброса/останова/рециркуляции
            if (
                scenario_id not in ["shutdown", "overpressure_relief", "recirculation"]
                and "SP_UP" not in actions[:v2_open_idx]
                and not (defects_triggered and ("coil_overheat" in defects_triggered or "valve_jam" in defects_triggered))
            ):
                has_unnecessary_vent = True

        # Собираем ошибки по регламенту
        if has_dry_heat:
            errors.append(TECH_REGULATIONS["P1_DRY_HEAT"])
            recommendations.append("Изучите порядок пуска печи П-1. Перед розжигом/нагревом обязательно убедитесь в наличии устойчивой подачи сырья (клапан V-1 открыт).")
            
        if has_hot_cut:
            errors.append(TECH_REGULATIONS["P1_DRY_HEAT"])
            recommendations.append("Запрещено прекращать подачу сырья (закрывать V-1) при работающих горелках печи П-1. Сначала снизьте уставку нагрева печи.")

        if has_drain_block:
            errors.append(TECH_REGULATIONS["V3_DRAIN_BLOCK"])
            recommendations.append("Контролируйте материальный баланс колонны К-1. Не перекрывайте дренаж V-3 при открытом входе сырья V-1 во избежание роста уровня и давления.")

        if has_forced_heating:
            errors.append(TECH_REGULATIONS["FORCED_HEATING"])
            recommendations.append("Повышайте температуру печи П-1 плавно, ступенями по 5-10°C, с выдержкой времени для стабилизации теплообмена.")

        if has_unnecessary_vent:
            errors.append(TECH_REGULATIONS["UNNECESSARY_VENT"])
            recommendations.append("Держите клапан сброса V-2 закрытым при давлении в пределах нормы (0.1 - 0.3 МПа). Открывайте сброс только при угрозе превышения давления.")

        if dtw_score < 80 and not (has_dry_heat or has_hot_cut or has_drain_block or has_forced_heating or has_unnecessary_vent):
            errors.append(TECH_REGULATIONS["ORDER_VIOLATION"])
            recommendations.append("Обратите внимание на последовательность операций. Несоблюдение очередности ведет к нестабильности техпроцесса.")

        # Расчет итоговой оценки
        # Каждая критическая ошибка сильно снижает балл
        final_score = dtw_score
        if has_dry_heat:
            final_score -= 30
        if has_hot_cut:
            final_score -= 35
        if has_drain_block:
            final_score -= 20
        if has_forced_heating:
            final_score -= 15
        if has_unnecessary_vent:
            final_score -= 10
            
        # ----------------------------------------------------------------
        # 3. Проверка физических параметров на момент завершения (anti-cheat)
        # Выполняется только если данные датчиков переданы (для совместимости с юнит-тестами)
        # ----------------------------------------------------------------
        if final_sensors is not None and not defects_triggered:
            furnace_temp = final_sensors.get("T_1")
            if furnace_temp is None:
                furnace_temp = final_sensors.get("furnaceTemp", 280.0)
                
            column_level = final_sensors.get("L_1")
            if column_level is None:
                column_level = final_sensors.get("columnLevel", 50.0)

            # a) Минимальное время стабилизации
            if scenario_id == "startup" and time_elapsed < STARTUP_MIN_TIME_SEC:
                errors.append(TECH_REGULATIONS["PROCESS_NOT_STABILIZED"])
                recommendations.insert(0, f"Сессия завершена недостаточно быстро. Требуется не менее {STARTUP_MIN_TIME_SEC} секунд для стабилизации теплового режима печи.")
                final_score -= 30

            # b) Температура печи должна достичь рабочего значения при пуске
            if scenario_id == "startup" and furnace_temp < FURNACE_TEMP_MIN_STARTUP:
                errors.append(TECH_REGULATIONS["TEMP_NOT_REACHED"])
                recommendations.insert(0, f"Температура печи завершена на {furnace_temp:.1f}°C, что ниже рабочего минимума {FURNACE_TEMP_MIN_STARTUP}°C. Дождитесь выхода на режим перед завершением.")
                final_score -= 35

            # c) Температура печи должна остыть при останове
            if scenario_id == "shutdown" and furnace_temp > FURNACE_TEMP_MAX_SHUTDOWN:
                errors.append(TECH_REGULATIONS["TEMP_NOT_REACHED"])
                recommendations.insert(0, f"Температура печи ({furnace_temp:.1f}°C) превышает порог безопасного останова ({FURNACE_TEMP_MAX_SHUTDOWN}°C). Дождитесь охлаждения перед завершением.")
                final_score -= 35

            # d) Уровень в колонне должен быть в рабочем диапазоне при завершении пуска
            if scenario_id == "startup" and not (COLUMN_LEVEL_BALANCE_MIN <= column_level <= COLUMN_LEVEL_BALANCE_MAX):
                errors.append(TECH_REGULATIONS["LEVEL_UNBALANCED"])
                recommendations.insert(0, f"Уровень в кубе колонны K-1 ({column_level:.1f}%) вышел за пределы рабочего диапазона {COLUMN_LEVEL_BALANCE_MIN}-{COLUMN_LEVEL_BALANCE_MAX}%. Балансируйте дренажным клапаном V-3.")
                final_score -= 20

            # e) Температура печи не должна превышать порог предупреждения (310°C)
            if furnace_temp > FURNACE_TEMP_WARNING:
                errors.append(TECH_REGULATIONS["TEMP_TOO_HIGH"])
                recommendations.insert(0, f"Температура печи в конце сессии составила {furnace_temp:.1f}°C, что превышает порог нормального режима {FURNACE_TEMP_WARNING}°C. Не допускайте перегрева и риска коксования труб.")
                final_score -= 20

        final_score = max(0, min(100, final_score))
        
        # Адаптивное назначение повторного сценария
        if final_score < 75:
            if has_dry_heat or has_hot_cut or has_forced_heating:
                recommendations.append("Рекомендуемый адаптивный сценарий: 'Регулирование теплового режима печи П-1'")
            elif has_drain_block:
                recommendations.append("Рекомендуемый адаптивный сценарий: 'Регулирование материального баланса колонны К-1'")
            else:
                recommendations.append("Рекомендуемый адаптивный сценарий: 'Базовые переключения арматуры КТК'")
        else:
            recommendations.append("Поздравляем! Квалификация подтверждена. Можете переходить к сложным сценариям с инъекцией дефектов.")

        return int(final_score), errors, recommendations

    def _calculate_dtw_alignment(self, s1, s2):
        """
        Вычисляет сходство последовательности действий оператора (s1) и эталона (s2).
        Использует Longest Common Subsequence (LCS) для оценки правильности порядка действий,
        чтобы не штрафовать за дополнительные парирующие или регулирующие операции.
        """
        n, m = len(s1), len(s2)
        if n == 0 or m == 0:
            return 0 if n != m else 100
            
        # Вычисляем длину LCS (Longest Common Subsequence)
        dp = np.zeros((n + 1, m + 1))
        for i in range(1, n + 1):
            for j in range(1, m + 1):
                if s1[i - 1] == s2[j - 1]:
                    dp[i, j] = dp[i - 1, j - 1] + 1
                else:
                    dp[i, j] = max(dp[i - 1, j], dp[i, j - 1])
                    
        lcs_len = dp[n, m]
        # Процент сходства = отношение длины LCS к длине эталона
        similarity = (lcs_len / m) * 100
        return round(similarity, 1)

if __name__ == "__main__":
    analyzer = ErrorAnalyzer()
    # Тест 1: Идеальная последовательность пуска
    score, errs, recs = analyzer.evaluate_session(["V1_OPEN", "SP_UP", "V3_OPEN"], "startup")
    print(f"Идеальный пуск -> Оценка: {score}%, Ошибок: {len(errs)}")
    
    # Тест 2: Ошибочная последовательность (нагрев всухую)
    score, errs, recs = analyzer.evaluate_session(["SP_UP", "V3_OPEN"], "startup")
    print(f"Ошибочный пуск -> Оценка: {score}%, Ошибок: {len(errs)}")
    for e in errs:
        print(f"  - {e['title']} ({e['clause']}): {e['text'][:60]}...")
