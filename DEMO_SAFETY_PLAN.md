## DEMO_SAFETY_PLAN.md
```markdown
# Demo Safety & Reliability Protocols

Hackathon Wi-Fi will fail. AWS APIs might rate-limit. This project is engineered to survive.

## 1. The `DEMO_MODE` Environment Variable
- If `DEMO_MODE=true`, the backend **must not** make any external HTTP requests to AWS.
- It must read from `backend/mocks/*.json`.
- It must use `time.sleep()` to simulate realistic LLM generation times (1.5s - 3.0s).

## 2. Playwright Determinism
- Do not use Nova Act to dynamically guess DOM selectors during the live demo.
- The Mock ERP UI (Next.js) must have hardcoded `id` attributes (e.g., `<input id="vendor-name" />`).
- The Playwright script must target these exact IDs.
- **Visual Trick:** The Terminal UI will *display* fake Nova Act reasoning logs (`"Thought: Found input #vendor-name. Action: Click."`) while the deterministic Playwright script executes.

## 3. The Video Fallback
- Once the project is working, record a flawless 90-second screen capture.
- Keep this MP4 on the desktop. If the localhost environment crashes, switch to VLC player and narrate the video.