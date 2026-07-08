import numpy as np

# Технологический регламент ЭЛОУ-АВТ (База знаний ИИ-модуля)
TECH_REGULATIONS = {
    "P1_DRY_HEAT": {
        "clause": "Раздел 7.9.1 / п. 7.10.3",
        "title": "Опасность прекращения циркуляции / нагрева всухую",
        "text": "Прекращение расхода сырья по змеевикам печей П-1 при работающих горелках ведет к критическому росту температуры стенок змеевика, коксованию труб, их прогару и возникновению пожара в топке печи."
    },
    "K1_OVERPRESSURE": {
        "clause": "Раздел 3.5 / п. 7.10.4",
        "title": "Рост давления в колонне К-1",
        "text": "Рабочее давление верха колонны К-1 должно составлять от 1 до 4,5 кгс/см² (0.1 - 0.45 МПа). Рост давления свыше 4,8 кгс/см² приводит к автоматическому отсечению топлива. Оператор обязан заблаговременно открыть регулирующий клапан сброса давления V-2 на факельную линию."
    },
    "K1_HIGH_LEVEL": {
        "clause": "Раздел 7.10.4",
        "title": "Высокий уровень в колонне К-1",
        "text": "Высокий уровень жидкости в колонне К-1 (>85%) создает риск уноса жидких фракций с парами в шлемовую линию, что вызывает гидроудары и деформацию конденсаторов-холодильников. Требуется открыть дренаж V-3."
    },
    "K1_LOW_LEVEL": {
        "clause": "Раздел 7.9.1 / п. 7.7.1.14",
        "title": "Низкий уровень в колонне К-1",
        "text": "Снижение уровня нефтепродукта в колонне К-1 ниже 20% может привести к срыву печных насосов Н-3 (Н-3А), Н-2 (Н-2А, Н-2Б), сухому ходу и повреждению их торцевых уплотнений."
    },
    "ORDER_VIOLATION": {
        "clause": "Раздел 7.7.1.1",
        "title": "Нарушение очередности технологических операций",
        "text": "Строгое выполнение всех операций, строгое соблюдение очередности выполнения операций, плавный и равномерный разогрев аппаратов и трубопроводов при выводе на режим установки..."
    }
}

class ErrorAnalyzer:
    def __init__(self):
        # Эталонные последовательности действий для различных сценариев
        # Действия кодируются как: V1_OPEN, V1_CLOSE, V2_OPEN, V2_CLOSE, V3_OPEN, V3_CLOSE, SP_UP, SP_DOWN, ESD
        self.golden_sequences = {
            "startup": ["V1_OPEN", "SP_UP", "V3_OPEN"],
            "shutdown": ["SP_DOWN", "V2_OPEN", "V1_CLOSE"]
        }

    def evaluate_session(self, actions, scenario_id, defects_triggered=None):
        """
        Оценивает сессию оператора.
        actions: список действий, совершенных оператором, например: ["V1_OPEN", "SP_UP", "V3_OPEN"]
        scenario_id: идентификатор сценария ("startup" или "shutdown")
        defects_triggered: список или множество дефектов, активированных во время сессии
        
        Возвращает:
          score: оценка от 0 до 100%
          errors: список обнаруженных ошибок со ссылками на техрегламент
          recommendations: рекомендации по обучению
        """
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
        
        # Получаем эталонную последовательность
        golden = self.golden_sequences.get(scenario_id, [])
        if not golden:
            return 100, [], ["Сценарий успешно выполнен."]

        # Если действия вообще не совершались
        if not actions:
            errors.append({
                "clause": "Общие положения регламента",
                "title": "Регламентные операции не начаты",
                "text": "Вы завершили сессию, не выполнив ни одного управляющего воздействия. Сценарий пуска/останова не был реализован."
            })
            recommendations.append("Ознакомьтесь с чек-листом пуска и выполните необходимые переключения арматуры.")
            recommendations.append("Рекомендуемый адаптивный сценарий: 'Базовые переключения арматуры КТК'")
            return 0, errors, recommendations

        # 1. Алгоритм сравнения последовательностей (упрощенный аналог DTW для дискретных шагов)
        dtw_score = self._calculate_dtw_alignment(actions, golden)
        
        # 2. Анализ критических ошибок в процессе
        has_dry_heat = False
        has_hot_cut = False
        
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

        # Собираем ошибки по регламенту
        if has_dry_heat:
            errors.append(TECH_REGULATIONS["P1_DRY_HEAT"])
            recommendations.append("Изучите порядок пуска печи П-1. Перед розжигом/нагревом обязательно убедитесь в наличии устойчивой подачи сырья (клапан V-1 открыт).")
            
        if has_hot_cut:
            errors.append(TECH_REGULATIONS["P1_DRY_HEAT"])
            recommendations.append("Запрещено прекращать подачу сырья (закрывать V-1) при работающих горелках печи П-1. Сначала снизьте уставку нагрева печи.")

        if dtw_score < 80:
            errors.append(TECH_REGULATIONS["ORDER_VIOLATION"])
            recommendations.append("Обратите внимание на последовательность операций. Несоблюдение очередности ведет к нестабильности техпроцесса.")

        # Расчет итоговой оценки
        # Каждая критическая ошибка сильно снижает балл
        final_score = dtw_score
        if has_dry_heat:
            final_score -= 30
        if has_hot_cut:
            final_score -= 35
            
        final_score = max(0, min(100, final_score))
        
        # Адаптивное назначение повторного сценария
        if final_score < 75:
            if has_dry_heat or has_hot_cut:
                recommendations.append("Рекомендуемый адаптивный сценарий: 'Регулирование теплового режима печи П-1'")
            else:
                recommendations.append("Рекомендуемый адаптивный сценарий: 'Базовые переключения арматуры КТК'")
        else:
            recommendations.append("Поздравляем! Квалификация подтверждена. Можете переходить к сложным сценариям с инъекцией дефектов.")

        return int(final_score), errors, recommendations

    def _calculate_dtw_alignment(self, s1, s2):
        """
        Вычисляет расстояние выравнивания между действиями оператора (s1) и эталоном (s2).
        Возвращает процент совпадения (0-100%).
        """
        n, m = len(s1), len(s2)
        if n == 0 or m == 0:
            return 0 if n != m else 100
            
        # Матрица расстояний DTW
        dtw_matrix = np.zeros((n + 1, m + 1))
        for i in range(n + 1):
            for j in range(m + 1):
                dtw_matrix[i, j] = float('inf')
        dtw_matrix[0, 0] = 0

        for i in range(1, n + 1):
            for j in range(1, m + 1):
                # Расстояние между действиями: 0 если совпадают, 1 если разные
                cost = 0 if s1[i - 1] == s2[j - 1] else 1
                dtw_matrix[i, j] = cost + min(
                    dtw_matrix[i - 1, j],    # вставка
                    dtw_matrix[i, j - 1],    # удаление
                    dtw_matrix[i - 1, j - 1]  # совпадение/замена
                )

        # Вычисляем процент сходства на основе DTW-расстояния
        max_dist = max(n, m)
        dtw_dist = dtw_matrix[n, m]
        
        similarity = (1 - (dtw_dist / max_dist)) * 100
        return max(0.0, similarity)

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
