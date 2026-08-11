# Реорганизация структуры проекта — план реализации

> **Для агентов:** ОБЯЗАТЕЛЬНЫЙ САБ-СКИЛЛ: используйте superpowers:subagent-driven-development (рекомендуется) или superpowers:executing-plans для выполнения задача-за-задачей. Шаги размечены чекбоксами (`- [ ]`).

**Цель:** свести весь Python в пакет `elou_tutor` внутри `backend/`, развязать слои, вынести офлайн-обучение из прод-образа и очистить корень репозитория — не меняя поведения системы.

**Архитектура:** src-layout, один устанавливаемый пакет `elou_tutor` со слоями `domain → simulation/tutor/ml/db → services → api`. Зависимости направлены строго вниз и закреплены контрактами `import-linter`. Офлайн-пайплайн обучения живёт в `backend/training/` и в образ не копируется. Миграция идёт снизу вверх по графу: после каждой задачи код рабочий и тесты зелёные.

**Стек:** Python 3.12, FastAPI, uvicorn, ONNX Runtime, SQLite, pytest, ruff, import-linter, Docker Compose, setuptools.

**Спека:** [docs/superpowers/specs/2026-08-01-project-structure-design.md](../specs/2026-08-01-project-structure-design.md) (редакция 2)

## Глобальные ограничения

- Все переносы файлов — **только через `git mv`**, иначе рвётся история и `git log --follow`.
- Поведение системы не меняется: схема БД, REST-контракты и формат WebSocket-пакета остаются прежними.
- Содержательные правки разрешены ровно четыре: удаление torch-ветки из рантайм-предиктора, расщепление `security.py` по слоям, вынос адреса LLM в `LLM_BASE_URL`, растворение `helpers.py`. Остальное — перенос файлов и правка импортов.
- Каталог `frontend/` не затрагивается ни одним файлом.
- Папка `Исходные данные/` остаётся в корне без изменений.
- `Dockerfile` остаётся в корне репозитория — требование Hugging Face Spaces (`sdk: docker`).
- Имя пакета: `elou_tutor`. Точка входа приложения: `elou_tutor.api.main:app`.
- Python 3.12 (в образах и CI). Node для фронтенда — `^20.19 || >=22.12`.
- После каждой задачи прогон тестов зелёный, количество тестов не уменьшается (на старте **128**):
  `INTEGRITY_SALT=dev-salt SECRET_KEY=dev-secret pytest backend/tests -q`
- Коммит после каждой задачи, сообщения на русском в стиле существующей истории (`refactor(scope): ...`).
- **Коммиты только от имени пользователя: строку `Co-Authored-By` не добавлять ни в одно сообщение.**

## Карта файлов

| Файл | Ответственность |
|---|---|
| `backend/pyproject.toml` | Метаданные пакета, src-layout, package data, конфиг ruff и контрактов слоёв |
| `backend/src/elou_tutor/domain/process_limits.py` | Физические пороги, лимиты, начальные состояния, тайминги эскалации |
| `backend/src/elou_tutor/domain/regulations.py` | Таксономия ошибок и тексты пунктов техрегламента |
| `backend/src/elou_tutor/domain/integrity.py` | Хэш целостности записей (HMAC-SHA256 + legacy) |
| `backend/src/elou_tutor/domain/credentials.py` | Хэширование и проверка паролей (bcrypt) |
| `backend/src/elou_tutor/simulation/model.py` | Физическая модель установки |
| `backend/src/elou_tutor/simulation/scenarios.py` | Реестр учебных сценариев (CRUD по JSON) |
| `backend/src/elou_tutor/tutor/analyzer.py` | Оценка действий оператора, правила нарушений |
| `backend/src/elou_tutor/tutor/alignment.py` | LCS-выравнивание последовательностей |
| `backend/src/elou_tutor/ml/settings.py` | Гиперпараметры и нормировка инференса |
| `backend/src/elou_tutor/ml/predictor.py` | Инференс риска: ONNX + polyfit-fallback |
| `backend/src/elou_tutor/db/database.py` | Схема БД, соединение, сидирование |
| `backend/src/elou_tutor/db/queries.py` | Запросы к сессиям обучения |
| `backend/src/elou_tutor/db/audit.py` | Журнал аудита и цепочка блоков |
| `backend/src/elou_tutor/services/net.py` | Анти-SSRF проверка URL вебхука |
| `backend/src/elou_tutor/services/*.py` | Сессии, фоновый цикл, ИИ-чат, RAG |
| `backend/src/elou_tutor/api/security.py` | JWT, пароли, fail-to-ban |
| `backend/src/elou_tutor/api/deps.py` | Зависимости FastAPI для RBAC |
| `backend/src/elou_tutor/api/main.py`, `api/routes/`, `api/schemas.py` | Транспортный слой |
| `backend/training/` | Офлайн-пайплайн обучения, вне прод-образа |

---

## Задача 1: Каркас пакета

**Файлы:**
- Создать: `backend/pyproject.toml`
- Создать: `backend/src/elou_tutor/__init__.py` и `__init__.py` во всех подпакетах
- Удалить: `pyproject.toml` (корневой)

**Интерфейсы:**
- Производит: устанавливаемый пакет `elou_tutor` версии 0.1.0; `import elou_tutor` работает из любого каталога.

- [ ] **Шаг 1: Создать каркас каталогов**

```bash
cd /Users/kirill/WebstormProjects/elou-avt
mkdir -p backend/src/elou_tutor/{domain,simulation,tutor,ml/artifacts,db,services,api/routes}
for d in "" domain simulation tutor ml db services api api/routes; do
  touch "backend/src/elou_tutor/$d/__init__.py"
done
```

- [ ] **Шаг 2: Создать `backend/pyproject.toml`**

Секции ruff переносятся из корневого файла; контракты слоёв добавятся в задаче 9, когда пакет будет наполнен.

```toml
[build-system]
requires = ["setuptools>=61.0"]
build-backend = "setuptools.build_meta"

[project]
name = "elou-tutor"
version = "0.1.0"
description = "Компьютерный тренажерный комплекс ЭЛОУ-АВТ"
requires-python = ">=3.12"

[tool.setuptools.packages.find]
where = ["src"]

# Неисполняемые файлы обязаны попасть в установленный пакет: без этого
# dev-режим работает, а Docker-сборка падает на чтении сценариев или модели
[tool.setuptools.package-data]
elou_tutor = [
    "data/*.json",
    "knowledge_base/*.md",
    "ml/artifacts/*",
]

[tool.ruff]
exclude = [".venv", "training"]
line-length = 120

[tool.ruff.lint]
select = ["E4", "E7", "E9", "F"]
```

- [ ] **Шаг 3: Удалить корневой `pyproject.toml`**

```bash
git rm pyproject.toml
```

- [ ] **Шаг 4: Установить пакет в режиме разработки**

```bash
pip install -e backend
```

Ожидается: `Successfully installed elou-tutor-0.1.0`.

- [ ] **Шаг 5: Проверить импорт**

```bash
python -c "import elou_tutor; print(elou_tutor.__file__)"
```

Ожидается: путь вида `.../backend/src/elou_tutor/__init__.py`.

- [ ] **Шаг 6: Прогнать тесты (код ещё не двигали — должны проходить)**

```bash
INTEGRITY_SALT=dev-salt SECRET_KEY=dev-secret pytest backend/tests -q
```

Ожидается: `128 passed`.

- [ ] **Шаг 7: Коммит**

```bash
git add -A
git commit -m "refactor(package): каркас пакета elou_tutor со src-layout"
```

---

## Задача 2: Слой domain — физические пороги

**Файлы:**
- Создать: `backend/src/elou_tutor/domain/process_limits.py`
- Создать: `backend/tests/test_domain_limits.py`
- Модифицировать: `ai_core/config.py`, `backend/routes/ws.py`, `backend/services/simulation_loop.py`, `simulator/elou_avt_model.py`, `ai_core/error_analyzer.py`, `ai_core/baselines.py`, `ai_core/tech_regulations.py`

**Интерфейсы:**
- Производит: `elou_tutor.domain.process_limits` со всеми физическими константами. Точный состав — в шаге 3.

- [ ] **Шаг 1: Написать падающий тест**

Создать `backend/tests/test_domain_limits.py`:

```python
"""Слой domain: пороги доступны из пакета и не тянут за собой верхние слои."""

import inspect


def test_process_limits_importable_from_package():
    from elou_tutor.domain import process_limits

    assert process_limits.COLUMN_PRES_ESD == 0.48
    assert process_limits.FURNACE_TEMP_CRITICAL == 365.0
    assert process_limits.COLUMN_LEVEL_LOW_INTERLOCK == 12.0
    assert process_limits.SESSION_MAX_TIME_SEC == 300


def test_domain_does_not_import_upper_layers():
    from elou_tutor.domain import process_limits

    source = inspect.getsource(process_limits)
    for forbidden in ("elou_tutor.api", "elou_tutor.services", "elou_tutor.db", "backend."):
        assert forbidden not in source, f"domain не должен зависеть от {forbidden}"
```

- [ ] **Шаг 2: Убедиться, что тест падает**

```bash
INTEGRITY_SALT=dev-salt SECRET_KEY=dev-secret pytest backend/tests/test_domain_limits.py -q
```

Ожидается: FAIL, `ModuleNotFoundError: No module named 'elou_tutor.domain.process_limits'`.

- [ ] **Шаг 3: Создать `domain/process_limits.py`**

Скопировать из `ai_core/config.py` дословно, вместе с комментариями, блоки под заголовками: `Physical Thresholds`, `Timeouts & Duration Thresholds`, `Alert Escalation Thresholds`, `Physical Limits`, `Initial State Physics Defaults`, `Process Timing & Dynamic Thresholds`. Это 44 константы:

