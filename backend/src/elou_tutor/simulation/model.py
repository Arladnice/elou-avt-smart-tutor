import random
import copy

from elou_tutor.simulation.scenarios import get_scenario_by_id
from elou_tutor.simulation.k2 import K2Dynamics
from elou_tutor.domain.process_limits import (
    COLUMN_PRES_ESD, FURNACE_TEMP_CRITICAL, COLUMN_LEVEL_LOW_CRITICAL,
    COLUMN_LEVEL_HIGH_CRITICAL, COLUMN_LEVEL_LOW_INTERLOCK,
    FURNACE_TEMP_MIN_LIMIT, FURNACE_TEMP_MAX_LIMIT,
    COLUMN_PRES_MIN_LIMIT, COLUMN_PRES_MAX_LIMIT,
    COLUMN_LEVEL_MIN_LIMIT, COLUMN_LEVEL_MAX_LIMIT,
    STARTUP_INITIAL_TEMP, STARTUP_INITIAL_PRES, STARTUP_INITIAL_LEVEL, STARTUP_SETPOINT_TEMP,
    NORMAL_INITIAL_TEMP, NORMAL_INITIAL_PRES, NORMAL_INITIAL_LEVEL, NORMAL_SETPOINT_TEMP,
    ACCIDENT_NON_STARTUP_MIN_TIME_SEC, ACCIDENT_STARTUP_MAX_TIME_SEC,
    K2_PRESSURE_NORMAL, K2_PRESSURE_CRITICAL, K2_TEMP_NORMAL,
    TRAINING_ACCELERATION,
)

