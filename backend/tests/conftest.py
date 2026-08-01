"""
Общая изоляция тестового окружения.

Импортируется pytest до тестовых модулей, поэтому переменные окружения
успевают попасть в модули приложения на этапе их импорта.
"""

import os
import shutil
import tempfile

_TESTS_DIR = os.path.dirname(os.path.abspath(__file__))
_BACKEND_DIR = os.path.dirname(_TESTS_DIR)

# Тестовая БД отдельно от рабочей базы разработчика
os.environ.setdefault("DATABASE_PATH", os.path.join(_TESTS_DIR, "tutor_test.db"))

# Реестр сценариев — копия во временном каталоге: эндпоинты создания и удаления
# сценариев пишут на диск, и без этого прогон менял бы backend/data/scenarios.json
_real_scenarios = os.path.join(_BACKEND_DIR, "data", "scenarios.json")
_tmp_scenarios = os.path.join(tempfile.mkdtemp(prefix="elou_scenarios_"), "scenarios.json")
if os.path.isfile(_real_scenarios):
    shutil.copyfile(_real_scenarios, _tmp_scenarios)
os.environ["SCENARIOS_PATH"] = _tmp_scenarios
