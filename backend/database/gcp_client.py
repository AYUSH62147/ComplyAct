"""
Google Cloud Platform (GCP) Client for Firestore integration.
Manages the auditable ledger and transaction records for the Gemini Live Agent Challenge.
"""

import os
import logging
from datetime import datetime, timezone
from typing import Any, Optional

from google.cloud import firestore

logger = logging.getLogger(__name__)

# Config
DEMO_MODE = os.getenv("DEMO_MODE", "true") == "true"
PROJECT_ID = os.getenv("GOOGLE_CLOUD_PROJECT")

# Initialize Firestore
_db = None

def get_db():
    global _db
    if _db is None:
        try:
            # If PROJECT_ID is not set, it will attempt to use default credentials
            _db = firestore.Client(project=PROJECT_ID)
        except Exception as e:
            logger.error(f"Failed to initialize Firestore: {e}")
            return None
    return _db


async def create_audit_record(run_id: str, payload: dict) -> bool:
    """
    Create an immutable audit record in Firestore.
    """
    if DEMO_MODE:
        logger.info(f"[DEMO_MODE] Simulated Firestore audit record for {run_id}")
        return True

    db = get_db()
    if not db:
        return False

    try:
        doc_ref = db.collection("audit_ledger").document(run_id)
        record = {
            "run_id": run_id,
            "timestamp": datetime.now(timezone.utc),
            "payload": payload,
            "status": "completed",
            "provider": "google_gemini"
        }
        # In a real app, we'd use a transaction or specific security rules
        doc_ref.set(record)
        logger.info(f"Firestore audit record created for {run_id}")
        return True
    except Exception as e:
        logger.error(f"Firestore error: {e}")
        return False


async def update_audit_status(run_id: str, status: str, metadata: Optional[dict] = None) -> bool:
    """
    Update the status of an audit run in Firestore.
    """
    if DEMO_MODE:
        return True

    db = get_db()
    if not db:
        return False

    try:
        doc_ref = db.collection("audit_ledger").document(run_id)
        update_data = {"status": status}
        if metadata:
            update_data["metadata"] = metadata
        
        doc_ref.update(update_data)
        return True
    except Exception as e:
        logger.error(f"Firestore update error: {e}")
        return False
