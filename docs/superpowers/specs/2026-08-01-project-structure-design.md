# Реорганизация структуры проекта ЭЛОУ-АВТ Smart Tutor

**Дата:** 2026-08-01
**Статус:** дизайн утверждён, план реализации не написан

## Зачем

В корне репозитория лежат три Python-папки — `backend/`, `simulator/`, `ai_core/`, — границы между которыми проведены не по смыслу. Разбор кода показал пять разных сущностей вместо трёх, перепутанные зависимости и офлайн-обучение внутри прод-образа.

### Что выявил разбор

**1. `ai_core/` — не один компонент, а три с половиной.**

| Что лежит | Что это на самом деле |
|---|---|
| `predictive_engine.py` | ML-инференс: LSTM через ONNX + fallback на `numpy.polyfit` |
| `error_analyzer.py` (511 строк), `tech_regulations.py`, `sequence_alignment.py` | Экспертная система без единой строчки ML: LCS-выравнивание, дерево правил, база знаний по техрегламенту |
| `train.py`, `export_onnx.py`, `data_generator.py`, `evaluate.py`, `baselines.py` + 6.5 МБ артефактов | Офлайн-пайплайн, в рантайме не нужен никогда |
| `config.py` | Свалка констант для четырёх разных потребителей |

**2. Циклическая зависимость слоёв.** `simulator/elou_avt_model.py:46`, `ai_core/error_analyzer.py:28` и `backend/services/ai_chat_service.py:86` импортируют `backend.services.scenario_manager` лениво, внутри функций, — обходя цикл «домен → веб-слой». Каждый такой импорт обёрнут в `except Exception: pass`, который молча проглатывает любую ошибку загрузки сценария.

**3. `ai_core/config.py` обслуживает четырёх потребителей сразу**: ML-гиперпараметры, пути к артефактам, пороги ПАЗ по техрегламенту, начальные состояния симуляции, веса риск-движка, тайминги эскалации алертов. Именно поэтому симулятор физики вынужден импортировать пакет с названием «ai_core» — ради `COLUMN_PRES_ESD`.

**4. Прод-образ везёт лишнее.** В `ai_core/` рядом с рантайм-кодом лежит `telemetry_dataset.csv` на 5.9 МБ и скрипты обучения.

**5. Пакетов формально нет.** `__init__.py` есть только в `backend/routes/`; тесты добавляют корень в `sys.path` вручную.

## Целевая структура

```
elou-avt-smart-tutor/
├── frontend/                     React — не меняется
├── backend/
│   ├── pyproject.toml            пакет elou_tutor, src-layout
│   ├── requirements.txt
│   ├── requirements-dev.txt      + pytest
│   ├── Dockerfile
│   ├── tests/
│   │   ├── conftest.py
│   │   ├── test_simulation.py
│   │   ├── test_tutor.py
│   │   └── test_api.py
│   └── src/elou_tutor/
│       ├── domain/
│       │   ├── process_limits.py
│       │   └── regulations.py
│       ├── simulation/
│       │   ├── model.py
│       │   └── scenarios.py
│       ├── tutor/
│       │   ├── analyzer.py
│       │   └── alignment.py
│       ├── ml/
│       │   ├── predictor.py
│       │   ├── settings.py
│       │   └── artifacts/model.onnx, model.onnx.data
│       ├── db/
│       │   ├── database.py
│       │   └── queries.py
│       ├── services/
│       │   ├── simulation_loop.py
│       │   ├── connection_manager.py
│       │   ├── ai_chat_service.py
│       │   └── vector_store.py
│       ├── knowledge_base/       5 md-файлов для RAG
│       ├── data/scenarios.json
│       └── api/
│           ├── main.py
│           ├── security.py
│           ├── schemas.py
│           └── routes/           7 модулей
├── ml/                           офлайн-пайплайн, вне прод-образа
│   ├── requirements.txt          torch и прочее тяжёлое
│   ├── README.md
│   ├── config.py                 гиперпараметры обучения
│   ├── train.py, export_onnx.py, evaluate.py, baselines.py, data_generator.py
│   ├── checkpoints/lstm_model.pth
│   ├── data/telemetry_dataset.csv, test_data.npz
│   └── reports/evaluation_report.md
├── docs/
│   ├── tools/                    convert_docs.py, compile_docs.py
│   ├── deploy/                   README_HF.md
│   ├── reference/                competency_matrix.csv, roles_matrix.csv, simulation.md
│   └── superpowers/specs/        этот документ
├── Dockerfile                    остаётся в корне: требование HF Spaces
├── docker-compose.yml
├── Makefile, config.mk
└── README.md
```