class ELOUAVTSimulator:
    """
    Математическая модель физико-химических процессов установки ЭЛОУ-АВТ-1.
    Моделирует динамику:
      - Температуры печи П-1 (влияние сырья V-1 и уставки горелок)
      - Давления в колонне К-1 (зависимость от температуры и сброса V-2)
      - Уровня в колонне К-1 (приход V-1, дренаж V-3)
      - Влияние неисправностей (отказы оборудования), задаваемых инструктором.
    """
    def __init__(self):
        self.k2_dynamics = K2Dynamics()
        self.reset()

    def reset(self, scenario_id: str = "shutdown"):
        self.scenario_id = scenario_id
        self._startup_filled = False
        # К-2 в холодном пуске заполняется только после подачи из К-1. До
        # первого достижения уставки низкий уровень не является аварией.
        self._startup_k2_filled = False
        self.k2_dynamics.reset()
        # Активные неисправности (задаются инструктором)
        self.defects = {
            "pump_fail": False,       # Отказ сырьевого насоса (сырье не идет даже при открытом V_1)
            "coil_overheat": False,   # Прогар/перегрев змеевика печи (аномальный неконтролируемый нагрев)
            "valve_jam": False,       # Заедание клапана сброса V_2 (не снижает давление при открытии)
            "power_fail": False,      # Отказ электроснабжения (останов насосов, падение уставки горелок до 20°C)
            "air_fail": False,        # Отказ воздуха КИПиА (V-1 и V-3 переходят в закрытое состояние, V-2 блокируется)
            "steam_fail": False,      # Срыв подачи отпарного пара (прекращение отпарки в стриппинге, рост P-1 и L-1)
            "elou_desalt_fail": False,# Нарушение электрообессоливания в ЭЛОУ (проскок солей/воды)
            "vt_vacuum_loss": False,  # Срыв подачи пара на пароэжекторную группу ВТ (потеря вакуума)
            "k2_pump_fail": False     # Отказ насосов откачки куба К-2 Н-4/Н-32
        }
        
        self.status = "running"       # "running", "paused", "esd" (аварийный останов), "accident" (авария)
        self.time_elapsed = 0         # Время сессии в секундах
        self.accident_reason = ""     # Причина аварии

        sc = get_scenario_by_id(scenario_id)

        if sc and "initial_state" in sc:
            st = sc["initial_state"]
            self.valves = {
                "V_1": st.get("V_1", False),
                "V_2": st.get("V_2", False),
                "V_3": st.get("V_3", False),
                "V_ELOU": st.get("V_ELOU", True),
                "V_VT": st.get("V_VT", True),
                "V_P3_OUT": st.get("V_P3_OUT", True),
                "V_P3_RETURN": st.get("V_P3_RETURN", True),
                "V_P1_IN": st.get("V_P1_IN", True),
                "V_K2_OUT_32": st.get("V_K2_OUT_32", True),
                "V_K2_OUT_4": st.get("V_K2_OUT_4", True),
                "HC_P1": st.get("HC_P1", False),
                "HC_P3": st.get("HC_P3", False),
                "FUEL_P1": st.get("FUEL_P1", True),
                "FUEL_P3": st.get("FUEL_P3", True),
                "V_STEAM_K1": st.get("V_STEAM_K1", True),
                "V_STEAM_K2": st.get("V_STEAM_K2", True),
                "V_K2_RELIEF": st.get("V_K2_RELIEF", False),
                "V_E1_DRAIN": st.get("V_E1_DRAIN", False),
                "V_E2_DRAIN": st.get("V_E2_DRAIN", False),
            }
            self.pumps = {
                pump_id: st.get(pump_id, True)
                for pump_id in ("N_20", "N_2", "N_3", "N_4", "N_32")
            }
            self.setpoints = {
                "T_1_Sp": st.get("T_1_Sp", 280.0),
                "T_3_Sp": st.get("T_3_Sp", st.get("T_1_Sp", 280.0)),
                "F_in_Sp": st.get("F_in_Sp", 100.0),
            }
            self.sensors = {
                "T_1": st.get("T_1", 280.0),
                "T_3": st.get("T_3", st.get("T_1", 280.0)),
                "P_1": st.get("P_1", 0.35),
                "L_1": st.get("L_1", 50.0),
                "Sal_1": st.get("Sal_1", 4.2),
                "W_1": st.get("W_1", 0.15),
                "P_vac": st.get("P_vac", K2_PRESSURE_NORMAL),
                "T_2": st.get("T_2", K2_TEMP_NORMAL),
                "L_2": st.get("L_2", 50.0),
                "L_E1": st.get("L_E1", 50.0),
                "L_E2": st.get("L_E2", 50.0),
                "Flame_P1": st.get("Flame_P1", st.get("FUEL_P1", True)),
                "Flame_P3": st.get("Flame_P3", st.get("FUEL_P3", True)),
                "F_in": st.get("F_in_Sp", 100.0),
            }
        elif scenario_id == "startup":
            # Холодное состояние для пуска
            self.valves = {
                "V_1": False,     # Вход сырья в печь закрыт
                "V_2": False,     # Сброс давления из колонны закрыт
                "V_3": False,     # Дренаж куба колонны закрыт
                "V_ELOU": True,   # Подача деэмульгатора в ЭЛОУ
                "V_VT": True,     # Рабочий пар на эжекторы ВТ
                "V_P3_OUT": True, "V_P3_RETURN": True, "V_P1_IN": False,
                "V_K2_OUT_32": False, "V_K2_OUT_4": False,
                "HC_P1": False, "HC_P3": False,
                "FUEL_P1": False, "FUEL_P3": False,
                "V_STEAM_K1": False, "V_STEAM_K2": False,
                "V_K2_RELIEF": False, "V_E1_DRAIN": False, "V_E2_DRAIN": False,
            }
            self.pumps = {pump_id: False for pump_id in ("N_20", "N_2", "N_3", "N_4", "N_32")}
            self.setpoints = {
                "T_1_Sp": STARTUP_SETPOINT_TEMP,
                "T_3_Sp": STARTUP_SETPOINT_TEMP,
                "F_in_Sp": 100.0,
            }
            self.sensors = {
                "T_1": STARTUP_INITIAL_TEMP,    # Холодная печь
                "T_3": STARTUP_INITIAL_TEMP,
                "P_1": STARTUP_INITIAL_PRES,    # Атмосферное давление
                "L_1": STARTUP_INITIAL_LEVEL,   # Пустая колонна
                "Sal_1": 4.2,                   # Солесодержание в норме (мг/л)
                "W_1": 0.15,                    # Обводненность в норме (%)
                "P_vac": K2_PRESSURE_NORMAL,    # Остаточное давление в К-2 (МПа)
                "T_2": K2_TEMP_NORMAL,          # Температура куба К-2 (°C)
                "L_2": 50.0,                    # Уровень куба К-2 (% от 4000 мм)
                "L_E1": 50.0, "L_E2": 50.0,
                "Flame_P1": False, "Flame_P3": False,
                "F_in": 0.0,
            }
        else:
            # Нормальное рабочее состояние для останова и прочих тестов
            self.valves = {
                "V_1": True,      # Вход сырья в печь
                "V_2": False,     # Сброс давления из колонны
                "V_3": True,      # Дренаж куба колонны
                "V_ELOU": True,   # Подача деэмульгатора в ЭЛОУ
                "V_VT": True,     # Рабочий пар на эжекторы ВТ
                "V_P3_OUT": True, "V_P3_RETURN": True, "V_P1_IN": True,
                "V_K2_OUT_32": True, "V_K2_OUT_4": True,
                "HC_P1": False, "HC_P3": False,
                "FUEL_P1": True, "FUEL_P3": True,
                "V_STEAM_K1": True, "V_STEAM_K2": True,
                "V_K2_RELIEF": False, "V_E1_DRAIN": False, "V_E2_DRAIN": False,
            }
            self.pumps = {pump_id: True for pump_id in ("N_20", "N_2", "N_3", "N_4", "N_32")}
            self.setpoints = {
                "T_1_Sp": NORMAL_SETPOINT_TEMP,
                "T_3_Sp": NORMAL_SETPOINT_TEMP,
                "F_in_Sp": 100.0,
            }
            self.sensors = {
                "T_1": NORMAL_INITIAL_TEMP,   # T-1 (Температура печи), °C
                "T_3": NORMAL_INITIAL_TEMP,
                "P_1": NORMAL_INITIAL_PRES,   # P-1 (Давление в колонне), МПа
                "L_1": NORMAL_INITIAL_LEVEL,  # L-1 (Уровень в колонне), %
                "Sal_1": 4.2,                 # Sal-1 (Солесодержание), мг/л
                "W_1": 0.15,                  # W-1 (Содержание воды), %
                "P_vac": K2_PRESSURE_NORMAL,  # P-vac (остаточное давление К-2), МПа
                "T_2": K2_TEMP_NORMAL,        # T-2 (Температура К-2), °C
                "L_2": 50.0,                  # L-2 (Уровень куба К-2), %
                "L_E1": 50.0, "L_E2": 50.0,
                "Flame_P1": True, "Flame_P3": True,
                "F_in": 100.0,
            }

    def set_valve(self, valve_id: str, state: bool):
        """Переключение состояния пневматических клапанов с учетом наличия воздуха КИПиА."""
        if self.status != "running":
            return
        # При отказе воздуха КИПиА (air_fail) клапаны V-1 и V-3 удерживаются закрытыми (Fail-Closed),
        # а клапан V-2 блокируется в текущем положении.
        if self.defects.get("air_fail", False):
            if valve_id in ["V_1", "V_3"]:
                return
            elif valve_id == "V_2":
                return
        if valve_id in self.valves:
            self.valves[valve_id] = state

    def set_setpoint(self, name: str, value: float):
        """Изменение уставки с проверкой работы оборудования."""
        if self.status != "running":
            return
        if name in self.setpoints:
            self.setpoints[name] = value

    def set_pump(self, pump_id: str, state: bool) -> None:
        """Пускает или останавливает технологический насос по команде оператора."""
        if self.status != "running" or self.defects.get("power_fail", False):
            return
        if pump_id in self.pumps:
            if pump_id in {"N_4", "N_32"} and self.sensors["L_2"] <= 15.0 and state:
                return
            self.pumps[pump_id] = state

    def set_defect(self, defect_id: str, state: bool):
        """Активация или деактивация неисправностей оборудования (инструктором)."""
        if defect_id in self.defects:
            self.defects[defect_id] = state
            # Отказ электроснабжения: немедленно тушит горелки печи (уставка падает до 20°C)
            if defect_id == "power_fail" and state:
                self.setpoints["T_1_Sp"] = 20.0
                self.setpoints["T_3_Sp"] = 20.0
                for pump_id in self.pumps:
                    self.pumps[pump_id] = False
                self.valves["FUEL_P1"] = False
                self.valves["FUEL_P3"] = False
            # Отказ воздуха КИПиА: регулирующие клапаны V-1 и V-3 переходят в закрытое состояние (безопасное положение)
            if defect_id == "air_fail" and state:
                self.valves["V_1"] = False
                self.valves["V_3"] = False

    def step(self):
        """
        Шаг моделирования (1 секунда реального времени).
        Рассчитывает новые значения параметров по дифференциальным уравнениям.
        """
        if self.status != "running":
            return self.get_state()

        self.time_elapsed += 1

        # Извлекаем текущие параметры
        T = self.sensors["T_1"]
        P = self.sensors["P_1"]
        L = self.sensors["L_1"]
        
        V_1 = self.valves["V_1"]
        V_2 = self.valves["V_2"]
        V_3 = self.valves["V_3"]
        V_ELOU = self.valves.get("V_ELOU", True)
        V_VT = self.valves.get("V_VT", True)
        T_sp = self.setpoints["T_1_Sp"]
        T_3 = self.sensors["T_3"]
        T_3_sp = self.setpoints["T_3_Sp"]

        # -------------------------------------------------------------
        # 0. Моделирование агрегированного блока ЭЛОУ (Соли Sal_1, Вода W_1)
        # -------------------------------------------------------------
        sal_target = 4.2
        w_target = 0.15
        if self.defects.get("elou_desalt_fail", False) or not V_ELOU:
            sal_target = 42.0  # Проскок солей до 42 мг/л
            w_target = 3.2     # Проскок влаги до 3.2%
        
        next_Sal = self.sensors["Sal_1"] + (sal_target - self.sensors["Sal_1"]) * 0.15 + (random.random() - 0.5) * 0.2
        next_W = self.sensors["W_1"] + (w_target - self.sensors["W_1"]) * 0.15 + (random.random() - 0.5) * 0.02
        next_Sal = max(1.0, min(50.0, next_Sal))
        next_W = max(0.05, min(5.0, next_W))

        # -------------------------------------------------------------
        # 0.1. Физическая модель К-2 по расчёту инженера АСУ ТП Андрея
        # -------------------------------------------------------------
        next_L_2, next_P_vac, next_T_2 = self.k2_dynamics.step(
            level=self.sensors["L_2"],
            pressure=self.sensors["P_vac"],
            temperature=self.sensors["T_2"],
            # При потере электроснабжения насос Н-2 остановлен, поэтому
            # передача кубового продукта К-1 в К-2 прекращается даже при
            # оставшемся открытым V-3.
            feed_open=(
                V_3 and self.valves["V_P1_IN"] and self.pumps["N_2"]
                and not self.defects["power_fail"]
            ),
            outflow_available=(
                not self.defects["power_fail"]
                and not self.defects["k2_pump_fail"]
                and (
                    (self.valves["V_K2_OUT_32"] and self.pumps["N_32"])
                    or (self.valves["V_K2_OUT_4"] and self.pumps["N_4"])
                )
            ),
            vacuum_available=V_VT and not self.defects["vt_vacuum_loss"],
            heat_available=(
                self.valves["FUEL_P1"] and self.valves["V_STEAM_K2"]
                and not self.defects["power_fail"]
            ),
            relief_open=self.valves["V_K2_RELIEF"],
        )
        if next_L_2 >= 20.0:
            self._startup_k2_filled = True

        # -------------------------------------------------------------
        # 1. Моделирование расхода сырья (F_in) с учетом неисправностей и блокировок ПАЗ
        # -------------------------------------------------------------
        F_in = 0.0
        if V_1 and self.pumps["N_20"] and not self.defects["pump_fail"] and not self.defects["power_fail"]:
            F_in = self.setpoints["F_in_Sp"] / 100.0

        # -------------------------------------------------------------
        # 2. Нагрев от горелок и охлаждение сырьем (Блок АТ)
        # -------------------------------------------------------------
        fuel_p1 = self.valves["FUEL_P1"] and not self.defects["power_fail"]
        if F_in > 0.0 and fuel_p1:
            Q_heat = (T_sp - T) * 0.15 + F_in * (T_sp - 60.0) * 0.05
            Q_cool = F_in * (T - 60.0) * 0.05
        else:
            Q_heat = max(0.0, (T_sp - STARTUP_SETPOINT_TEMP) * 0.18) if fuel_p1 else 0.0
            Q_cool = (T - 60.0) * 0.01 + ( (T - STARTUP_INITIAL_TEMP) * 0.02 if self.defects["power_fail"] else 0.0 )

        if self.defects["coil_overheat"]:
            Q_heat += 4.5
        
        dT = Q_heat - Q_cool + (random.random() - 0.5) * 0.4
        next_T = T + dT
        next_T = max(FURNACE_TEMP_MIN_LIMIT, min(FURNACE_TEMP_MAX_LIMIT, next_T))
        p3_flow = self.valves["V_P3_OUT"] and self.valves["V_P3_RETURN"] and self.pumps["N_3"]
        fuel_p3 = self.valves["FUEL_P3"] and not self.defects["power_fail"]
        if fuel_p3:
            p3_heat_rate = 0.12 if p3_flow or self.valves["HC_P3"] else 0.04
            next_T_3 = T_3 + (T_3_sp - T_3) * p3_heat_rate + (random.random() - 0.5) * 0.3
        else:
            next_T_3 = T_3 - max(0.2, (T_3 - 60.0) * 0.015)
        next_T_3 = max(FURNACE_TEMP_MIN_LIMIT, min(FURNACE_TEMP_MAX_LIMIT, next_T_3))

        # -------------------------------------------------------------
        # 3. Моделирование материального баланса колонны К-1 (Уровень L)
        # -------------------------------------------------------------
        dL = 0.0
        if F_in > 0.0:
            dL += 0.5
        if V_3 and self.pumps["N_2"] and not self.defects["power_fail"]:
            dL -= 0.6
            
        steam_k1_available = self.valves["V_STEAM_K1"] and not self.defects["steam_fail"]
        if not steam_k1_available:
            dL += 0.25
            
        # Межблочная связь ВТ -> АТ: потеря вакуума в К-2 вызывает подпор куба К-1
        if next_P_vac > 0.07:
            dL += 0.35

        next_L = L + dL + (random.random() - 0.5) * 0.1
        next_L = max(COLUMN_LEVEL_MIN_LIMIT, min(COLUMN_LEVEL_MAX_LIMIT, next_L))
        if next_L >= COLUMN_LEVEL_LOW_INTERLOCK:
            self._startup_filled = True

        # -------------------------------------------------------------
        # 4. Моделирование давления в колонне К-1 (Давление P)
        # -------------------------------------------------------------
        if self.scenario_id == "startup" and not self._startup_filled:
            temp_factor = min(1.0, max(0.0, (next_T - 100.0) / 180.0))
            level_factor = min(1.0, max(0.0, next_L / 30.0))
            P_target = STARTUP_INITIAL_PRES + (NORMAL_INITIAL_PRES - STARTUP_INITIAL_PRES) * temp_factor * level_factor
            dP = (P_target - P) * 0.1
        else:
            dP = (next_T - NORMAL_INITIAL_TEMP) * 0.0002 + (next_L - NORMAL_INITIAL_LEVEL) * 0.0001 - (P - NORMAL_INITIAL_PRES) * 0.05
        
        if V_2 and not self.defects["valve_jam"]:
            dP -= 0.009
            
        if not steam_k1_available:
            dP += 0.006
            
        # Межблочная связь ЭЛОУ -> АТ: вскипание влаги и солей вызывают рост давления dP
        if next_W > 1.5:
            dP += 0.008

        next_P = P + dP + (random.random() - 0.5) * 0.002
        next_P = max(COLUMN_PRES_MIN_LIMIT, min(COLUMN_PRES_MAX_LIMIT, next_P))

        # Обновляем все датчики
        self.sensors["T_1"] = round(next_T, 2)
        self.sensors["T_3"] = round(next_T_3, 2)
        self.sensors["P_1"] = round(next_P, 3)
        self.sensors["L_1"] = round(next_L, 2)
        self.sensors["Sal_1"] = round(next_Sal, 1)
        self.sensors["W_1"] = round(next_W, 2)
        # Расчётные скорости К-2 меньше шага старых индикаторов, поэтому
        # сохраняем повышенную точность, а форматируем значения уже в UI.
        self.sensors["P_vac"] = round(next_P_vac, 5)
        self.sensors["T_2"] = round(next_T_2, 2)
        self.sensors["L_2"] = round(next_L_2, 2)
        e1_delta = -0.8 if self.valves["V_E1_DRAIN"] else 0.0
        e2_delta = -0.8 if self.valves["V_E2_DRAIN"] else 0.0
        self.sensors["L_E1"] = round(max(0.0, min(100.0, self.sensors["L_E1"] + e1_delta)), 2)
        self.sensors["L_E2"] = round(max(0.0, min(100.0, self.sensors["L_E2"] + e2_delta)), 2)
        self.sensors["Flame_P1"] = bool(fuel_p1 and self.setpoints["T_1_Sp"] > 100.0)
        self.sensors["Flame_P3"] = bool(fuel_p3 and self.setpoints["T_3_Sp"] > 100.0)
        self.sensors["F_in"] = round(F_in * 100.0, 1)

        # Регламентные действия ПАЗ: по высокому давлению отсечь топливо и пар.
        if next_P >= COLUMN_PRES_ESD:
            self.valves["FUEL_P1"] = False
            self.valves["FUEL_P3"] = False
            self.valves["V_STEAM_K1"] = False
        if next_P_vac >= K2_PRESSURE_CRITICAL:
            self.valves["FUEL_P1"] = False
            self.valves["V_STEAM_K2"] = False

        # -------------------------------------------------------------
        # 5. Проверка аварийных условий и блокировок (ПАЗ / ESD)
        # -------------------------------------------------------------
        # Согласно техрегламенту (позиция PRSA 204), 1 кгс/см² = 0.0980665 МПа:
        # Рабочее давление верха: 1 - 4.5 кгс/см² (0.098 - 0.441 МПа)
        # Срабатывание сигнализации по высокому давлению: 4.5 кгс/см² (0.4413 МПа)
        # Срабатывание ПАЗ (блокировка горелок, отсечка сырья и бутана): 4.8 кгс/см² (0.4707 МПа)
        
        if next_P >= COLUMN_PRES_ESD:
            self.status = "accident"
            self.accident_reason = f"Критическое превышение давления в колонне К-1 (более {COLUMN_PRES_ESD} МПа). Взрыв колонны и выброс нефтепродуктов!"
        elif next_T >= FURNACE_TEMP_CRITICAL:
            self.status = "accident"
            self.accident_reason = f"Критический перегрев печи П-1 (выше {FURNACE_TEMP_CRITICAL}°C). Прогар змеевика, коксование и пожар в топочной камере!"
        elif next_L <= COLUMN_LEVEL_LOW_CRITICAL:
            # Авария по низкому уровню: срыв насосов куба (п. 7.9.1)
            # При startup авария не срабатывает до заполнения колонны ИЛИ до 180с,
            # чтобы дать оператору время набрать уровень.
            # При других сценариях — защита от ложных срабатываний первые 40с.
            is_startup = self.scenario_id == "startup"
            was_filled = self._startup_filled
            if is_startup:
                low_level_accident_allowed = was_filled or self.time_elapsed > ACCIDENT_STARTUP_MAX_TIME_SEC
            else:
                low_level_accident_allowed = self.time_elapsed > ACCIDENT_NON_STARTUP_MIN_TIME_SEC
            if low_level_accident_allowed:
                self.status = "accident"
                self.accident_reason = f"Аварийно низкий уровень в колонне К-1 (ниже {COLUMN_LEVEL_LOW_CRITICAL}%). Срыв сырьевых насосов, сухой ход и разрушение торцевых уплотнений (п. 7.9.1 техрегламента)!"
        elif next_L >= COLUMN_LEVEL_HIGH_CRITICAL:
            self.status = "accident"
            self.accident_reason = f"Превышение уровня в колонне К-1 (выше {COLUMN_LEVEL_HIGH_CRITICAL}%). Риск уноса жидкости с парами в шлемовую линию и гидроудара в конденсаторах (п. 7.10.4)!"

        return self.get_state()

    def get_state(self):
        return {
            "status": self.status,
            "timeElapsed": self.time_elapsed,
            "valves": self.valves,
            "pumps": self.pumps,
            "sensors": self.sensors,
            "setpoints": self.setpoints,
            "defects": self.defects,
            "accidentReason": self.accident_reason,
            "startupK2Prefill": self.scenario_id == "startup" and not self._startup_k2_filled,
            "trainingAcceleration": TRAINING_ACCELERATION,
        }

    def get_snapshot(self) -> dict:
        """Создает полную копию состояния симулятора для сохранения (снапшот)."""
        return {
            "scenario_id": getattr(self, "scenario_id", "shutdown"),
            "_startup_filled": getattr(self, "_startup_filled", False),
            "_startup_k2_filled": getattr(self, "_startup_k2_filled", False),
            "status": self.status,
            "time_elapsed": self.time_elapsed,
            "valves": copy.deepcopy(self.valves),
            "pumps": copy.deepcopy(self.pumps),
            "sensors": copy.deepcopy(self.sensors),
            "setpoints": copy.deepcopy(self.setpoints),
            "defects": copy.deepcopy(self.defects),
            "accident_reason": self.accident_reason,
            "k2_dynamics": self.k2_dynamics.get_snapshot(),
        }

    def load_snapshot(self, snapshot: dict):
        """Восстанавливает состояние симулятора из сохраненного снапшота."""
        self.scenario_id = snapshot.get("scenario_id", "shutdown")
        self._startup_filled = snapshot.get("_startup_filled", False)
        self._startup_k2_filled = snapshot.get("_startup_k2_filled", False)
        self.status = snapshot["status"]
        self.time_elapsed = snapshot["time_elapsed"]
        self.valves = copy.deepcopy(snapshot["valves"])
        self.pumps = copy.deepcopy(snapshot.get("pumps", {pump_id: True for pump_id in ("N_20", "N_2", "N_3", "N_4", "N_32")}))
        self.sensors = copy.deepcopy(snapshot["sensors"])
        self.sensors.setdefault("P_vac", K2_PRESSURE_NORMAL)
        self.sensors.setdefault("T_2", K2_TEMP_NORMAL)
        self.sensors.setdefault("T_3", self.sensors.get("T_1", NORMAL_INITIAL_TEMP))
        self.sensors.setdefault("L_2", 50.0)
        self.sensors.setdefault("L_E1", 50.0)
        self.sensors.setdefault("L_E2", 50.0)
        self.sensors.setdefault("Flame_P1", True)
        self.sensors.setdefault("Flame_P3", True)
        self.sensors.setdefault("F_in", 100.0)
        self.setpoints = copy.deepcopy(snapshot["setpoints"])
        self.setpoints.setdefault("T_3_Sp", self.setpoints.get("T_1_Sp", NORMAL_SETPOINT_TEMP))
        self.setpoints.setdefault("F_in_Sp", 100.0)
        for valve_id, default in {
            "V_P3_OUT": True, "V_P3_RETURN": True, "V_P1_IN": True,
            "V_K2_OUT_32": True, "V_K2_OUT_4": True,
            "HC_P1": False, "HC_P3": False,
            "FUEL_P1": True, "FUEL_P3": True,
            "V_STEAM_K1": True, "V_STEAM_K2": True,
            "V_K2_RELIEF": False, "V_E1_DRAIN": False, "V_E2_DRAIN": False,
        }.items():
            self.valves.setdefault(valve_id, default)
        self.defects = copy.deepcopy(snapshot["defects"])
        self.defects.setdefault("k2_pump_fail", False)
        self.accident_reason = snapshot["accident_reason"]
        self.k2_dynamics.load_snapshot(snapshot.get("k2_dynamics", {}))