`FURNACE_TEMP_CRITICAL`, `FURNACE_TEMP_WARNING`, `COLUMN_TEMP_CRITICAL`, `FURNACE_TEMP_MIN_STARTUP`, `FURNACE_TEMP_MAX_SHUTDOWN`, `COLUMN_PRES_CRITICAL`, `COLUMN_PRES_ESD`, `COLUMN_PRES_WARNING`, `COLUMN_PRES_NORMAL_MAX`, `COLUMN_PRES_NORMAL_MIN`, `COLUMN_LEVEL_HIGH_CRITICAL`, `COLUMN_LEVEL_HIGH`, `COLUMN_LEVEL_LOW`, `COLUMN_LEVEL_LOW_INTERLOCK`, `COLUMN_LEVEL_LOW_CRITICAL`, `COLUMN_LEVEL_LOW_CRITICAL_LEVEL`, `COLUMN_LEVEL_BALANCE_MIN`, `COLUMN_LEVEL_BALANCE_MAX`, `STARTUP_MIN_TIME_SEC`, `SESSION_MAX_TIME_SEC`, `FURNACE_TEMP_CRITICAL_LEVEL`, `COLUMN_PRES_CRITICAL_LEVEL`, `COLUMN_LEVEL_HIGH_CRITICAL_LEVEL`, `ESCALATION_WARNING_DELAY_SEC`, `ESCALATION_CRITICAL_DELAY_SEC`, `FURNACE_TEMP_MIN_LIMIT`, `FURNACE_TEMP_MAX_LIMIT`, `COLUMN_PRES_MIN_LIMIT`, `COLUMN_PRES_MAX_LIMIT`, `COLUMN_LEVEL_MIN_LIMIT`, `COLUMN_LEVEL_MAX_LIMIT`, `STARTUP_INITIAL_TEMP`, `STARTUP_INITIAL_PRES`, `STARTUP_INITIAL_LEVEL`, `STARTUP_SETPOINT_TEMP`, `NORMAL_INITIAL_TEMP`, `NORMAL_INITIAL_PRES`, `NORMAL_INITIAL_LEVEL`, `NORMAL_SETPOINT_TEMP`, `STARTUP_HEATING_THRESHOLD_TEMP`, `STARTUP_FILLING_TIME_LIMIT_SEC`, `VALVE_ACTION_TIMEOUT_SEC`, `ACCIDENT_NON_STARTUP_MIN_TIME_SEC`, `ACCIDENT_STARTUP_MAX_TIME_SEC`.

Шапка файла:

```python
"""
Физические пороги, лимиты и начальные состояния установки ЭЛОУ-АВТ.

Значения взяты из технологического регламента. Слой domain ни от чего
в проекте не зависит — только stdlib.
"""
```

`RISK_WEIGHT_*` и `RISK_PENALTY_NO_FEED` сюда **не** переносятся: они уедут в `ml/settings.py` (задача 5).

- [ ] **Шаг 4: Прогнать новый тест**

```bash
INTEGRITY_SALT=dev-salt SECRET_KEY=dev-secret pytest backend/tests/test_domain_limits.py -q
```

Ожидается: `2 passed`.

- [ ] **Шаг 5: Переключить шестерых потребителей**

`backend/routes/ws.py` (строка 10):

```python
from elou_tutor.domain.process_limits import FURNACE_TEMP_MIN_LIMIT, FURNACE_TEMP_MAX_LIMIT
```

`backend/services/simulation_loop.py`:

```python
from elou_tutor.domain.process_limits import (
    FURNACE_TEMP_WARNING, COLUMN_PRES_WARNING, COLUMN_LEVEL_HIGH, COLUMN_LEVEL_LOW,
    SESSION_MAX_TIME_SEC, STARTUP_FILLING_TIME_LIMIT_SEC,
    FURNACE_TEMP_CRITICAL_LEVEL, COLUMN_PRES_CRITICAL_LEVEL,
    COLUMN_LEVEL_HIGH_CRITICAL_LEVEL, COLUMN_LEVEL_LOW_CRITICAL_LEVEL,
    ESCALATION_WARNING_DELAY_SEC, ESCALATION_CRITICAL_DELAY_SEC,
)
```

`simulator/elou_avt_model.py`:

```python
from elou_tutor.domain.process_limits import (
    COLUMN_PRES_ESD, FURNACE_TEMP_CRITICAL, COLUMN_LEVEL_LOW_CRITICAL,
    COLUMN_LEVEL_HIGH_CRITICAL, COLUMN_LEVEL_LOW_INTERLOCK,
    FURNACE_TEMP_MIN_LIMIT, FURNACE_TEMP_MAX_LIMIT,
    COLUMN_PRES_MIN_LIMIT, COLUMN_PRES_MAX_LIMIT,
    COLUMN_LEVEL_MIN_LIMIT, COLUMN_LEVEL_MAX_LIMIT,
    STARTUP_INITIAL_TEMP, STARTUP_INITIAL_PRES, STARTUP_INITIAL_LEVEL, STARTUP_SETPOINT_TEMP,
    NORMAL_INITIAL_TEMP, NORMAL_INITIAL_PRES, NORMAL_INITIAL_LEVEL, NORMAL_SETPOINT_TEMP,
    ACCIDENT_NON_STARTUP_MIN_TIME_SEC, ACCIDENT_STARTUP_MAX_TIME_SEC,
)
```

`ai_core/error_analyzer.py`:

```python
from elou_tutor.domain.process_limits import (
    FURNACE_TEMP_WARNING, FURNACE_TEMP_MIN_STARTUP, FURNACE_TEMP_MAX_SHUTDOWN,
    COLUMN_LEVEL_BALANCE_MIN, COLUMN_LEVEL_BALANCE_MAX, STARTUP_MIN_TIME_SEC,
)
```

`ai_core/baselines.py`:

```python
from elou_tutor.domain.process_limits import (
    FURNACE_TEMP_WARNING, FURNACE_TEMP_CRITICAL, COLUMN_LEVEL_HIGH, COLUMN_LEVEL_LOW,
)
```

`ai_core/tech_regulations.py`:

```python
from elou_tutor.domain.process_limits import (
    FURNACE_TEMP_WARNING, COLUMN_PRES_NORMAL_MIN, COLUMN_PRES_NORMAL_MAX,
    COLUMN_LEVEL_HIGH, COLUMN_LEVEL_LOW, COLUMN_LEVEL_BALANCE_MIN, COLUMN_LEVEL_BALANCE_MAX,
)
```

- [ ] **Шаг 6: Вычистить перенесённое из `ai_core/config.py`**

Удалить шесть блоков, перечисленных в шаге 3. Оставить: `Paths`, `Reproducibility`, `Model Architecture`, `Training Parameters`, `Normalization Constants`, `Risk Engine Weights`.

- [ ] **Шаг 7: Прогнать все тесты**

```bash
INTEGRITY_SALT=dev-salt SECRET_KEY=dev-secret pytest backend/tests -q
```

Ожидается: `130 passed`.

- [ ] **Шаг 8: Коммит**

```bash
git add -A
git commit -m "refactor(domain): выделен слой domain — физические пороги процесса"
```

---

## Задача 3: Слой domain — регламенты и целостность

**Файлы:**
- Переместить: `ai_core/tech_regulations.py` → `backend/src/elou_tutor/domain/regulations.py`
- Создать: `backend/src/elou_tutor/domain/integrity.py`
- Создать: `backend/src/elou_tutor/domain/credentials.py`
- Создать: `backend/tests/test_domain_integrity.py`
- Модифицировать: `backend/utils/security.py`, `ai_core/error_analyzer.py`

**Интерфейсы:**
- Потребляет: `elou_tutor.domain.process_limits` (задача 2).
- Производит:
  - `elou_tutor.domain.regulations` — `ERROR_TAXONOMY: dict`, `SEVERITY_ORDER: list`, `get_max_severity(categories) -> str`, `TECH_REGULATIONS: dict`.
  - `elou_tutor.domain.integrity` — `calculate_integrity_hash(*args) -> str`, `verify_integrity_hash(stored_hash, *args) -> bool`.
  - `elou_tutor.domain.credentials` — `get_password_hash(password: str) -> str`, `verify_password(plain: str, hashed: str) -> bool`.

- [ ] **Шаг 1: Написать падающий тест**

Создать `backend/tests/test_domain_integrity.py`:

```python
"""Хэш целостности и регламенты: переезд в domain не меняет поведение."""


def test_hash_is_deterministic_and_field_separated():
    from elou_tutor.domain.integrity import calculate_integrity_hash

    assert calculate_integrity_hash("ab", "c") == calculate_integrity_hash("ab", "c")
    # Разделитель полей: склейка не должна давать коллизию
    assert calculate_integrity_hash("ab", "c") != calculate_integrity_hash("a", "bc")


def test_verify_accepts_own_hash_and_rejects_tampering():
    from elou_tutor.domain.integrity import calculate_integrity_hash, verify_integrity_hash

    payload = ("operator_1", "operator", "startup", 87)
    stored = calculate_integrity_hash(*payload)

    assert verify_integrity_hash(stored, *payload) is True
    assert verify_integrity_hash(stored, "operator_1", "operator", "startup", 100) is False


def test_regulations_importable_from_domain():
    from elou_tutor.domain.regulations import TECH_REGULATIONS, get_max_severity

    assert isinstance(TECH_REGULATIONS, dict) and TECH_REGULATIONS
    assert isinstance(get_max_severity(["P1_DRY_HEAT"]), str)


def test_password_hashing_lives_in_domain():
    """Хэширование паролей — чистая криптография, доступная и слою db, и слою api."""
    from elou_tutor.domain.credentials import get_password_hash, verify_password

    hashed = get_password_hash("Ktk_2026!")

    assert hashed != "Ktk_2026!"
    assert verify_password("Ktk_2026!", hashed) is True
    assert verify_password("неверный", hashed) is False
```

