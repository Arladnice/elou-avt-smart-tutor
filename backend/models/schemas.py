from pydantic import BaseModel
from typing import List, Dict, Any

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
    violations: List[Dict[str, Any]]
