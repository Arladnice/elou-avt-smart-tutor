# Реорганизация структуры проекта — план реализации

> **Для агентов:** ОБЯЗАТЕЛЬНЫЙ САБ-СКИЛЛ: используйте superpowers:subagent-driven-development (рекомендуется) или superpowers:executing-plans для выполнения задача-за-задачей. Шаги размечены чекбоксами (`- [ ]`).

**Цель:** свести весь Python в пакет `elou_tutor` внутри `backend/`, развязать слои, вынести офлайн-обучение из прод-образа — не меняя поведения системы.

**Архитектура:** src-layout, один устанавливаемый пакет `elou_tutor` с шестью слоями (`domain`, `simulation`, `tutor`, `ml`, `db`, `services`, `api`). Зависимости направлены строго вниз; офлайн-пайплайн живёт в корневой папке `ml/` и импортирует настройки из установленного пакета. Миграция идёт снизу вверх по графу зависимостей: на каждом шаге код остаётся рабочим и тесты проходят.

**Стек:** Python 3.12, FastAPI, uvicorn, ONNX Runtime, SQLite, pytest, Docker Compose.

**Спека:** [docs/superpowers/specs/2026-08-01-project-structure-design.md](../specs/2026-08-01-project-structure-design.md)

## Глобальные ограничения

- **Коммиты разрешены только в ветке `restructure`** (изолированный ворктри `.claude/worktrees/restructure`). Каждая задача завершается коммитом в эту ветку. Ветки `main`, `review-project`, `backend`, `frontend`, `docker-local` не трогаются; мерж в основную ветку выполняет только пользователь. Шаги «Контрольная точка» означают коммит задачи с осмысленным сообщением.
- Все переносы файлов — через `git mv`, иначе рвётся история и `git log --follow`.
- Поведение системы не меняется: схема БД, API-контракты и формат WebSocket-сообщений остаются прежними.
- Содержательные правки разрешены ровно три: удаление torch-ветки из рантайм-предиктора, вынос адреса LLM в `LLM_BASE_URL`, растворение `helpers.py`. Остальное — перенос файлов и правка импортов.
- Каталог `frontend/` не затрагивается ни одним файлом.
- Имя пакета: `elou_tutor`. Точка входа приложения: `elou_tutor.api.main:app`.
- Python ≥ 3.10 (в образах — 3.12). Node для фронтенда — `^20.19 || >=22.12`.
- После каждой задачи: `cd backend && python -m pytest -q` — зелёный. Количество тестов не уменьшается (сейчас 41).

---

### Task 1: Каркас пакета

**Файлы:**
- Создать: `backend/pyproject.toml`
- Создать: `backend/src/elou_tutor/__init__.py`
- Создать: `backend/tests/conftest.py`
- Удалить: `pyproject.toml` (корневой)

**Интерфейсы:**
- Производит: устанавливаемый пакет `elou_tutor` (пустой), доступный как `import elou_tutor`; фикстуры pytest, задающие `INTEGRITY_SALT`, `SECRET_KEY`, `DATABASE_PATH` до импорта кода приложения.

- [ ] **Шаг 1: Создать `backend/pyproject.toml`**

```toml
[build-system]
requires = ["setuptools>=61.0"]
build-backend = "setuptools.build_meta"

[project]
name = "elou-tutor"
version = "0.1.0"
description = "Компьютерный тренажерный комплекс ЭЛОУ-АВТ Smart Tutor"
requires-python = ">=3.10"
authors = [{ name = "Smart Tutor Team" }]

[tool.setuptools.packages.find]
where = ["src"]

[tool.setuptools.package-data]
elou_tutor = [
    "data/*.json",
    "knowledge_base/*.md",
    "ml/artifacts/*",
]

[tool.pytest.ini_options]
testpaths = ["tests"]
```

Блок `package-data` критичен: без него `scenarios.json`, база знаний RAG и `model.onnx` не попадут в установленный пакет, и Docker-сборка упадёт на чтении сценариев.

- [ ] **Шаг 2: Создать пакет и удалить корневой pyproject**

```bash
mkdir -p backend/src/elou_tutor
printf '"""ЭЛОУ-АВТ Smart Tutor — тренажёрный комплекс."""\n\n__version__ = "0.1.0"\n' > backend/src/elou_tutor/__init__.py
git rm pyproject.toml
git add backend/pyproject.toml backend/src/elou_tutor/__init__.py
```

- [ ] **Шаг 3: Создать `backend/tests/conftest.py`**

Секреты сейчас выставляются в `os.environ` на импорте `test_tutor.py` — это переезжает сюда и выполняется до сбора тестов:

```python
"""Общая настройка тестового окружения: секреты и изолированная БД."""
import os
import tempfile

import pytest

# Должно быть выставлено до импорта кода приложения:
# elou_tutor.api.security падает при импорте, если секретов нет.
os.environ.setdefault("INTEGRITY_SALT", "test-integrity-salt")
os.environ.setdefault("SECRET_KEY", "test-secret-key")

_TEST_DB = os.path.join(tempfile.gettempdir(), "elou_tutor_test.db")
os.environ["DATABASE_PATH"] = _TEST_DB


@pytest.fixture(scope="session", autouse=True)
def _clean_test_db():
    """Удаляет тестовую БД до и после прогона."""
    if os.path.exists(_TEST_DB):
        os.remove(_TEST_DB)
    yield
    if os.path.exists(_TEST_DB):
        os.remove(_TEST_DB)
```

- [ ] **Шаг 4: Добавить pytest в dev-зависимости**

В `backend/requirements-dev.txt` после строки `httpx>=0.27.0` добавить:

```
pytest>=8.0.0
```

- [ ] **Шаг 5: Установить пакет и проверить**

```bash
python -m pip install --user -e backend
python -c "import elou_tutor; print(elou_tutor.__version__)"
```

Ожидается: `0.1.0`.

- [ ] **Шаг 6: Прогнать существующие тесты через pytest**

```bash
python -m pytest backend/tests -q
```

Ожидается: 41 passed. Тесты пока лежат по старым путям и импортируют старые модули — это нормально, пакет ещё пуст.

- [ ] **Шаг 7: Контрольная точка**

Показать `git status`, дождаться коммита пользователем.

---

### Task 2: Слой domain