Папки `deploy/` не будет. Hugging Face Spaces с `sdk: docker` ищет `Dockerfile` строго в корне репозитория — это требование платформы, а не соглашение проекта. Переносить в `deploy/` один только `docker-compose.yml` хуже, чем не трогать ничего: `docker compose up` перестанет работать без `-f`.

## Карта переездов

Все переносы выполняются через `git mv`, чтобы сохранить историю и работу `git log --follow`.

### backend/

| Откуда | Куда |
|---|---|
| `backend/main.py` | `api/main.py` |
| `backend/routes/*.py` (7 шт.) | `api/routes/` |
| `backend/models/schemas.py` | `api/schemas.py` |
| `backend/utils/security.py` | `api/security.py` |
| `backend/utils/helpers.py` | удаляется, `random_id()` переезжает в `connection_manager` |
| `backend/db/*.py` | `db/` |
| `backend/services/scenario_manager.py` | `simulation/scenarios.py` |
| `backend/services/{simulation_loop,connection_manager,ai_chat_service,vector_store}.py` | `services/` |
| `backend/knowledge_base/*.md` | `knowledge_base/` |
| `backend/data/scenarios.json` | `data/` |
| `backend/tests/test_tutor.py` | распил на `test_simulation.py`, `test_tutor.py`, `test_api.py` + `conftest.py` |

### simulator/ и ai_core/

| Откуда | Куда |
|---|---|
| `simulator/elou_avt_model.py` | `simulation/model.py` |
| `simulator/README.md` | `docs/reference/simulation.md` |
| `ai_core/error_analyzer.py` | `tutor/analyzer.py` |
| `ai_core/sequence_alignment.py` | `tutor/alignment.py` |
| `ai_core/tech_regulations.py` | `domain/regulations.py` |
| `ai_core/predictive_engine.py` | `ml/predictor.py` (без torch-ветки) |
| `ai_core/config.py` | расщепляется, см. ниже |
| `ai_core/model.onnx`, `model.onnx.data` | `backend/src/elou_tutor/ml/artifacts/` |
| `ai_core/lstm_model.pth` | `ml/checkpoints/` |
| `ai_core/telemetry_dataset.csv`, `test_data.npz` | `ml/data/` |
| `ai_core/{train,export_onnx,data_generator,evaluate,baselines}.py` | `ml/` |
| `ai_core/evaluation_report.md` | `ml/reports/` |
| `ai_core/README.md` | `ml/README.md`, переписывается под офлайн-пайплайн |

### Корень

| Откуда | Куда |
|---|---|
| `pyproject.toml` | `backend/pyproject.toml`, переписывается под src-layout |
| `convert_docs.py`, `scripts/compile_docs.py` | `docs/tools/` |
| `competency_matrix.csv`, `roles_matrix.csv` | `docs/reference/` |
| `README_HF.md` | `docs/deploy/README_HF.md` |

Папка `Исходные данные/` остаётся в корне без изменений — это входные материалы кейса.

## Правило зависимостей

Стрелки только вниз, ни одной вверх:

```
api          → services, schemas
services     → tutor, simulation, ml, db, domain
tutor        → domain
simulation   → domain
ml           → domain
domain       → ничего из проекта (только stdlib и numpy)
```

