import random
import math
import copy

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
        self.reset()

    def reset(self, scenario_id: str = "shutdown"):
        self.scenario_id = scenario_id
        self._startup_filled = False
        # Активные неисправности (задаются инструктором)
        self.defects = {
            "pump_fail": False,       # Отказ сырьевого насоса (сырье не идет даже при открытом V_1)
            "coil_overheat": False,   # Прогар/перегрев змеевика печи (аномальный неконтролируемый нагрев)
            "valve_jam": False,       # Заедание клапана сброса V_2 (не снижает давление при открытии)
            "power_fail": False,      # Отказ электроснабжения (останов насосов, падение уставки горелок до 20°C)
            "air_fail": False,        # Отказ воздуха КИПиА (V-1 и V-3 переходят в закрытое состояние, V-2 блокируется)
            "steam_fail": False       # Срыв подачи отпарного пара (прекращение отпарки в стриппинге, рост P-1 и L-1)
        }
        
        self.status = "running"       # "running", "paused", "esd" (аварийный останов), "accident" (авария)
        self.time_elapsed = 0         # Время сессии в секундах
        self.accident_reason = ""     # Причина аварии

        if scenario_id == "startup":
            # Холодное состояние для пуска
            self.valves = {
                "V_1": False,  # Вход сырья в печь закрыт
                "V_2": False,  # Сброс давления из колонны закрыт
                "V_3": False   # Дренаж куба колонны закрыт
            }
            self.setpoints = {
                "T_1_Sp": 240.0  # Минимальная температура печи
            }
            self.sensors = {
                "T_1": 20.0,    # Холодная печь
                "P_1": 0.05,     # Атмосферное давление
                "L_1": 0.0      # Пустая колонна
            }
        else:
            # Нормальное рабочее состояние для останова и прочих тестов
            self.valves = {
                "V_1": True,   # Вход сырья в печь
                "V_2": False,  # Сброс давления из колонны
                "V_3": True    # Дренаж куба колонны
            }
            self.setpoints = {
                "T_1_Sp": 280.0  # Уставка температуры печи, °C
            }
            self.sensors = {
                "T_1": 280.0,   # T-1 (Температура печи), °C
                "P_1": 0.25,     # P-1 (Давление в колонне), МПа
                "L_1": 50.0     # L-1 (Уровень в колонне), %
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

    def set_defect(self, defect_id: str, state: bool):
        """Активация или деактивация неисправностей оборудования (инструктором)."""
        if defect_id in self.defects:
            self.defects[defect_id] = state
            # Отказ электроснабжения: немедленно тушит горелки печи (уставка падает до 20°C)
            if defect_id == "power_fail" and state:
                self.setpoints["T_1_Sp"] = 20.0
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
        T_sp = self.setpoints["T_1_Sp"]

        # -------------------------------------------------------------
        # 1. Моделирование расхода сырья (F_in) с учетом неисправностей и блокировок ПАЗ
        # -------------------------------------------------------------
        F_in = 0.0
        # Блокировка насосов при падении уровня в колонне К-1 ниже 15% (защита от сухого хода, п. 7.9.1)
        # В режиме пуска ("startup") до первоначального заполнения колонны насос Н-1 (через V-1) должен беспрепятственно нагнетать сырьё для набора уровня L-1.
        pump_interlock_active = (L < 15.0) if getattr(self, "scenario_id", "") != "startup" else False
        if V_1 and not self.defects["pump_fail"] and not self.defects["power_fail"] and not pump_interlock_active:
            F_in = 1.0  # Номинальный расход сырья

        # -------------------------------------------------------------
        # 2. Нагрев от горелок и охлаждение сырьем
        # -------------------------------------------------------------
        if F_in > 0.0:
            Q_heat = (T_sp - T) * 0.15 + F_in * (T_sp - 60.0) * 0.05
            Q_cool = F_in * (T - 60.0) * 0.05
        else:
            # При отсутствии протока сырья (отказ насоса/питания, закрытый V_1 или сработка блокировки <15%)
            # Если горелки активны (T_sp > 240), змеевик быстро нагревается всухую.
            # Если оператор снизил уставку T_sp до минимума или сработал power_fail (T_sp=20), идет остывание.
            Q_heat = max(0.0, (T_sp - 240.0) * 0.18) if not self.defects["power_fail"] else 0.0
            Q_cool = (T - 60.0) * 0.01 + ( (T - 20.0) * 0.02 if self.defects["power_fail"] else 0.0 )

        # Дополнительный нагрев при неисправности "coil_overheat" (неуправляемое горение / прогар змеевика)
        if self.defects["coil_overheat"]:
            Q_heat += 4.5
        
        # Изменение температуры
        dT = Q_heat - Q_cool + (random.random() - 0.5) * 0.4
        next_T = T + dT
        
        # Физические ограничения температуры
        next_T = max(20.0, min(600.0, next_T))

        # -------------------------------------------------------------
        # 3. Моделирование материального баланса колонны К-1 (Уровень L)
        # -------------------------------------------------------------
        dL = 0.0
        if F_in > 0.0:
            dL += 0.5
        # Кубовый насос отбора (через V-3) останавливается при сработке блокировки сухого хода (L < 15%) или отказе питания
        if V_3 and not self.defects["power_fail"] and not (L < 15.0):
            dL -= 0.6
            
        # При срыве подачи пара в стриппинге (steam_fail) ухудшается отпарка легких фракций, накопление жидкости растет
        if self.defects["steam_fail"]:
            dL += 0.25
            
        next_L = L + dL + (random.random() - 0.5) * 0.1
        next_L = max(0.0, min(100.0, next_L))
        if next_L >= 15.0:
            self._startup_filled = True

        # -------------------------------------------------------------
        # 4. Моделирование давления в колонне К-1 (Давление P)
        # -------------------------------------------------------------
        if getattr(self, "scenario_id", "") == "startup" and not getattr(self, "_startup_filled", False):
            # В режиме технологического пуска давление P-1 плавно поднимается от атмосферного (0.05 МПа) до рабочего (0.25 МПа)
            # пропорционально прогреву печи и заполнению колонны парами/жидкостью
            temp_factor = min(1.0, max(0.0, (next_T - 100.0) / 180.0))
            level_factor = min(1.0, max(0.0, next_L / 30.0))
            P_target = 0.05 + 0.20 * temp_factor * level_factor
            dP = (P_target - P) * 0.1
        else:
            dP = (next_T - 280.0) * 0.0002 + (next_L - 50.0) * 0.0001 - (P - 0.25) * 0.05
        
        # Сброс давления через предохранительный/регулирующий клапан V_2
        if V_2 and not self.defects["valve_jam"]:
            dP -= 0.009
            
        # При срыве подачи пара (steam_fail) нарушается термодинамическое равновесие паров
        if self.defects["steam_fail"]:
            dP += 0.006
            
        next_P = P + dP + (random.random() - 0.5) * 0.002
        next_P = max(0.05, min(2.0, next_P))

        # Обновляем датчики
        self.sensors["T_1"] = round(next_T, 2)
        self.sensors["P_1"] = round(next_P, 3)
        self.sensors["L_1"] = round(next_L, 2)

        # -------------------------------------------------------------
        # 5. Проверка аварийных условий и блокировок (ПАЗ / ESD)
        # -------------------------------------------------------------
        # Согласно техрегламенту (п. 3.5):
        # Рабочее давление верха: 1 - 4.5 кгс/см² (0.1 - 0.45 МПа)
        # Срабатывание сигнализации по высокому давлению: 4.5 кгс/см² (0.45 МПа)
        # Срабатывание ПАЗ (блокировка горелок, отсечка сырья и бутана): 4.8 кгс/см² (0.48 МПа)
        
        if next_P >= 0.48:
            self.status = "accident"
            self.accident_reason = "Критическое превышение давления в колонне К-1 (более 0.48 МПа). Взрыв колонны и выброс нефтепродуктов!"
        elif next_T >= 380.0:
            self.status = "accident"
            self.accident_reason = "Критический перегрев печи П-1 (выше 380°C). Прогар змеевика, коксование и пожар в топочной камере!"
        elif next_L <= 5.0 and (self.time_elapsed > 40 if getattr(self, "scenario_id", "") != "startup" else (self.time_elapsed > 180 or getattr(self, "_startup_filled", False))):
            self.status = "accident"
            self.accident_reason = "Аварийно низкий уровень в колонне К-1 (ниже 5%). Срыв сырьевых насосов, сухой ход и разрушение торцевых уплотнений (п. 7.9.1 техрегламента)!"
        elif next_L >= 98.0:
            self.status = "accident"
            self.accident_reason = "Превышение уровня в колонне К-1 (выше 98%). Риск уноса жидкости с парами в шлемовую линию и гидроудара в конденсаторах (п. 7.10.4)!"

        return self.get_state()

    def get_state(self):
        return {
            "status": self.status,
            "timeElapsed": self.time_elapsed,
            "valves": self.valves,
            "sensors": self.sensors,
            "setpoints": self.setpoints,
            "defects": self.defects,
            "accidentReason": self.accident_reason
        }

    def get_snapshot(self) -> dict:
        """Создает полную копию состояния симулятора для сохранения (снапшот)."""
        return {
            "scenario_id": getattr(self, "scenario_id", "shutdown"),
            "_startup_filled": getattr(self, "_startup_filled", False),
            "status": self.status,
            "time_elapsed": self.time_elapsed,
            "valves": copy.deepcopy(self.valves),
            "sensors": copy.deepcopy(self.sensors),
            "setpoints": copy.deepcopy(self.setpoints),
            "defects": copy.deepcopy(self.defects),
            "accident_reason": self.accident_reason
        }

    def load_snapshot(self, snapshot: dict):
        """Восстанавливает состояние симулятора из сохраненного снапшота."""
        self.scenario_id = snapshot.get("scenario_id", "shutdown")
        self._startup_filled = snapshot.get("_startup_filled", False)
        self.status = snapshot["status"]
        self.time_elapsed = snapshot["time_elapsed"]
        self.valves = copy.deepcopy(snapshot["valves"])
        self.sensors = copy.deepcopy(snapshot["sensors"])
        self.setpoints = copy.deepcopy(snapshot["setpoints"])
        self.defects = copy.deepcopy(snapshot["defects"])
        self.accident_reason = snapshot["accident_reason"]
