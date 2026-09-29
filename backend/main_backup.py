import torch

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from transformers import (
    AutoTokenizer,
    AutoModelForSequenceClassification
)

from backend.database import SessionLocal
from backend.models import Report


# ==========================================================
# FASTAPI APP
# ==========================================================

app = FastAPI(
    title="SIF-Sanket API",
    description="AI-powered SIF precursor detection system",
    version="1.2.0"
)


# ==========================================================
# MODEL CONFIGURATION
# ==========================================================

MODEL_PATH = "./models/xlm_roberta_sif_v4_final"


# ==========================================================
# DEVICE
# ==========================================================

if torch.backends.mps.is_available():
    DEVICE = torch.device("mps")
else:
    DEVICE = torch.device("cpu")


# ==========================================================
# LOAD FINAL MODEL
# ==========================================================

print("=" * 60)
print("Loading SIF-Sanket Final Model")
print("=" * 60)

print(f"Model path : {MODEL_PATH}")
print(f"Device     : {DEVICE}")

# Load tokenizer from the SAME final model directory
tokenizer = AutoTokenizer.from_pretrained(
    MODEL_PATH
)

# Load trained XLM-R model
model = AutoModelForSequenceClassification.from_pretrained(
    MODEL_PATH
)

model.to(DEVICE)
model.eval()

print("Model loaded successfully.")
print("=" * 60)


# ==========================================================
# REQUEST SCHEMA
# ==========================================================

class AnalyzeRequest(BaseModel):
    report_text: str


# ==========================================================
# ROOT
# ==========================================================

@app.get("/")
def root():

    return {
        "message": "SIF-Sanket API is running",
        "version": "1.2.0",
        "model": "XLM-RoBERTa SIF V4 Final"
    }


# ==========================================================
# HEALTH CHECK
# ==========================================================

@app.get("/health")
def health():

    return {
        "status": "healthy",
        "model": "XLM-RoBERTa SIF V4 Final",
        "model_path": MODEL_PATH,
        "device": str(DEVICE)
    }


# ==========================================================
# ANALYZE SAFETY REPORT
# ==========================================================

@app.post("/analyze")
def analyze_report(request: AnalyzeRequest):

    # ------------------------------------------------------
    # Validate input
    # ------------------------------------------------------

    text = request.report_text.strip()

    if not text:

        raise HTTPException(
            status_code=400,
            detail="Report text cannot be empty"
        )

    # ------------------------------------------------------
    # Tokenization
    # ------------------------------------------------------

    try:

        inputs = tokenizer(
            text,
            return_tensors="pt",
            truncation=True,
            padding=True,
            max_length=256
        )

        # Move tensors to CPU/MPS
        inputs = {
            key: value.to(DEVICE)
            for key, value in inputs.items()
        }

    except Exception as error:

        raise HTTPException(
            status_code=500,
            detail=f"Tokenization error: {str(error)}"
        )

    # ------------------------------------------------------
    # Model inference
    # ------------------------------------------------------

    try:

        with torch.no_grad():

            outputs = model(**inputs)

    except Exception as error:

        raise HTTPException(
            status_code=500,
            detail=f"Model inference error: {str(error)}"
        )

    # ------------------------------------------------------
    # Probability calculation
    # ------------------------------------------------------

    probabilities = torch.softmax(
        outputs.logits,
        dim=1
    )[0]

    predicted_class = torch.argmax(
        probabilities
    ).item()

    confidence = probabilities[
        predicted_class
    ].item()

    # ------------------------------------------------------
    # Prediction mapping
    #
    # 0 = NO
    # 1 = YES
    # ------------------------------------------------------

    label_map = {
        0: "NO",
        1: "YES"
    }

    prediction = label_map.get(
        predicted_class,
        "UNKNOWN"
    )

    confidence = round(
        confidence,
        4
    )

    # ------------------------------------------------------
    # DATABASE SAVE
    # ------------------------------------------------------

    db = SessionLocal()

    try:

        report = Report(

            # Original report remains unchanged
            raw_text=text,

            # Language detection will be added later
            detected_language=None,

            # Currently original text
            normalized_text=text,

            # AI prediction
            sif_prediction=prediction,

            # Confidence between 0 and 1
            confidence=confidence,

            # These modules will be added in next phase
            life_saving_rule=None,
            precursor_activity=None,
            precursor_location=None,
            barrier_failure=None
        )

        db.add(report)

        db.commit()

        db.refresh(report)

        report_id = report.report_id

    except Exception as error:

        db.rollback()

        raise HTTPException(
            status_code=500,
            detail=f"Database error: {str(error)}"
        )

    finally:

        db.close()

    # ------------------------------------------------------
    # API RESPONSE
    # ------------------------------------------------------

    return {

        "report_id": report_id,

        "report_text": text,

        "sif_prediction": prediction,

        "confidence": confidence,

        "database_status": "saved"
    }


# ==========================================================
# GET ALL STORED REPORTS
# ==========================================================

@app.get("/reports")
def get_reports():

    db = SessionLocal()

    try:

        reports = (
            db.query(Report)
            .order_by(
                Report.created_at.desc()
            )
            .all()
        )

        return [

            {
                "report_id": report.report_id,

                "raw_text": report.raw_text,

                "detected_language":
                    report.detected_language,

                "normalized_text":
                    report.normalized_text,

                "sif_prediction":
                    report.sif_prediction,

                "confidence":
                    report.confidence,

                "life_saving_rule":
                    report.life_saving_rule,

                "precursor_activity":
                    report.precursor_activity,

                "precursor_location":
                    report.precursor_location,

                "barrier_failure":
                    report.barrier_failure,

                "created_at":
                    report.created_at
            }

            for report in reports
        ]

    except Exception as error:

        raise HTTPException(
            status_code=500,
            detail=f"Database error: {str(error)}"
        )

    finally:

        db.close()