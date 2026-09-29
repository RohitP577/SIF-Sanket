import os
import tempfile
import torch

from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from transformers import AutoTokenizer, AutoModelForSequenceClassification

from backend.database import SessionLocal
from backend.models import Report
from backend.document_processor import (
    extract_text_from_pdf,
    process_document_text
)


# ============================================================
# FASTAPI APPLICATION
# ============================================================

app = FastAPI(
    title="SIF-Sanket API",
    description="AI-powered SIF precursor detection system",
    version="1.4.0"
)


# ============================================================
# CORS
# ============================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "https://sif-sanket.netlify.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# MODEL CONFIGURATION
# ============================================================

MODEL_PATH = os.getenv(
    "MODEL_PATH",
    "./models/xlm_roberta_sif_v4_final"
)

LABEL_MAP = {
    0: "NO",
    1: "YES"
}


# ============================================================
# DEVICE
# ============================================================

if torch.cuda.is_available():
    DEVICE = torch.device("cuda")
elif hasattr(torch, "mps") and torch.backends.mps.is_available():
    DEVICE = torch.device("mps")
else:
    DEVICE = torch.device("cpu")


# ============================================================
# LOAD TOKENIZER + MODEL
# ============================================================

print("=" * 60)
print("LOADING SIF-SANKET AI MODEL")
print("=" * 60)

print(f"Model path : {MODEL_PATH}")
print(f"Device     : {DEVICE}")

try:

    tokenizer = AutoTokenizer.from_pretrained(
        MODEL_PATH
    )

    model = AutoModelForSequenceClassification.from_pretrained(
        MODEL_PATH
    )

    model.to(DEVICE)
    model.eval()

    print("Model loaded successfully.")

except Exception as error:

    print("MODEL LOADING ERROR:")
    print(error)

    raise


# ============================================================
# REQUEST SCHEMA
# ============================================================

class AnalyzeRequest(BaseModel):

    report_text: str


# ============================================================
# LIFE-SAVING RULE DETECTION
# ============================================================

def detect_life_saving_rule(text: str):

    text_lower = text.lower()

    rules = [

        (
            [
                "confined space",
                "confined-space",
                "entry permit",
                "gas testing",
                "gas test",
                "atmospheric testing"
            ],
            "Confined Space"
        ),

        (
            [
                "isolation",
                "isolated",
                "zero energy",
                "energized equipment",
                "energy isolation",
                "electrical isolation"
            ],
            "Energy Isolation"
        ),

        (
            [
                "hot work",
                "welding",
                "cutting",
                "gas test"
            ],
            "Hot Work"
        ),

        (
            [
                "crane",
                "lifting",
                "suspended load",
                "lifting area"
            ],
            "Lifting Operations"
        ),

        (
            [
                "working at height",
                "fall protection",
                "fall arrest",
                "anchorage",
                "height"
            ],
            "Working at Height"
        ),

        (
            [
                "vehicle",
                "driving",
                "pedestrian",
                "road",
                "traffic"
            ],
            "Driving"
        ),

        (
            [
                "excavation",
                "excavated",
                "trench"
            ],
            "Excavation"
        ),

        (
            [
                "line of fire",
                "suspended load",
                "separation distance",
                "exclusion zone"
            ],
            "Line of Fire"
        ),

        (
            [
                "permit",
                "authorization",
                "authorized"
            ],
            "Bypassing Safety Controls"
        ),
    ]

    for keywords, rule in rules:

        for keyword in keywords:

            if keyword in text_lower:

                return rule

    return None


# ============================================================
# ACTIVITY DETECTION
# ============================================================

def detect_activity(text: str):

    text_lower = text.lower()

    activities = [

        (
            [
                "confined space",
                "confined-space"
            ],
            "Confined-space entry"
        ),

        (
            [
                "crane",
                "lifting",
                "suspended load"
            ],
            "Lifting operation"
        ),

        (
            [
                "hot work",
                "welding",
                "cutting"
            ],
            "Hot work"
        ),

        (
            [
                "maintenance",
                "valve maintenance",
                "pipeline maintenance"
            ],
            "Maintenance"
        ),

        (
            [
                "excavation",
                "trench"
            ],
            "Excavation"
        ),

        (
            [
                "working at height",
                "fall protection",
                "fall arrest"
            ],
            "Working at height"
        ),

        (
            [
                "vehicle",
                "driving"
            ],
            "Vehicle operation"
        ),
    ]

    for keywords, activity in activities:

        for keyword in keywords:

            if keyword in text_lower:

                return activity

    return None


# ============================================================
# LOCATION DETECTION
# ============================================================

