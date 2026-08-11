# Реорганизация структуры проекта КТК ЭЛОУ-АВТ

**Дата:** 2026-08-01
**Статус:** дизайн утверждён (редакция 2)
**Заменяет:** редакцию 1 от 2026-08-01

## История документа

Редакция 1 была написана до того, как в `review-project` влились три крупные ветки: правки бэкенда (RBAC, привязка сессий, локализация ошибок во времени — тестов стало 128 вместо 41), переезд фронтенда на Feature-Sliced Design и docker-развёртывание. Ветка `restructure` реализовала первую половину редакции 1 (`domain/`, `simulation/`, `tutor/`, `ml/`), но осталась невлитой и устарела.

Настоящая редакция учитывает текущее состояние кода и исправляет ошибку слоёв, допущенную в редакции 1 (см. «Расщепление security.py»).

## Зачем

В корне репозитория лежат пять папок кода — `backend/`, `simulator/`, `ai_core/`, `scripts/`, `frontend/` — и шесть файлов, не относящихся к работе приложения. Границы между Python-папками проведены не по смыслу.

### Что выявил разбор

**1. `ai_core/` — не один компонент, а три с половиной.**

| Что лежит | Что это на самом деле |
|---|---|
| `predictive_engine.py` | ML-инференс: LSTM через ONNX + fallback на `numpy.polyfit` |
| `error_analyzer.py` (611 строк), `tech_regulations.py`, `sequence_alignment.py` | Экспертная система без единой строчки ML: LCS-выравнивание, дерево правил, база знаний по техрегламенту |
| `train.py`, `export_onnx.py`, `data_generator.py`, `evaluate.py`, `baselines.py` + 6.4 МБ артефактов | Офлайн-пайплайн, в рантайме не нужен никогда |
| `config.py` | Свалка констант для четырёх разных потребителей |

**2. Циклическая зависимость слоёв.** Три модуля импортируют `backend.services.scenario_manager` лениво, внутри функций, обходя цикл «домен → веб-слой»:

- `simulator/elou_avt_model.py:45`
- `ai_core/error_analyzer.py:33`
- `backend/services/ai_chat_service.py:86`

Каждый такой импорт обёрнут в `except Exception`, который молча проглатывает любую ошибку загрузки сценария.

**3. `ai_core/config.py` обслуживает четырёх потребителей сразу**: ML-гиперпараметры, пути к артефактам, пороги ПАЗ по техрегламенту, начальные состояния симуляции, веса риск-движка, тайминги эскалации алертов. Именно поэтому симулятор физики вынужден импортировать пакет с названием «ai_core» — ради `COLUMN_PRES_ESD`.

**4. Прод-образ везёт лишнее.** Рядом с рантайм-кодом лежат `telemetry_dataset.csv` (5.9 МБ), `lstm_model.pth` (208 КБ), `test_data.npz` (260 КБ) и скрипты обучения.

**5. Пакетов формально нет.** `__init__.py` есть только в `backend/routes/`; тесты добавляют корень в `sys.path` вручную.

**6. Корень захламлён.** Не относятся к работе приложения: `competency_matrix.csv`, `roles_matrix.csv` (матрицы команды), `convert_docs.py` (разовая конвертация исходников, работа выполнена), `README_HF.md` (front-matter Hugging Face), `scripts/compile_docs.py`.

## Целевая структура