**Файлы:**
- Создать: `backend/src/elou_tutor/domain/__init__.py`
- Создать: `backend/src/elou_tutor/domain/process_limits.py`
- Переместить: `ai_core/tech_regulations.py` → `backend/src/elou_tutor/domain/regulations.py`
- Изменить: `ai_core/config.py` (остаются только ML-константы, до Task 5)
- Изменить: `simulator/elou_avt_model.py:5-12`, `ai_core/error_analyzer.py:13-17`, `ai_core/predictive_engine.py:9-16`, `backend/services/simulation_loop.py:4`
- Тест: `backend/tests/test_domain.py`

**Интерфейсы:**
- Производит: `elou_tutor.domain.process_limits` — 41 константа процесса; `elou_tutor.domain.regulations` — `TECH_REGULATIONS`, `ERROR_TAXONOMY` и хелперы с прежними именами.

- [ ] **Шаг 1: Написать падающий тест**

Создать `backend/tests/test_domain.py`:

```python
"""Границы слоя domain: константы процесса и база регламентов."""


def test_process_limits_exposes_esd_thresholds():
    from elou_tutor.domain import process_limits as pl

    assert pl.COLUMN_PRES_ESD == 0.48
    assert pl.FURNACE_TEMP_CRITICAL == 365.0
    assert pl.COLUMN_LEVEL_LOW_CRITICAL == 5.0


def test_regulations_available_and_indexed_by_clause():
    from elou_tutor.domain.regulations import TECH_REGULATIONS, ERROR_TAXONOMY

    assert len(TECH_REGULATIONS) > 0
    assert len(ERROR_TAXONOMY) > 0


def test_domain_does_not_import_upper_layers():
    """Слой domain не должен зависеть ни от api, ни от services."""
    import pathlib

    domain_dir = pathlib.Path(__file__).resolve().parents[1] / "src/elou_tutor/domain"
    for path in domain_dir.glob("*.py"):
        source = path.read_text(encoding="utf-8")
        assert "from elou_tutor.api" not in source, path
        assert "from elou_tutor.services" not in source, path
        assert "from backend" not in source, path
```

- [ ] **Шаг 2: Убедиться, что тест падает**

```bash
python -m pytest backend/tests/test_domain.py -q
```

Ожидается: FAIL, `ModuleNotFoundError: No module named 'elou_tutor.domain'`.

- [ ] **Шаг 3: Создать `domain/process_limits.py`**

```bash
mkdir -p backend/src/elou_tutor/domain
touch backend/src/elou_tutor/domain/__init__.py
```

Файл `backend/src/elou_tutor/domain/process_limits.py` начинается с шапки:

```python
"""
Константы технологического процесса ЭЛОУ-АВТ.

Источник значений: «Описание технологического процесса.pdf» (разделы 3, 7).
Потребители: simulation.model, tutor.analyzer, services.simulation_loop, ml.predictor.
Слой domain ничего не импортирует из проекта.
"""
```

Ниже переносятся **дословно, без изменения значений и имён**, из `ai_core/config.py` блоки:

`# === Physical Thresholds (from tech regulations) ===` (строки 40-60), `# === Timeouts & Duration Thresholds ===` (62-64), `# === Alert Escalation Thresholds ===` (66-72), `# === Physical Limits (Clamping & Bounds) ===` (74-80), `# === Initial State Physics Defaults ===` (82-91), `# === Process Timing & Dynamic Thresholds ===` (93-98).

- [ ] **Шаг 4: Перенести регламенты**

```bash
git mv ai_core/tech_regulations.py backend/src/elou_tutor/domain/regulations.py
```

В шапке нового файла заменить импорт:

```python
from elou_tutor.domain.process_limits import (
    FURNACE_TEMP_WARNING,
    COLUMN_PRES_NORMAL_MIN, COLUMN_PRES_NORMAL_MAX,
    COLUMN_LEVEL_HIGH, COLUMN_LEVEL_LOW,
    COLUMN_LEVEL_BALANCE_MIN, COLUMN_LEVEL_BALANCE_MAX,
)
```

- [ ] **Шаг 5: Вычистить перенесённое из `ai_core/config.py`**

Удалить из `ai_core/config.py` блоки, перенесённые на шаге 3. Остаются только пути, `RANDOM_SEED`, архитектура модели, параметры обучения и нормировка — они переедут в Task 5.

- [ ] **Шаг 6: Обновить четырёх потребителей**

В `simulator/elou_avt_model.py`, `ai_core/error_analyzer.py`, `ai_core/predictive_engine.py`, `backend/services/simulation_loop.py` заменить `from ai_core.config import (...)` на `from elou_tutor.domain.process_limits import (...)` — списки импортируемых имён не меняются. В `ai_core/error_analyzer.py` также заменить `from ai_core.tech_regulations import TECH_REGULATIONS` на `from elou_tutor.domain.regulations import TECH_REGULATIONS`.

Проверить, что ни одна константа не потерялась:

```bash
grep -rn "ai_core.config" --include="*.py" backend simulator ai_core
```

Ожидается: остаются только строки в `ai_core/{train,evaluate,baselines,export_onnx}.py` — они мигрируют в Task 5.

- [ ] **Шаг 7: Прогнать тесты**

```bash
python -m pytest backend/tests -q
```

Ожидается: 44 passed (41 прежних + 3 новых).

- [ ] **Шаг 8: Контрольная точка**

---

### Task 3: Слой simulation и разрыв цикла

**Файлы:**
- Переместить: `simulator/elou_avt_model.py` → `backend/src/elou_tutor/simulation/model.py`
- Переместить: `backend/services/scenario_manager.py` → `backend/src/elou_tutor/simulation/scenarios.py`
- Переместить: `backend/data/scenarios.json` → `backend/src/elou_tutor/data/scenarios.json`
- Переместить: `simulator/README.md` → `docs/reference/simulation.md`
- Изменить: `backend/routes/scenarios.py:5`, `backend/services/ai_chat_service.py:86`, `backend/services/connection_manager.py:9`, `ai_core/data_generator.py:9`, `ai_core/error_analyzer.py:28`
- Тест: `backend/tests/test_simulation.py`

**Интерфейсы:**
- Потребляет: `elou_tutor.domain.process_limits` (Task 2).
- Производит: `elou_tutor.simulation.model.ELOUAVTSimulator` с методами `reset(scenario_id: str = "shutdown")`, `step()`, `get_state() -> dict`; `elou_tutor.simulation.scenarios.get_scenario_by_id(scenario_id: str) -> dict | None` и остальные функции реестра под прежними именами.

