"""
Физические пороги, лимиты и начальные состояния установки ЭЛОУ-АВТ.

Значения взяты из технологического регламента. Слой domain ни от чего
в проекте не зависит — только stdlib.
"""

# === Physical Thresholds (from tech regulations) ===
FURNACE_TEMP_CRITICAL = 365.0     # °C (Прогар змеевика П-2, авария)
FURNACE_TEMP_WARNING = 340.0      # °C (Максимум для П-3)
COLUMN_TEMP_CRITICAL = 150.0      # °C (Максимум верха К-1)
FURNACE_TEMP_MIN_STARTUP = 298.0  # °C (Цель 300°C с допуском 2°C при пуске)
FURNACE_TEMP_MAX_SHUTDOWN = 245.0 # °C (Максимум при останове)

COLUMN_PRES_CRITICAL = 0.60       # МПа (Разгерметизация)
COLUMN_PRES_ESD = 0.48            # МПа (Автоматическая блокировка ПАЗ)
COLUMN_PRES_WARNING = 0.40        # МПа (Предупреждение)
COLUMN_PRES_NORMAL_MAX = 0.45     # МПа
COLUMN_PRES_NORMAL_MIN = 0.10     # МПа

COLUMN_LEVEL_HIGH_CRITICAL = 98.0 # % (Полное переполнение)
COLUMN_LEVEL_HIGH = 85.0          # % (Предупреждение)
COLUMN_LEVEL_LOW = 18.0           # % (Предупреждение по низкому уровню)
COLUMN_LEVEL_LOW_INTERLOCK = 12.0 # % (240 мм по шкале К-1: ПАЗ / блокировка насосов куба)
COLUMN_LEVEL_LOW_CRITICAL = 5.0   # % (Полное опустошение, сухой ход и авария)
COLUMN_LEVEL_BALANCE_MIN = 20.0   # %
COLUMN_LEVEL_BALANCE_MAX = 80.0   # %

# Шкалы уровнемеров относятся к кубовой части колонн, а не к полной высоте.
K1_LEVEL_FULL_SCALE_MM = 2000.0   # мм = 100% шкалы уровня куба К-1
K2_LEVEL_FULL_SCALE_MM = 4000.0   # мм = 100% шкалы уровня куба К-2
SETPOINT_ACCEPTANCE_TOLERANCE = 2.0  # °C, допуск зачёта достижения уставки

# === K-2 physical model (расчёт инженера АСУ ТП Андрея, 06.08.2026) ===
K2_TRAY_PRESSURE_DROP_MPA = 0.0208       # МПа, расчётный перепад по 43 тарелкам
K2_LEVEL_RISE_PCT_PER_SEC = 100.0 / (6.7 * 60.0)  # %/с, заполнение пустого куба за 6,7 мин
K2_LEVEL_RESPONSE_DELAY_SEC = 45         # с, запаздывание показаний уровня (40–50 с)
K2_PRESSURE_RISE_MPA_PER_SEC = 0.0000404 # МПа/с при накоплении несконденсированных газов
K2_COOLING_FULL_C_PER_SEC = 0.0582       # °C/с, охлаждение полностью заполненного куба

K2_PRESSURE_NORMAL = 0.04                # МПа, нормальное остаточное давление
K2_PRESSURE_WARNING = 0.098              # МПа, 1,0 кгс/см² — сигнализация PRSA 213
K2_PRESSURE_CRITICAL = 0.147             # МПа, 1,5 кгс/см² — блокировка PRSA 213
K2_PRESSURE_MAX_LIMIT = 0.16             # МПа, верхняя граница шкалы учебной модели
K2_TEMP_NORMAL = 350.0                   # °C, расчётная температура куба
K2_TEMP_WARNING = 360.0                  # °C, предупреждение о перегреве мазута
K2_TEMP_CRITICAL = 375.0                 # °C, риск коксования и крекинга
K2_TEMP_MIN_LIMIT = 150.0                # °C, нижняя граница учебной шкалы
K2_TEMP_MAX_LIMIT = 420.0                # °C, верхняя граница учебной шкалы
# Пороги ниже соответствуют ПАЗ-таблице из docs/mini_hazop_andrey.md
# (позиции LRCSA 604, LRSA 604A/604B, голосование 2oo3).
K2_LEVEL_LOW = 20.0                      # %, сигнализация низкого уровня
K2_LEVEL_LOW_INTERLOCK = 15.0            # %, блокировка насосов Н-4/Н-32
K2_LEVEL_LOW_CRITICAL = 8.0              # %, критическая ступень сигнализации (ниже блокировки)
K2_LEVEL_HIGH = 85.0                     # %, предупреждение по верхнему уровню
K2_LEVEL_HIGH_CRITICAL = 90.0            # %, критическая ступень сигнализации

