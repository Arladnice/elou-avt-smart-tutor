import time
import json
import logging
import asyncio
import urllib.request
from typing import List, Set, Dict
from fastapi import WebSocket

from simulator.elou_avt_model import ELOUAVTSimulator
from ai_core.predictive_engine import RiskPredictor
from ai_core.error_analyzer import ErrorAnalyzer
from backend.db.queries import save_session_db
from backend.utils.security import calculate_integrity_hash, log_audit_event
from backend.utils.helpers import random_id

logger = logging.getLogger(__name__)

class SimulationSession:
    """Изолированная сессия для одного учебного сценария."""
    def __init__(self, session_id: str):
        self.session_id = session_id
        
        self.operator_sockets: Set[WebSocket] = set()
        self.instructor_sockets: Set[WebSocket] = set()
        
        self.simulator = ELOUAVTSimulator()
        self.predictor = RiskPredictor()
        self.analyzer = ErrorAnalyzer()
        
        self.active_operator_name = "Оператор"
        self.active_scenario = "startup"
        self.actions_taken: List[str] = []
        self.defects_triggered: Set[str] = set()
        self.telemetry_history: List[List[float]] = [] 
        self.logs: List[dict] = []
        
        self.speed_multiplier = 1.0
        self.is_paused = False
        self.snapshot_data = None
        self.mode = "training"

        self.webhook_url: str = ""
        self.webhook_active: bool = False
        self.processed_events_total: int = 0
        self.mutes: Set[str] = set()
        self.critical_alert_active: bool = False
        self.critical_alert_start_time: float = 0.0
        self.operator_reacted_to_critical: bool = False
        self.escalation_warning_sent: bool = False

    async def broadcast_state(self):
        state = self.get_full_state()
        for ws in list(self.operator_sockets):
            try:
                await ws.send_json(state)
            except Exception:
                self.operator_sockets.discard(ws)
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
        
        score, errors, recs, recommended_scenario_id = self.analyzer.evaluate_session(
            self.actions_taken,
            self.active_scenario,
            self.defects_triggered,
            final_sensors=sensors,
            time_elapsed=sim_state["timeElapsed"]
        )
        
        safety_grade = "A"
        if score < 50: safety_grade = "F"
        elif score < 70: safety_grade = "C"
        elif score < 85: safety_grade = "B"
        
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
                "recommendations": recs,
                "recommended_scenario_id": recommended_scenario_id
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
            "hasSnapshot": self.snapshot_data is not None,
            "mode": self.mode,
            "webhookUrl": self.webhook_url,
            "webhookActive": self.webhook_active,
            "mutes": list(self.mutes)
        }

    def save_completed_session(self):
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
        
        h = calculate_integrity_hash(op_name, role, scen_id, start_time, duration, score, status, violations, session_logs)
        save_session_db(op_name, role, scen_id, start_time, duration, score, status, violations, h, session_logs)
        log_audit_event("SYSTEM", "SESSION_SAVE", f"Сохранена учебная сессия оператора {op_name} (Оценка: {card['grade']})")

    def send_webhook_notification(self, log_entry: dict):
        if not self.webhook_url or not self.webhook_active:
            return
        def _make_request():
            try:
                payload = {
                    "event": "alarm",
                    "operator": self.active_operator_name,
                    "scenario": self.active_scenario,
                    "severity": log_entry.get("severity", "INFO"),
                    "message": log_entry.get("message"),
                    "time": log_entry.get("time"),
                    "timestamp": time.time()
                }
                req = urllib.request.Request(
                    self.webhook_url,
                    data=json.dumps(payload).encode("utf-8"),
                    headers={"Content-Type": "application/json"},
                    method="POST"
                )
                with urllib.request.urlopen(req, timeout=2.0) as resp:
                    pass
            except Exception as e:
                logger.error("Ошибка отправки вебхука на %s: %s", self.webhook_url, e)
        asyncio.create_task(asyncio.to_thread(_make_request))

    def reset_session(self, username: str = None, scenario: str = None):
        if username:
            self.active_operator_name = username
        if scenario:
            self.active_scenario = scenario
        else:
            scenario = self.active_scenario
            
        self.simulator.reset(scenario)
        self.actions_taken.clear()
        self.defects_triggered.clear()
        self.telemetry_history.clear()
        self.logs.clear()
        self.is_paused = False
        self.speed_multiplier = 1.0
        self.snapshot_data = None
        self.critical_alert_active = False
        self.operator_reacted_to_critical = False
        self.escalation_warning_sent = False

        if scenario == "startup":
            self.add_log("info", "Система инициализирована в холодном состоянии. Требуется пуск.")
            self.add_log("warning", "ВНИМАНИЕ: Все задвижки перекрыты, печь холодная. Начните технологический пуск.")
        else:
            self.add_log("info", "Система перезапущена. Режим работы: Стабильный.")
            self.add_log("info", "Входной клапан V-1 открыт. Подача сырья в норме.")

    def add_log(self, log_type: str, message: str, severity: str = None, fingerprint: str = None):
        if fingerprint in self.mutes:
            return
        self.processed_events_total += 1
        
        if not severity:
            if log_type == "error":
                severity = "CRITICAL"
            elif log_type == "warning":
                severity = "WARNING"
            else:
                severity = "INFO"
                
        time_str = f"{self.simulator.time_elapsed // 60:02d}:{self.simulator.time_elapsed % 60:02d}"
        
        if fingerprint and self.logs:
            for recent_log in reversed(self.logs[-5:]):
                if recent_log.get("fingerprint") == fingerprint:
                    count = recent_log.get("repeat_count", 1) + 1
                    recent_log["repeat_count"] = count
                    recent_log["message"] = message
                    recent_log["time"] = time_str
                    recent_log["type"] = log_type
                    recent_log["severity"] = severity
                    return
                
        new_entry = {
            "id": str(int(time.time() * 1000) + random_id()),
            "time": time_str,
            "type": log_type,
            "severity": severity,
            "message": message,
            "fingerprint": fingerprint,
            "repeat_count": 1
        }
        self.logs.append(new_entry)
        
        if severity == "CRITICAL":
            self.send_webhook_notification(new_entry)


class ConnectionManager:
    """Управляет пулом сессий."""
    def __init__(self):
        self.sessions: Dict[str, SimulationSession] = {}

    def get_session(self, session_id: str) -> SimulationSession:
        if session_id not in self.sessions:
            self.sessions[session_id] = SimulationSession(session_id)
        return self.sessions[session_id]

    async def connect(self, websocket: WebSocket, session_id: str, role: str, username: str):
        await websocket.accept()
        session = self.get_session(session_id)
        
        if role == "instructor":
            session.instructor_sockets.add(websocket)
            log_audit_event("INSTRUCTOR", "WS_CONNECT", f"Инструктор подключился к трансляции сессии {session_id}")
        else:
            session.operator_sockets.add(websocket)
            session.active_operator_name = username
            log_audit_event(username, "WS_CONNECT", f"Оператор подключился к сессии {session_id}")
            
        await session.send_state_to(websocket)

    def disconnect(self, websocket: WebSocket, session_id: str, role: str):
        if session_id in self.sessions:
            session = self.sessions[session_id]
            if role == "instructor":
                session.instructor_sockets.discard(websocket)
            else:
                session.operator_sockets.discard(websocket)
            
            # Удаляем брошенные сессии без участников
            if len(session.operator_sockets) == 0 and len(session.instructor_sockets) == 0:
                del self.sessions[session_id]

manager = ConnectionManager()