- [ ] **Шаг 1: Написать падающий тест**

Создать `backend/tests/test_simulation.py`:

```python
"""Слой simulation: модель процесса и реестр сценариев."""
import pathlib


def test_simulator_importable_from_package():
    from elou_tutor.simulation.model import ELOUAVTSimulator

    sim = ELOUAVTSimulator()
    state = sim.get_state()
    assert state["timeElapsed"] == 0


def test_scenario_registry_returns_startup():
    from elou_tutor.simulation.scenarios import get_scenario_by_id

    assert get_scenario_by_id("startup") is not None


def test_simulation_has_no_lazy_backend_imports():
    """Цикл «домен → веб-слой» разорван: ленивых импортов backend не осталось."""
    sim_dir = pathlib.Path(__file__).resolve().parents[1] / "src/elou_tutor/simulation"
    for path in sim_dir.glob("*.py"):
        source = path.read_text(encoding="utf-8")
        assert "from backend" not in source, path
        assert "from elou_tutor.services" not in source, path
```

- [ ] **Шаг 2: Убедиться, что тест падает**

```bash
python -m pytest backend/tests/test_simulation.py -q
```

Ожидается: FAIL, `ModuleNotFoundError: No module named 'elou_tutor.simulation'`.

- [ ] **Шаг 3: Перенести файлы**

```bash
mkdir -p backend/src/elou_tutor/simulation backend/src/elou_tutor/data docs/reference
touch backend/src/elou_tutor/simulation/__init__.py
git mv simulator/elou_avt_model.py backend/src/elou_tutor/simulation/model.py
git mv backend/services/scenario_manager.py backend/src/elou_tutor/simulation/scenarios.py
git mv backend/data/scenarios.json backend/src/elou_tutor/data/scenarios.json
git mv simulator/README.md docs/reference/simulation.md
rmdir simulator backend/data
```

- [ ] **Шаг 4: Починить путь к `scenarios.json` в `scenarios.py`**

Файл больше не лежит в `backend/data/`. Путь считается от модуля пакета:

```python
import pathlib

SCENARIOS_PATH = pathlib.Path(__file__).resolve().parent.parent / "data" / "scenarios.json"
```

Заменить прежнее вычисление пути на это. Все `open(...)` в модуле используют `SCENARIOS_PATH`.

- [ ] **Шаг 5: Разорвать цикл в `model.py`**

Заменить блок в `reset()` (был `simulator/elou_avt_model.py:45-49`):

```python
        try:
            from backend.services.scenario_manager import get_scenario_by_id
            sc = get_scenario_by_id(scenario_id)
        except Exception:
            sc = None
```

на обычный импорт в шапке модуля и прямой вызов:

```python
from elou_tutor.simulation.scenarios import get_scenario_by_id
```

```python
        sc = get_scenario_by_id(scenario_id)
```

`get_scenario_by_id` возвращает `None` для неизвестного сценария — прежнее поведение при отсутствии сценария сохраняется, но ошибки чтения файла больше не проглатываются молча.

- [ ] **Шаг 6: Обновить потребителей**

| Файл | Было | Стало |
|---|---|---|
| `backend/routes/scenarios.py:5` | `from backend.services.scenario_manager import (` | `from elou_tutor.simulation.scenarios import (` |
| `backend/services/ai_chat_service.py:86` | ленивый `from backend.services.scenario_manager import get_scenario_by_id` | импорт в шапку: `from elou_tutor.simulation.scenarios import get_scenario_by_id` |
| `backend/services/connection_manager.py:9` | `from simulator.elou_avt_model import ELOUAVTSimulator` | `from elou_tutor.simulation.model import ELOUAVTSimulator` |
| `ai_core/data_generator.py:9` | `from simulator.elou_avt_model import ELOUAVTSimulator` | `from elou_tutor.simulation.model import ELOUAVTSimulator` |
| `ai_core/error_analyzer.py:28` | ленивый импорт в `_get_golden_sequence` | импорт в шапку: `from elou_tutor.simulation.scenarios import get_scenario_by_id` |
| `backend/tests/test_tutor.py:12` | `from simulator.elou_avt_model import ELOUAVTSimulator` | `from elou_tutor.simulation.model import ELOUAVTSimulator` |

В `error_analyzer._get_golden_sequence` тело упрощается до:

```python
    def _get_golden_sequence(self, scenario_id: str) -> list:
        """Возвращает эталонную последовательность из центрального реестра."""
        sc = get_scenario_by_id(scenario_id)
        if sc and "golden_sequence" in sc:
            return sc["golden_sequence"]
        return self.golden_sequences.get(scenario_id, [])
```

- [ ] **Шаг 7: Прогнать тесты**

```bash
python -m pytest backend/tests -q
```

Ожидается: 47 passed.

- [ ] **Шаг 8: Контрольная точка**

---

### Task 4: Слой tutor

**Файлы:**
- Переместить: `ai_core/error_analyzer.py` → `backend/src/elou_tutor/tutor/analyzer.py`
- Переместить: `ai_core/sequence_alignment.py` → `backend/src/elou_tutor/tutor/alignment.py`
- Изменить: `backend/services/connection_manager.py:11`, `backend/tests/test_tutor.py:14`
- Тест: `backend/tests/test_tutor.py` (правка импортов, тела тестов не меняются)

**Интерфейсы:**
- Потребляет: `elou_tutor.domain.process_limits`, `elou_tutor.domain.regulations`, `elou_tutor.simulation.scenarios`.
- Производит: `elou_tutor.tutor.analyzer.ErrorAnalyzer` с методом `evaluate_session(actions, scenario_id, defects_triggered=None, final_sensors=None, time_elapsed=0) -> tuple[int, list, list]`; `elou_tutor.tutor.alignment.calculate_lcs_alignment(operator_actions: List[str], golden_actions: List[str]) -> float`.

- [ ] **Шаг 1: Перенести файлы**

```bash
mkdir -p backend/src/elou_tutor/tutor
touch backend/src/elou_tutor/tutor/__init__.py
git mv ai_core/error_analyzer.py backend/src/elou_tutor/tutor/analyzer.py
git mv ai_core/sequence_alignment.py backend/src/elou_tutor/tutor/alignment.py
```

- [ ] **Шаг 2: Обновить импорты внутри перенесённых файлов**

