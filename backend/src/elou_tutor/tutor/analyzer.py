"""
Анализатор ошибок оператора ЭЛОУ-АВТ (ИИ-тьютор, Уровень 3).

Оценивает сессию оператора на основе:
  1. LCS-выравнивания последовательности действий с эталоном (sequence_alignment).
  2. Правил обнаружения критических нарушений техрегламента (tech_regulations).
  3. Проверки физических параметров на момент завершения (anti-cheat).
  4. Адаптивного назначения повторных тренировочных сценариев.

Возвращает: (score, errors, recommendations) — кортеж для формирования ScoreCard.
"""

from elou_tutor.domain.process_limits import (
    FURNACE_TEMP_WARNING, FURNACE_TEMP_MIN_STARTUP, FURNACE_TEMP_MAX_SHUTDOWN,
    COLUMN_LEVEL_BALANCE_MIN, COLUMN_LEVEL_BALANCE_MAX, STARTUP_MIN_TIME_SEC,
    K2_LEVEL_HIGH, K2_PRESSURE_WARNING, K2_TEMP_WARNING,
)
from elou_tutor.domain.regulations import TECH_REGULATIONS
from elou_tutor.simulation.scenarios import get_scenario_by_id
from elou_tutor.tutor.alignment import calculate_lcs_alignment