- [ ] **Шаг 2: Убедиться, что тест падает**

```bash
INTEGRITY_SALT=dev-salt SECRET_KEY=dev-secret pytest backend/tests/test_domain_integrity.py -q
```

Ожидается: FAIL, `ModuleNotFoundError: No module named 'elou_tutor.domain.integrity'`.

- [ ] **Шаг 3: Перенести регламенты**

```bash
git mv ai_core/tech_regulations.py backend/src/elou_tutor/domain/regulations.py
```

- [ ] **Шаг 4: Создать `domain/integrity.py`**

Перенести из `backend/utils/security.py` функции `calculate_integrity_hash`, `_legacy_integrity_hash`, `verify_integrity_hash`, константу `_FIELD_SEPARATOR` и объявление `SECRET_SALT`. Шапка файла:

```python
"""
Криптографический контроль целостности записей.

Чистая функция над полями записи: зависит только от stdlib и секретной соли
из окружения. Потребители — слой db (сверка при чтении) и services (подпись
при сохранении сессии).
"""

import hashlib
import hmac
import os

SECRET_SALT = os.environ.get("INTEGRITY_SALT")
if not SECRET_SALT:
    raise ValueError("Критическая ошибка: переменная окружения INTEGRITY_SALT не задана!")

# Разделитель полей: без него ("ab", "c") и ("a", "bc") дали бы одинаковый хэш
_FIELD_SEPARATOR = "\x1f"
```

Тела трёх функций копируются дословно.

- [ ] **Шаг 4b: Создать `domain/credentials.py`**

Перенести из `backend/utils/security.py` объект `pwd_context` и функции `get_password_hash`, `verify_password`. Файл целиком:

```python
"""
Хэширование и проверка паролей.

Чистая криптография без предметной логики, поэтому живёт в domain: нужна
и слою db (первичное сидирование пользователей), и слою api (проверка входа).
Если бы функции остались в api, возникла бы восходящая зависимость db → api.
"""

from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def get_password_hash(password: str) -> str:
    """Возвращает bcrypt-хэш пароля."""
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Сверяет пароль с сохранённым хэшем."""
    return pwd_context.verify(plain_password, hashed_password)
```

- [ ] **Шаг 5: Вычистить `security.py` и оставить временные реэкспорты**

Из `backend/utils/security.py` удалить: три функции целостности, `_FIELD_SEPARATOR`, `SECRET_SALT`, `pwd_context`, `get_password_hash`, `verify_password`. Добавить в шапку реэкспорты — они нужны, пока `db/queries.py`, `db/database.py` и `connection_manager.py` не переехали (задачи 6 и 7):

```python
from elou_tutor.domain.credentials import get_password_hash, verify_password  # noqa: F401
from elou_tutor.domain.integrity import calculate_integrity_hash, verify_integrity_hash  # noqa: F401
```

- [ ] **Шаг 6: Переключить потребителя регламентов**

Узнать точный список импортируемых имён:

```bash
grep -n "from ai_core.tech_regulations import" -A6 ai_core/error_analyzer.py
```

и заменить путь модуля на `elou_tutor.domain.regulations`, сохранив список имён без изменений.

- [ ] **Шаг 7: Прогнать все тесты**

```bash
INTEGRITY_SALT=dev-salt SECRET_KEY=dev-secret pytest backend/tests -q
```

Ожидается: `134 passed`.

- [ ] **Шаг 8: Коммит**

```bash
git add -A
git commit -m "refactor(domain): регламенты и хэш целостности перенесены в domain"
```

---

## Задача 4: Слой simulation — модель, сценарии, разрыв цикла

**Файлы:**
- Переместить: `simulator/elou_avt_model.py` → `backend/src/elou_tutor/simulation/model.py`
- Переместить: `backend/services/scenario_manager.py` → `backend/src/elou_tutor/simulation/scenarios.py`
- Переместить: `backend/data/scenarios.json` → `backend/src/elou_tutor/data/scenarios.json`
- Переместить: `simulator/README.md` → `docs/reference/simulation.md`
- Создать: `backend/tests/test_simulation_layer.py`

**Интерфейсы:**
- Потребляет: `elou_tutor.domain.process_limits`.
- Производит:
  - `elou_tutor.simulation.model.ELOUAVTSimulator` — `reset(scenario_id="shutdown")`, `set_valve(valve_id, state)`, `set_setpoint(name, value)`, `set_defect(defect_id, state)`, `step()`, `get_state() -> dict`, `get_snapshot() -> dict`, `load_snapshot(snapshot)`.
  - `elou_tutor.simulation.scenarios` — `load_scenarios() -> list[dict]`, `get_scenario_by_id(scenario_id) -> dict | None`, `add_custom_scenario(data) -> tuple[bool, str]`, `delete_scenario(scenario_id) -> tuple[bool, str]`, `SCENARIOS_FILE_PATH: str`.

- [ ] **Шаг 1: Написать падающий тест**

Создать `backend/tests/test_simulation_layer.py`:

```python
"""Слой simulation: модель и реестр сценариев без обходных импортов."""

import inspect
import os


def test_model_and_scenarios_importable():
    from elou_tutor.simulation.model import ELOUAVTSimulator
    from elou_tutor.simulation.scenarios import get_scenario_by_id

    sim = ELOUAVTSimulator()
    sim.reset("startup")
    assert sim.sensors["T_1"] == 20.0
    assert get_scenario_by_id("startup")["id"] == "startup"


def test_scenario_import_is_module_level():
    """Цикл разорван: импорт реестра стоит в шапке модуля, а не внутри reset()."""
    from elou_tutor.simulation import model

    source = inspect.getsource(model)
    assert "from elou_tutor.simulation.scenarios import" in source
    assert "from backend." not in source, "остался импорт веб-слоя"


def test_package_data_scenarios_resolvable():
    """scenarios.json лежит внутри пакета и находится без переменной окружения."""
    from elou_tutor.simulation import scenarios

    assert os.path.isfile(scenarios.SCENARIOS_FILE_PATH)
```

- [ ] **Шаг 2: Убедиться, что тест падает**

```bash
INTEGRITY_SALT=dev-salt SECRET_KEY=dev-secret pytest backend/tests/test_simulation_layer.py -q
```

Ожидается: FAIL, `ModuleNotFoundError: No module named 'elou_tutor.simulation.model'`.

- [ ] **Шаг 3: Перенести файлы**

```bash
mkdir -p backend/src/elou_tutor/data docs/reference
git mv simulator/elou_avt_model.py backend/src/elou_tutor/simulation/model.py
git mv backend/services/scenario_manager.py backend/src/elou_tutor/simulation/scenarios.py
git mv backend/data/scenarios.json backend/src/elou_tutor/data/scenarios.json
git mv simulator/README.md docs/reference/simulation.md
rmdir simulator backend/data 2>/dev/null || true
```

- [ ] **Шаг 4: Починить путь к реестру в `scenarios.py`**

Заменить вычисление `SCENARIOS_FILE_PATH` на:

```python
_PACKAGE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SCENARIOS_FILE_PATH = os.environ.get(
    "SCENARIOS_PATH", os.path.join(_PACKAGE_DIR, "data", "scenarios.json")
)
```

Переменная `SCENARIOS_PATH` сохраняется — на ней держится изоляция тестов в `conftest.py`.

- [ ] **Шаг 5: Разорвать цикл в `model.py`**

В шапку модуля добавить:

```python
from elou_tutor.simulation.scenarios import get_scenario_by_id
```

В методе `reset()` заменить блок

```python
        try:
            from backend.services.scenario_manager import get_scenario_by_id
            scenario = get_scenario_by_id(scenario_id)
        except Exception:
            scenario = None
```

на одну строку:

```python
        scenario = get_scenario_by_id(scenario_id)
```

- [ ] **Шаг 6: Снять ленивые импорты у двух других потребителей**

В `ai_core/error_analyzer.py` (строка 33) и `backend/services/ai_chat_service.py` (строка 86) точно так же перенести `get_scenario_by_id` в шапку файла и удалить обёртку `try/except Exception`:

```python
from elou_tutor.simulation.scenarios import get_scenario_by_id
```

- [ ] **Шаг 7: Переключить остальных потребителей**

Заменить `from simulator.elou_avt_model import ELOUAVTSimulator` на `from elou_tutor.simulation.model import ELOUAVTSimulator` в `backend/services/connection_manager.py`, `backend/services/simulation_loop.py`, `ai_core/data_generator.py`, `ai_core/baselines.py` и файлах `backend/tests/`.

Заменить `from backend.services.scenario_manager import ...` на `from elou_tutor.simulation.scenarios import ...` в `backend/routes/scenarios.py` и `backend/tests/test_scoring_and_speed.py`.

Проверить, что не осталось ссылок:

```bash
grep -rn "simulator\.elou_avt_model\|scenario_manager" backend ai_core
```

Ожидается: пусто.

- [ ] **Шаг 8: Прогнать все тесты**

```bash
INTEGRITY_SALT=dev-salt SECRET_KEY=dev-secret pytest backend/tests -q
```

Ожидается: `137 passed`.

- [ ] **Шаг 9: Коммит**

```bash
git add -A
git commit -m "refactor(simulation): выделен слой simulation, разорван цикл через реестр сценариев"
```

---

## Задача 5: Слои tutor и ml, удаление torch-ветки

