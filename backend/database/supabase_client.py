"""
Supabase Database Client for ComplyAct.
Handles persistence of runs, traces, and audit logs.

DEMO_MODE: Uses in-memory storage (Python dicts) as fallback.
LIVE MODE: Connects to real Supabase PostgreSQL instance.
"""

import os
import json
import logging
from datetime import datetime, timezone
from typing import Any, Optional
from uuid import uuid4

logger = logging.getLogger(__name__)

DEMO_MODE = os.getenv("DEMO_MODE", "true") == "true"

# In-memory storage for DEMO_MODE
_memory_runs: dict[str, dict] = {}
_memory_traces: list[dict] = []
_memory_audit_logs: list[dict] = []

# Supabase client (lazy initialized)
_supabase_client = None


def _get_supabase():
    """Get or create the Supabase client."""
    global _supabase_client
    if _supabase_client is None:
        url = os.getenv("SUPABASE_URL", "")
        key = os.getenv("SUPABASE_ANON_KEY", "")
        if not url or not key:
            logger.warning("Supabase credentials not configured. Using in-memory storage.")
            return None
        try:
            from supabase import create_client
            _supabase_client = create_client(url, key)
            logger.info("Supabase client initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize Supabase: {e}")
            return None
    return _supabase_client


async def create_run(run_id: str, status: str = "started") -> dict:
    """
    Create a new audit run record.
    """
    run_data = {
        "id": run_id,
        "status": status,
        "started_at": datetime.now(timezone.utc).isoformat(),
        "completed_at": None,
    }

    if DEMO_MODE:
        _memory_runs[run_id] = run_data
        logger.info(f"[DEMO] Created run {run_id[:8]}... in memory")
        return run_data

    client = _get_supabase()
    if client:
        try:
            result = client.table("runs").insert(run_data).execute()
            logger.info(f"[LIVE] Created run {run_id[:8]}... in Supabase")
            return result.data[0] if result.data else run_data
        except Exception as e:
            logger.error(f"[LIVE] Failed to create run in Supabase: {e}")
            # Fallback to memory
            _memory_runs[run_id] = run_data
            return run_data

    _memory_runs[run_id] = run_data
    return run_data


async def update_run_status(run_id: str, status: str, completed: bool = False) -> dict:
    """
    Update the status of an audit run.
    """
    update_data: dict[str, Any] = {"status": status}
    if completed:
        update_data["completed_at"] = datetime.now(timezone.utc).isoformat()

    if DEMO_MODE:
        if run_id in _memory_runs:
            _memory_runs[run_id].update(update_data)
        logger.info(f"[DEMO] Updated run {run_id[:8]}... → {status}")
        return _memory_runs.get(run_id, update_data)

    client = _get_supabase()
    if client:
        try:
            result = client.table("runs").update(update_data).eq("id", run_id).execute()
            logger.info(f"[LIVE] Updated run {run_id[:8]}... → {status}")
            return result.data[0] if result.data else update_data
        except Exception as e:
            logger.error(f"[LIVE] Failed to update run: {e}")
            if run_id in _memory_runs:
                _memory_runs[run_id].update(update_data)
            return update_data

    if run_id in _memory_runs:
        _memory_runs[run_id].update(update_data)
    return _memory_runs.get(run_id, update_data)


async def add_trace(
    run_id: str,
    step_name: str,
    payload: dict,
    confidence_score: Optional[float] = None,
) -> dict:
    """
    Add a trace entry (AI reasoning step) for the terminal log.
    """
    trace_data = {
        "id": str(uuid4()),
        "run_id": run_id,
        "step_name": step_name,
        "payload": payload,
        "confidence_score": confidence_score,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }

    if DEMO_MODE:
        _memory_traces.append(trace_data)
        return trace_data

    client = _get_supabase()
    if client:
        try:
            # Serialize payload to JSON string for Supabase JSONB
            db_data = {**trace_data, "payload": json.dumps(payload)}
            result = client.table("traces").insert(db_data).execute()
            return result.data[0] if result.data else trace_data
        except Exception as e:
            logger.error(f"[LIVE] Failed to add trace: {e}")
            _memory_traces.append(trace_data)
            return trace_data

    _memory_traces.append(trace_data)
    return trace_data


async def create_audit_log(
    run_id: str,
    crypto_hash: str,
    human_override_applied: bool = False,
) -> dict:
    """
    Create an immutable audit log entry with the cryptographic hash.
    """
    audit_data = {
        "id": str(uuid4()),
        "run_id": run_id,
        "human_override_applied": human_override_applied,
        "crypto_hash": crypto_hash,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }

    if DEMO_MODE:
        _memory_audit_logs.append(audit_data)
        logger.info(f"[DEMO] Audit log created: {crypto_hash[:16]}...")
        return audit_data

    client = _get_supabase()
    if client:
        try:
            result = client.table("audit_logs").insert(audit_data).execute()
            logger.info(f"[LIVE] Audit log saved to Supabase: {crypto_hash[:16]}...")
            return result.data[0] if result.data else audit_data
        except Exception as e:
            logger.error(f"[LIVE] Failed to create audit log: {e}")
            _memory_audit_logs.append(audit_data)
            return audit_data

    _memory_audit_logs.append(audit_data)
    return audit_data


async def get_run(run_id: str) -> Optional[dict]:
    """Get a run by ID."""
    if DEMO_MODE:
        return _memory_runs.get(run_id)

    client = _get_supabase()
    if client:
        try:
            result = client.table("runs").select("*").eq("id", run_id).execute()
            return result.data[0] if result.data else None
        except Exception as e:
            logger.error(f"[LIVE] Failed to get run: {e}")
            return _memory_runs.get(run_id)

    return _memory_runs.get(run_id)


async def get_traces(run_id: str) -> list[dict]:
    """Get all traces for a run."""
    if DEMO_MODE:
        return [t for t in _memory_traces if t["run_id"] == run_id]

    client = _get_supabase()
    if client:
        try:
            result = client.table("traces").select("*").eq("run_id", run_id).order("created_at").execute()
            return result.data or []
        except Exception as e:
            logger.error(f"[LIVE] Failed to get traces: {e}")
            return [t for t in _memory_traces if t["run_id"] == run_id]

    return [t for t in _memory_traces if t["run_id"] == run_id]


async def get_audit_log(run_id: str) -> Optional[dict]:
    """Get the audit log for a run."""
    if DEMO_MODE:
        logs = [a for a in _memory_audit_logs if a["run_id"] == run_id]
        return logs[0] if logs else None

    client = _get_supabase()
    if client:
        try:
            result = client.table("audit_logs").select("*").eq("run_id", run_id).execute()
            return result.data[0] if result.data else None
        except Exception as e:
            logger.error(f"[LIVE] Failed to get audit log: {e}")
            logs = [a for a in _memory_audit_logs if a["run_id"] == run_id]
            return logs[0] if logs else None

    logs = [a for a in _memory_audit_logs if a["run_id"] == run_id]
    return logs[0] if logs else None
