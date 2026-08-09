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
    """Уровни: блокировка задана регламентом, сигнализация — учебной моделью."""

    def test_pump_interlock_matches_regulation(self):
        """
        Регламент задаёт единый порог блокировки по уровню — 15%.

        Так описаны Е-1 (LRCSA 603), Е-2 (LRSA 609В), К-2 (LRSA 604А) и все
        стриппинги. Прежние 12% для К-1 выводились из «240 мм по шкале», но
        такого числа в регламенте нет.
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
    """Позиции панели ПАЗ обязаны называться так же, как в регламенте."""

    def test_every_row_declares_its_basis(self):
        for definition in INTERLOCK_DEFINITIONS:
            assert definition.get("basis") in ("регламент", "учебная"), (
                f"позиция {definition['tag']} не объявляет основание"
            )

    def test_regulatory_rows_exist_in_regulation(self, regulation):
        """
        Позиция, объявленная регламентной, обязана встречаться в тексте.

        Прежние обозначения (LIRSA 1a, PIRSA 9a, TIRSA 10a и прочие) в
        регламенте отсутствуют полностью — это была собственная нотация.
        """
        regulatory = [d for d in INTERLOCK_DEFINITIONS if d.get("basis") == "регламент"]
        assert regulatory, "ни одна позиция панели не привязана к регламенту"

        for definition in regulatory:
            # Отсекаем учебные уточнения вида «PRSA 204/II»
            tag = definition["tag"].split("/")[0].strip()
            assert tag in regulation, f"позиция {tag} не найдена в тексте регламента"

    def test_regulatory_rows_cover_the_real_trips(self):
        """
        Реальных блокировок среди моделируемого оборудования ровно три.

        Регламент: PRSA 204 (давление К-1), PRSA 213 (давление К-2) и
        LRSA 604А (уровень куба К-2, запрет пуска Н-4/Н-4А/Н-32/Н-32А).
        Блокировки по температуре в регламенте нет ни одной, по уровню куба
        К-1 — тоже: позиция 602 только регистрирует и сигнализирует.
        """
        regulatory = {d["tag"] for d in INTERLOCK_DEFINITIONS if d.get("basis") == "регламент"}

        assert regulatory == {"PRSA 204", "PRSA 213", "LRSA 604А"}

    def test_training_rows_are_marked(self):
        """Строки без основания в регламенте обязаны быть помечены учебными."""
        training = [d for d in INTERLOCK_DEFINITIONS if d.get("basis") == "учебная"]

        assert training, "все позиции объявлены регламентными — так не бывает"
        for definition in training:
            assert definition.get("note"), (
                f"учебная позиция {definition['tag']} не объясняет, почему она учебная"
            )

    def test_tags_are_unique(self):
        tags = [d["tag"] for d in INTERLOCK_DEFINITIONS]

        assert len(tags) == len(set(tags))
