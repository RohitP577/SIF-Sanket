import re
import torch

from pypdf import PdfReader
from langdetect import detect, LangDetectException
from transformers import AutoTokenizer, AutoModelForSeq2SeqLM


# ============================================================
# LANGUAGE MAPPING
# ============================================================

LANGUAGE_MAP = {
    "en": "eng_Latn",
    "hi": "hin_Deva",
    "bn": "ben_Beng",
    "ta": "tam_Taml",
    "te": "tel_Telu",
    "mr": "mar_Deva",
    "gu": "guj_Gujr",
    "kn": "kan_Knda",
    "ml": "mal_Mlym",
    "pa": "pan_Guru",
    "ur": "urd_Arab",
    "ne": "npi_Deva",

    "fr": "fra_Latn",
    "de": "deu_Latn",
    "es": "spa_Latn",
    "pt": "por_Latn",
    "it": "ita_Latn",
    "ru": "rus_Cyrl",
    "ar": "arb_Arab",
    "zh-cn": "zho_Hans",
    "zh-tw": "zho_Hant",
    "ja": "jpn_Jpan",
    "ko": "kor_Hang",
    "tr": "tur_Latn",
    "vi": "vie_Latn",
    "id": "ind_Latn",
    "th": "tha_Thai",
}


# ============================================================
# LANGUAGE NAMES
# ============================================================

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
    "ne": "Nepali",
    "fr": "French",
    "de": "German",
    "es": "Spanish",
    "pt": "Portuguese",
    "it": "Italian",
    "ru": "Russian",
    "ar": "Arabic",
    "zh-cn": "Chinese",
    "zh-tw": "Chinese",
    "ja": "Japanese",
    "ko": "Korean",
    "tr": "Turkish",
    "vi": "Vietnamese",
    "id": "Indonesian",
    "th": "Thai",
}


# ============================================================
# NLLB MODEL
# ============================================================

TRANSLATION_MODEL = "facebook/nllb-200-distilled-600M"

_translation_tokenizer = None
_translation_model = None


def load_translation_model():
    """
    Loads NLLB translation model only when required.
    """

    global _translation_tokenizer
    global _translation_model

    if _translation_tokenizer is not None and _translation_model is not None:
        return _translation_tokenizer, _translation_model

    print("Loading NLLB translation model...")

    _translation_tokenizer = AutoTokenizer.from_pretrained(
        TRANSLATION_MODEL
    )

    _translation_model = AutoModelForSeq2SeqLM.from_pretrained(
        TRANSLATION_MODEL
    )

    _translation_model.eval()

    print("NLLB translation model loaded successfully.")

    return _translation_tokenizer, _translation_model


# ============================================================
# PDF TEXT EXTRACTION
# ============================================================

def extract_text_from_pdf(file_path: str) -> str:

    reader = PdfReader(file_path)

    pages = []

    for page in reader.pages:

        text = page.extract_text()

        if text:
            pages.append(text)

    full_text = "\n".join(pages)

    return full_text.strip()


# ============================================================
# LANGUAGE DETECTION
# ============================================================

def detect_language(text: str) -> tuple[str, str]:

    if not text.strip():
        return "Unknown", "en"

    try:
        code = detect(text)

    except LangDetectException:
        return "Unknown", "en"

    language_name = LANGUAGE_NAMES.get(
        code,
        code.upper()
    )

    return language_name, code


# ============================================================
# TEXT NORMALIZATION
# ============================================================

def normalize_text(text: str) -> str:

    text = text.replace("\x00", " ")

    text = re.sub(
        r"\s+",
        " ",
        text
    )

    text = re.sub(
        r"[ \t]+",
        " ",
        text
    )

    return text.strip()


# ============================================================
# NLLB LANGUAGE CODE
# ============================================================

def get_nllb_language_code(language_code: str) -> str:

    return LANGUAGE_MAP.get(
        language_code,
        "eng_Latn"
    )


# ============================================================
# TEXT CHUNKING
# ============================================================

def split_text_into_chunks(
    text: str,
    max_chars: int = 1000
) -> list[str]:

    text = normalize_text(text)

    if len(text) <= max_chars:
        return [text]

    sentences = re.split(
        r"(?<=[.!?।])\s+",
        text
    )

    chunks = []

    current_chunk = ""

    for sentence in sentences:

        if not sentence.strip():
            continue

        if len(current_chunk) + len(sentence) <= max_chars:

            current_chunk += " " + sentence

        else:

            if current_chunk.strip():
                chunks.append(
                    current_chunk.strip()
                )

            current_chunk = sentence

    if current_chunk.strip():
        chunks.append(
            current_chunk.strip()
        )

    return chunks


# ============================================================
# TRANSLATE ONE CHUNK
# ============================================================

def translate_chunk(
    text: str,
    source_language: str
) -> str:

    if not text.strip():
        return ""

    # English doesn't need translation
    if source_language == "en":
        return text

    source_code = get_nllb_language_code(
        source_language
    )

    # Unsupported language
    if source_code == "eng_Latn":
        raise ValueError(
            f"Unsupported source language: {source_language}"
        )

    tokenizer, model = load_translation_model()

    tokenizer.src_lang = source_code

    inputs = tokenizer(
        text,
        return_tensors="pt",
        truncation=True,
        max_length=512
    )

    with torch.no_grad():

        generated_tokens = model.generate(
            **inputs,
            forced_bos_token_id=tokenizer.convert_tokens_to_ids(
                "eng_Latn"
            ),
            max_length=512
        )

    translated_text = tokenizer.batch_decode(
        generated_tokens,
        skip_special_tokens=True
    )[0]

    return translated_text.strip()


# ============================================================
# TRANSLATE COMPLETE TEXT
# ============================================================

def translate_to_english(
    text: str,
    source_language: str
) -> str:

    text = normalize_text(text)

    if not text:
        return ""

    # English → no translation required
    if source_language == "en":
        return text

    if source_language not in LANGUAGE_MAP:
        raise ValueError(
            f"Translation is not currently supported for language: "
            f"{source_language}"
        )

    chunks = split_text_into_chunks(
        text,
        max_chars=1000
    )

    translated_chunks = []

    for index, chunk in enumerate(chunks):

        print(
            f"Translating chunk "
            f"{index + 1}/{len(chunks)}..."
        )

        translated = translate_chunk(
            chunk,
            source_language
        )

        translated_chunks.append(
            translated
        )

    return normalize_text(
        " ".join(translated_chunks)
    )


# ============================================================
# COMPLETE DOCUMENT PROCESSING
# ============================================================

def process_document_text(
    text: str
) -> dict:

    # Original text
    raw_text = text.strip()

    if not raw_text:
        raise ValueError(
            "No text found in document."
        )

    # Detect language
    detected_language, language_code = detect_language(
        raw_text
    )

    # Clean original text
    cleaned_text = normalize_text(
        raw_text
    )

    # Translate to English
    normalized_text = translate_to_english(
        cleaned_text,
        language_code
    )

    return {
        "raw_text": raw_text,
        "detected_language": detected_language,
        "language_code": language_code,
        "normalized_text": normalized_text,
    }