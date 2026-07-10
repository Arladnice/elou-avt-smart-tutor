---
name: simulator-expert
description: |
  Use when working with files in simulator/ directory: physical process model of ЭЛОУ-АВТ plant.
  Covers: furnace temperature dynamics, column pressure/level physics, equipment defects,
  scenario initial conditions, safety thresholds from tech regulations.
---

# Simulator Expert — ЭЛОУ-АВТ Smart Tutor

Specialized skill for working with the physical process simulator (`simulator/` directory).

## 🎯 Overview

The simulator models the ЭЛОУ-АВТ-1 plant dynamics in real-time:
- **Печь П-1**: Furnace with burners heating crude oil through coils.
- **Колонна К-1**: Atmospheric distillation column separating fractions.
- **Клапаны**: V-1 (feed inlet), V-2 (pressure relief to flare), V-3 (bottoms drain).
- **Датчики**: T-1 (furnace temp, °C), P-1 (column pressure, МПа), L-1 (column level, %).

## 📂 Module Structure

```
simulator/
├── elou_avt_model.py     # ELOUAVTSimulator class — the physical model
├── README.md             # Module documentation
└── __pycache__/
```

---

## 📋 Checklist: Before Editing Simulator Code

```markdown
- [ ] All computed values clamped: np.clip() or max(min())
- [ ] No negative pressure, no temperature below 0°C, no level outside [0, 100]%
- [ ] Every method has docstring with: physical process, units (°C, МПа, %), regulation reference
- [ ] New scenarios added to BOTH simulator.reset() AND ScenarioChecklist.tsx
- [ ] New defects documented with physical effect description
- [ ] Defect names added to DEFECT_NAMES_RU in backend ws.py handler
- [ ] Unit test added for new scenario in backend/tests/
```

---

## ⚙️ Physical Model Parameters

### Sensors and Ranges (from tech regulations)

| Sensor | Variable | Unit | Normal Range | Warning | Critical (Accident) |
|---|---|---|---|---|---|
| T-1 (Печь) | `furnaceTemp` | °C | 240 — 310 | > 310 (коксование) | > 380 (прогар, пожар) |
| P-1 (Колонна) | `columnPres` | МПа | 0.10 — 0.35 | > 0.40 | > 0.60 (разгерметизация) |
| L-1 (Колонна) | `columnLevel` | % | 20 — 80 | > 85 / < 15 | > 90 (унос) / < 10 (срыв насоса) |

### Setpoints
| Setpoint | Variable | Unit | Range |
|---|---|---|---|
| Уставка Т печи | `furnaceTempSp` | °C | 100 — 400 |

### Valves
| Valve | Variable | Description |
|---|---|---|
| V-1 | `V1` | Вход сырья в печь (подача нефти) |
| V-2 | `V2` | Сброс давления из колонны на факел |
| V-3 | `V3` | Дренаж кубового остатка колонны |

---

## 🔥 Physical Dynamics (step() method)

Each simulation tick (1 second) computes:

### 1. Furnace Temperature (T-1)
```
Δ_heating = (furnaceTempSp - furnaceTemp) * 0.02  # Proportional control
Δ_cooling = -cooling_rate if V1_OPEN else 0       # Crude oil cools coils
Δ_defect  = +random_overheat if coil_overheat     # Defect: uncontrolled heating

furnaceTemp += Δ_heating + Δ_cooling + Δ_defect + noise
furnaceTemp = clip(furnaceTemp, 20.0, 600.0)
```

### 2. Column Pressure (P-1)
```
Δ_temp_effect = (furnaceTemp - 280) * coefficient  # Higher T → more vapor → higher P
Δ_relief      = -relief_rate if V2_OPEN else 0     # V-2 vents gas to flare
Δ_defect      = 0 if valve_jam else normal_relief   # Defect: V-2 doesn't reduce P

columnPres += Δ_temp_effect + Δ_relief + noise
columnPres = clip(columnPres, 0.02, 1.5)
```

### 3. Column Level (L-1)
```
Δ_inflow  = +inflow_rate if V1_OPEN and not pump_fail  # Crude oil enters
Δ_outflow = -drain_rate if V3_OPEN                     # Bottoms drain out

columnLevel += Δ_inflow + Δ_outflow + noise
columnLevel = clip(columnLevel, 0.0, 100.0)
```

### 4. Safety Checks (after each step)
```python
if furnaceTemp > 380.0:
    status = "accident"
    reason = "Прогар змеевика печи П-1"

if columnPres > 0.6:
    status = "accident"
    reason = "Разгерметизация колонны К-1"

if columnPres > 0.48:
    status = "esd"  # Automatic safety interlock (ПАЗ)
```

---

## 🎬 Scenarios and Initial Conditions

### startup (Пуск установки)
| Parameter | Initial Value | Target |
|---|---|---|
| furnaceTemp | 20.0 °C | ≥ 285 °C |
| columnPres | 0.05 МПа | 0.20 — 0.30 МПа |
| columnLevel | 0.0 % | 20 — 60 % |
| V-1, V-2, V-3 | All CLOSED | V-1 OPEN, V-3 OPEN |
| furnaceTempSp | 240.0 °C | ≥ 280 °C |

**Expected action sequence**: `V1_OPEN → SP_UP → V3_OPEN`

### shutdown (Аварийный останов печи П-1)
| Parameter | Initial Value | Target |
|---|---|---|
| furnaceTemp | 280.0 °C | ≤ 245 °C |
| columnPres | 0.25 МПа | ≤ 0.15 МПа |
| columnLevel | 50.0 % | < 15 % |
| V-1 OPEN, V-3 OPEN | — | V-1 CLOSED |

**Expected action sequence**: `SP_DOWN → V2_OPEN → V1_CLOSE`

### column_shutdown (Останов колонны К-1)
**Expected action sequence**: `SP_DOWN → V1_CLOSE → V3_CLOSE`

### overpressure_relief (Ликвидация роста давления)
**Expected action sequence**: `V2_OPEN → SP_DOWN`

### recirculation (Перевод на рециркуляцию)
**Expected action sequence**: `SP_DOWN → V3_CLOSE → V2_OPEN`

---

## 🔧 Equipment Defects

| Defect ID | Name (RU) | Physical Effect |
|---|---|---|
| `pump_fail` | Отказ сырьевого насоса | V-1 open but NO crude oil flows → dry heating risk |
| `coil_overheat` | Прогар змеевика печи | Uncontrolled temperature rise regardless of setpoint |
| `valve_jam` | Заедание клапана V-2 | V-2 open but NO pressure relief → overpressure risk |

---

## 🚫 Anti-Patterns

1. **No unclipped values** — ALWAYS `clip(value, MIN, MAX)` after computation.
2. **No magic numbers** — Use named constants from `config.py` for thresholds.
3. **No undocumented methods** — Every method needs docstring with units.
4. **No orphan scenarios** — New scenario must be in simulator, backend, AND frontend.
5. **No orphan defects** — New defect must be in simulator, backend handler, AND frontend UI.

---

## 📚 Tech Regulation References

All physical parameters and thresholds are derived from:
- `Исходные данные/3. Описание технологического процесса.pdf` — Process description
- `Исходные данные/7.4 Сведения об основных опасностях производства.pdf` — Hazards
- `Исходные данные/7.7 Меры безопасности при эксплуатации.pdf` — Safety measures
- `Исходные данные/9.1 Краткая характеристика технологического оборудования.pdf` — Equipment specs
