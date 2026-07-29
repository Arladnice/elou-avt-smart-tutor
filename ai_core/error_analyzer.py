"""
Анализатор ошибок оператора ЭЛОУ-АВТ (ИИ-тьютор, Уровень 3).

Оценивает сессию оператора на основе:
  1. LCS-выравнивания последовательности действий с эталоном (sequence_alignment).
  2. Правил обнаружения критических нарушений техрегламента (tech_regulations).
  3. Проверки физических параметров на момент завершения (anti-cheat).
  4. Адаптивного назначения повторных тренировочных сценариев.

Возвращает: (score, errors, recommendations) — кортеж для формирования ScoreCard.
"""

from ai_core.config import (
    FURNACE_TEMP_WARNING, FURNACE_TEMP_MIN_STARTUP, FURNACE_TEMP_MAX_SHUTDOWN,
    COLUMN_LEVEL_BALANCE_MIN, COLUMN_LEVEL_BALANCE_MAX,
    STARTUP_MIN_TIME_SEC
)
from ai_core.tech_regulations import TECH_REGULATIONS
from ai_core.sequence_alignment import calculate_lcs_alignment


class ErrorAnalyzer:
    """Анализирует действия оператора, классифицирует ошибки и формирует адаптивные рекомендации."""

    def _get_golden_sequence(self, scenario_id: str) -> list:
        """Динамически получает эталонную последовательность из центрального реестра."""
        try:
            from backend.services.scenario_manager import get_scenario_by_id
            sc = get_scenario_by_id(scenario_id)
            if sc and "golden_sequence" in sc:
                return sc["golden_sequence"]
        except Exception:
            pass
        return self.golden_sequences.get(scenario_id, [])

    def evaluate_session(self, actions, scenario_id, defects_triggered=None,
                         final_sensors=None, time_elapsed=0):
        """
        Оценивает сессию оператора.

        Параметры:
            actions: список действий оператора, например ['V1_OPEN', 'SP_UP', 'V3_OPEN'].
            scenario_id: идентификатор сценария ('startup', 'shutdown' и т.д.).
            defects_triggered: множество дефектов, активированных инструктором.
            final_sensors: dict финальных показаний датчиков {T_1, P_1, L_1}.
            time_elapsed: продолжительность сессии в секундах.

        Возвращает:
            score (int): оценка от 0 до 100%.
            errors (list): обнаруженные ошибки со ссылками на техрегламент.
            recommendations (list): рекомендации по обучению.
        """
        # Если действия вообще не совершались оператором
        if not actions:
            errors = [{
                "clause": "Общие положения регламента",
                "title": "Регламентные операции не начаты",
                "text": "Вы завершили сессию, не выполнив ни одного управляющего воздействия. "
                        "Сценарий пуска/останова не был реализован."
            }]
            recommendations = [
                "Ознакомьтесь с чек-листом пуска и выполните необходимые переключения арматуры.",
                "Рекомендуемый адаптивный сценарий: 'Пуск установки ЭЛОУ-АВТ'"
            ]
            return 0, errors, recommendations, "startup"

        # Нормализация действий
        actions = list(actions)
        actions = [a.replace("V_1", "V1").replace("V_2", "V2").replace("V_3", "V3") for a in actions]

        # Динамический учет начального состояния клапанов
        actions = self._normalize_startup_actions(actions, scenario_id)

        # Оценка парирования аварий (если были инъецированы дефекты)
        if defects_triggered:
            result = self._evaluate_defect_handling(actions, defects_triggered,
                                                    scenario_id, final_sensors)
            if result is not None:
                return result

        # Основная оценка: LCS + правила + физика
        return self._evaluate_normal_session(actions, scenario_id, defects_triggered,
                                              final_sensors, time_elapsed)

    def _normalize_startup_actions(self, actions, scenario_id):
        """Дополняет список действий неявными операциями при пуске."""
        if scenario_id != "startup":
            return actions

        if "V1_OPEN" not in actions:
            if "V1_CLOSE" not in actions:
                actions.insert(0, "V1_OPEN")
            else:
                # Если V1_CLOSE стоит ДО SP_UP (т.е. специально закрыли подачу перед нагревом),
                # то V1_OPEN не был выполнен до SP_UP. Но если V1_CLOSE после SP_UP, то изначально V1_OPEN был активен.
                v1_close_idx = actions.index("V1_CLOSE")
                sp_up_idx = actions.index("SP_UP") if "SP_UP" in actions else -1
                if sp_up_idx != -1 and v1_close_idx < sp_up_idx:
                    pass
                else:
                    actions.insert(v1_close_idx, "V1_OPEN")

        if "V3_OPEN" not in actions:
            if "V3_CLOSE" not in actions:
                actions.append("V3_OPEN")

        return actions

    def _evaluate_defect_handling(self, actions, defects_triggered,
                                  scenario_id, final_sensors):
        """
        Оценивает действия оператора при ликвидации инъецированных неисправностей.

        Возвращает кортеж (score, errors, recommendations, adaptive_scenario) или None, если дефект
        не соответствует ни одному известному шаблону обработки.
        """
        # Прогар змеевика печи П-1
        if "coil_overheat" in defects_triggered:
            has_sp_down = "SP_DOWN" in actions
            has_v2_open = "V2_OPEN" in actions
            if has_sp_down and has_v2_open:
                return 100, [], [
                    "Поздравляем! Вы успешно локализовали неисправность 'Прогар змеевика П-1'.",
                    "Вы своевременно снизили температурную нагрузку на печь и открыли сброс "
                    "давления V-2 в факельную систему, предотвратив взрыв колонны.",
                    "Рекомендуемый следующий этап траектории: 'Зависание клапана сброса V-2'"
                ], "valve_jam"
            errors, recs = [], []
            if not has_sp_down:
                errors.append({
                    "clause": "Раздел 7.7.1.14 / п. 7.9.1",
                    "title": "Опасность перегрева змеевика",
                    "text": "При прогаре змеевика печи П-1 оператор обязан немедленно снизить "
                            "уставку температуры горелок печи (SP_DOWN) до минимума для тушения топки."
                })
                recs.append("При перегреве/прогаре змеевика немедленно снизьте уставку нагрева печи П-1.")
            if not has_v2_open:
                errors.append({
                    "clause": "Раздел 3.5 / п. 7.10.4",
                    "title": "Отсутствие сброса давления при аварии",
                    "text": "При угрозе роста давления свыше нормы (0.3 МПа) оператор обязан "
                            "открыть регулирующий клапан V-2 на факельную линию."
                })
                recs.append("При росте давления откройте клапан аварийного сброса V-2.")
            recs.append("Рекомендуемый адаптивный сценарий дообучения: 'Аварийный останов печи П-1'")
            return 40, errors, recs, "shutdown"

        # Отказ сырьевого насоса
        if "pump_fail" in defects_triggered:
            if "SP_DOWN" in actions:
                return 100, [], [
                    "Поздравляем! Вы успешно локализовали отказ сырьевого насоса.",
                    "Вы своевременно снизили уставку температуры (SP_DOWN) при прекращении "
                    "подачи холодного сырья, предотвратив сухой перегрев змеевиков.",
                    "Рекомендуемый следующий этап траектории: 'Прогар змеевика печи П-1'"
                ], "coil_overheat"
            return 30, [TECH_REGULATIONS["P1_DRY_HEAT"]], [
                "При прекращении подачи сырья немедленно снизьте уставку температуры "
                "печи П-1, так как нагрев сухого змеевика приведет к его прогару.",
                "Рекомендуемый адаптивный сценарий дообучения: 'Аварийный останов печи П-1'"
            ], "shutdown"

        # Зависание клапана сброса V-2
        if "valve_jam" in defects_triggered:
            if "ESD" in actions:
                return 100, [], [
                    "Поздравляем! Вы успешно локализовали неисправность 'Зависание клапана сброса V-2'.",
                    "Вы своевременно задействовали систему аварийного останова (ESD) для "
                    "предотвращения аварии.",
                    "Рекомендуемый следующий этап траектории: 'Отказ электроснабжения'"
                ], "power_fail"
            return 30, [{
                "clause": "Раздел 3.5 / п. 7.10.4",
                "title": "Угроза взрыва колонны К-1",
                "text": "При зависании клапана сброса V-2 в закрытом состоянии оператор обязан "
                        "немедленно активировать систему ручного аварийного останова (ESD)."
            }], [
                "При зависании клапана V-2 немедленно нажмите красную кнопку аварийного останова ESD.",
                "Рекомендуемый адаптивный сценарий дообучения: 'Ликвидация роста давления'"
            ], "overpressure_relief"

        # Отказ электроснабжения
        if "power_fail" in defects_triggered:
            has_sp_down = "SP_DOWN" in actions or "power_fail" in defects_triggered
            has_v1_close = "V1_CLOSE" in actions or "V1_OPEN" not in actions
            if has_sp_down and (has_v1_close or "V2_OPEN" in actions):
                return 100, [], [
                    "Поздравляем! Вы успешно парировали последствия обесточивания установки (power_fail).",
                    "Вы перекрыли подачу сырья V-1 при остановке сырьевых насосов и обезопасили колонну.",
                    "Рекомендуемый следующий этап траектории: 'Отказ воздуха КИПиА'"
                ], "air_fail"
            errors, recs = [], []
            if not (has_v1_close or "V2_OPEN" in actions):
                errors.append({
                    "clause": "Раздел 7.9.1",
                    "title": "Отсутствие герметизации/сброса при обесточивании",
                    "text": "Оператор обязан перекрыть подачу сырья (V1_CLOSE) или открыть "
                            "сброс на факел (V2_OPEN)."
                })
                recs.append("При обесточивании перекройте сырьевую задвижку V-1 или откройте сброс V-2.")
            recs.append("Рекомендуемый адаптивный сценарий дообучения: 'Аварийный останов печи П-1'")
            return 40, errors, recs, "shutdown"

        # Отказ воздуха КИПиА
        if "air_fail" in defects_triggered:
            has_esd = "ESD" in actions
            limit_temp = 240.0 if scenario_id == "startup" else 245.0
            has_sp_down = "SP_DOWN" in actions or (
                final_sensors and final_sensors.get("T_1", 999) <= limit_temp
                and final_sensors.get("T_1_Sp", 999) < limit_temp
            )
            if has_esd or has_sp_down:
                return 100, [], [
                    "Поздравляем! Вы успешно отреагировали на отказ воздуха КИПиА (air_fail).",
                    "При потере управления пневмоклапанами вы снизили нагрев печи / "
                    "задействовали блокировку ПАЗ (ESD).",
                    "Рекомендуемый следующий этап траектории: 'Срыв подачи отпарного пара'"
                ], "steam_fail"
            return 30, [{
                "clause": "Раздел 7.10.4 / КИПиА",
                "title": "Потеря управления арматурой при отказе воздуха КИПиА",
                "text": "При падении давления воздуха КИПиА клапаны переходят в безопасное "
                        "состояние (закрыты), управление теряется. Для предотвращения прогара "
                        "змеевика необходимо снизить уставку нагрева печи (SP_DOWN) или "
                        "активировать ESD."
            }], [
                "При отказе воздуха КИПиА немедленно снизьте уставку нагрева Т-1 ниже "
                "допустимой или нажмите кнопку ПАЗ (ESD).",
                "Рекомендуемый адаптивный сценарий дообучения: 'Аварийный останов печи П-1'"
            ], "shutdown"

        # Срыв подачи отпарного пара
        if "steam_fail" in defects_triggered:
            has_v3_open = "V3_OPEN" in actions or "V2_OPEN" in actions
            if has_v3_open:
                return 100, [], [
                    "Поздравляем! Вы успешно локализовали срыв подачи отпарного пара в стриппинг-секции.",
                    "Вы открыли дренаж куба V-3 / сброс V-2 для предотвращения переполнения "
                    "и роста давления.",
                    "Квалификационная траектория успешно завершена! Вы готовы к итоговому экзамену."
                ], "startup"
            return 40, [{
                "clause": "Раздел 7.10.4",
                "title": "Накопление жидкости и рост давления в колонне",
                "text": "Срыв подачи пара приводит к накоплению неотпаренного остатка и росту "
                        "давления. Требуется усилить вывод куба (V3_OPEN) или открыть сброс (V2_OPEN)."
            }], [
                "При срыве отпарного пара откройте дренажный клапан V-3 для вывода кубового "
                "остатка или сброс V-2."
            ], "overpressure_relief"

        return None

    def _evaluate_normal_session(self, actions, scenario_id, defects_triggered,
                                  final_sensors, time_elapsed):
        """Оценивает штатную сессию без инъецированных дефектов."""
        golden = self._get_golden_sequence(scenario_id)
        if not golden:
            return 100, [], ["Сценарий успешно выполнен."]

        # 1. LCS-выравнивание последовательности
        dtw_score = calculate_lcs_alignment(actions, golden)

        # 2. Обнаружение критических нарушений
        errors, recommendations = [], []
        violations = self._detect_violations(actions, scenario_id, defects_triggered, time_elapsed)

        for key, detected in violations.items():
            if detected and key in TECH_REGULATIONS:
                errors.append(TECH_REGULATIONS[key])

        # Рекомендации по каждому нарушению
        self._add_violation_recommendations(violations, recommendations)

        if dtw_score < 80 and not any(violations.values()):
            errors.append(TECH_REGULATIONS["ORDER_VIOLATION"])
            recommendations.append(
                "Обратите внимание на последовательность операций. "
                "Несоблюдение очередности ведет к нестабильности техпроцесса."
            )

        # 3. Расчёт итоговой оценки с штрафами
        final_score = dtw_score
        penalty_map = {
            "P1_DRY_HEAT": 30,
            "HOT_CUT": 35,
            "V3_DRAIN_BLOCK": 20,
            "FORCED_HEATING": 15,
            "UNNECESSARY_VENT": 10,
        }
        for key, penalty in penalty_map.items():
            if violations.get(key, False):
                final_score -= penalty

        # 4. Проверка физических параметров (anti-cheat)
        if final_sensors is not None and not defects_triggered:
            final_score = self._apply_physical_checks(
                final_score, final_sensors, scenario_id, time_elapsed,
                errors, recommendations
            )

        final_score = max(0, min(100, final_score))

        # 5. Адаптивное назначение повторного сценария
        recommended_scenario_id = self._add_adaptive_scenario(
            final_score, violations, recommendations, scenario_id
        )

        return int(final_score), errors, recommendations, recommended_scenario_id

    def _detect_violations(self, actions, scenario_id, defects_triggered, time_elapsed):
        """Обнаруживает нарушения техрегламента в последовательности действий."""
        violations = {
            "P1_DRY_HEAT": False,
            "HOT_CUT": False,
            "V3_DRAIN_BLOCK": False,
            "FORCED_HEATING": False,
            "UNNECESSARY_VENT": False,
        }

        # а) Нагрев всухую
        if "SP_UP" in actions:
            sp_up_idx = actions.index("SP_UP")
            if "V1_OPEN" not in actions[:sp_up_idx] and "V1_CLOSE" in actions[:sp_up_idx]:
                violations["P1_DRY_HEAT"] = True

        # б) Перекрыли сырье на горячую
        if "V1_CLOSE" in actions:
            v1_close_idx = actions.index("V1_CLOSE")
            if "SP_DOWN" not in actions[:v1_close_idx]:
                violations["HOT_CUT"] = True

        # в) Перекрытие дренажа при открытой подаче
        if "V3_CLOSE" in actions:
            last_close = max(i for i, a in enumerate(actions) if a == "V3_CLOSE")
            last_open = max(
                (i for i, a in enumerate(actions) if a == "V3_OPEN"), default=-1
            )
            if last_close > last_open:
                if "V1_CLOSE" not in actions[:last_close] and "SP_DOWN" not in actions[:last_close]:
                    violations["V3_DRAIN_BLOCK"] = True

        # г) Форсированный нагрев
        if actions.count("SP_UP") >= 15 and time_elapsed < 60:
            violations["FORCED_HEATING"] = True

        # д) Необоснованный сброс V-2
        if "V2_OPEN" in actions:
            v2_open_idx = actions.index("V2_OPEN")
            if (
                scenario_id not in ["shutdown", "overpressure_relief", "recirculation"]
                and "SP_UP" not in actions[:v2_open_idx]
                and not (defects_triggered and (
                    "coil_overheat" in defects_triggered or "valve_jam" in defects_triggered
                ))
            ):
                violations["UNNECESSARY_VENT"] = True

        return violations

    @staticmethod
    def _add_violation_recommendations(violations, recommendations):
        """Добавляет рекомендации для каждого обнаруженного нарушения."""
        msg_map = {
            "P1_DRY_HEAT": "Изучите порядок пуска печи П-1. Перед розжигом/нагревом обязательно "
                           "убедитесь в наличии устойчивой подачи сырья (клапан V-1 открыт).",
            "HOT_CUT": "Запрещено прекращать подачу сырья (закрывать V-1) при работающих горелках "
                       "печи П-1. Сначала снизьте уставку нагрева печи.",
            "V3_DRAIN_BLOCK": "Контролируйте материальный баланс колонны К-1. Не перекрывайте дренаж "
                              "V-3 при открытом входе сырья V-1 во избежание роста уровня и давления.",
            "FORCED_HEATING": "Повышайте температуру печи П-1 плавно, ступенями по 5-10°C, с выдержкой "
                              "времени для стабилизации теплообмена.",
            "UNNECESSARY_VENT": "Держите клапан сброса V-2 закрытым при давлении в пределах нормы "
                                "(0.1 - 0.3 МПа). Открывайте сброс только при угрозе превышения давления.",
        }
        for key, detected in violations.items():
            if detected and key in msg_map:
                recommendations.append(msg_map[key])

    def _apply_physical_checks(self, score, sensors, scenario_id,
                                time_elapsed, errors, recommendations):
        """Проверяет физические параметры на момент завершения сессии (anti-cheat)."""
        furnace_temp = sensors.get("T_1")
        if furnace_temp is None:
            furnace_temp = sensors.get("furnaceTemp", 280.0)

        column_level = sensors.get("L_1")
        if column_level is None:
            column_level = sensors.get("columnLevel", 50.0)

        if scenario_id == "startup" and time_elapsed < STARTUP_MIN_TIME_SEC:
            errors.append(TECH_REGULATIONS["PROCESS_NOT_STABILIZED"])
            recommendations.insert(
                0, f"Сессия завершена недостаточно быстро. Требуется не менее "
                   f"{STARTUP_MIN_TIME_SEC} секунд для стабилизации теплового режима печи."
            )
            score -= 30

        if scenario_id == "startup" and furnace_temp < FURNACE_TEMP_MIN_STARTUP:
            errors.append(TECH_REGULATIONS["TEMP_NOT_REACHED"])
            recommendations.insert(
                0, f"Температура печи завершена на {furnace_temp:.1f}°C, что ниже рабочего "
                   f"минимума {FURNACE_TEMP_MIN_STARTUP}°C. Дождитесь выхода на режим перед завершением."
            )
            score -= 35

        if scenario_id == "shutdown" and furnace_temp > FURNACE_TEMP_MAX_SHUTDOWN:
            errors.append(TECH_REGULATIONS["TEMP_NOT_REACHED"])
            recommendations.insert(
                0, f"Температура печи ({furnace_temp:.1f}°C) превышает порог безопасного останова "
                   f"({FURNACE_TEMP_MAX_SHUTDOWN}°C). Дождитесь охлаждения перед завершением."
            )
            score -= 35

        if scenario_id == "startup" and not (COLUMN_LEVEL_BALANCE_MIN <= column_level <= COLUMN_LEVEL_BALANCE_MAX):
            errors.append(TECH_REGULATIONS["LEVEL_UNBALANCED"])
            recommendations.insert(
                0, f"Уровень в кубе колонны K-1 ({column_level:.1f}%) вышел за пределы рабочего "
                   f"диапазона {COLUMN_LEVEL_BALANCE_MIN}-{COLUMN_LEVEL_BALANCE_MAX}%. "
                   "Балансируйте дренажным клапаном V-3."
            )
            score -= 20

        if furnace_temp > FURNACE_TEMP_WARNING:
            errors.append(TECH_REGULATIONS["TEMP_TOO_HIGH"])
            recommendations.insert(
                0, f"Температура печи в конце сессии составила {furnace_temp:.1f}°C, "
                   f"что превышает порог нормального режима {FURNACE_TEMP_WARNING}°C. "
                   "Не допускайте перегрева и риска коксования труб."
            )
            score -= 20

        return score

    # Маппинг ID сценариев на их человекочитаемые названия (из InstructorDashboard)
    SCENARIO_NAMES = {
        "startup": "Пуск установки ЭЛОУ-АВТ",
        "shutdown": "Аварийный останов печи П-1",
        "column_shutdown": "Останов колонны К-1",
        "overpressure_relief": "Ликвидация роста давления",
        "recirculation": "Перевод на рециркуляцию",
        "pump_fail": "Отказ сырьевого насоса Н-1",
        "coil_overheat": "Прогар змеевика печи П-1",
        "valve_jam": "Зависание клапана сброса V-2",
        "power_fail": "Отказ электроснабжения (power_fail)",
        "air_fail": "Отказ воздуха КИПиА (air_fail)",
        "steam_fail": "Срыв подачи отпарного пара (steam_fail)",
    }

    # Последовательная траектория обучения при успешном прохождении
    PROGRESSION_MAP = {
        "startup": "shutdown",
        "shutdown": "column_shutdown",
        "column_shutdown": "overpressure_relief",
        "overpressure_relief": "recirculation",
        "recirculation": "pump_fail",
        "pump_fail": "coil_overheat",
        "coil_overheat": "valve_jam",
        "valve_jam": "power_fail",
        "power_fail": "air_fail",
        "air_fail": "steam_fail",
        "steam_fail": "startup",
    }

    @staticmethod
    def _add_adaptive_scenario(score, violations, recommendations, scenario_id):
        """
        Назначает персональный адаптивный тренировочный сценарий на основе ошибок и прогрессии.
        """
        if score < 75:
            # Приоритет 1: Нарушения теплового режима печи
            if violations.get("P1_DRY_HEAT") or violations.get("HOT_CUT") or violations.get("FORCED_HEATING"):
                recommended_scenario_id = "shutdown"
            # Приоритет 2: Нарушения материального баланса колонны
            elif violations.get("V3_DRAIN_BLOCK"):
                recommended_scenario_id = "overpressure_relief"
            # Приоритет 3: Общие ошибки — повторить текущий сценарий
            else:
                if scenario_id in ("overpressure_relief", "recirculation"):
                    recommended_scenario_id = "startup"
                else:
                    recommended_scenario_id = scenario_id

            scenario_name = ErrorAnalyzer.SCENARIO_NAMES.get(
                recommended_scenario_id, recommended_scenario_id
            )
            recommendations.append(
                f"Рекомендуемый адаптивный сценарий дообучения: '{scenario_name}'"
            )
        else:
            recommended_scenario_id = ErrorAnalyzer.PROGRESSION_MAP.get(scenario_id, "shutdown")
            scenario_name = ErrorAnalyzer.SCENARIO_NAMES.get(
                recommended_scenario_id, recommended_scenario_id
            )
            recommendations.append(
                f"Квалификация подтверждена! Рекомендуемый следующий этап траектории: '{scenario_name}'"
            )
        return recommended_scenario_id


if __name__ == "__main__":
    analyzer = ErrorAnalyzer()
    # Тест 1: Идеальная последовательность пуска
    score, errs, recs, rec_id = analyzer.evaluate_session(["V1_OPEN", "SP_UP", "V3_OPEN"], "startup")
    print(f"Идеальный пуск -> Оценка: {score}%, Ошибок: {len(errs)}, Рек. сценарий: {rec_id}")

    # Тест 2: Ошибочная последовательность (нагрев всухую)
    score, errs, recs, rec_id = analyzer.evaluate_session(["SP_UP", "V3_OPEN"], "startup")
    print(f"Ошибочный пуск -> Оценка: {score}%, Ошибок: {len(errs)}, Рек. сценарий: {rec_id}")
    for e in errs:
        print(f"  - {e['title']} ({e['clause']}): {e['text'][:60]}...")
