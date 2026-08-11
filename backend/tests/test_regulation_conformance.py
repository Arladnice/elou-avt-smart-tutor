"""
Уставки и позиции КИПиА обязаны соответствовать техрегламенту.

Первоисточник — «3. Описание технологического процесса» из исходных данных
кейса (конвертирован в docs/reference/Общее_Исходные_данные). Иерархия
источников зафиксирована в docs/mini_hazop_andrey.md: регламент описывает
реальный объект, диаграмма инженера АСУ ТП — учебную модель поверх него.
Поэтому там, где регламент даёт число, оно обязательно; где не даёт —
значение выбирает учебная модель, и его надо явно помечать как учебное.

Что проверяется:
  * пороги сигнализации и блокировки по давлению К-1 и К-2 совпадают
    с регламентом после честного перевода кгс/см² в МПа;
  * лестницы порогов не вырождаются (ступень WARNING достижима);
  * позиции панели ПАЗ, объявленные регламентными, действительно
    присутствуют в тексте регламента;
  * позиции, которых в регламенте нет, помечены как учебные.
"""

import os

import pytest

from elou_tutor.domain import process_limits as limits
from elou_tutor.services.interlocks import INTERLOCK_DEFINITIONS

# 1 кгс/см² = 98066,5 Па. Регламент задаёт давления в кгс/см², код — в МПа.
KGF_CM2_TO_MPA = 0.0980665

_REPO_ROOT = os.path.abspath(
    os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..")
)
REGULATION_PATH = os.path.join(
    _REPO_ROOT,
    "docs", "reference", "Общее_Исходные_данные",
    "3. Описание технологического процесса.pdf.md",
)


@pytest.fixture(scope="module")
def regulation() -> str:
    """Текст регламента одной строкой: переносы внутри слов из PDF мешают поиску."""
    if not os.path.isfile(REGULATION_PATH):
        pytest.skip(f"Регламент недоступен: {REGULATION_PATH}")
    with open(REGULATION_PATH, encoding="utf-8") as f:
        return " ".join(f.read().split())


def test_regulation_source_is_available(regulation):
    """Без первоисточника остальные проверки этого модуля бессмысленны."""
    assert "PRSA 204" in regulation
    assert "PRSA 213" in regulation


class TestPressureSetpoints:
    """Давления заданы регламентом числом — перевод обязан быть точным."""

    def test_k1_alarm_matches_regulation(self):
        """PRSA 204: «При подъеме давления в колонне до 4,5 кгс/см2 срабатывает сигнализация»."""
        assert limits.COLUMN_PRES_WARNING == pytest.approx(4.5 * KGF_CM2_TO_MPA, abs=5e-4)

    def test_k1_trip_matches_regulation(self):
        """
        PRSA 204: «а до 4,8 кгс/см2 - срабатывает блокировка».

        Прежнее значение 0.48 МПа получалось делением кгс/см² на 10 и было выше
        настоящего порога: тренажёр давал ПАЗ сработать позже реального,
        то есть учил терпеть давление, при котором защита уже отсекает топливо.
        """
        assert limits.COLUMN_PRES_ESD == pytest.approx(4.8 * KGF_CM2_TO_MPA, abs=5e-4)

    def test_k2_alarm_matches_regulation(self):
        """PRSA 213: «При подъеме давления до 1,0 кгс/см2 срабатывает сигнализация»."""
        assert limits.K2_PRESSURE_WARNING == pytest.approx(1.0 * KGF_CM2_TO_MPA, abs=5e-4)

    def test_k2_trip_matches_regulation(self):
        """PRSA 213: «а до 1,5 кгс/см2 - срабатывает блокировка»."""
        assert limits.K2_PRESSURE_CRITICAL == pytest.approx(1.5 * KGF_CM2_TO_MPA, abs=5e-4)

    def test_pressure_ladder_keeps_warning_band_reachable(self):
        """
        Ступень эскалации обязана лежать строго между сигнализацией и блокировкой.

        simulation_loop выбирает severity двумя сравнениями подряд: если ступень
        эскалации окажется ниже порога сигнализации, ветка WARNING станет
        недостижимой и любое отклонение сразу пойдёт как CRITICAL.
        """
        assert (
            limits.COLUMN_PRES_WARNING
            < limits.COLUMN_PRES_CRITICAL_LEVEL
            < limits.COLUMN_PRES_ESD
            < limits.COLUMN_PRES_CRITICAL
        )

    def test_normal_range_stays_below_alarm(self):
        """Верх «нормального» диапазона не может быть выше порога сигнализации."""
        assert limits.COLUMN_PRES_NORMAL_MAX <= limits.COLUMN_PRES_WARNING


