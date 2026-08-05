# ЭЛОУ-АВТ Smart Tutor

Учебный тренажёр технологического процесса ЭЛОУ-АВТ с двумя ролями, интерактивной моделью установки, оценкой действий оператора и прогнозом параметров.

**Демо:** [https://tutor.kluknulo.ru/login](https://tutor.kluknulo.ru/login)
**Дедлайн конкурсной сдачи:** 11 августа 2026 года

Демо-учётные записи используют пароль `Ktk_2026!`:

| Роль | Логин |
|---|---|
| Инструктор | `instructor_1` |
| Оператор | `operator_1` |
| Оператор | `operator_2` |
| Оператор | `operator_3` |
| Оператор | `operator_4` |
| Оператор | `operator_5` |
| Оператор | `operator_6` |
| Оператор | `operator_7` |

Роль в форме входа должна совпадать с ролью учётной записи.

## Что реализовано

- сквозной учебный маршрут ЭЛОУ → АТ → ВТ;
- детальная модель контура П-1/К-1 и агрегированные модели ЭЛОУ и ВТ;
- семь учебных сценариев и восемь отказов для инструктора;
- отдельные интерфейсы оператора и инструктора;
- WebSocket-телеметрия с шагом симуляции 1 секунда;
- журнал действий, завершение сессии и ScoreCard;
- ONNX LSTM: прогноз трёх технологических параметров на горизонт 15 секунд;
- гибридный расчёт риска: ONNX-прогноз, численный baseline и технологические правила;
- локальный поиск по базе знаний и подсказки с указанием источника;
- JWT, RBAC, ограничение частоты команд, HMAC-SHA256 и цепочка аудита.

## Границы MVP

Это образовательный прототип, а не промышленный цифровой двойник и не система управления установкой. Физическая модель ещё не калибрована по реальной телеметрии. ML-модель обучена на синтетических данных; текущая оценка подтверждает работу контура, но не промышленную точность. Решение о допуске сотрудника принимает инструктор.

## Технологии

| Слой | Технологии |
|---|---|
| Frontend | React 19, TypeScript, Ant Design, styled-components, Recharts, Vite |
| Backend | Python, FastAPI, Pydantic v2, WebSocket, SQLite |
| AI/ML | PyTorch, ONNX Runtime, NumPy |
| Развёртывание | Docker Compose, Caddy, GitHub Actions |

## Быстрый старт

Требуется Node `^20.19` или `>=22.12`, Python 3.11+ и Docker Compose.

### Docker Compose

```bash
cp backend/.env.example backend/.env
docker compose up --build
```

| Сервис | Адрес |
|---|---|
| Интерфейс | http://localhost:8080/ |
| API | http://localhost:8000/ |
| Health | http://localhost:8000/api/health |

### Раздельный запуск

```bash
pip install -e backend
cp backend/.env.example backend/.env
python -m uvicorn elou_tutor.api.main:app --host 127.0.0.1 --port 8000 --reload
npm install --prefix frontend
npm run dev --prefix frontend
```

Frontend: http://localhost:5173/
Backend: http://127.0.0.1:8000/

## Проверки

```bash
cd backend
python -m pytest tests/ -q
ruff check .
lint-imports

cd ../frontend
npm run typecheck
npm run lint
npm run check:fsd
npm run build
```

На commit `5e7e5c0` локально подтверждены 156 backend-тестов и 54 subtests, Ruff, шесть import-контрактов, REST/WebSocket smoke и ONNX smoke. Frontend и Docker следует перепроверять на машине демонстрации после каждого изменения зависимостей или конфигурации.

## Структура

```text
frontend/                    React/TypeScript интерфейс
backend/src/elou_tutor/      API, сервисы, симулятор, анализ и ML runtime
backend/training/            генерация синтетики, обучение и экспорт ONNX
backend/tests/               автоматические проверки backend
docs/                        актуальная документация и исходные материалы
docs/presentations/          конкурсная презентация
```

## Документы для работы и защиты

- [Документация проекта](docs/README.md)
- [Сценарий демонстрации](docs/demo_scenario.md)
- [План до 11 августа](docs/main_strategic_plan.md)
- [Текущий конкурсный аудит](docs/audit/smart_tutor_competition_audit_2026-08-03.md)
- [Презентация](docs/presentations/ELOU_AVT_Smart_Tutor.pptx)
