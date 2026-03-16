# AI Agent Execution Roadmap

**Instructions for RooCode:** Update this file by changing `[ ]` to `[x]` as you complete tasks. Do not skip phases.

## Phase 1: Foundation & Mocks (Hours 0-4)
- [x] Initialize Next.js frontend with Tailwind and shadcn/ui.
- [x] Initialize FastAPI backend with Playwright.
- [x] Create `backend/mocks/nova_pro_response.json` with the target extraction data.
- [x] Build the Mock ERP UI component (Left screen) with hardcoded HTML form inputs.
- [x] Build the Terminal UI component (Right screen) to display scrolling logs.

## Phase 2: The Deterministic Core (Hours 4-10)
- [x] Write the FastAPI `/api/audit/start` endpoint (returning mock data).
- [x] Write the Playwright Python script to fill out the Mock ERP form.
- [x] Connect the frontend "Start" button to the backend endpoint.
- [x] Implement the "Graceful Halt" logic: Playwright stops halfway through the form.

## Phase 3: Human-in-the-Loop (Hours 10-16)
- [x] Build the Slack Approval Modal UI in Next.js.
- [x] Write the FastAPI `/api/audit/approve` endpoint.
- [x] Wire the frontend modal to the approve endpoint, causing Playwright to resume and finish the form.
- [x] Add the cryptographic hash generation (SHA-256) upon completion.

## Phase 4: AWS Integration & Polish (Hours 16-24)
- [x] Implement real AWS Boto3 Bedrock calls in `bedrock_client.py` (wrapped in `DEMO_MODE` checks).
- [x] Setup Supabase database and connect backend logging.
- [x] Add UI polish: Typewriter effects for terminal logs, smooth progress bars for the confidence gauge.
- [x] Final end-to-end test with `DEMO_MODE=true` and `DEMO_MODE=false`.