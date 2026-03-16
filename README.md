# ComplyAct: Auditable Agentic Process Automation

ComplyAct is an enterprise-grade Agentic Process Automation (APA) platform that bridges unstructured data and legacy systems. Powered by the AWS Nova stack, it uses Nova Pro for multimodal data extraction and Nova Act for dynamic UI navigation. To solve the enterprise barrier of AI hallucination, ComplyAct features a Human-in-the-Loop (HITL) governance engine ("Graceful Halt").

## Quick Start

### Prerequisites
- Node.js 20+
- Python 3.11+
- Supabase CLI (optional, for local DB)

### Environment Variables
Create a `.env` file in the root:
```env
# System
DEMO_MODE=true # Set to false to use real AWS APIs

# AWS Bedrock & QLDB
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=us-east-1

# Database
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key