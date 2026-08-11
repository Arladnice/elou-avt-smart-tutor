import time
import json
import logging
import asyncio
import random
import urllib.request
from collections import deque
from typing import Any, List, Set, Dict
from fastapi import WebSocket

from elou_tutor.simulation.model import ELOUAVTSimulator
from elou_tutor.simulation.scenarios import get_scenario_by_id
from elou_tutor.ml.predictor import RiskPredictor
from elou_tutor.tutor.analyzer import ErrorAnalyzer
from elou_tutor.db.audit import log_audit_event
from elou_tutor.db.queries import save_session_db
from elou_tutor.services.net import is_webhook_url_allowed
from elou_tutor.services.interlocks import DUTY_ENGINEER_PHONE, InterlockController
from elou_tutor.domain.integrity import calculate_integrity_hash

logger = logging.getLogger(__name__)

# Максимум одновременных учебных сессий: защищает от исчерпания памяти
# при подключениях с произвольными session_id.
MAX_ACTIVE_SESSIONS = 50

# Состояние сессии целиком уходит в каждую рассылку (раз в секунду каждому
# клиенту), поэтому оно ограничено. При лимите команд 30/сек за пятиминутную
# сессию иначе накапливались бы тысячи записей и сотни килобайт на рассылку.
MAX_SESSION_LOGS = 200
MAX_SESSION_ACTIONS = 500

# Реально измеренная длительность рассылки состояния (сборка + отправка всем
# сокетам). Питает метрику мониторинга вместо прежней константы.
broadcast_latencies_ms: deque = deque(maxlen=100)


def average_broadcast_latency_ms() -> float:
    if not broadcast_latencies_ms:
        return 0.0
    return sum(broadcast_latencies_ms) / len(broadcast_latencies_ms)

# Модель прогноза не хранит состояния между вызовами, поэтому загружается
# один раз на процесс, а не на каждую сессию (ONNX-рантайм дорог по памяти).
_shared_predictor: RiskPredictor = None


def get_shared_predictor() -> RiskPredictor:
    global _shared_predictor
    if _shared_predictor is None:
        _shared_predictor = RiskPredictor()
    return _shared_predictor


def is_checklist_condition_met(
    condition: Dict[str, Any],
    valves: Dict[str, bool],
    pumps: Dict[str, bool],
    sensors: Dict[str, Any],
    setpoints: Dict[str, float],
) -> bool:
    """Проверяет условие шага сценария по текущему состоянию установки."""
    condition_type = condition.get("type")
    target = condition.get("target")
    expected = condition.get("expected")

    if condition_type == "valve_is":
        return valves.get(target) is expected
    if condition_type == "pump_is":
        return pumps.get(target) is expected
    if condition_type in {"sensor_gte", "sensor_lte"}:
        value = sensors.get(target)
    elif condition_type in {"setpoint_gte", "setpoint_lte"}:
        value = setpoints.get(target)
    else:
        value = None

    if condition_type in {"sensor_gte", "setpoint_gte"}:
        return value is not None and value >= expected - condition.get("tolerance", 0)
    if condition_type in {"sensor_lte", "setpoint_lte"}:
        return value is not None and value <= expected + condition.get("tolerance", 0)
    if condition_type == "composite_and":
        children = condition.get("conditions", [])
        return bool(children) and all(
            is_checklist_condition_met(child, valves, pumps, sensors, setpoints)
            for child in children
        )
    if condition_type == "composite_or":
        children = condition.get("conditions", [])
        return bool(children) and any(
            is_checklist_condition_met(child, valves, pumps, sensors, setpoints)
            for child in children
        )
    return False


class SessionCapacityError(RuntimeError):
    """Достигнут предел одновременных учебных сессий."""


class SessionAccessDenied(PermissionError):
    """Оператор пытается войти в сессию, принадлежащую другому оператору."""