Цикл разрывается механически: `scenario_manager` становится `simulation/scenarios.py`, то есть частью домена, а не веб-слоя. Три ленивых импорта внутри функций превращаются в обычные импорты в шапке модуля, вместе с ними уходят `except Exception: pass`.

## Расщепление `ai_core/config.py`

Разнесение — по фактическим потребителям, проверено поиском по кодовой базе.

| Константы | Куда | Кто потребляет |
|---|---|---|
| `FURNACE_TEMP_*`, `COLUMN_PRES_*`, `COLUMN_LEVEL_*`, физлимиты, `STARTUP_*`/`NORMAL_*` начальные состояния, `SESSION_MAX_TIME_SEC`, `ESCALATION_*` | `domain/process_limits.py` | `simulation/model.py`, `tutor/analyzer.py`, `services/simulation_loop.py` |
| `INPUT_DIM`, `HIDDEN_DIM`, `NUM_LAYERS`, `OUTPUT_DIM`, `DROPOUT`, `SEQUENCE_LENGTH`, `FORECAST_HORIZON`, `SCALER_*`, `OUT_*`, `RISK_WEIGHT_*`, `RISK_PENALTY_NO_FEED`, `ONNX_PATH` | `ml/settings.py` | `ml/predictor.py`, офлайн-пайплайн |
| `LEARNING_RATE`, `EPOCHS`, `BATCH_SIZE`, `TRAIN_SPLIT`/`VAL_SPLIT`/`TEST_SPLIT`, `RANDOM_SEED`, `RISK_THRESHOLD`, `DATASET_PATH`, `MODEL_PATH` | `ml/config.py` (офлайн) | только `train.py`, `evaluate.py` |

Дублирования нормировочных констант не будет: офлайн-пайплайн импортирует `elou_tutor.ml.settings` из установленного пакета. Направление зависимости — «офлайн → рантайм»; обратной нет, поэтому прод-образ про папку `ml/` ничего не знает.

## Сопутствующие решения

### Удаление torch-ветки из рантайм-предиктора

`predictive_engine.py` умеет грузить `lstm_model.pth` через PyTorch, если ONNX недоступен. В проде эта ветка недостижима: `torch` отсутствует в `requirements.txt` и не появлялся там ни разу за всю историю репозитория (проверено `git log -S`). Это осознанное решение, а не упущение:

- коммит `343a488 fix(backend): Устранено превышение лимита памяти на Render (<512 MB)`;
- в `requirements.txt` закомментированы `sentence-transformers` и `faiss-cpu` с пометкой про лимит 512 МБ;
- `docs/ai_architecture.md:95` прямо описывает обучение в Google Colab и экспорт в `.onnx` ради инференса на CPU без PyTorch.

Torch-ветка удаляется (~40 строк). В рантайме остаются ONNX-инференс и математический fallback на `numpy.polyfit`.

### Воспроизводимость обучения

Сейчас офлайн-пайплайн запустить не на чем: `torch` не описан ни в одном файле зависимостей. Появляется `ml/requirements.txt` с тяжёлыми зависимостями обучения. В прод-образ он не попадает.

### Адрес LLM в конфигурацию

`ai_chat_service.py:153` хардкодит `http://127.0.0.1:1234/v1/chat/completions` — локальный LM Studio. Внутри контейнера `127.0.0.1` указывает на сам контейнер, поэтому ИИ-чат в Docker не работает. Адрес выносится в переменную окружения `LLM_BASE_URL`; в `docker-compose.yml` для неё задаётся `http://host.docker.internal:1234`, в `.env.example` — значение для локального запуска.

### Переход на pytest

Существующие классы `unittest.TestCase` pytest выполняет без правок. Взамен появляются фикстуры (временная БД, секреты в `conftest.py` вместо `os.environ` на импорте модуля), внятный вывод при падении и запуск подмножества тестов. `pytest` добавляется в `requirements-dev.txt`.

### Упаковка неисполняемых файлов