Шапка `analyzer.py`:

```python
from elou_tutor.domain.process_limits import (
    FURNACE_TEMP_WARNING, FURNACE_TEMP_MIN_STARTUP, FURNACE_TEMP_MAX_SHUTDOWN,
    COLUMN_LEVEL_BALANCE_MIN, COLUMN_LEVEL_BALANCE_MAX,
    STARTUP_MIN_TIME_SEC,
)
from elou_tutor.domain.regulations import TECH_REGULATIONS
from elou_tutor.simulation.scenarios import get_scenario_by_id
from elou_tutor.tutor.alignment import calculate_lcs_alignment
```

- [ ] **Шаг 3: Обновить потребителей**

- `backend/services/connection_manager.py:11`: `from ai_core.error_analyzer import ErrorAnalyzer` → `from elou_tutor.tutor.analyzer import ErrorAnalyzer`
- `backend/tests/test_tutor.py:14`: то же самое

- [ ] **Шаг 4: Прогнать тесты**

```bash
python -m pytest backend/tests -q
```

Ожидается: 47 passed.

- [ ] **Шаг 5: Контрольная точка**

---

### Task 5: Слой ml и удаление torch-ветки

**Файлы:**
- Переместить: `ai_core/predictive_engine.py` → `backend/src/elou_tutor/ml/predictor.py`
- Переместить: `ai_core/model.onnx`, `ai_core/model.onnx.data` → `backend/src/elou_tutor/ml/artifacts/`
- Создать: `backend/src/elou_tutor/ml/settings.py`
- Изменить: `backend/services/connection_manager.py:10`, `backend/tests/test_tutor.py:13`
- Тест: `backend/tests/test_ml.py`

**Интерфейсы:**
- Потребляет: `elou_tutor.domain.process_limits`.
- Производит: `elou_tutor.ml.predictor.RiskPredictor` с методом `predict_risk(window_data, time_elapsed: int = 100, scenario_id: str = "shutdown") -> tuple[list[float], float]` — возвращает `([temp, pres, level], risk)` именно в этом порядке; `elou_tutor.ml.settings` с константами `INPUT_DIM`, `HIDDEN_DIM`, `NUM_LAYERS`, `OUTPUT_DIM`, `DROPOUT`, `SEQUENCE_LENGTH`, `FORECAST_HORIZON`, `SCALER_MIN`, `SCALER_MAX`, `OUT_MIN`, `OUT_MAX`, `RISK_WEIGHT_TEMP`, `RISK_WEIGHT_PRES`, `RISK_WEIGHT_LEVEL`, `RISK_PENALTY_NO_FEED`, `ONNX_PATH`.

- [ ] **Шаг 1: Написать падающий тест**

Создать `backend/tests/test_ml.py`:

```python
"""Слой ml: инференс риска и отсутствие torch в рантайме."""
import pathlib

import numpy as np


def test_predictor_returns_risk_in_valid_range():
    from elou_tutor.ml.predictor import RiskPredictor
    from elou_tutor.ml.settings import SEQUENCE_LENGTH, INPUT_DIM

    predictor = RiskPredictor()
    window = np.zeros((SEQUENCE_LENGTH, INPUT_DIM), dtype=np.float32)
    # Порядок возврата: (прогноз, риск) — как в connection_manager.py
    predictions, risk = predictor.predict_risk(window, time_elapsed=100)

    assert 0.0 <= risk <= 100.0
    assert len(predictions) == 3  # [temp, pres, level]


def test_runtime_predictor_does_not_use_torch():
    """Прод-инференс идёт через ONNX: torch в рантайме не упоминается."""
    path = pathlib.Path(__file__).resolve().parents[1] / "src/elou_tutor/ml/predictor.py"
    source = path.read_text(encoding="utf-8")

    assert "import torch" not in source
    assert "RiskLSTM" not in source


def test_onnx_artifact_ships_with_package():
    from elou_tutor.ml.settings import ONNX_PATH

    assert ONNX_PATH.exists(), f"Модель не найдена: {ONNX_PATH}"
```

- [ ] **Шаг 2: Убедиться, что тест падает**

```bash
python -m pytest backend/tests/test_ml.py -q
```

Ожидается: FAIL, `ModuleNotFoundError: No module named 'elou_tutor.ml'`.

- [ ] **Шаг 3: Перенести файлы и артефакты**

```bash
mkdir -p backend/src/elou_tutor/ml/artifacts
touch backend/src/elou_tutor/ml/__init__.py
git mv ai_core/predictive_engine.py backend/src/elou_tutor/ml/predictor.py
git mv ai_core/model.onnx backend/src/elou_tutor/ml/artifacts/model.onnx
git mv ai_core/model.onnx.data backend/src/elou_tutor/ml/artifacts/model.onnx.data
```

- [ ] **Шаг 4: Создать `ml/settings.py`**

```python
"""
Параметры ML-инференса: архитектура сети, нормировка, веса риск-движка.

Единственный источник истины — офлайн-пайплайн (`ml/` в корне репозитория)
импортирует эти же значения, чтобы обучение и инференс не разъехались.
"""
import pathlib

import numpy as np

ARTIFACTS_DIR = pathlib.Path(__file__).resolve().parent / "artifacts"
ONNX_PATH = ARTIFACTS_DIR / "model.onnx"

# === Архитектура модели ===
INPUT_DIM = 7        # [valve_V1, valve_V2, valve_V3, furnaceTempSp, furnaceTemp, columnPres, columnLevel]
HIDDEN_DIM = 64
NUM_LAYERS = 2
OUTPUT_DIM = 3       # [furnaceTemp, columnPres, columnLevel]
DROPOUT = 0.2
SEQUENCE_LENGTH = 30
FORECAST_HORIZON = 15

# === Нормировка входа ===
SCALER_MIN = np.array([0.0, 0.0, 0.0, 100.0, 20.0, 0.02, 0.0], dtype=np.float32)
SCALER_MAX = np.array([1.0, 1.0, 1.0, 400.0, 600.0, 1.5, 100.0], dtype=np.float32)

# === Нормировка выхода (furnaceTemp, columnPres, columnLevel) ===
OUT_MIN = np.array([20.0, 0.02, 0.0], dtype=np.float32)
OUT_MAX = np.array([600.0, 1.5, 100.0], dtype=np.float32)

# === Веса риск-движка ===
RISK_WEIGHT_TEMP = 45.0       # % вклад температуры в риск
RISK_WEIGHT_PRES = 55.0       # % вклад давления в риск
RISK_WEIGHT_LEVEL = 20.0      # % вклад уровня в риск
RISK_PENALTY_NO_FEED = 12.5   # % штраф при закрытом V-1
```

