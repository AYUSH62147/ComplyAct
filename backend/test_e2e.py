"""
End-to-end test for ComplyAct DEMO_MODE=true flow.
Run with: cd backend && venv\\Scripts\\python test_e2e.py
"""

import asyncio
import httpx
import sys
import io

# Force UTF-8 output
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

API_URL = "http://localhost:8000"


async def test_full_flow():
    async with httpx.AsyncClient(timeout=30.0) as client:
        print("=" * 60)
        print("ComplyAct E2E Test -- DEMO_MODE=true")
        print("=" * 60)

        # 1. Health Check
        print("\n[1/7] Health Check...")
        resp = await client.get(f"{API_URL}/health")
        health = resp.json()
        assert health["status"] == "healthy", f"Health check failed: {health}"
        assert health["demo_mode"] is True, "DEMO_MODE should be true"
        print(f"  [OK] Status: {health['status']}, DEMO_MODE: {health['demo_mode']}")

        # 2. Start Audit
        print("\n[2/7] Starting Audit...")
        files = {"file": ("Vendor_Audit_Q3.pdf", b"test content", "application/pdf")}
        resp = await client.post(f"{API_URL}/api/audit/start", files=files)
        assert resp.status_code == 200, f"Start failed: {resp.status_code} {resp.text}"
        start_data = resp.json()
        run_id = start_data["run_id"]
        print(f"  [OK] Run ID: {run_id}")
        print(f"  [OK] Status: {start_data['status']}")
        print(f"  [OK] Requires Human: {start_data['requires_human']}")
        print(f"  [OK] Halt Reason: {start_data.get('halt_reason', 'N/A')}")

        # 3. Wait for halt
        print("\n[3/7] Waiting for Ghost Cursor to reach halt point...")
        for i in range(15):
            await asyncio.sleep(1)
            resp = await client.get(f"{API_URL}/api/audit/{run_id}/status")
            status = resp.json().get("status", "unknown")
            print(f"  ... {i+1}s -- Status: {status}")
            if status == "halted":
                break

        resp = await client.get(f"{API_URL}/api/audit/{run_id}/status")
        status_data = resp.json()
        print(f"  [OK] Final status before approval: {status_data.get('status', 'unknown')}")

        # 4. Approve (with override)
        print("\n[4/7] Sending Human Approval (override: 12/10/2023)...")
        resp = await client.post(
            f"{API_URL}/api/audit/approve",
            json={
                "run_id": run_id,
                "approved": True,
                "override_value": "12/10/2023",
            },
        )
        assert resp.status_code == 200, f"Approve failed: {resp.status_code} {resp.text}"
        approve_data = resp.json()
        print(f"  [OK] Status: {approve_data['status']}")
        print(f"  [OK] Message: {approve_data['message']}")

        # 5. Wait for completion
        print("\n[5/7] Waiting for completion...")
        for i in range(15):
            await asyncio.sleep(1)
            resp = await client.get(f"{API_URL}/api/audit/{run_id}/status")
            status = resp.json().get("status", "unknown")
            print(f"  ... {i+1}s -- Status: {status}")
            if status in ("completed", "failed"):
                break

        resp = await client.get(f"{API_URL}/api/audit/{run_id}/status")
        final_status = resp.json()
        print(f"  [OK] Final status: {final_status.get('status', 'unknown')}")

        # 6. Check for crypto hash
        print("\n[6/7] Checking Crypto Hash...")
        crypto_hash = final_status.get("crypto_hash", "N/A")
        print(f"  [OK] SHA-256 Hash: {crypto_hash}")

        # 7. Get full audit trail
        print("\n[7/7] Fetching Audit Trail...")
        resp = await client.get(f"{API_URL}/api/audit/{run_id}/trail")
        trail = resp.json()
        run_data = trail.get("run", {})
        traces = trail.get("traces", [])
        audit_log = trail.get("audit_log")
        print(f"  [OK] Run: {run_data.get('status', 'N/A')}")
        print(f"  [OK] Traces: {len(traces)} steps recorded")
        if audit_log:
            print(f"  [OK] Audit Log Hash: {audit_log.get('crypto_hash', 'N/A')[:32]}...")
            print(f"  [OK] Human Override: {audit_log.get('human_override_applied', False)}")
        else:
            print("  [WARN] No audit log found (may be in-memory only)")

        # Summary
        print("\n" + "=" * 60)
        is_success = final_status.get("status") == "completed"
        if is_success:
            print("[PASS] E2E TEST PASSED -- Full audit flow completed successfully!")
        else:
            print(f"[FAIL] E2E TEST FAILED -- Final status: {final_status.get('status', 'unknown')}")
        print("=" * 60)

        return is_success


if __name__ == "__main__":
    success = asyncio.run(test_full_flow())
    exit(0 if success else 1)
