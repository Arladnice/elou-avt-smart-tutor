"""
Реестр сценариев обязан переживать пересборку контейнера.

Файл scenarios.json лежит внутри установленного пакета
(site-packages/elou_tutor/data/), а тома под него нет. В проде каталог пакета
живёт ровно до следующего образа, поэтому всё, что инструктор создаёт через
GUI-конструктор, исчезало при каждом редеплое.

Путь записи выносится в каталог данных рядом с базой (том tutor_data), а
встроенные сценарии остаются в пакете как эталонная поставка. При обновлении
образа штатные записи синхронизируются с новой поставкой, а пользовательские
сценарии инструктора сохраняются.
"""

import json
import os

import pytest

from elou_tutor.simulation import scenarios as scenarios_module


@pytest.fixture
def data_dir(tmp_path, monkeypatch):
    """Пустой каталог данных: имитирует свежий том после редеплоя."""
    target = tmp_path / "data" / "scenarios.json"
    monkeypatch.setattr(scenarios_module, "SCENARIOS_FILE_PATH", str(target))
    return target


def test_builtin_scenarios_are_seeded_into_empty_data_dir(data_dir):
    """
    На чистом томе реестр поднимается из поставки, а не оказывается пустым.

    Без этого сервер после первого деплоя отдавал бы пустой список сценариев:
    у оператора не осталось бы ни одного учебного задания.
    """
    assert not data_dir.exists()

    loaded = scenarios_module.load_scenarios()

    assert loaded, "встроенные сценарии не перенесены в каталог данных"
    assert {s["id"] for s in loaded} >= {"startup", "shutdown"}
    assert data_dir.exists(), "рабочий файл реестра не создан"


def test_custom_scenario_survives_package_reinstall(data_dir):
    """
    Пользовательский сценарий переживает подмену каталога пакета.

    Редеплой — это новый образ с тем же томом: файл в каталоге данных остаётся,
    а каталог пакета создаётся заново. Проверяем, что чтение идёт из тома.
    """
    scenarios_module.load_scenarios()
    ok, message = scenarios_module.add_custom_scenario({
        "id": "instructor_drill",
        "title": "Учебная вводная инструктора",
        "checklist": [],
        "golden_sequence": [],
    })
    assert ok, message

    # Новый процесс после редеплоя: состояние в памяти не сохраняется
    reloaded = scenarios_module.load_scenarios()
    ids = {s["id"] for s in reloaded}

    assert "instructor_drill" in ids
    # Добавление своего сценария не должно вытеснять поставку: без переноса
    # встроенных сценариев в том файл создавался бы с одной пользовательской
    # записью, и оператор терял бы все штатные задания.
    assert ids >= {"startup", "shutdown"}


def test_package_update_replaces_builtins_and_preserves_custom(data_dir, tmp_path, monkeypatch):
    """Новый образ обновляет штатные задания, не удаляя сценарии инструктора."""
    package_file = tmp_path / "package" / "scenarios.json"
    package_file.parent.mkdir()
    package_file.write_text(json.dumps({
        "scenarios": [
            {"id": "startup", "title": "Актуальный пуск", "checklist": []},
            {"id": "shutdown", "title": "Актуальный останов", "checklist": []},
        ]
    }, ensure_ascii=False), encoding="utf-8")
    monkeypatch.setattr(scenarios_module, "PACKAGE_SCENARIOS_PATH", str(package_file))

    data_dir.parent.mkdir()
    data_dir.write_text(json.dumps({
        "scenarios": [
            {"id": "startup", "title": "Старый пуск", "checklist": []},
            {
                "id": "instructor_drill",
                "title": "Учебная вводная инструктора",
                "is_custom": True,
                "checklist": [],
            },
        ]
    }, ensure_ascii=False), encoding="utf-8")

    loaded = scenarios_module.load_scenarios()

    assert [(scenario["id"], scenario["title"]) for scenario in loaded] == [
        ("startup", "Актуальный пуск"),
        ("shutdown", "Актуальный останов"),
        ("instructor_drill", "Учебная вводная инструктора"),
    ]
    persisted = json.loads(data_dir.read_text(encoding="utf-8"))["scenarios"]
    assert persisted == loaded


def test_seeding_does_not_overwrite_existing_registry(data_dir):
    """Повторный старт не должен затирать пользовательские сценарии поставкой."""
    scenarios_module.load_scenarios()
    scenarios_module.add_custom_scenario({
        "id": "instructor_drill",
        "title": "Учебная вводная инструктора",
        "checklist": [],
        "golden_sequence": [],
    })

    # Имитируем ещё один рестарт
    for _ in range(3):
        scenarios_module.load_scenarios()

    final = scenarios_module.load_scenarios()
    ids = {s["id"] for s in final}

    assert "instructor_drill" in ids
    assert ids >= {"startup", "shutdown"}
    assert len(ids) == len(final), "повторный перенос поставки продублировал сценарии"


def test_builtin_scenarios_stay_undeletable_after_seeding(data_dir):
    """Перенос в том не должен превращать поставку в удаляемые сценарии."""
    scenarios_module.load_scenarios()

    ok, message = scenarios_module.delete_scenario("startup")

    assert not ok
    assert "встроен" in message.lower()


def test_package_defaults_are_never_written_to(data_dir):
    """
    Каталог пакета остаётся только для чтения.

    В образе он принадлежит root и монтируется как часть слоя: запись туда
    либо падает по правам, либо теряется вместе с контейнером.
    """
    package_defaults = scenarios_module.PACKAGE_SCENARIOS_PATH
    before = json.loads(open(package_defaults, encoding="utf-8").read())

    scenarios_module.load_scenarios()
    scenarios_module.add_custom_scenario({
        "id": "instructor_drill",
        "title": "Учебная вводная инструктора",
        "checklist": [],
        "golden_sequence": [],
    })

    after = json.loads(open(package_defaults, encoding="utf-8").read())
    assert before == after, "поставка сценариев изменена записью пользователя"


def test_explicit_scenarios_path_is_respected(tmp_path, monkeypatch):
    """Переопределение SCENARIOS_PATH продолжает работать — на нём стоят тесты."""
    target = tmp_path / "custom" / "registry.json"
    monkeypatch.setattr(scenarios_module, "SCENARIOS_FILE_PATH", str(target))

    scenarios_module.load_scenarios()

    assert target.exists()
    assert os.path.isdir(os.path.dirname(target))
