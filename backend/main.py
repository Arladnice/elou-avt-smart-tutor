import os
import sys
import time
import json
import sqlite3
import hashlib
import asyncio
from typing import Dict, List, Set
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Depends
from starlette.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Добавляем пути в sys.path для импорта simulator и ai_core
ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
sys.path.append(ROOT_DIR)

from simulator.elou_avt_model import ELOUAVTSimulator
from ai_core.predictive_engine import RiskPredictor
from ai_core.error_analyzer import ErrorAnalyzer

app = FastAPI(title="КТК ЭЛОУ-АВТ Smart Tutor API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DB_PATH = os.environ.get("DATABASE_PATH", os.path.join(os.path.dirname(__file__), "tutor.db"))
SECRET_SALT = "GPNA_IT_CHAMPIONSHIP_2026_SECURITY_SALT"

# -------------------------------------------------------------
# База данных и ИБ-контроль целостности (К8: 5 баллов)
# -------------------------------------------------------------
def init_db():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Таблица сессий обучения
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS training_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        operator_name TEXT NOT NULL,
        role TEXT NOT NULL,
        scenario_id TEXT NOT NULL,
        start_time TEXT NOT NULL,
        duration_sec INTEGER NOT NULL,
        score INTEGER NOT NULL,
        status TEXT NOT NULL,
        violations_json TEXT NOT NULL,
        integrity_hash TEXT NOT NULL
    )
    """)
    
    # Таблица системных ИБ-логов
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS audit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT NOT NULL,
        actor TEXT NOT NULL,
        action TEXT NOT NULL,
        details TEXT NOT NULL,
        integrity_hash TEXT NOT NULL
    )
    """)
    conn.commit()
    conn.close()

def calculate_integrity_hash(*args) -> str:
    """Вычисляет SHA-256 хэш переданных полей с добавлением секретной соли для защиты от подмены."""
    payload = "".join(str(arg) for arg in args) + SECRET_SALT
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()

def log_audit_event(actor: str, action: str, details: str):
    """Записывает событие ИБ в журнал с хэшем целостности."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    timestamp = time.strftime("%Y-%m-%d %H:%M:%S")
    h = calculate_integrity_hash(timestamp, actor, action, details)
    cursor.execute(
        "INSERT INTO audit_logs (timestamp, actor, action, details, integrity_hash) VALUES (?, ?, ?, ?, ?)",
        (timestamp, actor, action, details, h)
    )
    conn.commit()
    conn.close()

# Инициализируем БД
init_db()

# -------------------------------------------------------------
# Модели Pydantic
# -------------------------------------------------------------
class LoginRequest(BaseModel):
    username: str
    role: str # "operator" | "instructor"

class SessionSaveRequest(BaseModel):
    operator_name: str
    role: str
    scenario_id: str
    duration_sec: int
    score: int
    status: str
    violations: List[dict]

# -------------------------------------------------------------
# REST API эндпоинты
# -------------------------------------------------------------
@app.post("/api/auth/login")
def login(req: LoginRequest):
    if not req.username:
        raise HTTPException(status_code=400, detail="Имя пользователя не может быть пустым")
    if req.role not in ["operator", "instructor"]:
        raise HTTPException(status_code=400, detail="Неверная роль пользователя")
        
    token = f"jwt-mock-token-for-{req.username}-{req.role}-{int(time.time())}"
    log_audit_event(req.username, "LOGIN", f"Пользователь вошел с ролью {req.role}")
    
    return {
        "username": req.username,
        "role": req.role,
        "token": token
    }

@app.get("/api/sessions")
def get_sessions():
    """Возвращает историю тренировок и проверяет целостность данных (К8: 5 баллов)."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT id, operator_name, role, scenario_id, start_time, duration_sec, score, status, violations_json, integrity_hash FROM training_sessions ORDER BY id DESC")
    rows = cursor.fetchall()
    conn.close()
    
    sessions = []
    for r in rows:
        session_id, op_name, role, scen_id, start_time, duration, score, status, viol_json, db_hash = r
        
        # Пересчитываем хэш для проверки целостности
        recalculated_hash = calculate_integrity_hash(op_name, role, scen_id, start_time, duration, score, status, viol_json)
        is_valid = (db_hash == recalculated_hash)
        
        sessions.append({
            "id": session_id,
            "operator_name": op_name,
            "role": role,
            "scenario_id": scen_id,
            "start_time": start_time,
            "duration_sec": duration,
            "score": score,
            "status": status,
            "violations": json.loads(viol_json),
            "integrity_valid": is_valid
        })
        
    return sessions

