import os
import re
import tempfile

from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from pypdf import PdfReader
from langdetect import detect, LangDetectException

from backend.database import SessionLocal
from backend.models import Report


app = FastAPI(
    title="SIF-Sanket API",
    description="SIF precursor detection API - Free/Low-memory mode",
    version="1.5.0-free",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "https://sif-sanket.netlify.app",
        "*",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class AnalyzeRequest(BaseModel):
    report_text: str


RULES = [
    (["confined space", "confined-space", "entry permit", "gas testing", "gas test", "atmospheric testing"], "Confined Space"),
    (["isolation", "isolated", "zero energy", "energized equipment", "energy isolation", "electrical isolation"], "Energy Isolation"),
    (["hot work", "welding", "cutting"], "Hot Work"),
    (["crane", "lifting", "suspended load", "lifting area"], "Lifting Operations"),
    (["working at height", "fall protection", "fall arrest", "anchorage"], "Working at Height"),
    (["vehicle", "driving", "pedestrian", "road", "traffic"], "Driving"),
    (["excavation", "excavated", "trench"], "Excavation"),
    (["line of fire", "suspended load", "separation distance", "exclusion zone"], "Line of Fire"),
    (["permit", "authorization", "authorized"], "Bypassing Safety Controls"),
]

ACTIVITIES = [
    (["confined space", "confined-space"], "Confined-space entry"),
    (["crane", "lifting", "suspended load"], "Lifting operation"),
    (["hot work", "welding", "cutting"], "Hot work"),
    (["maintenance", "valve maintenance", "pipeline maintenance"], "Maintenance"),
    (["excavation", "trench"], "Excavation"),
    (["working at height", "fall protection", "fall arrest"], "Working at height"),
    (["vehicle", "driving"], "Vehicle operation"),
]

LOCATIONS = [
    (["gas processing unit", "gpu"], "Gas Processing Unit"),
    (["tank farm"], "Tank Farm"),
    (["compressor station"], "Compressor Station"),
    (["refinery"], "Refinery Area"),
    (["production area"], "Production Area"),
    (["pipeline"], "Pipeline Area"),
    (["workshop"], "Workshop"),
    (["construction site"], "Construction Site"),
]

BARRIERS = [
    (["without gas testing", "gas test was not", "gas testing was not", "gas test not completed", "before the gas test", "gas test pending"], "Required gas testing not completed"),
    (["without a valid entry permit", "without entry permit", "without permit", "permit was not", "permit not confirmed"], "Required permit/authorization not confirmed"),
    (["isolation was not confirmed", "isolation not confirmed", "before electrical isolation", "without confirming", "energized equipment"], "Energy isolation not verified"),
    (["near pedestrians", "pedestrians without", "separation distance"], "Required separation from people not maintained"),
    (["before the required inspection", "inspection had not been completed", "not inspected"], "Required inspection not completed"),
    (["without fall protection", "fall protection was not", "without fall arrest"], "Fall protection barrier not established"),
    (["suspended-load zone", "suspended load zone"], "Personnel exposed to suspended-load zone"),
    (["authorization was not", "before authorization", "without authorization"], "Required work authorization not confirmed"),
]

RISK_TERMS = [
    ("near miss", 3), ("unsafe", 2), ("exposure", 2), ("exposed", 2),
    ("without", 2), ("not completed", 3), ("not confirmed", 3),
    ("not inspected", 3), ("failed", 3), ("failure", 3),
    ("bypassed", 4), ("bypass", 4), ("missing", 2), ("hazard", 2),
    ("incident", 2), ("risk", 1), ("violation", 3),
    ("no gas test", 4), ("without permit", 4), ("energized", 4),
    ("suspended load", 3), ("fall protection", 3), ("confined space", 3),
]

SAFE_TERMS = [
    "completed", "verified", "confirmed", "inspected", "authorized",
    "properly isolated", "gas tested", "permit approved", "controlled",
]


def _first_match(text: str, groups):
    low = text.lower()
    for keywords, result in groups:
        for keyword in keywords:
            if keyword in low:
                return result
    return None


def detect_life_saving_rule(text):
    return _first_match(text, RULES)


def detect_activity(text):
    return _first_match(text, ACTIVITIES)


def detect_location(text):
    return _first_match(text, LOCATIONS)


def detect_barrier_failure(text):
    return _first_match(text, BARRIERS)


def lightweight_sif_prediction(text: str):
    """Free-mode replacement for the XLM-R model.

    It deliberately avoids torch/transformers because Render Free has
    only 512 MB RAM. It returns a deterministic safety screening signal.
    """
    low = re.sub(r"\s+", " ", text.lower()).strip()

    risk_score = 0
    matched = []

    for term, weight in RISK_TERMS:
        if term in low:
            risk_score += weight
            matched.append(term)

    barrier = detect_barrier_failure(low)
    if barrier:
        risk_score += 4

    rule = detect_life_saving_rule(low)
    if rule:
        risk_score += 1

    safe_hits = sum(1 for term in SAFE_TERMS if term in low)
    risk_score = max(0, risk_score - min(safe_hits, 3))

    if risk_score >= 4:
        prediction = "YES"
        confidence = min(0.95, 0.62 + (risk_score * 0.04))
    else:
        prediction = "NO"
        confidence = min(0.92, 0.70 + ((4 - risk_score) * 0.03))

    return prediction, round(confidence, 4), matched


def run_ai_analysis(text: str):
    text = text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="Report text cannot be empty")

    prediction, confidence, matched = lightweight_sif_prediction(text)

    return {
        "sif_prediction": prediction,
        "confidence": confidence,
        "life_saving_rule": detect_life_saving_rule(text),
        "precursor_activity": detect_activity(text),
        "precursor_location": detect_location(text),
        "barrier_failure": detect_barrier_failure(text),
        "analysis_mode": "free_lightweight",
        "matched_safety_signals": matched[:20],
    }