**Файлы:**
- Переместить: `ai_core/error_analyzer.py` → `backend/src/elou_tutor/tutor/analyzer.py`
- Переместить: `ai_core/sequence_alignment.py` → `backend/src/elou_tutor/tutor/alignment.py`
- Переместить: `ai_core/predictive_engine.py` → `backend/src/elou_tutor/ml/predictor.py`
- Переместить: `ai_core/model.onnx`, `ai_core/model.onnx.data` → `backend/src/elou_tutor/ml/artifacts/`
- Создать: `backend/src/elou_tutor/ml/settings.py`
- Создать: `backend/tests/test_ml_runtime.py`

**Интерфейсы:**
- Потребляет: `elou_tutor.domain.process_limits`, `elou_tutor.domain.regulations`.
- Производит:
  - `elou_tutor.tutor.analyzer.ErrorAnalyzer.evaluate_session(actions, scenario_id, defects_triggered=None, final_sensors=None, time_elapsed=0, timeline=None) -> tuple[int, list[dict], list[str], str]` — **ровно 4 элемента**.
  - `elou_tutor.tutor.alignment.calculate_lcs_alignment(operator_actions, golden_actions) -> float` (0…100).
  - `elou_tutor.ml.predictor.RiskPredictor.predict_risk(window_data, time_elapsed=100, scenario_id="shutdown") -> tuple[list[float], float]`.
  - `elou_tutor.ml.settings` — `ONNX_PATH`, `INPUT_DIM`, `HIDDEN_DIM`, `NUM_LAYERS`, `OUTPUT_DIM`, `DROPOUT`, `SEQUENCE_LENGTH`, `FORECAST_HORIZON`, `SCALER_MIN`, `SCALER_MAX`, `OUT_MIN`, `OUT_MAX`, `RISK_WEIGHT_TEMP`, `RISK_WEIGHT_PRES`, `RISK_WEIGHT_LEVEL`, `RISK_PENALTY_NO_FEED`.

- [ ] **Шаг 1: Написать падающий тест**

Создать `backend/tests/test_ml_runtime.py`:

```python
"""Рантайм-инференс: ONNX внутри пакета, torch-ветки нет."""

import inspect
import os

import numpy as np


def test_predictor_importable_and_predicts():
    from elou_tutor.ml.predictor import RiskPredictor

    predictor = RiskPredictor()
    window = np.tile(np.array([1.0, 0.0, 1.0, 280.0, 280.0, 0.25, 50.0]), (30, 1))
    predictions, risk = predictor.predict_risk(window, time_elapsed=100, scenario_id="shutdown")

    assert len(predictions) == 3
    assert 0.0 <= risk <= 100.0


def test_torch_branch_removed():
    """torch отсутствует в зависимостях, поэтому ветка недостижима и удалена."""
    from elou_tutor.ml import predictor

    source = inspect.getsource(predictor)
    assert "import torch" not in source
    assert "lstm_model.pth" not in source


def test_onnx_artifact_is_package_data():
    from elou_tutor.ml import settings

    assert os.path.isfile(settings.ONNX_PATH), "model.onnx должен лежать внутри пакета"


def test_tutor_returns_four_values():
    from elou_tutor.tutor.analyzer import ErrorAnalyzer

    result = ErrorAnalyzer().evaluate_session(["V1_OPEN", "SP_UP", "V3_OPEN"], "startup")
    assert len(result) == 4
```

- [ ] **Шаг 2: Убедиться, что тест падает**

```bash
INTEGRITY_SALT=dev-salt SECRET_KEY=dev-secret pytest backend/tests/test_ml_runtime.py -q
```

Ожидается: FAIL, `ModuleNotFoundError: No module named 'elou_tutor.ml.predictor'`.

- [ ] **Шаг 3: Перенести файлы**

```bash
git mv ai_core/error_analyzer.py backend/src/elou_tutor/tutor/analyzer.py
git mv ai_core/sequence_alignment.py backend/src/elou_tutor/tutor/alignment.py
git mv ai_core/predictive_engine.py backend/src/elou_tutor/ml/predictor.py
git mv ai_core/model.onnx backend/src/elou_tutor/ml/artifacts/model.onnx
git mv ai_core/model.onnx.data backend/src/elou_tutor/ml/artifacts/model.onnx.data
```

- [ ] **Шаг 4: Создать `ml/settings.py`**

```python
"""
Параметры рантайм-инференса модели риска.

Гиперпараметры архитектуры и нормировка должны совпадать с использованными
при обучении: офлайн-пайплайн импортирует этот же модуль.
"""

import os

import numpy as np

_ARTIFACTS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "artifacts")
ONNX_PATH = os.path.join(_ARTIFACTS_DIR, "model.onnx")

# Архитектура сети
INPUT_DIM = 7        # [V_1, V_2, V_3, T_1_Sp, T_1, P_1, L_1]
HIDDEN_DIM = 64
NUM_LAYERS = 2
OUTPUT_DIM = 3       # [T_1, P_1, L_1]
DROPOUT = 0.2
SEQUENCE_LENGTH = 30
FORECAST_HORIZON = 15

# Нормировка входа и выхода
SCALER_MIN = np.array([0.0, 0.0, 0.0, 100.0, 20.0, 0.02, 0.0], dtype=np.float32)
SCALER_MAX = np.array([1.0, 1.0, 1.0, 400.0, 600.0, 1.5, 100.0], dtype=np.float32)
OUT_MIN = np.array([20.0, 0.02, 0.0], dtype=np.float32)
OUT_MAX = np.array([600.0, 1.5, 100.0], dtype=np.float32)

# Веса риск-движка
RISK_WEIGHT_TEMP = 45.0
RISK_WEIGHT_PRES = 55.0
RISK_WEIGHT_LEVEL = 20.0
RISK_PENALTY_NO_FEED = 12.5
```

- [ ] **Шаг 5: Удалить torch-ветку из `ml/predictor.py`**

Удалить: блок `try: import torch ... except ImportError`, класс `RiskLSTM` целиком, ветку загрузки `.pth` в `__init__` и ветку инференса `with torch.no_grad()`. Оставить загрузку ONNX-сессии и `_run_mathematical_fallback`.

Импорты заменить на:

```python
from elou_tutor.ml.settings import (
    ONNX_PATH, INPUT_DIM, OUTPUT_DIM, SEQUENCE_LENGTH,
    SCALER_MIN, SCALER_MAX, OUT_MIN, OUT_MAX,
    RISK_WEIGHT_TEMP, RISK_WEIGHT_PRES, RISK_WEIGHT_LEVEL, RISK_PENALTY_NO_FEED,
)
from elou_tutor.domain.process_limits import (
    FURNACE_TEMP_CRITICAL, FURNACE_TEMP_WARNING, COLUMN_PRES_WARNING, COLUMN_PRES_ESD,
    COLUMN_LEVEL_HIGH, COLUMN_LEVEL_LOW, COLUMN_LEVEL_LOW_INTERLOCK,
    COLUMN_LEVEL_HIGH_CRITICAL, COLUMN_LEVEL_LOW_CRITICAL,
    STARTUP_HEATING_THRESHOLD_TEMP, STARTUP_FILLING_TIME_LIMIT_SEC, VALVE_ACTION_TIMEOUT_SEC,
)
```

- [ ] **Шаг 6: Обновить импорт внутри `tutor/`**

В `tutor/analyzer.py` заменить `from ai_core.sequence_alignment import calculate_lcs_alignment` на:

```python
from elou_tutor.tutor.alignment import calculate_lcs_alignment
```

- [ ] **Шаг 7: Переключить потребителей**

В `backend/services/connection_manager.py`:

```python
from elou_tutor.tutor.analyzer import ErrorAnalyzer
from elou_tutor.ml.predictor import RiskPredictor
```

Найти оставшиеся ссылки (кроме офлайн-скриптов, которые переедут в задаче 8):

```bash
grep -rn "ai_core\." backend
```

Ожидается: только импорты в `backend/tests/` — их править тем же способом.

- [ ] **Шаг 8: Прогнать все тесты**

```bash
INTEGRITY_SALT=dev-salt SECRET_KEY=dev-secret pytest backend/tests -q
```

Ожидается: `141 passed`.

- [ ] **Шаг 9: Коммит**

```bash
git add -A
git commit -m "refactor(tutor,ml): выделены слои tutor и ml, удалена недостижимая torch-ветка"
```

---

## Задача 6: Слой db и аудит

**Файлы:**
- Переместить: `backend/db/database.py`, `backend/db/queries.py` → `backend/src/elou_tutor/db/`
- Создать: `backend/src/elou_tutor/db/audit.py`
- Создать: `backend/tests/test_db_layer.py`
- Модифицировать: `backend/utils/security.py`

**Интерфейсы:**
- Потребляет: `elou_tutor.domain.integrity`.
- Производит:
  - `elou_tutor.db.database` — `get_db_connection()` (контекстный менеджер), `init_db()`, `seed_users()`, `DB_PATH: str`.
  - `elou_tutor.db.queries` — `get_all_sessions() -> list[dict]`, `clear_all_sessions()`, `save_session_db(...)`.
  - `elou_tutor.db.audit` — `log_audit_event(actor: str, action: str, details: str)`, `log_audit_event_async(actor, action, details)` (корутина), `verify_audit_chain() -> tuple[bool, int | None]`.

- [ ] **Шаг 1: Написать падающий тест**

Создать `backend/tests/test_db_layer.py`:

```python
"""Слой db: запросы и аудит доступны из пакета, цепочка блоков цела."""


def test_db_modules_importable():
    from elou_tutor.db.database import get_db_connection, init_db
    from elou_tutor.db.queries import get_all_sessions

    init_db()
    assert callable(get_db_connection)
    assert isinstance(get_all_sessions(), list)


def test_audit_chain_valid_after_writes():
    from elou_tutor.db.audit import log_audit_event, verify_audit_chain

    log_audit_event("tester", "MIGRATION_PROBE", "проверка цепочки аудита")
    is_valid, broken_id = verify_audit_chain()

    assert is_valid is True
    assert broken_id is None
```