def detect_location(text: str):

    text_lower = text.lower()

    locations = [

        (
            [
                "gas processing unit",
                "gpu"
            ],
            "Gas Processing Unit"
        ),

        (
            [
                "tank farm"
            ],
            "Tank Farm"
        ),

        (
            [
                "compressor station"
            ],
            "Compressor Station"
        ),

        (
            [
                "refinery"
            ],
            "Refinery Area"
        ),

        (
            [
                "production area"
            ],
            "Production Area"
        ),

        (
            [
                "pipeline"
            ],
            "Pipeline Area"
        ),

        (
            [
                "workshop"
            ],
            "Workshop"
        ),

        (
            [
                "construction site"
            ],
            "Construction Site"
        ),
    ]

    for keywords, location in locations:

        for keyword in keywords:

            if keyword in text_lower:

                return location

    return None


# ============================================================
# BARRIER FAILURE DETECTION
# ============================================================

def detect_barrier_failure(text: str):

    text_lower = text.lower()

    failures = [

        (
            [
                "without gas testing",
                "gas test was not",
                "gas testing was not",
                "gas test not completed",
                "before the gas test",
                "gas test pending"
            ],
            "Required gas testing not completed"
        ),

        (
            [
                "without a valid entry permit",
                "without entry permit",
                "without permit",
                "permit was not",
                "permit not confirmed"
            ],
            "Required permit/authorization not confirmed"
        ),

        (
            [
                "isolation was not confirmed",
                "isolation not confirmed",
                "before electrical isolation",
                "without confirming",
                "energized equipment"
            ],
            "Energy isolation not verified"
        ),

        (
            [
                "near pedestrians",
                "pedestrians without",
                "separation distance"
            ],
            "Required separation from people not maintained"
        ),

        (
            [
                "before the required inspection",
                "inspection had not been completed",
                "not inspected"
            ],
            "Required inspection not completed"
        ),

        (
            [
                "without fall protection",
                "fall protection was not",
                "without fall arrest"
            ],
            "Fall protection barrier not established"
        ),

        (
            [
                "suspended-load zone",
                "suspended load zone"
            ],
            "Personnel exposed to suspended-load zone"
        ),

        (
            [
                "authorization was not",
                "before authorization",
                "without authorization"
            ],
            "Required work authorization not confirmed"
        ),
    ]

    for keywords, failure in failures:

        for keyword in keywords:

            if keyword in text_lower:

                return failure

    return None


# ============================================================
# AI ANALYSIS FUNCTION
# ============================================================

def run_ai_analysis(text: str):

    text = text.strip()

    if not text:

        raise HTTPException(
            status_code=400,
            detail="Report text cannot be empty"
        )

    # --------------------------------------------------------
    # TOKENIZATION
    # --------------------------------------------------------

    inputs = tokenizer(
        text,
        return_tensors="pt",
        truncation=True,
        max_length=256
    )

    inputs = {
        key: value.to(DEVICE)
        for key, value in inputs.items()
    }

    # --------------------------------------------------------
    # MODEL INFERENCE
    # --------------------------------------------------------

    try:

        with torch.inference_mode():

            outputs = model(**inputs)

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

    except Exception as error:

        raise HTTPException(
            status_code=500,
            detail=f"AI inference error: {str(error)}"
        )

    prediction = LABEL_MAP[predicted_class]

    confidence = round(
        confidence,
        4
    )

    # --------------------------------------------------------
    # PRECURSOR EXTRACTION
    # --------------------------------------------------------

    life_saving_rule = detect_life_saving_rule(
        text
    )

    precursor_activity = detect_activity(
        text
    )

    precursor_location = detect_location(
        text
    )

    barrier_failure = detect_barrier_failure(
        text
    )

    return {
        "sif_prediction": prediction,
        "confidence": confidence,
        "life_saving_rule": life_saving_rule,
        "precursor_activity": precursor_activity,
        "precursor_location": precursor_location,
        "barrier_failure": barrier_failure
    }


# ============================================================
# SAVE REPORT TO DATABASE
# ============================================================

def save_report_to_database(
    raw_text: str,
    detected_language,
    normalized_text: str,
    analysis_result: dict
):

    db = SessionLocal()

    try:

        report = Report(

            raw_text=raw_text,

            detected_language=detected_language,

            normalized_text=normalized_text,

            sif_prediction=analysis_result[
                "sif_prediction"
            ],

            confidence=analysis_result[
                "confidence"
            ],

            life_saving_rule=analysis_result[
                "life_saving_rule"
            ],

            precursor_activity=analysis_result[
                "precursor_activity"
            ],

            precursor_location=analysis_result[
                "precursor_location"
            ],

            barrier_failure=analysis_result[
                "barrier_failure"
            ]
        )

        db.add(report)

        db.commit()

        db.refresh(report)

        return report.report_id

    except Exception as error:

        db.rollback()

        raise HTTPException(
            status_code=500,
            detail=f"Database error: {str(error)}"
        )

    finally:

        db.close()