```
elou-avt/
├── frontend/                     React + FSD — не меняется
├── backend/
│   ├── Dockerfile
│   ├── pyproject.toml            пакет elou_tutor, src-layout, ruff, контракты слоёв
│   ├── requirements.txt
│   ├── requirements-dev.txt
│   ├── tests/                    8 файлов, переезжают без изменения структуры
│   ├── training/                 офлайн-пайплайн, в прод-образ не попадает
│   │   ├── requirements.txt      torch и прочее тяжёлое
│   │   ├── README.md
│   │   ├── config.py             гиперпараметры обучения
│   │   ├── train.py, export_onnx.py, evaluate.py, baselines.py, data_generator.py
│   │   ├── checkpoints/lstm_model.pth
│   │   ├── data/telemetry_dataset.csv, test_data.npz
│   │   └── reports/evaluation_report.md
│   └── src/elou_tutor/
│       ├── domain/               process_limits.py, regulations.py, integrity.py
│       ├── simulation/           model.py, scenarios.py
│       ├── tutor/                analyzer.py, alignment.py
│       ├── ml/                   predictor.py, settings.py, artifacts/model.onnx(.data)
│       ├── db/                   database.py, queries.py, audit.py
│       ├── services/             simulation_loop.py, connection_manager.py,
│       │                         ai_chat_service.py, vector_store.py, net.py
│       ├── knowledge_base/       5 md-файлов для RAG
│       ├── data/scenarios.json
│       └── api/                  main.py, routes/ (7 модулей), schemas.py,
│                                 security.py, deps.py
├── docs/
│   ├── architecture.md           обновляется под новую структуру
│   ├── tools/                    convert_docs.py, compile_docs.py
│   ├── deploy/                   README_HF.md
│   ├── reference/                competency_matrix.csv, roles_matrix.csv, simulation.md
│   └── superpowers/specs/        этот документ
├── Исходные данные/              входные материалы кейса, не трогаем
├── Dockerfile                    остаётся в корне: требование Hugging Face Spaces
├── docker-compose.yml
├── Makefile, config.mk
├── README.md, .env.example
└── .github/, .gitignore, .dockerignore, .npmrc
```

В корне остаются **две папки кода вместо пяти** и ни одного файла, не относящегося к работе приложения.

### Что обязано остаться в корне

`Dockerfile` — Hugging Face Spaces с `sdk: docker` ищет его строго в корне репозитория; это требование платформы, а не соглашение проекта. `docker-compose.yml` — иначе каждый вызов `docker compose` требует `-f`. `Makefile`/`config.mk`, `.github/`, `README.md`, `.env.example` — точки входа для человека и CI.

Папка `deploy/` не создаётся: переносить в неё один только compose-файл хуже, чем не трогать ничего.

## Правило зависимостей

Стрелки только вниз, ни одной вверх:

```
api        → services, db, domain
services   → tutor, simulation, ml, db, domain
tutor      → domain
simulation → domain
ml         → domain
db         → domain
domain     → ничего из проекта (только stdlib и numpy)
```

Цикл разрывается механически: `scenario_manager` становится `simulation/scenarios.py`, то есть частью домена, а не веб-слоя. Три ленивых импорта внутри функций превращаются в обычные импорты в шапке модуля, вместе с ними уходят `except Exception`.

Правило закрепляется контрактами `import-linter` (см. «Контроль архитектуры»).

## Карта переездов

Все переносы выполняются через `git mv`, чтобы сохранить историю и работу `git log --follow`.

### backend/

| Откуда | Куда |
|---|---|
| `backend/main.py` | `api/main.py` |
| `backend/routes/*.py` (7 шт.) | `api/routes/` |
| `backend/models/schemas.py` | `api/schemas.py` |
| `backend/utils/deps.py` | `api/deps.py` |
| `backend/utils/security.py` | расщепляется, см. ниже |
| `backend/utils/net.py` | `services/net.py` |
| `backend/utils/helpers.py` | удаляется, `random_id()` переезжает в `connection_manager` |
| `backend/db/*.py` | `db/` |
| `backend/services/scenario_manager.py` | `simulation/scenarios.py` |
| `backend/services/{simulation_loop,connection_manager,ai_chat_service,vector_store}.py` | `services/` |
| `backend/knowledge_base/*.md` | `knowledge_base/` |
| `backend/data/scenarios.json` | `data/` |
| `backend/tests/*.py` (8 файлов) | `backend/tests/`, структура сохраняется |

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
| `ai_core/model.onnx`, `model.onnx.data` | `src/elou_tutor/ml/artifacts/` |
| `ai_core/lstm_model.pth` | `training/checkpoints/` |
| `ai_core/telemetry_dataset.csv`, `test_data.npz` | `training/data/` |
| `ai_core/{train,export_onnx,data_generator,evaluate,baselines}.py` | `training/` |
| `ai_core/evaluation_report.md` | `training/reports/` |
| `ai_core/README.md` | `training/README.md`, переписывается под офлайн-пайплайн |

