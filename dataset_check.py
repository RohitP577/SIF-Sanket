import pandas as pd

file_path = "dataset/sif_sanket_synthetic_safety_reports_v2_1000.csv"

df = pd.read_csv(file_path)

print("========== DATASET OVERVIEW ==========")
print("Rows:", df.shape[0])
print("Columns:", df.shape[1])

print("\n========== COLUMN NAMES ==========")
print(df.columns.tolist())

print("\n========== MISSING VALUES ==========")
print(df.isnull().sum())

print("\n========== DUPLICATE ROWS ==========")
print("Duplicate rows:", df.duplicated().sum())

print("\n========== SIF POTENTIAL ==========")
print(df["sif_potential"].value_counts())

print("\n========== REPORT TYPE ==========")
print(df["report_type"].value_counts())

print("\n========== LIFE-SAVING RULE ==========")
print(df["life_saving_rule"].value_counts())

print("\n========== SAMPLE RECORDS ==========")
print(df.head(5))

# ==========================================
# STEP 3: DEFINE INPUT (X) AND TARGET (y)
# ==========================================

X = df["report_text"]
y = df["sif_potential"]

print("\n========== MODEL INPUT (X) ==========")
print("Number of input reports:", len(X))

print("\n========== MODEL TARGET (y) ==========")
print("Number of target labels:", len(y))

print("\n========== TARGET DISTRIBUTION ==========")
print(y.value_counts())

print("\n========== FIRST INPUT ==========")
print(X.iloc[0])

print("\n========== FIRST TARGET ==========")
print(y.iloc[0])

# ==========================================
# STEP 4: TRAIN-TEST SPLIT
# ==========================================

from sklearn.model_selection import train_test_split

X_train, X_test, y_train, y_test = train_test_split(
    X,
    y,
    test_size=0.20,
    random_state=42,
    stratify=y
)

print("\n========== TRAIN-TEST SPLIT ==========")
print("Training reports:", len(X_train))
print("Testing reports:", len(X_test))

print("\n========== TRAINING LABELS ==========")
print(y_train.value_counts())

print("\n========== TESTING LABELS ==========")
print(y_test.value_counts())

# ==========================================
# STEP 5: BASIC TEXT PREPROCESSING
# ==========================================

def clean_text(text):
    text = str(text)
    text = text.strip()
    text = " ".join(text.split())
    return text


X_train_clean = X_train.apply(clean_text)
X_test_clean = X_test.apply(clean_text)

print("\n========== TEXT PREPROCESSING ==========")

print("Original training text:")
print(X_train.iloc[0])

print("\nCleaned training text:")
print(X_train_clean.iloc[0])

print("\nTraining samples after cleaning:", len(X_train_clean))
print("Testing samples after cleaning:", len(X_test_clean))

# ==========================================
# STEP 6: TF-IDF TEXT VECTORIZATION
# ==========================================

from sklearn.feature_extraction.text import TfidfVectorizer

vectorizer = TfidfVectorizer(
    lowercase=True,
    ngram_range=(1, 2),
    max_features=5000
)

# Learn vocabulary ONLY from training data
X_train_tfidf = vectorizer.fit_transform(X_train_clean)

# Transform test data using the same vocabulary
X_test_tfidf = vectorizer.transform(X_test_clean)

print("\n========== TF-IDF VECTORIZATION ==========")

print("Training matrix shape:", X_train_tfidf.shape)
print("Testing matrix shape:", X_test_tfidf.shape)

print("\nNumber of vocabulary words/features:",
      len(vectorizer.vocabulary_))

# ==========================================
# STEP 7: TRAIN SIF CLASSIFICATION MODEL
# ==========================================

from sklearn.linear_model import LogisticRegression

model = LogisticRegression(
    max_iter=1000,
    random_state=42
)

# Train model
model.fit(X_train_tfidf, y_train)

print("\n========== MODEL TRAINING ==========")
print("Model: Logistic Regression")
print("Training completed successfully.")

# Predict on test data
y_pred = model.predict(X_test_tfidf)

print("\n========== SAMPLE PREDICTIONS ==========")

for i in range(10):
    print(
        f"Actual: {y_test.iloc[i]} | "
        f"Predicted: {y_pred[i]}"
    )

# ==========================================
# STEP 8: MODEL EVALUATION
# ==========================================

from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    classification_report,
    confusion_matrix
)

accuracy = accuracy_score(y_test, y_pred)

precision = precision_score(
    y_test,
    y_pred,
    pos_label="YES"
)

recall = recall_score(
    y_test,
    y_pred,
    pos_label="YES"
)

f1 = f1_score(
    y_test,
    y_pred,
    pos_label="YES"
)