def save_report_to_database(raw_text, detected_language, normalized_text, analysis_result):
    db = SessionLocal()
    try:
        report = Report(
            raw_text=raw_text,
            detected_language=detected_language,
            normalized_text=normalized_text,
            sif_prediction=analysis_result["sif_prediction"],
            confidence=analysis_result["confidence"],
            life_saving_rule=analysis_result["life_saving_rule"],
            precursor_activity=analysis_result["precursor_activity"],
            precursor_location=analysis_result["precursor_location"],
            barrier_failure=analysis_result["barrier_failure"],
        )
        db.add(report)
        db.commit()
        db.refresh(report)
        return report.report_id
    except Exception as error:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {error}")
    finally:
        db.close()


def extract_pdf_text(path: str):
    reader = PdfReader(path)
    pages = []
    for page in reader.pages:
        try:
            pages.append(page.extract_text() or "")
        except Exception:
            pages.append("")
    return "\n".join(pages).strip()


def detect_language_safe(text: str):
    try:
        return detect(text) if text.strip() else None
    except LangDetectException:
        return None
    except Exception:
        return None


@app.get("/")
def root():
    return {
        "message": "SIF-Sanket API is running",
        "version": "1.5.0-free",
        "model": "Free Lightweight SIF Analyzer",
        "database": "PostgreSQL",
        "document_processing": "PDF text extraction",
        "status": "online",
    }


@app.get("/health")
def health():
    return {
        "status": "healthy",
        "model": "Free Lightweight SIF Analyzer",
        "device": "cpu",
        "database": "PostgreSQL",
        "document_processing": "enabled",
        "memory_mode": "low-memory",
    }


@app.post("/analyze")
def analyze_report(request: AnalyzeRequest):
    text = request.report_text.strip()
    result = run_ai_analysis(text)

    report_id = save_report_to_database(
        raw_text=text,
        detected_language=None,
        normalized_text=text,
        analysis_result=result,
    )

    return {
        "report_id": report_id,
        "report_text": text,
        **result,
        "database_status": "saved",
    }