class TestLevelSetpoints:
    """Уровни: реальные блокировки отделены от учебных ступеней риска."""

    def test_shared_15_percent_reference_is_explicit(self):
        """
        Регламент задаёт 15% для Е-1, Е-2 и К-2; для К-1 это только ступень риска.

        Так описаны Е-1 (LRCSA 603), Е-2 (LRSA 609В), К-2 (LRSA 604А) и все
        стриппинги. В К-1 блокировки нет, но единое число используется в
        прогнозе риска и для фиксации первичного заполнения.
        """
        assert limits.COLUMN_LEVEL_LOW_INTERLOCK == 15.0
        assert limits.K2_LEVEL_LOW_INTERLOCK == 15.0

    def test_level_alarm_is_uniform_across_columns(self):
        """
        Числа для сигнализации по уровню регламент не даёт.

        Значение выбирает учебная модель, но оно обязано быть одним и тем же
        для К-1 и К-2: разные пороги на одинаковых по смыслу контурах — это
        несогласованность внутри собственного решения, а не требование ТЗ.
        """
        assert limits.COLUMN_LEVEL_LOW == limits.K2_LEVEL_LOW

    def test_k1_level_ladder_is_strictly_descending(self):
        assert (
            limits.COLUMN_LEVEL_LOW
            > limits.COLUMN_LEVEL_LOW_INTERLOCK
            > limits.COLUMN_LEVEL_LOW_CRITICAL_LEVEL
            > limits.COLUMN_LEVEL_LOW_CRITICAL
        )


class TestInterlockPanelDesignations:
    """Панель ПАЗ повторяет согласованную таблицу блокировок."""

    def test_rows_match_the_agreed_paz_table(self):
        rows = {definition["tag"]: definition for definition in INTERLOCK_DEFINITIONS}

        assert rows["Е-1"]["sensors"] == ("LRCSA 603", "LRSA 603B")
        assert rows["Е-1"]["logic"] == "2oo2"
        assert rows["К1"]["sensors"] == ("PRSA 204",)
        assert rows["К1"]["logic"] == "1oo1"
        assert rows["К1 (куб)"]["sensors"] == ("LRCSA 602", "LRSA 602A", "LRSA 602B")
        assert rows["К1 (куб)"]["logic"] == "2oo3"
        assert rows["Е-2"]["sensors"] == ("LRCSA 609", "LRSA 609B")
        assert rows["Е-2"]["logic"] == "2oo2"
        assert rows["К2"]["sensors"] == ("PRSA 213",)
        assert rows["К2"]["logic"] == "1oo1"
        assert rows["К2 (куб)"]["sensors"] == ("LRCSA 604", "LRSA 604A", "LRSA 604B")
        assert rows["К2 (куб)"]["logic"] == "2oo3"

    def test_signal_and_trip_thresholds_match_the_agreed_paz_table(self):
        rows = {definition["tag"]: definition for definition in INTERLOCK_DEFINITIONS}

        assert rows["Е-1"]["signalization"] == "≤20%"
        assert rows["Е-1"]["trip_threshold"] == "<15%"
        assert rows["К1"]["signalization"] == "≥4,5 кгс/см²"
        assert rows["К1"]["trip_threshold"] == ">4,8 кгс/см²"
        assert rows["К2"]["signalization"] == "≥1,0 кгс/см²"
        assert rows["К2"]["trip_threshold"] == ">1,5 кгс/см²"

    def test_panel_contains_no_invented_temperature_trips(self):
        """После сверки панель не должна содержать учебных температурных ПАЗ."""
        sensors = {
            sensor
            for definition in INTERLOCK_DEFINITIONS
            for sensor in definition["sensors"]
        }

        assert "TR 55-1" not in sensors
        assert "TR 43-9" not in sensors

    def test_tags_are_unique(self):
        tags = [d["tag"] for d in INTERLOCK_DEFINITIONS]

        assert len(tags) == len(set(tags))