- [ ] **Шаг 2: Убедиться, что тест падает**

```bash
INTEGRITY_SALT=dev-salt SECRET_KEY=dev-secret pytest backend/tests/test_db_layer.py -q
```

Ожидается: FAIL, `ModuleNotFoundError: No module named 'elou_tutor.db.database'`.

- [ ] **Шаг 3: Перенести файлы**

```bash
git mv backend/db/database.py backend/src/elou_tutor/db/database.py
git mv backend/db/queries.py backend/src/elou_tutor/db/queries.py
rmdir backend/db 2>/dev/null || true
```

- [ ] **Шаг 4: Создать `db/audit.py`**

Перенести из `backend/utils/security.py` функции `log_audit_event`, `log_audit_event_async`, `verify_audit_chain`. Шапка файла:

```python
"""
Журнал аудита с цепочкой блоков.

Каждая запись включает хэш предыдущей (prev_hash), поэтому удаление строки
обнаруживается так же, как её правка. Слой db: пишет в таблицу audit_logs.
"""

import asyncio
import logging
import random
import time

from elou_tutor.db.database import get_db_connection
from elou_tutor.domain.integrity import calculate_integrity_hash

logger = logging.getLogger(__name__)
```

Тела функций копируются дословно; вызов `random_id()` заменяется на `random.randint(1, 999)`, если он там есть.

- [ ] **Шаг 5: Обновить импорты внутри перенесённых файлов**

В `db/queries.py`:

```python
from elou_tutor.domain.integrity import verify_integrity_hash
```

В `db/database.py` функция `seed_users()` нуждается в хэшировании пароля. Оно живёт в `domain/credentials.py` (задача 3, шаг 4b), поэтому импорт обычный, в шапке модуля — зависимость `db → domain` направлена вниз и правила не нарушает. Удалить ленивый импорт внутри функции, если он там был, и добавить в шапку:

```python
from elou_tutor.domain.credentials import get_password_hash
```

- [ ] **Шаг 6: Вычистить аудит из `security.py`**

Удалить из `backend/utils/security.py` три функции аудита. Оставить JWT, пароли, fail-to-ban и реэкспорт из задачи 3.

- [ ] **Шаг 7: Переключить потребителей аудита**

Найти файлы:

```bash
grep -rln "log_audit_event" backend
```

В каждом заменить импорт на:

```python
from elou_tutor.db.audit import log_audit_event, log_audit_event_async
```

(в файле берутся только реально используемые имена). Импорты `from backend.db.database import ...` и `from backend.db.queries import ...` заменить на `elou_tutor.db.*`.

- [ ] **Шаг 8: Прогнать все тесты**

```bash
INTEGRITY_SALT=dev-salt SECRET_KEY=dev-secret pytest backend/tests -q
```

Ожидается: `143 passed`.

- [ ] **Шаг 9: Коммит**

```bash
git add -A
git commit -m "refactor(db): выделен слой db, аудит отделён от криптографии api"
```

---

## Задача 7: Слои services и api

**Файлы:**
- Переместить: `backend/services/*.py` → `backend/src/elou_tutor/services/`
- Переместить: `backend/utils/net.py` → `backend/src/elou_tutor/services/net.py`
- Переместить: `backend/utils/security.py` → `backend/src/elou_tutor/api/security.py`
- Переместить: `backend/utils/deps.py` → `backend/src/elou_tutor/api/deps.py`
- Переместить: `backend/main.py` → `backend/src/elou_tutor/api/main.py`
- Переместить: `backend/routes/*.py` → `backend/src/elou_tutor/api/routes/`
- Переместить: `backend/models/schemas.py` → `backend/src/elou_tutor/api/schemas.py`
- Переместить: `backend/knowledge_base/` → `backend/src/elou_tutor/knowledge_base/`
- Удалить: `backend/utils/helpers.py`
- Создать: `backend/tests/test_api_layer.py`
- Модифицировать: `backend/tests/conftest.py` и все файлы `backend/tests/`

**Интерфейсы:**
- Потребляет: все нижние слои.
- Производит: `elou_tutor.api.main:app` — объект FastAPI, точка входа uvicorn. `elou_tutor.services.ai_chat_service.LLM_BASE_URL: str`.

- [ ] **Шаг 1: Написать падающий тест**

Создать `backend/tests/test_api_layer.py`:

```python
"""Слой api: приложение собирается из пакета, адрес LLM конфигурируем."""

import importlib
import importlib.util
import inspect


def test_app_importable_from_package():
    from elou_tutor.api.main import app

    routes = {getattr(route, "path", None) for route in app.routes}
    assert "/api/health" in routes


def test_llm_address_is_not_hardcoded():
    from elou_tutor.services import ai_chat_service

    source = inspect.getsource(ai_chat_service)
    assert "LLM_BASE_URL" in source
    assert "http://127.0.0.1:1234/v1/chat/completions" not in source


def test_llm_base_url_respects_environment(monkeypatch):
    monkeypatch.setenv("LLM_BASE_URL", "http://example.invalid:9999")
    from elou_tutor.services import ai_chat_service

    importlib.reload(ai_chat_service)
    assert ai_chat_service.LLM_BASE_URL == "http://example.invalid:9999"


def test_helpers_module_dissolved():
    assert importlib.util.find_spec("elou_tutor.utils") is None
```

- [ ] **Шаг 2: Убедиться, что тест падает**

```bash
INTEGRITY_SALT=dev-salt SECRET_KEY=dev-secret pytest backend/tests/test_api_layer.py -q
```

Ожидается: FAIL, `ModuleNotFoundError: No module named 'elou_tutor.api.main'`.

- [ ] **Шаг 3: Перенести файлы**

```bash
git mv backend/services/simulation_loop.py backend/src/elou_tutor/services/simulation_loop.py
git mv backend/services/connection_manager.py backend/src/elou_tutor/services/connection_manager.py
git mv backend/services/ai_chat_service.py backend/src/elou_tutor/services/ai_chat_service.py
git mv backend/services/vector_store.py backend/src/elou_tutor/services/vector_store.py
git mv backend/utils/net.py backend/src/elou_tutor/services/net.py
git mv backend/utils/security.py backend/src/elou_tutor/api/security.py
git mv backend/utils/deps.py backend/src/elou_tutor/api/deps.py
git mv backend/main.py backend/src/elou_tutor/api/main.py
git mv backend/models/schemas.py backend/src/elou_tutor/api/schemas.py
git mv backend/knowledge_base backend/src/elou_tutor/knowledge_base
for f in backend/routes/*.py; do
  git mv "$f" "backend/src/elou_tutor/api/routes/$(basename "$f")"
done
git rm backend/utils/helpers.py
rmdir backend/services backend/utils backend/models backend/routes 2>/dev/null || true
```

- [ ] **Шаг 4: Растворить `helpers.py`**

В `services/connection_manager.py` удалить строку `from backend.utils.helpers import random_id`, добавить `import random` к остальным импортам и заменить использование:

```python
            "id": str(int(time.time() * 1000) + random.randint(1, 999)),
```

- [ ] **Шаг 5: Вынести адрес LLM в переменную окружения**

В `services/ai_chat_service.py` рядом с `LLM_TIMEOUT_SEC` добавить:

```python
# Базовый адрес OpenAI-совместимого сервера (LM Studio). Внутри контейнера
# 127.0.0.1 указывает на сам контейнер, поэтому адрес обязан быть настраиваемым.
LLM_BASE_URL = os.environ.get("LLM_BASE_URL", "http://127.0.0.1:1234")
```

В `query_local_llm` заменить строку с адресом на:

```python
    url = f"{LLM_BASE_URL}/v1/chat/completions"
```

В `api/routes/health.py` вывести проверку живости из той же базы:

```python
LLM_BASE_URL = os.environ.get("LLM_BASE_URL", "http://127.0.0.1:1234")
LLM_HEALTH_URL = os.environ.get("LLM_HEALTH_URL", f"{LLM_BASE_URL}/v1/models")
```

- [ ] **Шаг 6: Обновить импорты во всех перенесённых файлах**

```bash
grep -rl "from backend\.\|import backend\." backend/src | while read -r f; do
  sed -i '' \
    -e 's/from backend\.services\./from elou_tutor.services./g' \
    -e 's/from backend\.db\./from elou_tutor.db./g' \
    -e 's/from backend\.models\.schemas/from elou_tutor.api.schemas/g' \
    -e 's/from backend\.utils\.security/from elou_tutor.api.security/g' \
    -e 's/from backend\.utils\.deps/from elou_tutor.api.deps/g' \
    -e 's/from backend\.utils\.net/from elou_tutor.services.net/g' \
    -e 's/from backend\.routes/from elou_tutor.api.routes/g' \
    -e 's/from backend\.main/from elou_tutor.api.main/g' \
    "$f"
done
grep -rn "backend\.\|ai_core\.\|simulator\." backend/src
```

Последняя команда должна не выдать ничего.

- [ ] **Шаг 7: Починить путь к статике в `api/main.py`**

Путь вычислялся от расположения `backend/main.py`; модуль уехал на четыре уровня глубже. Заменить вычисление `STATIC_DIR` на:

```python
# Модуль лежит в backend/src/elou_tutor/api/, фронтенд — в <корень>/frontend/dist.
# Переменная окружения позволяет образу задать путь явно.
_REPO_ROOT = os.path.abspath(
    os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "..", "..")
)
STATIC_DIR = os.environ.get("STATIC_DIR", os.path.join(_REPO_ROOT, "frontend", "dist"))
```

