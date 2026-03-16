# API Specification (FastAPI)

## 1. `POST /api/audit/start`
**Description:** Initiates the audit process.
**Request:** `multipart/form-data` (PDF file)
**Response:**
```json
{
  "run_id": "uuid",
  "status": "processing",
  "extracted_data": {
    "vendor_name": "Acme Corp",
    "date": "10/12/2023",
    "amount": 4500
  },
  "confidence_scores": {
    "vendor_name": 0.98,
    "date": 0.42, // Triggers the halt
    "amount": 0.95
  },
  "requires_human": true,
  "halt_reason": "Ambiguous handwritten date detected."
}