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
    site: str | None = None
    location: str | None = None
    report_title: str | None = None
    report_type: str | None = None


LANGUAGE_NAMES = {
    "en": "English",
    "hi": "Hindi",
    "bn": "Bengali",
    "ta": "Tamil",
    "te": "Telugu",
    "mr": "Marathi",
    "gu": "Gujarati",
    "kn": "Kannada",
    "ml": "Malayalam",
    "pa": "Punjabi",
    "ur": "Urdu",
    "fr": "French",
    "de": "German",
    "es": "Spanish",
}


RULES = [
    (["confined space", "confined-space", "entry permit", "gas testing", "gas test", "atmospheric testing", "कन्फाइंड", "सीमित स्थान", "गैस टेस्ट", "गैस परीक्षण"], "Confined Space"),
    (["isolation", "isolated", "zero energy", "energized equipment", "energy isolation", "electrical isolation", "आइसोलेशन", "ऊर्जा पृथक्करण", "विद्युत"], "Energy Isolation"),
    (["hot work", "welding", "cutting", "हॉट वर्क", "वेल्डिंग", "कटिंग"], "Hot Work"),
    (["crane", "lifting", "suspended load", "lifting area", "क्रेन", "लिफ्टिंग", "उठाना"], "Lifting Operations"),
    (["working at height", "fall protection", "fall arrest", "anchorage", "slip", "slipped", "trip", "fall", "height", "scaffold", "ladder", "ऊंचाई", "हाइट", "फिसल", "गिरना"], "Working at Height"),
    (["vehicle", "driving", "pedestrian", "road", "traffic", "गाड़ी", "वाहन", "ड्राइविंग"], "Driving"),
    (["excavation", "excavated", "trench", "खुदाई", "खाई", "गड्ढा"], "Excavation"),
    (["line of fire", "suspended load", "separation distance", "exclusion zone", "लाइन ऑफ फायर"], "Line of Fire"),
    (["permit", "authorization", "authorized", "परमिट", "अनुमति"], "Bypassing Safety Controls"),
]

ACTIVITIES = [
    (["confined space", "confined-space", "कन्फाइंड", "सीमित स्थान"], "Confined-space entry"),
    (["crane", "lifting", "suspended load", "क्रेन", "लिफ्टिंग"], "Lifting operation"),
    (["hot work", "welding", "cutting", "हॉट वर्क", "वेल्डिंग"], "Hot work"),
    (["maintenance", "valve maintenance", "pipeline maintenance", "मरम्मत", "मेंटेनेंस"], "Maintenance"),
    (["excavation", "trench", "खुदाई", "खाई"], "Excavation"),
    (["working at height", "fall protection", "fall arrest", "slip", "slipped", "trip", "fall", "ladder", "scaffold", "ऊंचाई", "फिसल", "गिरा"], "Working at height / Fall risk"),
    (["vehicle", "driving", "वाहन", "गाड़ी"], "Vehicle operation"),
]

LOCATIONS = [
    (["gas processing unit", "gpu", "गैस प्रोसेसिंग"], "Gas Processing Unit"),
    (["tank farm", "tank", "टैंक"], "Tank Farm"),
    (["compressor station", "compressor", "कंप्रेसर"], "Compressor Station"),
    (["refinery", "रिफाइनरी"], "Refinery Area"),
    (["production area", "production", "उत्पादन क्षेत्र"], "Production Area"),
    (["pipeline", "पाइपलाइन"], "Pipeline Area"),
    (["workshop", "वर्कशॉप"], "Workshop"),
    (["construction site", "construction", "निर्माण स्थल"], "Construction Site"),
    (["warehouse", "storage", "गोदाम"], "Warehouse / Storage"),
]