print("\n========== MODEL EVALUATION ==========")

print(f"Accuracy : {accuracy:.4f}")
print(f"Precision: {precision:.4f}")
print(f"Recall   : {recall:.4f}")
print(f"F1 Score : {f1:.4f}")

print("\n========== CLASSIFICATION REPORT ==========")
print(
    classification_report(
        y_test,
        y_pred,
        target_names=["NO", "YES"]
    )
)

print("\n========== CONFUSION MATRIX ==========")
print(confusion_matrix(y_test, y_pred))

# ==========================================
# STEP 9: SAVE MODEL AND VECTORIZER
# ==========================================

import joblib
import os

os.makedirs("models", exist_ok=True)

joblib.dump(model, "models/sif_classifier.pkl")
joblib.dump(vectorizer, "models/tfidf_vectorizer.pkl")

print("\n========== MODEL SAVING ==========")
print("Model saved: models/sif_classifier.pkl")
print("Vectorizer saved: models/tfidf_vectorizer.pkl")

# ==========================================
# STEP 10: PREDICT A NEW SAFETY REPORT
# ==========================================

new_report = """
During compressor maintenance, the worker started the task
without confirming that the energy source had been properly isolated.
No injury occurred, but the worker was exposed to a potentially
high-energy hazard.
"""

# Clean the new report
new_report_clean = clean_text(new_report)

# Convert text using the SAVED/-trained vectorizer
new_report_tfidf = vectorizer.transform([new_report_clean])

# Predict SIF potential
prediction = model.predict(new_report_tfidf)[0]

# Get probability
probabilities = model.predict_proba(new_report_tfidf)[0]

# Find probability corresponding to predicted class
class_index = list(model.classes_).index(prediction)
confidence = probabilities[class_index]

print("\n========== NEW REPORT PREDICTION ==========")
print("Report:")
print(new_report_clean)

print("\nPredicted SIF Potential:", prediction)
print(f"Confidence: {confidence:.2%}")


# ==========================================
# STEP 11: MULTILINGUAL LANGUAGE DETECTION
# ==========================================

from langdetect import detect, DetectorFactory

# Make language detection reproducible
DetectorFactory.seed = 42


def detect_language(text):
    try:
        return detect(text)
    except:
        return "unknown"


# Test English report
english_report = """
During compressor maintenance, the worker started the task
without confirming that the energy source had been properly isolated.
"""

# Test Hindi report
hindi_report = """
कंप्रेसर की मरम्मत के दौरान कर्मचारी ने यह सुनिश्चित किए बिना काम शुरू कर दिया
कि ऊर्जा स्रोत को सही तरीके से अलग किया गया है।
"""

print("\n========== MULTILINGUAL LANGUAGE DETECTION ==========")

print("English report detected language:",
      detect_language(english_report))

print("Hindi report detected language:",
      detect_language(hindi_report))

# ==========================================
# STEP 12: DATASET LANGUAGE VERIFICATION
# ==========================================

print("\n========== DATASET LANGUAGE VERIFICATION ==========")

# Detect language from report text
df["detected_language"] = df["report_text"].apply(detect_language)

print("\nOriginal language column:")
print(df["language"].value_counts())

print("\nDetected language from report text:")
print(df["detected_language"].value_counts())

# Convert detected language codes into dataset language names
language_map = {
    "en": "English",
    "hi": "Hindi",
    "fr": "French",
    "de": "German",
    "es": "Spanish"
}

df["detected_language_name"] = df["detected_language"].map(
    language_map
).fillna("Unknown")

# Compare normalized language names
matches = (
    df["language"].str.lower()
    == df["detected_language_name"].str.lower()
).sum()

total = len(df)

print("\nNormalized language matches:", matches)
print("Total reports:", total)
print(
    "Language match percentage:",
    round((matches / total) * 100, 2),
    "%"
)


# ==========================================
# STEP 13: MULTILINGUAL TEST REPORTS
# ==========================================

print("\n========== MULTILINGUAL TEST REPORTS ==========")

test_reports = [
    {
        "language": "English",
        "text": """
        During compressor maintenance, the worker started the task
        without confirming that the energy source had been properly isolated.
        """
    },
    {
        "language": "Hindi",
        "text": """
        कंप्रेसर की मरम्मत के दौरान कर्मचारी ने यह सुनिश्चित किए बिना काम शुरू कर दिया
        कि ऊर्जा स्रोत को सही तरीके से अलग किया गया है।
        """
    }
]

for report in test_reports:
    detected = detect_language(report["text"])

    print("\nExpected language:", report["language"])
    print("Detected language:", detected)
    print("Report:", report["text"].strip())