### Корень

| Откуда | Куда |
|---|---|
| `pyproject.toml` | `backend/pyproject.toml`, переписывается под src-layout |
| `convert_docs.py`, `scripts/compile_docs.py` | `docs/tools/` (папка `scripts/` исчезает) |
| `competency_matrix.csv`, `roles_matrix.csv` | `docs/reference/` |
| `README_HF.md` | `docs/deploy/README_HF.md` |

## Расщепление `ai_core/config.py`

Разнесение — по фактическим потребителям, проверено поиском по кодовой базе.

| Константы | Куда | Кто потребляет |
|---|---|---|
| `FURNACE_TEMP_*`, `COLUMN_PRES_*`, `COLUMN_LEVEL_*`, физлимиты, `STARTUP_*`/`NORMAL_*` начальные состояния, `SESSION_MAX_TIME_SEC`, `ESCALATION_*` | `domain/process_limits.py` | `simulation/model.py`, `tutor/analyzer.py`, `services/simulation_loop.py` |
| `INPUT_DIM`, `HIDDEN_DIM`, `NUM_LAYERS`, `OUTPUT_DIM`, `DROPOUT`, `SEQUENCE_LENGTH`, `FORECAST_HORIZON`, `SCALER_*`, `OUT_*`, `RISK_WEIGHT_*`, `RISK_PENALTY_NO_FEED`, `ONNX_PATH` | `ml/settings.py` | `ml/predictor.py`, офлайн-пайплайн |
| `LEARNING_RATE`, `EPOCHS`, `BATCH_SIZE`, `TRAIN_SPLIT`/`VAL_SPLIT`/`TEST_SPLIT`, `RANDOM_SEED`, `RISK_THRESHOLD`, `DATASET_PATH`, `MODEL_PATH` | `training/config.py` | только `train.py`, `evaluate.py` |

Дублирования нормировочных констант не будет: офлайн-пайплайн импортирует `elou_tutor.ml.settings` из установленного пакета. Направление зависимости — «офлайн → рантайм»; обратной нет, поэтому прод-образ про папку `training/` ничего не знает.

## Расщепление `security.py`

**Это исправление ошибки редакции 1**, которая предлагала перенести файл целиком в `api/`. Проверка потребителей показала, что так возникают восходящие зависимости `db → api` и `services → api` — ровно те, которые документ сам и запрещает.

| Функции | Куда | Кто потребляет |
|---|---|---|
| `calculate_integrity_hash`, `_legacy_integrity_hash`, `verify_integrity_hash` | `domain/integrity.py` | `db/queries.py`, `services/connection_manager.py` |
| `get_password_hash`, `verify_password` | `domain/credentials.py` | `db/database.py` (сидирование), `api/security.py` (вход) |
| `log_audit_event`, `log_audit_event_async`, `verify_audit_chain` | `db/audit.py` | `api/main.py`, `api/routes/*`, `services/*` |
| `create_jwt_token`, `verify_jwt_token`, `check_fail_to_ban`, `record_failed_login`, `reset_failed_login` | `api/security.py` | только `api/` |

Хэширование целостности и хэширование паролей попадают в `domain`, потому что это чистые криптографические функции: зависят лишь от библиотеки хэширования и соли из окружения, никакой предметной логики не содержат. Аудит попадает в `db`, потому что пишет в таблицу. JWT и fail-to-ban остаются в `api` — других потребителей у них нет.

Разделение паролей и JWT принципиально: `db/database.py` в функции `seed_users()` нуждается в `get_password_hash` при первичном создании базы. Если бы хэширование осталось в `api/security.py`, возникла бы восходящая зависимость `db → api` — либо на уровне модуля (нарушение правила слоёв), либо в виде ленивого импорта внутри функции (обход правила, который пришлось бы объявлять исключением в контракте). Перенос в `domain` снимает вопрос: обе стороны зависят вниз, контракты остаются без единого исключения.

Переменные `INTEGRITY_SALT` и `SECRET_KEY` читаются в тех модулях, где используются: соль — в `domain/integrity.py`, ключ подписи — в `api/security.py`. Поведение «падать на импорте, если переменная не задана» сохраняется.