class ErrorAnalyzer:
    """Анализирует действия оператора, классифицирует ошибки и формирует адаптивные рекомендации."""

    def _get_golden_sequence(self, scenario_id: str) -> list:
        """
        Динамически получает эталонную последовательность из центрального реестра.

        Для неизвестного сценария возвращает пустой список: эталона нет,
        и оценка идёт только по правилам техрегламента.
        """
        sc = get_scenario_by_id(scenario_id)
        if sc and sc.get("golden_sequence"):
            return sc["golden_sequence"]
        return []

    def evaluate_session(self, actions, scenario_id, defects_triggered=None,
                         final_sensors=None, time_elapsed=0, timeline=None):
        """
        Оценивает сессию оператора.

        Параметры:
            actions: список действий оператора, например ['V1_OPEN', 'SP_UP', 'V3_OPEN'].
            scenario_id: идентификатор сценария ('startup', 'shutdown' и т.д.).
            defects_triggered: множество дефектов, активированных инструктором.
            final_sensors: dict финальных показаний датчиков {T_1, P_1, L_1}.
            time_elapsed: продолжительность сессии в секундах.
            timeline: те же действия с отметками времени
                      [{'index': int, 'action': str, 'at_second': int}, ...].
                      Позиции соответствуют actions. Если не передан, ошибки
                      возвращаются без привязки ко времени (at_second = None).

        Возвращает:
            score (int): оценка от 0 до 100%.
            errors (list): обнаруженные ошибки со ссылками на техрегламент.
            recommendations (list): рекомендации по обучению.
            recommended_scenario_id (str): адаптивный сценарий дообучения.
        """
        # Если действия вообще не совершались оператором
        if not actions:
            errors = [self._localize({
                "clause": "Общие положения регламента",
                "title": "Регламентные операции не начаты",
                "text": "Вы завершили сессию, не выполнив ни одного управляющего воздействия. "
                        "Сценарий пуска/останова не был реализован."
            }, at_second=time_elapsed)]
            recommendations = [
                "Ознакомьтесь с чек-листом пуска и выполните необходимые переключения арматуры.",
                "Рекомендуемый адаптивный сценарий: 'Пуск установки ЭЛОУ-АВТ'"
            ]
            return 0, errors, recommendations, "startup"

        # Нормализация действий
        actions = list(actions)
        actions = [a.replace("V_1", "V1").replace("V_2", "V2").replace("V_3", "V3") for a in actions]

        # Отметки времени нормализуем синхронно: анализ вставляет неявные
        # действия, и без этого позиции в двух списках разъехались бы.
        times = self._align_timeline(actions, timeline)

        # Динамический учет начального состояния клапанов
        actions, times = self._normalize_startup_actions(actions, scenario_id, times)

        # Оценка парирования аварий (если были инъецированы дефекты)
        if defects_triggered:
            result = self._evaluate_defect_handling(actions, defects_triggered,
                                                    scenario_id, final_sensors)
            if result is not None:
                score, errors, recs, rec_id = result
                # Ошибки парирования аварий относятся к состоянию на конец сессии
                errors = [self._localize(e, at_second=time_elapsed) for e in errors]
                return score, errors, recs, rec_id

        # Основная оценка: LCS + правила + физика
        return self._evaluate_normal_session(actions, scenario_id, defects_triggered,
                                              final_sensors, time_elapsed, times)

    # Запись сопоставления: момент действия, его позиция и имя в исходном
    # таймлайне оператора. У неявных действий, которые добавляет анализ,
    # источника нет, поэтому все поля пустые.
    _NO_SOURCE = {"at": None, "src": None, "name": None}

    @classmethod
    def _align_timeline(cls, actions, timeline):
        """Возвращает список записей, позиционно соответствующий actions."""
        if not timeline:
            return [dict(cls._NO_SOURCE) for _ in actions]

        marks = [
            {"at": entry.get("at_second"), "src": i, "name": entry.get("action")}
            for i, entry in enumerate(timeline)
        ]
        if len(marks) < len(actions):
            marks += [dict(cls._NO_SOURCE) for _ in range(len(actions) - len(marks))]
        return marks[:len(actions)]

    @staticmethod
    def _localize(regulation: dict, at_second=None, action_index=None, action=None) -> dict:
        """
        Готовит объект нарушения с привязкой ко времени.

        Обязательно копирует правило: словари TECH_REGULATIONS — общие константы
        модуля, и правка на месте протекла бы во все последующие отчёты.
        """
        localized = dict(regulation)
        localized["at_second"] = at_second
        localized["action_index"] = action_index
        localized["action"] = action
        return localized

    def _normalize_startup_actions(self, actions, scenario_id, times=None):
        """
        Дополняет список действий неявными операциями при пуске.

        Вставки дублируются в списке отметок времени (со значением None —
        у неявного действия нет момента выполнения), чтобы позиции совпадали.
        """
        if times is None:
            times = [dict(self._NO_SOURCE) for _ in actions]
        if scenario_id != "startup":
            return actions, times

        if "V1_OPEN" not in actions:
            if "V1_CLOSE" not in actions:
                actions.insert(0, "V1_OPEN")
                times.insert(0, dict(self._NO_SOURCE))
            else:
                # Если V1_CLOSE стоит ДО SP_UP (т.е. специально закрыли подачу перед нагревом),
                # то V1_OPEN не был выполнен до SP_UP. Но если V1_CLOSE после SP_UP, то изначально V1_OPEN был активен.
                v1_close_idx = actions.index("V1_CLOSE")
                sp_up_idx = actions.index("SP_UP") if "SP_UP" in actions else -1
                if sp_up_idx != -1 and v1_close_idx < sp_up_idx:
                    pass
                else:
                    actions.insert(v1_close_idx, "V1_OPEN")
                    times.insert(v1_close_idx, dict(self._NO_SOURCE))

        if "V3_OPEN" not in actions:
            if "V3_CLOSE" not in actions:
                actions.append("V3_OPEN")
                times.append(dict(self._NO_SOURCE))

        return actions, times

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

        # Срыв вакуума в блоке ВТ (отказ пароэжекторной группы)
        if "vt_vacuum_loss" in defects_triggered:
            # Дефект моделирует именно отказ эжекторов: в simulation/model.py
            # vacuum_available = V_VT and not defects["vt_vacuum_loss"], поэтому
            # подача пара вакуум уже не восстановит. Единственное, что защищает
            # мазут от коксования, — снятие тепловой нагрузки либо останов.
            has_esd = "ESD" in actions
            has_sp_down = "SP_DOWN" in actions
            if has_esd or has_sp_down:
                checked_ejectors = "V_VT_OPEN" in actions
                praise = [
                    "Поздравляем! Вы правильно отреагировали на срыв вакуума в блоке ВТ.",
                    "Вы сняли тепловую нагрузку с куба К-2, не дав мазуту закоксоваться "
                    "и подвергнуться крекингу при росте остаточного давления.",
                ]
                if checked_ejectors:
                    praise.append(
                        "Проверка подачи рабочего пара на эжекторы (V-VT) выполнена верно: "
                        "при прекращении подачи пара это восстановило бы вакуум."
                    )
                praise.append("Рекомендуемый следующий этап траектории: 'Отказ насосов откачки К-2'")
                return 100, [], praise, "recirculation"

            return 30, [{
                "clause": "Раздел 7.10.4 / HAZOP: давление в К-2",
                "title": "Коксование мазута при срыве вакуума",
                "text": "При потере вакуума остаточное давление в К-2 растёт от 1,0 к "
                        "1,5 кгс/см², температура куба поднимается, и мазут коксуется с "
                        "крекингом. Оператор обязан снизить уставку нагрева печи (SP_DOWN) "
                        "либо активировать ПАЗ (ESD). Расчётное время на вмешательство — "
                        "не более 20 минут.",
            }], [
                "При срыве вакуума немедленно снизьте тепловую нагрузку печи П-1 или нажмите ESD.",
                "Проверьте подачу рабочего пара на эжекторы ВТ (V-VT) — при прекращении "
                "подачи её восстановление вернёт вакуум.",
                "Рекомендуемый адаптивный сценарий дообучения: 'Срыв вакуума ВТ'",
            ], "vt_vacuum_failure"

        # Отказ насосов откачки куба К-2 (Н-4 / Н-32)
        if "k2_pump_fail" in defects_triggered:
            # Откачка встала, приток из куба К-1 идёт через V-3 (в модели
            # feed_open = V_3 and not power_fail). Единственный способ
            # остановить заполнение куба — перекрыть этот приток.
            has_esd = "ESD" in actions
            has_v3_close = "V3_CLOSE" in actions
            if has_esd or has_v3_close:
                return 100, [], [
                    "Поздравляем! Вы верно отработали отказ насосов откачки куба К-2 Н-4/Н-32.",
                    "Вы прекратили подачу кубового остатка из К-1, не допустив заполнения "
                    "куба К-2 и захлёбывания колонны.",
                    "Квалификационная траектория успешно завершена! Вы готовы к итоговому экзамену.",
                ], "startup"

            return 30, [{
                "clause": "Раздел 7.10.4 / HAZOP: уровень куба К-2",
                "title": "Захлёбывание колонны К-2 при остановленной откачке",
                "text": "При отказе насосов Н-4/Н-32 вывод кубового остатка прекращается, "
                        "и куб К-2 заполняется примерно за 6,7 минуты при открытом V-3. "
                        "Показания уровня запаздывают на 45 секунд, поэтому реагировать надо "
                        "по факту отказа насосов, а не по уровнемеру: закрыть V-3 либо "
                        "активировать ПАЗ (ESD).",
            }], [
                "При отказе насосов откачки К-2 закройте дренаж V-3, прекратив подачу "
                "кубового остатка в переполняющийся куб.",
                "Помните о запаздывании уровнемера К-2 на 45 секунд — уровень уже растёт, "
                "когда прибор ещё показывает норму.",
                "Рекомендуемый адаптивный сценарий дообучения: 'Рециркуляция'",
            ], "recirculation"

        return None

    def _evaluate_normal_session(self, actions, scenario_id, defects_triggered,
                                  final_sensors, time_elapsed, times=None):
        """Оценивает штатную сессию без инъецированных дефектов."""
        if times is None:
            times = [dict(self._NO_SOURCE) for _ in actions]

        golden = self._get_golden_sequence(scenario_id)
        if not golden:
            # Кортеж обязан быть из 4 элементов: вызывающий код распаковывает
            # score, errors, recommendations, recommended_scenario_id
            return 100, [], ["Сценарий успешно выполнен."], scenario_id

        # 1. LCS-выравнивание последовательности
        dtw_score = calculate_lcs_alignment(actions, golden)

        # 2. Обнаружение критических нарушений
        errors, recommendations = [], []
        violations, positions = self._detect_violations(
            actions, scenario_id, defects_triggered, time_elapsed, golden
        )

        for key, detected in violations.items():
            if detected and key in TECH_REGULATIONS:
                idx = positions.get(key)
                mark = times[idx] if idx is not None and idx < len(times) else None
                if mark and mark["src"] is not None:
                    # Наружу отдаём позицию в таймлайне оператора, а не во
                    # внутренней последовательности анализа с её вставками
                    errors.append(self._localize(
                        TECH_REGULATIONS[key],
                        at_second=mark["at"],
                        action_index=mark["src"],
                        action=mark["name"],
                    ))
                else:
                    # Действие неявное либо таймлайн не передан — момент неизвестен.
                    # Ставить сюда время завершения нельзя: это выдумало бы момент,
                    # которого не было.
                    errors.append(self._localize(TECH_REGULATIONS[key]))

        # Рекомендации по каждому нарушению
        self._add_violation_recommendations(violations, recommendations)

        if dtw_score < 80 and not any(violations.values()):
            errors.append(self._localize(TECH_REGULATIONS["ORDER_VIOLATION"], at_second=time_elapsed))
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
            "PUMP_RUNNING_CUT": 100,
            "SETPOINT_OVERLIMIT": 40,
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

    def _detect_violations(self, actions, scenario_id, defects_triggered, time_elapsed, golden=None):
        """
        Обнаруживает нарушения техрегламента в последовательности действий.

        Действие, входящее в эталон сценария, нарушением не считается: иначе
        безупречное прохождение штрафуется за выполнение собственного регламента.

        Возвращает (violations, positions): факт нарушения и позицию действия,
        которое его вызвало — она нужна для локализации ошибки во времени.
        """
        golden = golden or []
        violations = {
            "P1_DRY_HEAT": False,
            "HOT_CUT": False,
            "V3_DRAIN_BLOCK": False,
            "FORCED_HEATING": False,
            "UNNECESSARY_VENT": False,
            "PUMP_RUNNING_CUT": False,
            "SETPOINT_OVERLIMIT": False,
        }
        positions = {}

        if "PUMP_RUNNING_CUT" in actions:
            violations["PUMP_RUNNING_CUT"] = True
            positions["PUMP_RUNNING_CUT"] = actions.index("PUMP_RUNNING_CUT")

        if "SETPOINT_OVERLIMIT" in actions:
            violations["SETPOINT_OVERLIMIT"] = True
            positions["SETPOINT_OVERLIMIT"] = actions.index("SETPOINT_OVERLIMIT")

        # а) Нагрев всухую
        if "SP_UP" in actions:
            sp_up_idx = actions.index("SP_UP")
            if "V1_OPEN" not in actions[:sp_up_idx] and "V1_CLOSE" in actions[:sp_up_idx]:
                violations["P1_DRY_HEAT"] = True
                positions["P1_DRY_HEAT"] = sp_up_idx

        # б) Перекрыли сырье на горячую
        if "V1_CLOSE" in actions:
            v1_close_idx = actions.index("V1_CLOSE")
            if "SP_DOWN" not in actions[:v1_close_idx]:
                violations["HOT_CUT"] = True
                positions["HOT_CUT"] = v1_close_idx

        # в) Перекрытие дренажа при открытой подаче
        if "V3_CLOSE" in actions:
            last_close = max(i for i, a in enumerate(actions) if a == "V3_CLOSE")
            last_open = max(
                (i for i, a in enumerate(actions) if a == "V3_OPEN"), default=-1
            )
            if last_close > last_open:
                if "V1_CLOSE" not in actions[:last_close] and "SP_DOWN" not in actions[:last_close]:
                    violations["V3_DRAIN_BLOCK"] = True
                    positions["V3_DRAIN_BLOCK"] = last_close

        # г) Форсированный нагрев
        if actions.count("SP_UP") >= 15 and time_elapsed < 60:
            violations["FORCED_HEATING"] = True
            # Привязываем к последнему из частых повышений уставки
            positions["FORCED_HEATING"] = max(
                i for i, a in enumerate(actions) if a == "SP_UP"
            )

        # д) Необоснованный сброс V-2
        if "V2_OPEN" in actions and "V2_OPEN" not in golden:
            v2_open_idx = actions.index("V2_OPEN")
            if (
                scenario_id not in ["shutdown", "overpressure_relief", "recirculation"]
                and "SP_UP" not in actions[:v2_open_idx]
                and not (defects_triggered and (
                    "coil_overheat" in defects_triggered or "valve_jam" in defects_triggered
                ))
            ):
                violations["UNNECESSARY_VENT"] = True
                positions["UNNECESSARY_VENT"] = v2_open_idx

        return violations, positions

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
            "PUMP_RUNNING_CUT": "Перед закрытием V-1 остановите насос Н-20 и получите подтверждение "
                                "отсутствия расхода. Работа насоса на закрытую задвижку запрещена.",
            "SETPOINT_OVERLIMIT": "Не задавайте температуру выше 340°C. Повышайте уставку плавно и "
                                  "контролируйте фактическую температуру с допуском ±2°C.",
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
            errors.append(self._localize(TECH_REGULATIONS["PROCESS_NOT_STABILIZED"], at_second=time_elapsed))
            recommendations.insert(
                0, f"Сессия завершена недостаточно быстро. Требуется не менее "
                   f"{STARTUP_MIN_TIME_SEC} секунд для стабилизации теплового режима печи."
            )
            score -= 30

        if scenario_id == "startup" and furnace_temp < FURNACE_TEMP_MIN_STARTUP:
            errors.append(self._localize(TECH_REGULATIONS["TEMP_NOT_REACHED"], at_second=time_elapsed))
            recommendations.insert(
                0, f"Температура печи завершена на {furnace_temp:.1f}°C, что ниже рабочего "
                   f"минимума {FURNACE_TEMP_MIN_STARTUP}°C. Дождитесь выхода на режим перед завершением."
            )
            score -= 35

        if scenario_id == "shutdown" and furnace_temp > FURNACE_TEMP_MAX_SHUTDOWN:
            errors.append(self._localize(TECH_REGULATIONS["TEMP_NOT_REACHED"], at_second=time_elapsed))
            recommendations.insert(
                0, f"Температура печи ({furnace_temp:.1f}°C) превышает порог безопасного останова "
                   f"({FURNACE_TEMP_MAX_SHUTDOWN}°C). Дождитесь охлаждения перед завершением."
            )
            score -= 35

        if scenario_id == "startup" and not (COLUMN_LEVEL_BALANCE_MIN <= column_level <= COLUMN_LEVEL_BALANCE_MAX):
            errors.append(self._localize(TECH_REGULATIONS["LEVEL_UNBALANCED"], at_second=time_elapsed))
            recommendations.insert(
                0, f"Уровень в кубе колонны K-1 ({column_level:.1f}%) вышел за пределы рабочего "
                   f"диапазона {COLUMN_LEVEL_BALANCE_MIN}-{COLUMN_LEVEL_BALANCE_MAX}%. "
                   "Балансируйте дренажным клапаном V-3."
            )
            score -= 20

        if furnace_temp > FURNACE_TEMP_WARNING:
            errors.append(self._localize(TECH_REGULATIONS["TEMP_TOO_HIGH"], at_second=time_elapsed))
            recommendations.insert(
                0, f"Температура печи в конце сессии составила {furnace_temp:.1f}°C, "
                   f"что превышает порог нормального режима {FURNACE_TEMP_WARNING}°C. "
                   "Не допускайте перегрева и риска коксования труб."
            )
            score -= 20

        score = self._apply_k2_physical_checks(score, sensors, time_elapsed, errors, recommendations)

        return score

    def _apply_k2_physical_checks(self, score, sensors, time_elapsed, errors, recommendations):
        """
        Проверяет финальное состояние вакуумного блока К-2.

        Проверяются только состояния, опасные в любом сценарии: сорванный
        вакуум, перегрев куба и захлёбывание. Низкий уровень куба сюда
        намеренно не входит — при останове колонны он падает штатно (V-3
        закрыт, насосы Н-4/Н-32 продолжают откачку), и штраф за него наказывал
        бы оператора за правильно выполненный регламент.
        """
        pressure = sensors.get("P_vac")
        if pressure is not None and pressure > K2_PRESSURE_WARNING:
            errors.append(self._localize(TECH_REGULATIONS["K2_VACUUM_NOT_RESTORED"], at_second=time_elapsed))
            recommendations.insert(
                0, f"Остаточное давление в К-2 на конец сессии — {pressure:.3f} МПа при пороге "
                   f"сигнализации {K2_PRESSURE_WARNING} МПа. Восстановите вакуум подачей пара "
                   "на эжекторы ВТ или снимите тепловую нагрузку перед завершением."
            )
            score -= 20

        bottom_temp = sensors.get("T_2")
        if bottom_temp is not None and bottom_temp > K2_TEMP_WARNING:
            errors.append(self._localize(TECH_REGULATIONS["K2_BOTTOM_OVERHEAT"], at_second=time_elapsed))
            recommendations.insert(
                0, f"Температура куба К-2 составила {bottom_temp:.1f}°C при пороге "
                   f"{K2_TEMP_WARNING}°C. Снижайте нагрев до завершения сессии, иначе мазут "
                   "коксуется и выводит из строя насосы откачки."
            )
            score -= 20

        bottom_level = sensors.get("L_2")
        if bottom_level is not None and bottom_level > K2_LEVEL_HIGH:
            errors.append(self._localize(TECH_REGULATIONS["K2_BOTTOM_FLOODED"], at_second=time_elapsed))
            recommendations.insert(
                0, f"Уровень куба К-2 достиг {bottom_level:.1f}% при верхней сигнализации "
                   f"{K2_LEVEL_HIGH}%. Усильте откачку насосами Н-4/Н-32 или прекратите подачу "
                   "кубового остатка клапаном V-3."
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
        "vt_vacuum_failure": "Срыв вакуума вакуумного блока ВТ",
        "elou_salt_breakthrough": "Проскок солей и воды из ЭЛОУ",
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
