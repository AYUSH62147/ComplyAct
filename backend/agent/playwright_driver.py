"""
Ghost Cursor Driver — Orchestrates the Mock ERP form filling via WebSocket.

Instead of driving a real Playwright browser, this sends WebSocket commands
to the Next.js frontend, which animates the "Ghost Cursor" typing effect.
The Terminal panel receives log messages showing fake AI reasoning.
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
from database.supabase_client import create_run, update_run_status, add_trace, create_audit_log

logger = logging.getLogger(__name__)

MOCKS_DIR = Path(__file__).parent.parent / "mocks"
CONFIDENCE_THRESHOLD = 0.80


class AuditOrchestrator:
    """
    Orchestrates the full audit flow:
    1. Extract data (mock)
    2. Fill form fields via Ghost Cursor
    3. Halt at low-confidence fields
    4. Wait for human approval
    5. Resume and complete
    6. Generate audit hash
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

    def _load_mock_data(self) -> dict:
        """Load mock Nova Pro response"""
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
        Shows Nova Act-style reasoning in the terminal.
        """
        # Nova Act reasoning log
        await self._send_log(
            "agent",
            f'Thought: Located input #{field_id}. Confidence: {confidence:.2f}',
            "nova-act",
        )
        await self._simulate_thinking(0.3)

        # Focus the field
        await self._send_command("focus", selector=f"#{field_id}")
        await self._send_log(
            "agent",
            f'Action: Focus → #{field_id}',
            "nova-act",
        )
        await self._simulate_thinking(0.5)

        # Type the value
        await self._send_log(
            "info",
            f'Typing "{value}" into {label}',
            "fill",
        )
        await self._send_command("type", selector=f"#{field_id}", value=value, delay=delay)

        # Wait for typing animation to complete on frontend
        typing_duration = len(value) * delay + 0.5
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
        This is the main orchestration flow.
        """
        try:
            # ─── Phase: Initialization ───────────────────────
            await self._send_log("info", f"Audit run {self.run_id[:8]}... initiated", "init")
            try: await create_run(self.run_id, "processing")
            except Exception: logger.warning(f"DB: Failed to create run {self.run_id[:8]}")
            await self._simulate_thinking(0.5)

            await self._send_log("info", "DEMO_MODE: ON — Using deterministic mock data", "init")
            await self._simulate_thinking(0.3)

            # ─── Phase: Document Ingestion ───────────────────
            await self._send_log("info", "Ingesting document: Vendor_Audit_Q3.pdf", "ingest")
            await self._simulate_thinking(1.0)

            await self._send_log("agent", "Invoking Amazon Nova Pro v1.0 for multimodal extraction...", "nova-pro")
            await self._simulate_thinking(1.5)

            # Load mock data
            self.extracted_data = self._load_mock_data()
            fields = self.extracted_data["extracted_fields"]

            await self._send_log(
                "success",
                f'Nova Pro returned {len(fields)} extracted fields in {self.extracted_data["processing_time_ms"]}ms',
                "nova-pro",
            )
            try: await add_trace(self.run_id, "nova_pro_extraction", {"fields_count": len(fields)}, None)
            except Exception: logger.warning("DB: Failed to add extraction trace")
            await self._simulate_thinking(0.5)

            # Check for risk flags
            risk_flags = self.extracted_data.get("risk_flags", [])
            if risk_flags:
                for flag in risk_flags:
                    await self._send_log(
                        "warn",
                        f'Risk flag: {flag["field"]} — {flag["reason"]}',
                        "risk",
                    )
                await self._simulate_thinking(0.5)

            # ─── Phase: Form Filling (Pre-Halt) ──────────────
            await self._send_log("info", "Initiating Ghost Cursor — filling Mock ERP form", "nova-act")
            await self._simulate_thinking(0.5)

            await self._send_log(
                "agent",
                "Thought: Navigating to Vendor Audit Entry form at legacy-erp.internal:8443",
                "nova-act",
            )
            await self._simulate_thinking(0.8)

            # Fill fields in order — halt at date field
            # Field 1: Vendor Name (high confidence)
            await self._type_field(
                "vendor-name",
                fields["vendor_name"]["value"],
                "Vendor Name",
                fields["vendor_name"]["confidence"],
            )
            try: await add_trace(self.run_id, "fill_vendor-name", {"value": fields["vendor_name"]["value"], "confidence": fields["vendor_name"]["confidence"]}, fields["vendor_name"]["confidence"])
            except Exception: logger.warning("DB: Failed to add trace for vendor-name")

            # Field 2: Invoice Number (high confidence)
            await self._type_field(
                "invoice-number",
                fields["invoice_number"]["value"],
                "Invoice Number",
                fields["invoice_number"]["confidence"],
            )
            try: await add_trace(self.run_id, "fill_invoice-number", {"value": fields["invoice_number"]["value"], "confidence": fields["invoice_number"]["confidence"]}, fields["invoice_number"]["confidence"])
            except Exception: logger.warning("DB: Failed to add trace for invoice-number")

            # ─── Phase: GRACEFUL HALT at Date Field ──────────
            date_field = fields["date"]
            await self._send_log(
                "agent",
                f'Thought: Located input #date. Confidence: {date_field["confidence"]:.2f}',
                "nova-act",
            )
            await self._simulate_thinking(0.5)

            await self._send_command("focus", selector="#date")
            await self._simulate_thinking(0.3)

            await self._send_log(
                "error",
                f'⚠ CONFIDENCE {date_field["confidence"]:.0%} — BELOW THRESHOLD {CONFIDENCE_THRESHOLD:.0%}',
                "halt",
            )
            await self._simulate_thinking(0.3)

            await self._send_log(
                "error",
                f'Halt reason: {date_field.get("ambiguity_note", "Ambiguous handwritten date detected.")}',
                "halt",
            )
            await self._simulate_thinking(0.2)

            await self._send_log(
                "warn",
                "GRACEFUL HALT — Requesting Human-in-the-Loop override",
                "halt",
            )
            try: await update_run_status(self.run_id, "halted")
            except Exception: logger.warning("DB: Failed to update run status to halted")
            try: await add_trace(self.run_id, "graceful_halt", {"field": "date", "confidence": date_field["confidence"]}, date_field["confidence"])
            except Exception: logger.warning("DB: Failed to add halt trace")

            # Send halt command to frontend
            await self._send_command(
                "halt",
                selector="#date",
                message=f'Confidence {date_field["confidence"]:.0%} — {date_field.get("ambiguity_note", "Handwritten date detected")}',
                confidence=date_field["confidence"],
            )

            # Mark as halted and wait for approval
            self.is_halted = True
            if self.active_runs and self.run_id in self.active_runs:
                self.active_runs[self.run_id]["status"] = "halted"
            await self._send_log(
                "warn",
                "Automation paused. Awaiting human approval via Slack...",
                "hitl",
            )

            # Block here until approve() is called
            await self.halt_event.wait()

            # ─── Phase: Resume After Approval ────────────────
            await self._send_log(
                "success",
                "Human override received — Resuming automation",
                "hitl",
            )
            try: await update_run_status(self.run_id, "completing")
            except Exception: logger.warning("DB: Failed to update run status to completing")
            await self._simulate_thinking(0.5)

            await self._send_command("resume")
            self.is_halted = False
            if self.active_runs and self.run_id in self.active_runs:
                self.active_runs[self.run_id]["status"] = "completing"
            await self._simulate_thinking(0.3)

            # Fill the date field with override value or original
            date_value = self.override_value or date_field["value"]
            await self._send_log(
                "info",
                f'Using {"overridden" if self.override_value else "original"} date value: {date_value}',
                "fill",
            )

            await self._type_field(
                "date",
                date_value,
                "Date",
                0.99 if self.override_value else date_field["confidence"],
                delay=0.03,  # Faster after approval — "2x speed" effect
            )

            # ─── Phase: Fill Remaining Fields (Post-Halt) ────
            await self._send_log(
                "agent",
                "Thought: Resuming at 2x speed for remaining fields",
                "nova-act",
            )
            await self._simulate_thinking(0.3)

            # Field 4: Amount (high confidence, fast)
            await self._type_field(
                "amount",
                str(fields["amount"]["value"]),
                "Amount",
                fields["amount"]["confidence"],
                delay=0.03,
            )
            try: await add_trace(self.run_id, "fill_amount", {"value": str(fields["amount"]["value"]), "confidence": fields["amount"]["confidence"]}, fields["amount"]["confidence"])
            except Exception: logger.warning("DB: Failed to add trace for amount")

            # Field 5: Payment Terms (high confidence, fast)
            await self._type_field(
                "payment-terms",
                fields["payment_terms"]["value"],
                "Payment Terms",
                fields["payment_terms"]["confidence"],
                delay=0.03,
            )
            try: await add_trace(self.run_id, "fill_payment-terms", {"value": fields["payment_terms"]["value"], "confidence": fields["payment_terms"]["confidence"]}, fields["payment_terms"]["confidence"])
            except Exception: logger.warning("DB: Failed to add trace for payment-terms")

            # Field 6: Vendor Address (high confidence, fast)
            await self._type_field(
                "vendor-address",
                fields["vendor_address"]["value"],
                "Vendor Address",
                fields["vendor_address"]["confidence"],
                delay=0.02,
            )
            try: await add_trace(self.run_id, "fill_vendor-address", {"value": fields["vendor_address"]["value"], "confidence": fields["vendor_address"]["confidence"]}, fields["vendor_address"]["confidence"])
            except Exception: logger.warning("DB: Failed to add trace for vendor-address")

            # ─── Phase: Completion & Audit Hash ──────────────
            await self._send_log("info", "All fields filled. Generating cryptographic receipt...", "audit")
            await self._simulate_thinking(1.0)

            # Generate SHA-256 hash
            audit_payload = json.dumps({
                "run_id": self.run_id,
                "extracted_data": {k: v["value"] for k, v in fields.items()},
                "human_override": self.override_value is not None,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }, sort_keys=True)
            crypto_hash = hashlib.sha256(audit_payload.encode()).hexdigest()

            await self._send_log(
                "success",
                f"SHA-256 Audit Hash: {crypto_hash[:16]}...{crypto_hash[-8:]}",
                "qldb",
            )
            await self._simulate_thinking(0.5)

            await self._send_log(
                "success",
                "✓ Verified by Amazon QLDB — Immutable audit trail recorded",
                "qldb",
            )

            # Send complete command to frontend
            await self._send_command(
                "complete",
                message=f"Audit complete. Ledger ID: {crypto_hash[:16]}",
            )

            await self._send_log(
                "success",
                f"Audit run {self.run_id[:8]}... COMPLETED SUCCESSFULLY",
                "done",
            )
            try: await create_audit_log(self.run_id, crypto_hash, self.override_value is not None)
            except Exception: logger.warning("DB: Failed to create audit log")
            try: await update_run_status(self.run_id, "completed", completed=True)
            except Exception: logger.warning("DB: Failed to update run status to completed")

            return {
                "run_id": self.run_id,
                "status": "completed",
                "crypto_hash": crypto_hash,
            }

        except Exception as e:
            await self._send_log("error", f"Audit failed: {str(e)}", "error")
            await self._send_command("halt", message=f"Error: {str(e)}")
            try: await update_run_status(self.run_id, "failed")
            except Exception: logger.warning("DB: Failed to update run status to failed")
            return {
                "run_id": self.run_id,
                "status": "failed",
                "error": str(e),
            }

    def approve(self, override_value: Optional[str] = None):
        """Called when human approves the halted audit"""
        self.override_value = override_value
        self.halt_event.set()
