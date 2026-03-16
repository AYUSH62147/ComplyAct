## DATABASE_SCHEMA.md
```markdown
# Database Schema (Supabase PostgreSQL)

Execute this SQL in the Supabase SQL Editor.

```sql
-- Runs Table: Tracks the overall execution
CREATE TABLE runs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    status VARCHAR(50) NOT NULL, -- 'started', 'halted', 'completed', 'failed'
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Traces Table: Tracks the AI reasoning steps for the Terminal UI
CREATE TABLE traces (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    run_id UUID REFERENCES runs(id),
    step_name VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    confidence_score FLOAT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Audit Logs Table: The final cryptographic receipt
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    run_id UUID REFERENCES runs(id),
    human_override_applied BOOLEAN DEFAULT FALSE,
    crypto_hash VARCHAR(256) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);