# ============================================================
# HEALTH
# ============================================================

@app.get("/")
def root():

    return {

        "message": "SIF-Sanket API is running",

        "version": "1.4.0",

        "model": "XLM-RoBERTa SIF V4 Final",

        "database": "PostgreSQL",

        "document_processing": "PDF + multilingual translation",

        "status": "online"
    }


@app.get("/health")
def health():

    return {

        "status": "healthy",

        "model": "XLM-RoBERTa SIF V4 Final",

        "device": str(DEVICE),

        "database": "PostgreSQL",

        "document_processing": "enabled"
    }


# ============================================================
# ANALYZE NORMAL TEXT REPORT
# ============================================================

@app.post("/analyze")
def analyze_report(request: AnalyzeRequest):

    text = request.report_text.strip()

    analysis_result = run_ai_analysis(
        text
    )

    report_id = save_report_to_database(

        raw_text=text,

        detected_language=None,

        normalized_text=text,

        analysis_result=analysis_result
    )

    return {

        "report_id": report_id,

        "report_text": text,

        "sif_prediction":
            analysis_result["sif_prediction"],

        "confidence":
            analysis_result["confidence"],

        "life_saving_rule":
            analysis_result["life_saving_rule"],

        "precursor_activity":
            analysis_result["precursor_activity"],

        "precursor_location":
            analysis_result["precursor_location"],

        "barrier_failure":
            analysis_result["barrier_failure"],

        "database_status": "saved"
    }


# ============================================================
# ANALYZE PDF REPORT
# ============================================================

@app.post("/analyze-pdf")
async def analyze_pdf(
    file: UploadFile = File(...)
):

    # --------------------------------------------------------
    # CHECK FILE
    # --------------------------------------------------------

    if not file.filename:

        raise HTTPException(
            status_code=400,
            detail="No file selected"
        )

    if not file.filename.lower().endswith(".pdf"):

        raise HTTPException(
            status_code=400,
            detail="Only PDF files are supported"
        )

    temp_path = None

    try:

        # ----------------------------------------------------
        # SAVE UPLOADED PDF TEMPORARILY
        # ----------------------------------------------------

        with tempfile.NamedTemporaryFile(
            delete=False,
            suffix=".pdf"
        ) as temp_file:

            temp_path = temp_file.name

            content = await file.read()

            temp_file.write(content)

        # ----------------------------------------------------
        # EXTRACT PDF TEXT
        # ----------------------------------------------------

        try:

            raw_text = extract_text_from_pdf(
                temp_path
            )

        except Exception as error:

            raise HTTPException(
                status_code=400,
                detail=f"PDF text extraction failed: {str(error)}"
            )

        raw_text = raw_text.strip()

        # ----------------------------------------------------
        # CHECK EXTRACTED TEXT
        # ----------------------------------------------------

        if not raw_text:

            raise HTTPException(
                status_code=400,
                detail=(
                    "No readable text was found in the PDF. "
                    "This may be a scanned/image PDF. "
                    "OCR support is not enabled yet."
                )
            )

        # ----------------------------------------------------
        # LANGUAGE DETECTION + TRANSLATION
        # ----------------------------------------------------

        try:

            processed_document = process_document_text(
                raw_text
            )

        except ValueError as error:

            raise HTTPException(
                status_code=400,
                detail=str(error)
            )

        except Exception as error:

            raise HTTPException(
                status_code=500,
                detail=(
                    "Language detection/translation failed: "
                    f"{str(error)}"
                )
            )

        detected_language = processed_document[
            "detected_language"
        ]

        normalized_text = processed_document[
            "normalized_text"
        ]

        # ----------------------------------------------------
        # AI ANALYSIS
        #
        # IMPORTANT:
        # Model receives English normalized text.
        # ----------------------------------------------------

        analysis_result = run_ai_analysis(
            normalized_text
        )

        # ----------------------------------------------------
        # SAVE TO DATABASE
        #
        # raw_text          = original PDF text
        # detected_language = detected language
        # normalized_text   = English translation
        # ----------------------------------------------------

        report_id = save_report_to_database(

            raw_text=raw_text,

            detected_language=detected_language,

            normalized_text=normalized_text,

            analysis_result=analysis_result
        )

        # ----------------------------------------------------
        # RESPONSE
        # ----------------------------------------------------

        return {

            "report_id": report_id,

            "filename": file.filename,

            "detected_language":
                detected_language,

            "raw_text":
                raw_text,

            "normalized_text":
                normalized_text,

            "sif_prediction":
                analysis_result["sif_prediction"],

            "confidence":
                analysis_result["confidence"],

            "life_saving_rule":
                analysis_result["life_saving_rule"],

            "precursor_activity":
                analysis_result["precursor_activity"],

            "precursor_location":
                analysis_result["precursor_location"],

            "barrier_failure":
                analysis_result["barrier_failure"],

            "translation_status":
                "translated_to_english",

            "database_status":
                "saved"
        }

    except HTTPException:

        raise

    except Exception as error:

        raise HTTPException(
            status_code=500,
            detail=f"PDF processing error: {str(error)}"
        )

    finally:

        # ----------------------------------------------------
        # DELETE TEMPORARY PDF
        # ----------------------------------------------------

        if temp_path and os.path.exists(temp_path):

            try:

                os.remove(temp_path)

            except Exception:

                pass


