import os
import uuid
import asyncio
from datetime import datetime, timezone
from typing import List, Dict

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from models.schemas import (
    AuditStartResponse,
    AuditApproveRequest,
    AuditApproveResponse,
    RunStatus,
    ExtractedData,
    ConfidenceScores,
    WSCommand,
    TerminalLog,
)
from agent.playwright_driver import AuditOrchestrator

load_dotenv()

app = FastAPI(
    title="ComplyAct API",
    description="Auditable Agentic Process Automation Backend",
    version="0.1.0",
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv("FRONTEND_URL", "http://localhost:3000")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DEMO_MODE = os.getenv("DEMO_MODE", "true") == "true"


# ─── WebSocket Connection Manager ─────────────────────────────
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        """Send a message to all connected WebSocket clients"""
        disconnected = []
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception:
                disconnected.append(connection)
        for conn in disconnected:
            self.disconnect(conn)


manager = ConnectionManager()

# In-memory state for active audit runs
active_orchestrators: Dict[str, AuditOrchestrator] = {}
active_runs: Dict[str, dict] = {}


# ─── WebSocket Endpoint ────────────────────────────────────────
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    print(f"[WS] Client connected. Total: {len(manager.active_connections)}")
    try:
        while True:
            data = await websocket.receive_text()
            print(f"[WS] Received: {data}")
    except WebSocketDisconnect:
        manager.disconnect(websocket)
        print(f"[WS] Client disconnected. Total: {len(manager.active_connections)}")


# ─── REST Endpoints ────────────────────────────────────────────
@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "demo_mode": DEMO_MODE,
        "version": "0.1.0",
        "active_connections": len(manager.active_connections),
        "active_runs": len(active_runs),
    }


@app.post("/api/audit/start", response_model=AuditStartResponse)
async def start_audit(file: UploadFile = File(...)):
    """
    Start an audit run.
    1. Returns extracted data immediately
    2. Kicks off background task to animate Ghost Cursor via WebSocket
    3. Halts at low-confidence field and waits for approval
    """
    run_id = str(uuid.uuid4())

    # Store run state
    active_runs[run_id] = {
        "status": RunStatus.PROCESSING,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }

    # Create orchestrator and store it
    orchestrator = AuditOrchestrator(ws_manager=manager, run_id=run_id, active_runs=active_runs)
    active_orchestrators[run_id] = orchestrator

    # Kick off the audit as a background task (non-blocking)
    async def run_audit_background():
        try:
            result = await orchestrator.run_audit()
            active_runs[run_id]["status"] = RunStatus.COMPLETED if result["status"] == "completed" else RunStatus.FAILED
            if "crypto_hash" in result:
                active_runs[run_id]["crypto_hash"] = result["crypto_hash"]
        except Exception as e:
            active_runs[run_id]["status"] = RunStatus.FAILED
            active_runs[run_id]["error"] = str(e)
        finally:
            # Clean up orchestrator after completion
            if run_id in active_orchestrators:
                del active_orchestrators[run_id]

    asyncio.create_task(run_audit_background())

    # Return immediate response with extracted data (mock)
    return AuditStartResponse(
        run_id=run_id,
        status=RunStatus.PROCESSING,
        extracted_data=ExtractedData(
            vendor_name="Acme Corp",
            date="10/12/2023",
            amount=4500.00,
        ),
        confidence_scores=ConfidenceScores(
            vendor_name=0.98,
            date=0.42,
            amount=0.95,
        ),
        requires_human=True,
        halt_reason="Ambiguous handwritten date detected.",
    )


@app.post("/api/audit/approve", response_model=AuditApproveResponse)
async def approve_audit(request: AuditApproveRequest):
    """
    Approve a halted audit run.
    Signals the orchestrator to resume form filling.
    """
    if request.run_id not in active_orchestrators:
        return AuditApproveResponse(
            run_id=request.run_id,
            status=RunStatus.FAILED,
            message="Run not found or already completed.",
        )

    orchestrator = active_orchestrators[request.run_id]

    if not orchestrator.is_halted:
        return AuditApproveResponse(
            run_id=request.run_id,
            status=RunStatus.PROCESSING,
            message="Run is not currently halted.",
        )

    # Resume the orchestrator
    orchestrator.approve(override_value=request.override_value)
    active_runs[request.run_id]["status"] = RunStatus.COMPLETING

    return AuditApproveResponse(
        run_id=request.run_id,
        status=RunStatus.COMPLETING,
        message="Human override accepted. Resuming agent execution.",
    )


@app.get("/api/audit/{run_id}/status")
async def get_audit_status(run_id: str):
    """Get the current status of an audit run"""
    if run_id not in active_runs:
        return {"error": "Run not found", "run_id": run_id}
    return {
        "run_id": run_id,
        **active_runs[run_id],
    }


@app.get("/api/audit/{run_id}/trail")
async def get_audit_trail(run_id: str):
    """Get the complete audit trail for a run (traces + audit log)"""
    from database.supabase_client import get_run, get_traces, get_audit_log

    run = await get_run(run_id)
    if not run:
        return {"error": "Run not found", "run_id": run_id}

    traces = await get_traces(run_id)
    audit_log = await get_audit_log(run_id)

    return {
        "run": run,
        "traces": traces,
        "audit_log": audit_log,
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