- [ ] **Шаг 8: Обновить `conftest.py`**

Заменить вычисление пути к эталонному реестру:

```python
_TESTS_DIR = os.path.dirname(os.path.abspath(__file__))
_BACKEND_DIR = os.path.dirname(_TESTS_DIR)

# Реестр сценариев переехал внутрь пакета
_real_scenarios = os.path.join(
    _BACKEND_DIR, "src", "elou_tutor", "data", "scenarios.json"
)
```

Остальная логика файла не меняется.

- [ ] **Шаг 9: Обновить импорты в тестах**

```bash
sed -i '' \
  -e 's/from backend\.main/from elou_tutor.api.main/g' \
  -e 's/from backend\.services\./from elou_tutor.services./g' \
  -e 's/from backend\.db\./from elou_tutor.db./g' \
  -e 's/from backend\.models\.schemas/from elou_tutor.api.schemas/g' \
  -e 's/from backend\.utils\.security/from elou_tutor.api.security/g' \
  -e 's/from backend\.utils\.deps/from elou_tutor.api.deps/g' \
  -e 's/from backend\.utils\.net/from elou_tutor.services.net/g' \
  -e 's/from backend\.routes/from elou_tutor.api.routes/g' \
  -e 's/from simulator\.elou_avt_model/from elou_tutor.simulation.model/g' \
  -e 's/from ai_core\.error_analyzer/from elou_tutor.tutor.analyzer/g' \
  -e 's/from ai_core\.sequence_alignment/from elou_tutor.tutor.alignment/g' \
  -e 's/from ai_core\.predictive_engine/from elou_tutor.ml.predictor/g' \
  -e 's/from ai_core\.tech_regulations/from elou_tutor.domain.regulations/g' \
  -e 's/from ai_core\.config/from elou_tutor.domain.process_limits/g' \
  backend/tests/*.py
```

Отдельно проверить `test_validation_and_hygiene.py`: он читает `backend/Dockerfile` и файлы зависимостей по путям от корня. Пути к `requirements*.txt` не менялись, а проверки Dockerfile останутся валидными после задачи 10 — если тест упадёт сейчас, поправить ожидаемые строки в задаче 10, а не здесь.

- [ ] **Шаг 10: Прогнать все тесты**

```bash
INTEGRITY_SALT=dev-salt SECRET_KEY=dev-secret pytest backend/tests -q
```

Ожидается: `147 passed`.

- [ ] **Шаг 11: Коммит**

```bash
git add -A
git commit -m "refactor(api,services): перенесены верхние слои, LLM-адрес вынесен в окружение"
```

---

## Задача 8: Офлайн-пайплайн обучения

**Файлы:**
- Переместить: `ai_core/{train,export_onnx,data_generator,evaluate,baselines}.py` → `backend/training/`
- Переместить: `ai_core/lstm_model.pth` → `backend/training/checkpoints/`
- Переместить: `ai_core/telemetry_dataset.csv`, `ai_core/test_data.npz` → `backend/training/data/`
- Переместить: `ai_core/evaluation_report.md` → `backend/training/reports/`
- Переместить: `ai_core/README.md` → `backend/training/README.md`
- Создать: `backend/training/config.py`, `backend/training/requirements.txt`
- Создать: `backend/tests/test_training_isolation.py`
- Удалить: `ai_core/config.py` и каталог `ai_core/`

**Интерфейсы:**
- Потребляет: `elou_tutor.ml.settings` (гиперпараметры и нормировка — общие с рантаймом), `elou_tutor.simulation.model`, `elou_tutor.domain.process_limits`.
- Производит: ничего для рантайма. Пакет `elou_tutor` про эту папку не знает.

- [ ] **Шаг 1: Перенести файлы**

```bash
mkdir -p backend/training/{checkpoints,data,reports}
for f in train export_onnx data_generator evaluate baselines; do
  git mv "ai_core/$f.py" "backend/training/$f.py"
done
git mv ai_core/lstm_model.pth backend/training/checkpoints/lstm_model.pth
git mv ai_core/telemetry_dataset.csv backend/training/data/telemetry_dataset.csv
git mv ai_core/test_data.npz backend/training/data/test_data.npz
git mv ai_core/evaluation_report.md backend/training/reports/evaluation_report.md
git mv ai_core/README.md backend/training/README.md
git rm ai_core/config.py
rmdir ai_core 2>/dev/null || true
```

- [ ] **Шаг 2: Создать `backend/training/config.py`**

```python
"""
Параметры обучения. Только для офлайн-пайплайна — в рантайм не импортируется.

Гиперпараметры архитектуры и нормировку берём из установленного пакета
(elou_tutor.ml.settings), чтобы обучение и инференс не разъезжались.
"""

import os

_TRAINING_DIR = os.path.dirname(os.path.abspath(__file__))

DATASET_PATH = os.path.join(_TRAINING_DIR, "data", "telemetry_dataset.csv")
TEST_DATA_PATH = os.path.join(_TRAINING_DIR, "data", "test_data.npz")
MODEL_PATH = os.path.join(_TRAINING_DIR, "checkpoints", "lstm_model.pth")
REPORT_PATH = os.path.join(_TRAINING_DIR, "reports", "evaluation_report.md")

RANDOM_SEED = 42
LEARNING_RATE = 0.001
EPOCHS = 15
BATCH_SIZE = 128
TRAIN_SPLIT = 0.7
VAL_SPLIT = 0.15
TEST_SPLIT = 0.15
RISK_THRESHOLD = 50.0  # Порог бинаризации риска для метрик классификации
```

- [ ] **Шаг 3: Создать `backend/training/requirements.txt`**

```
# Зависимости офлайн-обучения. В прод-образ НЕ входят: рантайму достаточно
# onnxruntime, а torch весит сотни мегабайт и не влезает в лимит Render 512 МБ.
-e ..

torch>=2.2.0
scikit-learn>=1.4.0
pandas>=2.2.0
matplotlib>=3.8.0
```

- [ ] **Шаг 4: Обновить импорты в пяти скриптах**

Посмотреть фактические списки:

```bash
grep -n "from ai_core.config import" -A14 backend/training/*.py
```

Затем в каждом файле заменить единый импорт из `ai_core.config` на два — из пакета и из локального конфига, взяв только используемые имена:

```python
from elou_tutor.ml.settings import (
    INPUT_DIM, HIDDEN_DIM, NUM_LAYERS, OUTPUT_DIM, DROPOUT,
    SEQUENCE_LENGTH, FORECAST_HORIZON, SCALER_MIN, SCALER_MAX, OUT_MIN, OUT_MAX,
)
from training.config import (
    DATASET_PATH, MODEL_PATH, RANDOM_SEED, LEARNING_RATE, EPOCHS, BATCH_SIZE,
    TRAIN_SPLIT, VAL_SPLIT, TEST_SPLIT, RISK_THRESHOLD,
)
```

В `baselines.py` и `data_generator.py` дополнительно:

```python
from elou_tutor.simulation.model import ELOUAVTSimulator
from elou_tutor.domain.process_limits import (
    FURNACE_TEMP_WARNING, FURNACE_TEMP_CRITICAL, COLUMN_LEVEL_HIGH, COLUMN_LEVEL_LOW,
)
```

В `export_onnx.py` путь выгрузки берётся из пакета, чтобы модель попадала прямо в артефакты:

```python
from elou_tutor.ml.settings import ONNX_PATH
```

- [ ] **Шаг 5: Написать тест изоляции**

Создать `backend/tests/test_training_isolation.py`:

```python
"""Офлайн-пайплайн не должен просачиваться в рантайм-пакет."""

import pathlib

_PACKAGE_ROOT = pathlib.Path(__file__).resolve().parent.parent / "src" / "elou_tutor"


def test_package_does_not_import_training():
    offenders = [
        str(path)
        for path in _PACKAGE_ROOT.rglob("*.py")
        if "import training" in path.read_text(encoding="utf-8")
        or "from training" in path.read_text(encoding="utf-8")
    ]

    assert not offenders, f"пакет не должен зависеть от офлайн-пайплайна: {offenders}"


def test_training_artifacts_are_outside_package():
    assert not list(_PACKAGE_ROOT.rglob("*.pth")), "чекпоинты torch не место в пакете"
    assert not list(_PACKAGE_ROOT.rglob("*.csv")), "датасет не место в пакете"
```

- [ ] **Шаг 6: Прогнать все тесты**

```bash
INTEGRITY_SALT=dev-salt SECRET_KEY=dev-secret pytest backend/tests -q
```

Ожидается: `149 passed`.

- [ ] **Шаг 7: Коммит**

```bash
git add -A
git commit -m "refactor(training): офлайн-пайплайн обучения вынесен из рантайм-пакета"
```

---

## Задача 9: Контракты слоёв и CI

**Файлы:**
- Модифицировать: `backend/pyproject.toml`, `.github/workflows/backend-ci.yml`

**Интерфейсы:**
- Потребляет: структуру пакета из задач 1–8.
- Производит: `lint-imports` в каталоге `backend/` проходит и падает при восходящей зависимости.

- [ ] **Шаг 1: Дописать контракты в `backend/pyproject.toml`**