Внутри пакета лежат не только `.py`: `data/scenarios.json`, пять markdown-файлов `knowledge_base/`, `ml/artifacts/model.onnx` и `model.onnx.data`. При src-layout они не попадут в установленный пакет автоматически — в `backend/pyproject.toml` их нужно объявить как package data. Иначе dev-режим (`pip install -e`) работает, а Docker-сборка падает на чтении сценариев или модели. Проверяется отдельным шагом миграции.

## Порядок миграции

Снизу вверх по графу зависимостей — на каждом шаге кодовая база остаётся рабочей.

1. **Каркас.** `backend/src/elou_tutor/`, `pyproject.toml` со src-layout и package data, `__init__.py` во всех пакетах, `pip install -e backend`.
2. **`domain/`.** Расщепление `config.py`, перенос `tech_regulations.py`. Слой ни от чего не зависит, поэтому первый.
3. **`simulation/`.** Модель процесса и реестр сценариев. Здесь исчезает цикл: ленивые импорты становятся обычными.
4. **`tutor/` и `ml/`.** Оба смотрят только в `domain`. Здесь же удаляется torch-ветка.
5. **`db/`, `services/`, `api/`.** Верхний слой, переезжает последним. Здесь же `LLM_BASE_URL` и растворение `helpers.py`.
6. **Офлайн-пайплайн.** `ml/` в корне: скрипты, `requirements.txt`, `config.py`, импорт настроек из установленного пакета.
7. **Тесты.** Распил на три файла, `conftest.py`, переход на pytest.
8. **Инфраструктура.** Оба Dockerfile, `docker-compose.yml`, `Makefile`, `config.mk`, `package.json`, README.

Контрольная точка после каждого шага — прогон тестов. После шага 8 — полная пересборка образов и проверка живого стека.

## Критерии готовности

- `pytest` в `backend/` проходит целиком; счётчик тестов не меньше нынешнего 41.
- `grep -rn "from backend\|import backend" backend/src/elou_tutor/{domain,simulation,tutor,ml}` не находит ничего — восходящих зависимостей нет.
- Ни одного ленивого импорта ради обхода цикла и ни одного `except Exception: pass` вокруг загрузки сценария.
- `make start` поднимает стек; проходят: вход `operator_1`, WebSocket-телеметрия, запуск сценария, инъекция дефекта инструктором, завершение сессии со ScoreCard.
- Прод-образ не содержит `telemetry_dataset.csv`, `.pth` и скриптов обучения (проверяется `docker compose exec backend ls`).
- `make lint` проходит.
- `git log --follow` работает для перенесённых файлов.

## Что не входит в объём

- Фронтенд не затрагивается: ни один файл в `frontend/` не двигается и не правится.
- Схема БД, API-контракты и формат WebSocket-сообщений не меняются — реорганизация не должна быть заметна снаружи.
- Логика симулятора, тьютора и предиктора не переписывается: переносятся файлы и правятся импорты. Единственные содержательные правки — удаление мёртвой torch-ветки, `LLM_BASE_URL` и растворение `helpers.py`.
- Разделение на отдельные устанавливаемые пакеты (`packages/`) отклонено: второго потребителя у симулятора и тьютора нет, а четыре `pyproject.toml` с editable-установками — накладные расходы без выгоды.

## Последствия

**Плюсы.** В корне остаются `frontend/` и `backend/` — разделение, которое и требовалось. Зависимости становятся однонаправленными и проверяемыми. Прод-образ теряет 6.5 МБ артефактов и скрипты обучения. Импорты (`elou_tutor.simulation.model`) однозначны, `sys.path`-хаки уходят. Обучение модели становится воспроизводимым.

**Минусы.** Затрагивается почти каждый Python-файл — параллельные ворктри `backend` придётся ребейзить, конфликты будут механическими (пути импортов). Внешние ссылки на файлы по старым путям (документы, презентации) устареют. Импорты становятся длиннее.
