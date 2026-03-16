# System Architecture

ComplyAct uses a decoupled, event-driven architecture to bridge legacy interfaces with multimodal AI capabilities.

## 🏗️ high-Level Architecture
1. **Frontend (Next.js)**: A reactive Split-Screen UI.
   - **MockERP**: A coordinate-based grid for simulated automation.
   - **Terminal**: A WebSocket-driven CRT console for AI transparency.
2. **Backend (FastAPI)**: The central orchestrator.
   - **AuditOrchestrator**: Manages the lifecycle of an audit (Ingest -> Extract -> Verify -> Execute).
   - **Playwright Driver**: Translates agent actions into deterministic UI commands.
3. **Data Layer**:
   - **Supabase**: Persistent storage for audit records and human overrides.
   - **Ledger (QLDB Mock)**: Generates immutable cryptographic hashes for audit finality.

## 📂 Folder Structure
```text
/backend/agent/             # Core Orchestration Logic
  - playwright_driver.py    # Form filling & Coordinate logic
  - bedrock_client.py        # Nova Pro/Act Interface
/frontend/src/             
  - hooks/useWebSocket.ts   # Real-time state synchronization
  - components/Terminal/    # CRT-style console logic
  - components/MockERP/     # Legacy system simulation
```

## 🔄 Interaction Flow (Hyper-Sync)
1. **Multimodal Ingest**: Nova Pro extracts context from PDFs.
2. **Reasoning Loop**: Agent generates "Thought" and "Action" messages via WebSockets.
3. **HITL Interruption**: Governance engine halts at low-confidence fields (<80%).
4. **Resumption**: Human override triggers the **Hyper-Sync Engine** (2x speed execution).
5. **Finalization**: Cryptographic receipt generated and verified.