```toml
# ============================================================
# Контроль архитектуры: контракты слоёв проверяются lint-imports.
# Описание слоёв — docs/architecture.md.
# ============================================================
[tool.importlinter]
root_packages = ["elou_tutor"]

[[tool.importlinter.contracts]]
name = "Слои пакета: api → services → db → domain"
type = "layers"
layers = [
    "elou_tutor.api",
    "elou_tutor.services",
    "elou_tutor.db",
    "elou_tutor.domain",
]

[[tool.importlinter.contracts]]
name = "Домен автономен"
type = "forbidden"
source_modules = ["elou_tutor.domain"]
forbidden_modules = [
    "elou_tutor.api", "elou_tutor.services", "elou_tutor.db",
    "elou_tutor.simulation", "elou_tutor.tutor", "elou_tutor.ml",
]

[[tool.importlinter.contracts]]
name = "Симуляция и тьютор зависят только от домена"
type = "forbidden"
source_modules = ["elou_tutor.simulation", "elou_tutor.tutor"]
forbidden_modules = ["elou_tutor.api", "elou_tutor.services", "elou_tutor.db"]

[[tool.importlinter.contracts]]
name = "Инференс зависит только от домена"
type = "forbidden"
source_modules = ["elou_tutor.ml"]
forbidden_modules = [
    "elou_tutor.api", "elou_tutor.services", "elou_tutor.db", "elou_tutor.tutor",
]
```

- [ ] **Шаг 2: Прогнать контракты**

```bash
cd backend && INTEGRITY_SALT=dev-salt SECRET_KEY=dev-secret lint-imports; cd ..
```

Ожидается: `Contracts: 4 kept, 0 broken.` — **без единого `ignore_imports`**.

Если какой-то контракт падает, это настоящая восходящая зависимость, а не ложное срабатывание: подавлять её через `ignore_imports` нельзя, нужно устранить в коде. Самый вероятный кандидат — забытый импорт `get_password_hash` из `api.security` вместо `domain.credentials` в `db/database.py`.

- [ ] **Шаг 3: Проверить, что контракты ловят нарушение**

```bash
cd backend
cp src/elou_tutor/domain/process_limits.py /tmp/pl.bak
printf '\nfrom elou_tutor.api import security  # ВРЕМЕННОЕ НАРУШЕНИЕ\n' >> src/elou_tutor/domain/process_limits.py
INTEGRITY_SALT=dev-salt SECRET_KEY=dev-secret lint-imports; echo "код выхода: $?"
cp /tmp/pl.bak src/elou_tutor/domain/process_limits.py
cd ..
```

Ожидается: `Домен автономен BROKEN`, код выхода 1.

- [ ] **Шаг 4: Обновить `.github/workflows/backend-ci.yml`**

Фильтр путей:

```yaml
    paths:
      - 'backend/**'
      - '.github/workflows/backend-ci.yml'
      - 'docs/architecture.md'
```

В обеих джобах добавить рабочий каталог:

```yaml
    defaults:
      run:
        working-directory: backend
```

Шаги установки и запуска в джобе `lint-and-test`:

```yaml
      - name: Install dependencies
        run: pip install -r requirements-dev.txt

      - name: Lint (ruff)
        run: ruff check .

      - name: Tests (pytest)
        run: pytest tests -q
```

В джобе `architecture`:

```yaml
      - name: Install dependencies
        run: pip install -r requirements-dev.txt

      - name: Check layer contracts
        run: lint-imports
```

Пути кэша (`cache-dependency-path`) указываются от корня репозитория и остаются прежними: `backend/requirements.txt`, `backend/requirements-dev.txt`.

- [ ] **Шаг 5: Проверить, что `requirements-dev.txt` ставит сам пакет**

Файл `backend/requirements-dev.txt` начинается с `-r requirements.txt`. Добавить первой строкой установку пакета в editable-режиме, иначе тесты в CI не найдут `elou_tutor`:

```
# Сам пакет: тесты импортируют elou_tutor, а не файлы по путям
-e .
```

- [ ] **Шаг 6: Прогнать всё как в CI**

```bash
cd backend
ruff check .
INTEGRITY_SALT=ci-salt SECRET_KEY=ci-secret pytest tests -q
INTEGRITY_SALT=ci-salt SECRET_KEY=ci-secret lint-imports
cd ..
```

Ожидается: линт чист, `149 passed`, `4 kept, 0 broken`.

- [ ] **Шаг 7: Коммит**

```bash
git add -A
git commit -m "chore(ci): контракты слоёв переписаны на пакет elou_tutor"
```

---

## Задача 10: Инфраструктура запуска

**Файлы:**
- Модифицировать: `Dockerfile`, `backend/Dockerfile`, `docker-compose.yml`, `.dockerignore`, `.env.example`, `config.mk`, `package.json`

**Интерфейсы:**
- Потребляет: пакет `elou_tutor` и точку входа `elou_tutor.api.main:app`.
- Производит: рабочий стек `docker compose up` и `make start`.

- [ ] **Шаг 1: Обновить `backend/Dockerfile`**

Заменить блок копирования кода:

```dockerfile
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Пакет ставится из исходников: pyproject объявляет package data
# (scenarios.json, knowledge_base, model.onnx) — без установки их не будет в образе.
# Каталог backend/training намеренно не копируется: обучение в прод-образе не нужно.
COPY backend/pyproject.toml ./
COPY backend/src ./src
RUN pip install --no-cache-dir --no-deps .
```

Команду запуска заменить на:

```dockerfile
CMD ["uvicorn", "elou_tutor.api.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

Блоки секретов, `appuser` и HEALTHCHECK не трогать.

- [ ] **Шаг 2: Обновить корневой `Dockerfile`**

Заменить блок копирования кода на установку пакета:

```dockerfile
# Код проекта: ставим пакет; офлайн-пайплайн (backend/training) не копируем
COPY backend/pyproject.toml ./
COPY backend/src ./src
RUN pip install --no-cache-dir --no-deps .
```

Добавить путь к статике рядом с остальными переменными:

```dockerfile
ENV STATIC_DIR=/app/frontend/dist
```

Команду запуска заменить на:

```dockerfile
CMD uvicorn elou_tutor.api.main:app --host 0.0.0.0 --port $PORT
```

- [ ] **Шаг 3: Обновить `docker-compose.yml`**

Монтирование кода:

```yaml
    volumes:
      - tutor_data:/app/data
      # Монтируем исходники пакета — вместе с --reload даёт живую перезагрузку
      - ./backend/src:/app/src
```

Команда:

```yaml
    command: uvicorn elou_tutor.api.main:app --host 0.0.0.0 --port 8000 --reload