BARRIERS = [
    (["without gas testing", "gas test was not", "gas testing was not", "gas test not completed", "before the gas test", "gas test pending", "गैस टेस्ट नहीं"], "Required gas testing not completed"),
    (["without a valid entry permit", "without entry permit", "without permit", "permit was not", "permit not confirmed", "बिना परमिट", "परमिट नहीं", "बिना अनुमति"], "Required permit/authorization not confirmed"),
    (["isolation was not confirmed", "isolation not confirmed", "before electrical isolation", "without confirming", "energized equipment", "आइसोलेशन नहीं"], "Energy isolation not verified"),
    (["near pedestrians", "pedestrians without", "separation distance", "दूरी नहीं"], "Required separation from people not maintained"),
    (["before the required inspection", "inspection had not been completed", "not inspected", "निरीक्षण नहीं"], "Required inspection not completed"),
    (["without fall protection", "fall protection was not", "without fall arrest", "बिना सुरक्षा", "हार्नेस नहीं", "बेल्ट नहीं"], "Fall protection barrier not established"),
    (["slip", "slipped", "wet floor", "oil spill", "slippery", "फिसलन", "गीला फर्श"], "Walking/working surface barrier failure"),
    (["suspended-load zone", "suspended load zone"], "Personnel exposed to suspended-load zone"),
    (["authorization was not", "before authorization", "without authorization", "बिना अनुमति"], "Required work authorization not confirmed"),
]

RISK_TERMS = [
    ("near miss", 3), ("unsafe", 2), ("exposure", 2), ("exposed", 2),
    ("without", 2), ("not completed", 3), ("not confirmed", 3),
    ("not inspected", 3), ("failed", 3), ("failure", 3),
    ("bypassed", 4), ("bypass", 4), ("missing", 2), ("hazard", 2),
    ("incident", 2), ("risk", 1), ("violation", 3),
    ("no gas test", 4), ("without permit", 4), ("energized", 4),
    ("suspended load", 3), ("fall protection", 3), ("confined space", 3),
    ("slip", 2), ("slipped", 2), ("fell", 3), ("fall", 2), ("injury", 3),
    ("खतरा", 2), ("हादसा", 3), ("दुर्घटना", 3), ("फिसल", 2), ("गिरा", 3), ("चोट", 3),
]

SAFE_TERMS = [
    "completed", "verified", "confirmed", "inspected", "authorized",
    "properly isolated", "gas tested", "permit approved", "controlled",
    "सुरक्षित", "सत्यापित", "अनुमोदित",
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


def resolve_location(text: str, user_site: str | None = None) -> str:
    # 1. User-provided Site / Location (Direct parameter)
    if user_site and user_site.strip():
        cleaned = user_site.strip()
        matched = detect_location(cleaned)
        return matched if matched else cleaned.title()

    # Check for header inside text like "Site / Location: ...", "Site: ...", "Location: ..."
    header_match = re.search(r"(?:Site\s*/\s*Location|Location|Site)\s*:\s*([^\n\r]+)", text, re.IGNORECASE)
    if header_match:
        val = header_match.group(1).strip()
        if val:
            matched = detect_location(val)
            return matched if matched else val.title()

    # 2. Extract from report text using keyword matching
    extracted = detect_location(text)
    if extracted:
        return extracted

    # 3. Fallback if none found
    return "Not identified"


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


def run_ai_analysis(text: str, site: str | None = None):
    text = text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="Report text cannot be empty")

    prediction, confidence, matched = lightweight_sif_prediction(text)
    location = resolve_location(text, user_site=site)
    rule = detect_life_saving_rule(text)
    activity = detect_activity(text)
    barrier = detect_barrier_failure(text)

    return {
        "sif_prediction": prediction,
        "confidence": confidence,
        "life_saving_rule": rule or "General Safety",
        "precursor_activity": activity or "Routine Activity",
        "precursor_location": location,
        "barrier_failure": barrier or "Not identified",
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
        "version": "1.5.0-live",
        "model": "Free Lightweight SIF Analyzer",
        "database": "TiDB Cloud (MySQL)",
        "document_processing": "PDF text extraction",
        "status": "online",
    }


@app.get("/health")
def health():
    return {
        "status": "healthy",
        "model": "Free Lightweight SIF Analyzer",
        "device": "cpu",
        "database": "TiDB Cloud (MySQL)",
        "document_processing": "enabled",
        "memory_mode": "low-memory",
    }