class SimulationSession:
    """Изолированная сессия для одного учебного сценария."""
    def __init__(self, session_id: str):
        self.session_id = session_id

        self.operator_sockets: Set[WebSocket] = set()
        self.instructor_sockets: Set[WebSocket] = set()

        self.simulator = ELOUAVTSimulator()
        self.predictor = get_shared_predictor()
        self.analyzer = ErrorAnalyzer()

        # Оператор, за которым закреплена сессия (задаётся при первом подключении)
        self.owner: str = None
        self.active_operator_name = "Оператор"
        self.active_scenario = "startup"
        self.actions_taken: List[str] = []
        # Те же действия с отметками времени: нужны для локализации ошибок
        self.action_timeline: List[dict] = []
        self.defects_triggered: Set[str] = set()
        # Пройденные пункты сценария — серверный источник истины. Шаг может
        # отражать завершённую технологическую операцию, которая штатно
        # меняет состояние позже (например, Н-2/Н-3 останавливаются после
        # горячей циркуляции), поэтому его нельзя пересчитывать только в UI.
        self.completed_checklist_steps: Set[str] = set()
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
        self.interlocks = InterlockController()

        # Ревизия журнала растёт при любом его изменении: и при добавлении
        # записи, и при правке существующей по fingerprint. Счётчика длины мало —
        # повтор сигнала меняет запись на месте, не удлиняя список.
        self.logs_revision: int = 0
        self._sent_logs_revision = None
        self._sent_score_card = None
        self._sent_interlocks = None
        self._sent_training_acceleration = None

    async def broadcast_state(self):
        started = time.perf_counter()
        state = self.get_broadcast_state()
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

        broadcast_latencies_ms.append((time.perf_counter() - started) * 1000.0)

    async def send_state_to(self, websocket: WebSocket):
        # Полный снимок: подключившийся в середине сессии клиент ничего о
        # предыдущих тактах не знает, дельта ему бесполезна.
        state = self.get_full_state()
        try:
            await websocket.send_json(state)
        except Exception:
            pass

    def get_broadcast_state(self) -> dict:
        """
        Состояние для периодической рассылки: без полей, которые не изменились.

        Телеметрия уходит каждую секунду каждому клиенту, а журнал и карточка
        оценки меняются редко: журнал пополняется по событию, карточка после
        завершения сессии статична. Пересылка их в каждом такте давала 80 КБ
        на пакет при заполненных лимитах и заставляла фронтенд заменять весь
        массив журнала целиком раз в секунду.

        Отсутствие ключа означает «не изменилось» — клиент сохраняет своё
        значение. Полный снимок отдаёт send_state_to при подключении.
        """
        state = self.get_full_state()

        if self._sent_logs_revision == self.logs_revision:
            del state["logs"]
        else:
            self._sent_logs_revision = self.logs_revision

        if state["scoreCard"] == self._sent_score_card:
            del state["scoreCard"]
        else:
            self._sent_score_card = state["scoreCard"]

        if state["interlocks"] == self._sent_interlocks:
            del state["interlocks"]
        else:
            self._sent_interlocks = state["interlocks"]

        if state["trainingAcceleration"] == self._sent_training_acceleration:
            del state["trainingAcceleration"]
        else:
            self._sent_training_acceleration = state["trainingAcceleration"]

        return state

    def get_full_state(self) -> dict:
        sim_state = self.simulator.get_state()
        
        sensors = sim_state["sensors"]
        valves = sim_state["valves"]
        setpoints = sim_state["setpoints"]
        self._update_completed_checklist_steps(sim_state)
        
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
            
        # Окно телеметрии семифичевое и описывает только контур К-1 — его
        # прогнозирует сеть. Показания вакуумного блока передаём отдельно:
        # риск по ним считается по факту, а не предсказывается.
        pred_vals, risk = self.predictor.predict_risk(
            self.telemetry_history,
            sim_state["timeElapsed"],
            scenario_id=self.active_scenario,
            k2_sensors=sensors,
            startup_k2_prefill=sim_state["startupK2Prefill"],
        )
        
        score, errors, recs, recommended_scenario_id = self.analyzer.evaluate_session(
            self.actions_taken,
            self.active_scenario,
            self.defects_triggered,
            final_sensors=sensors,
            time_elapsed=sim_state["timeElapsed"],
            timeline=self.action_timeline,
        )
        
        safety_grade = "A"
        if score < 50:
            safety_grade = "F"
        elif score < 70:
            safety_grade = "C"
        elif score < 85:
            safety_grade = "B"
        
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
                "recommended_scenario_id": recommended_scenario_id,
                # Хронология действий оператора: на ней строится разбор
                # тренировки и локализация ошибок во времени
                "timeline": list(self.action_timeline)
            }
            
        return {
            "status": sim_state["status"],
            "timeElapsed": sim_state["timeElapsed"],
            "valves": sim_state["valves"],
            "pumps": sim_state["pumps"],
            "sensors": sim_state["sensors"],
            "setpoints": sim_state["setpoints"],
            "defects": sim_state["defects"],
            "accidentReason": sim_state["accidentReason"],
            "operatorName": self.active_operator_name,
            "scenarioId": self.active_scenario,
            "completedChecklistSteps": sorted(self.completed_checklist_steps),
            "startupK2Prefill": sim_state["startupK2Prefill"],
            "riskLevel": risk,
            "predictions": pred_vals,
            # actions в пакет не входит: ни один клиент его не читает, а при
            # лимите в 500 действий это до 4 КБ в каждой секундной рассылке.
            # Хронология для разбора уезжает в scoreCard.timeline.
            "logs": self.logs,
            "scoreCard": score_card,
            "speedMultiplier": self.speed_multiplier,
            "isPaused": self.is_paused,
            "hasSnapshot": self.snapshot_data is not None,
            "mode": self.mode,
            "webhookUrl": self.webhook_url,
            "webhookActive": self.webhook_active,
            "mutes": list(self.mutes),
            "interlocks": self.interlocks.rows(
                sensors,
                startup_k2_prefill=sim_state["startupK2Prefill"],
            ),
            "dutyEngineerPhone": DUTY_ENGINEER_PHONE,
            "interlockOperationAuthorized": self.interlocks.operation_authorized,
            "trainingAcceleration": sim_state["trainingAcceleration"],
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
        # Повторная проверка перед самой отправкой: адрес мог быть записан
        # в обход команды configure_webhook (снапшот, старое состояние).
        if not is_webhook_url_allowed(self.webhook_url):
            logger.warning("Отправка вебхука на запрещённый адрес отклонена: %s", self.webhook_url)
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
                # Ответ вебхука не используется — важен сам факт доставки
                urllib.request.urlopen(req, timeout=2.0).close()
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
        # Журнал очищается ниже: это тоже изменение, и клиенту нужен новый
        # полный список, иначе он продолжит показывать записи прошлой сессии
        self.logs_revision += 1
        self.actions_taken.clear()
        self.action_timeline.clear()
        self.defects_triggered.clear()
        self.completed_checklist_steps.clear()
        self.telemetry_history.clear()
        self.logs.clear()
        self.is_paused = False
        self.speed_multiplier = 1.0
        self.snapshot_data = None
        self.critical_alert_active = False
        self.operator_reacted_to_critical = False
        self.escalation_warning_sent = False
        self.interlocks.reset()
        self._sent_interlocks = None
        self._sent_training_acceleration = None

        if scenario == "startup":
            self.add_log("info", "Система инициализирована в холодном состоянии. Требуется пуск.")
            # Холодная установка с закрытыми задвижками — исходное состояние
            # сценария, а не технологическая тревога. Иначе ИИ инструктора
            # немедленно подсвечивает штатный пуск как отклонение.
            self.add_log("info", "Исходное состояние пуска: все задвижки перекрыты, печь холодная. Начните технологический пуск.")
        else:
            self.add_log("info", "Система перезапущена. Режим работы: Стабильный.")
            self.add_log("info", "Входной клапан V-1 открыт. Подача сырья в норме.")

    def _update_completed_checklist_steps(self, sim_state: Dict[str, Any]) -> None:
        """Запоминает достигнутые контрольные точки активного сценария."""
        scenario = get_scenario_by_id(self.active_scenario)
        if not scenario:
            return

        for item in scenario.get("checklist", []):
            step_id = item.get("id")
            condition = item.get("condition")
            if not step_id or not condition or step_id in self.completed_checklist_steps:
                continue
            if is_checklist_condition_met(
                condition,
                sim_state["valves"],
                sim_state["pumps"],
                sim_state["sensors"],
                sim_state["setpoints"],
            ):
                self.completed_checklist_steps.add(step_id)

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
                    # Запись изменилась на месте, длина журнала прежняя —
                    # без явной отметки рассылка сочла бы журнал неизменным
                    self.logs_revision += 1
                    return
                
        new_entry = {
            "id": str(int(time.time() * 1000) + random.randint(1, 999)),
            "time": time_str,
            "type": log_type,
            "severity": severity,
            "message": message,
            "fingerprint": fingerprint,
            "repeat_count": 1
        }
        self.logs.append(new_entry)
        self.logs_revision += 1
        if len(self.logs) > MAX_SESSION_LOGS:
            del self.logs[:-MAX_SESSION_LOGS]

        if severity == "CRITICAL":
            self.send_webhook_notification(new_entry)

    def record_action(self, action_name: str):
        """
        Фиксирует управляющее действие оператора.

        actions_taken остаётся плоским списком строк — на нём построены
        LCS-выравнивание и правила техрегламента. Отметки времени идут
        параллельным списком, позиции в обоих списках соответствуют друг другу.
        """
        self.actions_taken.append(action_name)
        self.action_timeline.append({
            "index": len(self.actions_taken) - 1,
            "action": action_name,
            "at_second": self.simulator.time_elapsed,
        })

        if len(self.actions_taken) > MAX_SESSION_ACTIONS:
            del self.actions_taken[:-MAX_SESSION_ACTIONS]
            del self.action_timeline[:-MAX_SESSION_ACTIONS]
            # После обрезки позиции сдвинулись — восстанавливаем соответствие
            for position, entry in enumerate(self.action_timeline):
                entry["index"] = position


class ConnectionManager:
    """Управляет пулом сессий."""
    def __init__(self):
        self.sessions: Dict[str, SimulationSession] = {}

    def get_session(self, session_id: str) -> SimulationSession:
        if session_id not in self.sessions:
            if len(self.sessions) >= MAX_ACTIVE_SESSIONS:
                raise SessionCapacityError(
                    f"Достигнут предел одновременных сессий ({MAX_ACTIVE_SESSIONS})"
                )
            self.sessions[session_id] = SimulationSession(session_id)
        return self.sessions[session_id]

    def claim_session(self, session_id: str, role: str, username: str) -> SimulationSession:
        """
        Возвращает сессию, проверяя право доступа.

        Оператор работает только в своей сессии: иначе подключение с чужим
        session_id сбрасывало бы чужую тренировку. Инструктор наблюдает любую.
        """
        session = self.get_session(session_id)

        if role == "operator":
            if session.owner is None:
                session.owner = username
            elif session.owner != username:
                raise SessionAccessDenied(
                    f"Сессия {session_id} принадлежит оператору {session.owner}"
                )

        return session

    async def connect(self, websocket: WebSocket, session_id: str, role: str, username: str):
        await websocket.accept()
        session = self.get_session(session_id)
        
        if role == "instructor":
            session.instructor_sockets.add(websocket)
            log_audit_event(username, "WS_CONNECT", f"Инструктор подключился к трансляции сессии {session_id}")
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
