"""
Google Gemini Client for Multimodal Extraction.
Implements document data extraction using Gemini 1.5 Pro.

DEMO_MODE: Returns deterministic mock data with simulated latency.
LIVE MODE: Calls Google Generative AI API.
"""

import os
import json
import asyncio
import logging
from pathlib import Path
from typing import Any

import google.generativeai as genai

logger = logging.getLogger(__name__)

DEMO_MODE = os.getenv("DEMO_MODE", "true") == "true"
MOCKS_DIR = Path(__file__).parent.parent / "mocks"
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")

# Initialize Gemini
if GOOGLE_API_KEY:
    genai.configure(api_key=GOOGLE_API_KEY)

MODEL_NAME = "gemini-1.5-pro"


async def extract_document_data(file_bytes: bytes, filename: str = "document.pdf") -> dict[str, Any]:
    """
    Extract structured data from a document using Google Gemini.
    
    Args:
        file_bytes: Raw bytes of the uploaded document (PDF or image).
        filename: Original filename for content type detection.
    
    Returns:
        dict with extracted_fields, confidence_scores, risk_flags, summary.
    """
    if DEMO_MODE:
        logger.info("[DEMO_MODE] Returning mock extraction data (Gemini)")
        await asyncio.sleep(1.2)  # Simulate LLM processing time (Gemini is fast)
        mock_path = MOCKS_DIR / "nova_pro_response.json"
        with open(mock_path, "r") as f:
            return json.load(f)

    if not GOOGLE_API_KEY:
        logger.error("GOOGLE_API_KEY missing. Cannot call Gemini API.")
        raise ValueError("GOOGLE_API_KEY not found in environment")

    logger.info(f"[LIVE] Calling Gemini ({MODEL_NAME}) for document extraction")

    try:
        # Determine mime type
        ext = filename.lower().rsplit(".", 1)[-1] if "." in filename else "pdf"
        mime_type_map = {
            "pdf": "application/pdf",
            "png": "image/png",
            "jpg": "image/jpeg",
            "jpeg": "image/jpeg",
        }
        mime_type = mime_type_map.get(ext, "application/pdf")

        # Initialize the model
        model = genai.GenerativeModel(MODEL_NAME)

        # Build the Gemini prompt
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

        # Prepare multimodal content
        # For Gemini SDK, we can pass bytes and mime_type
        content = [
            {"mime_type": mime_type, "data": file_bytes},
            extraction_prompt
        ]

        # Call Gemini
        response = await asyncio.to_thread(
            model.generate_content,
            content
        )

        # Parse output
        output_text = response.text
        
        # Clean markdown if present
        if output_text.startswith("```json"):
            output_text = output_text[7:]
        if output_text.endswith("```"):
            output_text = output_text[:-3]
        
        extracted = json.loads(output_text.strip())
        
        # Add metadata
        extracted["model"] = MODEL_NAME
        
        logger.info(f"[LIVE] Gemini extraction complete: {len(extracted.get('extracted_fields', {}))} fields")
        return extracted

    except Exception as e:
        logger.error(f"[LIVE] Gemini API error: {e}")
        raise


async def analyze_confidence(extracted_data: dict) -> dict[str, Any]:
    """
    Analyze confidence scores (same logic as Bedrock for consistency).
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
