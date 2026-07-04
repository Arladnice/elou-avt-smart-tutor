import sys
import os
import csv
import random

# Добавляем корневой путь в sys.path для импорта simulator
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from simulator.elou_avt_model import ELOUAVTSimulator

def generate_telemetry_data(output_path, num_samples=15000):
    """
    Генерирует синтетический датасет телеметрии на основе физической модели.
    Имитирует нормальную работу, пусконаладочные режимы, инжекцию неисправностей
    и различные действия оператора (адекватные и ошибочные).
    """
    print(f"Начало генерации данных. Целевой размер: {num_samples} строк...")
    sim = ELOUAVTSimulator()
    
    headers = [
        "time_elapsed", "valve_V1", "valve_V2", "valve_V3", 
        "furnaceTempSp", "furnaceTemp", "columnPres", "columnLevel",
        "defect_pump_fail", "defect_coil_overheat", "defect_valve_jam",
        "accident_risk", "status"
    ]
    
    records_generated = 0
    
    with open(output_path, mode="w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(headers)
        
        while records_generated < num_samples:
            sim.reset()
            scenario_type = random.choice(["normal", "startup", "defect_overheat", "defect_pump", "defect_jam"])
            
            # Длина одной симуляционной сессии
            session_length = random.randint(100, 300)
            
            for step in range(session_length):
                # Имитация действий "оператора" в зависимости от сценария
                if scenario_type == "startup":
                    # Пуск: начинаем с низкой температуры и постепенно поднимаем уставку
                    if step == 0:
                        sim.sensors["furnaceTemp"] = 150.0
                        sim.setpoints["furnaceTempSp"] = 150.0
                        sim.valves["V1"] = True
                        sim.valves["V2"] = False
                        sim.valves["V3"] = False
                    elif step == 20:
                        sim.setpoints["furnaceTempSp"] = 220.0
                        sim.valves["V3"] = True # Открываем дренаж по мере накопления
                    elif step == 60:
                        sim.setpoints["furnaceTempSp"] = 280.0
                        
                elif scenario_type == "defect_overheat":
                    # На 30 секунде инструктор инжектирует перегрев
                    if step == 30:
                        sim.set_defect("coil_overheat", True)
                    # Реакция оператора:
                    if step > 30:
                        action_delay = random.randint(10, 40)
                        if step > 30 + action_delay:
                            # Пытается снизить уставку печи или открыть V-2 для сброса давления
                            sim.setpoints["furnaceTempSp"] = max(240.0, sim.setpoints["furnaceTempSp"] - 2.0)
                            if sim.sensors["columnPres"] > 0.35:
                                sim.valves["V2"] = True
                                
                elif scenario_type == "defect_pump":
                    # Отказ сырьевого насоса на 40 секунде
                    if step == 40:
                        sim.set_defect("pump_fail", True)
                    # Реакция:
                    if step > 40:
                        action_delay = random.randint(5, 25)
                        if step > 40 + action_delay:
                            # Должен срочно снизить уставку нагрева печи П-1 (т.к. нет сырья)
                            sim.setpoints["furnaceTempSp"] = 100.0 # гасим горелки
                            sim.valves["V3"] = False # перекрываем слив
                            
                elif scenario_type == "defect_jam":
                    # Высокое давление, но клапан V2 заклинило
                    if step == 15:
                        sim.setpoints["furnaceTempSp"] = 330.0 # провоцируем нагрев
                    if step == 35:
                        sim.set_defect("valve_jam", True)
                        sim.valves["V2"] = True # оператор пытается открыть, но он заклинен
                    if step > 50:
                        # Умный оператор делает аварийный останов (ESD)
                        if random.random() < 0.2:
                            sim.status = "esd"
                            
                else:  # normal
                    # Небольшие случайные колебания уставки и клапанов вокруг нормы
                    if step % 50 == 0:
                        sim.setpoints["furnaceTempSp"] = round(random.uniform(270.0, 290.0), 1)
                    if sim.sensors["columnLevel"] > 75:
                        sim.valves["V3"] = True
                    elif sim.sensors["columnLevel"] < 35:
                        sim.valves["V3"] = False

                # Делаем шаг симуляции
                state = sim.step()
                
                # Вычисляем риск аварии (упрощенная оценка для обучения модели)
                temp = state["sensors"]["furnaceTemp"]
                pres = state["sensors"]["columnPres"]
                level = state["sensors"]["columnLevel"]
                
                risk = 0.0
                if temp > 310:
                    risk += (temp - 310) / (380 - 310) * 40
                if pres > 0.3:
                    risk += (pres - 0.3) / (0.48 - 0.3) * 50
                if level > 85:
                    risk += (level - 85) / 15 * 10
                elif level < 15:
                    risk += (15 - level) / 15 * 10
                
                risk = min(100.0, max(0.0, risk))
                
                # Записываем строку в датасет
                writer.writerow([
                    state["timeElapsed"],
                    1 if state["valves"]["V1"] else 0,
                    1 if state["valves"]["V2"] else 0,
                    1 if state["valves"]["V3"] else 0,
                    state["setpoints"]["furnaceTempSp"],
                    temp, pres, level,
                    1 if state["defects"]["pump_fail"] else 0,
                    1 if state["defects"]["coil_overheat"] else 0,
                    1 if state["defects"]["valve_jam"] else 0,
                    round(risk, 2),
                    state["status"]
                ])
                
                records_generated += 1
                if records_generated >= num_samples:
                    break
                    
                if state["status"] in ["accident", "esd"]:
                    break # Конец сессии при аварии или ESD
                    
    print(f"Генерация завершена! Создано {records_generated} строк в файле {output_path}")

if __name__ == "__main__":
    dataset_dir = os.path.dirname(__file__)
    output_file = os.path.join(dataset_dir, "telemetry_dataset.csv")
    generate_telemetry_data(output_file)
