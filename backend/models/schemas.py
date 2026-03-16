from pydantic import BaseModel
from typing import Optional
from enum import Enum


class RunStatus(str, Enum):
    STARTED = "started"
    PROCESSING = "processing"
    HALTED = "halted"
    AWAITING_APPROVAL = "awaiting_approval"
    COMPLETING = "completing"
    COMPLETED = "completed"
    FAILED = "failed"


class ExtractedData(BaseModel):
    vendor_name: str
    date: str
    amount: float


class ConfidenceScores(BaseModel):
    vendor_name: float
    date: float
    amount: float


class AuditStartResponse(BaseModel):
    run_id: str
    status: RunStatus
    extracted_data: ExtractedData
    confidence_scores: ConfidenceScores
    requires_human: bool
    halt_reason: Optional[str] = None


class AuditApproveRequest(BaseModel):
    run_id: str
    approved: bool
    override_value: Optional[str] = None


class AuditApproveResponse(BaseModel):
    run_id: str
    status: RunStatus
    message: str


class WSCommand(BaseModel):
    """WebSocket command sent to frontend for Ghost Cursor animation"""

    action: str  # "type", "click", "focus", "highlight", "log", "halt", "resume"
    msg_id: Optional[str] = None
    selector: Optional[str] = None
    value: Optional[str] = None
    message: Optional[str] = None
    confidence: Optional[float] = None
    delay: Optional[float] = None  # Animation delay in seconds


class TerminalLog(BaseModel):
    """Terminal log entry for the right-side panel"""

    msg_id: Optional[str] = None
    timestamp: str
    level: str  # "info", "warn", "error", "success", "agent"
    message: str
    step: Optional[str] = None
