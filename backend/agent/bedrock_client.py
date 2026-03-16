"""
AWS Bedrock Client for Nova Pro integration.
Implements document data extraction using Amazon Nova Pro via Bedrock Runtime.

DEMO_MODE: Returns deterministic mock data with simulated latency.
LIVE MODE: Calls AWS Bedrock Runtime invoke_model API.
"""

import os
import json
import asyncio
import base64
import logging
from pathlib import Path
from typing import Any

import boto3
from botocore.exceptions import ClientError

logger = logging.getLogger(__name__)

DEMO_MODE = os.getenv("DEMO_MODE", "true") == "true"
MOCKS_DIR = Path(__file__).parent.parent / "mocks"
AWS_REGION = os.getenv("AWS_REGION", "us-east-1")
MODEL_ID = "amazon.nova-pro-v1:0"


def _get_bedrock_client():
    """Create a Bedrock Runtime client using environment credentials."""
    return boto3.client(
        "bedrock-runtime",
        region_name=AWS_REGION,
        aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
        aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
    )


async def extract_document_data(file_bytes: bytes, filename: str = "document.pdf") -> dict[str, Any]:
    """
    Extract structured data from a document using AWS Nova Pro.
    
    In DEMO_MODE: Returns mock data from nova_pro_response.json with simulated latency.
    In LIVE MODE: Sends the document to Nova Pro via Bedrock Runtime for multimodal extraction.
    
    Args:
        file_bytes: Raw bytes of the uploaded document (PDF or image).
        filename: Original filename for content type detection.
    
    Returns:
        dict with extracted_fields, confidence_scores, risk_flags, summary.
    """
    if DEMO_MODE:
        logger.info("[DEMO_MODE] Returning mock extraction data")
        await asyncio.sleep(1.5)  # Simulate LLM processing time
        mock_path = MOCKS_DIR / "nova_pro_response.json"
        with open(mock_path, "r") as f:
            return json.load(f)

    # ─── LIVE MODE: Real AWS Bedrock Call ────────────────────
    logger.info(f"[LIVE] Calling Nova Pro ({MODEL_ID}) for document extraction")

    try:
        client = _get_bedrock_client()

        # Determine content type
        ext = filename.lower().rsplit(".", 1)[-1] if "." in filename else "pdf"
        content_type_map = {
            "pdf": "application/pdf",
            "png": "image/png",
            "jpg": "image/jpeg",
            "jpeg": "image/jpeg",
        }
        content_type = content_type_map.get(ext, "application/pdf")

        # Encode document as base64
        doc_base64 = base64.b64encode(file_bytes).decode("utf-8")

        # Build the Nova Pro prompt for structured extraction
        extraction_prompt = """You are an expert document analyzer for enterprise audit compliance. 
Analyze the provided document and extract the following fields with confidence scores.

Extract these fields:
1. vendor_name - The vendor or company name
2. date - Any dates found (especially invoice/audit dates)
3. amount - Monetary amounts
4. invoice_number - Invoice or reference numbers
5. payment_terms - Payment terms (Net 30, Net 60, etc.)
6. vendor_address - Vendor's physical address

For EACH field, provide:
- "value": the extracted text
- "confidence": a float between 0.0 and 1.0 indicating extraction confidence
- "source": either "printed_text" or "handwritten"

Also provide:
- "risk_flags": array of objects with {field, risk_level, reason} for any field with confidence < 0.80
- "summary": a one-sentence summary of the document

Respond ONLY with valid JSON in this exact format:
{
  "extracted_fields": {
    "vendor_name": {"value": "...", "confidence": 0.0, "source": "..."},
    "date": {"value": "...", "confidence": 0.0, "source": "..."},
    "amount": {"value": 0.0, "confidence": 0.0, "source": "..."},
    "invoice_number": {"value": "...", "confidence": 0.0, "source": "..."},
    "payment_terms": {"value": "...", "confidence": 0.0, "source": "..."},
    "vendor_address": {"value": "...", "confidence": 0.0, "source": "..."}
  },
  "risk_flags": [],
  "summary": "..."
}"""

        # Build the request body for Nova Pro
        # Nova Pro supports multimodal input via the Messages API
        request_body = {
            "messages": [
                {
                    "role": "user",
                    "content": [
                        {
                            "document": {
                                "format": ext if ext in ["pdf", "png", "jpg", "jpeg"] else "pdf",
                                "name": filename,
                                "source": {
                                    "bytes": doc_base64
                                }
                            }
                        },
                        {
                            "text": extraction_prompt
                        }
                    ]
                }
            ],
            "inferenceConfig": {
                "maxTokens": 2048,
                "temperature": 0.1,
                "topP": 0.9
            }
        }

        # Call Bedrock Runtime
        response = await asyncio.to_thread(
            client.invoke_model,
            modelId=MODEL_ID,
            contentType="application/json",
            accept="application/json",
            body=json.dumps(request_body),
        )

        # Parse response
        response_body = json.loads(response["body"].read())

        # Extract the text content from Nova's response
        output_text = ""
        if "output" in response_body and "message" in response_body["output"]:
            for content_block in response_body["output"]["message"]["content"]:
                if "text" in content_block:
                    output_text = content_block["text"]
                    break

        # Parse the JSON from Nova's response
        # Try to find JSON in the response (Nova might wrap it in markdown)
        json_start = output_text.find("{")
        json_end = output_text.rfind("}") + 1
        if json_start >= 0 and json_end > json_start:
            extracted = json.loads(output_text[json_start:json_end])
        else:
            raise ValueError("Nova Pro did not return valid JSON")

        # Add metadata
        extracted["model"] = MODEL_ID
        extracted["request_id"] = response.get("ResponseMetadata", {}).get("RequestId", "unknown")

        logger.info(f"[LIVE] Nova Pro extraction complete: {len(extracted.get('extracted_fields', {}))} fields")
        return extracted

    except ClientError as e:
        logger.error(f"[LIVE] AWS Bedrock error: {e}")
        raise
    except json.JSONDecodeError as e:
        logger.error(f"[LIVE] Failed to parse Nova Pro response: {e}")
        raise
    except Exception as e:
        logger.error(f"[LIVE] Unexpected error: {e}")
        raise


async def analyze_confidence(extracted_data: dict) -> dict[str, Any]:
    """
    Analyze confidence scores and determine if human override is needed.
    Works the same for both DEMO_MODE and LIVE mode.
    """
    fields = extracted_data.get("extracted_fields", {})
    threshold = 0.80

    confidence_scores = {}
    for field_name, field_data in fields.items():
        if isinstance(field_data, dict) and "confidence" in field_data:
            confidence_scores[field_name] = field_data["confidence"]

    requires_human = any(score < threshold for score in confidence_scores.values())

    low_confidence_fields = {
        field: score
        for field, score in confidence_scores.items()
        if score < threshold
    }

    return {
        "requires_human": requires_human,
        "low_confidence_fields": low_confidence_fields,
        "threshold": threshold,
        "confidence_scores": confidence_scores,
    }