- [ ] **Шаг 5: Переписать шапку `predictor.py` и убрать torch-ветку**

Новая шапка вместо строк 1-31 прежнего файла:

```python
import logging

import numpy as np

from elou_tutor.domain.process_limits import (
    FURNACE_TEMP_CRITICAL, FURNACE_TEMP_WARNING, COLUMN_PRES_CRITICAL, COLUMN_PRES_WARNING,
    COLUMN_PRES_ESD, COLUMN_LEVEL_HIGH, COLUMN_LEVEL_LOW, COLUMN_LEVEL_LOW_INTERLOCK,
    COLUMN_LEVEL_HIGH_CRITICAL, COLUMN_LEVEL_LOW_CRITICAL,
    STARTUP_HEATING_THRESHOLD_TEMP, STARTUP_FILLING_TIME_LIMIT_SEC, VALVE_ACTION_TIMEOUT_SEC,
)
from elou_tutor.ml.settings import (
    ONNX_PATH, INPUT_DIM, SCALER_MIN, SCALER_MAX, OUT_MIN, OUT_MAX,
    RISK_WEIGHT_TEMP, RISK_WEIGHT_PRES, RISK_WEIGHT_LEVEL, RISK_PENALTY_NO_FEED,
)

logger = logging.getLogger(__name__)

try:
    import onnxruntime as ort
    HAS_ONNX = True
except ImportError:
    HAS_ONNX = False
```

Далее удалить: класс `RiskLSTM` целиком, флаг `HAS_TORCH` и все его проверки, ветку загрузки `.pth` в `RiskPredictor.__init__` (прежние строки 105-122). В `__init__` остаётся загрузка ONNX и, при её неудаче, переход на математический fallback:

```python
    def __init__(self):
        self.ort_session = None
        self.use_onnx = False
        self.use_fallback = True

        if HAS_ONNX and ONNX_PATH.exists():
            try:
                self.ort_session = ort.InferenceSession(
                    str(ONNX_PATH), providers=["CPUExecutionProvider"]
                )
                self.use_onnx = True
                self.use_fallback = False
                logger.info("Модель LSTM успешно загружена через ONNX Runtime (%d фичей).", INPUT_DIM)
            except Exception as e:
                logger.warning("Не удалось загрузить ONNX-модель (%s), используется экстраполяция тренда.", e)
        else:
            logger.warning("ONNX Runtime или файл модели недоступны, используется экстраполяция тренда.")
```

Флаг `use_fallback` сохраняется: его читает `predict_risk`. Атрибут `self.model` (torch-модель) удаляется вместе с веткой — после правки проверить, что обращений к нему не осталось:

```bash
grep -n "self\.model\|HAS_TORCH\|torch" backend/src/elou_tutor/ml/predictor.py
```

Ожидается: пусто. Если найдётся ветка вида `elif self.model is not None:` в `predict_risk` — удалить её; путь инференса остаётся один (ONNX), плюс `_run_mathematical_fallback`.

Метод `_run_mathematical_fallback` и вся логика расчёта риска остаются без изменений.

- [ ] **Шаг 6: Обновить потребителей**

- `backend/services/connection_manager.py:10`: `from ai_core.predictive_engine import RiskPredictor` → `from elou_tutor.ml.predictor import RiskPredictor`
- `backend/tests/test_tutor.py:13`: то же самое

- [ ] **Шаг 7: Прогнать тесты**

```bash
python -m pytest backend/tests -q
```

Ожидается: 50 passed. Тест `test_risk_predictor` из прежнего набора продолжает проходить — поведение предиктора не изменилось, удалён только недостижимый код.

- [ ] **Шаг 8: Контрольная точка**

---

### Task 6: Слои db, services и api

**Файлы:**
- Переместить: `backend/db/*.py` → `backend/src/elou_tutor/db/`
- Переместить: `backend/services/{simulation_loop,connection_manager,ai_chat_service,vector_store}.py` → `backend/src/elou_tutor/services/`
- Переместить: `backend/knowledge_base/*.md` → `backend/src/elou_tutor/knowledge_base/`
- Переместить: `backend/main.py` → `backend/src/elou_tutor/api/main.py`
- Переместить: `backend/routes/` → `backend/src/elou_tutor/api/routes/`
- Переместить: `backend/models/schemas.py` → `backend/src/elou_tutor/api/schemas.py`
- Переместить: `backend/utils/security.py` → `backend/src/elou_tutor/api/security.py`
- Удалить: `backend/utils/helpers.py`
- Изменить: `backend/services/connection_manager.py` (встроить `random_id`), `backend/services/ai_chat_service.py:153` (`LLM_BASE_URL`)
- Тест: `backend/tests/test_api.py`

**Интерфейсы:**
- Потребляет: все нижние слои.
- Производит: `elou_tutor.api.main.app` (объект FastAPI); `elou_tutor.api.security` с функциями `calculate_integrity_hash`, `log_audit_event`, `verify_jwt_token`, `create_jwt_token`, `get_password_hash`, `verify_password`; `elou_tutor.services.connection_manager.manager`.

- [ ] **Шаг 1: Перенести файлы**

```bash
mkdir -p backend/src/elou_tutor/{db,services,api,knowledge_base}
touch backend/src/elou_tutor/{db,services,api}/__init__.py
git mv backend/db/database.py backend/db/queries.py backend/src/elou_tutor/db/
git mv backend/services/simulation_loop.py backend/services/connection_manager.py \
       backend/services/ai_chat_service.py backend/services/vector_store.py \
       backend/src/elou_tutor/services/
git mv backend/knowledge_base/*.md backend/src/elou_tutor/knowledge_base/
git mv backend/main.py backend/src/elou_tutor/api/main.py
git mv backend/routes backend/src/elou_tutor/api/routes
git mv backend/models/schemas.py backend/src/elou_tutor/api/schemas.py
git mv backend/utils/security.py backend/src/elou_tutor/api/security.py
git rm backend/utils/helpers.py
rmdir backend/db backend/services backend/models backend/utils backend/knowledge_base
```

- [ ] **Шаг 2: Переписать импорты одной заменой**

