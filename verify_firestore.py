import os
import asyncio
from google.cloud import firestore

async def verify_audit():
    project_id = os.getenv("GOOGLE_CLOUD_PROJECT", "your-project-id")
    run_id = "b1b29507-ab05-4f95-8609-63a3bbd64120"
    
    db = firestore.AsyncClient(project=project_id)
    doc_ref = db.collection("audit_ledger").document(run_id)
    doc = await doc_ref.get()
    
    if doc.exists:
        data = doc.to_dict()
        print(f"SUCCESS: Audit record found in Firestore.")
        print(f"Fields: {data.get('fields', {}).keys()}")
        if "vendor_address" in data.get('fields', {}):
            print("SUCCESS: Vendor Address field is present.")
        else:
            print("FAILURE: Vendor Address field is missing from Firestore.")
    else:
        print(f"FAILURE: Audit record not found for {run_id}.")

if __name__ == "__main__":
    asyncio.run(verify_audit())