## Сопутствующие решения

### Удаление torch-ветки из рантайм-предиктора

`predictive_engine.py` умеет грузить `lstm_model.pth` через PyTorch, если ONNX недоступен. В проде эта ветка недостижима: `torch` отсутствует в `requirements.txt` и не появлялся там ни разу за всю историю репозитория. Это осознанное решение, а не упущение:

- коммит `343a488 fix(backend): Устранено превышение лимита памяти на Render (<512 MB)`;
- в `requirements.txt` закомментированы `sentence-transformers` и `faiss-cpu` с пометкой про лимит 512 МБ;
- `docs/ai_architecture.md` прямо описывает обучение в Colab и экспорт в `.onnx` ради инференса на CPU без PyTorch.

Torch-ветка удаляется (~40 строк). В рантайме остаются ONNX-инференс и математический fallback на `numpy.polyfit`.

### Воспроизводимость обучения

Сейчас офлайн-пайплайн запустить не на чем: `torch` не описан ни в одном файле зависимостей. Появляется `backend/training/requirements.txt` с тяжёлыми зависимостями обучения. В прод-образ он не попадает.

### Адрес LLM в конфигурацию

`ai_chat_service.py:159` хардкодит `http://127.0.0.1:1234/v1/chat/completions` — локальный LM Studio. Внутри контейнера `127.0.0.1` указывает на сам контейнер, поэтому ИИ-чат в Docker не работает. Адрес выносится в переменную окружения `LLM_BASE_URL`; в `docker-compose.yml` для неё задаётся `http://host.docker.internal:1234`, в `.env.example` — значение для локального запуска.

Асимметрия устраняется: в `routes/health.py` аналогичный адрес уже вынесен в `LLM_HEALTH_URL`, обе переменные выводятся из одной базы.

### Растворение `helpers.py`

Файл состоит из одной функции `random_id()`, у которой ровно один потребитель — `connection_manager.py:309` (суффикс к идентификатору записи журнала). Функция переезжает туда, файл удаляется.

### Упаковка неисполняемых файлов

Внутри пакета лежат не только `.py`: `data/scenarios.json`, пять markdown-файлов `knowledge_base/`, `ml/artifacts/model.onnx` и `model.onnx.data`. При src-layout они не попадут в установленный пакет автоматически — в `backend/pyproject.toml` их нужно объявить как package data. Иначе dev-режим (`pip install -e`) работает, а Docker-сборка падает на чтении сценариев или модели. Проверяется отдельным шагом миграции.

## Контроль архитектуры

Контракты `import-linter` и настройки `ruff` переезжают из корневого `pyproject.toml` в `backend/pyproject.toml`. Джобам CI добавляется `working-directory: backend`.

Контракты переписываются с приблизительных (`backend` / `simulator` / `ai_core`) на настоящие слои:

| Контракт | Что проверяет |
|---|---|
| Слои пакета | `api` → `services` → `db`/`domain`; ни одной стрелки вверх |
| Домен автономен | `domain` не импортирует ничего из `elou_tutor` |
| Симуляция и тьютор | `simulation`, `tutor` зависят только от `domain` |
| Инференс | `ml` зависит только от `domain` |
| Офлайн-пайплайн | `training` не импортируется из пакета (только наоборот) |

После миграции исчезает надобность в трёх `ignore_imports`, которые сейчас документируют ленивые импорты: цикла больше нет.

## Порядок миграции

Снизу вверх по графу зависимостей — на каждом шаге кодовая база остаётся рабочей.