@app.post("/api/sessions/clear")
def clear_sessions():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("DELETE FROM training_sessions")
    conn.commit()
    conn.close()
    log_audit_event("ADMIN", "DB_CLEAR", "Очищена история учебных сессий")
    return {"message": "История очищена"}

# -------------------------------------------------------------
# Менеджер WebSocket-подключений (К1: Разделение экранов)
# -------------------------------------------------------------
class ConnectionManager:
    def __init__(self):
        # Храним активные подключения по ролям
        self.operator_sockets: Set[WebSocket] = set()
        self.instructor_sockets: Set[WebSocket] = set()
        # Текущее общее состояние сессии тренажера
        self.simulator = ELOUAVTSimulator()
        self.predictor = RiskPredictor()
        self.analyzer = ErrorAnalyzer()
        
        # Переменные сессии
        self.active_operator_name = "Денис Арлаков"
        self.active_scenario = "startup"
        self.actions_taken: List[str] = []
        self.telemetry_history: List[List[float]] = [] # Последние 30 секунд для LSTM
        self.logs: List[dict] = []

    async def connect(self, websocket: WebSocket, role: str):
        await websocket.accept()
        if role == "instructor":
            self.instructor_sockets.add(websocket)
            log_audit_event("INSTRUCTOR", "WS_CONNECT", "Инструктор подключился к трансляции")
        else:
            self.operator_sockets.add(websocket)
            log_audit_event(self.active_operator_name, "WS_CONNECT", "Оператор подключился к сессии")
            
        # Отправляем текущее состояние сразу при подключении
        await self.send_state_to(websocket)

    def disconnect(self, websocket: WebSocket, role: str):
        if role == "instructor":
            self.instructor_sockets.discard(websocket)
        else:
            self.operator_sockets.discard(websocket)

    async def broadcast_state(self):
        """Отправляет обновленное состояние симулятора всем операторам и инструкторам."""
        state = self.get_full_state()
        
        # Рассылка операторам
        for ws in list(self.operator_sockets):
            try:
                await ws.send_json(state)
            except Exception:
                self.operator_sockets.discard(ws)
                
        # Рассылка инструкторам
        for ws in list(self.instructor_sockets):
            try:
                await ws.send_json(state)
            except Exception:
                self.instructor_sockets.discard(ws)

    async def send_state_to(self, websocket: WebSocket):
        state = self.get_full_state()
        try:
            await websocket.send_json(state)
        except Exception:
            pass

    def get_full_state(self) -> dict:
        sim_state = self.simulator.get_state()
        
        # Получаем предсказание рисков от LSTM (используем заполненную в симуляции историю)
        sensors = sim_state["sensors"]
        valves = sim_state["valves"]
        setpoints = sim_state["setpoints"]
        if not self.telemetry_history:
            # [valve_V1, valve_V2, valve_V3, furnaceTempSp, furnaceTemp, columnPres, columnLevel]
            self.telemetry_history.append([
                1.0 if valves["V1"] else 0.0,
                1.0 if valves["V2"] else 0.0,
                1.0 if valves["V3"] else 0.0,
                setpoints["furnaceTempSp"],
                sensors["furnaceTemp"],
                sensors["columnPres"],
                sensors["columnLevel"]
            ])
            
        pred_vals, risk = self.predictor.predict_risk(self.telemetry_history)
        
        # Запускаем оценку действий по DTW
        score, errors, recs = self.analyzer.evaluate_session(self.actions_taken, self.active_scenario)
        
        # Определяем буквенную оценку безопасности (К2: Оценка квалификации)
        safety_grade = "A"
        if score < 50: safety_grade = "F"
        elif score < 70: safety_grade = "C"
        elif score < 85: safety_grade = "B"
        
        # Если статус аварийный, оценка падает до F
        if sim_state["status"] == "accident":
            safety_grade = "F"
            score = 0
            
        score_card = None
        if sim_state["status"] in ["accident", "esd", "success"] or sim_state["timeElapsed"] >= 300:
            score_card = {
                "score": score,
                "grade": safety_grade,
                "duration": sim_state["timeElapsed"],
                "errors": errors,
                "recommendations": recs
            }
            
        return {
            "status": sim_state["status"],
            "timeElapsed": sim_state["timeElapsed"],
            "valves": sim_state["valves"],
            "sensors": sim_state["sensors"],
            "setpoints": sim_state["setpoints"],
            "defects": sim_state["defects"],
            "accidentReason": sim_state["accidentReason"],
            "operatorName": self.active_operator_name,
            "scenarioId": self.active_scenario,
            "riskLevel": risk,
            "predictions": pred_vals,
            "actions": self.actions_taken,
            "logs": self.logs,
            "scoreCard": score_card
        }

    def save_completed_session(self):
        """Автоматически сохраняет результаты завершенной сессии в защищенную БД (К8: ИБ)."""
        state = self.get_full_state()
        card = state["scoreCard"]
        if not card:
            return
            
        op_name = self.active_operator_name
        role = "operator"
        scen_id = self.active_scenario
        start_time = time.strftime("%Y-%m-%d %H:%M:%S")
        duration = state["timeElapsed"]
        score = card["score"]
        status = state["status"]
        violations = json.dumps(card["errors"], ensure_ascii=False)
        
        h = calculate_integrity_hash(op_name, role, scen_id, start_time, duration, score, status, violations)
        
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO training_sessions (operator_name, role, scenario_id, start_time, duration_sec, score, status, violations_json, integrity_hash) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (op_name, role, scen_id, start_time, duration, score, status, violations, h)
        )
        conn.commit()
        conn.close()
        
        log_audit_event("SYSTEM", "SESSION_SAVE", f"Сохранена учебная сессия оператора {op_name} (Оценка: {card['grade']})")

    def add_log(self, log_type: str, message: str):
        time_str = f"{self.simulator.time_elapsed // 60:02d}:{self.simulator.time_elapsed % 60:02d}"
        self.logs.append({
            "id": str(int(time.time() * 1000) + random_id()),
            "time": time_str,
            "type": log_type,
            "message": message
        })

