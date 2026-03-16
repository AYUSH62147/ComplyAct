# Demo Safety & Reliability Plan

ComplyAct is designed for rock-solid hackathon presentations. We implement several layers of safety to prevent technical failures during live demos.

## 🛡️ Presentation Safety Layers

### 1. Deterministic Mode (`DEMO_MODE=true`)
By default, the system runs in a deterministic mode. This ensures:
- **Zero Hallucination**: Coordinates and extraction results are verified.
- **Speed**: Optimized response times for a smooth walkthrough.
- **Offline Reliable**: No dependencies on external API latency or rate limits.

### 2. Hyper-Sync & Timing
- **2x Finish**: The system accelerates after human approval to keep the presentation momentum high.
- **Typing Sync**: The terminal typewriter effect is mathematically coupled to agent actions to avoid visual lag.

### 3. Graceful Recovery (`run_demo.bat`)
A specialized startup script handles:
- **Port Management**: Automatically clears ports 3000 and 8000.
- **Parallel Orchestration**: Launches Backend and Frontend in separate manageable windows.

### 4. UI Resilience
- **Independent Dismissal**: Modals can be closed without resetting the state, allowing you to show the final "Audit Trails" post-automation.
- **Connection Heartbeat**: The frontend indicator clearly shows "READY" or "OFFLINE" status.

## 🚧 Live Troubleshooting
- **Port Conflict**: Close the terminals and re-run `run_demo.bat`.
- **UI Lag**: Refresh the browser (the backend state is atomic).