1. **Каркас.** `backend/src/elou_tutor/`, `pyproject.toml` со src-layout и package data, `__init__.py` во всех пакетах, `pip install -e backend`.
2. **`domain/`.** Расщепление `config.py`, перенос регламентов, выделение `integrity.py`. Слой ни от чего не зависит, поэтому первый.
3. **`simulation/`.** Модель процесса и реестр сценариев. Здесь исчезает цикл: ленивые импорты становятся обычными.
4. **`tutor/` и `ml/`.** Оба смотрят только в `domain`. Здесь же удаляется torch-ветка.
5. **`db/`, `services/`, `api/`.** Верхний слой, переезжает последним. Здесь же `db/audit.py`, `api/security.py`, `services/net.py`, `LLM_BASE_URL` и растворение `helpers.py`.
6. **Офлайн-пайплайн.** `backend/training/`: скрипты, `requirements.txt`, `config.py`, импорт настроек из установленного пакета.
7. **Корень.** CSV-матрицы, `convert_docs.py`, `compile_docs.py`, `README_HF.md` → `docs/`; папка `scripts/` исчезает.
8. **Инфраструктура.** Оба Dockerfile, `docker-compose.yml`, `Makefile`, `config.mk`, `package.json`, обе джобы CI, контракты слоёв, `README.md` и `docs/architecture.md`.

Контрольная точка после каждого шага — прогон тестов. После шага 8 — полная пересборка образов и проверка живого стека.

## Стратегия относительно ветки `restructure`

Ветка не мержится и не ребейзится, а архивируется. Обоснование измерено:

| | Файлов | Изменений |
|---|---|---|
| `restructure` | 32 | +298 / −215 |
| `review-project` с общего предка | 134 | +6205 / −2097 |

Пересекаются 9 файлов, причём правки `restructure` в них — обновление строк импорта (`+3/−3`, `+1/−1`, `+4/−4`). Вся ценность ветки в `git mv`, а перемещённые ею файлы — дореформенные версии: `connection_manager.py` и `simulation_loop.py` с тех пор выросли на +122 строки каждый. Мерж или ребейз означал бы разрешение конфликтов между переименованиями и крупными правками с риском молча откатить работу бэкенда.

Повторение переезда на актуальном коде дешевле и безопаснее. Спека и план из ветки сохраняются — они и служат чертежом.

## Критерии готовности

- `pytest` в `backend/` проходит целиком; тестов не меньше 128.
- `lint-imports` подтверждает новый граф; ни одного ленивого импорта ради обхода цикла и ни одного `except Exception` вокруг загрузки сценария.
- `ruff check .` проходит; обе джобы CI зелёные.
- `make start` поднимает стек; проходят: вход `operator_1`, WebSocket-телеметрия, запуск сценария, инъекция дефекта инструктором, завершение сессии со ScoreCard.
- Прод-образ не содержит `telemetry_dataset.csv`, `.pth` и скриптов обучения (проверяется `docker compose exec backend ls`).
- В корне репозитория нет файлов, не относящихся к работе приложения.
- `git log --follow` работает для перенесённых файлов.

## Что не входит в объём

- Фронтенд не затрагивается: ни один файл в `frontend/` не двигается и не правится.
- Схема БД, API-контракты и формат WebSocket-сообщений не меняются — реорганизация не должна быть заметна снаружи.
- Логика симулятора, тьютора и предиктора не переписывается: переносятся файлы и правятся импорты. Содержательные правки ограничены четырьмя: удаление мёртвой torch-ветки, расщепление `security.py`, `LLM_BASE_URL`, растворение `helpers.py`.
- Разделение на отдельные устанавливаемые пакеты (`packages/`) отклонено: второго потребителя у симулятора и тьютора нет, а четыре `pyproject.toml` с editable-установками — накладные расходы без выгоды.
- Папка «Исходные данные/» остаётся в корне: это входные материалы кейса, а не артефакт разработки.

## Последствия

**Плюсы.** В корне остаются `frontend/` и `backend/` — разделение, которое и требовалось. Зависимости становятся однонаправленными и проверяемыми машинно. Прод-образ теряет 6.4 МБ артефактов и скрипты обучения. Импорты (`elou_tutor.simulation.model`) однозначны, `sys.path`-хаки уходят. Обучение модели становится воспроизводимым.

**Минусы.** Затрагивается почти каждый Python-файл — параллельные ворктри придётся ребейзить, конфликты будут механическими (пути импортов). Внешние ссылки на файлы по старым путям (документы, презентация) устареют. Импорты становятся длиннее. Четыре коммита ветки `restructure` выбрасываются, их содержимое воспроизводится заново.
