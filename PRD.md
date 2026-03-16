## PRD.md
```markdown
# Product Requirements Document & Demo Script

## Core Vision
To become the universal, auditable translation layer between unstructured real-world data and legacy enterprise systems, using AWS Nova and cryptographic governance.

## The 90-Second Demo Script (Target Flow)
- **00s-10s (Setup):** Presenter uploads `Vendor_Audit_Q3.pdf`.
- **10s-20s (Extraction):** Terminal shows Nova Pro extracting data.
- **20s-30s (The Halt):** Playwright begins filling the Mock ERP. Suddenly, it stops. Terminal flashes red: `Confidence 42% - Handwritten note detected. Halting for Human Override.`
- **30s-50s (HITL):** Slack modal appears. Presenter clicks "Approve: Use Handwritten Date".
- **50s-70s (Execution):** Playwright resumes at 2x speed, finishing the form.
- **70s-90s (Audit):** A cryptographic receipt (QLDB hash) is displayed on screen.

## Minimum Viable Features (Must-Haves)
1. **Split-Screen UI:** Mock ERP (Left) + Terminal (Right).
2. **Playwright Executor:** Python script that can deterministically fill the Mock ERP.
3. **Graceful Halt Logic:** Hardcoded threshold that pauses execution at a specific field.
4. **Slack Approval Modal:** UI overlay to resume execution.
5. **DEMO_MODE Toggle:** Global switch to bypass real AWS calls.