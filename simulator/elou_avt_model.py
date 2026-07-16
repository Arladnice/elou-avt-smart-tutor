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
        # Активные неисправности (задаются инструктором)
        self.defects = {
            "pump_fail": False,       # Отказ сырьевого насоса (сырье не идет даже при открытом V_1)
            "coil_overheat": False,   # Прогар/перегрев змеевика печи (аномальный неконтролируемый нагрев)
            "valve_jam": False        # Заедание клапана сброса V_2 (не снижает давление при открытии)
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
        if self.status != "running":
            return
        if valve_id in self.valves:
            self.valves[valve_id] = state

    def set_setpoint(self, name: str, value: float):
        if self.status != "running":
            return
        if name in self.setpoints:
            self.setpoints[name] = value

    def set_defect(self, defect_id: str, state: bool):
        if defect_id in self.defects:
            self.defects[defect_id] = state

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
        # 1. Моделирование расхода сырья (F_in) с учетом неисправности насоса
        # -------------------------------------------------------------
        F_in = 0.0
        if V_1 and not self.defects["pump_fail"]:
            F_in = 1.0  # Номинальный расход сырья

        # -------------------------------------------------------------
        # Нагрев от горелок и охлаждение сырьем
        # -------------------------------------------------------------
        if F_in > 0.0:
            Q_heat = (T_sp - T) * 0.15 + F_in * (T_sp - 60.0) * 0.05
            Q_cool = F_in * (T - 60.0) * 0.05
        else:
            # При отсутствии протока сырья (отказ насоса или закрытый V_1)
            # Если горелки активны (T_sp > 240), змеевик быстро нагревается всухую.
            # Если оператор снизил уставку T_sp до минимума (240), нагрев прекращается, идет остывание.
            Q_heat = max(0.0, (T_sp - 240.0) * 0.18)
            Q_cool = (T - 60.0) * 0.01  # Естественные теплопотери в атмосферу

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
        if V_1 and not self.defects["pump_fail"]:
            dL += 0.5
        if V_3:
            dL -= 0.6
            
        next_L = L + dL + (random.random() - 0.5) * 0.1
        next_L = max(0.0, min(100.0, next_L))

        # -------------------------------------------------------------
        # 4. Моделирование давления в колонне К-1 (Давление P)
        # -------------------------------------------------------------
        # Давление растет от отклонения температуры и уровня от нормы,
        # а также стабилизируется за счет эффекта обратного давления/конденсации (термодинамическое равновесие)
        dP = (next_T - 280.0) * 0.0002 + (next_L - 50.0) * 0.0001 - (P - 0.25) * 0.05
        
        # Сброс давления через предохранительный/регулирующий клапан V_2
        if V_2 and not self.defects["valve_jam"]:
            dP -= 0.009
            
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
        elif next_L <= 5.0 and self.time_elapsed > 40:
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
        self.status = snapshot["status"]
        self.time_elapsed = snapshot["time_elapsed"]
        self.valves = copy.deepcopy(snapshot["valves"])
        self.sensors = copy.deepcopy(snapshot["sensors"])
        self.setpoints = copy.deepcopy(snapshot["setpoints"])
        self.defects = copy.deepcopy(snapshot["defects"])
        self.accident_reason = snapshot["accident_reason"]