Во всех файлах пакета заменить префиксы:

```bash
cd backend/src/elou_tutor
grep -rl "from backend\." . | xargs sed -i '' \
  -e 's/from backend\.db\./from elou_tutor.db./g' \
  -e 's/from backend\.services\./from elou_tutor.services./g' \
  -e 's/from backend\.routes/from elou_tutor.api.routes/g' \
  -e 's/from backend\.models\.schemas/from elou_tutor.api.schemas/g' \
  -e 's/from backend\.utils\.security/from elou_tutor.api.security/g' \
  -e 's/from backend\.main/from elou_tutor.api.main/g'
cd -
grep -rn "from backend" backend/src/elou_tutor || echo "Восходящих импортов не осталось"
```

На macOS `sed -i` требует аргумента `''` — он указан выше.

- [ ] **Шаг 3: Растворить `helpers.py`**

В `backend/src/elou_tutor/services/connection_manager.py` удалить строку `from elou_tutor.utils.helpers import random_id` (после замены на шаге 2 она указывает в никуда) и добавить в шапку `import random`, а рядом с местом использования — функцию:

```python
def random_id() -> int:
    """Генерирует случайный целочисленный идентификатор в диапазоне [1, 999]."""
    return random.randint(1, 999)
```

- [ ] **Шаг 4: Вынести адрес LLM в переменную окружения**

В `backend/src/elou_tutor/services/ai_chat_service.py` заменить строку 153:

```python
    url = "http://127.0.0.1:1234/v1/chat/completions"
```

на:

```python
    url = f"{LLM_BASE_URL.rstrip('/')}/v1/chat/completions"
```

и добавить в шапку модуля:

```python
# Адрес LLM-сервера (LM Studio). В Docker localhost указывает на сам контейнер,
# поэтому по умолчанию используется host.docker.internal.
LLM_BASE_URL = os.environ.get("LLM_BASE_URL", "http://127.0.0.1:1234")
```

- [ ] **Шаг 5: Починить путь к базе знаний RAG**

В `backend/src/elou_tutor/services/vector_store.py` путь к каталогу `knowledge_base` вычислялся от `backend/`. Заменить на путь от модуля пакета:

```python
import pathlib

KNOWLEDGE_BASE_DIR = pathlib.Path(__file__).resolve().parent.parent / "knowledge_base"
```

- [ ] **Шаг 6: Создать `backend/tests/test_api.py`**

Перенести из `backend/tests/test_tutor.py` класс `TestBackendRoutesAndIntegrity` (строки 327-632) целиком, заменив в нём импорты:

```python
from elou_tutor.api.main import app
from elou_tutor.api.routes.auth import login
from elou_tutor.api.routes.health import health_check
from elou_tutor.api.routes.sessions import get_sessions, clear_sessions
from elou_tutor.api.schemas import LoginRequest
from elou_tutor.api.security import calculate_integrity_hash
from elou_tutor.db.database import init_db, DB_PATH
from elou_tutor.services.connection_manager import manager
```

В `backend/tests/test_tutor.py` этот класс удаляется, остаётся `TestKTKComponents`.

- [ ] **Шаг 7: Развести `TestKTKComponents` по границам слоёв**

Класс тестирует три слоя сразу. Разнести его методы по файлам, созданным в предыдущих задачах, сохранив тела без изменений:

| Куда | Методы |
|---|---|
| `test_simulation.py`, класс `TestSimulation` | `test_simulator_step`, `test_simulator_scenario_initial_conditions`, `test_simulator_startup_physics`, `test_simulator_snapshots` |
| `test_ml.py`, класс `TestRiskPredictor` | `test_risk_predictor` |
| `test_tutor.py`, класс `TestErrorAnalyzer` | девять `test_error_analyzer_*`, восемь `test_integration_testcase_*`, семь `test_adaptive_*` |

Метод `setUp` (создаёт `ELOUAVTSimulator`, `RiskPredictor`, `ErrorAnalyzer`) копируется в каждый класс, оставляя только нужный объект. Из `test_api.py` в отдельные классы ничего переносить не нужно — он уже разделён по шагу 6.

Проверить, что ни один тест не потерялся при переносе:

```bash
python -m pytest backend/tests --collect-only -q | tail -1
```

Ожидается: то же число тестов, что и до переноса.

- [ ] **Шаг 8: Прогнать тесты**

```bash
python -m pytest backend/tests -q
```

Ожидается: 50 passed. Счётчик не меняется — тесты переехали между файлами, но ни один не исчез.

- [ ] **Шаг 9: Проверить приложение целиком**

```bash
INTEGRITY_SALT=dev SECRET_KEY=dev python -c "from elou_tutor.api.main import app; print(len(app.routes), 'маршрутов')"
```

Ожидается: число маршрутов больше 15, импорт без ошибок.

- [ ] **Шаг 10: Контрольная точка**

---

### Task 7: Офлайн-пайплайн обучения

**Файлы:**
- Переместить: `ai_core/{train,export_onnx,evaluate,baselines,data_generator}.py` → `ml/`
- Переместить: `ai_core/lstm_model.pth` → `ml/checkpoints/lstm_model.pth`
- Переместить: `ai_core/telemetry_dataset.csv`, `ai_core/test_data.npz` → `ml/data/`
- Переместить: `ai_core/evaluation_report.md` → `ml/reports/evaluation_report.md`
- Переместить: `ai_core/README.md` → `ml/README.md`
- Создать: `ml/config.py`, `ml/requirements.txt`
- Удалить: `ai_core/config.py`, каталог `ai_core/`

**Интерфейсы:**
- Потребляет: `elou_tutor.ml.settings` (архитектура и нормировка), `elou_tutor.simulation.model.ELOUAVTSimulator` (генерация данных).
- Производит: `ml/config.py` с константами обучения `RANDOM_SEED`, `LEARNING_RATE`, `EPOCHS`, `BATCH_SIZE`, `TRAIN_SPLIT`, `VAL_SPLIT`, `TEST_SPLIT`, `RISK_THRESHOLD`, `DATASET_PATH`, `CHECKPOINT_PATH`, `TEST_DATA_PATH`.

- [ ] **Шаг 1: Перенести файлы**

