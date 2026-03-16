# ComplyAct: Bridging the Hallucination Gap in Enterprise APA 🛡️🤖

[![Next.js](https://img.shields.io/badge/Frontend-Next.js%2014-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688?style=for-the-badge&logo=fastapi)](https://fastapi.tiangolo.com/)
[![AWS](https://img.shields.io/badge/AI-Amazon%20Nova-FF9900?style=for-the-badge&logo=amazon-aws)](https://aws.amazon.com/bedrock/nova/)
[![Licence](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)](LICENSE)
[![Build](https://img.shields.io/badge/Build-Passing-brightgreen?style=for-the-badge)](https://github.com/)

> **ComplyAct** is a humble attempt at solving the "Invisible Barrier" of enterprise AI adoption: the lack of auditable governance in agentic systems. By combining **Amazon Nova's** multimodal reasoning with a deterministic **Human-in-the-Loop (HITL)** engine, we've built a translation layer that safely connects unstructured real-world data to rigid legacy ERP systems.

---

## 🏔️ The Core Problem
Enterprise automation is currently stuck between two worlds:
1. **Traditional RPA**: Rigid, breaks easily, and cannot understand human nuances (like handwritten dates).
2. **Modern AI Agents**: Powerful but unpredictable, prone to hallucinations, and often operating as a "black box."

**ComplyAct** provides a third way: **Governed Agentic Automation.**

## 🌟 Key Innovations

### ⚡ Hyper-Sync Orchestration
We developed a zero-latency WebSocket layer that synchronizes AI "thoughts" with UI "actions" at 2x speed. This ensures the agent never operates in the dark, and every movement is narrated in real-time to the auditor.

### 👻 Nova Act Simulation (Ghost Cursor)
Leveraging the reasoning patterns of **Amazon Nova Act**, our system uses coordinate-based navigation to drive legacy web interfaces. It doesn't just "click buttons"; it understands the spatial intent of the workflow.

### 🚥 Graceful Halt (Governance)
When the agent encounters low-confidence data (e.g., a messy handwritten field), it doesn't guess. It **halts.** It then surfaces a human-readable "Decision Modal" via Slack, ensuring that high-stakes transactions are always verified by a human expert.

### 📜 Cryptographic Accountability
Every successful process concludes with the generation of a SHA-256 hash, intended for immutable ledgers like **Amazon QLDB**. This transforms a "software action" into a "legal record."

---

## 🛠️ Architecture
- **Multimodal Intelligence**: Amazon Nova Pro for extraction.
- **Action Simulation**: Amazon Nova Act patterns for navigation.
- **Backend**: FastAPI (Python) for heavy-duty orchestration.
- **Frontend**: Next.js 14 with a CRT-inspired "Transparency Terminal."
- **Automation**: Playwright-driven deterministic executor.

---

## 🚀 Experience the Demo

We invite you to experience the future of auditable automation in one click.

### Setup
1. Clone the repository.
2. Ensure you have Node.js 20+ and Python 3.11+ installed.

### Launch
Run our automated orchestration script:
```powershell
.\run_demo.bat
```
*Wait for the terminals to initialize and visit [http://localhost:3000](http://localhost:3000).*

---

## 🔭 Future Roadmap
- [ ] **Voice-Native Governance**: Allow auditors to approve halts via Amazon Lex.
- [ ] **Multi-Agent Swarms**: Deploying specialized agents for different ERP modules (Finance, HR, Logistics).
- [ ] **Native QLDB Integration**: Moving from SHA-256 mocks to a full AWS Ledger Database.

---

## ❤️ Acknowledgments
Built with curiosity and respect for the challenges of enterprise automation. Special thanks to the **AWS Bedrock** team for the powerful Nova models that made this orchestration possible.

*"Software is only as strong as the trust we place in it."*