"""
Sublet Goose — FastAPI Backend
Ontario Residential Tenancies Act (RTA) Lease Auditor
University of Waterloo Hackathon MVP
"""

import os
import json
import base64
import io

import anthropic
import pypdf

from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Literal

# ──────────────────────────────────────────────
# App Init
# ──────────────────────────────────────────────
app = FastAPI(
    title="Sublet Goose API",
    description="Ontario RTA Lease Auditor for UW Students",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

client = anthropic.Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))


# ──────────────────────────────────────────────
# Data Models
# ──────────────────────────────────────────────
class Finding(BaseModel):
    severity: Literal["illegal", "void", "warning", "ok"]
    clause_quote: str
    legal_ref: str
    plain_english: str
    negotiation_script: str


class AuditResult(BaseModel):
    safety_score: int
    findings: list[Finding]
    summary: str


# ──────────────────────────────────────────────
# RTA System Prompt
# ──────────────────────────────────────────────
RTA_SYSTEM_PROMPT = """
You are "Legal Goose," a sharp Ontario tenancy law expert trained specifically on the
Residential Tenancies Act (RTA), 2006, S.O. 2006, c. 17. You audit residential leases
for University of Waterloo students renting in the Kitchener-Waterloo region.

## YOUR MANDATE
Identify every clause that is illegal, void, or suspicious under Ontario law. Be
thorough, direct, and student-friendly. Never soften findings — if something is illegal,
say so clearly.

## CORE RTA RULES YOU MUST ENFORCE

### ILLEGAL CLAUSES (severity: "illegal")
1. **Damage / Security Deposits** — s. 105: A landlord may only collect a rent deposit
   (last month's rent) and a key deposit (refundable). ANY charge labeled "damage
   deposit," "security deposit," "cleaning deposit," or similar is ILLEGAL.
2. **Mandatory Post-Dated Cheques** — s. 108: A landlord CANNOT require post-dated
   cheques or any specific payment method as a condition of tenancy.
3. **Unlawful Entry** — s. 26–27: Landlord must give 24-hour written notice before
   entry (except emergencies). Any clause claiming unrestricted entry rights is ILLEGAL.
4. **Above-Guideline Rent Increases** — s. 120: Rent can only increase once per year,
   capped at the provincial guideline, unless an AGI is approved by the LTB.

### VOID CLAUSES (severity: "void") — unenforceable even if signed
5. **"No Pets" Provisions** — s. 14: No-pet clauses are VOID and unenforceable.
6. **Waiving Tenant Rights** — s. 3(1): Any clause where a tenant "waives" rights
   under the RTA is VOID.
7. **Restricting Reasonable Enjoyment** — s. 22: Banning guests, restricting
   common-area use, or charging for guests is VOID.
8. **Subletting Prohibition** — s. 97: Subletting cannot be prohibited outright;
   landlord may only require consent.

### WARNINGS (severity: "warning")
Short notice periods, vague maintenance responsibilities, move-in/move-out fee
schedules, co-signer liability clauses.

### GOOD (severity: "ok")
Standard, legal, and fair clauses.

## OUTPUT FORMAT
Respond ONLY with a valid JSON object. No markdown, no preamble.
{
  "safety_score": <integer 0-100>,
  "summary": "<one paragraph plain-English overall assessment>",
  "findings": [
    {
      "severity": "illegal" | "void" | "warning" | "ok",
      "clause_quote": "<exact or paraphrased text from the lease>",
      "legal_ref": "<e.g. RTA s. 105>",
      "plain_english": "<one sentence a first-year student would understand>",
      "negotiation_script": "<ready-to-send message to the landlord>"
    }
  ]
}

SAFETY SCORE: 90-100 clean, 70-89 minor issues, 50-69 multiple problems, 0-49 predatory.
""".strip()


# ──────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────
def extract_text_from_pdf(file_bytes: bytes) -> str:
    reader = pypdf.PdfReader(io.BytesIO(file_bytes))
    pages = [page.extract_text() or "" for page in reader.pages]
    text = "\n\n".join(pages).strip()
    if not text:
        raise ValueError(
            "PDF appears to be scanned (image-only). "
            "Please upload a photo or text-based PDF."
        )
    return text


def build_image_message(file_bytes: bytes, media_type: str) -> list[dict]:
    encoded = base64.standard_b64encode(file_bytes).decode("utf-8")
    return [
        {
            "type": "image",
            "source": {"type": "base64", "media_type": media_type, "data": encoded},
        },
        {
            "type": "text",
            "text": (
                "This is a photo of a residential lease agreement in Ontario, Canada. "
                "Please audit it fully according to your RTA mandate and return the JSON audit result."
            ),
        },
    ]


def run_audit(user_content) -> AuditResult:
    messages = [
        {
            "role": "user",
            "content": user_content
            if isinstance(user_content, list)
            else [{"type": "text", "text": user_content}],
        }
    ]
    response = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=4096,
        system=RTA_SYSTEM_PROMPT,
        messages=messages,
    )
    raw = response.content[0].text.strip()
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
    return AuditResult(**json.loads(raw.strip()))


# ──────────────────────────────────────────────
# Routes
# ──────────────────────────────────────────────
@app.get("/health")
def health():
    return {"status": "honk", "model": "claude-sonnet-4-20250514"}


@app.post("/analyze", response_model=AuditResult)
async def analyze_lease(file: UploadFile = File(...)):
    MAX_SIZE_MB = 10
    file_bytes = await file.read()

    if len(file_bytes) > MAX_SIZE_MB * 1024 * 1024:
        raise HTTPException(status_code=413, detail=f"File too large (max {MAX_SIZE_MB}MB).")

    content_type = file.content_type or ""

    try:
        if content_type == "application/pdf":
            text = extract_text_from_pdf(file_bytes)
            result = run_audit(
                f"Please audit the following Ontario residential lease:\n\n---\n{text}\n---"
            )
        elif content_type.startswith("image/"):
            allowed = {"image/jpeg", "image/png", "image/webp", "image/gif"}
            if content_type not in allowed:
                raise HTTPException(status_code=415, detail="Unsupported image format.")
            result = run_audit(build_image_message(file_bytes, content_type))
        else:
            raise HTTPException(status_code=415, detail="Unsupported file type. Upload a PDF or image.")
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="Audit engine returned malformed output. Please retry.")

    return JSONResponse(content=result.model_dump())


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
