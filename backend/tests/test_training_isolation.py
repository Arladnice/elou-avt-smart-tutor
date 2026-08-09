"""Офлайн-пайплайн не должен просачиваться в рантайм-пакет."""

import pathlib

_PACKAGE_ROOT = pathlib.Path(__file__).resolve().parent.parent / "src" / "elou_tutor"


def test_package_does_not_import_training():
    offenders = [
        str(path)
        for path in _PACKAGE_ROOT.rglob("*.py")
        if "import ml_training" in path.read_text(encoding="utf-8")
        or "from ml_training" in path.read_text(encoding="utf-8")
    ]

    assert not offenders, f"пакет не должен зависеть от офлайн-пайплайна: {offenders}"


def test_training_artifacts_are_outside_package():
    assert not list(_PACKAGE_ROOT.rglob("*.pth")), "чекпоинты torch не место в пакете"
    assert not list(_PACKAGE_ROOT.rglob("*.csv")), "датасет не место в пакете"