```bash
mkdir -p ml/checkpoints ml/data ml/reports
git mv ai_core/train.py ai_core/export_onnx.py ai_core/evaluate.py \
       ai_core/baselines.py ai_core/data_generator.py ml/
git mv ai_core/lstm_model.pth ml/checkpoints/
git mv ai_core/telemetry_dataset.csv ai_core/test_data.npz ml/data/
git mv ai_core/evaluation_report.md ml/reports/
git mv ai_core/README.md ml/README.md
git rm ai_core/config.py
rmdir ai_core
```

- [ ] **Шаг 2: Создать `ml/config.py`**

```python
"""
Параметры офлайн-обучения. В рантайм не попадают.

Архитектура сети и нормировка берутся из установленного пакета —
единственного источника истины, чтобы обучение и инференс не разъехались.
"""
import pathlib

from elou_tutor.ml.settings import (  # noqa: F401 — реэкспорт для скриптов обучения
    INPUT_DIM, HIDDEN_DIM, NUM_LAYERS, OUTPUT_DIM, DROPOUT,
    SEQUENCE_LENGTH, FORECAST_HORIZON,
    SCALER_MIN, SCALER_MAX, OUT_MIN, OUT_MAX,
)

BASE_DIR = pathlib.Path(__file__).resolve().parent
DATASET_PATH = BASE_DIR / "data" / "telemetry_dataset.csv"
TEST_DATA_PATH = BASE_DIR / "data" / "test_data.npz"
CHECKPOINT_PATH = BASE_DIR / "checkpoints" / "lstm_model.pth"
ONNX_EXPORT_PATH = BASE_DIR.parent / "backend/src/elou_tutor/ml/artifacts/model.onnx"

# === Воспроизводимость ===
RANDOM_SEED = 42

# === Параметры обучения ===
LEARNING_RATE = 0.001
EPOCHS = 15
BATCH_SIZE = 128
TRAIN_SPLIT = 0.7
VAL_SPLIT = 0.15
TEST_SPLIT = 0.15
RISK_THRESHOLD = 50.0  # Порог бинаризации риска для метрик классификации
```

- [ ] **Шаг 3: Создать `ml/requirements.txt`**

```
# Зависимости офлайн-обучения. В production-образ не входят:
# рантайм использует только onnxruntime (см. docs/ai_architecture.md).
-r ../backend/requirements.txt

torch>=2.0.0
pandas>=2.0.0
scikit-learn>=1.3.0
matplotlib>=3.7.0
```

- [ ] **Шаг 4: Обновить импорты в скриптах обучения**

Во всех пяти файлах `ml/*.py` заменить `from ai_core.config import (...)` на `from config import (...)` (скрипты запускаются из каталога `ml/`), `from ai_core.predictive_engine import RiskPredictor` на `from elou_tutor.ml.predictor import RiskPredictor`, `from simulator.elou_avt_model import ELOUAVTSimulator` на `from elou_tutor.simulation.model import ELOUAVTSimulator`.

Класс `RiskLSTM` удалён из рантайма (Task 5), а `train.py` и `export_onnx.py` его используют. В прежнем файле он объявлен внутри `if HAS_TORCH:` (строки 44-78: реальная реализация в 45-74, заглушка-пустышка в 76-78). Извлечь его дословно из git-истории, а не набирать заново:

```bash
git show "$(git rev-list -1 HEAD -- ai_core/predictive_engine.py)^:ai_core/predictive_engine.py" \
  | sed -n '44,74p' > /tmp/risk_lstm.py
```

Конструкция берёт версию файла из родителя того коммита, в котором файл был перемещён, — она не зависит от того, сколько коммитов сделано с начала миграции.

Создать `ml/model.py` со следующей шапкой, а ниже вставить извлечённый класс, сняв отступ в 4 пробела (он был вложен в `if HAS_TORCH:`) и отбросив ветку `else:` с заглушкой — здесь torch есть всегда:

```python
"""
Архитектура LSTM для обучения. В рантайме не используется: там ONNX.

Класс переехал сюда из ai_core/predictive_engine.py, где был обёрнут
в проверку `if HAS_TORCH`. В офлайн-пайплайне torch — обязательная зависимость.
"""
import torch
import torch.nn as nn

from config import INPUT_DIM, HIDDEN_DIM, NUM_LAYERS, OUTPUT_DIM, DROPOUT
```

Проверить, что класс перенесён без искажений:

```bash
python -c "
import ast, sys
src = open('ml/model.py').read()
cls = [n for n in ast.parse(src).body if isinstance(n, ast.ClassDef)][0]
print('класс:', cls.name, '| методы:', [m.name for m in cls.body if isinstance(m, ast.FunctionDef)])
"
```

Ожидается: `класс: RiskLSTM | методы: ['__init__', 'forward']`.

В `train.py` заменить `from ai_core.predictive_engine import RiskLSTM` на `from model import RiskLSTM`.

В `export_onnx.py` прежний импорт был `from ai_core.predictive_engine import RiskLSTM, MODEL_PATH`. Путь к чекпоинту теперь живёт в конфиге пайплайна, поэтому импорт распадается на два:

```python
from model import RiskLSTM
from config import CHECKPOINT_PATH, ONNX_EXPORT_PATH
```

Все обращения к `MODEL_PATH` в `export_onnx.py` заменить на `CHECKPOINT_PATH`, а путь сохранения `.onnx` — на `ONNX_EXPORT_PATH`, чтобы экспорт сразу клал модель в артефакты пакета.

- [ ] **Шаг 5: Проверить, что рантайм не сломался**

```bash
python -m pytest backend/tests -q
grep -rn "ai_core\|simulator\." --include="*.py" backend/src ml || echo "Ссылок на старые пакеты нет"
```

Ожидается: 50 passed, старых ссылок нет.

- [ ] **Шаг 6: Контрольная точка**

---

### Task 8: Сборка, Docker и Makefile

**Файлы:**
- Изменить: `Dockerfile:25-34,47`, `backend/Dockerfile`, `docker-compose.yml`, `Makefile`, `config.mk`, `package.json`
- Переместить: `convert_docs.py`, `scripts/compile_docs.py` → `docs/tools/`; `competency_matrix.csv`, `roles_matrix.csv` → `docs/reference/`; `README_HF.md` → `docs/deploy/README_HF.md`

**Интерфейсы:**
- Потребляет: пакет `elou_tutor` из Task 6.
- Производит: рабочие образы с точкой входа `elou_tutor.api.main:app`.

- [ ] **Шаг 1: Переписать `backend/Dockerfile`**