# ============================================================
# GET ALL REPORTS
# ============================================================

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

        return {

            "value": [

                {
                    "report_id":
                        report.report_id,

                    "raw_text":
                        report.raw_text,

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

            ],

            "Count": len(reports)
        }

    finally:

        db.close()


# ============================================================
# GET SINGLE REPORT
# ============================================================

@app.get("/reports/{report_id}")
def get_single_report(report_id: int):

    db = SessionLocal()

    try:

        report = (
            db.query(Report)
            .filter(
                Report.report_id == report_id
            )
            .first()
        )

        if not report:

            raise HTTPException(
                status_code=404,
                detail="Report not found"
            )

        return {

            "report_id":
                report.report_id,

            "raw_text":
                report.raw_text,

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

    finally:

        db.close()


# ============================================================
# DELETE REPORT
# ============================================================

@app.delete("/reports/{report_id}")
def delete_report(report_id: int):

    db = SessionLocal()

    try:

        report = (
            db.query(Report)
            .filter(
                Report.report_id == report_id
            )
            .first()
        )

        if not report:

            raise HTTPException(
                status_code=404,
                detail="Report not found"
            )

        db.delete(report)

        db.commit()

        return {

            "message":
                "Report deleted successfully",

            "report_id":
                report_id
        }

    except HTTPException:

        raise

    except Exception as error:

        db.rollback()

        raise HTTPException(
            status_code=500,
            detail=f"Database error: {str(error)}"
        )

    finally:

        db.close()


# ============================================================
# DASHBOARD STATISTICS
# ============================================================

@app.get("/dashboard/stats")
def dashboard_stats():

    db = SessionLocal()

    try:

        reports = (
            db.query(Report)
            .all()
        )

        total_reports = len(reports)

        sif_yes = sum(
            1
            for report in reports
            if report.sif_prediction == "YES"
        )

        sif_no = sum(
            1
            for report in reports
            if report.sif_prediction == "NO"
        )

        high_confidence_sif = sum(

            1

            for report in reports

            if (
                report.sif_prediction == "YES"
                and report.confidence is not None
                and report.confidence >= 0.90
            )

        )

        # ----------------------------------------------------
        # LIFE-SAVING RULE COUNTS
        # ----------------------------------------------------

        life_saving_rules = {}

        for report in reports:

            rule = report.life_saving_rule

            if rule:

                life_saving_rules[rule] = (
                    life_saving_rules.get(rule, 0)
                    + 1
                )

        # ----------------------------------------------------
        # ACTIVITY COUNTS
        # ----------------------------------------------------

        precursor_activities = {}

        for report in reports:

            activity = report.precursor_activity

            if activity:

                precursor_activities[activity] = (
                    precursor_activities.get(
                        activity,
                        0
                    )
                    + 1
                )

        # ----------------------------------------------------
        # LOCATION COUNTS
        # ----------------------------------------------------

        precursor_locations = {}

        for report in reports:

            location = report.precursor_location

            if location:

                precursor_locations[location] = (
                    precursor_locations.get(
                        location,
                        0
                    )
                    + 1
                )

        # ----------------------------------------------------
        # BARRIER COUNTS
        # ----------------------------------------------------

        barrier_failures = {}

        for report in reports:

            barrier = report.barrier_failure

            if barrier:

                barrier_failures[barrier] = (
                    barrier_failures.get(
                        barrier,
                        0
                    )
                    + 1
                )

        # ----------------------------------------------------
        # RESPONSE
        # ----------------------------------------------------

        return {

            "total_reports":
                total_reports,

            "sif_yes":
                sif_yes,

            "sif_no":
                sif_no,

            "high_confidence_sif":
                high_confidence_sif,

            "life_saving_rules":
                life_saving_rules,

            "precursor_activities":
                precursor_activities,

            "precursor_locations":
                precursor_locations,

            "barrier_failures":
                barrier_failures
        }

    finally:

        db.close()