@app.post("/analyze-pdf")
async def analyze_pdf(file: UploadFile = File(...)):
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file selected")

    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported")

    temp_path = None
    try:
        content = await file.read()
        if not content:
            raise HTTPException(status_code=400, detail="Uploaded PDF is empty")

        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as temp:
            temp.write(content)
            temp_path = temp.name

        try:
            raw_text = extract_pdf_text(temp_path)
        except Exception as error:
            raise HTTPException(status_code=400, detail=f"PDF text extraction failed: {error}")

        if not raw_text:
            raise HTTPException(status_code=400, detail="No readable text was found in the PDF.")

        detected_language = detect_language_safe(raw_text)

        # Free mode intentionally keeps original text instead of loading
        # a large translation model.
        normalized_text = raw_text
        result = run_ai_analysis(normalized_text)

        report_id = save_report_to_database(
            raw_text=raw_text,
            detected_language=detected_language,
            normalized_text=normalized_text,
            analysis_result=result,
        )

        return {
            "report_id": report_id,
            "filename": file.filename,
            "detected_language": detected_language,
            "raw_text": raw_text,
            "normalized_text": normalized_text,
            **result,
            "translation_status": "free_mode_no_translation",
            "database_status": "saved",
        }

    except HTTPException:
        raise
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"PDF processing error: {error}")
    finally:
        if temp_path and os.path.exists(temp_path):
            try:
                os.remove(temp_path)
            except Exception:
                pass


def report_to_dict(report):
    return {
        "report_id": report.report_id,
        "raw_text": report.raw_text,
        "detected_language": report.detected_language,
        "normalized_text": report.normalized_text,
        "sif_prediction": report.sif_prediction,
        "confidence": report.confidence,
        "life_saving_rule": report.life_saving_rule,
        "precursor_activity": report.precursor_activity,
        "precursor_location": report.precursor_location,
        "barrier_failure": report.barrier_failure,
        "created_at": report.created_at,
    }


@app.get("/reports")
def get_reports():
    db = SessionLocal()
    try:
        reports = db.query(Report).order_by(Report.created_at.desc()).all()
        return {"value": [report_to_dict(r) for r in reports], "Count": len(reports)}
    finally:
        db.close()


@app.get("/reports/{report_id}")
def get_single_report(report_id: int):
    db = SessionLocal()
    try:
        report = db.query(Report).filter(Report.report_id == report_id).first()
        if not report:
            raise HTTPException(status_code=404, detail="Report not found")
        return report_to_dict(report)
    finally:
        db.close()


@app.delete("/reports/{report_id}")
def delete_report(report_id: int):
    db = SessionLocal()
    try:
        report = db.query(Report).filter(Report.report_id == report_id).first()
        if not report:
            raise HTTPException(status_code=404, detail="Report not found")
        db.delete(report)
        db.commit()
        return {"message": "Report deleted successfully", "report_id": report_id}
    except HTTPException:
        raise
    except Exception as error:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {error}")
    finally:
        db.close()


@app.get("/dashboard/stats")
def dashboard_stats():
    db = SessionLocal()
    try:
        reports = db.query(Report).all()

        total_reports = len(reports)
        sif_yes = sum(r.sif_prediction == "YES" for r in reports)
        sif_no = sum(r.sif_prediction == "NO" for r in reports)
        high_confidence_sif = sum(
            r.sif_prediction == "YES"
            and r.confidence is not None
            and r.confidence >= 0.90
            for r in reports
        )

        life_saving_rules = {}
        precursor_activities = {}
        precursor_locations = {}
        barrier_failures = {}

        for r in reports:
            if r.life_saving_rule:
                life_saving_rules[r.life_saving_rule] = life_saving_rules.get(r.life_saving_rule, 0) + 1
            if r.precursor_activity:
                precursor_activities[r.precursor_activity] = precursor_activities.get(r.precursor_activity, 0) + 1
            if r.precursor_location:
                precursor_locations[r.precursor_location] = precursor_locations.get(r.precursor_location, 0) + 1
            if r.barrier_failure:
                barrier_failures[r.barrier_failure] = barrier_failures.get(r.barrier_failure, 0) + 1

        return {
            "total_reports": total_reports,
            "sif_yes": sif_yes,
            "sif_no": sif_no,
            "high_confidence_sif": high_confidence_sif,
            "life_saving_rules": life_saving_rules,
            "precursor_activities": precursor_activities,
            "precursor_locations": precursor_locations,
            "barrier_failures": barrier_failures,
        }
    finally:
        db.close()