def random_id():
    import random
    return random.randint(1, 999)

manager = ConnectionManager()

# -------------------------------------------------------------
# WebSocket обработчик
# -------------------------------------------------------------
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    # При первом запросе парсим параметры подключения
    query_params = websocket.query_params
    role = query_params.get("role", "operator")
    username = query_params.get("username", "Оператор")
    scenario = query_params.get("scenario", "startup")
    
    if role == "operator":
        manager.active_operator_name = username
        manager.active_scenario = scenario
        manager.simulator.reset()
        manager.actions_taken.clear()
        manager.telemetry_history.clear()
        manager.logs.clear()
        manager.add_log("info", "Система перезапущена. Режим работы: Стабильный.")
        manager.add_log("info", "Входной клапан V-1 открыт. Подача сырья в норме.")
        
    await manager.connect(websocket, role)
    
    try:
        while True:
            # Ожидаем команды управления от клиента
            data = await websocket.receive_text()
            cmd = json.loads(data)
            action_type = cmd.get("type")
            
            if action_type == "toggle_valve":
                valve_id = cmd.get("valve_id")
                state = cmd.get("state")
                manager.simulator.set_valve(valve_id, state)
                action_name = f"{valve_id}_{'OPEN' if state else 'CLOSE'}"
                manager.actions_taken.append(action_name)
                manager.add_log("info", f"Оператор переключил клапан {valve_id} в состояние: {'ОТКРЫТ' if state else 'ЗАКРЫТ'}")
                log_audit_event(manager.active_operator_name, "VALVE_TOGGLE", f"Клапан {valve_id} -> {state}")
                
            elif action_type == "change_setpoint":
                temp = float(cmd.get("value"))
                old_temp = manager.simulator.setpoints["furnaceTempSp"]
                manager.simulator.set_setpoint("furnaceTempSp", temp)
                action_name = "SP_UP" if temp > old_temp else "SP_DOWN"
                manager.actions_taken.append(action_name)
                manager.add_log("info", f"Оператор изменил уставку температуры П-1 на: {temp}°C")
                log_audit_event(manager.active_operator_name, "SETPOINT_CHANGE", f"Уставка T-1 -> {temp}")
                
            elif action_type == "trigger_esd":
                manager.simulator.status = "esd"
                manager.actions_taken.append("ESD")
                manager.add_log("error", "АВАРИЙНЫЙ ОСТАНОВ (ESD) запущен вручную оператором!")
                log_audit_event(manager.active_operator_name, "ESD_TRIGGER", "Ручной запуск ESD")
                manager.save_completed_session()
                
            elif action_type == "trigger_defect":
                # Команда поступает от экрана Инструктора (К1: Разделение ролей)
                defect_id = cmd.get("defect_id")
                state = cmd.get("state")
                manager.simulator.set_defect(defect_id, state)
                defect_names_ru = {
                    "pump_fail": "Отказ сырьевого насоса",
                    "coil_overheat": "Прогар змеевика печи П-1",
                    "valve_jam": "Заедание клапана сброса V-2"
                }
                status_ru = "АКТИВИРОВАНА" if state else "ДЕАКТИВИРОВАНА"
                manager.add_log("error" if state else "info", f"ИНСТРУКТОР: Неисправность '{defect_names_ru.get(defect_id, defect_id)}' {status_ru}!")
                log_audit_event("INSTRUCTOR", "DEFECT_TRIGGER", f"Неисправность {defect_id} -> {state}")
                
            elif action_type == "complete":
                manager.simulator.status = "success"
                manager.add_log("info", "ТРЕНИРОВКА ЗАВЕРШЕНА: Оператор успешно сдал отчет о сессии.")
                log_audit_event(manager.active_operator_name, "SESSION_COMPLETE", "Оператор успешно завершил тренировку вручную")
                
            elif action_type == "ping":
                await websocket.send_json({"type": "pong", "timestamp": cmd.get("timestamp")})
                continue
                
            elif action_type == "reset":
                manager.simulator.reset()
                manager.actions_taken.clear()
                manager.telemetry_history.clear()
                manager.logs.clear()
                manager.add_log("info", "Система перезапущена. Режим работы: Стабильный.")
                manager.add_log("info", "Входной клапан V-1 открыт. Подача сырья в норме.")
                log_audit_event(manager.active_operator_name, "SESSION_RESET", "Перезапуск тренировочной сессии")
                
            await manager.broadcast_state()
            
    except WebSocketDisconnect:
        manager.disconnect(websocket, role)
        log_audit_event(username, "WS_DISCONNECT", f"WebSocket соединение закрыто для роли {role}")