@app.post("/analyze")
def analyze_report(request: AnalyzeRequest):
    text = request.report_text.strip()
    user_site = request.site or request.location
    result = run_ai_analysis(text, site=user_site)

    # Detect language
    lang_code = detect_language_safe(text)
    lang_name = LANGUAGE_NAMES.get(lang_code, lang_code.upper() if lang_code else "English")

    report_id = save_report_to_database(
        raw_text=text,
        detected_language=lang_name,
        normalized_text=text,
        analysis_result=result,
    )

    return {
        "report_id": report_id,
        "report_text": text,
        "detected_language": lang_name,
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

        lang_code = detect_language_safe(raw_text)
        detected_language = LANGUAGE_NAMES.get(lang_code, lang_code.upper() if lang_code else "English")

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


# ============================================================
# SIF-SANKET AI SAFETY COPILOT / ASSISTANT
# ============================================================

class AssistantMessage(BaseModel):
    role: str
    content: str


class AssistantRequest(BaseModel):
    query: str
    history: list[AssistantMessage] = []


def process_assistant_query(query: str, history: list = None) -> dict:
    q = query.strip().lower()
    db = SessionLocal()
    try:
        reports = db.query(Report).all()
        total_reports = len(reports)
        sif_yes = sum(r.sif_prediction == "YES" for r in reports)
        sif_no = sum(r.sif_prediction == "NO" for r in reports)
        sif_rate = round((sif_yes / total_reports * 100), 1) if total_reports > 0 else 0

        loc_counts = {}
        for r in reports:
            if r.precursor_location and r.precursor_location != "Not identified":
                loc_counts[r.precursor_location] = loc_counts.get(r.precursor_location, 0) + 1
        top_loc = max(loc_counts.items(), key=lambda x: x[1])[0] if loc_counts else "General Sites"

        lsr_counts = {}
        for r in reports:
            if r.life_saving_rule and r.life_saving_rule != "General Safety":
                lsr_counts[r.life_saving_rule] = lsr_counts.get(r.life_saving_rule, 0) + 1
        top_lsr = max(lsr_counts.items(), key=lambda x: x[1])[0] if lsr_counts else "Confined Space"
    finally:
        db.close()

    is_hindi = bool(re.search(r"[\u0900-\u097F]", query)) or any(w in q for w in ["kya", "hai", "kaise", "batao", "kitne", "kaha", "karein", "karo", "namaste"])

    # 1. Statistics / Status Query
    if any(k in q for k in ["stat", "kitne", "count", "total", "summary", "status", "dashboard", "numbers", "rate"]):
        if is_hindi:
            resp = (
                f"📊 **Live Safety Data Snapshot (TiDB Cloud):**\n\n"
                f"• **कुल Safety Reports:** {total_reports}\n"
                f"• **SIF Precursors चिन्हित:** {sif_yes} reports ({sif_rate}% rate)\n"
                f"• **सामान्य/Routine Reports:** {sif_no}\n"
                f"• **सबसे संवेदनशील Location:** {top_loc}\n"
                f"• **मुख्य Violated Life-Saving Rule:** {top_lsr}\n\n"
                f"हमारा AI पाइपलाइन लगातार HSE रिपोर्ट्स का विश्लेषण कर रहा है ताकि किसी भी बड़ी दुर्घटना (SIF) को पहले ही रोका जा सके।"
            )
        else:
            resp = (
                f"📊 **Live Safety Intelligence Snapshot (TiDB Cloud):**\n\n"
                f"• **Total Safety Reports:** {total_reports}\n"
                f"• **Identified SIF Precursors:** {sif_yes} reports ({sif_rate}% rate)\n"
                f"• **Standard Routine Reports:** {sif_no}\n"
                f"• **Highest Frequency Location:** {top_loc}\n"
                f"• **Primary Life-Saving Rule:** {top_lsr}\n\n"
                f"The AI continuously screens all submitted incident reports to isolate recurring precursor conditions and barrier breakdowns."
            )
        return {
            "response": resp,
            "quick_replies": ["Show highest risk location", "List 9 Life-Saving Rules", "How to submit new report"],
            "stats": {"total": total_reports, "sif_yes": sif_yes, "sif_rate": sif_rate}
        }

    # 2. Life-Saving Rules
    if any(k in q for k in ["life-saving", "life saving", "lsr", "niyam", "rules"]):
        if is_hindi:
            resp = (
                "🛡️ **SIF-Sanket के 9 Core Life-Saving Rules (LSR):**\n\n"
                "1. **Confined Space Entry:** हमेशा परमिट और मल्टी-गैस परीक्षण के बाद ही प्रवेश करें।\n"
                "2. **Energy Isolation (LOTO):** मेंटेनेंस से पहले शून्य ऊर्जा स्थिति (Zero Energy) सत्यापित करें।\n"
                "3. **Working at Height:** 1.8 मीटर से ऊपर 100% टाई-ऑफ फॉल अरेस्ट हार्नेस अनिवार्य है।\n"
                "4. **Hot Work Safety:** ज्वलनशील गैस जांच और फायर वॉच के बिना वेल्डिंग/कटिंग न करें।\n"
                "5. **Lifting Operations:** लटके हुए भार (Suspended Load) के नीचे कभी न खड़े हों।\n"
                "6. **Excavation Safety:** खाइयों में शोरिंग और भूमिगत केबल/पाइप का पता लगाए बिना खुदाई न करें।\n"
                "7. **Driving Safety:** सीटबेल्ट, गति सीमा, और यात्रा प्रबंधन नियमों का पालन करें।\n"
                "8. **Line of Fire:** दबाव वाली लाइनों और चलती मशीनों के रास्ते से सुरक्षित दूरी बनाए रखें।\n"
                "9. **Bypassing Safety Controls:** कभी भी सेफ्टी इंटरलॉक्स या सेफ्टी स्विच को बिना अनुमति बायपास न करें।"
            )
        else:
            resp = (
                "🛡️ **The 9 Core Life-Saving Rules (LSR) Protocols:**\n\n"
                "1. **Confined Space Entry:** Confirm valid entry permit & continuous atmospheric gas testing.\n"
                "2. **Energy Isolation (LOTO):** Verify zero energy state before mechanical or electrical work.\n"
                "3. **Working at Height:** Maintain 100% tie-off fall protection harness above 1.8 meters.\n"
                "4. **Hot Work Safety:** Verify combustible clearance, atmospheric monitoring & dedicated fire watch.\n"
                "5. **Lifting Operations:** Never stand or walk beneath suspended loads (exclusion zone).\n"
                "6. **Excavation Safety:** Ensure proper trench shoring/benching and underground utility detection.\n"
                "7. **Safe Driving:** Maintain journey management, seatbelt compliance, and defensive speed controls.\n"
                "8. **Line of Fire:** Position personnel clear of stored energy release vectors and tensioned lines.\n"
                "9. **Bypassing Safety Controls:** Never disable, jumper, or bypass interlocks without formal authorization."
            )
        return {
            "response": resp,
            "quick_replies": ["Tell me about Confined Space", "Explain Energy Isolation", "Check SIF statistics"]
        }

    # 3. Confined Space
    if any(k in q for k in ["confined", "कन्फाइंड", "gas test"]):
        resp = (
            "🕳️ **Confined Space Entry Protocol:**\n\n"
            "• **Mandatory Barriers:** Valid entry permit, calibrated multi-gas testing (O2: 19.5%-23.5%, LEL < 10%, H2S < 10ppm, CO < 25ppm).\n"
            "• **Safety Watch:** Dedicated stand-by entrant stationed outside at all times with communications.\n"
            "• **Emergency Retrieval:** Retrieval tripod, harness, and positive-pressure breathing equipment ready on site.\n"
            "• **AI Screening Alert:** Any activity entered without gas testing is automatically flagged as HIGH SIF Potential."
        ) if not is_hindi else (
            "🕳️ **कन्फाइंड स्पेस सुरक्षा प्रोटोकॉल:**\n\n"
            "• **अनिवार्य बैरियर्स:** वैध एंट्री परमिट और कैलिब्रेटेड मल्टी-गैस टेस्टिंग (Oxygen, Flammable LEL, H2S, CO).\n"
            "• **स्टैंडबाय वॉच:** प्रवेश द्वार पर हमेशा एक समर्पित स्टैंडबाय व्यक्ति तैनात होना चाहिए।\n"
            "• **आपातकालीन बचाव:** रिट्रीवल ट्राइपॉड, हार्नेस और श्वास उपकरण तैयार होने चाहिए।\n"
            "• **SIF-Sanket AI:** गैस टेस्ट या परमिट के बिना प्रवेश वाली रिपोर्ट को तुरंत HIGH SIF Precursor फ्लैग करता है।"
        )
        return {"response": resp, "quick_replies": ["List all Life-Saving Rules", "Check live SIF statistics", "Working at height rules"]}

    # 4. Energy Isolation / LOTO
    if any(k in q for k in ["isolation", "loto", "आइसोलेशन", "energy"]):
        resp = (
            "⚡ **Energy Isolation & Lockout-Tagout (LOTO):**\n\n"
            "• **Core Objective:** Zero mechanical, electrical, thermal, chemical, or pneumatic energy before maintenance.\n"
            "• **Critical Steps:** Identify source ➔ De-energize ➔ Lock & Tag ➔ Dissipate stored energy ➔ Try-step (Verify zero energy).\n"
            "• **Precursor Alert:** Any maintenance conducted without physical lockout is classified as an immediate catastrophic precursor."
        ) if not is_hindi else (
            "⚡ **ऊर्जा पृथक्करण (Energy Isolation / LOTO):**\n\n"
            "• **मुख्य उद्देश्य:** मेंटेनेंस से पहले विद्युत, यांत्रिक, हाइड्रोलिक या रासायनिक ऊर्जा को शून्य करना।\n"
            "• **महत्वपूर्ण चरण:** ऊर्जा स्रोत पहचानें ➔ डिस्कनेक्ट करें ➔ लॉक और टैग लगाएं ➔ अवशिष्ट ऊर्जा निकालें ➔ ट्राई-स्टेप (Zero Energy Verify करें)।\n"
            "• **SIF चेतावनी:** बिना लॉकआउट/टैगआउट काम शुरू करना गंभीर SIF प्रिकर्सर माना जाता है।"
        )
        return {"response": resp, "quick_replies": ["What is SIF Precursor?", "Confined Space rules", "Show incident stats"]}

    # 5. Working at Height / Slips / Falls
    if any(k in q for k in ["height", "fall", "slip", "ladder", "scaffold", "ऊंचाई", "फिसल", "गिरना"]):
        resp = (
            "🧗 **Working at Height & Surface Safety:**\n\n"
            "• **Fall Protection:** Full-body harness with shock-absorbing lanyard hooked to rated anchorage (minimum 5,000 lbs / 22 kN).\n"
            "• **Surface Management:** Prompt spill cleanup, anti-slip footwear, and designated non-slip walkways.\n"
            "• **Inspection:** Daily scaffolding green-tag verification and ladder 4:1 ratio inspection.\n"
            "• **AI Logic:** Slips or working above height without tie-off trigger Working at Height barrier alerts."
        ) if not is_hindi else (
            "🧗 **ऊंचाई पर कार्य और फिसलन रोकथाम सुरक्षा:**\n\n"
            "• **फॉल प्रोटेक्शन:** 1.8 मीटर से अधिक ऊंचाई पर फुल-बॉडी हार्नेस और रेटेड एंकरेज से 100% टाई-ऑफ आवश्यक है।\n"
            "• **सतह प्रबंधन:** तेल/रसायन रिसाव की तुरंत सफाई, एंटी-स्लिप जूते और फिसलन रोधी वॉकवे।\n"
            "• **मचान निरीक्षण:** ग्रीन-टैग प्रमाणित मचान और सीढ़ियों का 4:1 कोण नियम।\n"
            "• **AI डिटेक्शन:** बिना हार्नेस या फिसलन वाले प्लेटफॉर्म की रिपोर्ट को AI हाई रिस्क प्रिकर्सर के रूप में प्रोसेस करता है।"
        )
        return {"response": resp, "quick_replies": ["Hot Work precautions", "Confined Space rules", "Check SIF stats"]}

    # 6. What is SIF / SIF Precursor
    if any(k in q for k in ["sif", "precursor", "sanket", "kya hai", "what is"]):
        resp = (
            "💡 **Understanding SIF (Significant Incident Frequency):**\n\n"
            "• **SIF Concept:** Industry data shows that 80% of minor incidents do not have fatal potential, but 20% contain a 'Precursor' that could have resulted in a fatality or life-altering injury.\n"
            "• **What is a Precursor?** A high-energy hazard coupled with a compromised or absent barrier (e.g. entering a tank without gas testing).\n"
            "• **Role of SIF-Sanket:** Rather than waiting for a tragedy, SIF-Sanket uses AI to scan every routine safety report, near-miss, and field observation to flag SIF Precursors and missing barriers instantly."
        ) if not is_hindi else (
            "💡 **SIF (Significant Incident Frequency) और प्रिकर्सर क्या है?**\n\n"
            "• **SIF सिद्धांत:** सुरक्षा शोध दर्शाता है कि हर छोटी दुर्घटना जानलेवा नहीं होती, लेकिन लगभग 20% घटनाओं में ऐसे 'Precursors' होते हैं जो जानलेवा बन सकते थे।\n"
            "• **Precursor क्या है?** उच्च ऊर्जा का खतरा (High Energy Hazard) + फेल या अनुपस्थित सुरक्षा बैरियर (जैसे बिना आइसोलेशन वाल्व खोलना)।\n"
            "• **SIF-Sanket का कार्य:** हमारा AI हर सुरक्षा रिपोर्ट और नियर-मिस को स्कैन करके तुरंत बताता है कि क्या इसमें SIF Potential है, कौन सा Life-Saving Rule जुड़ा है, और कौन सा बैरियर टूटा है।"
        )
        return {"response": resp, "quick_replies": ["Show SIF statistics", "List Life-Saving Rules", "How to submit report"]}

    # 7. How to Report
    if any(k in q for k in ["report", "submit", "kaise", "how to", "analyze", "upload"]):
        resp = (
            "📝 **How to Analyze a Safety Report in SIF-Sanket:**\n\n"
            "1. **Navigate:** Click on **'Safety Reports'** or **'Document Intelligence'** in the sidebar.\n"
            "2. **Fill Details:** Enter the Report Title, Report Type, and Site / Location (e.g. 'Pipeline Area', 'Bhopal Unit 4').\n"
            "3. **Write Description:** Paste or write the incident text in English or Hindi.\n"
            "4. **AI Inference:** Click **'Analyze with AI'** — within seconds, SIF-Sanket predicts SIF Potential, Confidence %, mapped Life-Saving Rule, Precursor Activity, and Barrier Failure, automatically saving the case to TiDB Cloud!"
        ) if not is_hindi else (
            "📝 **SIF-Sanket में रिपोर्ट कैसे सबमिट और एनालाइज करें:**\n\n"
            "1. **Safety Reports टैब:** साइडबार में 'Safety Reports' या 'Document Intelligence' पर जाएं।\n"
            "2. **विवरण भरें:** Report Title, Incident Type, और Site / Location (उदा. 'Pipeline Area', 'Refinery') दर्ज करें।\n"
            "3. **रिपोर्ट लिखें:** घटना का पूरा विवरण हिंदी या अंग्रेजी में टाइप करें।\n"
            "4. **AI Analysis:** 'Analyze with AI' पर क्लिक करें — सिस्टम तुरंत SIF Potential, Confidence %, Life-Saving Rule, Activity और Barrier Failure निकाल कर सुरक्षित TiDB Cloud में स्टोर कर देगा!"
        )
        return {"response": resp, "quick_replies": ["Check live SIF statistics", "List Life-Saving Rules", "What is SIF Precursor?"]}

    # Default / General Response
    if is_hindi:
        resp = (
            f"नमस्ते! मैं **SIF-Sanket AI Safety Copilot** हूँ। 🛡️\n\n"
            f"मैं आपकी औद्योगिक सुरक्षा, Life-Saving Rules, SIF Precursors, और साइट रिपोर्टिंग में सहायता के लिए उपलब्ध हूँ।\n\n"
            f"वर्तमान में TiDB Cloud डेटाबेस में कुल **{total_reports} सुरक्षा रिपोर्ट्स** हैं जिनमें से **{sif_yes} SIF Precursors** चिन्हित किए गए हैं।\n\n"
            f"आप मुझसे किसी भी सुरक्षा नियम (जैसे Confined Space, Working at Height, LOTO) या लाइव डेटा के बारे में पूछ सकते हैं!"
        )
    else:
        resp = (
            f"Hello! I am your **SIF-Sanket AI Safety Copilot**. 🛡️\n\n"
            f"I am trained on industrial HSE safety standards, Life-Saving Rules (LSR), and SIF Precursor detection methodology.\n\n"
            f"Currently tracking **{total_reports} safety reports** with **{sif_yes} identified SIF precursors** across our facilities.\n\n"
            f"You can ask me about safety rules (e.g. Confined Space, Energy Isolation, Hot Work), barrier failures, or live facility statistics."
        )
    return {
        "response": resp,
        "quick_replies": ["Check live SIF statistics", "List 9 Life-Saving Rules", "What is SIF Precursor?", "How to submit report"]
    }


@app.post("/assistant")
def chat_assistant(request: AssistantRequest):
    return process_assistant_query(request.query, request.history)
