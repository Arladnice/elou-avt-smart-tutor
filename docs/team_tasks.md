# 📋 Задачи команды — КТК ЭЛОУ-АВТ Smart Tutor

> **КРИТИЧЕСКИЙ ДЕДЛАЙН СДАЧИ:** 14 августа 2026  
> **Обновлено:** 03.08.2026  
> Задачи распределены по компетенциям из матрицы (`docs/reference/Матрица ролей.csv`, `docs/reference/Матрица компетенций.csv`).  
> Каждый участник выполняет свою зону ответственности, используя указанные файлы-исходники.

---

## 🔑 Легенда приоритетов и график

| Метка | Приоритет | Срок выполнения |
|---|---|---|
| 🔴 | Критично | До **05.08** |
| 🟠 | Важно | До **08.08** |
| 🟡 | Желательно | До **11.08** |
| 🟢 | Финал (демо и сдача) | **12.08 — 14.08** |

---

## 👤 Денис — Frontend-лид, PM

**Роль:** XL Frontend, L PM, M Backend, M AI Lead, M АСУ ТП  

### Файлы и исходники для работы:
- Панель инструктора: [`frontend/src/pages/instructor/ui/InstructorPage.tsx`](file:///e:/Git-Projects/elou-avt-smart-tutor/frontend/src/pages/instructor/ui/InstructorPage.tsx)
- Готовый виджет оценки: [`frontend/src/widgets/score-card/ui/ScoreCard.tsx`](file:///e:/Git-Projects/elou-avt-smart-tutor/frontend/src/widgets/score-card/ui/ScoreCard.tsx)
- Отчёт ML: [`backend/training/reports/evaluation_report.md`](file:///e:/Git-Projects/elou-avt-smart-tutor/backend/training/reports/evaluation_report.md)
- Презентация: [`docs/presentations/ELOU_AVT_Smart_Tutor.pptx`](file:///e:/Git-Projects/elou-avt-smart-tutor/docs/presentations/ELOU_AVT_Smart_Tutor.pptx)

### Задачи
- ✅ **ScoreCard & Дебрифинг для инструктора** — **ГОТОВО (100%)**. В UI Инструктора реализована таблица сессий с кликом и модальным модальным окном «Детальный отчет по сессии» (нарушения техрегламента, таймлайн секундных действий, проверка HMAC ГОСТ).
- 🔴 **Объяснение Precision=2.7%** — написать раздел в `evaluation_report.md`: почему Recall=100% важнее Precision в АСУ ТП.
- 🔴 **Слайд «3 гипотезы кейса»** — добавить в PPTX явное подтверждение всех 3 гипотез из кейса.
- 🟠 **Замер WS-задержки** — зафиксировать реальную цифру ping, добавить в `docs/performance.md`.
- 🟠 **Слайд «Обзор подходов»** — добавить DeltaSim, ИНИУС, ссылку на Дозорцева.
- 🟢 **Сборка и проверка** — пройти `npm run build` и `npx tsc --noEmit` без ошибок.
- 🟢 **Запись видео-демо** (до 13.08) — записать 3-5 мин видеоролик работы тренажёра.

---

## 👤 Александра Лотова — PM-лид, Экономист

**Роль:** XL PM, XL Экономист/Бизнес-аналитик, M AI Lead, M ИБ  

### Файлы и исходники для работы:
- Презентация с экономикой (слайд 9): [`docs/presentations/ELOU_AVT_Smart_Tutor.pptx`](file:///e:/Git-Projects/elou-avt-smart-tutor/docs/presentations/ELOU_AVT_Smart_Tutor.pptx)
- Требования к решению: [`Исходные данные/Кейс.pdf`](file:///e:/Git-Projects/elou-avt-smart-tutor/Исходные%20данные/Кейс.pdf)
- Конспекты бизнес-анализа: [`docs/reference/lecture_insights/13_babok_v3_business_analysis_standard.md`](file:///e:/Git-Projects/elou-avt-smart-tutor/docs/reference/lecture_insights/13_babok_v3_business_analysis_standard.md)
- Стратегический план: [`docs/main_strategic_plan.md`](file:///e:/Git-Projects/elou-avt-smart-tutor/docs/main_strategic_plan.md)

### Задачи
- 🔴 **Проверить расчёты экономики в PPTX** — файл `docs/presentations/ELOU_AVT_Smart_Tutor.pptx` (Слайд 9: NPV=5.66 млн руб, PI=1.91, DPP=3.71 года, IRR=45%). Проверить формулы, исходные предпосылки и актуализировать цифры.
- 🔴 **Раздел «Конкурентоспособность и внедрение» (К4)** — написать в пояснительную записку (`docs/explanatory_note.md` / `docs/business_model.md`) обоснование преимуществ перед DeltaSim и ИНИУС.
- 🟠 **Risk-матрица проекта** — составление таблицы рисков (вероятность, ущерб, митигация) для бизнес-части.
- 🟠 **Дорожная карта коммерциализации** — описать 3 этапа внедрения (MVP -> Пилот -> Пром) с затратами и эффектами.
- 🟡 **Ссылки на академические источники** — включить в финансово-экономическое обоснование ссылки на статьи Patle et al. и Дозорцева.
- 🟢 **Финальная сверка презентации и текста** (до 13.08) — проверить полное соответствие цифр в PPTX и документации.

---

## 👤 Андрей — Инженер АСУ ТП

**Роль:** XL Инженер АСУ ТП, M ИБ, M Экономика, M PM  

### Файлы и исходники для работы:
- Техпроцесс и физика: [`Исходные данные/3. Описание технологического процесса.pdf`](file:///e:/Git-Projects/elou-avt-smart-tutor/Исходные%20данные/3.%20Описание%20технологического%20процесса.pdf)
- Спецификация оборудования и КИПиА: [`docs/equipment_specification.md`](file:///e:/Git-Projects/elou-avt-smart-tutor/docs/equipment_specification.md)
- Исходный код физики: [`backend/src/elou_tutor/simulation/`](file:///e:/Git-Projects/elou-avt-smart-tutor/backend/src/elou_tutor/simulation/)
- Пороги блокировок и ПАЗ: [`backend/src/elou_tutor/domain/process_limits.py`](file:///e:/Git-Projects/elou-avt-smart-tutor/backend/src/elou_tutor/domain/process_limits.py)

### Задачи
- 🔴 **Валидация физической модели** — сопоставить параметры симулятора в `backend/src/elou_tutor/simulation/` с регламентом `3. Описание технологического процесса.pdf` (температуры печи, давления колонны К-1, уровни).
- 🔴 **Проверка аварийных порогов** — проверь все константы в `domain/process_limits.py` (отсечка топлива, останов насосов при L<15%) на строгое соответствие регламенту.
- 🟠 **Описание 5 учебных сценариев** — подготовить технологическое описание сценариев (startup, shutdown, column_shutdown, overpressure_relief, recirculation) для документации.
- 🟠 **Описание 3 технологических аварий** — задокументировать физику прогара змеевика, превышения давления и потери уровня куба.
- 🟡 **Мини-HAZOP анализ** — составить HAZOP-таблицу уязвимых узлов установки для одного из ключевых сценариев.
- 🟢 **Ревью мнемосхемы SCADA** — проверить корректность названий позиций КИПиА на мнемосхеме в UI.

---

## 👤 Екатерина — ИБ-специалист

**Роль:** XL Специалист по ИБ  

### Файлы и исходники для работы:
- Модель угроз: [`docs/security_model.md`](file:///e:/Git-Projects/elou-avt-smart-tutor/docs/security_model.md)
- Модуль аудита: [`backend/src/elou_tutor/db/audit.py`](file:///e:/Git-Projects/elou-avt-smart-tutor/backend/src/elou_tutor/db/audit.py)
- Криптография и HMAC: [`backend/src/elou_tutor/domain/integrity.py`](file:///e:/Git-Projects/elou-avt-smart-tutor/backend/src/elou_tutor/domain/integrity.py)
- Контейнеризация: [`backend/Dockerfile`](file:///e:/Git-Projects/elou-avt-smart-tutor/backend/Dockerfile)

### Задачи
- 🔴 **Ревью модели угроз ИБ (К8)** — актуализировать `docs/security_model.md`: защита от подмены результатов сессии (HMAC SHA-256), авторизация JWT/RBAC, защита от НСД.
- 🔴 **Реестр аудит-событий** — описать ~20 логируемых типов событий в `backend/src/elou_tutor/db/audit.py` (вход, изменение уставок, ESD, подделка хэша).
- 🟠 **Раздел ИБ для сводной записки** — подготовить текстовый раздел по требованиям защиты АСУ ТП (невозможность фальсификации протоколов обучения).
- 🟠 **Безопасность контейнера** — задокументировать работу Dockerfile от не-root пользователя (`appuser`) и секретов из env.
- 🟡 **Защита от SSRF в RAG** — проверить и описать логику валидации входящих URL в RAG-сервисе `services/rag.py`.
- 🟢 **Финальная сверка Слайда 7 (ИБ)** — проверить слайд 7 в PPTX на соответствие фактам реализации.

---

## 👤 Саломе — ML/AI, Бизнес-аналитика

**Роль:** M AI Lead, M Backend, M Frontend, M Экономика  

### Файлы и исходники для работы:
- Код ML-модели: [`backend/src/elou_tutor/ml/`](file:///e:/Git-Projects/elou-avt-smart-tutor/backend/src/elou_tutor/ml/)
- Оценки модели: [`backend/training/reports/evaluation_report.md`](file:///e:/Git-Projects/elou-avt-smart-tutor/backend/training/reports/evaluation_report.md)
- Конспект по ИИ в КТК: [`docs/reference/lecture_insights/07_ml_digital_twins.md`](file:///e:/Git-Projects/elou-avt-smart-tutor/docs/reference/lecture_insights/07_ml_digital_twins.md)
- Конспект лекции Дозорцева: [`docs/reference/lecture_insights/11_computer_training_simulators_dozortsev.md`](file:///e:/Git-Projects/elou-avt-smart-tutor/docs/reference/lecture_insights/11_computer_training_simulators_dozortsev.md)

### Задачи
- 🟠 **Описание раздела ИИ (К5) в документацию** — описать работу RiskLSTM (прогноз риска за 15 сек до аварии, ONNX-инференс, входные сигналы).
- 🟠 **Описание RAG-модуля и Базы Знаний** — описать векторный поиск по технологическому регламенту, отсечку галлюцинаций (порог 0.08).
- 🟡 **Сравнительный анализ LCS vs DTW** — на основе лекции Вылегжанина аргументировать, почему LCS предпочтительнее DTW для оценки дискретных шагов оператора.
- 🟡 **Интеграция с HR-метриками** — описать концепт передачи результатов тренировок в корпоративные LMS / HR-системы.
- 🟢 **Сверка Слайда 6 (ИИ)** — проверить корректность формулировок на слайде ИИ в презентации.

---

## 👤 Фёдор — Экономика, Контент, AI

**Роль:** Экономика/Маркетинг M, AI M  

### Файлы и исходники для работы:
- Конспект Газпромнефть IT: [`docs/reference/lecture_insights/12_it_infrastructure_ai_deployment_gazpromneft.md`](file:///e:/Git-Projects/elou-avt-smart-tutor/docs/reference/lecture_insights/12_it_infrastructure_ai_deployment_gazpromneft.md)
- Конспект Дозорцева: [`docs/reference/lecture_insights/11_computer_training_simulators_dozortsev.md`](file:///e:/Git-Projects/elou-avt-smart-tutor/docs/reference/lecture_insights/11_computer_training_simulators_dozortsev.md)
- Презентация: [`docs/presentations/ELOU_AVT_Smart_Tutor.pptx`](file:///e:/Git-Projects/elou-avt-smart-tutor/docs/presentations/ELOU_AVT_Smart_Tutor.pptx)

### Задачи
- 🟠 **Сводная таблица аналогов** — подготовить сравнительную матрицу: Smart Tutor vs DeltaSim / Honeywell / ИНИУС (функционал, цена, автономность ИИ).
- 🟡 **Расчёт TCO и ROI** — расчитать совокупную стоимость владения (TCO) на 5 лет для локального и облачного деплоя.
- 🟡 **Маркетинговая справка** — описание болей целевой аудитории (снижение аварийности, ускорение ввода операторов в строй).
- 🟢 **Сверка Слайда 9 (Экономика)** — финальная вычитка текста экономических слайдов.

---

## ⚠️ Максим Сазонов

> Матрица компетенций не заполнена. Заполните `docs/reference/Матрица ролей.csv` для получения персональных задач.

---

## 📅 График подготовки к защите (Дедлайн 14 августа)

| Дата | Этап | Ответственные |
|---|---|---|
| **03.08 — 05.08** 🔴 | Разработка ScoreCard, проверка экономики, валидация физики и ИБ | Все |
| **06.08 — 08.08** 🟠 | Написание текстов К4/К5/К8, ревью слайдов PPTX, SessionTimeline | Все |
| **09.08 — 11.08** 🟡 | Финальное оформление сводной записки, HAZOP, TCO/ROI, LCS vs DTW | Все |
| **12.08** 🟢 | Полный ручной прогон демо по чек-листу `docs/demo_scenario.md` | Вся команда |
| **13.08** 🟢 | Запись демонстрационного видеоролика (3-5 мин) + финальный билд | Денис |
| **14.08** 🚀 | **ОФИЦИАЛЬНАЯ СДАЧА ПРОЕКТА** | Вся команда |
