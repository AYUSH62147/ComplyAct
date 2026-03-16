## ARCHITECTURE.md
```markdown
# System Architecture

## Overview
ComplyAct uses a decoupled architecture to ensure demo safety. The Next.js frontend hosts a Split-Screen UI (Mock ERP on the left, ComplyAct Terminal on the right). The FastAPI backend orchestrates the AI logic and drives the Mock ERP using Playwright.

## Folder Structure
```text
/complyact
  /.clauderules           # AI Agent instructions
  /frontend               # Next.js App Router
    /src/components
      /MockERP            # The simulated legacy system
      /Terminal           # The AI reasoning logs & confidence gauge
      /SlackModal         # The HITL approval overlay
  /backend                # FastAPI
    main.py               # API Router
    /agent
      bedrock_client.py   # AWS Nova Pro/Act integration
      playwright_driver.py# Drives the MockERP via headless browser
    /mocks                # Deterministic JSON responses for DEMO_MODE
  /database               # Supabase SQL schemas



  Data Flow (The Happy Path)
Trigger: User clicks "Start Audit" (or uses Voice trigger).
Ingest: Backend receives PDF, calls AWS Nova Pro (or mock).
Evaluate: Backend checks confidence scores. If < 0.80, trigger Graceful Halt.
HITL: Frontend displays Slack Modal. User clicks "Approve".
Execute: Backend triggers Playwright to fill out the Mock ERP.
Audit: Backend generates SHA-256 hash of the transaction and saves to DB/QLDB