```dockerfile
FROM python:3.12-slim

WORKDIR /app

COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ ./backend/
RUN pip install --no-deps ./backend

EXPOSE 8000

CMD ["uvicorn", "elou_tutor.api.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

`--no-deps` при установке пакета нужен потому, что зависимости уже поставлены строкой выше из `requirements.txt` — слой кеша не инвалидируется при правке кода.

- [ ] **Шаг 2: Переписать корневой `Dockerfile`**

Заменить строки 25-34 (установка зависимостей и копирование трёх папок):

```dockerfile
# Python-зависимости
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Код проекта
COPY backend/ ./backend/
RUN pip install --no-deps ./backend

# Собранный фронтенд из Stage 1
COPY --from=frontend-build /build/dist ./frontend/dist
```

и строку 47:

```dockerfile
CMD uvicorn elou_tutor.api.main:app --host 0.0.0.0 --port $PORT
```

Файл остаётся в корне репозитория: Hugging Face Spaces с `sdk: docker` ищет `Dockerfile` только там.

- [ ] **Шаг 3: Обновить `docker-compose.yml`**

Заменить блок монтирования и команду сервиса `backend`:

```yaml
    volumes:
      - tutor_data:/app/data
      - ./backend/src/elou_tutor:/usr/local/lib/python3.12/site-packages/elou_tutor
    command: uvicorn elou_tutor.api.main:app --host 0.0.0.0 --port 8000 --reload
```

и добавить в `environment`:

```yaml
      - LLM_BASE_URL=${LLM_BASE_URL:-http://host.docker.internal:1234}
```

- [ ] **Шаг 4: Обновить `config.mk` и `package.json`**

В `config.mk`:

```makefile
PY_SOURCES ?= backend/src ml
```

В корневом `package.json` заменить скрипт `backend`:

```json
    "backend": "python -m uvicorn elou_tutor.api.main:app --host 127.0.0.1 --port 8000 --reload",
```

В `Makefile` в цели `init` заменить установку зависимостей на установку пакета:

```makefile
	$(PYTHON) -m pip install --user -r $(PY_REQUIREMENTS)
	$(PYTHON) -m pip install --user -e backend
```

- [ ] **Шаг 5: Прибраться в корне**

```bash
mkdir -p docs/tools docs/reference docs/deploy
git mv convert_docs.py scripts/compile_docs.py docs/tools/
git mv competency_matrix.csv roles_matrix.csv docs/reference/
git mv README_HF.md docs/deploy/README_HF.md
rmdir scripts
```

- [ ] **Шаг 6: Добавить `.env.example`**

Дописать в `.env.example`:

```
# Адрес LM Studio для ИИ-чата. В Docker контейнер обращается к хосту.
LLM_BASE_URL=http://host.docker.internal:1234
```

- [ ] **Шаг 7: Пересобрать и проверить package data**

```bash
make start
docker compose exec -T backend python -c "
from elou_tutor.simulation.scenarios import get_scenario_by_id
from elou_tutor.ml.settings import ONNX_PATH
import pathlib
kb = pathlib.Path('/usr/local/lib/python3.12/site-packages/elou_tutor/knowledge_base')
print('сценарий:', get_scenario_by_id('startup') is not None)
print('модель:', ONNX_PATH.exists())
print('база знаний:', len(list(kb.glob('*.md'))), 'файлов')
"
```

Ожидается: `сценарий: True`, `модель: True`, `база знаний: 5 файлов`. Если что-то `False` — не сработал `package-data` в `backend/pyproject.toml` (Task 1, шаг 1).

- [ ] **Шаг 8: Проверить, что прод-образ не везёт лишнее**

```bash
docker compose exec -T backend sh -c "ls /app/ml 2>/dev/null; find / -name 'telemetry_dataset.csv' 2>/dev/null; python -c 'import torch' 2>&1 | tail -1"
```

Ожидается: каталога `/app/ml` нет, датасет не найден, `ModuleNotFoundError: No module named 'torch'`.

- [ ] **Шаг 9: Приёмочная проверка живого стека**

Открыть http://localhost:8080, войти как `operator_1` / `Ktk_2026!` (роль «Оператор»), убедиться: индикатор `ONLINE` с пингом, телеметрия обновляется, открытие V-1 меняет уровень. Затем во второй вкладке войти как `instructor_1` (роль «Инструктор»), включить дефект «Отказ сырьевого насоса», убедиться, что оператор видит реакцию. Завершить сессию кнопкой «Завершить» и проверить ScoreCard.

- [ ] **Шаг 10: Контрольная точка**

---

### Task 9: Документация

**Файлы:**
- Изменить: `README.md`, `ml/README.md`, `docs/reference/simulation.md`, `docs/solution_architecture.md`, `docs/ai_architecture.md`

**Интерфейсы:**
- Потребляет: финальную структуру из Task 8.

- [ ] **Шаг 1: Найти устаревшие пути в документации**

```bash
grep -rn "ai_core/\|simulator/\|backend/main.py\|backend.main:app\|backend/tests" --include="*.md" docs README.md
```

- [ ] **Шаг 2: Обновить найденное**

Для каждой найденной ссылки подставить новый путь по карте переездов из спеки. Раздел «Архитектура репозитория (Monorepo)» в `README.md` переписать под новую структуру: `frontend/`, `backend/src/elou_tutor/` с перечислением шести слоёв, `ml/`, `docs/`.

- [ ] **Шаг 3: Переписать `ml/README.md`**

Документ должен отвечать на три вопроса: как поставить зависимости (`pip install -r ml/requirements.txt`), как переобучить модель (`python train.py` из каталога `ml/`), как экспортировать веса в рантайм (`python export_onnx.py` кладёт `model.onnx` в `backend/src/elou_tutor/ml/artifacts/`).

- [ ] **Шаг 4: Проверить критерии готовности из спеки**

```bash
python -m pytest backend/tests -q
grep -rn "from backend\|import backend" backend/src/elou_tutor/{domain,simulation,tutor,ml} || echo "Восходящих зависимостей нет"
grep -rn "except Exception:" backend/src/elou_tutor/simulation backend/src/elou_tutor/tutor
make lint
git log --follow --oneline backend/src/elou_tutor/simulation/model.py | tail -3
```

Ожидается: тесты зелёные; восходящих зависимостей нет; `git log --follow` показывает историю файла до переименования.

- [ ] **Шаг 5: Контрольная точка**