# === Timeouts & Duration Thresholds ===
STARTUP_MIN_TIME_SEC = 45         # Минимальное время сессии для стабилизации пуска
SESSION_MAX_TIME_SEC = 300        # Максимальное время сессии (5 минут)

# === Alert Escalation Thresholds ===
# Вторая ступень тревоги: срабатывает строго ЗА порогом предупреждения
# (340 → 350, 0.40 → 0.43, 85 → 90, 18 → 8). Если ступени совпадут,
# ветка WARNING в simulation_loop выродится в пустой интервал.
FURNACE_TEMP_CRITICAL_LEVEL = 350.0        # °C (Критический порог температуры печи для эскалации)
COLUMN_PRES_CRITICAL_LEVEL = 0.43          # МПа (Критический порог давления колонны для эскалации)
COLUMN_LEVEL_HIGH_CRITICAL_LEVEL = 90.0    # % (Критический верхний порог уровня куба для эскалации)
COLUMN_LEVEL_LOW_CRITICAL_LEVEL = 8.0      # % (Критический нижний порог уровня куба для эскалации)
ESCALATION_WARNING_DELAY_SEC = 30.0        # секунд (Время до предупреждения о бездействии оператора)
ESCALATION_CRITICAL_DELAY_SEC = 60.0       # секунд (Время до критической ошибки при бездействии оператора)

# === Physical Limits (Clamping & Bounds) ===
FURNACE_TEMP_MIN_LIMIT = 20.0       # °C (Холодная печь, абсолютный минимум)
FURNACE_TEMP_MAX_LIMIT = 600.0      # °C (Максимальная температура по шкале КИПиА)
COLUMN_PRES_MIN_LIMIT = 0.05        # МПа (Атмосферное давление)
COLUMN_PRES_MAX_LIMIT = 2.0         # МПа (Предельное давление по шкале датчиков)
COLUMN_LEVEL_MIN_LIMIT = 0.0        # % (Пустой куб)
COLUMN_LEVEL_MAX_LIMIT = 100.0      # % (Полный куб)

# === Initial State Physics Defaults ===
STARTUP_INITIAL_TEMP = 20.0         # °C
STARTUP_INITIAL_PRES = 0.05         # МПа
STARTUP_INITIAL_LEVEL = 0.0         # %
STARTUP_SETPOINT_TEMP = 240.0       # °C

NORMAL_INITIAL_TEMP = 280.0          # °C
NORMAL_INITIAL_PRES = 0.25          # МПа
NORMAL_INITIAL_LEVEL = 50.0         # %
NORMAL_SETPOINT_TEMP = 280.0        # °C

# === Process Timing & Dynamic Thresholds ===
STARTUP_HEATING_THRESHOLD_TEMP = 300.0   # °C (Выход печи на рабочий режим при пуске)
STARTUP_FILLING_TIME_LIMIT_SEC = 120     # с (Первичное заполнение колонны при пуске)
VALVE_ACTION_TIMEOUT_SEC = 15            # с (Время выдержки после открытия клапана)
ACCIDENT_NON_STARTUP_MIN_TIME_SEC = 40   # с (Защита от ложной аварии при запуске обычных сценариев)
ACCIDENT_STARTUP_MAX_TIME_SEC = 180      # с (Предельное время для заполнения куба при пуске)
