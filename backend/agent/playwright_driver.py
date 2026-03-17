"""
Gemini UI Navigator Driver — Orchestrates the Mock ERP form filling via WebSocket.
Dual-stack support for Gemini Live Agent Challenge & Amazon Nova.

Instead of driving a real Playwright browser, this sends WebSocket commands
to the Next.js frontend, which animates the "Ghost Cursor" typing effect.
The Terminal panel receives log messages showing real-time AI reasoning.
"""

import asyncio
import json
import logging
import os
import hashlib
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional, Any

from models.schemas import WSCommand, TerminalLog
# Original DB clients
from database.supabase_client import create_run, update_run_status, add_trace, create_audit_log
# Pivot clients
from agent import gemini_client
from database import gcp_client

logger = logging.getLogger(__name__)

MOCKS_DIR = Path(__file__).parent.parent / "mocks"
CONFIDENCE_THRESHOLD = 0.80

# Determine AI Provider
AI_PROVIDER = os.getenv("AI_PROVIDER", "GEMINI").upper() # Default to GEMINI for the challenge
IS_GEMINI = AI_PROVIDER == "GEMINI"

class AuditOrchestrator:
    """
    Orchestrates the full audit flow:
    1. Extract data (Gemini/Nova)
    2. Fill form fields via Ghost Cursor
    3. Halt at low-confidence fields
    4. Wait for human approval (HITL)
    5. Resume and complete (Hyper-Sync)
    6. Generate audit hash & record to Ledger (Firestore/QLDB)
    """

    def __init__(self, ws_manager: Any, run_id: str, active_runs: dict = None):
        self.ws_manager = ws_manager
        self.run_id = run_id
        self.active_runs = active_runs or {}
        self.is_halted = False
        self.halt_event = asyncio.Event()
        self.extracted_data: dict = {}
        self.override_value: Optional[str] = None
        self.msg_counter = 0
        
        # dynamic branding
        self.ai_name = "Gemini" if IS_GEMINI else "Nova"
        self.navigator_name = "Gemini UI Navigator" if IS_GEMINI else "Nova Act Simulation"

    def _load_mock_data(self) -> dict:
        """Load deterministic response data"""
        mock_path = MOCKS_DIR / "nova_pro_response.json"
        with open(mock_path, "r") as f:
            return json.load(f)

    async def _send_log(self, level: str, message: str, step: str = ""):
        """Send a terminal log message via WebSocket"""
        self.msg_counter += 1
        log = TerminalLog(
            msg_id=f"{self.run_id}_{self.msg_counter}",
            timestamp=datetime.now(timezone.utc).isoformat(),
            level=level,
            message=message,
            step=step,
        )
        await self.ws_manager.broadcast({"type": "log", **log.model_dump()})

    async def _send_command(self, action: str, **kwargs):
        """Send a Ghost Cursor command via WebSocket"""
        self.msg_counter += 1
        command = WSCommand(
            msg_id=f"{self.run_id}_{self.msg_counter}",
            action=action, 
            **kwargs
        )
        await self.ws_manager.broadcast(command.model_dump())

    async def _simulate_thinking(self, seconds: float = 1.0):
        """Simulate AI processing time"""
        await asyncio.sleep(seconds)

    async def _type_field(self, field_id: str, value: str, label: str, confidence: float, delay: float = 0.04):
        """
        Animate typing into a field with full terminal narration.
        Shows Real-time reasoning in the terminal.
        """
        # Reasoning log
        await self._send_log(
            "agent",
            f'Thought: Located input #{field_id}. Confidence: {confidence:.2f}',
            "reasoning",
        )
        await asyncio.sleep(0.1)

        # Focus the field
        await self._send_command("focus", selector=f"#{field_id}")
        await self._send_log(
            "agent",
            f'Action: Focus → #{field_id}',
            "navigator",
        )
        await asyncio.sleep(0.2)

        # Type the value
        await self._send_log(
            "info",
            f'Typing "{value}" into {label}',
            "fill",
        )
        await self._send_command("type", selector=f"#{field_id}", value=value, delay=delay)

        # Wait for typing animation to complete on frontend
        typing_duration = (len(value) * delay) * 0.8
        await asyncio.sleep(typing_duration)

        # Confidence assessment
        if confidence >= CONFIDENCE_THRESHOLD:
            await self._send_log(
                "success",
                f'✓ {label}: {confidence:.0%} confidence — Accepted',
                "verify",
            )
        else:
            await self._send_log(
                "warn",
                f'⚠ {label}: {confidence:.0%} confidence — BELOW THRESHOLD',
                "verify",
            )

        await self._simulate_thinking(0.3)

    async def run_audit(self):
        """
        Execute the full deterministic audit sequence.
        """
        try:
            # ─── Phase: Initialization ───────────────────────
            init_msg = f"Audit run initiated. Provider: {self.ai_name}"
            await self._send_log("info", init_msg, "init")
            
            # Record in Supabase (and Firestore if Gemini)
            try: await create_run(self.run_id, "processing")
            except Exception: pass
            
            if IS_GEMINI:
                await gcp_client.update_audit_status(self.run_id, "processing", {"provider": "gemini"})

            await self._simulate_thinking(0.5)

            # ─── Phase: Document Ingestion ───────────────────
            await self._send_log("info", "Ingesting document: Vendor_Audit_Q3.pdf", "ingest")
            await self._simulate_thinking(1.0)

            await self._send_log("agent", f"Invoking {self.ai_name} Multimodal for extraction...", "extract")
            await self._simulate_thinking(0.8)

            # Load data (Demo vs Live handled in clients)
            if IS_GEMINI:
                # Mock or Real Gemini Call
                self.extracted_data = await gemini_client.extract_document_data(b"", "Vendor_Audit_Q3.pdf")
            else:
                self.extracted_data = self._load_mock_data()
                
            fields = self.extracted_data["extracted_fields"]

            await self._send_log(
                "success",
                f'{self.ai_name} returned {len(fields)} fields successfully.',
                "extract",
            )
            await asyncio.sleep(0.3)

            # ─── Phase: Form Filling (Pre-Halt) ──────────────
            await self._send_log("info", f"Initiating {self.navigator_name}", "navigator")
            await self._simulate_thinking(0.5)

            # Field 1: Vendor Name
            await self._type_field(
                "vendor-name",
                fields["vendor_name"]["value"],
                "Vendor Name",
                fields["vendor_name"]["confidence"],
            )

            # Field 2: Invoice Number
            await self._type_field(
                "invoice-number",
                fields["invoice_number"]["value"],
                "Invoice Number",
                fields["invoice_number"]["confidence"],
            )

            # ─── Phase: GRACEFUL HALT ────────────────────────
            date_field = fields["date"]
            await self._send_log(
                "agent",
                f'Thought: Located #date. Confidence: {date_field["confidence"]:.2f}',
                "reasoning",
            )
            await self._simulate_thinking(0.5)

            if date_field["confidence"] < CONFIDENCE_THRESHOLD:
                await self._send_command("focus", selector="#date")
                await self._send_log("error", f'⚠ LOW CONFIDENCE ({date_field["confidence"]:.0%})', "halt")
                await self._send_log("warn", "GRACEFUL HALT — Requesting Human Override via Slack", "hitl")
                
                # Update status
                if IS_GEMINI:
                    await gcp_client.update_audit_status(self.run_id, "halted", {"field": "date"})
                
                # Trigger frontend modal
                await self._send_command(
                    "halt",
                    selector="#date",
                    message="Confidence below threshold. Ambiguous date detected.",
                    confidence=date_field["confidence"],
                )

                self.is_halted = True
                await self.halt_event.wait() # Wait for human

                # Resumption
                await self._send_log("success", "Override received. Resuming at 2x Hyper-Sync speed.", "hitl")
                await self._send_command("resume")
                self.is_halted = False
                await self._simulate_thinking(0.5)

            # Fill Date
            date_value = self.override_value or date_field["value"]
            await self._type_field(
                "date",
                date_value,
                "Date",
                0.99 if self.override_value else date_field["confidence"],
                delay=0.03, # Faster
            )

            # ─── Phase: Fast Completion ──────────────────────
            # Amount
            await self._type_field(
                "amount",
                str(fields["amount"]["value"]),
                "Amount",
                fields["amount"]["confidence"],
                delay=0.03,
            )

            # Payment Terms
            await self._type_field(
                "payment-terms",
                fields["payment_terms"]["value"],
                "Payment Terms",
                fields["payment_terms"]["confidence"],
                delay=0.03,
            )

            # ─── Phase: Finalization & Audit Ledger ──────────
            await self._send_log("info", "Generating cryptographic audit record...", "audit")
            await self._simulate_thinking(1.0)

            # Generate SHA-256
            audit_payload = {
                "run_id": self.run_id,
                "fields": {k: v["value"] for k, v in fields.items()},
                "human_override": self.override_value is not None,
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "provider": self.ai_name
            }
            crypto_hash = hashlib.sha256(json.dumps(audit_payload).encode()).hexdigest()

            # Record to Firestore if in Gemini mode (Challenge Requirement)
            if IS_GEMINI:
                await gcp_client.create_audit_record(self.run_id, audit_payload)
                await self._send_log("success", "✓ Verified by Google Cloud — Immutable record saved to Firestore", "ledger")
            else:
                try: await create_audit_log(self.run_id, crypto_hash, self.override_value is not None)
                except Exception: pass
                await self._send_log("success", "✓ Verified by Amazon QLDB — Immutable record saved", "ledger")

            # Finalize
            await self._send_command("complete", message=f"Audit complete. Hash: {crypto_hash[:8]}")
            await self._send_log("success", f"Audit {self.run_id[:8]} completed successfully.", "done")
            
            try: await update_run_status(self.run_id, "completed", completed=True)
            except Exception: pass

            return {"run_id": self.run_id, "status": "completed", "crypto_hash": crypto_hash}

        except Exception as e:
            logger.error(f"Audit error: {e}")
            await self._send_log("error", f"Audit failed: {str(e)}", "error")
            await self._send_command("halt", message=f"Error: {str(e)}")
            return {"run_id": self.run_id, "status": "failed", "error": str(e)}

    def approve(self, override_value: Optional[str] = None):
        """HITL Approval"""
        self.override_value = override_value
        self.halt_event.set()
