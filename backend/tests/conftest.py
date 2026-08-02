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
_test_db = os.path.join(_TESTS_DIR, "tutor_test.db")
os.environ.setdefault("DATABASE_PATH", _test_db)
os.environ.setdefault("INTEGRITY_SALT", "test_integrity_salt_2026")
os.environ.setdefault("SECRET_KEY", "test_jwt_secret_key_2026")

# База удаляется перед прогоном, а не переиспользуется. Причина конкретная:
# хэши цепочки аудита считаются с INTEGRITY_SALT, поэтому база, оставшаяся от
# прогона с другой солью, роняет проверку целостности — прогон падал бы из-за
# мусора от предыдущего запуска, а не из-за кода. Заодно это снимает зависимость
# результатов от порядка выполнения тестов, ломающих цепочку намеренно.
for _suffix in ("", "-wal", "-shm"):
    try:
        os.remove(_test_db + _suffix)
    except FileNotFoundError:
        pass

# Реестр сценариев — копия во временном каталоге: эндпоинты создания и удаления
# сценариев пишут на диск, и без этого прогон менял бы боевой реестр внутри пакета
# (backend/src/elou_tutor/data/scenarios.json)
_real_scenarios = os.path.join(_BACKEND_DIR, "src", "elou_tutor", "data", "scenarios.json")
_tmp_scenarios = os.path.join(tempfile.mkdtemp(prefix="elou_scenarios_"), "scenarios.json")
if os.path.isfile(_real_scenarios):
    shutil.copyfile(_real_scenarios, _tmp_scenarios)
os.environ["SCENARIOS_PATH"] = _tmp_scenarios