# -------------------------------------------------------------
# Циклический фоновый поток симуляции техпроцесса
# -------------------------------------------------------------
async def simulation_loop():
    while True:
        if manager.simulator.status == "running" and len(manager.operator_sockets) > 0:
            # Шаг физики симулятора
            old_status = manager.simulator.status
            manager.simulator.step()
            
            # Записываем 7-фичевую телеметрию в историю (только при реальном шаге физики)
            sensors = manager.simulator.sensors
            valves  = manager.simulator.valves
            setpts  = manager.simulator.setpoints
            # [valve_V1, valve_V2, valve_V3, furnaceTempSp, furnaceTemp, columnPres, columnLevel]
            manager.telemetry_history.append([
                1.0 if valves["V1"] else 0.0,
                1.0 if valves["V2"] else 0.0,
                1.0 if valves["V3"] else 0.0,
                setpts["furnaceTempSp"],
                sensors["furnaceTemp"],
                sensors["columnPres"],
                sensors["columnLevel"]
            ])
            if len(manager.telemetry_history) > 30:
                manager.telemetry_history.pop(0)
                
            new_status = manager.simulator.status
            
            # Проверяем нештатные ситуации
            temp = manager.simulator.sensors["furnaceTemp"]
            pres = manager.simulator.sensors["columnPres"]
            level = manager.simulator.sensors["columnLevel"]
            
            # Формируем автоматические предупреждения по техрегламенту
            if temp > 310.0:
                manager.add_log("warning", f"Предупреждение: Температура печи П-1 ({temp}°C) выше нормы (310°C). Опасность коксования труб!")
            if pres > 0.4:
                manager.add_log("warning", f"Предупреждение: Давление в колонне К-1 ({pres} МПа) приближается к предельному! Откройте клапан сброса V-2.")
            if level > 85.0:
                manager.add_log("warning", f"Предупреждение: Уровень куба К-1 ({level}%) выше нормы! Откройте дренаж V-3.")
            elif level < 15.0:
                manager.add_log("warning", f"Предупреждение: Уровень куба К-1 ({level}%) опасно низок! Риск срыва печных насосов.")
                
            # Если произошел аварийный останов (ПАЗ) или авария
            if new_status == "accident":
                manager.add_log("error", f"АВАРИЯ: {manager.simulator.accident_reason}")
                manager.save_completed_session()
            elif old_status == "running" and new_status == "esd":
                manager.add_log("error", "БЛОКИРОВКА ПАЗ: Система переведена в безопасный режим.")
                manager.save_completed_session()
                
            await manager.broadcast_state()
            
        await asyncio.sleep(1.0)

# Запускаем фоновый цикл при старте приложения
@app.on_event("startup")
async def startup_event():
    asyncio.create_task(simulation_loop())
    log_audit_event("SYSTEM", "STARTUP", "Сервер КТК ЭЛОУ-АВТ Smart Tutor запущен.")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
