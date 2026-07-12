import time
import json
import logging
from typing import List, Set
from fastapi import WebSocket

from simulator.elou_avt_model import ELOUAVTSimulator
from ai_core.predictive_engine import RiskPredictor
from ai_core.error_analyzer import ErrorAnalyzer
from backend.db.queries import save_session_db
from backend.utils.security import calculate_integrity_hash, log_audit_event
from backend.utils.helpers import random_id

logger = logging.getLogger(__name__)

class ConnectionManager:
    """Управляет WebSocket-подключениями операторов и инструкторов, а также хранит состояние симуляции."""
    def __init__(self):
        # Храним активные подключения по ролям
        self.operator_sockets: Set[WebSocket] = set()
        self.instructor_sockets: Set[WebSocket] = set()
        
        # Инстансы симулятора, предиктора и анализатора
        self.simulator = ELOUAVTSimulator()
        self.predictor = RiskPredictor()
        self.analyzer = ErrorAnalyzer()
        
        # Переменные сессии
        self.active_operator_name = "Денис Арлаков"
        self.active_scenario = "startup"
        self.actions_taken: List[str] = []
        self.defects_triggered: Set[str] = set()
        self.telemetry_history: List[List[float]] = [] # Последние 30 секунд для LSTM
        self.logs: List[dict] = []
        
        # Переменные управления симуляцией (Инструктор)
        self.speed_multiplier = 1.0
        self.is_paused = False
        self.snapshot_data = None

    async def connect(self, websocket: WebSocket, role: str):
        """Подключает клиента и регистрирует в соответствующем наборе сокетов."""
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
        """Отключает клиента."""
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
        """Отправляет текущее состояние конкретному клиенту."""
        state = self.get_full_state()
        try:
            await websocket.send_json(state)
        except Exception:
            pass

    def get_full_state(self) -> dict:
        """Собирает полное состояние симулятора, прогноз рисков и DTW оценку сессии."""
        sim_state = self.simulator.get_state()
        
        # Получаем предсказание рисков от LSTM
        sensors = sim_state["sensors"]
        valves = sim_state["valves"]
        setpoints = sim_state["setpoints"]
        
        if not self.telemetry_history:
            self.telemetry_history.append([
                1.0 if valves["V_1"] else 0.0,
                1.0 if valves["V_2"] else 0.0,
                1.0 if valves["V_3"] else 0.0,
                setpoints["T_1_Sp"],
                sensors["T_1"],
                sensors["P_1"],
                sensors["L_1"]
            ])
            
        pred_vals, risk = self.predictor.predict_risk(
            self.telemetry_history, 
            sim_state["timeElapsed"], 
            scenario_id=self.active_scenario
        )
        
        # Запускаем оценку действий по DTW
        score, errors, recs = self.analyzer.evaluate_session(
            self.actions_taken,
            self.active_scenario,
            self.defects_triggered,
            final_sensors=sensors,
            time_elapsed=sim_state["timeElapsed"]
        )
        
        # Определяем буквенную оценку безопасности
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
            "scoreCard": score_card,
            "speedMultiplier": self.speed_multiplier,
            "isPaused": self.is_paused,
            "hasSnapshot": self.snapshot_data is not None
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
        session_logs = json.dumps(self.logs, ensure_ascii=False)
        
        # Защита целостности данных: включаем логи в расчет хэша SHA-256
        h = calculate_integrity_hash(op_name, role, scen_id, start_time, duration, score, status, violations, session_logs)
        
        save_session_db(op_name, role, scen_id, start_time, duration, score, status, violations, h, session_logs)
        
        log_audit_event("SYSTEM", "SESSION_SAVE", f"Сохранена учебная сессия оператора {op_name} (Оценка: {card['grade']})")

    def add_log(self, log_type: str, message: str):
        """Добавляет запись во временный журнал событий сессии."""
        time_str = f"{self.simulator.time_elapsed // 60:02d}:{self.simulator.time_elapsed % 60:02d}"
        self.logs.append({
            "id": str(int(time.time() * 1000) + random_id()),
            "time": time_str,
            "type": log_type,
            "message": message
        })

# Глобальный экземпляр ConnectionManager для использования во всех модулях
manager = ConnectionManager()