```

В `environment` добавить:

```yaml
      - LLM_BASE_URL=${LLM_BASE_URL:-http://host.docker.internal:1234}
```

- [ ] **Шаг 4: Обновить `.dockerignore` и `.env.example`**

В `.dockerignore` добавить строку:

```
backend/training
```

В `.env.example` добавить:

```
# Адрес OpenAI-совместимого сервера LLM для ИИ-чата (LM Studio).
# Локально: http://127.0.0.1:1234. В Docker Compose переопределяется
# на http://host.docker.internal:1234 — внутри контейнера 127.0.0.1
# указывает на сам контейнер.
LLM_BASE_URL=http://127.0.0.1:1234
```

- [ ] **Шаг 5: Обновить `config.mk` и `package.json`**

В `config.mk` строку 32 заменить на:

```makefile
PY_SOURCES   ?= backend/src backend/training
```

В корневом `package.json` скрипт `backend`:

```json
    "backend": "python -m uvicorn elou_tutor.api.main:app --host 127.0.0.1 --port 8000 --reload",
```

- [ ] **Шаг 6: Проверить тест гигиены зависимостей**

```bash
INTEGRITY_SALT=dev-salt SECRET_KEY=dev-secret pytest backend/tests/test_validation_and_hygiene.py -q
```

Тест проверяет, что `backend/Dockerfile` объявляет секреты и запускается не от root. Оба свойства сохранены. Если тест ищет строку `COPY backend/ ./backend/`, обновить ожидание на `COPY backend/src ./src`.

- [ ] **Шаг 7: Пересобрать и поднять стек**

```bash
docker compose down
docker compose up -d --build --wait
docker compose ps
```

Ожидается: оба контейнера `healthy`.

- [ ] **Шаг 8: Проверить отсутствие офлайн-артефактов в образе**

```bash
docker compose exec -T backend sh -c "find / -name 'telemetry_dataset.csv' -o -name '*.pth' 2>/dev/null | head"
```

Ожидается: пусто.

- [ ] **Шаг 9: Приёмочная проверка API**

```bash
curl -s -o /dev/null -w "frontend: %{http_code}\n" http://localhost:8080/
curl -s -o /dev/null -w "api: %{http_code}\n" http://localhost:8080/api/health
TOK=$(curl -s -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"operator_1","password":"Ktk_2026!","role":"operator"}' \
  | python3 -c "import sys,json;print(json.load(sys.stdin)['token'])")
curl -s -o /dev/null -w "scenarios: %{http_code}\n" \
  -H "Authorization: Bearer $TOK" http://localhost:8080/api/scenarios
```

Ожидается: `200`, `200`, `200`.

- [ ] **Шаг 10: Коммит**

```bash
git add -A
git commit -m "chore(docker): сборка и запуск переведены на пакет elou_tutor"
```

---

## Задача 11: Очистка корня

**Файлы:**
- Переместить: `competency_matrix.csv`, `roles_matrix.csv` → `docs/reference/`
- Переместить: `convert_docs.py`, `scripts/compile_docs.py` → `docs/tools/`
- Переместить: `README_HF.md` → `docs/deploy/README_HF.md`
- Модифицировать: `docs/tools/compile_docs.py`, `Dockerfile` (комментарий)

**Интерфейсы:**
- Для кода ничего не производит: переносятся файлы, не участвующие в работе приложения.

- [ ] **Шаг 1: Перенести файлы**

```bash
mkdir -p docs/tools docs/deploy docs/reference
git mv competency_matrix.csv docs/reference/competency_matrix.csv
git mv roles_matrix.csv docs/reference/roles_matrix.csv
git mv convert_docs.py docs/tools/convert_docs.py
git mv scripts/compile_docs.py docs/tools/compile_docs.py
git mv README_HF.md docs/deploy/README_HF.md
rmdir scripts 2>/dev/null || true
```

- [ ] **Шаг 2: Починить путь в `compile_docs.py`**

Скрипт вычисляет корень как каталог уровнем выше своего. После переезда в `docs/tools/` это даёт `docs/`, а нужен корень репозитория. Заменить:

```python
    # Корень репозитория — на два уровня выше каталога docs/tools/
    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    docs_dir = os.path.join(base_dir, "docs")
```

- [ ] **Шаг 3: Проверить сборку пояснительной записки**

```bash
python3 docs/tools/compile_docs.py
```

Ожидается: `✅ Сборка успешно завершена!` и обновлённый `docs/Сводная_пояснительная_записка.md`.

- [ ] **Шаг 4: Обновить комментарий в корневом `Dockerfile`**

```dockerfile
# PORT по умолчанию = 7860 (app_port из docs/deploy/README_HF.md — HF Spaces
# сам $PORT не задаёт); Render прокидывает свой $PORT и переопределяет значение.
```

- [ ] **Шаг 5: Проверить состав корня**

```bash
git ls-tree --name-only HEAD | sort
```

Ожидается ровно 16 записей: `.agents`, `.dockerignore`, `.env.example`, `.github`, `.gitignore`, `.npmrc`, `Dockerfile`, `Makefile`, `README.md`, `backend`, `config.mk`, `docker-compose.yml`, `docs`, `frontend`, `package.json`, `Исходные данные`.

- [ ] **Шаг 6: Прогнать тесты**

```bash
INTEGRITY_SALT=dev-salt SECRET_KEY=dev-secret pytest backend/tests -q
```

Ожидается: `149 passed`.

- [ ] **Шаг 7: Коммит**

```bash
git add -A
git commit -m "chore(root): служебные файлы и матрицы команды перенесены в docs"
```

---

## Задача 12: Документация

**Файлы:**
- Модифицировать: `docs/architecture.md`, `README.md`, `docs/README.md`
- Переписать: `backend/training/README.md`

**Интерфейсы:**
- Потребляет: итоговую структуру из задач 1–11.

- [ ] **Шаг 1: Обновить `docs/architecture.md`**

Правки по разделам:
- **§2 «Карта репозитория»** — заменить дерево на итоговое; убрать `simulator/`, `ai_core/`, `scripts/`.
- **§2 граф зависимостей** — заменить на слои пакета; удалить абзац про три ленивых импорта-исключения (их больше нет) и заменить его упоминанием единственного оставшегося исключения — `db.database → api.security` в `seed_users()`.
- **§3 таблица слоёв** — заменить пути: `backend/routes/` → `elou_tutor/api/routes/`, `backend/services/` → `elou_tutor/services/` и так далее.
- **§3.7** — указать, что целостность живёт в `domain/integrity.py`, а аудит — в `db/audit.py`.
- **§6 «Конфигурация»** — добавить строку `LLM_BASE_URL` в таблицу переменных окружения.
- **§8.3** — переписать таблицу контрактов на четыре новых; удалить абзац про три `ignore_imports`.
- **§9 «Типичные задачи»** — обновить пути во всех строках.

- [ ] **Шаг 2: Обновить `README.md`**

- Раздел «Архитектура репозитория» — заменить список папок на итоговый.
- Быстрый старт — добавить установку пакета: `pip install -e backend`.
- Вариант 2 (раздельный запуск) — заменить команду бэкенда на `python -m uvicorn elou_tutor.api.main:app --host 127.0.0.1 --port 8000`.
- Проверить, что путь к локальной БД в тест-кейсе 5 (`backend/tutor.db`) всё ещё верен: `DATABASE_PATH` по умолчанию не менялся.

- [ ] **Шаг 3: Обновить `docs/README.md`**

В раздел «Для разработчиков» добавить:

```markdown
*   **[../backend/training/README.md](../backend/training/README.md)** — Офлайн-пайплайн обучения LSTM: генерация датасета, обучение, экспорт в ONNX, честная оценка.
```

- [ ] **Шаг 4: Переписать `backend/training/README.md`**

Документ должен отвечать на четыре вопроса: зачем нужен пайплайн; как поставить зависимости (`pip install -r backend/training/requirements.txt`); в каком порядке запускать скрипты (`data_generator.py` → `train.py` → `export_onnx.py` → `evaluate.py`); куда попадают артефакты (`checkpoints/`, `data/`, `reports/`, а ONNX — сразу в `src/elou_tutor/ml/artifacts/`). Обязательно указать: пайплайн не входит в прод-образ, а гиперпараметры берутся из `elou_tutor.ml.settings`, чтобы обучение и инференс не разъезжались.

- [ ] **Шаг 5: Проверить отсутствие битых ссылок**

```bash
grep -rn "ai_core/\|simulator/\|backend/main\.py\|backend/routes/\|scripts/compile_docs" \
  README.md docs/architecture.md docs/README.md | grep -v superpowers
```

Ожидается: пусто.

- [ ] **Шаг 6: Коммит**

```bash
git add -A
git commit -m "docs: документация приведена в соответствие с новой структурой"
```

---

## Задача 13: Финальная проверка и архивация ветки

**Файлы:** изменений в коде нет, только проверки и работа с ветками.

- [ ] **Шаг 1: Полный прогон проверок**

```bash
cd backend
ruff check .
INTEGRITY_SALT=dev-salt SECRET_KEY=dev-secret pytest tests -q
INTEGRITY_SALT=dev-salt SECRET_KEY=dev-secret lint-imports
cd ../frontend
export PATH="$HOME/.nvm/versions/node/v22.23.1/bin:$PATH"
npm run lint && npm run build && npm run check:fsd
cd ..
```

Ожидается: линт чист, `149 passed`, `4 kept, 0 broken`, фронтенд собирается, FSD-правила соблюдены.

- [ ] **Шаг 2: Проверить сохранность истории файлов**

```bash
git log --follow --oneline backend/src/elou_tutor/simulation/model.py | tail -3
git log --follow --oneline backend/src/elou_tutor/tutor/analyzer.py | tail -3
```

Ожидается: в обоих случаях видны коммиты, предшествующие переезду.

- [ ] **Шаг 3: Проверить отсутствие восходящих зависимостей**

```bash
grep -rn "from backend\.\|import backend\.\|from ai_core\|from simulator" backend/src
```

Ожидается: пусто.

- [ ] **Шаг 4: Проверить, что обходных импортов не осталось**

```bash
grep -rn "except Exception" backend/src/elou_tutor/simulation backend/src/elou_tutor/tutor
```

Ожидается: ни одного случая вокруг загрузки сценария.

- [ ] **Шаг 5: Полная пересборка и приёмочный прогон**

```bash
docker compose down -v
docker compose up -d --build --wait
docker compose ps
```

Ожидается: оба контейнера `healthy`.

Затем вручную на `http://localhost:8080/`: вход `instructor_1` / `Ktk_2026!`, запуск сценария «Пуск установки», инъекция дефекта «Отказ сырьевого насоса»; во второй вкладке вход `operator_1`, парирование отказа, завершение сессии и появление ScoreCard.

- [ ] **Шаг 6: Архивировать ветку `restructure`**

```bash
git tag archive/restructure-2026-08-01 refs/heads/restructure
git worktree remove .claude/worktrees/restructure --force 2>/dev/null || true
git branch -D restructure
```

Тег сохраняет содержимое ветки: вернуться можно через `git checkout archive/restructure-2026-08-01`.

- [ ] **Шаг 7: Отметить план выполненным**

Проставить `[x]` в чеклисте итоговых критериев ниже и закоммитить:

```bash
git add docs/superpowers/plans/2026-08-01-project-structure-migration.md
git commit -m "docs(plan): реорганизация структуры завершена"
```

---

## Итоговые критерии приёмки

- [x] `pytest tests -q` в `backend/` — не меньше 149 тестов, все зелёные — **149 passed**
- [x] `lint-imports` в `backend/` — контракты соблюдены — **6 kept, 0 broken** (контрактов стало шесть вместо четырёх: план оставлял дыры в покрытии, они закрыты в задаче 9), **ни одного `ignore_imports`**
- [x] `ruff check .` в `backend/` — чисто
- [x] Фронтенд: `npm run lint`, `npm run build`, `npm run check:fsd` — зелёные
- [x] `docker compose up -d --build --wait` — оба контейнера healthy (после полного `down -v`)
- [x] В прод-образе нет `telemetry_dataset.csv`, `*.pth` и скриптов обучения — проверено внутри контейнера; package data (`model.onnx`, `scenarios.json`) при этом на месте
- [x] В корне репозитория 16 записей, ни одна из них — не служебный файл разработки.
  Позже, уже вне плана, стало 14: секреты переехали в `backend/.env` (корневые
  `.env`/`.env.example` удалены), а оба `.npmrc` снесены — они содержали
  ровно тот адрес реестра, который и так является дефолтом npm
- [x] `git log --follow` работает для перенесённых модулей — история `simulation/model.py` и `tutor/analyzer.py` прослеживается до первого коммита прототипа
- [x] Приёмочный сценарий пройден: пуск → дефект → парирование → ScoreCard. Выполнен программно через реальный API+WebSocket поднятого стека (12/12 проверок), а не кликами в браузере: так прогон воспроизводим. Дополнительно закрыты RBAC на REST и на WS, целостность хэша сохранённой сессии, прогноз риска
- [x] Ветка `restructure` заархивирована тегом `archive/restructure-2026-08-01`, ворктри удалён
