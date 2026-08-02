# 🏭 ЭЛОУ-АВТ Smart Tutor

> **Интеллектуальный тренажёр-симулятор** промышленной нефтеперерабатывающей установки с AI-аналитикой действий оператора в реальном времени.

[![Live Demo](https://img.shields.io/badge/Live%20Demo-tutor.kluknulo.ru-brightgreen?style=for-the-badge&logo=googlechrome)](https://tutor.kluknulo.ru/login)
[![React](https://img.shields.io/badge/React_19-TypeScript-61DAFB?style=for-the-badge&logo=react)](https://react.dev/)
[![FastAPI](https://img.shields.io/badge/FastAPI-Python-009688?style=for-the-badge&logo=fastapi)](https://fastapi.tiangolo.com/)
[![PyTorch](https://img.shields.io/badge/PyTorch-LSTM-EE4C2C?style=for-the-badge&logo=pytorch)](https://pytorch.org/)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=for-the-badge&logo=docker)](https://www.docker.com/)
[![Tests](https://img.shields.io/badge/pytest-149%20tests-success?style=for-the-badge&logo=pytest)](./backend/tests/)

> ⚠️ **Проект находится в активной разработке.** Ведётся в рамках IT-чемпионата нефтяной отрасли («Энерготехнохаб Петербург» / CASE-IN).

---

## ✨ Что это такое

**ЭЛОУ-АВТ Smart Tutor** — fullstack-приложение, которое симулирует работу реальной промышленной установки первичной переработки нефти (ЭЛОУ-АВТ-1). Оператор управляет клапанами и нагревом через SCADA-интерфейс в реальном времени, а встроенный ИИ-модуль:

- 🔮 **Предсказывает** риски аварии на 15 секунд вперёд (LSTM-нейросеть, ONNX Runtime)
- 🧠 **Анализирует ошибки** оператора через алгоритм LCS (Longest Common Subsequence)
- 🔒 **Защищает** результаты обучения от фальсификации (JWT + SHA-256 + соль)
- 📊 **Формирует ScoreCard** с детальным дебрифингом каждой сессии для инструктора

> 💡 **Границы MVP-версии:** Прототип воспроизводит сквозной учебный маршрут **ЭЛОУ → АТ → ВТ**. Наиболее детально реализована динамическая модель **атмосферного блока (печь П-1 — колонна К-1)**: температура, давление, уровень куба, клапаны, блокировки. Блоки **ЭЛОУ** и **ВТ** представлены агрегированными моделями; их детализация — приоритет следующей итерации.
>
> ⚠️ Тренажёр предназначен для обучения и предварительной оценки учебных действий. Он **не является средством управления технологическим процессом** и не служит единственным основанием допуска персонала к работе на реальной установке.

---

## 🌐 Live Demo

**[https://tutor.kluknulo.ru/login](https://tutor.kluknulo.ru/login)**

Демо-учётные записи (пароль для всех: `Ktk_2026!`):

| Роль | Логин |
|---|---|
| 👨‍💼 Инструктор | `instructor_1` |
| 👷 Оператор | `operator_1` |
| 👷 Оператор | `operator_2` |
| 👷 Оператор | `operator_3` |

> Роль в форме входа должна совпадать с ролью учётной записи.

---

## 🛠 Tech Stack

| Слой | Технологии |
|---|---|
| **Frontend** | React 19, TypeScript, Ant Design, styled-components, Recharts, Vite |
| **Backend** | Python, FastAPI, Pydantic v2, WebSocket, SQLite |
| **AI / ML** | PyTorch (LSTM, 2 слоя, 64 нейрона), ONNX Runtime, NumPy (LCS, polyfit) |
| **Simulator** | Изолированный симулятор физики тепломассообмена (`SimulationSession`) |
| **DevOps** | Docker, docker-compose, pytest (149 тестов) |
| **Security** | JWT (HS256), RBAC, SHA-256 + SECRET_SALT, audit-log |

---

## 🚀 Быстрый старт

### Вариант 0: Через Makefile (рекомендуется)

```bash
make init    # создать .env из шаблона и установить зависимости (Python + npm)
make start   # собрать и поднять весь стек в Docker
make stop    # остановить стек
make lint    # проверить код: oxlint + синтаксис Python
```

> ⚠️ **Node.** Фронтенду нужен Node `^20.19` или `>=22.12`. Переключиться можно через `nvm use 22`, затем `make init`.

### Вариант 1: Раздельный локальный запуск

#### Бэкенд
```bash
pip install --user -e backend
cp backend/.env.example backend/.env
python -m uvicorn elou_tutor.api.main:app --host 127.0.0.1 --port 8000 --reload
```

#### Фронтенд
```bash
npm run dev --prefix frontend
```

Интерфейс: http://localhost:5173/ | API: http://127.0.0.1:8000/

### Вариант 2: Docker Compose (всё в одном)

```bash
# 1. Создайте .env с секретами
cp backend/.env.example backend/.env

# 2. Соберите и запустите
docker compose up --build
```

| Сервис | Адрес |
|---|---|
| **Интерфейс** | http://localhost:8080/ |
| **API** | http://localhost:8000/ |
| **Health** | http://localhost:8000/api/health |

```bash
docker compose up -d --build     # запустить в фоне
docker compose logs -f backend   # логи бэкенда
docker compose down              # остановить (данные сохранятся)
docker compose down -v           # остановить и стереть БД
```

---

## 🎮 Функционал тренажёра

### Панель Оператора
- **Сквозная мнемосхема ЭЛОУ-АВТ-1** с датчиками T-1, P-1, L-1, Sal-1, W-1
- Управление клапанами (V-1, V-2, V-3) и уставкой температуры печи П-1
- Кнопка аварийного останова (ESD)
- ИИ-риск-индикатор с живым графиком прогноза на 15 секунд вперёд

### Панель Инструктора
- Выбор и управление учебным сценарием
- Инъекция неисправностей:
  - **Отказ сырьевого насоса Н-1** — прекращение подачи сырья, угроза сухого хода
  - **Прогар змеевика П-1** — критический перегрев, риск пожара
  - **Заедание клапана V-2** — блокировка сброса давления, угроза взрыва
- **Защищённая база сессий (К8: ИБ)** — таблица всех тренировок с проверкой SHA-256 (ГОСТ)
- **Детальный ScoreCard** — клик по строке → полный разбор ошибок с ссылками на пункты регламента + хронологический журнал действий оператора

---

## 🧪 Тест-кейсы

### Тест-кейс 1. Управление параметрами колонны
1. Войдите как оператор (`operator_1`).
2. Установите уставку температуры печи П-1 `340°C` — наблюдайте рост T-1 и P-1.
3. При давлении `>0.4 МПа` откройте клапан сброса **V-2** — давление стабилизируется.
4. Верните уставку на `280°C`, закройте **V-2**.
5. Закройте дренаж **V-3** — уровень куба пойдёт вверх. Откройте обратно.
6. Нажмите «Завершить» для сохранения ScoreCard.

### Тест-кейс 2. Парирование отказа насоса
1. Инструктор включает **«Отказ насоса Н-1»**.
2. Оператор должен немедленно снизить уставку П-1 до минимума.
3. При бездействии через ~70 сек — авария по уровню куба (<5%).

### Тест-кейс 3. Заедание клапана V-2
1. Инструктор включает **«Заедание V-2»**.
2. Оператор поднимает температуру до `340°C` — давление растёт, клапан не открывается.
3. Требуется нажать **ESD** до достижения `0.48 МПа` (автоблокировка ПАЗ).

### Тест-кейс 4. Переполнение куба К-1
1. Закрыть дренаж **V-3**, оставив вход **V-1** открытым.
2. При уровне `>98%` срабатывает автоблокировка ПАЗ.

### Тест-кейс 5. Контроль целостности ИБ
```bash
# Симуляция атаки на БД (ручная подмена оценки)
python -c "import sqlite3; conn = sqlite3.connect('backend/tutor.db'); conn.execute('UPDATE training_sessions SET score = 100 WHERE id = (SELECT max(id) FROM training_sessions)'); conn.commit(); conn.close(); print('Скомпрометировано!')"
```
Обновите страницу инструктора — строка получит статус **«Нарушена!»** (красный).

---

## 🏗 Архитектура репозитория

```
elou-avt-smart-tutor/
├── frontend/          # React 19 + TypeScript, Feature-Sliced Design
├── backend/
│   ├── src/elou_tutor/
│   │   ├── domain/    # Пороги ПАЗ, тексты регламента, HMAC-крипто
│   │   ├── simulation/# Математическая модель ЭЛОУ-АВТ
│   │   ├── tutor/     # Оценка действий: LCS + правила регламента
│   │   ├── ml/        # Рантайм-инференс риска (ONNX)
│   │   ├── db/        # SQLite: sessions, audit
│   │   ├── services/  # Оркестрация: сессии, ИИ-чат, RAG
│   │   └── api/       # FastAPI: routes, security, schemas
│   ├── training/      # Офлайн-обучение LSTM (PyTorch, не в прод-образе)
│   └── tests/         # 149 тестов pytest
├── docs/              # Документация, презентация, матрицы ролей/компетенций
├── Makefile           # make init / start / stop / lint
└── docker-compose.yml
```

Подробная карта зависимостей между слоями → [docs/architecture.md](docs/architecture.md)

---

## ⚙️ Как это работает

### Data Flow
```
Фронтенд (SCADA) ←──WebSocket──→ FastAPI Бэкенд
                                       │
                                  simulation.step()
                                       │
                              ┌────────┴────────┐
                              │ ML Predictor     │ RiskLSTM (ONNX)
                              │ (15 сек вперёд)  │ fallback: polyfit
                              └────────┬────────┘
                                       │
                              ┌────────┴────────┐
                              │ Tutor Analyzer   │ LCS + Rules Tree
                              │ (оценка ошибок)  │
                              └─────────────────┘
```

Каждую **1 секунду** бэкенд рассылает всем клиентам: `sensors`, `valves`, `riskLevel`, `predictions`, `logs`. Команды оператора (клики, ползунок) мгновенно применяются к математической модели.

### Нейросеть (ML Predictor)
- **Архитектура:** LSTM, 2 слоя, 64 нейрона
- **Вход:** 30-секундное скользящее окно × 7 параметров
- **Выход:** прогноз 15 значений вперёд + расчёт интегрального риска аварии (%)
- **Рантайм:** ONNX Runtime; PyTorch только в `backend/training/` (не в прод-образе)
- **Fallback:** `numpy.polyfit` (полиномиальная регрессия) при недоступности ONNX

### Оценка действий (LCS + Rules Tree)
- **LCS:** Наибольшая общая подпоследовательность кликов оператора vs «золотой» регламент
- **Rules Tree:** Семантический анализ нарушений (сухой ход печи, горячий останов, форсированный разогрев и т.д.)
- На выходе: оценка (0–100%), ссылки на пункты регламента, ScoreCard для дебрифинга

### Безопасность (ИБ)
```
Hash = SHA256(SessionData + SECRET_SALT)
```
При каждом чтении из БД пересчитывается и сравнивается хэш. Любая ручная правка данных → мгновенное обнаружение `«Нарушена!»`.

---

## 🧪 Тестирование

```bash
# Backend (pytest)
cd backend && python -m pytest tests/ -v

# Frontend (TypeScript)
cd frontend && npx tsc --noEmit
cd frontend && npm run build
```

---

## 📚 Документация

| Документ | Описание |
|---|---|
| [docs/architecture.md](docs/architecture.md) | Архитектура репозитория, слои и зависимости |
| [docs/equipment_specification.md](docs/equipment_specification.md) | Спецификация КИПиА и датчиков |
| [docs/main_strategic_plan.md](docs/main_strategic_plan.md) | Стратегический план разработки |
| [docs/demo_scenario.md](docs/demo_scenario.md) | Сценарий для демонстрации жюри |
| [docs/team_tasks.md](docs/team_tasks.md) | Задачи команды по ролям |
| [docs/presentations/](docs/presentations/) | Презентация проекта (PPTX) |

---

*Дедлайн сдачи проекта: **14 августа 2026***
